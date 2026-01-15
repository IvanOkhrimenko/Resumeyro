"use client";

import { Canvas, FabricObject, IText, Textbox } from "fabric";
import type { FormattingResult } from "@/stores/ai-features-store";

/**
 * Apply AI-recommended formatting to canvas elements
 */

interface ApplyOptions {
  applyColors?: boolean;
  applyFonts?: boolean;
  applySpacing?: boolean;
  reorderSections?: boolean;
}

/**
 * Infer semantic type from element properties when not explicitly set
 */
function inferSemanticType(obj: FabricObject): string | null {
  const anyObj = obj as any;
  const text = (anyObj.text || "").toLowerCase().trim();
  const fontSize = anyObj.fontSize || 12;
  const fontWeight = anyObj.fontWeight || "normal";
  const top = obj.top || 0;
  const charSpacing = anyObj.charSpacing || 0;
  const isUpperCase = text === text.toUpperCase() && text.length > 2;
  const isBold = fontWeight === "bold" || fontWeight >= 600;

  // Name - large font at top
  if (fontSize >= 20 && top < 100) {
    return "name";
  }

  // Title/Role - medium font near top, not uppercase
  if (fontSize >= 12 && fontSize < 20 && top < 120 && !isUpperCase) {
    return "title";
  }

  // Section headers - uppercase with spacing or bold
  if (isUpperCase && (charSpacing > 20 || isBold) && text.length < 40) {
    // Detect specific sections
    if (text.includes("experience") || text.includes("work")) return "experience_section";
    if (text.includes("education")) return "education_section";
    if (text.includes("skill")) return "skills_section";
    if (text.includes("summary") || text.includes("profile") || text.includes("about")) return "summary";
    if (text.includes("project")) return "projects_section";
    if (text.includes("certif")) return "certifications_section";
    if (text.includes("language")) return "languages_section";
    return "section_header"; // Generic section
  }

  // Contact info by content
  if (text.includes("@") && text.includes(".")) return "email";
  if (/[\+]?\d[\d\s\-\(\)]{7,}/.test(text)) return "phone";
  if (text.includes("linkedin")) return "linkedin";
  if (text.includes("github")) return "github";
  if (text.includes("http") || text.includes("www.")) return "website";

  // Date patterns
  if (/\d{4}\s*[-–—]\s*(\d{4}|present|current|now)/i.test(text) ||
      /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b.*\d{4}/i.test(text)) {
    return "experience_dates";
  }

  // Job titles - bold, not too long
  if (isBold && text.length < 60 && !isUpperCase && top > 100) {
    return "experience_title";
  }

  // Descriptions - longer text
  if (text.length > 100) {
    return "experience_description";
  }

  // Default body text
  if (text.length > 20) {
    return "body_text";
  }

  return null;
}

// Semantic type categories for styling
const semanticCategories = {
  heading: ["name", "experience_section", "education_section", "skills_section", "certifications_section", "projects_section", "languages_section", "section_header"],
  title: ["title", "experience_title", "education_degree", "certification_name", "project_name"],
  subtitle: ["experience_company", "education_institution", "certification_issuer"],
  dates: ["experience_dates", "education_dates", "certification_date"],
  body: ["summary", "experience_description", "project_description", "skill_list", "skill_category", "body_text"],
  contact: ["email", "phone", "location", "linkedin", "github", "website", "portfolio", "twitter", "telegram"],
};

// Section order mapping
const sectionSemanticTypes: Record<string, string[]> = {
  contact: ["email", "phone", "location", "linkedin", "github", "website", "portfolio"],
  summary: ["summary", "objective"],
  experience: ["experience_section", "experience_title", "experience_company", "experience_dates", "experience_description"],
  education: ["education_section", "education_degree", "education_institution", "education_dates"],
  skills: ["skills_section", "skill_category", "skill_list", "technical_skills", "soft_skills"],
  projects: ["projects_section", "project_name", "project_description", "project_url"],
  certifications: ["certifications_section", "certification_name", "certification_issuer", "certification_date"],
  awards: ["awards_section", "award_name", "award_issuer", "award_date"],
  languages: ["languages_section", "language"],
  interests: ["interests_section", "interest"],
};

/**
 * Get the category for a semantic type
 */
function getCategoryForSemanticType(semanticType: string | undefined): keyof typeof semanticCategories | null {
  if (!semanticType) return null;
  for (const [category, types] of Object.entries(semanticCategories)) {
    if (types.some(t => semanticType === t || semanticType.startsWith(t))) {
      return category as keyof typeof semanticCategories;
    }
  }
  return null;
}

/**
 * Get the section for a semantic type
 */
function getSectionForSemanticType(semanticType: string | undefined): string | null {
  if (!semanticType) return null;
  for (const [section, types] of Object.entries(sectionSemanticTypes)) {
    if (types.some(t => semanticType === t || semanticType.startsWith(t))) {
      return section;
    }
  }
  return null;
}

/**
 * Apply color styling to canvas elements
 */
export function applyColorStyling(
  canvas: Canvas,
  colors: FormattingResult["styling"]["colors"]
): void {
  const objects = canvas.getObjects().filter((obj: FabricObject) => {
    const anyObj = obj as any;
    return !anyObj._isPageBreak && !anyObj.isBackground && obj.selectable !== false;
  });

  console.log("[ApplyFormatting] Total objects:", objects.length);

  // Log all semantic types for debugging
  const explicitTypes = objects.map((obj: FabricObject) => (obj as any).semanticType).filter(Boolean);
  console.log("[ApplyFormatting] Explicit semantic types:", [...new Set(explicitTypes)]);

  let changedCount = 0;
  objects.forEach((obj: FabricObject) => {
    const anyObj = obj as any;

    // Use explicit semantic type or infer from properties
    const semanticType = anyObj.semanticType || inferSemanticType(obj);
    if (!semanticType) return;

    const category = getCategoryForSemanticType(semanticType);
    if (!category) {
      // Only log if we had an explicit type that didn't match
      if (anyObj.semanticType) {
        console.log("[ApplyFormatting] No category for explicit type:", anyObj.semanticType);
      }
      return;
    }

    console.log("[ApplyFormatting] Processing:", semanticType, "-> category:", category);

    let newColor: string | undefined;

    switch (category) {
      case "heading":
        newColor = colors.primary;
        break;
      case "title":
        newColor = colors.primary;
        break;
      case "subtitle":
        newColor = colors.secondary;
        break;
      case "dates":
        newColor = colors.textLight;
        break;
      case "body":
        newColor = colors.text;
        break;
      case "contact":
        newColor = colors.accent;
        break;
    }

    if (newColor && anyObj.fill !== newColor) {
      console.log("[ApplyFormatting] Changing color for", anyObj.semanticType, ":", anyObj.fill, "->", newColor);
      obj.set("fill", newColor);
      changedCount++;
    }
  });

  console.log("[ApplyFormatting] Total colors changed:", changedCount);
  canvas.requestRenderAll();
}

/**
 * Apply only font family (no size changes) - safe for layout
 */
export function applyFontFamilyOnly(
  canvas: Canvas,
  fonts: FormattingResult["styling"]["fonts"]
): void {
  const objects = canvas.getObjects().filter((obj: FabricObject) => {
    const anyObj = obj as any;
    return !anyObj._isPageBreak && !anyObj.isBackground && obj.selectable !== false;
  });

  let changedCount = 0;
  objects.forEach((obj: FabricObject) => {
    const anyObj = obj as any;
    if (!(obj instanceof IText) && !(obj instanceof Textbox)) return;

    // Use explicit semantic type or infer from properties
    const semanticType = anyObj.semanticType || inferSemanticType(obj);
    if (!semanticType) return;

    const category = getCategoryForSemanticType(semanticType);
    if (!category) return;

    // Apply font family based on category
    const isHeadingLike = category === "heading" || category === "title";
    const fontFamily = isHeadingLike ? fonts.heading : fonts.body;

    if (anyObj.fontFamily !== fontFamily) {
      obj.set("fontFamily", fontFamily);
      changedCount++;
    }
  });

  console.log("[ApplyFormatting] Font families changed:", changedCount);
  canvas.requestRenderAll();
}

/**
 * Apply font styling to canvas elements (includes size changes - may break layout)
 */
export function applyFontStyling(
  canvas: Canvas,
  fonts: FormattingResult["styling"]["fonts"],
  fontSizes: FormattingResult["styling"]["fontSizes"]
): void {
  const objects = canvas.getObjects().filter((obj: FabricObject) => {
    const anyObj = obj as any;
    return !anyObj._isPageBreak && !anyObj.isBackground && obj.selectable !== false;
  });

  objects.forEach((obj: FabricObject) => {
    const anyObj = obj as any;
    if (!(obj instanceof IText) && !(obj instanceof Textbox)) return;

    // Use explicit semantic type or infer from properties
    const semanticType = anyObj.semanticType || inferSemanticType(obj);
    if (!semanticType) return;

    const category = getCategoryForSemanticType(semanticType);
    if (!category) return;

    // Apply font family
    const isHeadingLike = category === "heading" || category === "title";
    const fontFamily = isHeadingLike ? fonts.heading : fonts.body;

    if (anyObj.fontFamily !== fontFamily) {
      obj.set("fontFamily", fontFamily);
    }

    // Apply font size based on semantic type
    let fontSize: number | undefined;

    if (semanticType === "name") {
      fontSize = fontSizes.name;
    } else if (semanticType === "title") {
      fontSize = fontSizes.title;
    } else if (semanticType.includes("_section") || semanticType === "section_header") {
      fontSize = fontSizes.sectionHeader;
    } else if (category === "title") {
      fontSize = fontSizes.jobTitle;
    } else if (category === "dates") {
      fontSize = fontSizes.small;
    } else if (category === "body" || category === "contact" || category === "subtitle") {
      fontSize = fontSizes.body;
    }

    if (fontSize && anyObj.fontSize !== fontSize) {
      obj.set("fontSize", fontSize);
    }
  });

  canvas.requestRenderAll();
}

/**
 * Recalculate vertical positions after font/size changes
 * This prevents text overlap by adjusting element positions based on their new heights
 */
export function recalculateLayout(canvas: Canvas, spacing: number = 8): void {
  const objects = canvas.getObjects().filter((obj: FabricObject) => {
    const anyObj = obj as any;
    return !anyObj._isPageBreak && !anyObj.isBackground && obj.selectable !== false;
  });

  if (objects.length === 0) return;

  // Sort objects by their current top position
  objects.sort((a, b) => (a.top || 0) - (b.top || 0));

  // Group objects by approximate vertical position (same "row")
  const rows: FabricObject[][] = [];
  let currentRow: FabricObject[] = [];
  let lastTop = -Infinity;
  const ROW_THRESHOLD = 15; // Objects within 15px are considered same row

  objects.forEach((obj) => {
    const top = obj.top || 0;
    if (top - lastTop > ROW_THRESHOLD && currentRow.length > 0) {
      rows.push(currentRow);
      currentRow = [];
    }
    currentRow.push(obj);
    lastTop = top;
  });
  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  console.log("[RecalculateLayout] Found", rows.length, "rows");

  // Recalculate positions row by row
  let currentY = rows[0]?.[0]?.top || 50; // Start from first element's position

  rows.forEach((row, rowIndex) => {
    // Find the tallest element in this row
    let maxHeight = 0;
    row.forEach((obj) => {
      // Update object coordinates to get accurate dimensions
      obj.setCoords();
      const height = (obj.height || 0) * (obj.scaleY || 1);
      if (height > maxHeight) maxHeight = height;
    });

    // Move all objects in this row to currentY
    row.forEach((obj) => {
      const currentTop = obj.top || 0;
      if (Math.abs(currentTop - currentY) > 2) {
        obj.set("top", currentY);
        obj.setCoords();
      }
    });

    // Move to next row position
    currentY += maxHeight + spacing;
  });

  canvas.requestRenderAll();
  console.log("[RecalculateLayout] Layout recalculated");
}

/**
 * Apply spacing adjustments to canvas elements
 */
export function applySpacingStyling(
  canvas: Canvas,
  spacing: FormattingResult["styling"]["spacing"]
): void {
  const objects = canvas.getObjects().filter((obj: FabricObject) => {
    const anyObj = obj as any;
    return !anyObj._isPageBreak && !anyObj.isBackground && obj.selectable !== false;
  });

  // Group objects by section
  const sections = new Map<string, FabricObject[]>();

  objects.forEach((obj: FabricObject) => {
    const anyObj = obj as any;
    const semanticType = anyObj.semanticType || inferSemanticType(obj);
    if (!semanticType) return;

    const section = getSectionForSemanticType(semanticType);
    if (section) {
      if (!sections.has(section)) {
        sections.set(section, []);
      }
      sections.get(section)!.push(obj);
    }
  });

  // Apply line height to textboxes
  objects.forEach((obj: FabricObject) => {
    if (obj instanceof Textbox) {
      const anyObj = obj as any;
      const semanticType = anyObj.semanticType || inferSemanticType(obj);
      const category = getCategoryForSemanticType(semanticType);

      if (category === "body") {
        obj.set("lineHeight", spacing.lineHeight);
      }
    }
  });

  canvas.requestRenderAll();
}

/**
 * Group canvas objects by their section
 */
function groupObjectsBySection(canvas: Canvas): Map<string, FabricObject[]> {
  const sections = new Map<string, FabricObject[]>();
  const objects = canvas.getObjects().filter((obj: FabricObject) => {
    const anyObj = obj as any;
    return !anyObj._isPageBreak && !anyObj.isBackground && obj.selectable !== false;
  });

  // Sort objects by top position
  objects.sort((a, b) => (a.top || 0) - (b.top || 0));

  objects.forEach((obj: FabricObject) => {
    const anyObj = obj as any;
    if (!anyObj.semanticType) {
      // Objects without semantic type go to "other"
      if (!sections.has("other")) {
        sections.set("other", []);
      }
      sections.get("other")!.push(obj);
      return;
    }

    const section = getSectionForSemanticType(anyObj.semanticType);
    if (section) {
      if (!sections.has(section)) {
        sections.set(section, []);
      }
      sections.get(section)!.push(obj);
    } else {
      // Personal info (name, title) stays at top
      if (anyObj.semanticType === "name" || anyObj.semanticType === "title" || anyObj.semanticType === "photo") {
        if (!sections.has("personal")) {
          sections.set("personal", []);
        }
        sections.get("personal")!.push(obj);
      } else {
        if (!sections.has("other")) {
          sections.set("other", []);
        }
        sections.get("other")!.push(obj);
      }
    }
  });

  return sections;
}

/**
 * Reorder sections on canvas based on recommended order
 */
export function reorderSections(
  canvas: Canvas,
  sectionOrder: string[],
  sectionSpacing: number = 25
): void {
  const sections = groupObjectsBySection(canvas);

  // Calculate current section bounds
  const sectionBounds = new Map<string, { minTop: number; maxBottom: number; objects: FabricObject[] }>();

  sections.forEach((objects, sectionName) => {
    let minTop = Infinity;
    let maxBottom = 0;

    objects.forEach((obj) => {
      const top = obj.top || 0;
      const bottom = top + (obj.height || 0) * (obj.scaleY || 1);

      if (top < minTop) minTop = top;
      if (bottom > maxBottom) maxBottom = bottom;
    });

    sectionBounds.set(sectionName, { minTop, maxBottom, objects });
  });

  // Start positioning after personal info
  let currentY = 50; // Default start for name/title

  // First, position personal info at the top
  const personalSection = sections.get("personal");
  if (personalSection) {
    const bounds = sectionBounds.get("personal");
    if (bounds) {
      const sectionHeight = bounds.maxBottom - bounds.minTop;
      const offsetY = currentY - bounds.minTop;

      if (Math.abs(offsetY) > 5) {
        personalSection.forEach((obj) => {
          obj.set("top", (obj.top || 0) + offsetY);
          obj.setCoords();
        });
      }

      currentY += sectionHeight + sectionSpacing;
    }
  }

  // Position contact info if it should be at top
  const contactAtTop = sectionOrder.indexOf("contact") < 2;
  if (contactAtTop && sections.has("contact")) {
    const contactObjects = sections.get("contact")!;
    const bounds = sectionBounds.get("contact");
    if (bounds) {
      const sectionHeight = bounds.maxBottom - bounds.minTop;
      const offsetY = currentY - bounds.minTop;

      if (Math.abs(offsetY) > 5) {
        contactObjects.forEach((obj) => {
          obj.set("top", (obj.top || 0) + offsetY);
          obj.setCoords();
        });
      }

      currentY += sectionHeight + sectionSpacing;
    }
  }

  // Position remaining sections according to order
  for (const sectionName of sectionOrder) {
    // Skip personal and contact if already positioned
    if (sectionName === "personal") continue;
    if (sectionName === "contact" && contactAtTop) continue;

    if (!sections.has(sectionName)) continue;

    const sectionObjects = sections.get(sectionName)!;
    const bounds = sectionBounds.get(sectionName);
    if (!bounds) continue;

    const sectionHeight = bounds.maxBottom - bounds.minTop;
    const offsetY = currentY - bounds.minTop;

    // Only move if offset is significant
    if (Math.abs(offsetY) > 5) {
      sectionObjects.forEach((obj) => {
        obj.set("top", (obj.top || 0) + offsetY);
        obj.setCoords();
      });
    }

    currentY += sectionHeight + sectionSpacing;
  }

  // Position any remaining sections not in the order
  sections.forEach((objects, sectionName) => {
    if (sectionName === "personal" || sectionName === "other") return;
    if (sectionOrder.includes(sectionName)) return;

    const bounds = sectionBounds.get(sectionName);
    if (!bounds) return;

    const sectionHeight = bounds.maxBottom - bounds.minTop;
    const offsetY = currentY - bounds.minTop;

    if (Math.abs(offsetY) > 5) {
      objects.forEach((obj) => {
        obj.set("top", (obj.top || 0) + offsetY);
        obj.setCoords();
      });
    }

    currentY += sectionHeight + sectionSpacing;
  });

  canvas.requestRenderAll();
}

/**
 * Apply all formatting at once
 */
export function applyFullFormatting(
  canvas: Canvas,
  formatting: FormattingResult,
  options: ApplyOptions = {}
): void {
  const {
    applyColors = true,
    applyFonts = true,
    applySpacing = true,
    reorderSections: shouldReorder = false,
  } = options;

  if (applyColors) {
    applyColorStyling(canvas, formatting.styling.colors);
  }

  if (applyFonts) {
    // Only apply font family, not sizes - size changes break layout
    applyFontFamilyOnly(canvas, formatting.styling.fonts);
  }

  if (applySpacing) {
    applySpacingStyling(canvas, formatting.styling.spacing);
  }

  if (shouldReorder && formatting.sectionOrder) {
    reorderSections(canvas, formatting.sectionOrder, formatting.styling.spacing.sectionSpacing);
  }
}

/**
 * Preview formatting changes without applying them
 * Returns a summary of what would change
 */
export function previewFormattingChanges(
  canvas: Canvas,
  formatting: FormattingResult
): { colorChanges: number; fontChanges: number; spacingChanges: number; sectionMoves: number } {
  let colorChanges = 0;
  let fontChanges = 0;
  let spacingChanges = 0;
  let sectionMoves = 0;

  const objects = canvas.getObjects().filter((obj: FabricObject) => {
    const anyObj = obj as any;
    return !anyObj._isPageBreak && !anyObj.isBackground && obj.selectable !== false;
  });

  objects.forEach((obj: FabricObject) => {
    const anyObj = obj as any;
    if (!anyObj.semanticType) return;

    const category = getCategoryForSemanticType(anyObj.semanticType);
    if (!category) return;

    // Check color changes
    let expectedColor: string | undefined;
    switch (category) {
      case "heading":
      case "title":
        expectedColor = formatting.styling.colors.primary;
        break;
      case "subtitle":
        expectedColor = formatting.styling.colors.secondary;
        break;
      case "dates":
        expectedColor = formatting.styling.colors.textLight;
        break;
      case "body":
        expectedColor = formatting.styling.colors.text;
        break;
      case "contact":
        expectedColor = formatting.styling.colors.accent;
        break;
    }
    if (expectedColor && anyObj.fill !== expectedColor) {
      colorChanges++;
    }

    // Check font changes
    if (obj instanceof IText || obj instanceof Textbox) {
      const isHeadingLike = category === "heading" || category === "title";
      const expectedFont = isHeadingLike ? formatting.styling.fonts.heading : formatting.styling.fonts.body;

      if (anyObj.fontFamily !== expectedFont) {
        fontChanges++;
      }
    }

    // Check spacing (line height)
    if (obj instanceof Textbox && category === "body") {
      if (anyObj.lineHeight !== formatting.styling.spacing.lineHeight) {
        spacingChanges++;
      }
    }
  });

  // Check section order changes
  if (formatting.sectionOrder) {
    const sections = groupObjectsBySection(canvas);
    const currentOrder: string[] = [];

    // Get current order based on top positions
    const sectionPositions: { name: string; top: number }[] = [];
    sections.forEach((objects, sectionName) => {
      if (sectionName === "personal" || sectionName === "other") return;
      const minTop = Math.min(...objects.map(o => o.top || 0));
      sectionPositions.push({ name: sectionName, top: minTop });
    });

    sectionPositions.sort((a, b) => a.top - b.top);
    sectionPositions.forEach(s => currentOrder.push(s.name));

    // Compare with recommended order
    formatting.sectionOrder.forEach((section, idx) => {
      const currentIdx = currentOrder.indexOf(section);
      if (currentIdx !== -1 && currentIdx !== idx) {
        sectionMoves++;
      }
    });
  }

  return { colorChanges, fontChanges, spacingChanges, sectionMoves };
}
