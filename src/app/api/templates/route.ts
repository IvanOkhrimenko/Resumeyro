import { NextResponse } from "next/server";
import { templates } from "@/lib/templates";

// GET /api/templates - List all templates
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const region = searchParams.get("region");
    const category = searchParams.get("category");

    let filteredTemplates = [...templates];

    if (region) {
      // Include both region-specific templates AND international templates
      filteredTemplates = filteredTemplates.filter(
        (t) => t.region === region || t.region === "INTL"
      );
    }

    if (category) {
      filteredTemplates = filteredTemplates.filter((t) => t.category === category);
    }

    // Sort: free templates first, then by category
    filteredTemplates.sort((a, b) => {
      if (a.isPremium !== b.isPremium) return a.isPremium ? 1 : -1;
      return a.category.localeCompare(b.category);
    });

    // Return templates without full canvasData for listing
    const templateList = filteredTemplates.map((t) => ({
      id: t.id,
      name: t.name,
      nameUk: t.nameUk,
      description: t.description,
      descriptionUk: t.descriptionUk,
      region: t.region,
      category: t.category,
      isPremium: t.isPremium,
      thumbnail: t.thumbnail,
    }));

    return NextResponse.json(templateList);
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}
