import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAllFeatureFlags, checkFeatureAccess } from "@/lib/feature-flags";

// GET /api/feature-flags - Get enabled features for current user
export async function GET() {
  try {
    const session = await auth();

    // Get user role if authenticated
    let userRole = null;
    if (session?.user?.id) {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
      });
      userRole = user?.role || null;
    }

    const allFlags = await getAllFeatureFlags();

    // Return which features are enabled for this user
    const enabledFeatures: Record<string, boolean> = {};
    for (const flag of allFlags) {
      enabledFeatures[flag.key] = checkFeatureAccess(flag, userRole);
    }

    return NextResponse.json({
      features: enabledFeatures,
      // Include flag details for debugging (only in development)
      ...(process.env.NODE_ENV === "development" && { flags: allFlags }),
    });
  } catch (error) {
    console.error("Error fetching feature flags:", error);
    // Return all features enabled on error to not block users
    return NextResponse.json({
      features: {
        SMART_FORMATTING: true,
        AI_REVIEW: true,
        MULTI_MODEL_REVIEW: true,
        AI_TEXT_IMPROVEMENT: true,
      },
    });
  }
}
