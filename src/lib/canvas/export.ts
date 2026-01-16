import { jsPDF } from "jspdf";
import "svg2pdf.js";
import type { Canvas } from "fabric";
import { ICON_PATHS } from "./icons";

// A4 dimensions in mm
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

// Watermark configuration
const WATERMARK_CONFIG = {
  fontSize: 11,
  iconSize: 5,
  padding: 10,
  color: { r: 80, g: 80, b: 80 }, // Darker gray for better visibility
};

/**
 * Add a styled watermark with icon + text to PDF page
 * Format: [icon] Resumeyro.io 2024
 * Positioned in bottom-right corner
 */
function addWatermarkToPdf(pdf: jsPDF, pageWidth: number, pageHeight: number): void {
  const { fontSize, iconSize, padding, color } = WATERMARK_CONFIG;

  // Dynamic year
  const currentYear = new Date().getFullYear();
  const text = `Resumeyro.io ${currentYear}`;

  // Calculate positions (bottom-right corner)
  const textWidth = pdf.getStringUnitWidth(text) * fontSize / pdf.internal.scaleFactor;
  const totalWidth = iconSize + 3 + textWidth; // icon + gap + text
  const x = pageWidth - padding - totalWidth;
  const y = pageHeight - padding;

  // Set darker gray color for better visibility
  pdf.setTextColor(color.r, color.g, color.b);
  pdf.setDrawColor(color.r, color.g, color.b);
  pdf.setFillColor(color.r, color.g, color.b);

  // Draw document icon (simple rectangle with lines representing text)
  const iconX = x;
  const iconY = y - iconSize + 0.5;

  // Document outline
  pdf.setLineWidth(0.4);
  pdf.rect(iconX, iconY, iconSize * 0.75, iconSize, "S");

  // Folded corner effect
  const cornerSize = iconSize * 0.25;
  const cornerX = iconX + iconSize * 0.75 - cornerSize;
  const cornerY = iconY;
  pdf.setLineWidth(0.3);
  pdf.line(cornerX, cornerY, cornerX, cornerY + cornerSize);
  pdf.line(cornerX, cornerY + cornerSize, cornerX + cornerSize, cornerY + cornerSize);

  // Document lines (representing text)
  const lineStartX = iconX + 0.8;
  const lineEndX = iconX + iconSize * 0.75 - 0.8;
  const lineSpacing = iconSize / 4;

  for (let i = 1; i <= 3; i++) {
    const lineY = iconY + lineSpacing * i + 0.3;
    pdf.setLineWidth(0.25);
    pdf.line(lineStartX, lineY, lineEndX, lineY);
  }

  // Draw text
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(fontSize);
  pdf.text(text, iconX + iconSize * 0.75 + 3, y, { baseline: "bottom" });

  // Add underline to make it look like a link
  const textStartX = iconX + iconSize * 0.75 + 3;
  const underlineY = y + 0.5;
  pdf.setLineWidth(0.2);
  pdf.line(textStartX, underlineY, textStartX + textWidth, underlineY);
}

// Canvas dimensions
const CANVAS_WIDTH = 595;
const CANVAS_HEIGHT = 842;

// Emoji to icon mapping for PDF export
const EMOJI_TO_ICON_PATH: Record<string, { path: string; name: string }> = {
  "📍": { path: ICON_PATHS.location, name: "location" },
  "📞": { path: ICON_PATHS.phone, name: "phone" },
  "✉️": { path: ICON_PATHS.email, name: "email" },
  "📧": { path: ICON_PATHS.email, name: "email" },
  "🔗": { path: ICON_PATHS.link, name: "link" },
  "💼": { path: ICON_PATHS.briefcase, name: "briefcase" },
  "🌐": { path: ICON_PATHS.globe, name: "globe" },
  "👤": { path: ICON_PATHS.user, name: "user" },
};

/**
 * Replace emojis in SVG text elements with actual SVG path icons
 * This allows legacy resumes with emoji icons to export correctly to PDF
 */
function replaceEmojisWithSvgIcons(svgElement: SVGElement): void {
  // Find all tspan and text elements
  const textElements = svgElement.querySelectorAll("tspan, text");

  textElements.forEach((textEl) => {
    const text = textEl.textContent || "";

    // Check for each emoji
    for (const [emoji, iconData] of Object.entries(EMOJI_TO_ICON_PATH)) {
      if (text.includes(emoji)) {
        // Get the text element's position and style
        const tspan = textEl as SVGTSpanElement;
        const parentText = tspan.closest("text") as SVGTextElement;
        if (!parentText) continue;

        // Get position from attributes (SVG is not in DOM yet, so no computed styles)
        const x = parseFloat(tspan.getAttribute("x") || parentText.getAttribute("x") || "0");
        const y = parseFloat(tspan.getAttribute("y") || parentText.getAttribute("y") || "0");

        // Get fill color from attributes
        const fill = tspan.getAttribute("fill") ||
                     parentText.getAttribute("fill") ||
                     tspan.style.fill ||
                     parentText.style.fill ||
                     "#6b7280";

        // Get font size from attributes or style
        const fontSizeAttr = tspan.getAttribute("font-size") ||
                             parentText.getAttribute("font-size") ||
                             tspan.style.fontSize ||
                             parentText.style.fontSize ||
                             "12";
        const fontSize = parseFloat(fontSizeAttr);
        const iconSize = fontSize * 0.85; // Icon slightly smaller than text
        const scale = iconSize / 24; // Icons are 24x24 base

        // Create SVG path element for the icon
        const iconPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        iconPath.setAttribute("d", iconData.path);
        iconPath.setAttribute("fill", fill);
        iconPath.setAttribute("transform", `translate(${x}, ${y - iconSize}) scale(${scale})`);

        // Insert icon before the parent text element
        const parentGroup = parentText.parentElement;
        if (parentGroup) {
          parentGroup.insertBefore(iconPath, parentText);
        }

        // Remove emoji from text and adjust position
        const newText = text.replace(emoji, "").replace(/^\s+/, ""); // Remove emoji and leading space
        textEl.textContent = newText;

        // Shift text to the right to account for the icon
        const newX = x + iconSize + 3; // 3px gap
        tspan.setAttribute("x", String(newX));

        break; // Only handle first emoji per element
      }
    }
  });
}

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
  // These cause extra spacing or garbage characters in the PDF output
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
    .replace(/[\u201C\u201D]/g, '"')
    // White bullet (U+25E6) -> regular bullet or dash (causes %æ in PDF)
    .replace(/\u25E6/g, "•")
    // Black bullet variations
    .replace(/[\u2022\u2023\u2043]/g, "•");
    // Note: Emojis are NOT removed here - they will be converted to SVG icons later

  // Remove letter-spacing and word-spacing (just in case)
  svgString = svgString.replace(/letter-spacing\s*:\s*[^;}"']+;?/gi, "");
  svgString = svgString.replace(/\s*letter-spacing\s*=\s*["'][^"']*["']/gi, "");
  svgString = svgString.replace(/word-spacing\s*:\s*[^;}"']+;?/gi, "");
  svgString = svgString.replace(/\s*word-spacing\s*=\s*["'][^"']*["']/gi, "");

  // Create SVG element
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgString, "image/svg+xml");
  const svgElement = svgDoc.documentElement as unknown as SVGElement;

  // Replace emojis with SVG icons (for legacy resumes that used emoji icons)
  replaceEmojisWithSvgIcons(svgElement);

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

    // Add clipping to prevent content from bleeding across page boundaries
    // Create a clipPath that limits rendering to exactly one page
    const clipId = `page-clip-${pageIndex}`;
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const clipPath = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
    clipPath.setAttribute("id", clipId);
    const clipRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    clipRect.setAttribute("x", "0");
    clipRect.setAttribute("y", String(pageY));
    clipRect.setAttribute("width", String(CANVAS_WIDTH));
    clipRect.setAttribute("height", String(CANVAS_HEIGHT));
    clipPath.appendChild(clipRect);
    defs.appendChild(clipPath);
    pageSvg.insertBefore(defs, pageSvg.firstChild);

    // Wrap all content in a group with the clip-path
    const wrapper = document.createElementNS("http://www.w3.org/2000/svg", "g");
    wrapper.setAttribute("clip-path", `url(#${clipId})`);

    // Move all existing children into the wrapper
    while (pageSvg.childNodes.length > 1) {
      const child = pageSvg.childNodes[1];
      if (child !== defs) {
        wrapper.appendChild(child);
      }
    }
    pageSvg.appendChild(wrapper);

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
      addWatermarkToPdf(pdf, pageWidth, pageHeight);
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
