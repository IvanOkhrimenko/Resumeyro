import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdminEmail, getAllSettings, saveSetting, SETTING_KEYS, SettingKey } from "@/lib/settings";

// GET /api/admin/settings - Get all settings (read from database/environment)
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdminEmail(session.user.email)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const settings = await getAllSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// POST /api/admin/settings - Save a setting
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdminEmail(session.user.email)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { key, value } = await req.json();

    // Validate key
    const validKeys = Object.values(SETTING_KEYS);
    if (!validKeys.includes(key)) {
      return NextResponse.json({ error: "Invalid setting key" }, { status: 400 });
    }

    if (!value || typeof value !== "string") {
      return NextResponse.json({ error: "Value is required" }, { status: 400 });
    }

    // Save to database
    await saveSetting(key as SettingKey, value.trim());

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving setting:", error);
    return NextResponse.json(
      { error: "Failed to save setting" },
      { status: 500 }
    );
  }
}
