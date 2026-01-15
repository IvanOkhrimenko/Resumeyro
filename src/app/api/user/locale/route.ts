import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { locales, type Locale } from "@/i18n/config";

export async function POST(request: Request) {
  try {
    const { locale } = await request.json();

    // Validate locale
    if (!locale || !locales.includes(locale as Locale)) {
      return NextResponse.json(
        { error: "Invalid locale" },
        { status: 400 }
      );
    }

    // Set the locale cookie
    const cookieStore = await cookies();
    cookieStore.set("NEXT_LOCALE", locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: "lax",
    });

    return NextResponse.json({ success: true, locale });
  } catch (error) {
    console.error("Failed to set locale:", error);
    return NextResponse.json(
      { error: "Failed to set locale" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";

    return NextResponse.json({ locale });
  } catch (error) {
    console.error("Failed to get locale:", error);
    return NextResponse.json(
      { error: "Failed to get locale" },
      { status: 500 }
    );
  }
}
