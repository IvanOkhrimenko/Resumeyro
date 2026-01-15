import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/settings";
import {
  getAllPlans,
  getSubscriptionPlan,
  createPlan,
  updatePlan,
  deletePlan,
  seedDefaultPlans,
  getAllAvailableModels,
  type PlanConfig,
} from "@/lib/subscription-plans";
import { db } from "@/lib/db";

// GET /api/admin/plans - Get all plans
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Get all plans (including inactive)
    const plans = await db.subscriptionPlanConfig.findMany({
      orderBy: { sortOrder: "asc" },
    });

    // If no plans exist, seed defaults
    if (plans.length === 0) {
      await seedDefaultPlans();
      const seededPlans = await db.subscriptionPlanConfig.findMany({
        orderBy: { sortOrder: "asc" },
      });
      return NextResponse.json({
        plans: seededPlans,
        availableModels: getAllAvailableModels(),
      });
    }

    return NextResponse.json({
      plans,
      availableModels: getAllAvailableModels(),
    });
  } catch (error) {
    console.error("Error fetching plans:", error);
    return NextResponse.json(
      { error: "Failed to fetch plans" },
      { status: 500 }
    );
  }
}

// POST /api/admin/plans - Create a new plan
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { action, ...data } = body;

    // Handle special actions
    if (action === "seed") {
      await seedDefaultPlans();
      const plans = await db.subscriptionPlanConfig.findMany({
        orderBy: { sortOrder: "asc" },
      });
      return NextResponse.json({ success: true, plans });
    }

    // Validate required fields
    if (!data.key || !data.name) {
      return NextResponse.json(
        { error: "Key and name are required" },
        { status: 400 }
      );
    }

    // Check if key already exists
    const existing = await getSubscriptionPlan(data.key);
    if (existing) {
      return NextResponse.json(
        { error: "Plan with this key already exists" },
        { status: 400 }
      );
    }

    // Create plan
    const plan = await createPlan({
      key: data.key.toUpperCase(),
      name: data.name,
      nameUk: data.nameUk || null,
      description: data.description || null,
      descriptionUk: data.descriptionUk || null,
      priceMonthly: data.priceMonthly ?? 0,
      priceYearly: data.priceYearly ?? 0,
      currency: data.currency || "USD",
      stripePriceIdMonthly: data.stripePriceIdMonthly || null,
      stripePriceIdYearly: data.stripePriceIdYearly || null,
      maxResumes: data.maxResumes ?? 1,
      aiGenerationsPerMonth: data.aiGenerationsPerMonth ?? 3,
      aiReviewsPerMonth: data.aiReviewsPerMonth ?? 0,
      multiModelReview: data.multiModelReview ?? false,
      pdfWatermark: data.pdfWatermark ?? true,
      prioritySupport: data.prioritySupport ?? false,
      allowedModels: data.allowedModels ?? [],
      taskModelOverrides: data.taskModelOverrides ?? {},
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder ?? 99,
    });

    return NextResponse.json({ success: true, plan });
  } catch (error) {
    console.error("Error creating plan:", error);
    return NextResponse.json(
      { error: "Failed to create plan" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/plans - Update an existing plan
export async function PUT(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { key, ...data } = body;

    if (!key) {
      return NextResponse.json(
        { error: "Plan key is required" },
        { status: 400 }
      );
    }

    // Check if plan exists
    const existing = await getSubscriptionPlan(key);
    if (!existing) {
      return NextResponse.json(
        { error: "Plan not found" },
        { status: 404 }
      );
    }

    // Update plan
    const plan = await updatePlan(key, data);

    if (!plan) {
      return NextResponse.json(
        { error: "Failed to update plan" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, plan });
  } catch (error) {
    console.error("Error updating plan:", error);
    return NextResponse.json(
      { error: "Failed to update plan" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/plans - Delete a plan
export async function DELETE(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { error: "Plan key is required" },
        { status: 400 }
      );
    }

    // Prevent deleting default plans
    if (["FREE", "PRO", "PREMIUM"].includes(key)) {
      return NextResponse.json(
        { error: "Cannot delete default plans (FREE, PRO, PREMIUM)" },
        { status: 400 }
      );
    }

    const result = await deletePlan(key);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting plan:", error);
    return NextResponse.json(
      { error: "Failed to delete plan" },
      { status: 500 }
    );
  }
}
