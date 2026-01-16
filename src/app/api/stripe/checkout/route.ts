import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createCheckoutSession } from "@/lib/stripe";
import { getSubscriptionPlan } from "@/lib/subscription-plans";

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Please sign in to subscribe" },
        { status: 401 }
      );
    }

    const { plan, billingPeriod = "monthly" } = await req.json();

    if (!plan || plan === "FREE") {
      return NextResponse.json(
        { error: "Invalid plan selected" },
        { status: 400 }
      );
    }

    // Get plan config from database
    const planConfig = await getSubscriptionPlan(plan);

    if (!planConfig) {
      return NextResponse.json(
        { error: "Plan not found" },
        { status: 404 }
      );
    }

    // Get the appropriate price ID based on billing period
    const priceId = billingPeriod === "yearly"
      ? planConfig.stripePriceIdYearly
      : planConfig.stripePriceIdMonthly;

    if (!priceId) {
      return NextResponse.json(
        { error: "Price not configured for this plan" },
        { status: 500 }
      );
    }

    // Get or create subscription record
    const subscription = await db.subscription.findUnique({
      where: { userId: session.user.id },
    });

    const checkoutSession = await createCheckoutSession({
      customerId: subscription?.stripeCustomerId || undefined,
      priceId,
      userId: session.user.id,
      successUrl: `${process.env.NEXTAUTH_URL}/billing?success=true`,
      cancelUrl: `${process.env.NEXTAUTH_URL}/pricing?canceled=true`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
