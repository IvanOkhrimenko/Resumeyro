import { jsPDF } from "jspdf";
import type { Canvas } from "fabric";

// A4 dimensions in mm
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

// Canvas dimensions (96 DPI)
const CANVAS_WIDTH = 595;
const CANVAS_HEIGHT = 842;

export interface ExportOptions {
  format?: "a4" | "letter";
  quality?: number;
  filename?: string;
  addWatermark?: boolean;
}

// Calculate actual content height (excluding page break lines and non-interactive objects)
// This should match the logic in resume-canvas.tsx updateCanvasSize
function getActualContentHeight(canvas: Canvas): number {
  let maxBottom = CANVAS_HEIGHT; // Start with one page minimum (same as canvas)

  canvas.getObjects().forEach((obj: any) => {
    // Skip page break lines
    if (obj._isPageBreak) return;
    // Skip non-interactive objects (same filter as canvas)
    if (obj.selectable === false && obj.evented === false) return;

    // Use getBoundingRect for accurate bounds (accounts for transforms)
    const rect = obj.getBoundingRect?.() || {
      top: typeof obj.top === 'number' ? obj.top : 0,
      height: typeof obj.height === 'number' ? obj.height : 0
    };
    const bottom = rect.top + rect.height;

    if (bottom > maxBottom) {
      maxBottom = bottom;
    }
  });

  return maxBottom;
}

export async function exportCanvasToPDF(
  canvas: Canvas,
  options: ExportOptions = {}
): Promise<Blob> {
  const {
    format = "a4",
    quality = 1,
    filename = "resume",
    addWatermark = false,
  } = options;

  // Calculate actual content height
  const contentHeight = getActualContentHeight(canvas);

  // Calculate number of pages needed (based on actual content, not canvas size)
  // Only include a page if there's meaningful content on it (more than 10px past the boundary)
  const pageThreshold = 10;
  const numPages = Math.max(1, Math.ceil((contentHeight - pageThreshold) / CANVAS_HEIGHT));

  console.log(`[Export] Content height: ${contentHeight}px, Pages needed: ${numPages}`);

  // Create PDF
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Get canvas dimensions
  const canvasWidth = canvas.getWidth();
  const canvasHeight = canvas.getHeight();
  const zoom = canvas.getZoom();

  // Original canvas dimensions (without zoom)
  const originalWidth = canvasWidth / zoom;
  const originalHeight = canvasHeight / zoom;

  // Hide page break lines before export
  const pageBreakLines: any[] = [];
  canvas.getObjects().forEach((obj: any) => {
    if (obj._isPageBreak) {
      pageBreakLines.push(obj);
      obj.set('visible', false);
    }
  });
  canvas.renderAll();

  // For multi-page: render each page separately
  for (let pageIndex = 0; pageIndex < numPages; pageIndex++) {
    if (pageIndex > 0) {
      pdf.addPage();
    }

    // Create a temporary canvas for this page
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) continue;

    // Set temp canvas size (2x for quality)
    const multiplier = 2;
    tempCanvas.width = CANVAS_WIDTH * multiplier;
    tempCanvas.height = CANVAS_HEIGHT * multiplier;

    // Get the full canvas as image (page break lines are hidden)
    const fullDataUrl = canvas.toDataURL({
      format: "png",
      quality,
      multiplier,
    });

    // Load the image
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = fullDataUrl;
    });

    // Calculate source area for this page
    const sourceY = pageIndex * CANVAS_HEIGHT * multiplier * (zoom);
    const sourceHeight = CANVAS_HEIGHT * multiplier * zoom;

    // Fill with white background
    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Draw the portion of the canvas for this page
    tempCtx.drawImage(
      img,
      0, sourceY, // source x, y
      img.width, sourceHeight, // source width, height
      0, 0, // dest x, y
      tempCanvas.width, tempCanvas.height // dest width, height
    );

    // Get page image
    const pageDataUrl = tempCanvas.toDataURL('image/png', quality);

    // Add to PDF
    pdf.addImage(pageDataUrl, "PNG", 0, 0, pageWidth, pageHeight);

    // Add watermark if needed (for free tier)
    if (addWatermark) {
      pdf.setFontSize(10);
      pdf.setTextColor(200, 200, 200);
      pdf.text("Created with Resumeyro", pageWidth / 2, pageHeight - 5, {
        align: "center",
      });
    }
  }

  // Restore page break lines visibility
  pageBreakLines.forEach((line) => {
    line.set('visible', true);
  });
  canvas.renderAll();

  // Return as blob
  return pdf.output("blob");
}

export async function downloadPDF(
  canvas: Canvas,
  options: ExportOptions = {}
): Promise<void> {
  const { filename = "resume" } = options;
  const blob = await exportCanvasToPDF(canvas, options);

  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function getCanvasAsImage(canvas: Canvas, format: "png" | "jpeg" = "png"): string {
  return canvas.toDataURL({
    format,
    quality: 1,
    multiplier: 2,
  });
}
