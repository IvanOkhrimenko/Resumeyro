import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseResumeWithAI, type ParsedResume } from "@/lib/ai/resume-parser";
import { generateCanvasFromResume, replacePhotoPlaceholder, type ExtractedPhotoData } from "@/lib/canvas/resume-to-canvas";
import { extractPhotoFromPDF } from "@/lib/ai/photo-extractor";

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
    // Note: showPhoto is handled at resume creation time via /api/resumes

    let importedData: {
      title?: string;
      content?: Record<string, unknown>;
      structuredData?: ParsedResume;
      hasExtractedPhoto?: boolean;
    } = {};

    if (type === "pdf" && file) {
      // Parse PDF file using unpdf (works in Node.js without DOM)
      const arrayBuffer = await file.arrayBuffer();

      let pdfText: string = "";
      let totalPages: number = 0;

      try {
        const { extractText } = await import("unpdf");
        const result = await extractText(arrayBuffer, { mergePages: true });
        pdfText = (result.text as string) || "";
        totalPages = result.totalPages || 1;
      } catch (extractError) {
        console.error("PDF extraction error:", extractError);
        return NextResponse.json(
          {
            error: "Failed to read PDF file. The file may be corrupted or password-protected.",
            details: extractError instanceof Error ? extractError.message : "Unknown error"
          },
          { status: 400 }
        );
      }

      // Check if we got meaningful text
      const trimmedText = pdfText.trim();
      if (trimmedText.length < 50) {
        console.warn(`PDF text extraction returned only ${trimmedText.length} characters`);
        return NextResponse.json(
          {
            error: "Could not extract text from PDF. This might be a scanned image or the PDF has no selectable text.",
            hint: "Try uploading a PDF with selectable text, or create your resume from scratch."
          },
          { status: 400 }
        );
      }

      console.log(`PDF parsed: ${totalPages} pages, ${trimmedText.length} characters extracted`);

      const pdfData = { text: trimmedText, numpages: totalPages };

      // Use AI to parse the resume text
      const parsedResume = await parseResumeWithAI(pdfData.text);

      // Try to extract photo from PDF
      let extractedPhoto: ExtractedPhotoData | null = null;
      try {
        console.log("[Import] Attempting photo extraction from PDF...");
        extractedPhoto = await extractPhotoFromPDF(arrayBuffer);
        if (extractedPhoto) {
          console.log("[Import] Photo extracted successfully from PDF");
        }
      } catch (photoErr) {
        console.warn("[Import] Photo extraction failed:", photoErr);
      }

      // Generate canvas from parsed data (region defaults to US for English section headers)
      // Include photo placeholder only if photo was extracted
      let canvasData = generateCanvasFromResume(parsedResume, "US", "professional", !!extractedPhoto);

      // Replace placeholder with actual photo if extracted
      if (extractedPhoto) {
        canvasData = replacePhotoPlaceholder(canvasData, extractedPhoto);
      }

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
            hasPhoto: !!extractedPhoto,
          },
        },
        structuredData: parsedResume,
        hasExtractedPhoto: !!extractedPhoto,
      };
    } else if (type === "json" && file) {
      // Parse JSON file
      const text = await file.text();

      try {
        const jsonData = JSON.parse(text);

        // Check if it's structured resume data
        if (jsonData.personalInfo) {
          const parsedResume = jsonData as ParsedResume;
          const canvasData = generateCanvasFromResume(parsedResume, "US");

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
