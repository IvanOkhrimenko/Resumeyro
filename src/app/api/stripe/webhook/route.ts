import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { db, withRetry, safeDbOperation } from "@/lib/db";
import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";

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

  if (!userId) {
    return { success: false, error: "No userId in session metadata" };
  }

  try {
    const stripeSubscription = await getStripe().subscriptions.retrieve(
      subscriptionId
    ) as Stripe.Subscription;
    const subscriptionItem = stripeSubscription.items.data[0];
    const priceId = subscriptionItem?.price.id;
    const plan = getPlanFromPriceId(priceId);
    const periodStart = subscriptionItem?.current_period_start;
    const periodEnd = subscriptionItem?.current_period_end;

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
          },
        }),
      { operationName: "checkout.session.completed" }
    );

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<EventResult> {
  const userId = subscription.metadata?.userId;

  if (!userId) {
    return { success: false, error: "No userId in subscription metadata" };
  }

  try {
    const subItem = subscription.items.data[0];
    const priceId = subItem?.price.id;
    const plan = getPlanFromPriceId(priceId);

    let status: SubscriptionStatus = "ACTIVE";
    if (subscription.status === "past_due") status = "PAST_DUE";
    if (subscription.status === "canceled") status = "CANCELED";
    if (subscription.status === "unpaid") status = "PAST_DUE";

    const startDate = subItem?.current_period_start;
    const endDate = subItem?.current_period_end;

    await withRetry(
      () =>
        db.subscription.update({
          where: { userId },
          data: {
            plan,
            status,
            currentPeriodStart: startDate ? new Date(startDate * 1000) : null,
            currentPeriodEnd: endDate ? new Date(endDate * 1000) : null,
          },
        }),
      { operationName: "subscription.updated" }
    );

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<EventResult> {
  const userId = subscription.metadata?.userId;

  if (!userId) {
    return { success: false, error: "No userId in subscription metadata" };
  }

  try {
    await withRetry(
      () =>
        db.subscription.update({
          where: { userId },
          data: {
            plan: "FREE",
            status: "CANCELED",
            stripeSubscriptionId: null,
          },
        }),
      { operationName: "subscription.deleted" }
    );

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
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

function getPlanFromPriceId(priceId: string): SubscriptionPlan {
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
    return "PRO";
  }
  if (priceId === process.env.STRIPE_PREMIUM_PRICE_ID) {
    return "PREMIUM";
  }
  return "FREE";
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
