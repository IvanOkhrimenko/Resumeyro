import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { db, withRetry, safeDbOperation } from "@/lib/db";
import { SubscriptionStatus } from "@prisma/client";
import { getAllPlans } from "@/lib/subscription-plans";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// ============================================
// Webhook Event Handlers
// ============================================

type EventResult = { success: boolean; error?: string };

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<EventResult> {
  const userId = session.metadata?.userId;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  console.log(`[Webhook] handleCheckoutCompleted: userId=${userId}, customerId=${customerId}, subscriptionId=${subscriptionId}`);

  if (!userId) {
    console.error("[Webhook] No userId in session metadata");
    return { success: false, error: "No userId in session metadata" };
  }

  try {
    // Check if user has existing subscription and cancel it (for upgrades/downgrades)
    const existingSubscription = await db.subscription.findUnique({
      where: { userId },
    });

    if (existingSubscription?.stripeSubscriptionId &&
        existingSubscription.stripeSubscriptionId !== subscriptionId) {
      console.log(`[Webhook] Cancelling old subscription: ${existingSubscription.stripeSubscriptionId}`);
      try {
        await getStripe().subscriptions.cancel(existingSubscription.stripeSubscriptionId);
        console.log("[Webhook] Old subscription cancelled successfully");
      } catch (cancelError) {
        // Log but don't fail - the old subscription might already be cancelled
        console.warn(`[Webhook] Failed to cancel old subscription: ${cancelError}`);
      }
    }

    console.log("[Webhook] Retrieving subscription from Stripe...");
    const stripeSubscription = await getStripe().subscriptions.retrieve(
      subscriptionId
    ) as Stripe.Subscription;

    const subscriptionItem = stripeSubscription.items.data[0];
    const priceId = subscriptionItem?.price.id;
    console.log(`[Webhook] Got subscription, priceId=${priceId}`);

    const plan = await getPlanFromPriceId(priceId);
    console.log(`[Webhook] Resolved plan=${plan}`);

    const periodStart = subscriptionItem?.current_period_start;
    const periodEnd = subscriptionItem?.current_period_end;

    console.log("[Webhook] Upserting subscription to database...");
    await withRetry(
      () =>
        db.subscription.upsert({
          where: { userId },
          create: {
            userId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            plan,
            status: "ACTIVE",
            currentPeriodStart: periodStart
              ? new Date(periodStart * 1000)
              : null,
            currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
            cancelAtPeriodEnd: false,
          },
          update: {
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            plan,
            status: "ACTIVE",
            currentPeriodStart: periodStart
              ? new Date(periodStart * 1000)
              : null,
            currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
            cancelAtPeriodEnd: false,
          },
        }),
      { operationName: "checkout.session.completed" }
    );

    console.log("[Webhook] Database upsert successful!");
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Webhook] handleCheckoutCompleted error: ${message}`);
    return { success: false, error: message };
  }
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<EventResult> {
  const userId = subscription.metadata?.userId;
  const subscriptionId = subscription.id;

  console.log(`[Webhook] handleSubscriptionUpdated: userId=${userId}, subscriptionId=${subscriptionId}, status=${subscription.status}, cancel_at=${subscription.cancel_at}`);

  // Try to find user by metadata or by subscriptionId
  let targetUserId: string | undefined = userId;
  if (!targetUserId) {
    const dbSubscription = await db.subscription.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
    });
    targetUserId = dbSubscription?.userId;
  }

  if (!targetUserId) {
    console.error("[Webhook] No userId found for subscription update");
    return { success: false, error: "No userId in subscription metadata and no matching subscription found" };
  }

  const finalUserId = targetUserId;

  try {
    const subItem = subscription.items.data[0];
    const priceId = subItem?.price.id;
    const plan = await getPlanFromPriceId(priceId);

    // Determine status - check for cancellation
    // Note: cancel_at means "scheduled to cancel" but still active until then
    // Only mark as CANCELED when status is actually "canceled"
    let status: SubscriptionStatus = "ACTIVE";
    if (subscription.status === "past_due") status = "PAST_DUE";
    if (subscription.status === "canceled") status = "CANCELED";
    if (subscription.status === "unpaid") status = "PAST_DUE";

    // Only set plan to FREE when subscription is actually canceled (not just scheduled)
    const isActuallyCanceled = subscription.status === "canceled";
    const cancelAtPeriodEnd = subscription.cancel_at !== null || subscription.cancel_at_period_end === true;

    const finalPlan = isActuallyCanceled ? "FREE" : plan;
    const finalStatus = status;

    console.log(`[Webhook] Updating subscription: plan=${finalPlan}, status=${finalStatus}, stripeStatus=${subscription.status}, cancel_at=${subscription.cancel_at}, cancelAtPeriodEnd=${cancelAtPeriodEnd}`);

    const startDate = subItem?.current_period_start;
    const endDate = subItem?.current_period_end;

    await withRetry(
      () =>
        db.subscription.update({
          where: { userId: finalUserId },
          data: {
            plan: finalPlan,
            status: finalStatus,
            currentPeriodStart: startDate ? new Date(startDate * 1000) : null,
            currentPeriodEnd: endDate ? new Date(endDate * 1000) : null,
            stripeSubscriptionId: isActuallyCanceled ? null : subscriptionId,
            cancelAtPeriodEnd: cancelAtPeriodEnd,
          },
        }),
      { operationName: "subscription.updated" }
    );

    console.log("[Webhook] Subscription updated successfully");
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Webhook] handleSubscriptionUpdated error: ${message}`);
    return { success: false, error: message };
  }
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<EventResult> {
  const userId = subscription.metadata?.userId;
  const subscriptionId = subscription.id;
  const customerId = subscription.customer as string;

  console.log(`[Webhook] handleSubscriptionDeleted: userId=${userId}, subscriptionId=${subscriptionId}, customerId=${customerId}`);

  try {
    // IMPORTANT: Before resetting to FREE, check if customer has other subscriptions in Stripe
    // This handles race conditions when downgrading (old subscription deleted, new one created simultaneously)
    // Check for any non-canceled subscription, not just "active" (new subscription might still be processing)
    if (customerId) {
      const allSubscriptions = await getStripe().subscriptions.list({
        customer: customerId,
        limit: 10,
      });

      // Find any subscription that is NOT the one being deleted and is NOT canceled
      const otherSubscription = allSubscriptions.data.find(
        sub => sub.id !== subscriptionId && sub.status !== "canceled"
      );

      if (otherSubscription) {
        console.log(`[Webhook] Customer ${customerId} has another subscription ${otherSubscription.id} (status: ${otherSubscription.status}). Skipping reset to FREE.`);
        return { success: true };
      }
    }

    // Try to find subscription by userId first, then by stripeSubscriptionId
    let dbSubscription = userId
      ? await db.subscription.findUnique({ where: { userId } })
      : null;

    if (!dbSubscription) {
      // Fallback: find by stripeSubscriptionId
      dbSubscription = await db.subscription.findFirst({
        where: { stripeSubscriptionId: subscriptionId },
      });
    }

    if (!dbSubscription) {
      console.warn(`[Webhook] No subscription found for deletion: userId=${userId}, subscriptionId=${subscriptionId}`);
      return { success: false, error: "No subscription found in database" };
    }

    // Double-check: if DB already has a different subscription ID, don't reset
    if (dbSubscription.stripeSubscriptionId && dbSubscription.stripeSubscriptionId !== subscriptionId) {
      console.log(`[Webhook] Subscription ${subscriptionId} deleted, but user already has different subscription ${dbSubscription.stripeSubscriptionId}. Skipping reset to FREE.`);
      return { success: true };
    }

    console.log(`[Webhook] Found subscription for user: ${dbSubscription.userId}, updating to FREE/CANCELED`);

    await withRetry(
      () =>
        db.subscription.update({
          where: { userId: dbSubscription.userId },
          data: {
            plan: "FREE",
            status: "CANCELED",
            stripeSubscriptionId: null,
          },
        }),
      { operationName: "subscription.deleted" }
    );

    console.log("[Webhook] Subscription deleted successfully");
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Webhook] handleSubscriptionDeleted error: ${message}`);
    return { success: false, error: message };
  }
}

async function handlePaymentFailed(
  invoice: Stripe.Invoice
): Promise<EventResult> {
  const subscriptionId = (
    invoice as {
      parent?: { subscription_details?: { subscription?: string } };
    }
  )?.parent?.subscription_details?.subscription;

  if (!subscriptionId) {
    // Not a subscription invoice, skip
    return { success: true };
  }

  try {
    const stripeSubscription = await getStripe().subscriptions.retrieve(
      subscriptionId
    ) as Stripe.Subscription;
    const userId = stripeSubscription.metadata?.userId;

    if (!userId) {
      return { success: false, error: "No userId in subscription metadata" };
    }

    await safeDbOperation(
      () =>
        db.subscription.update({
          where: { userId },
          data: { status: "PAST_DUE" },
        }),
      { operationName: "payment.failed", logError: true }
    );

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

// ============================================
// Helper Functions
// ============================================

async function getPlanFromPriceId(priceId: string): Promise<string> {
  try {
    // Get all plans from database and find matching price ID
    const plans = await getAllPlans();

    for (const plan of plans) {
      if (plan.stripePriceIdMonthly === priceId || plan.stripePriceIdYearly === priceId) {
        return plan.key;
      }
    }

    // Fallback to FREE if no matching plan found
    console.warn(`[Webhook] No plan found for price ID: ${priceId}`);
    return "FREE";
  } catch (error) {
    console.error("[Webhook] Error fetching plans from database:", error);
    return "FREE";
  }
}

// ============================================
// Main Webhook Handler
// ============================================

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[Webhook] Signature verification failed:", err);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  // Log event receipt
  console.log(`[Webhook] Received event: ${event.type} (${event.id})`);

  // Process event with individual error handling
  let result: EventResult = { success: true };

  switch (event.type) {
    case "checkout.session.completed":
      result = await handleCheckoutCompleted(
        event.data.object as Stripe.Checkout.Session
      );
      break;

    case "customer.subscription.updated":
      result = await handleSubscriptionUpdated(
        event.data.object as Stripe.Subscription
      );
      break;

    case "customer.subscription.deleted":
      result = await handleSubscriptionDeleted(
        event.data.object as Stripe.Subscription
      );
      break;

    case "invoice.payment_failed":
      result = await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    default:
      // Acknowledge unknown events without error
      console.log(`[Webhook] Unhandled event type: ${event.type}`);
  }

  // Log result
  if (result.success) {
    console.log(`[Webhook] Event ${event.type} processed successfully`);
  } else {
    console.error(
      `[Webhook] Event ${event.type} failed:`,
      result.error
    );
    // Return 200 to acknowledge receipt, but log the error
    // Stripe will retry if we return 5xx, which might not help for data issues
  }

  // Always return 200 to acknowledge receipt
  // This prevents Stripe from retrying events we've already processed
  // Errors are logged for monitoring/alerting
  return NextResponse.json({
    received: true,
    eventId: event.id,
    eventType: event.type,
    processed: result.success,
    error: result.error,
  });
}
