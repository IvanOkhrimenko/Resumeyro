import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/settings";
import { db } from "@/lib/db";
import { getAllPlans } from "@/lib/subscription-plans";
import { getAllPricing } from "@/lib/ai/models-registry";

// Token usage estimates for cost calculations
const TASK_TOKEN_USAGE = {
  AI_GENERATION: { input: 2500, output: 1500 },
  AI_REVIEW: { input: 4000, output: 3000 },
  PDF_PARSE: { input: 3000, output: 2000 },
};

// GET /api/admin/users - Get all users with their subscriptions and usage
export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const search = searchParams.get("search") || "";
    const planFilter = searchParams.get("plan") || "";
    const roleFilter = searchParams.get("role") || "";

    // Build where clause
    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }
    if (roleFilter) {
      where.role = roleFilter;
    }

    // Get total count
    const totalCount = await db.user.count({ where });

    // Get users with subscriptions and usage records
    const users = await db.user.findMany({
      where,
      include: {
        subscription: true,
        usageRecords: {
          where: {
            // Get records from the last 30 days for current period estimation
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        },
        _count: {
          select: {
            resumes: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Filter by plan if specified (after fetching because plan is in relation)
    let filteredUsers = users;
    if (planFilter) {
      filteredUsers = users.filter(
        (u) => u.subscription?.plan === planFilter || (!u.subscription && planFilter === "FREE")
      );
    }

    // Get all plans for reference
    const plans = await getAllPlans();
    const planPrices: Record<string, number> = {};
    plans.forEach((p) => {
      planPrices[p.key] = p.priceMonthly;
    });

    // Get model pricing for cost calculations
    const modelPricing = await getAllPricing();

    // Calculate usage stats and costs for each user
    const usersWithStats = filteredUsers.map((user) => {
      const plan = user.subscription?.plan || "FREE";
      const planConfig = plans.find((p) => p.key === plan);

      // Aggregate usage by type
      const usageByType: Record<string, number> = {};
      user.usageRecords.forEach((record) => {
        usageByType[record.type] = (usageByType[record.type] || 0) + record.count;
      });

      const aiGenerations = usageByType["AI_GENERATION"] || 0;
      const aiReviews = usageByType["AI_REVIEW"] || 0;
      const pdfParses = usageByType["PDF_PARSE"] || 0;
      const pdfExports = usageByType["PDF_EXPORT"] || 0;

      // Calculate AI costs (estimate using default model pricing)
      // Using Claude Sonnet as reference: $3/1M input, $15/1M output
      const defaultInputCost = 3 / 1_000_000;
      const defaultOutputCost = 15 / 1_000_000;

      const generationCost =
        aiGenerations *
        (TASK_TOKEN_USAGE.AI_GENERATION.input * defaultInputCost +
          TASK_TOKEN_USAGE.AI_GENERATION.output * defaultOutputCost);

      const reviewCost =
        aiReviews *
        (TASK_TOKEN_USAGE.AI_REVIEW.input * defaultInputCost +
          TASK_TOKEN_USAGE.AI_REVIEW.output * defaultOutputCost);

      const parseCost =
        pdfParses *
        (TASK_TOKEN_USAGE.PDF_PARSE.input * defaultInputCost +
          TASK_TOKEN_USAGE.PDF_PARSE.output * defaultOutputCost);

      const totalCost = generationCost + reviewCost + parseCost;

      // Revenue: plan price, but 0 if granted by admin
      const isAdminGranted = user.subscription?.grantedByAdmin || false;
      const revenue = isAdminGranted ? 0 : planPrices[plan] || 0;

      const profit = revenue - totalCost;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
        createdAt: user.createdAt,
        subscription: user.subscription
          ? {
              id: user.subscription.id,
              plan: user.subscription.plan,
              status: user.subscription.status,
              grantedByAdmin: user.subscription.grantedByAdmin,
              stripeSubscriptionId: user.subscription.stripeSubscriptionId ? "..." : null,
              currentPeriodEnd: user.subscription.currentPeriodEnd,
            }
          : null,
        stats: {
          resumeCount: user._count.resumes,
          aiGenerations,
          aiReviews,
          pdfParses,
          pdfExports,
        },
        financials: {
          revenue: Math.round(revenue * 100) / 100,
          cost: Math.round(totalCost * 10000) / 10000,
          profit: Math.round(profit * 100) / 100,
          isAdminGranted,
        },
        planLimits: planConfig
          ? {
              maxResumes: planConfig.maxResumes,
              aiGenerationsPerMonth: planConfig.aiGenerationsPerMonth,
              aiReviewsPerMonth: planConfig.aiReviewsPerMonth,
            }
          : null,
      };
    });

    return NextResponse.json({
      users: usersWithStats,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      plans: plans.map((p) => ({ key: p.key, name: p.name, price: p.priceMonthly })),
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

// DELETE /api/admin/users - Reset user usage limits
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
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Delete all usage records for this user
    const result = await db.usageRecord.deleteMany({
      where: { userId },
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      message: `Reset ${result.count} usage records for user`,
    });
  } catch (error) {
    console.error("Error resetting user limits:", error);
    return NextResponse.json({ error: "Failed to reset user limits" }, { status: 500 });
  }
}

// PUT /api/admin/users - Update user role or subscription
export async function PUT(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const data = await req.json();
    const { userId, role, plan } = data;

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Prevent admin from changing their own role
    if (userId === session.user.id && role && role !== "ADMIN") {
      return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
    }

    const updates: any = {};

    // Update role if provided
    if (role && (role === "USER" || role === "ADMIN")) {
      await db.user.update({
        where: { id: userId },
        data: { role },
      });
    }

    // Update subscription plan if provided
    if (plan) {
      const existingSubscription = await db.subscription.findUnique({
        where: { userId },
      });

      if (existingSubscription) {
        await db.subscription.update({
          where: { userId },
          data: {
            plan,
            grantedByAdmin: true, // Mark as admin-granted (no revenue)
            status: "ACTIVE",
          },
        });
      } else {
        await db.subscription.create({
          data: {
            userId,
            plan,
            grantedByAdmin: true,
            status: "ACTIVE",
          },
        });
      }
    }

    // Fetch updated user
    const updatedUser = await db.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser?.id,
        email: updatedUser?.email,
        role: updatedUser?.role,
        subscription: updatedUser?.subscription,
      },
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
