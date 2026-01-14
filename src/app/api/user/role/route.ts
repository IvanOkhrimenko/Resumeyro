import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Admin emails stored in environment variable (comma-separated)
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ role: null });
    }

    const isAdmin = ADMIN_EMAILS.includes(session.user.email.toLowerCase());
    return NextResponse.json({ role: isAdmin ? "ADMIN" : "USER" });
  } catch (error) {
    console.error("Error fetching user role:", error);
    return NextResponse.json({ role: "USER" });
  }
}
