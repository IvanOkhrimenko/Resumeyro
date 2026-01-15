import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/settings";
import {
  getAllFeatureFlags,
  saveFeatureFlag,
  FEATURE_FLAGS,
  type FeatureFlagKey,
} from "@/lib/feature-flags";
import type { UserRole } from "@prisma/client";

// GET /api/admin/feature-flags - Get all feature flags
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const flags = await getAllFeatureFlags();

    return NextResponse.json({
      flags,
      availableRoles: ["USER", "ADMIN"] as UserRole[],
    });
  } catch (error) {
    console.error("Error fetching feature flags:", error);
    return NextResponse.json(
      { error: "Failed to fetch feature flags" },
      { status: 500 }
    );
  }
}

// POST /api/admin/feature-flags - Save a feature flag
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
    const { key, isEnabled, allowedRoles } = body;

    // Validate key
    const validKeys = Object.values(FEATURE_FLAGS);
    if (!validKeys.includes(key)) {
      return NextResponse.json({ error: "Invalid feature flag key" }, { status: 400 });
    }

    // Validate allowedRoles
    const validRoles: UserRole[] = ["USER", "ADMIN"];
    if (allowedRoles && !allowedRoles.every((role: string) => validRoles.includes(role as UserRole))) {
      return NextResponse.json({ error: "Invalid role in allowedRoles" }, { status: 400 });
    }

    await saveFeatureFlag(key as FeatureFlagKey, {
      isEnabled,
      allowedRoles,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving feature flag:", error);
    return NextResponse.json(
      { error: "Failed to save feature flag" },
      { status: 500 }
    );
  }
}
