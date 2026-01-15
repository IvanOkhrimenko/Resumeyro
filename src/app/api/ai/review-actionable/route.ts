import { NextResponse } from "next/server";
import { generateText } from "ai";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { taskModels } from "@/lib/ai/client";
import { ACTIONABLE_REVIEW_PROMPT, fillPromptTemplate } from "@/lib/ai/prompts";
import { PLANS } from "@/lib/constants";
import { isAdminEmail } from "@/lib/settings";
import { parseJSONFromLLM } from "@/lib/ai/json-parser";
import type { ActionableReviewResult } from "@/stores/ai-features-store";

export async function POST(req: Request) {
  console.error("[AI Review] === REQUEST RECEIVED ===");
  console.warn("[AI Review] === REQUEST RECEIVED (warn) ===");
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Please sign in to use AI features" },
        { status: 401 }
      );
    }

    // Admins have no limits
    const isAdmin = isAdminEmail(session.user.email);

    if (!isAdmin) {
      // Check subscription for AI review access
      const subscription = await db.subscription.findUnique({
        where: { userId: session.user.id },
      });

      const plan = subscription?.plan || "FREE";
      const planConfig = PLANS[plan];
      const limit = planConfig.features.aiReviews;

      if (limit === 0) {
        return NextResponse.json(
          { error: "AI resume review is not available on the Free plan. Please upgrade to Pro or Premium." },
          { status: 403 }
        );
      }

      if (limit !== -1) {
        // Check current month usage
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const usage = await db.usageRecord.findFirst({
          where: {
            userId: session.user.id,
            type: "AI_REVIEW",
            periodStart: { gte: startOfMonth },
            periodEnd: { lte: endOfMonth },
          },
        });

        const currentCount = usage?.count || 0;

        if (currentCount >= limit) {
          return NextResponse.json(
            {
              error: "AI review limit reached. Please upgrade your plan for more reviews.",
              limit,
              used: currentCount,
            },
            { status: 403 }
          );
        }
      }
    }

    const body = await req.json();
    const { resumeContent, semanticMap, profession, targetRole } = body as {
      resumeContent: string;
      semanticMap: string;
      profession?: string;
      targetRole?: string;
    };

    if (!resumeContent) {
      return NextResponse.json(
        { error: "Resume content is required" },
        { status: 400 }
      );
    }

    const prompt = fillPromptTemplate(ACTIONABLE_REVIEW_PROMPT, {
      resumeContent,
      semanticMap: semanticMap || "No semantic map provided",
      profession: profession || "General",
      targetRole: targetRole || "Not specified",
    });

    // Get the configured model for review task
    const reviewConfig = await taskModels.review();

    // Ensure minimum token limit for review (some models need more space for detailed suggestions)
    const MIN_REVIEW_TOKENS = 6000;
    const effectiveMaxTokens = Math.max(reviewConfig.maxTokens, MIN_REVIEW_TOKENS);

    // Always log model info for debugging
    console.log(`[AI Review] Model: ${reviewConfig.provider}/${reviewConfig.modelId} | User: ${session.user.email} | isAdmin: ${isAdmin}`);
    console.log(`[AI Review] Config: temperature=${reviewConfig.temperature}, maxTokens=${effectiveMaxTokens} (configured: ${reviewConfig.maxTokens})`);

    const startTime = Date.now();

    // Generate review using configured model
    const { text } = await generateText({
      model: reviewConfig.model,
      prompt,
      maxOutputTokens: effectiveMaxTokens,
      temperature: reviewConfig.temperature,
    });

    const duration = Date.now() - startTime;

    // Log generation time
    console.log(`[AI Review] Generation completed in ${duration}ms`);

    // Parse the JSON response using robust parser
    let review: ActionableReviewResult;
    const parseResult = parseJSONFromLLM<ActionableReviewResult>(text);

    if (parseResult.success && parseResult.data) {
      review = parseResult.data;

      // Ensure required fields exist
      if (!review.suggestions) review.suggestions = [];
      if (!review.missingSections) review.missingSections = [];
      if (!review.strengths) review.strengths = [];
      if (typeof review.overallScore !== 'number') review.overallScore = 70;

      // Add IDs to suggestions if missing
      review.suggestions = review.suggestions.map((s, i) => ({
        ...s,
        id: s.id || `suggestion-${i + 1}`,
        canQuickApply: s.canQuickApply ?? (s.type === 'text_improvement' && !!s.suggestedValue),
        previewRequired: s.previewRequired ?? (s.type !== 'text_improvement'),
      }));
    } else {
      console.error("[AI Review] Failed to parse AI response:", parseResult.error);
      if (parseResult.rawResponse) {
        console.error("[AI Review] Raw response preview:", parseResult.rawResponse);
      }
      // Return a fallback structure
      review = {
        overallScore: 70,
        industryDetected: null,
        strengths: ["Resume content was analyzed"],
        suggestions: [],
        missingSections: [],
      };
    }

    // Log results summary
    console.log(`[AI Review] Results: score=${review.overallScore}, suggestions=${review.suggestions.length}, strengths=${review.strengths.length}, missing=${review.missingSections.length}`);

    // Track usage
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    await db.usageRecord.upsert({
      where: {
        userId_type_periodStart_periodEnd: {
          userId: session.user.id,
          type: "AI_REVIEW",
          periodStart: startOfMonth,
          periodEnd: endOfMonth,
        },
      },
      create: {
        userId: session.user.id,
        type: "AI_REVIEW",
        count: 1,
        periodStart: startOfMonth,
        periodEnd: endOfMonth,
      },
      update: {
        count: { increment: 1 },
      },
    });

    return NextResponse.json(review);
  } catch (error) {
    console.error("AI actionable review error:", error);
    return NextResponse.json(
      { error: "Failed to review resume" },
      { status: 500 }
    );
  }
}
