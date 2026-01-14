import { NextResponse } from "next/server";
import { generateText } from "ai";
import { auth } from "@/lib/auth";
import { models } from "@/lib/ai/client";

const REVALIDATE_PROMPT = `You are a resume expert. Analyze if this resume text still needs improvement.

Current text:
"{currentText}"

Original suggestion:
- Title: {suggestionTitle}
- Description: {suggestionDescription}
- Previously suggested: "{originalSuggested}"

Determine if the current text:
1. Is now good enough and doesn't need this suggestion anymore
2. Still needs improvement with the same or updated suggestion

Respond in JSON format:
{
  "stillNeeded": boolean,
  "suggestedValue": "improved text if still needed, or null",
  "description": "brief explanation of the improvement needed, or why it's no longer needed"
}

Only respond with the JSON, nothing else.`;

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Please sign in to use AI features" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { currentText, originalSuggestion, semanticType } = body as {
      currentText: string;
      originalSuggestion: {
        title: string;
        description: string;
        suggestedValue?: string;
        currentValue?: string;
      };
      semanticType?: string;
    };

    if (!currentText || !originalSuggestion) {
      return NextResponse.json(
        { error: "Current text and original suggestion are required" },
        { status: 400 }
      );
    }

    // Quick check: if current text now matches the suggested value, no need for AI
    if (
      originalSuggestion.suggestedValue &&
      currentText.trim().toLowerCase() === originalSuggestion.suggestedValue.trim().toLowerCase()
    ) {
      return NextResponse.json({
        stillNeeded: false,
        suggestedValue: null,
        description: "Text has been updated to the suggested value",
      });
    }

    // Quick check: if text is substantially different (length changed by >50%), likely addressed
    if (originalSuggestion.currentValue) {
      const originalLength = originalSuggestion.currentValue.length;
      const currentLength = currentText.length;
      const lengthRatio = currentLength / originalLength;

      // If text grew significantly and suggestion was about expanding/improving
      if (lengthRatio > 1.5 && originalSuggestion.description?.toLowerCase().includes("add")) {
        return NextResponse.json({
          stillNeeded: false,
          suggestedValue: null,
          description: "Text has been expanded significantly",
        });
      }
    }

    const prompt = REVALIDATE_PROMPT
      .replace("{currentText}", currentText.substring(0, 500))
      .replace("{suggestionTitle}", originalSuggestion.title)
      .replace("{suggestionDescription}", originalSuggestion.description)
      .replace("{originalSuggested}", originalSuggestion.suggestedValue || "N/A");

    // Use a fast model for quick revalidation
    const { text } = await generateText({
      model: await models.fast(),
      prompt,
      maxOutputTokens: 500,
      temperature: 0.2,
    });

    // Parse the response
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      const result = JSON.parse(jsonMatch[0]);

      return NextResponse.json({
        stillNeeded: result.stillNeeded ?? true,
        suggestedValue: result.suggestedValue || null,
        description: result.description || originalSuggestion.description,
      });
    } catch (parseError) {
      // If parsing fails, assume suggestion is still needed
      return NextResponse.json({
        stillNeeded: true,
        suggestedValue: originalSuggestion.suggestedValue,
        description: originalSuggestion.description,
      });
    }
  } catch (error) {
    console.error("Revalidate suggestion error:", error);
    return NextResponse.json(
      { error: "Failed to revalidate suggestion" },
      { status: 500 }
    );
  }
}
