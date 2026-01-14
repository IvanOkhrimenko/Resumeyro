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

// Semantic type categories for styling
const semanticCategories = {
  heading: ["name", "experience_section", "education_section", "skills_section", "certifications_section", "projects_section"],
  title: ["title", "experience_title", "education_degree", "certification_name", "project_name"],
  subtitle: ["experience_company", "education_institution", "certification_issuer"],
  dates: ["experience_dates", "education_dates", "certification_date"],
  body: ["summary", "experience_description", "project_description", "skill_list", "skill_category"],
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
function getCategoryForSemanticType(semanticType: string): keyof typeof semanticCategories | null {
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
function getSectionForSemanticType(semanticType: string): string | null {
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

  objects.forEach((obj: FabricObject) => {
    const anyObj = obj as any;
    if (!anyObj.semanticType) return;

    const category = getCategoryForSemanticType(anyObj.semanticType);
    if (!category) return;

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
      obj.set("fill", newColor);
    }
  });

  canvas.requestRenderAll();
}

/**
 * Apply font styling to canvas elements
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
    if (!anyObj.semanticType) return;
    if (!(obj instanceof IText) && !(obj instanceof Textbox)) return;

    const category = getCategoryForSemanticType(anyObj.semanticType);
    if (!category) return;

    // Apply font family
    const isHeadingLike = category === "heading" || category === "title";
    const fontFamily = isHeadingLike ? fonts.heading : fonts.body;

    if (anyObj.fontFamily !== fontFamily) {
      obj.set("fontFamily", fontFamily);
    }

    // Apply font size based on semantic type
    let fontSize: number | undefined;

    if (anyObj.semanticType === "name") {
      fontSize = fontSizes.name;
    } else if (anyObj.semanticType === "title") {
      fontSize = fontSizes.title;
    } else if (anyObj.semanticType.includes("_section")) {
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
    if (!anyObj.semanticType) return;

    const section = getSectionForSemanticType(anyObj.semanticType);
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
      const category = getCategoryForSemanticType(anyObj.semanticType);

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
    applyFontStyling(canvas, formatting.styling.fonts, formatting.styling.fontSizes);
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
