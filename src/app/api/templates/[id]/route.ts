import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTemplateById } from "@/lib/templates";
import { getEffectivePlan } from "@/lib/constants";
import { isAdminEmail } from "@/lib/settings";

// GET /api/templates/[id] - Get template with canvas data
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const template = getTemplateById(id);

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Check if premium template
    if (template.isPremium) {
      const session = await auth();

      if (!session?.user?.id) {
        return NextResponse.json(
          { error: "Please sign in to access premium templates" },
          { status: 401 }
        );
      }

      // Check if admin (admins get all premium features)
      const isAdmin = isAdminEmail(session.user.email);

      // Check subscription (skip for admins)
      const subscription = await db.subscription.findUnique({
        where: { userId: session.user.id },
      });

      const effectivePlan = getEffectivePlan(subscription?.plan, isAdmin);

      if (effectivePlan === "FREE") {
        return NextResponse.json(
          { error: "Please upgrade to Pro or Premium to access this template" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error fetching template:", error);
    return NextResponse.json(
      { error: "Failed to fetch template" },
      { status: 500 }
    );
  }
}
