import { NextResponse } from "next/server";
import { generateText } from "ai";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { taskModels, models } from "@/lib/ai/client";
import { FORMAT_ANALYSIS_PROMPT, fillPromptTemplate } from "@/lib/ai/prompts";
import { getPlanLimits } from "@/lib/subscription-plans";
import { isAdminEmail } from "@/lib/settings";
import { parseJSONFromLLM } from "@/lib/ai/json-parser";
import type { FormattingResult } from "@/stores/ai-features-store";

export async function POST(req: Request) {
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
      // Check subscription for AI features
      const subscription = await db.subscription.findUnique({
        where: { userId: session.user.id },
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
            userId: session.user.id,
            type: "AI_GENERATION",
            periodStart: { gte: startOfMonth },
            periodEnd: { lte: endOfMonth },
          },
        });

        const currentCount = usage?.count || 0;

        if (currentCount >= limit) {
          return NextResponse.json(
            {
              error: "AI generation limit reached. Please upgrade your plan.",
              limit,
              used: currentCount,
            },
            { status: 403 }
          );
        }
      }
    }

    const body = await req.json();
    const { resumeContent, currentSections, preferences } = body as {
      resumeContent: string;
      currentSections?: string[];
      preferences?: {
        conservativeMode?: boolean;
        keepColors?: boolean;
        keepFonts?: boolean;
      };
    };

    if (!resumeContent) {
      return NextResponse.json(
        { error: "Resume content is required" },
        { status: 400 }
      );
    }

    const preferencesStr = preferences
      ? `Conservative mode: ${preferences.conservativeMode ? 'yes' : 'no'}, Keep colors: ${preferences.keepColors ? 'yes' : 'no'}, Keep fonts: ${preferences.keepFonts ? 'yes' : 'no'}`
      : "No specific preferences";

    const prompt = fillPromptTemplate(FORMAT_ANALYSIS_PROMPT, {
      resumeContent,
      currentSections: currentSections?.join(', ') || "Not specified",
      preferences: preferencesStr,
    });

    // Generate formatting analysis using dedicated STYLE_FORMATTING model
    // This model can have higher creativity/temperature settings
    console.log("[AI Format] Starting formatting analysis...");

    let modelConfig;
    try {
      modelConfig = await taskModels.styleFormatting();
      console.log("[AI Format] Using STYLE_FORMATTING model:", modelConfig.modelId, "temp:", modelConfig.temperature);
    } catch (e) {
      // Fallback to analysis model if STYLE_FORMATTING not configured
      console.log("[AI Format] STYLE_FORMATTING not configured, using fallback");
      modelConfig = {
        model: await models.analysis(),
        temperature: 0.7, // Higher default for creativity
        maxTokens: 3000,
      };
    }

    const { text } = await generateText({
      model: modelConfig.model,
      prompt,
      maxOutputTokens: modelConfig.maxTokens || 3000,
      temperature: modelConfig.temperature,
    });

    console.log("[AI Format] Raw response length:", text.length);

    // Parse the JSON response using robust parser
    let formatting: FormattingResult;
    try {
      const parseResult = parseJSONFromLLM<FormattingResult>(text);

      if (!parseResult.success || !parseResult.data) {
        console.error("[AI Format] JSON parse failed:", parseResult.error);
        throw new Error(parseResult.error || "Failed to parse formatting response");
      }

      formatting = parseResult.data;
      console.log("[AI Format] Parsed successfully, industry:", formatting.detectedIndustry);

      // Ensure required fields exist with defaults
      if (!formatting.styling) {
        formatting.styling = {
          colors: {
            primary: "#1a1a2e",
            secondary: "#64748b",
            text: "#334155",
            textLight: "#475569",
            accent: "#3b82f6",
            background: "#ffffff",
          },
          fonts: {
            heading: "Arial, sans-serif",
            body: "Arial, sans-serif",
          },
          fontSizes: {
            name: 28,
            title: 16,
            sectionHeader: 14,
            jobTitle: 12,
            body: 11,
            small: 9,
          },
          spacing: {
            sectionSpacing: 24,
            lineHeight: 1.5,
            itemSpacing: 12,
          },
        };
      }
      if (!formatting.sectionOrder) {
        formatting.sectionOrder = ["contact", "summary", "experience", "education", "skills"];
      }
      if (!formatting.sectionsToAdd) formatting.sectionsToAdd = [];
      if (!formatting.sectionsToRemove) formatting.sectionsToRemove = [];
      if (!formatting.rationale) formatting.rationale = "Formatting recommendations generated.";

    } catch (parseError) {
      console.error("Failed to parse AI format response:", parseError);
      // Return a default structure
      formatting = {
        detectedIndustry: "general",
        detectedLevel: "mid",
        recommendedLayout: "single-column",
        styling: {
          colors: {
            primary: "#1a1a2e",
            secondary: "#64748b",
            text: "#334155",
            textLight: "#475569",
            accent: "#3b82f6",
            background: "#ffffff",
          },
          fonts: {
            heading: "Arial, sans-serif",
            body: "Arial, sans-serif",
          },
          fontSizes: {
            name: 28,
            title: 16,
            sectionHeader: 14,
            jobTitle: 12,
            body: 11,
            small: 9,
          },
          spacing: {
            sectionSpacing: 24,
            lineHeight: 1.5,
            itemSpacing: 12,
          },
        },
        sectionOrder: ["contact", "summary", "experience", "education", "skills"],
        sectionsToAdd: [],
        sectionsToRemove: [],
        rationale: "Unable to analyze resume. Using default professional formatting.",
      };
    }

    // Track usage
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    await db.usageRecord.upsert({
      where: {
        userId_type_periodStart_periodEnd: {
          userId: session.user.id,
          type: "AI_GENERATION",
          periodStart: startOfMonth,
          periodEnd: endOfMonth,
        },
      },
      create: {
        userId: session.user.id,
        type: "AI_GENERATION",
        count: 1,
        periodStart: startOfMonth,
        periodEnd: endOfMonth,
      },
      update: {
        count: { increment: 1 },
      },
    });

    return NextResponse.json(formatting);
  } catch (error) {
    console.error("AI format analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze resume formatting" },
      { status: 500 }
    );
  }
}
