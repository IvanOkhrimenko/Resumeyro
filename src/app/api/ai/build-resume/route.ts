import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, withTransaction, safeDbOperation } from "@/lib/db";
import { models, generateTextWithRetry, generateTextForTask } from "@/lib/ai/client";
import { BUILD_RESUME_PROMPT, fillPromptTemplate } from "@/lib/ai/prompts";
import { generateCanvasFromResume, generateCanvasFromBlueprint, generateCanvasFromZones, replacePhotoPlaceholder, type BlueprintData, type ZoneLayoutData, type ExtractedPhotoData } from "@/lib/canvas/resume-to-canvas";
import type { ParsedResume } from "@/lib/ai/resume-parser";
import { getPlanLimits } from "@/lib/subscription-plans";
import { isAdminEmail } from "@/lib/settings";
import { handleApiError } from "@/lib/api-utils";
import { extractPhotoFromImage, extractPhotoFromPDF, detectPhotoIntent } from "@/lib/ai/photo-extractor";

// Prompt for extracting ZONE-BASED layout from reference image
// Instead of individual element coordinates, we identify ZONES and what sections go in each
const IMAGE_STYLE_PROMPT = `You are an expert resume layout analyzer. Analyze this resume image and identify its LAYOUT ZONES and STYLING.

Your task is to identify:
1. ZONES - rectangular regions where content is placed
2. What SECTIONS belong in each zone
3. Styling (colors, fonts, sizes)

ZONES are areas like:
- "header" - top area with name/title (may have colored background)
- "sidebar" - left or right column (often colored background)
- "main" - main content area
- "photo-area" - where photo is placed

SECTIONS are content types:
- name, title, contact, profile/summary, experience, education, skills, languages, certifications

OUTPUT THIS JSON:
{
  "layout": {
    "type": "sidebar-left" | "sidebar-right" | "header-only" | "two-column" | "single-column",
    "zones": [
      {
        "id": "header",
        "x": 35,
        "y": 0,
        "width": 65,
        "height": 22,
        "backgroundColor": "#8b7083",
        "textColor": "#ffffff",
        "sections": ["name", "contact"]
      },
      {
        "id": "sidebar",
        "x": 0,
        "y": 0,
        "width": 35,
        "height": 100,
        "backgroundColor": "#f5f0eb",
        "textColor": "#333333",
        "sections": ["photo", "profile", "skills"]
      },
      {
        "id": "main",
        "x": 35,
        "y": 22,
        "width": 65,
        "height": 78,
        "backgroundColor": "#ffffff",
        "textColor": "#333333",
        "sections": ["experience", "education"]
      }
    ]
  },
  "styling": {
    "colors": {
      "primary": "#8b7083",
      "secondary": "#666666",
      "accent": "#8b7083",
      "text": "#333333",
      "textLight": "#666666",
      "background": "#ffffff"
    },
    "fonts": {
      "heading": "Arial",
      "body": "Arial"
    },
    "sizes": {
      "name": 32,
      "title": 14,
      "sectionHeader": 12,
      "jobTitle": 11,
      "body": 9,
      "small": 8
    },
    "sectionHeaderStyle": {
      "uppercase": true,
      "color": "#8b7083",
      "decorative": false
    },
    "nameStyle": {
      "uppercase": true,
      "letterSpacing": 2
    }
  },
  "estimatedPages": 1
}

ZONE MEASUREMENT RULES:
- All values are PERCENTAGES (0-100)
- x=0 is left edge, x=100 is right edge
- y=0 is top edge, y=100 is bottom edge
- Sidebar typically: width 30-40%
- Header typically: height 15-25%

SECTION PLACEMENT LOGIC:
1. If there's a colored sidebar, it usually contains: photo, profile/summary, skills, contact details
2. Main content area usually contains: experience, education
3. Header area usually contains: name, title, sometimes contact
4. Look at WHERE sections are visually placed in the image

COLOR DETECTION:
- Look carefully at background colors - even subtle beige/cream counts as colored
- Header backgrounds are often darker colors
- Section header text often matches the accent color

CRITICAL:
1. ALWAYS include a "main" zone for the primary content area
2. List sections in the order they appear top-to-bottom within each zone
3. If photo exists, include "photo" in the appropriate zone's sections
4. Background colors must be accurate hex values

Return ONLY valid JSON.`;

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Please sign in to use AI Builder" },
        { status: 401 }
      );
    }

    // Store userId for TypeScript type narrowing
    const userId = session.user.id;

    // Check usage limits (same as AI generation)
    const isAdmin = isAdminEmail(session.user.email);

    if (!isAdmin) {
      const subscription = await db.subscription.findUnique({
        where: { userId: userId },
      });

      const plan = subscription?.plan || "FREE";
      const planLimits = await getPlanLimits(plan);
      const limit = planLimits.aiGenerations;

      if (limit !== -1) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const usage = await db.usageRecord.findFirst({
          where: {
            userId: userId,
            type: "AI_GENERATION",
            periodStart: { gte: startOfMonth },
            periodEnd: { lte: endOfMonth },
          },
        });

        const currentCount = usage?.count || 0;

        if (currentCount >= limit) {
          return NextResponse.json(
            {
              error: "AI generation limit reached. Please upgrade your plan.",
              limit,
              used: currentCount,
            },
            { status: 403 }
          );
        }
      }
    }

    // Parse form data
    const formData = await req.formData();
    const prompt = formData.get("prompt") as string;
    const style = (formData.get("style") as string) || "professional";

    // Get separate file arrays
    const resumeFiles = formData.getAll("resumeFiles") as File[];
    const templateFile = formData.get("templateFile") as File | null;

    if (!prompt || prompt.trim().length < 10) {
      return NextResponse.json(
        { error: "Please provide a detailed description of the resume you want to create" },
        { status: 400 }
      );
    }

    // Extract text from resume files (content source)
    let extractedText = "";
    // Analyze template file for style
    let imageStyleData: any = null;
    // Extracted photo from resume
    let extractedPhoto: ExtractedPhotoData | null = null;

    console.log(`[AI Builder] Processing ${resumeFiles.length} resume files, template: ${templateFile?.name || 'none'}`);

    // Process RESUME FILES (content source) - extract text via OCR
    for (const file of resumeFiles) {
      console.log(`[AI Builder] Resume file: ${file.name}, type: ${file.type}, size: ${file.size}`);
      if (file.type === "application/pdf") {
        try {
          console.log(`[AI Builder] Processing PDF: ${file.name}, size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
          const arrayBuffer = await file.arrayBuffer();
          const { extractText } = await import("unpdf");
          const { text, totalPages } = await extractText(arrayBuffer, { mergePages: true });

          if (text && (text as string).trim().length > 50) {
            // Text-based PDF - use extracted text
            console.log(`[AI Builder] Extracted text from ${file.name}: ${totalPages} pages, ${(text as string).length} characters`);
            extractedText += `\n\n=== RESUME CONTENT FROM PDF: ${file.name} (${totalPages} pages) ===\nThis is the user's actual resume content. Extract ALL information from here:\n${text}`;
          } else {
            // Scanned/image-based PDF - use OCR via vision model
            console.log(`[AI Builder] PDF ${file.name} appears to be scanned/image-based. Using AI vision for OCR...`);

            try {
              // Convert PDF pages to images using pdf.js via unpdf
              const { renderPageAsImage } = await import("unpdf");
              const sharp = (await import("sharp")).default;

              // Process up to 10 pages for OCR (covers most resumes)
              const maxPages = Math.min(totalPages || 1, 10);
              let ocrText = "";

              for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
                console.log(`[AI Builder] OCR processing page ${pageNum}/${maxPages}...`);

                // Render page as image
                const pageImage = await renderPageAsImage(arrayBuffer, pageNum, {
                  scale: 2.0, // Higher resolution for better OCR
                });

                // Compress image for API
                const compressedImage = await sharp(Buffer.from(pageImage))
                  .resize(1400, 2000, { fit: "inside", withoutEnlargement: true })
                  .jpeg({ quality: 85 })
                  .toBuffer();

                console.log(`[AI Builder] Page ${pageNum} image size: ${(compressedImage.length / 1024).toFixed(0)} KB`);

                // Use vision model to extract text
                const { text: ocrResponse } = await generateTextWithRetry({
                  model: await models.vision(),
                  messages: [
                    {
                      role: "user",
                      content: [
                        {
                          type: "text",
                          text: `Extract ALL text from this resume page. Return ONLY the extracted text, preserving the structure (sections, bullet points, etc). Do not add any commentary.`,
                        },
                        {
                          type: "image",
                          image: new Uint8Array(compressedImage),
                          mediaType: "image/jpeg",
                        },
                      ],
                    },
                  ],
                  maxOutputTokens: 4000,
                  temperature: 0.1,
                });

                if (ocrResponse && ocrResponse.trim().length > 0) {
                  ocrText += `\n\n--- Page ${pageNum} ---\n${ocrResponse}`;
                }
              }

              if (ocrText.length > 50) {
                console.log(`[AI Builder] OCR extracted ${ocrText.length} characters from ${maxPages} pages`);
                extractedText += `\n\n=== RESUME CONTENT FROM SCANNED PDF: ${file.name} (OCR from ${maxPages} pages) ===\nThis is the user's actual resume content extracted via OCR. Extract ALL information from here:\n${ocrText}`;
              } else {
                console.log(`[AI Builder] OCR returned minimal text`);
              }
            } catch (ocrErr) {
              console.error(`[AI Builder] OCR failed for ${file.name}:`, ocrErr);
            }
          }
        } catch (err) {
          console.error(`[AI Builder] Failed to process PDF ${file.name}:`, err);
        }
      } else if (file.type.startsWith("text/") || file.name.endsWith(".txt")) {
        try {
          const text = await file.text();
          if (text.trim().length > 0) {
            extractedText += `\n\n--- Content from ${file.name} ---\n${text}`;
          }
        } catch (err) {
          console.error(`Failed to read text from ${file.name}:`, err);
        }
      } else if (file.type.startsWith("image/")) {
        // Resume image - extract text content only (OCR)
        try {
          console.log(`[AI Builder] Processing resume image for OCR: ${file.name}`);
          const arrayBuffer = await file.arrayBuffer();
          let imageData: Uint8Array | string = new Uint8Array(arrayBuffer);
          let mimeType = file.type;

          const MAX_SIZE = 3.5 * 1024 * 1024;
          const sharp = (await import("sharp")).default;

          if (file.size > MAX_SIZE) {
            console.log(`[AI Builder] Image too large, compressing...`);
            const compressedBuffer = await sharp(Buffer.from(arrayBuffer))
              .resize(1400, 2000, { fit: "inside", withoutEnlargement: true })
              .jpeg({ quality: 85 })
              .toBuffer();
            imageData = new Uint8Array(compressedBuffer);
            mimeType = "image/jpeg";
          }

          const { text: ocrResponse } = await generateTextWithRetry({
            model: await models.vision(),
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `Extract ALL text from this resume image. Extract all content including: name, contact info, experience, education, skills, etc. Return ONLY the extracted text, preserving structure.`,
                  },
                  {
                    type: "image",
                    image: imageData,
                    mediaType: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                  },
                ],
              },
            ],
            maxOutputTokens: 4000,
            temperature: 0.1,
          });

          if (ocrResponse && ocrResponse.trim().length > 50) {
            console.log(`[AI Builder] OCR extracted ${ocrResponse.length} characters from ${file.name}`);
            extractedText += `\n\n=== RESUME CONTENT FROM IMAGE: ${file.name} (OCR) ===\nThis is the user's resume content extracted via OCR. Extract ALL information from here:\n${ocrResponse}`;
          }
        } catch (err) {
          console.error(`[AI Builder] OCR failed for ${file.name}:`, err);
        }
      }
    }

    // Try to extract photo from resume files (only if not already extracted)
    if (!extractedPhoto) {
      for (const file of resumeFiles) {
        if (extractedPhoto) break; // Only extract first photo found

        try {
          if (file.type === "application/pdf") {
            const arrayBuffer = await file.arrayBuffer();
            console.log(`[AI Builder] Attempting photo extraction from PDF: ${file.name}`);
            extractedPhoto = await extractPhotoFromPDF(arrayBuffer);
            if (extractedPhoto) {
              console.log(`[AI Builder] Photo extracted from PDF: ${file.name}`);
            }
          } else if (file.type.startsWith("image/")) {
            const arrayBuffer = await file.arrayBuffer();
            console.log(`[AI Builder] Attempting photo extraction from image: ${file.name}`);
            extractedPhoto = await extractPhotoFromImage(Buffer.from(arrayBuffer), file.type);
            if (extractedPhoto) {
              console.log(`[AI Builder] Photo extracted from image: ${file.name}`);
            }
          }
        } catch (err) {
          console.warn(`[AI Builder] Photo extraction failed for ${file.name}:`, err);
        }
      }
    }

    // Determine if we should show photo (auto-detect based on inputs)
    const wantsPhoto = detectPhotoIntent(prompt) || !!templateFile || !!extractedPhoto;
    console.log(`[AI Builder] Photo intent: prompt=${detectPhotoIntent(prompt)}, template=${!!templateFile}, extracted=${!!extractedPhoto}, final=${wantsPhoto}`);

    // Process TEMPLATE FILE (style source) - extract style only
    if (templateFile && templateFile.type.startsWith("image/")) {
      try {
        console.log(`[AI Builder] Processing template image for STYLE: ${templateFile.name}`);
        const arrayBuffer = await templateFile.arrayBuffer();
        let imageData: Uint8Array | string = new Uint8Array(arrayBuffer);
        let mimeType = templateFile.type;

        const MAX_SIZE = 3.5 * 1024 * 1024;
        const sharp = (await import("sharp")).default;

        if (templateFile.size > MAX_SIZE) {
          console.log(`[AI Builder] Template image too large, compressing...`);
          const compressedBuffer = await sharp(Buffer.from(arrayBuffer))
            .resize(1400, 2000, { fit: "inside", withoutEnlargement: true })
            .jpeg({ quality: 85 })
            .toBuffer();
          imageData = new Uint8Array(compressedBuffer);
          mimeType = "image/jpeg";
        }

        const { text: styleResponse } = await generateTextWithRetry({
          model: await models.vision(),
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: IMAGE_STYLE_PROMPT },
                {
                  type: "image",
                  image: imageData,
                  mediaType: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                },
              ],
            },
          ],
          maxOutputTokens: 2000,
          temperature: 0.2,
        });

        console.log(`[AI Builder] Style extraction response length: ${styleResponse.length}`);

        const jsonMatch = styleResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          imageStyleData = JSON.parse(jsonMatch[0]);
          console.log(`[AI Builder] Extracted style from template:`, JSON.stringify(imageStyleData, null, 2));
        }
      } catch (err) {
        console.error(`[AI Builder] Style extraction failed for ${templateFile.name}:`, err);
      }
    }

    // Prepare style reference info for the prompt
    let styleReference = "No reference image provided - use style preset instead";
    if (imageStyleData) {
      styleReference = `Reference image analyzed. Use these EXACT styles:\n${JSON.stringify(imageStyleData, null, 2)}\n\nApply these colors, fonts, sizes, and layout to the styling field.`;
    }

    // Fill the prompt template
    const filledPrompt = fillPromptTemplate(BUILD_RESUME_PROMPT, {
      userPrompt: prompt,
      extractedText: extractedText || "No PDF content provided - generate example content based on user's description",
      styleReference,
      style,
      region: "US", // Default region for language purposes
    });

    // Generate resume using AI with automatic fallback to alternative models
    const { text: aiResponse, modelUsed, fallbacksAttempted } = await generateTextForTask(
      "RESUME_GENERATION",
      {
        prompt: filledPrompt,
        maxTokens: 16000, // Increased for large resumes with many jobs
        temperature: 0.3, // Lower temperature for more consistent structure
      }
    );

    if (fallbacksAttempted > 0) {
      console.log(`[AI Builder] Used fallback model: ${modelUsed.provider}/${modelUsed.modelId} after ${fallbacksAttempted} failed attempts`);
    }

    // Parse the AI response as JSON
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("AI response did not contain valid JSON:", aiResponse);
      return NextResponse.json(
        { error: "Failed to generate resume structure. Please try again." },
        { status: 500 }
      );
    }

    let parsedResume: ParsedResume;
    try {
      parsedResume = JSON.parse(jsonMatch[0]) as ParsedResume;

      // Validate required fields
      if (!parsedResume.personalInfo?.fullName) {
        throw new Error("Missing required field: fullName");
      }

      // Ensure arrays are initialized
      parsedResume.experience = parsedResume.experience || [];
      parsedResume.education = parsedResume.education || [];
      parsedResume.skills = parsedResume.skills || [];
      parsedResume.languages = parsedResume.languages || [];
      parsedResume.certifications = parsedResume.certifications || [];

      // If we have image style data, merge it with AI-generated styling
      if (imageStyleData && !parsedResume.styling) {
        parsedResume.styling = {
          layoutType: imageStyleData.layoutType,
          dynamicLayout: imageStyleData.dynamicLayout, // Include dynamic layout from vision
          colors: imageStyleData.colors,
          fonts: imageStyleData.fonts,
          fontSizes: imageStyleData.fontSizes,
          layout: imageStyleData.layout,
        };
      } else if (imageStyleData && parsedResume.styling) {
        // Merge image style with AI styling (image takes precedence for colors and layout)
        parsedResume.styling = {
          layoutType: imageStyleData.layoutType || parsedResume.styling.layoutType,
          dynamicLayout: imageStyleData.dynamicLayout, // Include dynamic layout from vision
          colors: { ...parsedResume.styling.colors, ...imageStyleData.colors },
          fonts: { ...parsedResume.styling.fonts, ...imageStyleData.fonts },
          fontSizes: { ...parsedResume.styling.fontSizes, ...imageStyleData.fontSizes },
          layout: { ...parsedResume.styling.layout, ...imageStyleData.layout },
        };
      }
    } catch (err) {
      console.error("Failed to parse AI response:", err, "\nRaw:", aiResponse);
      return NextResponse.json(
        { error: "Failed to parse resume data. Please try again." },
        { status: 500 }
      );
    }

    // Log final styling
    console.log(`[AI Builder] Final styling:`, JSON.stringify(parsedResume.styling, null, 2));
    console.log(`[AI Builder] Layout type:`, parsedResume.styling?.layoutType);
    console.log(`[AI Builder] Has dynamicLayout:`, !!parsedResume.styling?.dynamicLayout);
    if (parsedResume.styling?.dynamicLayout) {
      console.log(`[AI Builder] Dynamic layout sections:`, parsedResume.styling.dynamicLayout.sections?.length);
    }

    // Generate canvas data from parsed resume
    // Priority: 1. Zone-based layout (new), 2. Blueprint (old), 3. Standard layout
    const effectiveRegion = "US"; // Default region for language purposes (showPhoto is separate setting)

    let canvasData;
    if (imageStyleData?.layout?.zones) {
      // Use zone-based renderer for smarter content placement
      console.log(`[AI Builder] Using zone-based renderer with ${imageStyleData.layout.zones.length} zones`);
      const zoneData: ZoneLayoutData = {
        layout: imageStyleData.layout,
        styling: imageStyleData.styling || {
          colors: { primary: "#333", secondary: "#666", accent: "#333", text: "#333", textLight: "#666", background: "#fff" },
          fonts: { heading: "Arial", body: "Arial" },
          sizes: { name: 28, title: 14, sectionHeader: 12, jobTitle: 11, body: 9, small: 8 },
        },
        estimatedPages: imageStyleData.estimatedPages || 1,
      };
      canvasData = generateCanvasFromZones(parsedResume, zoneData, effectiveRegion);
    } else if (imageStyleData?.blueprint) {
      // Use old blueprint-based renderer (fallback)
      console.log(`[AI Builder] Using blueprint renderer with ${imageStyleData.blueprint.elements?.length || 0} elements`);
      const blueprintData: BlueprintData = {
        blueprint: imageStyleData.blueprint,
        fonts: imageStyleData.fonts || { heading: "Arial", body: "Arial" },
        estimatedPages: imageStyleData.estimatedPages || 1,
      };
      canvasData = generateCanvasFromBlueprint(parsedResume, blueprintData, effectiveRegion);
    } else {
      // Use standard layout generator
      console.log(`[AI Builder] Using standard layout generator`);
      canvasData = generateCanvasFromResume(parsedResume, effectiveRegion, style, wantsPhoto);
    }

    // Replace photo placeholder with extracted photo if available
    if (extractedPhoto && wantsPhoto) {
      console.log(`[AI Builder] Replacing photo placeholder with extracted photo`);
      canvasData = replacePhotoPlaceholder(canvasData, extractedPhoto);
    }

    // Create resume in database
    const canvasDataWithMetadata = {
      ...canvasData,
      metadata: {
        generatedBy: "ai-builder",
        generatedAt: new Date().toISOString(),
        style,
        prompt: prompt.substring(0, 200), // Store truncated prompt for reference
      },
    };

    // Create resume and track usage in a transaction
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const resume = await withTransaction(
      async (tx) => {
        // Create the resume
        const newResume = await tx.resume.create({
          data: {
            userId: userId,
            title: parsedResume.personalInfo.title
              ? `${parsedResume.personalInfo.fullName} - ${parsedResume.personalInfo.title}`
              : parsedResume.personalInfo.fullName,
            region: "US", // @deprecated - kept for backwards compatibility
            showPhoto: wantsPhoto, // Auto-detected based on inputs
            profession: parsedResume.personalInfo.title || null,
            canvasData: JSON.parse(JSON.stringify(canvasDataWithMetadata)),
          },
        });

        // Track usage
        await tx.usageRecord.upsert({
          where: {
            userId_type_periodStart_periodEnd: {
              userId: userId,
              type: "AI_GENERATION",
              periodStart: startOfMonth,
              periodEnd: endOfMonth,
            },
          },
          create: {
            userId: userId,
            type: "AI_GENERATION",
            count: 1,
            periodStart: startOfMonth,
            periodEnd: endOfMonth,
          },
          update: {
            count: { increment: 1 },
          },
        });

        return newResume;
      },
      { operationName: "AI build resume" }
    );

    return NextResponse.json({
      success: true,
      resumeId: resume.id,
      title: resume.title,
    });
  } catch (error) {
    return handleApiError(error, "POST /api/ai/build-resume");
  }
}
