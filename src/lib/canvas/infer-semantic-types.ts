// Infer Semantic Types for Legacy Elements
// For elements that don't have semanticType, try to determine it from text content/position

import { SemanticType } from "./semantic-types";

/**
 * Patterns to identify semantic types from text content
 */
const TEXT_PATTERNS: Array<{ pattern: RegExp; type: SemanticType }> = [
  // Email
  { pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, type: "email" },

  // Phone
  { pattern: /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\./0-9]{6,}$/, type: "phone" },

  // LinkedIn
  { pattern: /linkedin\.com/i, type: "linkedin" },

  // GitHub
  { pattern: /github\.com/i, type: "github" },

  // Website
  { pattern: /^(https?:\/\/)?(www\.)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i, type: "website" },

  // Section headers (uppercase text)
  { pattern: /^(EXPERIENCE|WORK EXPERIENCE|PROFESSIONAL EXPERIENCE|ДОСВІД|ДОСВІД РОБОТИ)$/i, type: "experience_section" },
  { pattern: /^(EDUCATION|ОСВІТА|BILDUNG)$/i, type: "education_section" },
  { pattern: /^(SKILLS|НАВИЧКИ|KEY SKILLS|TECHNICAL SKILLS|KENNTNISSE)$/i, type: "skills_section" },
  { pattern: /^(LANGUAGES|МОВИ|SPRACHEN)$/i, type: "languages_section" },
  { pattern: /^(SUMMARY|ABOUT|PROFILE|ПРО МЕНЕ|ПРОФІЛЬ|PROFIL)$/i, type: "section_header" },
  { pattern: /^(CERTIFICATIONS|СЕРТИФІКАТИ|ZERTIFIKATE)$/i, type: "certifications_section" },
  { pattern: /^(PROJECTS|ПРОЕКТИ|PROJEKTE)$/i, type: "projects_section" },
  { pattern: /^(AWARDS|HONORS|НАГОРОДИ)$/i, type: "awards_section" },
  { pattern: /^(CONTACT|КОНТАКТИ|KONTAKT)$/i, type: "section_header" },
  { pattern: /^(VOLUNTEER|ВОЛОНТЕРСТВО)$/i, type: "volunteer_section" },
  { pattern: /^(INTERESTS|ІНТЕРЕСИ)$/i, type: "interests_section" },
  { pattern: /^(REFERENCES|РЕКОМЕНДАЦІЇ)$/i, type: "references_section" },
  { pattern: /^(LEADERSHIP|LEADERSHIP EXPERIENCE)$/i, type: "experience_section" },
  { pattern: /^(HONORS AND AWARDS)$/i, type: "awards_section" },

  // Dates pattern (for experience/education dates)
  { pattern: /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December|\d{4})\s*[-–]\s*(Present|Current|Now|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December|\d{4})$/i, type: "experience_dates" },
  { pattern: /^\d{4}\s*[-–]\s*\d{4}$/, type: "education_dates" },
  { pattern: /^\d{4}\s*[-–]\s*(Present|Current|Now)$/i, type: "experience_dates" },

  // Language entries (language - level pattern)
  { pattern: /^(English|Ukrainian|German|French|Spanish|Polish|Italian|Russian|Chinese|Japanese|Українська|Англійська|Німецька|Deutsch|Englisch)\s*[-–:]\s*(Native|Fluent|Advanced|Intermediate|Basic|B1|B2|C1|C2|A1|A2|Рідна|Вільно)/i, type: "language_entry" },
];

/**
 * Font size thresholds for type inference
 */
const FONT_SIZE_THRESHOLDS = {
  name: 24,           // Name is usually >= 24px
  title: 14,          // Title/position is 14-18px
  sectionHeader: 10,  // Section headers are often 10-12px bold
  body: 10,           // Body text is typically 9-11px
};

/**
 * Try to infer semantic type from text content
 */
function inferFromText(text: string): SemanticType | null {
  const trimmed = text.trim();

  for (const { pattern, type } of TEXT_PATTERNS) {
    if (pattern.test(trimmed)) {
      return type;
    }
  }

  return null;
}

/**
 * Infer type based on font size and weight
 */
function inferFromStyle(
  fontSize: number,
  fontWeight: string | undefined,
  text: string,
  top: number
): SemanticType | null {
  const isBold = fontWeight === "bold" || fontWeight === "700";

  // Large bold text at top = name
  if (fontSize >= FONT_SIZE_THRESHOLDS.name && isBold && top < 150) {
    return "name";
  }

  // Medium text near name = title
  if (fontSize >= FONT_SIZE_THRESHOLDS.title && fontSize < FONT_SIZE_THRESHOLDS.name && top < 150) {
    return "title";
  }

  // Small bold uppercase = section header
  if (isBold && text === text.toUpperCase() && text.length < 30) {
    return "section_header";
  }

  return null;
}

/**
 * Infer semantic type for a canvas object
 */
export function inferSemanticType(obj: any): SemanticType | null {
  // Already has semantic type
  if (obj.semanticType) {
    return obj.semanticType;
  }

  // Only process text objects
  const type = obj.type?.toLowerCase();
  if (type !== "i-text" && type !== "itext" && type !== "textbox") {
    return null;
  }

  const text = obj.text || "";
  if (!text.trim()) {
    return null;
  }

  // Try to infer from text patterns first
  const textInferred = inferFromText(text);
  if (textInferred) {
    return textInferred;
  }

  // Try to infer from style/position
  const styleInferred = inferFromStyle(
    obj.fontSize || 12,
    obj.fontWeight,
    text,
    obj.top || 0
  );
  if (styleInferred) {
    return styleInferred;
  }

  // Check if it looks like a bullet list (description)
  if (text.includes("•") || text.startsWith("- ") || text.match(/^\d+\./)) {
    return "experience_description";
  }

  // Check if it's a long text (likely summary or description)
  if (text.length > 100) {
    // If near top, it's summary
    if ((obj.top || 0) < 300) {
      return "summary";
    }
    return "experience_description";
  }

  // Default to custom_text if we can't determine
  return "custom_text";
}

/**
 * Add inferred semantic types to all objects in canvas JSON
 * Returns true if any semantic types were added
 */
export function addInferredSemanticTypes(canvasJSON: any): boolean {
  const objects = canvasJSON.objects || [];
  let addedAny = false;

  // First pass: identify likely name (largest bold text near top)
  let largestFontSize = 0;
  let nameCandidate: any = null;

  for (const obj of objects) {
    const type = obj.type?.toLowerCase();
    if (type !== "i-text" && type !== "itext" && type !== "textbox") continue;

    const fontSize = obj.fontSize || 12;
    const top = obj.top || 0;
    const isBold = obj.fontWeight === "bold" || obj.fontWeight === "700";

    if (fontSize > largestFontSize && top < 200 && isBold && !obj.semanticType) {
      largestFontSize = fontSize;
      nameCandidate = obj;
    }
  }

  if (nameCandidate) {
    nameCandidate.semanticType = "name";
    addedAny = true;
  }

  // Second pass: identify other types
  let lastSectionType: SemanticType | null = null;

  // Sort by vertical position
  const sortedObjects = [...objects].sort((a, b) => (a.top || 0) - (b.top || 0));

  for (const obj of sortedObjects) {
    if (obj.semanticType) {
      // Track last section for context
      if (obj.semanticType.endsWith("_section")) {
        lastSectionType = obj.semanticType;
      }
      continue;
    }

    const type = obj.type?.toLowerCase();
    if (type !== "i-text" && type !== "itext" && type !== "textbox") continue;

    let inferred = inferSemanticType(obj);

    // Use context from last section header
    if (inferred === "custom_text" && lastSectionType) {
      const text = obj.text || "";
      const fontSize = obj.fontSize || 12;
      const isBold = obj.fontWeight === "bold" || obj.fontWeight === "700";

      if (lastSectionType === "experience_section") {
        if (isBold && fontSize >= 11) {
          inferred = "experience_title";
        } else if (text.includes("•") || text.length > 50) {
          inferred = "experience_description";
        } else if (text.includes("|") || text.match(/\d{4}/)) {
          inferred = "experience_company";
        }
      } else if (lastSectionType === "education_section") {
        if (isBold && fontSize >= 11) {
          inferred = "education_degree";
        } else if (text.match(/\d{4}/)) {
          inferred = "education_dates";
        } else {
          inferred = "education_institution";
        }
      } else if (lastSectionType === "skills_section") {
        inferred = "skill_list";
      }
    }

    // Track section headers
    if (inferred?.endsWith("_section") || inferred === "section_header") {
      lastSectionType = inferred;
    }

    if (inferred) {
      obj.semanticType = inferred;
      addedAny = true;
    }
  }

  return addedAny;
}

/**
 * Check if canvas has meaningful semantic elements (either explicit or inferred)
 */
export function canvasHasOrCanInferSemanticElements(canvasJSON: any): boolean {
  const objects = canvasJSON.objects || [];

  // Check if any object already has semanticType
  const hasExisting = objects.some((obj: any) => obj.semanticType);
  if (hasExisting) {
    return true;
  }

  // Check if we can infer types
  // Look for: large text (name), section headers, email pattern
  for (const obj of objects) {
    const type = obj.type?.toLowerCase();
    if (type !== "i-text" && type !== "itext" && type !== "textbox") continue;

    const text = obj.text || "";
    const fontSize = obj.fontSize || 12;

    // Has recognizable patterns
    if (inferFromText(text)) {
      return true;
    }

    // Has large text (likely name)
    if (fontSize >= 20) {
      return true;
    }
  }

  return false;
}
