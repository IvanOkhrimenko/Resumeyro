import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, safeDbOperation } from "@/lib/db";
import { models, generateTextWithRetry } from "@/lib/ai/client";
import { GENERATION_PROMPTS, fillPromptTemplate } from "@/lib/ai/prompts";
import { getPlanLimits } from "@/lib/subscription-plans";
import { isAdminEmail } from "@/lib/settings";
import { handleApiError } from "@/lib/api-utils";

type GenerationType = keyof typeof GENERATION_PROMPTS;

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Please sign in to use AI features" },
        { status: 401 }
      );
    }

    // Store userId for TypeScript type narrowing
    const userId = session.user.id;

    // Admins have no limits
    const isAdmin = isAdminEmail(session.user.email);

    if (!isAdmin) {
      // Check usage limits for regular users
      const subscription = await db.subscription.findUnique({
        where: { userId: userId },
      });

      const plan = subscription?.plan || "FREE";
      const planLimits = await getPlanLimits(plan);
      const limit = planLimits.aiGenerations;

      if (limit !== -1) {
        // Check current month usage
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const usage = await db.usageRecord.findFirst({
          where: {
            userId: userId,
            type: "AI_GENERATION",
            periodStart: { gte: startOfMonth },
            periodEnd: { lte: endOfMonth },
          },
        });

        const currentCount = usage?.count || 0;

        if (currentCount >= limit) {
          return NextResponse.json(
            {
              error: "AI generation limit reached. Please upgrade your plan for more generations.",
              limit,
              used: currentCount,
            },
            { status: 403 }
          );
        }
      }
    }

    const body = await req.json();
    const { type, variables } = body as {
      type: GenerationType;
      variables: Record<string, string>;
    };

    if (!type || !GENERATION_PROMPTS[type]) {
      return NextResponse.json(
        { error: "Invalid generation type" },
        { status: 400 }
      );
    }

    const template = GENERATION_PROMPTS[type];
    const prompt = fillPromptTemplate(template, variables || {});

    // Generate text using GPT-4o-mini for speed and cost
    const { text } = await generateTextWithRetry({
      model: await models.fast(),
      prompt,
      maxOutputTokens: 500,
      temperature: 0.7,
    });

    // Track usage (non-critical, use safeDbOperation)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    await safeDbOperation(
      () =>
        db.usageRecord.upsert({
          where: {
            userId_type_periodStart_periodEnd: {
              userId: userId,
              type: "AI_GENERATION",
              periodStart: startOfMonth,
              periodEnd: endOfMonth,
            },
          },
          create: {
            userId: userId,
            type: "AI_GENERATION",
            count: 1,
            periodStart: startOfMonth,
            periodEnd: endOfMonth,
          },
          update: {
            count: { increment: 1 },
          },
        }),
      { operationName: "track AI generation usage" }
    );

    return NextResponse.json({ text: text.trim() });
  } catch (error) {
    return handleApiError(error, "POST /api/ai/generate");
  }
}
