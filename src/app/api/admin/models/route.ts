import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/settings";
import { getAllModels, getModelsByProvider, MODEL_PRICING } from "@/lib/ai/models-registry";

// GET /api/admin/models - Get all available models from providers
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
    const refresh = searchParams.get("refresh") === "true";
    const groupByProvider = searchParams.get("groupByProvider") === "true";

    if (groupByProvider) {
      const modelsByProvider = await getModelsByProvider();
      return NextResponse.json({
        models: modelsByProvider,
        pricing: MODEL_PRICING,
        lastUpdated: new Date().toISOString(),
      });
    }

    const models = await getAllModels(refresh);

    return NextResponse.json({
      models,
      pricing: MODEL_PRICING,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching models:", error);
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 }
    );
  }
}
