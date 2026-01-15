import { jsPDF } from "jspdf";
import "svg2pdf.js";
import type { Canvas } from "fabric";

// A4 dimensions in mm
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

// Canvas dimensions
const CANVAS_WIDTH = 595;
const CANVAS_HEIGHT = 842;

export interface ExportOptions {
  format?: "a4" | "letter";
  quality?: number;
  filename?: string;
  addWatermark?: boolean;
}

// Calculate actual content height (excluding page break lines)
function getActualContentHeight(canvas: Canvas): number {
  let maxBottom = CANVAS_HEIGHT;

  canvas.getObjects().forEach((obj: any) => {
    if (obj._isPageBreak) return;
    if (obj.selectable === false && obj.evented === false) return;

    const rect = obj.getBoundingRect?.() || {
      top: typeof obj.top === "number" ? obj.top : 0,
      height: typeof obj.height === "number" ? obj.height : 0,
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
    addWatermark = false,
  } = options;

  // Calculate number of pages
  const contentHeight = getActualContentHeight(canvas);
  const pageThreshold = 10;
  const numPages = Math.max(1, Math.ceil((contentHeight - pageThreshold) / CANVAS_HEIGHT));


  // Save current state
  const originalZoom = canvas.getZoom();
  canvas.setZoom(1);

  // Hide page break lines
  const pageBreakLines: any[] = [];
  canvas.getObjects().forEach((obj: any) => {
    if (obj._isPageBreak) {
      pageBreakLines.push(obj);
      obj.set("visible", false);
    }
  });
  canvas.renderAll();

  // Create PDF
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format,
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Get SVG from canvas
  let svgString = canvas.toSVG({
    viewBox: {
      x: 0,
      y: 0,
      width: CANVAS_WIDTH,
      height: contentHeight,
    },
    width: `${CANVAS_WIDTH}px`,
    height: `${contentHeight}px`,
  });

  // Normalize special Unicode characters that svg2pdf.js can't render properly
  // These cause extra spacing in the PDF output
  svgString = svgString
    // Non-breaking hyphen (U+2011) -> regular hyphen
    .replace(/\u2011/g, "-")
    // Figure dash (U+2012) -> regular hyphen
    .replace(/\u2012/g, "-")
    // En dash (U+2013) -> regular hyphen
    .replace(/\u2013/g, "-")
    // Em dash (U+2014) -> regular hyphen
    .replace(/\u2014/g, "--")
    // Non-breaking space (U+00A0) -> regular space
    .replace(/\u00A0/g, " ")
    // Narrow no-break space (U+202F) -> regular space
    .replace(/\u202F/g, " ")
    // Zero-width space (U+200B) -> remove
    .replace(/\u200B/g, "")
    // Word joiner (U+2060) -> remove
    .replace(/\u2060/g, "")
    // Left/right single quotes -> regular quotes
    .replace(/[\u2018\u2019]/g, "'")
    // Left/right double quotes -> regular quotes
    .replace(/[\u201C\u201D]/g, '"');

  // Remove letter-spacing and word-spacing (just in case)
  svgString = svgString.replace(/letter-spacing\s*:\s*[^;}"']+;?/gi, "");
  svgString = svgString.replace(/\s*letter-spacing\s*=\s*["'][^"']*["']/gi, "");
  svgString = svgString.replace(/word-spacing\s*:\s*[^;}"']+;?/gi, "");
  svgString = svgString.replace(/\s*word-spacing\s*=\s*["'][^"']*["']/gi, "");

  // Create SVG element
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgString, "image/svg+xml");
  const svgElement = svgDoc.documentElement as unknown as SVGElement;

  // Render each page
  for (let pageIndex = 0; pageIndex < numPages; pageIndex++) {
    if (pageIndex > 0) {
      pdf.addPage();
    }

    const pageY = pageIndex * CANVAS_HEIGHT;

    // Clone SVG for this page
    const pageSvg = svgElement.cloneNode(true) as SVGElement;

    // Set viewBox to show only this page's portion
    pageSvg.setAttribute("viewBox", `0 ${pageY} ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`);
    pageSvg.setAttribute("width", `${pageWidth}mm`);
    pageSvg.setAttribute("height", `${pageHeight}mm`);

    // Add to document temporarily
    pageSvg.style.position = "absolute";
    pageSvg.style.left = "-9999px";
    document.body.appendChild(pageSvg);

    try {
      await (pdf as any).svg(pageSvg, {
        x: 0,
        y: 0,
        width: pageWidth,
        height: pageHeight,
      });
    } finally {
      document.body.removeChild(pageSvg);
    }

    // Add watermark if needed
    if (addWatermark) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(200, 200, 200);
      pdf.text("Created with Resumeyro", pageWidth / 2, pageHeight - 5, {
        align: "center",
      });
    }
  }

  // Restore state
  pageBreakLines.forEach((line) => line.set("visible", true));
  canvas.setZoom(originalZoom);
  canvas.renderAll();

  return pdf.output("blob");
}

export async function downloadPDF(
  canvas: Canvas,
  options: ExportOptions = {}
): Promise<void> {
  const { filename = "resume" } = options;
  const blob = await exportCanvasToPDF(canvas, options);

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
