import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/settings";
import { getAllPricing, MODEL_PRICING } from "@/lib/ai/models-registry";

// GET /api/admin/pricing - Get all model pricing from LiteLLM
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
    const useFallback = searchParams.get("fallback") === "true";

    if (useFallback) {
      return NextResponse.json({
        pricing: MODEL_PRICING,
        source: "fallback",
        lastUpdated: new Date().toISOString(),
      });
    }

    // Fetch from LiteLLM
    const pricing = await getAllPricing();
    const modelCount = Object.keys(pricing).length;

    return NextResponse.json({
      pricing,
      source: modelCount > 100 ? "litellm" : "fallback",
      modelCount,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching pricing:", error);
    return NextResponse.json(
      { error: "Failed to fetch pricing" },
      { status: 500 }
    );
  }
}
