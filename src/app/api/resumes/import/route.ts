import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseResumeWithAI, type ParsedResume } from "@/lib/ai/resume-parser";
import { generateCanvasFromResume } from "@/lib/canvas/resume-to-canvas";

// POST /api/resumes/import - Import resume from file or URL
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const type = formData.get("type") as string;
    const file = formData.get("file") as File | null;
    const linkedinUrl = formData.get("linkedinUrl") as string | null;
    const region = (formData.get("region") as "US" | "EU" | "UA") || "US";

    let importedData: {
      title?: string;
      content?: Record<string, unknown>;
      structuredData?: ParsedResume;
    } = {};

    if (type === "pdf" && file) {
      // Parse PDF file using unpdf (works in Node.js without DOM)
      const arrayBuffer = await file.arrayBuffer();

      const { extractText } = await import("unpdf");
      const { text: pdfText, totalPages } = await extractText(arrayBuffer, { mergePages: true });

      if (!pdfText || (pdfText as string).trim().length < 50) {
        return NextResponse.json(
          { error: "Could not extract text from PDF. Please ensure it's not a scanned image." },
          { status: 400 }
        );
      }

      const pdfData = { text: pdfText as string, numpages: totalPages };

      // Use AI to parse the resume text
      const parsedResume = await parseResumeWithAI(pdfData.text);

      // Generate canvas from parsed data
      const canvasData = generateCanvasFromResume(parsedResume, region);

      const fileName = file.name.replace(/\.pdf$/i, "");

      importedData = {
        title: parsedResume.personalInfo.fullName || fileName || "Imported Resume",
        content: {
          ...canvasData,
          metadata: {
            importedFrom: "pdf",
            originalFileName: file.name,
            importedAt: new Date().toISOString(),
            pdfPages: pdfData.numpages,
          },
        },
        structuredData: parsedResume,
      };
    } else if (type === "json" && file) {
      // Parse JSON file
      const text = await file.text();

      try {
        const jsonData = JSON.parse(text);

        // Check if it's structured resume data
        if (jsonData.personalInfo) {
          const parsedResume = jsonData as ParsedResume;
          const canvasData = generateCanvasFromResume(parsedResume, region);

          importedData = {
            title: parsedResume.personalInfo.fullName || "Imported Resume",
            content: canvasData,
            structuredData: parsedResume,
          };
        } else {
          // Legacy canvas data format
          importedData = {
            title: jsonData.title || jsonData.name || "Imported Resume",
            content: jsonData.canvasData || jsonData.content || {
              version: "6.0.0",
              objects: [],
              background: "#ffffff",
              ...jsonData,
            },
          };
        }
      } catch {
        return NextResponse.json(
          { error: "Invalid JSON file format" },
          { status: 400 }
        );
      }
    } else if (type === "linkedin" && linkedinUrl) {
      // LinkedIn import would require OAuth and API access
      // For now, return a placeholder

      if (!linkedinUrl.includes("linkedin.com")) {
        return NextResponse.json(
          { error: "Invalid LinkedIn URL" },
          { status: 400 }
        );
      }

      // Extract username from URL for title
      const urlParts = linkedinUrl.split("/");
      const inIndex = urlParts.indexOf("in");
      const username = inIndex !== -1 ? urlParts[inIndex + 1] : "User";

      importedData = {
        title: `${username}'s Resume`,
        content: {
          version: "6.0.0",
          objects: [],
          background: "#ffffff",
          metadata: {
            importedFrom: "linkedin",
            linkedinUrl,
            importedAt: new Date().toISOString(),
          },
        },
      };
    } else {
      return NextResponse.json(
        { error: "Invalid import type or missing file" },
        { status: 400 }
      );
    }

    return NextResponse.json(importedData);
  } catch (error) {
    console.error("Error importing resume:", error);
    const message = error instanceof Error ? error.message : "Failed to import resume";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
