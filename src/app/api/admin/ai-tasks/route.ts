import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  isAdmin,
  getAllAITaskConfigs,
  saveAITaskConfig,
  AI_TASK_METADATA,
  AI_PROVIDERS,
} from "@/lib/settings";
import type { AITaskType } from "@prisma/client";

// GET /api/admin/ai-tasks - Get all AI task configurations
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const configs = await getAllAITaskConfigs();

    // Enrich with metadata
    const enrichedConfigs = configs.map((config) => ({
      ...config,
      metadata: AI_TASK_METADATA[config.taskType],
    }));

    return NextResponse.json({
      configs: enrichedConfigs,
      providers: Object.entries(AI_PROVIDERS)
        .filter(([key]) => key !== "CUSTOM") // Hide custom for now
        .map(([key, value]) => ({
          id: value,
          name: key.charAt(0) + key.slice(1).toLowerCase(),
        })),
    });
  } catch (error) {
    console.error("Error fetching AI task configs:", error);
    return NextResponse.json(
      { error: "Failed to fetch AI task configurations" },
      { status: 500 }
    );
  }
}

// POST /api/admin/ai-tasks - Save an AI task configuration
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
    const { taskType, provider, modelId, fallbackModels, temperature, maxTokens, isEnabled, customApiUrl, customApiKeyRef } = body;

    // Validate taskType
    const validTaskTypes = Object.keys(AI_TASK_METADATA);
    if (!validTaskTypes.includes(taskType)) {
      return NextResponse.json({ error: "Invalid task type" }, { status: 400 });
    }

    // Validate provider
    const validProviders = Object.values(AI_PROVIDERS);
    if (!validProviders.includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    // Validate modelId (basic check)
    if (!modelId || typeof modelId !== "string") {
      return NextResponse.json({ error: "Model ID is required" }, { status: 400 });
    }

    // Validate fallbackModels if provided
    const validatedFallbacks = Array.isArray(fallbackModels)
      ? fallbackModels.filter(
          (fb: any) =>
            fb &&
            typeof fb.provider === "string" &&
            typeof fb.modelId === "string" &&
            validProviders.includes(fb.provider)
        )
      : [];

    await saveAITaskConfig({
      taskType: taskType as AITaskType,
      provider,
      modelId,
      fallbackModels: validatedFallbacks,
      temperature: temperature ?? 0.7,
      maxTokens: maxTokens ?? 4000,
      isEnabled: isEnabled ?? true,
      customApiUrl: customApiUrl || null,
      customApiKeyRef: customApiKeyRef || null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving AI task config:", error);
    return NextResponse.json(
      { error: "Failed to save AI task configuration" },
      { status: 500 }
    );
  }
}
