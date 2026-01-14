import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMultiModelReviewConfig } from "@/lib/settings";

// Public endpoint to get configured models for progress UI
// This doesn't require admin - just returns model names
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Please sign in" },
        { status: 401 }
      );
    }

    const config = await getMultiModelReviewConfig();

    // Return just the model names and basic info for UI
    return NextResponse.json({
      models: config.models.map((m) => ({
        name: m.name || m.modelId,
        provider: m.provider,
      })),
      isEnabled: config.isEnabled,
    });
  } catch (error) {
    console.error("Failed to get multi-model models:", error);
    return NextResponse.json(
      { error: "Failed to get models" },
      { status: 500 }
    );
  }
}
