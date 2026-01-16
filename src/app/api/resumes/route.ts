import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, withTransaction, safeDbOperation } from "@/lib/db";
import { z } from "zod";
import { isAdminEmail } from "@/lib/settings";
import { getPlanLimits } from "@/lib/subscription-plans";
import { handleApiError } from "@/lib/api-utils";

const createResumeSchema = z.object({
  title: z.string().min(1).max(100),
  templateId: z.string().optional(),
  region: z.enum(["US", "EU", "UA"]).default("US"), // @deprecated - kept for backwards compatibility
  showPhoto: z.boolean().default(true), // User setting: whether to show photo in resume
  canvasData: z.any().optional(),
});

// GET /api/resumes - List user's resumes
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const resumes = await safeDbOperation(
      () =>
        db.resume.findMany({
          where: { userId },
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            title: true,
            slug: true,
            region: true,
            profession: true,
            isPublic: true,
            pdfUrl: true,
            thumbnail: true,
            createdAt: true,
            updatedAt: true,
            template: {
              select: {
                id: true,
                name: true,
                thumbnail: true,
              },
            },
          },
        }),
      { operationName: "fetch resumes", fallback: [] }
    );

    return NextResponse.json(resumes);
  } catch (error) {
    return handleApiError(error, "GET /api/resumes");
  }
}

// POST /api/resumes - Create new resume
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const body = await req.json();
    const validatedData = createResumeSchema.parse(body);

    // Admins have no limits
    const isAdmin = isAdminEmail(session.user.email);

    if (!isAdmin) {
      // Check resume limit for regular users
      const subscription = await db.subscription.findUnique({
        where: { userId },
      });

      const resumeCount = await db.resume.count({
        where: { userId },
      });

      const plan = subscription?.plan || "FREE";
      const planLimits = await getPlanLimits(plan);
      const limit = planLimits.maxResumes;

      if (limit !== -1 && resumeCount >= limit) {
        return NextResponse.json(
          { error: "Resume limit reached. Please upgrade your plan." },
          { status: 403 }
        );
      }
    }

    // Default canvas data for new resume
    const defaultCanvasData = validatedData.canvasData || {
      version: "6.0.0",
      objects: [],
      background: "#ffffff",
    };

    // Create resume and track usage in a transaction
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const resume = await withTransaction(
      async (tx) => {
        // Create the resume
        const newResume = await tx.resume.create({
          data: {
            userId: userId,
            title: validatedData.title,
            templateId: validatedData.templateId,
            region: validatedData.region, // @deprecated - kept for backwards compatibility
            showPhoto: validatedData.showPhoto,
            canvasData: defaultCanvasData,
          },
        });

        // Track usage
        await tx.usageRecord.upsert({
          where: {
            userId_type_periodStart_periodEnd: {
              userId: userId,
              type: "RESUME_CREATED",
              periodStart,
              periodEnd,
            },
          },
          create: {
            userId: userId,
            type: "RESUME_CREATED",
            count: 1,
            periodStart,
            periodEnd,
          },
          update: {
            count: { increment: 1 },
          },
        });

        return newResume;
      },
      { operationName: "create resume" }
    );

    return NextResponse.json(resume, { status: 201 });
  } catch (error) {
    return handleApiError(error, "POST /api/resumes");
  }
}
