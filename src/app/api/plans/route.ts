import { NextResponse } from "next/server";
import { getAllPlans, type PlanConfig } from "@/lib/subscription-plans";

// Public endpoint - no auth required
// Returns active plans for display on pricing/billing pages
export async function GET() {
  try {
    const plans = await getAllPlans();

    // Transform for public display (remove sensitive data)
    const publicPlans = plans
      .filter((plan) => plan.isActive)
      .map((plan) => ({
        key: plan.key,
        name: plan.name,
        nameUk: plan.nameUk,
        description: plan.description,
        descriptionUk: plan.descriptionUk,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        currency: plan.currency,
        features: {
          maxResumes: plan.maxResumes,
          aiGenerationsPerMonth: plan.aiGenerationsPerMonth,
          aiReviewsPerMonth: plan.aiReviewsPerMonth,
          multiModelReview: plan.multiModelReview,
          pdfWatermark: plan.pdfWatermark,
          prioritySupport: plan.prioritySupport,
        },
        sortOrder: plan.sortOrder,
      }));

    return NextResponse.json({ plans: publicPlans });
  } catch (error) {
    console.error("Error fetching plans:", error);
    return NextResponse.json(
      { error: "Failed to fetch plans" },
      { status: 500 }
    );
  }
}
