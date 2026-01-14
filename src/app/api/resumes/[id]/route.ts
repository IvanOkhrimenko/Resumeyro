import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, withTransaction, safeDbOperation } from "@/lib/db";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { handleApiError } from "@/lib/api-utils";

const updateResumeSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  canvasData: z.any().optional().nullable(),
  structuredData: z.any().optional(),
  thumbnail: z.string().optional(),
  region: z.enum(["US", "EU", "UA"]).optional(),
  profession: z.string().optional(),
  isPublic: z.boolean().optional(),
  slug: z.string().optional(),
});

// GET /api/resumes/[id] - Get single resume
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resume = await safeDbOperation(
      () =>
        db.resume.findFirst({
          where: {
            id,
            userId: session.user.id,
          },
          include: {
            template: true,
            aiReviews: {
              orderBy: { createdAt: "desc" },
              take: 5,
            },
          },
        }),
      { operationName: "fetch resume" }
    );

    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    return NextResponse.json(resume);
  } catch (error) {
    return handleApiError(error, "GET /api/resumes/[id]");
  }
}

// PUT /api/resumes/[id] - Update resume
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = updateResumeSchema.parse(body);

    // Check ownership
    const existingResume = await safeDbOperation(
      () =>
        db.resume.findFirst({
          where: {
            id,
            userId: session.user.id,
          },
        }),
      { operationName: "check resume ownership" }
    );

    if (!existingResume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    // Handle canvas data reset (null means reset to empty)
    if (validatedData.canvasData === null) {
      validatedData.canvasData = {
        version: "6.0.0",
        objects: [],
        background: "#ffffff",
      };
    }

    // Clean canvas data - remove viewport transform to prevent position issues
    if (
      validatedData.canvasData !== undefined &&
      typeof validatedData.canvasData === "object" &&
      validatedData.canvasData !== null
    ) {
      delete (validatedData.canvasData as Record<string, unknown>)
        .viewportTransform;
    }

    // Update resume with version management in a transaction
    const resume = await withTransaction(
      async (tx) => {
        // Save version before update (if canvas data changed)
        if (validatedData.canvasData !== undefined) {
          await tx.resumeVersion.create({
            data: {
              resumeId: id,
              canvasData: existingResume.canvasData as Prisma.InputJsonValue,
            },
          });

          // Keep only last 10 versions - get IDs to delete
          const versions = await tx.resumeVersion.findMany({
            where: { resumeId: id },
            orderBy: { createdAt: "desc" },
            skip: 10,
            select: { id: true },
          });

          if (versions.length > 0) {
            await tx.resumeVersion.deleteMany({
              where: {
                id: { in: versions.map((v) => v.id) },
              },
            });
          }
        }

        // Update the resume
        return tx.resume.update({
          where: { id },
          data: validatedData,
        });
      },
      { operationName: "update resume with version" }
    );

    return NextResponse.json(resume);
  } catch (error) {
    return handleApiError(error, "PUT /api/resumes/[id]");
  }
}

// DELETE /api/resumes/[id] - Delete resume
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check ownership
    const resume = await safeDbOperation(
      () =>
        db.resume.findFirst({
          where: {
            id,
            userId: session.user.id,
          },
        }),
      { operationName: "check resume ownership for delete" }
    );

    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    // Delete resume (cascades to versions)
    await withTransaction(
      async (tx) => {
        await tx.resume.delete({ where: { id } });
      },
      { operationName: "delete resume" }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "DELETE /api/resumes/[id]");
  }
}
