/**
 * Photo Extraction Utility
 * Automatically detects and extracts photos from uploaded resumes
 */

import { models, generateTextWithRetry } from "./client";

// Prompt for detecting and locating photos in resume images
const PHOTO_DETECTION_PROMPT = `Analyze this resume image and find the person's professional photo/headshot if present.

If a photo exists:
1. Return the approximate bounding box as percentages of the image dimensions
2. Describe the photo shape: "circle", "rounded", or "square"

IMPORTANT:
- Look for a headshot/portrait photo of a person (typically in a corner or sidebar)
- Ignore any decorative elements, icons, or company logos
- If there are multiple people, identify the main profile photo
- If no person's photo is found, set hasPhoto to false

OUTPUT JSON ONLY:
{
  "hasPhoto": true/false,
  "photo": {
    "x": 5,
    "y": 5,
    "width": 15,
    "height": 18,
    "shape": "circle"
  }
}

Where:
- x: percentage from left edge (0-100)
- y: percentage from top edge (0-100)
- width: percentage of image width
- height: percentage of image height
- shape: "circle" | "rounded" | "square"

If hasPhoto is false, set photo to null.
Return ONLY valid JSON, nothing else.`;

export interface ExtractedPhoto {
  photoDataUrl: string;
  shape: "circle" | "rounded" | "square";
  width: number;
  height: number;
}

interface PhotoBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  shape: "circle" | "rounded" | "square";
}

interface PhotoDetectionResult {
  hasPhoto: boolean;
  photo: PhotoBounds | null;
}

/**
 * Detect and extract a photo from a resume image
 *
 * @param imageBuffer - Buffer containing the image data
 * @param mimeType - MIME type of the image (e.g., "image/jpeg", "image/png")
 * @returns Extracted photo data URL and shape, or null if no photo found
 */
export async function extractPhotoFromImage(
  imageBuffer: Buffer,
  mimeType: string
): Promise<ExtractedPhoto | null> {
  try {
    const sharp = (await import("sharp")).default;

    // Step 1: Get image dimensions
    const metadata = await sharp(imageBuffer).metadata();
    const imgWidth = metadata.width;
    const imgHeight = metadata.height;

    if (!imgWidth || !imgHeight) {
      console.warn("[Photo Extractor] Could not get image dimensions");
      return null;
    }

    // Step 2: Compress image for API if needed
    let processedImage = imageBuffer;
    let processedMimeType = mimeType;
    const MAX_SIZE = 3.5 * 1024 * 1024;

    if (imageBuffer.length > MAX_SIZE) {
      console.log("[Photo Extractor] Compressing image for detection...");
      processedImage = await sharp(imageBuffer)
        .resize(1400, 2000, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
      processedMimeType = "image/jpeg";
    }

    // Step 3: Ask vision model to find photo location
    console.log("[Photo Extractor] Detecting photo in image...");
    const { text } = await generateTextWithRetry({
      model: await models.vision(),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PHOTO_DETECTION_PROMPT },
            {
              type: "image",
              image: new Uint8Array(processedImage),
              mediaType: processedMimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
            },
          ],
        },
      ],
      maxOutputTokens: 500,
      temperature: 0.1,
    });

    // Step 4: Parse response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn("[Photo Extractor] No JSON found in response");
      return null;
    }

    let result: PhotoDetectionResult;
    try {
      result = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.warn("[Photo Extractor] Failed to parse JSON:", parseError);
      return null;
    }

    if (!result.hasPhoto || !result.photo) {
      console.log("[Photo Extractor] No photo detected in image");
      return null;
    }

    const bounds = result.photo;
    console.log(`[Photo Extractor] Photo detected at (${bounds.x}%, ${bounds.y}%) size ${bounds.width}%x${bounds.height}%`);

    // Step 5: Validate bounds
    if (
      bounds.x < 0 || bounds.x > 100 ||
      bounds.y < 0 || bounds.y > 100 ||
      bounds.width <= 0 || bounds.width > 50 ||
      bounds.height <= 0 || bounds.height > 50
    ) {
      console.warn("[Photo Extractor] Invalid bounds detected, skipping extraction");
      return null;
    }

    // Step 6: Crop photo from original image
    const cropX = Math.round((bounds.x / 100) * imgWidth);
    const cropY = Math.round((bounds.y / 100) * imgHeight);
    const cropW = Math.round((bounds.width / 100) * imgWidth);
    const cropH = Math.round((bounds.height / 100) * imgHeight);

    // Ensure crop dimensions are valid
    const safeCropX = Math.max(0, Math.min(cropX, imgWidth - 1));
    const safeCropY = Math.max(0, Math.min(cropY, imgHeight - 1));
    const safeCropW = Math.min(cropW, imgWidth - safeCropX);
    const safeCropH = Math.min(cropH, imgHeight - safeCropY);

    if (safeCropW < 20 || safeCropH < 20) {
      console.warn("[Photo Extractor] Extracted region too small");
      return null;
    }

    console.log(`[Photo Extractor] Cropping photo: ${safeCropX},${safeCropY} ${safeCropW}x${safeCropH}`);

    const croppedPhoto = await sharp(imageBuffer)
      .extract({
        left: safeCropX,
        top: safeCropY,
        width: safeCropW,
        height: safeCropH,
      })
      .resize(200, 200, { fit: "cover" }) // Standardize to square
      .jpeg({ quality: 90 })
      .toBuffer();

    const photoDataUrl = `data:image/jpeg;base64,${croppedPhoto.toString("base64")}`;
    console.log(`[Photo Extractor] Photo extracted successfully (${(croppedPhoto.length / 1024).toFixed(1)} KB)`);

    return {
      photoDataUrl,
      shape: bounds.shape || "square",
      width: 200,
      height: 200,
    };
  } catch (error) {
    console.error("[Photo Extractor] Error extracting photo:", error);
    return null;
  }
}

/**
 * Detect if user wants a photo based on their prompt
 *
 * @param prompt - User's prompt text
 * @returns true if user explicitly mentions wanting a photo
 */
export function detectPhotoIntent(prompt: string): boolean {
  const photoKeywords = [
    // English
    "with photo",
    "include photo",
    "add photo",
    "has photo",
    "my photo",
    "profile picture",
    "headshot",
    "portrait",
    "with picture",
    "include picture",
    "add picture",
    // Ukrainian
    "з фото",
    "додати фото",
    "включити фото",
    "моє фото",
    "з фотографією",
    "фотокартка",
    "із фото",
    "з портретом",
    "з фоткою",
  ];

  const lowerPrompt = prompt.toLowerCase();
  return photoKeywords.some((keyword) => lowerPrompt.includes(keyword));
}

/**
 * Extract photo from PDF by rendering first page as image
 *
 * @param pdfBuffer - Buffer containing the PDF data
 * @returns Extracted photo data or null
 */
export async function extractPhotoFromPDF(
  pdfBuffer: ArrayBuffer
): Promise<ExtractedPhoto | null> {
  try {
    const { renderPageAsImage } = await import("unpdf");

    // Render first page as image
    console.log("[Photo Extractor] Rendering PDF first page for photo detection...");
    const pageImage = await renderPageAsImage(pdfBuffer, 1, { scale: 2.0 });

    // Extract photo from rendered page
    return extractPhotoFromImage(Buffer.from(pageImage), "image/png");
  } catch (error) {
    console.error("[Photo Extractor] Error extracting photo from PDF:", error);
    return null;
  }
}
