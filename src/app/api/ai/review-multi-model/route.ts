import { NextResponse } from "next/server";
import { generateText } from "ai";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getMultiModelReviewConfig, getProviderApiKey, isAdmin as checkIsAdmin } from "@/lib/settings";
import { getPlanLimits } from "@/lib/subscription-plans";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { parseJSONFromLLM } from "@/lib/ai/json-parser";
import type { ActionableReviewResult, ActionableSuggestion } from "@/stores/ai-features-store";

// Provider instances cache
const providerCache: Record<string, any> = {};

async function getModelForProvider(provider: string, modelId: string) {
  const apiKey = await getProviderApiKey(provider);
  if (!apiKey) {
    throw new Error(`No API key configured for ${provider}`);
  }

  if (!providerCache[provider]) {
    switch (provider) {
      case "openai":
        providerCache[provider] = createOpenAI({ apiKey });
        break;
      case "anthropic":
        providerCache[provider] = createAnthropic({ apiKey });
        break;
      case "google":
        providerCache[provider] = createGoogleGenerativeAI({ apiKey });
        break;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  return providerCache[provider](modelId);
}

const REVIEW_PROMPT = `You are an expert resume reviewer for tech industry professionals. Analyze this resume and provide high-quality, actionable feedback.

Resume content:
{resumeContent}

Semantic structure:
{semanticMap}

CRITICAL RULES - READ CAREFULLY:

1. **suggestedValue MUST contain the ACTUAL improved text, NOT instructions**
   - WRONG: "Complete the truncated sentence and ensure..."
   - CORRECT: "As a frontend developer with 8 years of experience, I bring expertise in React, Angular, and modern web technologies."

2. **DO NOT flag these as issues (they are NORMAL for resumes):**
   - Different technology versions across different roles (people learn new versions over time)
   - Similar or identical tech stacks across roles (developers often specialize)
   - Technology versions that didn't exist during employment dates (resumes show CURRENT skills, not historical)
   - Using the same technologies at multiple companies

3. **Only suggest improvements when there's a REAL problem:**
   - Grammatical errors or typos
   - Vague descriptions that could be more specific with metrics
   - Missing critical sections (contact info, experience)
   - Genuinely incomplete sentences (not just truncated display)

4. **Before suggesting "add content":**
   - Verify the content is ACTUALLY missing, not just in a different format
   - Check ALL entries in the section

Respond with JSON:
{
  "overallScore": number (0-100),
  "industryDetected": string or null,
  "strengths": string[] (3-5 specific strengths),
  "suggestions": [
    {
      "id": string,
      "type": "text_improvement" | "missing_section" | "add_content",
      "severity": "critical" | "important" | "suggestion",
      "title": string (short, specific),
      "description": string (explain the issue clearly),
      "targetSemanticType": string or null,
      "currentValue": string or null (the EXACT current text),
      "suggestedValue": string or null (the COMPLETE improved text - NOT instructions!),
      "canQuickApply": boolean,
      "previewRequired": boolean
    }
  ],
  "missingSections": [
    {
      "section": string,
      "importance": "required" | "recommended" | "optional",
      "reason": string
    }
  ]
}

QUALITY CHECK before responding:
- Is each suggestedValue actual text that can replace currentValue? If not, rewrite it.
- Would a senior developer find this suggestion useful? If not, remove it.
- Is this a real issue or just nitpicking? Remove nitpicks.

Return ONLY valid JSON.`;

const SYNTHESIS_PROMPT = `You are synthesizing multiple AI resume reviews into ONE high-quality result.

Reviews from {modelCount} models:
{modelReviews}

Original resume:
{resumeContent}

YOUR TASK:
1. Combine insights, calculate average score
2. Keep ONLY the highest quality suggestions
3. AGGRESSIVELY filter out bad suggestions

REMOVE any suggestion that:
- Has suggestedValue containing instructions ("Complete the...", "Add more...") instead of actual text
- Nitpicks technology version differences across roles (NORMAL - devs learn new versions)
- Complains about similar tech stacks at different jobs (NORMAL - specialists exist)
- Claims something is missing when it's clearly present in the resume
- Is subjective style preference, not objective improvement

KEEP only suggestions that:
- Have suggestedValue with ACTUAL replacement text ready to use
- Fix real errors (typos, grammar, factual mistakes)
- Add genuinely missing critical information
- Would make a hiring manager say "yes, this needs fixing"

For any suggestion you keep, if suggestedValue is instructions instead of text, REWRITE it as actual replacement text.

Return JSON:
{
  "overallScore": number (0-100),
  "industryDetected": string or null,
  "strengths": string[] (3-5 best strengths),
  "suggestions": [
    {
      "id": string,
      "type": "text_improvement" | "missing_section" | "add_content",
      "severity": "critical" | "important" | "suggestion",
      "title": string,
      "description": string,
      "targetSemanticType": string or null,
      "currentValue": string or null,
      "suggestedValue": string or null (MUST be actual text, NOT instructions!),
      "canQuickApply": boolean,
      "previewRequired": boolean
    }
  ],
  "missingSections": [...],
  "filteredCount": number
}

Return ONLY valid JSON.`;

const VERIFICATION_PROMPT = `You are a quality filter for resume review suggestions. Your job is to REMOVE low-quality, nitpicky, or incorrect suggestions.

Resume content:
{resumeContent}

Suggestions to verify:
{suggestions}

Mark a suggestion as INVALID (false positive) if ANY of these apply:

1. **Content already exists**: Claims something is missing but it's actually there
2. **Nitpicking technology versions**: Flags different Angular/React/etc versions across roles as "inconsistent" - this is NORMAL, developers learn new versions
3. **Nitpicking similar tech stacks**: Claims it's suspicious to use same technologies at multiple jobs - this is NORMAL for specialists
4. **Historical accuracy pedantry**: Claims technology version X didn't exist in year Y - resumes show CURRENT skills, not historical
5. **suggestedValue is instructions, not text**: If suggestedValue says "Complete the..." or "Add more..." instead of actual replacement text
6. **Vague or unhelpful**: The suggestion doesn't provide clear, actionable value
7. **Subjective style preferences**: Personal opinions about formatting/style that aren't objectively wrong

Mark a suggestion as VALID only if:
- It identifies a REAL error (typo, grammar, factual mistake)
- It suggests adding genuinely missing critical information
- The suggestedValue contains ACTUAL replacement text
- A senior hiring manager would agree this needs fixing

Return JSON:
{
  "verifiedSuggestions": [
    {
      "id": string,
      "isValid": boolean,
      "reason": string (be specific why it's valid or invalid)
    }
  ],
  "falsePositiveCount": number
}

Be AGGRESSIVE in filtering - only keep truly valuable suggestions.
Return ONLY valid JSON.`;

interface ModelReview {
  modelName: string;
  provider: string;
  modelId: string;
  review: ActionableReviewResult;
  duration: number;
}

interface FailedModel {
  modelName: string;
  provider: string;
  modelId: string;
  error: string;
}

/**
 * Normalize text for comparison (lowercase, remove extra whitespace, strip punctuation)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ')    // Collapse whitespace
    .trim();
}

/**
 * Calculate similarity ratio between two strings (0-1)
 * Simple approach: check word overlap
 */
function calculateSimilarity(a: string, b: string): number {
  const wordsA = new Set(normalizeText(a).split(' '));
  const wordsB = new Set(normalizeText(b).split(' '));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }

  const union = wordsA.size + wordsB.size - intersection;
  return intersection / union; // Jaccard similarity
}

/**
 * Deduplicate suggestions based on type, target, title, and content similarity
 */
function deduplicateSuggestions(suggestions: ActionableSuggestion[]): ActionableSuggestion[] {
  const seen = new Map<string, ActionableSuggestion>();
  const result: ActionableSuggestion[] = [];

  for (const suggestion of suggestions) {
    // Create a base key from type and semantic target
    const baseKey = `${suggestion.type || 'unknown'}-${suggestion.targetSemanticType || 'none'}`;
    const normalizedTitle = normalizeText(suggestion.title || '');

    // Check if we've seen a similar suggestion
    let isDuplicate = false;

    for (const [key, existing] of seen.entries()) {
      // Must have same base key (type + target)
      if (!key.startsWith(baseKey)) continue;

      const existingNormalizedTitle = normalizeText(existing.title || '');

      // Check title similarity
      const titleSimilarity = calculateSimilarity(suggestion.title || '', existing.title || '');
      if (titleSimilarity > 0.7) {
        isDuplicate = true;
        console.log(`[Dedup] Skipping duplicate by title: "${suggestion.title}" ~ "${existing.title}" (${(titleSimilarity * 100).toFixed(0)}% similar)`);
        break;
      }

      // Check if descriptions are very similar
      if (suggestion.description && existing.description) {
        const descSimilarity = calculateSimilarity(suggestion.description, existing.description);
        if (descSimilarity > 0.8) {
          isDuplicate = true;
          console.log(`[Dedup] Skipping duplicate by description: "${suggestion.title}" ~ "${existing.title}" (desc ${(descSimilarity * 100).toFixed(0)}% similar)`);
          break;
        }
      }

      // Check if currentValue is the same (exact match)
      if (suggestion.currentValue && existing.currentValue) {
        const currentNorm = normalizeText(suggestion.currentValue);
        const existingCurrentNorm = normalizeText(existing.currentValue);
        if (currentNorm === existingCurrentNorm || calculateSimilarity(suggestion.currentValue, existing.currentValue) > 0.9) {
          isDuplicate = true;
          console.log(`[Dedup] Skipping duplicate by currentValue: "${suggestion.title}" ~ "${existing.title}"`);
          break;
        }
      }
    }

    if (!isDuplicate) {
      const uniqueKey = `${baseKey}-${normalizedTitle}-${seen.size}`;
      seen.set(uniqueKey, suggestion);
      result.push(suggestion);
    }
  }

  const removedCount = suggestions.length - result.length;
  if (removedCount > 0) {
    console.log(`[Dedup] Removed ${removedCount} duplicate suggestions`);
  }

  return result;
}

export async function POST(req: Request) {
  console.error("[Multi-Model Review] === REQUEST RECEIVED ===");
  console.warn("[Multi-Model Review] === REQUEST RECEIVED (warn) ===");
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Please sign in to use AI features" },
        { status: 401 }
      );
    }

    const isAdmin = await checkIsAdmin(session.user.id);

    // Check subscription for multi-model review access
    const subscription = await db.subscription.findUnique({
      where: { userId: session.user.id },
    });

    const plan = subscription?.plan || "FREE";
    const planLimits = await getPlanLimits(plan, isAdmin);

    if (!planLimits.multiModelReview) {
      return NextResponse.json(
        { error: "Multi-model review is only available on Premium plan" },
        { status: 403 }
      );
    }

    // Get multi-model configuration
    const config = await getMultiModelReviewConfig();

    console.log(`[Multi-Model] Config loaded: ${config.models.length} models configured:`,
      config.models.map(m => `${m.name || m.modelId} (${m.provider})`).join(", ")
    );

    if (!config.isEnabled) {
      return NextResponse.json(
        { error: "Multi-model review is not enabled" },
        { status: 400 }
      );
    }

    if (config.models.length < config.minModelsRequired) {
      return NextResponse.json(
        { error: `At least ${config.minModelsRequired} models are required` },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { resumeContent, semanticMap } = body as {
      resumeContent: string;
      semanticMap: string;
    };

    if (!resumeContent) {
      return NextResponse.json(
        { error: "Resume content is required" },
        { status: 400 }
      );
    }

    const prompt = REVIEW_PROMPT
      .replace("{resumeContent}", resumeContent)
      .replace("{semanticMap}", semanticMap || "No semantic map provided");

    // Track failed models
    const failedModels: FailedModel[] = [];

    // Run all models in parallel
    const modelPromises = config.models.map(async (modelConfig): Promise<ModelReview | null> => {
      const startTime = Date.now();
      try {
        console.log(`[Multi-Model] Starting ${modelConfig.name || modelConfig.modelId}...`);
        const model = await getModelForProvider(modelConfig.provider, modelConfig.modelId);

        const { text } = await generateText({
          model,
          prompt,
          maxOutputTokens: 6000, // Ensure enough tokens for detailed suggestions
          temperature: 0.3,
        });

        // Parse the JSON response using robust parser
        const parseResult = parseJSONFromLLM<ActionableReviewResult>(text);

        if (!parseResult.success || !parseResult.data) {
          console.error(`[Multi-Model] JSON parse error from ${modelConfig.modelId}:`, parseResult.error);
          if (parseResult.rawResponse) {
            console.error(`[Multi-Model] Response preview:`, parseResult.rawResponse.substring(0, 500));
          }
          failedModels.push({
            modelName: modelConfig.name || modelConfig.modelId,
            provider: modelConfig.provider,
            modelId: modelConfig.modelId,
            error: parseResult.error || "Failed to parse JSON",
          });
          return null;
        }

        const review = parseResult.data;

        // Ensure required fields exist
        if (!review.suggestions) review.suggestions = [];
        if (!review.missingSections) review.missingSections = [];
        if (!review.strengths) review.strengths = [];
        if (typeof review.overallScore !== "number") review.overallScore = 70;

        // Add IDs to suggestions if missing
        review.suggestions = review.suggestions.map((s, i) => ({
          ...s,
          id: s.id || `${modelConfig.modelId}-suggestion-${i + 1}`,
          canQuickApply: s.canQuickApply ?? (s.type === "text_improvement" && !!s.suggestedValue),
          previewRequired: s.previewRequired ?? s.type !== "text_improvement",
        }));

        console.log(`[Multi-Model] ${modelConfig.name || modelConfig.modelId} completed in ${Date.now() - startTime}ms, score: ${review.overallScore}`);

        return {
          modelName: modelConfig.name || modelConfig.modelId,
          provider: modelConfig.provider,
          modelId: modelConfig.modelId,
          review,
          duration: Date.now() - startTime,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`[Multi-Model] Error from ${modelConfig.modelId}:`, errorMessage);
        failedModels.push({
          modelName: modelConfig.name || modelConfig.modelId,
          provider: modelConfig.provider,
          modelId: modelConfig.modelId,
          error: errorMessage,
        });
        return null;
      }
    });

    const modelResults = await Promise.all(modelPromises);
    const successfulReviews = modelResults.filter((r): r is ModelReview => r !== null);

    console.log(`[Multi-Model] Results: ${successfulReviews.length} succeeded, ${failedModels.length} failed`);
    if (failedModels.length > 0) {
      console.log(`[Multi-Model] Failed models:`, failedModels.map(m => `${m.modelName}: ${m.error}`).join("; "));
    }

    if (successfulReviews.length === 0) {
      return NextResponse.json(
        { error: "All models failed to generate reviews" },
        { status: 500 }
      );
    }

    // If only one model succeeded, return its result directly
    if (successfulReviews.length === 1) {
      const result = successfulReviews[0].review;
      return NextResponse.json({
        ...result,
        isMultiModel: true,
        modelCount: 1,
        modelReviews: successfulReviews,
        failedModels: failedModels.length > 0 ? failedModels : undefined,
        // Debug info
        _debug: {
          configuredModels: config.models.length,
          configuredModelNames: config.models.map(m => m.name || m.modelId),
          successCount: successfulReviews.length,
          failedCount: failedModels.length,
        },
      });
    }

    // Synthesize results from multiple models
    const synthesisModel = await getModelForProvider(
      config.synthesisProvider,
      config.synthesisModelId
    );

    const modelReviewsStr = successfulReviews
      .map(
        (r) => `
=== Review from ${r.modelName} (${r.provider}) ===
Score: ${r.review.overallScore}
Industry: ${r.review.industryDetected || "Not detected"}
Strengths: ${r.review.strengths.join(", ")}
Suggestions: ${JSON.stringify(r.review.suggestions, null, 2)}
Missing Sections: ${JSON.stringify(r.review.missingSections, null, 2)}
`
      )
      .join("\n\n");

    const synthesisPrompt = SYNTHESIS_PROMPT
      .replace("{modelCount}", String(successfulReviews.length))
      .replace("{modelReviews}", modelReviewsStr)
      .replace("{resumeContent}", resumeContent);

    const { text: synthesisText } = await generateText({
      model: synthesisModel,
      prompt: synthesisPrompt,
      maxOutputTokens: 3000,
      temperature: 0.2,
    });

    // Parse synthesis result using robust parser
    let synthesizedReview: ActionableReviewResult;
    const synthesisParseResult = parseJSONFromLLM<ActionableReviewResult>(synthesisText);

    if (synthesisParseResult.success && synthesisParseResult.data) {
      synthesizedReview = synthesisParseResult.data;

      // Ensure required fields exist
      if (!synthesizedReview.suggestions) synthesizedReview.suggestions = [];
      if (!synthesizedReview.missingSections) synthesizedReview.missingSections = [];
      if (!synthesizedReview.strengths) synthesizedReview.strengths = [];
      if (typeof synthesizedReview.overallScore !== "number") {
        // Average the scores
        synthesizedReview.overallScore = Math.round(
          successfulReviews.reduce((sum, r) => sum + r.review.overallScore, 0) /
            successfulReviews.length
        );
      }

      // Add unique IDs to suggestions
      synthesizedReview.suggestions = synthesizedReview.suggestions.map((s, i) => ({
        ...s,
        id: s.id || `synth-suggestion-${i + 1}`,
        canQuickApply: s.canQuickApply ?? (s.type === "text_improvement" && !!s.suggestedValue),
        previewRequired: s.previewRequired ?? s.type !== "text_improvement",
      }));
    } else {
      console.error("[Multi-Model] Failed to parse synthesis response:", synthesisParseResult.error);
      if (synthesisParseResult.rawResponse) {
        console.error("[Multi-Model] Synthesis response preview:", synthesisParseResult.rawResponse.substring(0, 500));
      }

      // Fallback: combine results manually
      const allSuggestions: ActionableSuggestion[] = [];
      successfulReviews.forEach((r) => {
        r.review.suggestions.forEach((s) => {
          allSuggestions.push(s);
        });
      });

      const allStrengths = [...new Set(successfulReviews.flatMap((r) => r.review.strengths))];
      const avgScore = Math.round(
        successfulReviews.reduce((sum, r) => sum + r.review.overallScore, 0) /
          successfulReviews.length
      );

      synthesizedReview = {
        overallScore: avgScore,
        industryDetected: successfulReviews[0].review.industryDetected,
        strengths: allStrengths.slice(0, 5),
        suggestions: allSuggestions,
        missingSections: successfulReviews[0].review.missingSections,
      };
    }

    // DEDUPLICATION: Remove duplicate suggestions (from both synthesis and fallback paths)
    const beforeDedup = synthesizedReview.suggestions.length;
    synthesizedReview.suggestions = deduplicateSuggestions(synthesizedReview.suggestions);
    const dedupFilteredCount = beforeDedup - synthesizedReview.suggestions.length;

    // VERIFICATION STEP: Filter out false positives
    let verificationResult: { filteredCount: number; verifiedIds: Set<string> } | null = null;
    if (synthesizedReview.suggestions.length > 0) {
      try {
        console.log(`[Multi-Model] Verifying ${synthesizedReview.suggestions.length} suggestions...`);

        const verificationPrompt = VERIFICATION_PROMPT
          .replace("{resumeContent}", resumeContent)
          .replace("{suggestions}", JSON.stringify(
            synthesizedReview.suggestions.map(s => ({
              id: s.id,
              title: s.title,
              description: s.description,
              type: s.type,
              targetSemanticType: s.targetSemanticType,
            })),
            null,
            2
          ));

        const { text: verificationText } = await generateText({
          model: synthesisModel, // Use same model for verification
          prompt: verificationPrompt,
          maxOutputTokens: 2000,
          temperature: 0.1, // Low temp for factual checking
        });

        // Parse verification result using robust parser
        const verifyParseResult = parseJSONFromLLM<{ verifiedSuggestions?: Array<{ id: string; isValid: boolean; reason?: string }> }>(verificationText);

        if (verifyParseResult.success && verifyParseResult.data) {
          const verifyData = verifyParseResult.data;
          const validIds = new Set<string>();

          for (const v of verifyData.verifiedSuggestions || []) {
            if (v.isValid) {
              validIds.add(v.id);
            } else {
              console.log(`[Multi-Model] Filtered false positive: ${v.id} - ${v.reason}`);
            }
          }

          const originalCount = synthesizedReview.suggestions.length;
          synthesizedReview.suggestions = synthesizedReview.suggestions.filter(s => validIds.has(s.id));
          const filteredCount = originalCount - synthesizedReview.suggestions.length;

          verificationResult = { filteredCount, verifiedIds: validIds };
          console.log(`[Multi-Model] Verification complete: ${filteredCount} false positives filtered`);
        } else {
          console.warn("[Multi-Model] Could not parse verification response, keeping all suggestions");
        }
      } catch (verifyError) {
        console.error("[Multi-Model] Verification failed, keeping all suggestions:", verifyError);
        // Continue without filtering if verification fails
      }
    }

    // CODE-BASED QUALITY FILTER: Remove suggestions with instruction-like suggestedValue
    const instructionPatterns = [
      /^(complete|add|include|consider|ensure|update|revise|expand|improve|fix|correct|clarify)\s+(the|your|this|more|a)\s/i,
      /^(make sure|you should|try to|it would be|would be better)/i,
      /\.\.\.$/, // Ends with ellipsis (truncated instruction)
    ];

    const beforeCodeFilter = synthesizedReview.suggestions.length;
    synthesizedReview.suggestions = synthesizedReview.suggestions.filter(s => {
      // If no suggestedValue, keep for manual review
      if (!s.suggestedValue) return true;

      // Check if suggestedValue looks like instructions
      const isInstruction = instructionPatterns.some(pattern => pattern.test(s.suggestedValue!));
      if (isInstruction) {
        console.log(`[Multi-Model] Code filter removed instruction-like suggestion: "${s.suggestedValue?.substring(0, 50)}..."`);
        return false;
      }

      // Check if suggestedValue is too similar to title/description (not actual replacement text)
      const suggestedLower = s.suggestedValue.toLowerCase();
      if (suggestedLower.includes("version") && suggestedLower.includes("inconsisten")) {
        console.log(`[Multi-Model] Code filter removed version nitpick: ${s.title}`);
        return false;
      }
      if (suggestedLower.includes("similar") && suggestedLower.includes("tech")) {
        console.log(`[Multi-Model] Code filter removed tech stack nitpick: ${s.title}`);
        return false;
      }

      return true;
    });

    const codeFilteredCount = beforeCodeFilter - synthesizedReview.suggestions.length;
    if (codeFilteredCount > 0) {
      console.log(`[Multi-Model] Code filter removed ${codeFilteredCount} additional low-quality suggestions`);
    }

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

    return NextResponse.json({
      ...synthesizedReview,
      isMultiModel: true,
      modelCount: successfulReviews.length,
      // Include individual model reviews (always for testing, TODO: restrict to admin later)
      modelReviews: successfulReviews,
      failedModels: failedModels.length > 0 ? failedModels : undefined,
      // Debug info
      _debug: {
        configuredModels: config.models.length,
        configuredModelNames: config.models.map(m => m.name || m.modelId),
        successCount: successfulReviews.length,
        failedCount: failedModels.length,
        dedupFilteredCount,
        verificationApplied: !!verificationResult,
        aiFilteredCount: verificationResult?.filteredCount || 0,
        codeFilteredCount,
        totalFiltered: dedupFilteredCount + (verificationResult?.filteredCount || 0) + codeFilteredCount,
      },
    });
  } catch (error) {
    console.error("Multi-model review error:", error);
    return NextResponse.json(
      { error: "Failed to perform multi-model review" },
      { status: 500 }
    );
  }
}
