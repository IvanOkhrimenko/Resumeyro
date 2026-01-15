import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ role: null });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    return NextResponse.json({ role: user?.role ?? "USER" });
  } catch (error) {
    console.error("Error fetching user role:", error);
    return NextResponse.json({ role: "USER" });
  }
}
