import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdmin as checkIsAdmin } from "@/lib/settings";
import { getPlanLimits } from "@/lib/subscription-plans";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Please sign in" },
        { status: 401 }
      );
    }

    let subscription = await db.subscription.findUnique({
      where: { userId: session.user.id },
    });

    if (!subscription) {
      // Create default free subscription
      subscription = await db.subscription.create({
        data: {
          userId: session.user.id,
          plan: "FREE",
          status: "ACTIVE",
        },
      });
    }

    const isAdmin = await checkIsAdmin(session.user.id);

    // Get plan limits including pdfWatermark
    const planLimits = await getPlanLimits(subscription.plan, isAdmin);

    return NextResponse.json({
      plan: subscription.plan,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      stripeCustomerId: subscription.stripeCustomerId,
      isAdmin,
      limits: planLimits,
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 }
    );
  }
}
