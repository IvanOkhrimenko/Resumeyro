import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin, getMultiModelReviewConfig, saveMultiModelReviewConfig } from "@/lib/settings";
import type { MultiModelReviewConfigData } from "@/lib/settings";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id || !(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const config = await getMultiModelReviewConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error("Failed to get multi-model config:", error);
    return NextResponse.json(
      { error: "Failed to get configuration" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id || !(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json() as Partial<MultiModelReviewConfigData>;

    console.log("[API] Received multi-model config:", body.models?.length, "models", JSON.stringify(body.models));

    // Validate models array
    if (body.models) {
      if (!Array.isArray(body.models)) {
        return NextResponse.json(
          { error: "Models must be an array" },
          { status: 400 }
        );
      }

      for (const model of body.models) {
        if (!model.provider || !model.modelId) {
          return NextResponse.json(
            { error: "Each model must have provider and modelId" },
            { status: 400 }
          );
        }
      }
    }

    await saveMultiModelReviewConfig(body);

    const updatedConfig = await getMultiModelReviewConfig();
    console.log("[API] Returning saved config:", updatedConfig.models?.length, "models");
    return NextResponse.json(updatedConfig);
  } catch (error) {
    console.error("Failed to save multi-model config:", error);
    return NextResponse.json(
      { error: "Failed to save configuration" },
      { status: 500 }
    );
  }
}
