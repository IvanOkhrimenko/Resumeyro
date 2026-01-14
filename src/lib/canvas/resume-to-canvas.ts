import { nanoid } from "nanoid";
import type { ParsedResume, ResumeStylePreset, DynamicLayout, SectionLayout, SectionPosition } from "@/lib/ai/resume-parser";

// A4 dimensions at 96 DPI
const A4_WIDTH = 595;
const A4_HEIGHT = 842;
const MARGIN = 40;
const CONTENT_WIDTH = A4_WIDTH - MARGIN * 2;

// Blueprint types (from vision model)
export interface BlueprintBackground {
  id: string;
  x: number;      // percentage
  y: number;      // percentage
  width: number;  // percentage
  height: number; // percentage
  color: string;
  type: "sidebar" | "header" | "column-bg";
}

export interface BlueprintElement {
  type: "name" | "title" | "section-header" | "body-text" | "job-title" | "company" | "date" | "bullet-point" | "skill-item" | "contact-item" | "photo" | "divider";
  x: number;      // percentage
  y: number;      // percentage
  width: number;  // percentage
  height?: number; // percentage (for photo/divider)
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: "normal" | "bold";
  color?: string;
  align?: "left" | "center" | "right";
  uppercase?: boolean;
  label?: string;  // For section headers - the actual header text style
  section?: string; // Which data section this belongs to (experience, education, etc.)
  bulletStyle?: "dot" | "dash" | "none";
  shape?: "square" | "circle"; // For photo
  thickness?: number; // For divider
}

export interface Blueprint {
  backgrounds: BlueprintBackground[];
  elements: BlueprintElement[];
  columns: {
    count: number;
    leftWidth: number;  // percentage
    rightWidth: number; // percentage
    gap: number;        // percentage
  };
  margins: {
    top: number;    // percentage
    bottom: number; // percentage
    left: number;   // percentage
    right: number;  // percentage
  };
}

export interface BlueprintData {
  blueprint: Blueprint;
  fonts: {
    heading: string;
    body: string;
  };
  estimatedPages: number;
}

// Zone-based layout types (new approach)
export interface LayoutZone {
  id: string;  // "header", "sidebar", "main", "photo-area"
  x: number;   // percentage
  y: number;   // percentage
  width: number;  // percentage
  height: number; // percentage
  backgroundColor: string;
  textColor: string;
  sections: string[]; // ["name", "contact"] or ["profile", "skills"]
}

export interface ZoneLayoutData {
  layout: {
    type: "sidebar-left" | "sidebar-right" | "header-only" | "two-column" | "single-column";
    zones: LayoutZone[];
  };
  styling: {
    colors: {
      primary: string;
      secondary: string;
      accent: string;
      text: string;
      textLight: string;
      background: string;
    };
    fonts: {
      heading: string;
      body: string;
    };
    sizes: {
      name: number;
      title: number;
      sectionHeader: number;
      jobTitle: number;
      body: number;
      small: number;
    };
    sectionHeaderStyle?: {
      uppercase?: boolean;
      color?: string;
      decorative?: boolean;
    };
    nameStyle?: {
      uppercase?: boolean;
      letterSpacing?: number;
    };
  };
  estimatedPages: number;
}

// Standard web-safe fonts for matching
const STANDARD_FONTS: Record<string, string> = {
  // Sans-serif
  "arial": "Arial, Helvetica, sans-serif",
  "helvetica": "Helvetica, Arial, sans-serif",
  "verdana": "Verdana, Geneva, sans-serif",
  "trebuchet": "Trebuchet MS, sans-serif",
  "trebuchet ms": "Trebuchet MS, sans-serif",
  "tahoma": "Tahoma, Geneva, sans-serif",
  "calibri": "Calibri, Arial, sans-serif",
  "segoe ui": "Segoe UI, Arial, sans-serif",
  "open sans": "Open Sans, Arial, sans-serif",
  "roboto": "Roboto, Arial, sans-serif",
  "lato": "Lato, Arial, sans-serif",
  // Serif
  "times new roman": "Times New Roman, Times, serif",
  "times": "Times New Roman, Times, serif",
  "georgia": "Georgia, Times, serif",
  "garamond": "Garamond, Georgia, serif",
  "palatino": "Palatino Linotype, Book Antiqua, Palatino, serif",
  "palatino linotype": "Palatino Linotype, Book Antiqua, Palatino, serif",
  "book antiqua": "Book Antiqua, Palatino, serif",
  "cambria": "Cambria, Georgia, serif",
};

function normalizeFont(fontName: string): string {
  if (!fontName) return "Arial, sans-serif";
  const normalized = fontName.toLowerCase().trim();
  return STANDARD_FONTS[normalized] || fontName;
}

// Region-specific section headers
type Region = "US" | "EU" | "UA";

const SECTION_HEADERS: Record<Region, {
  contact: string;
  details: string;
  summary: string;
  profile: string;
  experience: string;
  employment: string;
  education: string;
  skills: string;
  languages: string;
  certifications: string;
  aboutMe: string;
}> = {
  US: {
    contact: "CONTACT",
    details: "DETAILS",
    summary: "PROFESSIONAL SUMMARY",
    profile: "PROFILE",
    experience: "WORK EXPERIENCE",
    employment: "EMPLOYMENT HISTORY",
    education: "EDUCATION",
    skills: "SKILLS",
    languages: "LANGUAGES",
    certifications: "CERTIFICATIONS",
    aboutMe: "ABOUT ME",
  },
  EU: {
    contact: "CONTACT",
    details: "PERSONAL DETAILS",
    summary: "PROFESSIONAL SUMMARY",
    profile: "PROFILE",
    experience: "WORK EXPERIENCE",
    employment: "EMPLOYMENT HISTORY",
    education: "EDUCATION",
    skills: "SKILLS",
    languages: "LANGUAGES",
    certifications: "CERTIFICATIONS",
    aboutMe: "ABOUT ME",
  },
  UA: {
    contact: "КОНТАКТИ",
    details: "ОСОБИСТІ ДАНІ",
    summary: "ПРО МЕНЕ",
    profile: "ПРОФІЛЬ",
    experience: "ДОСВІД РОБОТИ",
    employment: "ІСТОРІЯ ПРАЦЕВЛАШТУВАННЯ",
    education: "ОСВІТА",
    skills: "НАВИЧКИ",
    languages: "МОВИ",
    certifications: "СЕРТИФІКАТИ",
    aboutMe: "ПРО МЕНЕ",
  },
};

// Photo dimensions for EU/UA
const PHOTO_WIDTH = 80;
const PHOTO_HEIGHT = 100;

// Default styling presets
const DEFAULT_STYLES: Record<string, ResumeStylePreset> = {
  professional: {
    colors: {
      primary: "#1a1a2e",
      secondary: "#64748b",
      text: "#334155",
      textLight: "#475569",
      accent: "#0057b8",
      background: "#ffffff",
      headerText: "#ffffff",
    },
    fonts: {
      heading: "Arial, sans-serif",
      body: "Arial, sans-serif",
    },
    fontSizes: {
      name: 24,
      title: 12,
      sectionHeader: 11,
      jobTitle: 11,
      body: 9,
      small: 9,
    },
    layout: {
      headerHeight: 80,
      sectionSpacing: 20,
      lineHeight: 1.4,
    },
  },
  creative: {
    colors: {
      primary: "#7c3aed",
      secondary: "#6b7280",
      text: "#1f2937",
      textLight: "#4b5563",
      accent: "#ec4899",
      background: "#ffffff",
      headerText: "#ffffff",
    },
    fonts: {
      heading: "Trebuchet MS, sans-serif",
      body: "Verdana, sans-serif",
    },
    fontSizes: {
      name: 28,
      title: 14,
      sectionHeader: 12,
      jobTitle: 11,
      body: 10,
      small: 9,
    },
    layout: {
      headerHeight: 100,
      sectionSpacing: 25,
      lineHeight: 1.5,
    },
  },
  minimal: {
    colors: {
      primary: "#f3f4f6",
      secondary: "#9ca3af",
      text: "#111827",
      textLight: "#374151",
      accent: "#111827",
      background: "#ffffff",
      headerText: "#111827",
    },
    fonts: {
      heading: "Georgia, serif",
      body: "Georgia, serif",
    },
    fontSizes: {
      name: 22,
      title: 11,
      sectionHeader: 10,
      jobTitle: 10,
      body: 9,
      small: 8,
    },
    layout: {
      headerHeight: 70,
      sectionSpacing: 18,
      lineHeight: 1.4,
    },
  },
};

// Merge custom styling with defaults
function getStyles(resume: ParsedResume, stylePreset: string = "professional"): ResumeStylePreset {
  const baseStyle = DEFAULT_STYLES[stylePreset] || DEFAULT_STYLES.professional;

  if (!resume.styling) {
    return baseStyle;
  }

  // Deep merge custom styling with base style
  return {
    layoutType: resume.styling.layoutType || baseStyle.layoutType,
    dynamicLayout: resume.styling.dynamicLayout, // Pass through dynamic layout from AI
    colors: { ...baseStyle.colors, ...resume.styling.colors },
    fonts: { ...baseStyle.fonts, ...resume.styling.fonts },
    fontSizes: { ...baseStyle.fontSizes, ...resume.styling.fontSizes },
    layout: { ...baseStyle.layout, ...resume.styling.layout },
  };
}

interface CanvasObject {
  id: string;
  type: string;
  left: number;
  top: number;
  [key: string]: unknown;
}

export interface CanvasData {
  version: string;
  objects: CanvasObject[];
  background: string;
  pageCount?: number;  // Number of pages in the document
  pages?: CanvasPage[]; // Multi-page data (if more than 1 page)
  [key: string]: unknown;
}

export interface CanvasPage {
  pageNumber: number;
  objects: CanvasObject[];
  background: string;
}

function createId(): string {
  return nanoid(10);
}

function estimateTextHeight(
  text: string,
  fontSize: number,
  lineHeight: number,
  maxWidth: number,
  isBold: boolean = false
): number {
  // More accurate character width estimation
  // Bold text is about 10% wider, and we use a more conservative estimate
  const avgCharWidth = fontSize * (isBold ? 0.65 : 0.58);
  const charsPerLine = Math.floor(maxWidth / avgCharWidth);

  // Handle empty text
  if (!text || text.trim().length === 0) {
    return fontSize * lineHeight;
  }

  const lines = text.split('\n').reduce((total, line) => {
    if (line.length === 0) return total + 1;
    // Add extra padding for word wrapping uncertainty
    const estimatedLines = Math.ceil(line.length / charsPerLine);
    return total + Math.max(1, estimatedLines);
  }, 0);

  // Add a small buffer for rendering differences
  return lines * fontSize * lineHeight + 2;
}

// Semantic types for template switching support
type SemanticType =
  | "name" | "title" | "email" | "phone" | "location" | "linkedin" | "github" | "website" | "portfolio"
  | "summary" | "objective"
  | "section_header"
  | "experience_section" | "experience_title" | "experience_company" | "experience_dates" | "experience_description" | "experience_location"
  | "education_section" | "education_degree" | "education_institution" | "education_dates" | "education_gpa" | "education_description"
  | "skills_section" | "skill_list" | "skill_category" | "technical_skills" | "soft_skills"
  | "languages_section" | "language_entry"
  | "certifications_section" | "certification_name" | "certification_issuer" | "certification_date"
  | "projects_section" | "project_name" | "project_description" | "project_url" | "project_technologies"
  | "awards_section" | "award_name" | "award_description"
  | "volunteer_section" | "volunteer_role" | "volunteer_organization" | "volunteer_description"
  | "interests_section" | "interests_list"
  | "references_section" | "references_available"
  | "publications_section" | "publication_title"
  | "contact_info" | "custom_text";

function createTextObject(
  text: string,
  left: number,
  top: number,
  styles: ResumeStylePreset,
  options: {
    fontSize?: number;
    fontWeight?: string;
    fill?: string;
    width?: number;
    fontFamily?: string;
    semanticType?: SemanticType;
    semanticGroup?: string;
  } = {}
): CanvasObject {
  return {
    id: createId(),
    type: "textbox",
    left,
    top,
    text,
    fontSize: options.fontSize || styles.fontSizes.body,
    fontFamily: options.fontFamily || styles.fonts.body,
    fontWeight: options.fontWeight || "normal",
    fill: options.fill || styles.colors.text,
    width: options.width || CONTENT_WIDTH,
    lineHeight: styles.layout.lineHeight,
    splitByGrapheme: false,
    originX: "left",
    originY: "top",
    // Semantic properties for template switching
    semanticType: options.semanticType,
    semanticGroup: options.semanticGroup,
  };
}

function createRectObject(
  left: number,
  top: number,
  width: number,
  height: number,
  fill: string,
  options: { selectable?: boolean; stroke?: string; strokeWidth?: number } = {}
): CanvasObject {
  return {
    id: createId(),
    type: "rect",
    left,
    top,
    width,
    height,
    fill,
    stroke: options.stroke,
    strokeWidth: options.strokeWidth,
    selectable: options.selectable ?? true,
    originX: "left",
    originY: "top",
  };
}

// Create photo placeholder for EU/UA regions
function createPhotoPlaceholder(
  left: number,
  top: number,
  styles: ResumeStylePreset
): CanvasObject[] {
  const objects: CanvasObject[] = [];

  // Photo frame
  objects.push(
    createRectObject(left, top, PHOTO_WIDTH, PHOTO_HEIGHT, "#f3f4f6", {
      stroke: styles.colors.secondary,
      strokeWidth: 1,
    })
  );

  // Photo icon placeholder (simple person silhouette using text)
  objects.push({
    id: createId(),
    type: "textbox",
    left: left + PHOTO_WIDTH / 2 - 15,
    top: top + PHOTO_HEIGHT / 2 - 12,
    text: "📷",
    fontSize: 24,
    fill: styles.colors.secondary,
    width: 30,
    textAlign: "center",
    originX: "left",
    originY: "top",
  });

  return objects;
}

export function generateCanvasFromResume(
  resume: ParsedResume,
  region: "US" | "EU" | "UA" = "US",
  stylePreset: string = "professional"
): CanvasData {
  // Get merged styles (AI-provided + defaults)
  const styles = getStyles(resume, stylePreset);
  const layoutType = styles.layoutType || "single-column";
  const headers = SECTION_HEADERS[region];

  console.log(`[Canvas] Generating layout: ${layoutType}, region: ${region}`);
  console.log(`[Canvas] Has dynamicLayout:`, !!styles.dynamicLayout);

  // Check for dynamic layout first (reference image was provided)
  if (layoutType === "dynamic" && styles.dynamicLayout) {
    console.log(`[Canvas] Using dynamic layout renderer`);
    return generateDynamicLayout(resume, styles, styles.dynamicLayout, headers);
  }

  // Route to appropriate layout generator for predefined layouts
  switch (layoutType) {
    case "sidebar-left":
    case "two-column-left": // Legacy alias
      return generateSidebarLeftLayout(resume, styles, region, headers);
    case "sidebar-right":
    case "two-column-right": // Legacy alias
      return generateSidebarRightLayout(resume, styles, region, headers);
    case "header-two-column":
      return generateHeaderTwoColumnLayout(resume, styles, region, headers);
    case "single-column":
    default:
      return generateSingleColumnLayout(resume, styles, region, headers);
  }
}

// Single column layout (original implementation)
function generateSingleColumnLayout(
  resume: ParsedResume,
  styles: ResumeStylePreset,
  region: Region,
  headers: typeof SECTION_HEADERS["US"]
): CanvasData {
  const objects: CanvasObject[] = [];
  let y = 0;
  const showPhoto = region !== "US";

  // === HEADER SECTION ===
  if (styles.layout.headerHeight > 0) {
    objects.push(
      createRectObject(0, 0, A4_WIDTH, styles.layout.headerHeight, styles.colors.primary, { selectable: false })
    );

    // Name - positioned relative to header height
    const nameY = Math.floor(styles.layout.headerHeight * 0.3);
    objects.push(
      createTextObject(resume.personalInfo.fullName.toUpperCase(), MARGIN, nameY, styles, {
        fontSize: styles.fontSizes.name,
        fontWeight: "bold",
        fill: styles.colors.headerText,
        fontFamily: styles.fonts.heading,
        semanticType: "name",
      })
    );

    // Title
    if (resume.personalInfo.title) {
      const titleY = Math.floor(styles.layout.headerHeight * 0.65);
      objects.push(
        createTextObject(resume.personalInfo.title, MARGIN, titleY, styles, {
          fontSize: styles.fontSizes.title,
          fill: styles.colors.secondary,
          fontFamily: styles.fonts.body,
          semanticType: "title",
        })
      );
    }

    y = styles.layout.headerHeight + 15;
  } else {
    // No header - start with name
    objects.push(
      createTextObject(resume.personalInfo.fullName.toUpperCase(), MARGIN, MARGIN, styles, {
        fontSize: styles.fontSizes.name,
        fontWeight: "bold",
        fill: styles.colors.text,
        fontFamily: styles.fonts.heading,
        semanticType: "name",
      })
    );
    y = MARGIN + styles.fontSizes.name + 10;

    if (resume.personalInfo.title) {
      objects.push(
        createTextObject(resume.personalInfo.title, MARGIN, y, styles, {
          fontSize: styles.fontSizes.title,
          fill: styles.colors.secondary,
          fontFamily: styles.fonts.body,
          semanticType: "title",
        })
      );
      y += styles.fontSizes.title + 15;
    }
  }

  // === CONTACT INFO ===
  const contactParts: string[] = [];
  if (resume.personalInfo.email) contactParts.push(resume.personalInfo.email);
  if (resume.personalInfo.phone) contactParts.push(resume.personalInfo.phone);
  if (resume.personalInfo.location) contactParts.push(resume.personalInfo.location);

  if (contactParts.length > 0) {
    objects.push(
      createTextObject(contactParts.join("  •  "), MARGIN, y, styles, {
        fontSize: styles.fontSizes.small,
        fill: styles.colors.secondary,
        semanticType: "contact_info",
      })
    );
    y += 20;
  }

  // Links
  const linkParts: string[] = [];
  if (resume.personalInfo.linkedin) linkParts.push(resume.personalInfo.linkedin);
  if (resume.personalInfo.website) linkParts.push(resume.personalInfo.website);

  if (linkParts.length > 0) {
    objects.push(
      createTextObject(linkParts.join("  •  "), MARGIN, y, styles, {
        fontSize: styles.fontSizes.small,
        fill: styles.colors.accent,
        semanticType: resume.personalInfo.linkedin ? "linkedin" : "website",
      })
    );
    y += 25;
  }

  // === SUMMARY ===
  if (resume.summary) {
    y += styles.layout.sectionSpacing / 2;
    objects.push(
      createTextObject(headers.summary, MARGIN, y, styles, {
        fontSize: styles.fontSizes.sectionHeader,
        fontWeight: "bold",
        fill: styles.colors.accent,
        fontFamily: styles.fonts.heading,
        semanticType: "section_header",
      })
    );
    y += 18;

    const summary = resume.summary.length > 400 ? resume.summary.substring(0, 400) + "..." : resume.summary;
    objects.push(
      createTextObject(summary, MARGIN, y, styles, {
        fontSize: styles.fontSizes.body,
        fill: styles.colors.textLight,
        semanticType: "summary",
      })
    );
    y += estimateTextHeight(summary, styles.fontSizes.body, styles.layout.lineHeight, CONTENT_WIDTH) + 15;
  }

  // === EXPERIENCE ===
  if (resume.experience.length > 0) {
    y += styles.layout.sectionSpacing / 2;
    objects.push(
      createTextObject(headers.experience, MARGIN, y, styles, {
        fontSize: styles.fontSizes.sectionHeader,
        fontWeight: "bold",
        fill: styles.colors.accent,
        fontFamily: styles.fonts.heading,
        semanticType: "experience_section",
      })
    );
    y += 18;

    const jobs = resume.experience; // No limit - infinite canvas
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      const expGroup = `experience_${i}`;

      objects.push(
        createTextObject(job.title, MARGIN, y, styles, {
          fontSize: styles.fontSizes.jobTitle,
          fontWeight: "bold",
          fill: styles.colors.text,
          semanticType: "experience_title",
          semanticGroup: expGroup,
        })
      );
      y += 15;

      const dateRange = job.current ? `${job.startDate} - Present` : `${job.startDate}${job.endDate ? ` - ${job.endDate}` : ""}`;
      const companyLine = [job.company, job.location, dateRange].filter(Boolean).join("  |  ");
      objects.push(
        createTextObject(companyLine, MARGIN, y, styles, {
          fontSize: styles.fontSizes.small,
          fill: styles.colors.secondary,
          semanticType: "experience_company",
          semanticGroup: expGroup,
        })
      );
      y += 14;

      if (job.description.length > 0) {
        const bulletText = job.description.map((d) => `• ${d}`).join("\n"); // No limit - infinite canvas
        objects.push(
          createTextObject(bulletText, MARGIN, y, styles, {
            fontSize: styles.fontSizes.body,
            fill: styles.colors.textLight,
            semanticType: "experience_description",
            semanticGroup: expGroup,
          })
        );
        y += estimateTextHeight(bulletText, styles.fontSizes.body, styles.layout.lineHeight, CONTENT_WIDTH) + 8;
      }
      y += 8;
    }
  }

  // === EDUCATION ===
  if (resume.education.length > 0) {
    y += styles.layout.sectionSpacing / 2;
    objects.push(
      createTextObject(headers.education, MARGIN, y, styles, {
        fontSize: styles.fontSizes.sectionHeader,
        fontWeight: "bold",
        fill: styles.colors.accent,
        fontFamily: styles.fonts.heading,
        semanticType: "education_section",
      })
    );
    y += 18;

    for (let i = 0; i < resume.education.length; i++) {
      const edu = resume.education[i];
      const eduGroup = `education_${i}`;

      objects.push(
        createTextObject(edu.degree, MARGIN, y, styles, {
          fontSize: styles.fontSizes.jobTitle,
          fontWeight: "bold",
          fill: styles.colors.text,
          semanticType: "education_degree",
          semanticGroup: eduGroup,
        })
      );
      y += 15;

      const eduLine = [edu.institution, edu.location, edu.endDate || edu.startDate].filter(Boolean).join("  |  ");
      objects.push(
        createTextObject(eduLine, MARGIN, y, styles, {
          fontSize: styles.fontSizes.small,
          fill: styles.colors.secondary,
          semanticType: "education_institution",
          semanticGroup: eduGroup,
        })
      );
      y += 18;
    }
  }

  // === SKILLS ===
  if (resume.skills.length > 0) {
    y += styles.layout.sectionSpacing / 2;
    objects.push(
      createTextObject(headers.skills, MARGIN, y, styles, {
        fontSize: styles.fontSizes.sectionHeader,
        fontWeight: "bold",
        fill: styles.colors.accent,
        fontFamily: styles.fonts.heading,
        semanticType: "skills_section",
      })
    );
    y += 18;

    const skillsText = resume.skills.join("  •  "); // No limit - infinite canvas
    objects.push(
      createTextObject(skillsText, MARGIN, y, styles, {
        fontSize: styles.fontSizes.body,
        fill: styles.colors.textLight,
        semanticType: "skill_list",
      })
    );
    y += estimateTextHeight(skillsText, styles.fontSizes.body, styles.layout.lineHeight, CONTENT_WIDTH) + 10;
  }

  // === LANGUAGES ===
  if (resume.languages && resume.languages.length > 0) {
    y += styles.layout.sectionSpacing / 2;
    objects.push(
      createTextObject(headers.languages, MARGIN, y, styles, {
        fontSize: styles.fontSizes.sectionHeader,
        fontWeight: "bold",
        fill: styles.colors.accent,
        fontFamily: styles.fonts.heading,
        semanticType: "languages_section",
      })
    );
    y += 18;

    const languagesText = (resume.languages || []).map((l) => `${l.language} - ${l.level}`).join("  •  "); // No limit
    objects.push(
      createTextObject(languagesText, MARGIN, y, styles, {
        fontSize: styles.fontSizes.body,
        fill: styles.colors.textLight,
        semanticType: "language_entry",
      })
    );
  }

  return {
    version: "6.0.0",
    objects,
    background: styles.colors.background,
  };
}

// Sidebar layout with colored sidebar on LEFT - Name appears ONLY in main content area
function generateSidebarLeftLayout(
  resume: ParsedResume,
  styles: ResumeStylePreset,
  region: Region,
  headers: typeof SECTION_HEADERS["US"]
): CanvasData {
  const objects: CanvasObject[] = [];
  const sidebarWidth = styles.layout.sidebarWidth || 200;
  const sidebarPadding = 20;
  const mainContentX = sidebarWidth + 25;
  const mainContentWidth = A4_WIDTH - sidebarWidth - 50;
  const sidebarContentWidth = sidebarWidth - sidebarPadding * 2;

  // === SIDEBAR BACKGROUND (placeholder - will be updated with correct height at the end) ===
  const sidebarBgIndex = objects.length;
  objects.push(
    createRectObject(0, 0, sidebarWidth, A4_HEIGHT, styles.colors.primary, { selectable: false })
  );

  // === MAIN CONTENT AREA (Name goes here ONLY) ===
  let mainY = 40;

  // Name - ONLY place it appears
  objects.push(
    createTextObject(resume.personalInfo.fullName, mainContentX, mainY, styles, {
      fontSize: styles.fontSizes.name,
      fontWeight: "bold",
      fill: styles.colors.text,
      fontFamily: styles.fonts.heading,
      width: mainContentWidth,
      semanticType: "name",
    })
  );
  mainY += styles.fontSizes.name + 5;

  // Title under name
  if (resume.personalInfo.title) {
    objects.push(
      createTextObject(resume.personalInfo.title, mainContentX, mainY, styles, {
        fontSize: styles.fontSizes.title,
        fill: styles.colors.secondary,
        fontFamily: styles.fonts.body,
        width: mainContentWidth,
        semanticType: "title",
      })
    );
    mainY += styles.fontSizes.title + 15;
  }

  // Divider line
  objects.push(
    createRectObject(mainContentX, mainY, mainContentWidth, 2, styles.colors.primary, { selectable: true })
  );
  mainY += 20;

  // === SUMMARY ===
  if (resume.summary) {
    objects.push(
      createTextObject(headers.aboutMe, mainContentX, mainY, styles, {
        fontSize: styles.fontSizes.sectionHeader,
        fontWeight: "bold",
        fill: styles.colors.accent,
        fontFamily: styles.fonts.heading,
        width: mainContentWidth,
        semanticType: "section_header",
      })
    );
    mainY += 18;

    const summary = resume.summary.length > 350 ? resume.summary.substring(0, 350) + "..." : resume.summary;
    objects.push(
      createTextObject(summary, mainContentX, mainY, styles, {
        fontSize: styles.fontSizes.body,
        fill: styles.colors.textLight,
        width: mainContentWidth,
        semanticType: "summary",
      })
    );
    mainY += estimateTextHeight(summary, styles.fontSizes.body, styles.layout.lineHeight, mainContentWidth) + 20;
  }

  // === PROFESSIONAL EXPERIENCE ===
  if (resume.experience.length > 0) {
    objects.push(
      createTextObject(headers.experience, mainContentX, mainY, styles, {
        fontSize: styles.fontSizes.sectionHeader,
        fontWeight: "bold",
        fill: styles.colors.accent,
        fontFamily: styles.fonts.heading,
        width: mainContentWidth,
        semanticType: "experience_section",
      })
    );
    mainY += 18;

    for (let i = 0; i < resume.experience.length; i++) {
      const job = resume.experience[i];
      const expGroup = `experience_${i}`;

      objects.push(
        createTextObject(job.title, mainContentX, mainY, styles, {
          fontSize: styles.fontSizes.jobTitle,
          fontWeight: "bold",
          fill: styles.colors.text,
          width: mainContentWidth,
          semanticType: "experience_title",
          semanticGroup: expGroup,
        })
      );
      mainY += 14;

      const dateRange = job.current ? `${job.startDate} - Present` : `${job.startDate}${job.endDate ? ` - ${job.endDate}` : ""}`;
      objects.push(
        createTextObject(`${job.company}${job.location ? `, ${job.location}` : ""} | ${dateRange}`, mainContentX, mainY, styles, {
          fontSize: styles.fontSizes.small,
          fill: styles.colors.secondary,
          width: mainContentWidth,
          semanticType: "experience_company",
          semanticGroup: expGroup,
        })
      );
      mainY += 14;

      if (job.description.length > 0) {
        const bulletText = job.description.map((d) => `• ${d}`).join("\n"); // No limit - infinite canvas
        objects.push(
          createTextObject(bulletText, mainContentX, mainY, styles, {
            fontSize: styles.fontSizes.body,
            fill: styles.colors.textLight,
            width: mainContentWidth,
            semanticType: "experience_description",
            semanticGroup: expGroup,
          })
        );
        mainY += estimateTextHeight(bulletText, styles.fontSizes.body, styles.layout.lineHeight, mainContentWidth) + 12;
      }
    }
  }

  // === SIDEBAR CONTENT (No name here!) ===
  let sidebarY = 40;

  // === CONTACT SECTION IN SIDEBAR ===
  objects.push(
    createTextObject(headers.contact, sidebarPadding, sidebarY, styles, {
      fontSize: styles.fontSizes.sectionHeader,
      fontWeight: "bold",
      fill: styles.colors.headerText,
      fontFamily: styles.fonts.heading,
      width: sidebarContentWidth,
      semanticType: "section_header",
    })
  );
  sidebarY += 20;

  if (resume.personalInfo.phone) {
    objects.push(
      createTextObject(resume.personalInfo.phone, sidebarPadding, sidebarY, styles, {
        fontSize: styles.fontSizes.small,
        fill: styles.colors.headerText,
        width: sidebarContentWidth,
        semanticType: "phone",
      })
    );
    sidebarY += 16;
  }

  if (resume.personalInfo.email) {
    objects.push(
      createTextObject(resume.personalInfo.email, sidebarPadding, sidebarY, styles, {
        fontSize: styles.fontSizes.small,
        fill: styles.colors.headerText,
        width: sidebarContentWidth,
        semanticType: "email",
      })
    );
    sidebarY += 16;
  }

  if (resume.personalInfo.linkedin) {
    objects.push(
      createTextObject(resume.personalInfo.linkedin, sidebarPadding, sidebarY, styles, {
        fontSize: styles.fontSizes.small,
        fill: styles.colors.headerText,
        width: sidebarContentWidth,
        semanticType: "linkedin",
      })
    );
    sidebarY += 16;
  }

  if (resume.personalInfo.location) {
    objects.push(
      createTextObject(resume.personalInfo.location, sidebarPadding, sidebarY, styles, {
        fontSize: styles.fontSizes.small,
        fill: styles.colors.headerText,
        width: sidebarContentWidth,
        semanticType: "location",
      })
    );
    sidebarY += 16;
  }

  // === EDUCATION IN SIDEBAR ===
  if (resume.education.length > 0) {
    sidebarY += 25;
    objects.push(
      createTextObject(headers.education, sidebarPadding, sidebarY, styles, {
        fontSize: styles.fontSizes.sectionHeader,
        fontWeight: "bold",
        fill: styles.colors.headerText,
        fontFamily: styles.fonts.heading,
        width: sidebarContentWidth,
        semanticType: "education_section",
      })
    );
    sidebarY += 20;

    for (let i = 0; i < resume.education.length; i++) {
      const edu = resume.education[i];
      const eduGroup = `education_${i}`;

      objects.push(
        createTextObject(edu.degree, sidebarPadding, sidebarY, styles, {
          fontSize: styles.fontSizes.small,
          fontWeight: "bold",
          fill: styles.colors.headerText,
          width: sidebarContentWidth,
          semanticType: "education_degree",
          semanticGroup: eduGroup,
        })
      );
      sidebarY += 14;

      objects.push(
        createTextObject(edu.institution, sidebarPadding, sidebarY, styles, {
          fontSize: styles.fontSizes.small - 1,
          fill: styles.colors.headerText,
          width: sidebarContentWidth,
          semanticType: "education_institution",
          semanticGroup: eduGroup,
        })
      );
      sidebarY += 12;

      if (edu.endDate) {
        objects.push(
          createTextObject(edu.endDate, sidebarPadding, sidebarY, styles, {
            fontSize: styles.fontSizes.small - 1,
            fill: styles.colors.headerText,
            width: sidebarContentWidth,
            semanticType: "education_dates",
            semanticGroup: eduGroup,
          })
        );
        sidebarY += 18;
      }
    }
  }

  // === SKILLS IN SIDEBAR ===
  if (resume.skills.length > 0) {
    sidebarY += 25;
    objects.push(
      createTextObject(headers.skills, sidebarPadding, sidebarY, styles, {
        fontSize: styles.fontSizes.sectionHeader,
        fontWeight: "bold",
        fill: styles.colors.headerText,
        fontFamily: styles.fonts.heading,
        width: sidebarContentWidth,
        semanticType: "skills_section",
      })
    );
    sidebarY += 20;

    for (const skill of resume.skills) { // No limit - infinite canvas
      objects.push(
        createTextObject(`• ${skill}`, sidebarPadding, sidebarY, styles, {
          fontSize: styles.fontSizes.small,
          fill: styles.colors.headerText,
          width: sidebarContentWidth,
          semanticType: "skill_list",
        })
      );
      sidebarY += 14;
    }
  }

  // Calculate final content height and update sidebar background
  // Use the maximum of mainY, sidebarY, or A4_HEIGHT to ensure sidebar covers all content
  const finalHeight = Math.max(mainY + 40, sidebarY + 40, A4_HEIGHT);

  // Update sidebar background height if content exceeds one page
  if (finalHeight > A4_HEIGHT) {
    // Round up to next page boundary for cleaner page breaks
    const pageAlignedHeight = Math.ceil(finalHeight / A4_HEIGHT) * A4_HEIGHT;
    objects[sidebarBgIndex] = createRectObject(0, 0, sidebarWidth, pageAlignedHeight, styles.colors.primary, { selectable: false });
  }

  return {
    version: "6.0.0",
    objects,
    background: styles.colors.background,
  };
}

// Sidebar layout with colored sidebar on RIGHT
function generateSidebarRightLayout(
  resume: ParsedResume,
  styles: ResumeStylePreset,
  region: Region,
  headers: typeof SECTION_HEADERS["US"]
): CanvasData {
  // Mirror of sidebar-left
  return generateSidebarLeftLayout(resume, styles, region, headers);
}

// Classic two-column layout with header at top (Sophie Wright style)
// Photo top-left, name centered, two WHITE columns below
function generateHeaderTwoColumnLayout(
  resume: ParsedResume,
  styles: ResumeStylePreset,
  region: Region,
  headers: typeof SECTION_HEADERS["US"]
): CanvasData {
  const objects: CanvasObject[] = [];

  // Layout constants - Sophie Wright proportions
  const PHOTO_SIZE = 70; // Square photo
  const leftColumnWidth = 160; // ~30% for details/skills
  const columnGap = 25;
  const leftColumnX = MARGIN;
  const rightColumnX = leftColumnX + leftColumnWidth + columnGap;
  const rightColumnWidth = A4_WIDTH - rightColumnX - MARGIN;

  // Decorative bullet for section headers
  const bullet = "◦";

  // === TOP HEADER SECTION ===
  let headerY = 25;

  // Photo placeholder (top-left, like Sophie Wright)
  objects.push(
    createRectObject(MARGIN, headerY, PHOTO_SIZE, PHOTO_SIZE, "#f0f0f0", {
      stroke: "#e0e0e0",
      strokeWidth: 1,
    })
  );
  // Photo icon
  objects.push({
    id: createId(),
    type: "textbox",
    left: MARGIN + PHOTO_SIZE / 2 - 12,
    top: headerY + PHOTO_SIZE / 2 - 12,
    text: "👤",
    fontSize: 20,
    fill: "#cccccc",
    width: 30,
    textAlign: "center",
    originX: "left",
    originY: "top",
  });

  // Name - to the right of photo, large and prominent
  const nameX = MARGIN + PHOTO_SIZE + 20;
  objects.push(
    createTextObject(resume.personalInfo.fullName.toUpperCase(), nameX, headerY + 10, styles, {
      fontSize: styles.fontSizes.name || 26,
      fontWeight: "bold",
      fill: styles.colors.text,
      fontFamily: styles.fonts.heading,
      width: A4_WIDTH - nameX - MARGIN,
      semanticType: "name",
    })
  );

  // Title + Location + Phone with icons below name
  const contactY = headerY + 10 + (styles.fontSizes.name || 26) + 8;
  const contactParts: string[] = [];
  if (resume.personalInfo.title) contactParts.push(resume.personalInfo.title);
  if (resume.personalInfo.location) contactParts.push(`📍 ${resume.personalInfo.location}`);
  if (resume.personalInfo.phone) contactParts.push(`📞 ${resume.personalInfo.phone}`);

  if (contactParts.length > 0) {
    objects.push(
      createTextObject(contactParts.join("     "), nameX, contactY, styles, {
        fontSize: styles.fontSizes.small,
        fill: styles.colors.secondary,
        fontFamily: styles.fonts.body,
        width: A4_WIDTH - nameX - MARGIN,
        semanticType: "contact_info",
      })
    );
  }

  // Divider line after header
  headerY = Math.max(headerY + PHOTO_SIZE + 15, contactY + 25);
  objects.push(
    createRectObject(MARGIN, headerY, CONTENT_WIDTH, 1, "#dddddd", { selectable: true })
  );
  headerY += 20;

  // === LEFT COLUMN (Details, Skills) ===
  let leftY = headerY;

  // DETAILS section with decorative bullets
  objects.push(
    createTextObject(`${bullet} ${headers.details} ${bullet}`, leftColumnX, leftY, styles, {
      fontSize: styles.fontSizes.sectionHeader,
      fontWeight: "bold",
      fill: styles.colors.text,
      fontFamily: styles.fonts.heading,
      width: leftColumnWidth,
      semanticType: "section_header",
    })
  );
  leftY += 20;

  // Contact details vertically
  if (resume.personalInfo.location) {
    objects.push(
      createTextObject(resume.personalInfo.location, leftColumnX, leftY, styles, {
        fontSize: styles.fontSizes.small,
        fill: styles.colors.textLight,
        width: leftColumnWidth,
        semanticType: "location",
      })
    );
    leftY += 14;
  }
  if (resume.personalInfo.phone) {
    objects.push(
      createTextObject(resume.personalInfo.phone, leftColumnX, leftY, styles, {
        fontSize: styles.fontSizes.small,
        fill: styles.colors.textLight,
        width: leftColumnWidth,
        semanticType: "phone",
      })
    );
    leftY += 14;
  }
  if (resume.personalInfo.email) {
    objects.push(
      createTextObject(resume.personalInfo.email, leftColumnX, leftY, styles, {
        fontSize: styles.fontSizes.small,
        fill: styles.colors.accent,
        width: leftColumnWidth,
        semanticType: "email",
      })
    );
    leftY += 14;
  }

  // SKILLS section with decorative bullets
  if (resume.skills.length > 0) {
    leftY += 22;
    objects.push(
      createTextObject(`${bullet} ${headers.skills} ${bullet}`, leftColumnX, leftY, styles, {
        fontSize: styles.fontSizes.sectionHeader,
        fontWeight: "bold",
        fill: styles.colors.text,
        fontFamily: styles.fonts.heading,
        width: leftColumnWidth,
        semanticType: "skills_section",
      })
    );
    leftY += 20;

    for (const skill of resume.skills) { // No limit - infinite canvas
      objects.push(
        createTextObject(skill, leftColumnX + 8, leftY, styles, {
          fontSize: styles.fontSizes.small,
          fill: styles.colors.textLight,
          width: leftColumnWidth - 8,
          semanticType: "skill_list",
        })
      );
      leftY += 15;
    }
  }

  // === RIGHT COLUMN (Profile, Employment) ===
  let rightY = headerY;

  // PROFILE section with decorative bullets
  if (resume.summary) {
    objects.push(
      createTextObject(`${bullet} ${headers.profile} ${bullet}`, rightColumnX, rightY, styles, {
        fontSize: styles.fontSizes.sectionHeader,
        fontWeight: "bold",
        fill: styles.colors.text,
        fontFamily: styles.fonts.heading,
        width: rightColumnWidth,
        semanticType: "section_header",
      })
    );
    rightY += 20;

    const summary = resume.summary.length > 450 ? resume.summary.substring(0, 450) + "..." : resume.summary;
    objects.push(
      createTextObject(summary, rightColumnX, rightY, styles, {
        fontSize: styles.fontSizes.body,
        fill: styles.colors.textLight,
        width: rightColumnWidth,
        semanticType: "summary",
      })
    );
    rightY += estimateTextHeight(summary, styles.fontSizes.body, styles.layout.lineHeight, rightColumnWidth) + 18;
  }

  // EMPLOYMENT HISTORY section with decorative bullets
  if (resume.experience.length > 0) {
    objects.push(
      createTextObject(`${bullet} ${headers.employment} ${bullet}`, rightColumnX, rightY, styles, {
        fontSize: styles.fontSizes.sectionHeader,
        fontWeight: "bold",
        fill: styles.colors.text,
        fontFamily: styles.fonts.heading,
        width: rightColumnWidth,
        semanticType: "experience_section",
      })
    );
    rightY += 20;

    for (let i = 0; i < resume.experience.length; i++) {
      const job = resume.experience[i];
      const expGroup = `experience_${i}`;

      // Job title at Company, Location
      objects.push(
        createTextObject(`${job.title} at ${job.company}${job.location ? `, ${job.location}` : ""}`, rightColumnX, rightY, styles, {
          fontSize: styles.fontSizes.jobTitle,
          fontWeight: "bold",
          fill: styles.colors.text,
          width: rightColumnWidth,
          semanticType: "experience_title",
          semanticGroup: expGroup,
        })
      );
      rightY += 14;

      // Date range
      const dateRange = job.current ? `${job.startDate} — Present` : `${job.startDate}${job.endDate ? ` — ${job.endDate}` : ""}`;
      objects.push(
        createTextObject(dateRange, rightColumnX, rightY, styles, {
          fontSize: styles.fontSizes.small,
          fill: styles.colors.secondary,
          width: rightColumnWidth,
          semanticType: "experience_dates",
          semanticGroup: expGroup,
        })
      );
      rightY += 16;

      // Bullet points
      if (job.description.length > 0) {
        for (const desc of job.description) { // No limit - infinite canvas
          objects.push(
            createTextObject(`• ${desc}`, rightColumnX, rightY, styles, {
              fontSize: styles.fontSizes.body,
              fill: styles.colors.textLight,
              width: rightColumnWidth,
              semanticType: "experience_description",
              semanticGroup: expGroup,
            })
          );
          rightY += estimateTextHeight(`• ${desc}`, styles.fontSizes.body, styles.layout.lineHeight, rightColumnWidth) + 3;
        }
        rightY += 10;
      }
    }
  }

  return {
    version: "6.0.0",
    objects,
    background: styles.colors.background,
  };
}

// ============================================================================
// DYNAMIC LAYOUT GENERATOR
// Universal renderer that interprets AI-generated DynamicLayout configuration
// ============================================================================

interface PositionTracker {
  "header-left": number;
  "header-center": number;
  "header-right": number;
  "left-column": number;
  "right-column": number;
  "full-width": number;
}

function generateDynamicLayout(
  resume: ParsedResume,
  styles: ResumeStylePreset,
  dynamicLayout: DynamicLayout,
  headers: typeof SECTION_HEADERS["US"]
): CanvasData {
  const objects: CanvasObject[] = [];

  // Calculate column boundaries
  const hasLeftColumn = dynamicLayout.columns.hasLeftColumn;
  const hasRightColumn = dynamicLayout.columns.hasRightColumn;
  const leftWidthPct = dynamicLayout.columns.leftWidth || 30;
  const rightWidthPct = dynamicLayout.columns.rightWidth || 70;
  const columnGap = dynamicLayout.columns.gap || 20;

  // Check if we have a colored sidebar
  const sidebar = dynamicLayout.sidebar;
  const hasSidebar = sidebar && sidebar.backgroundColor && sidebar.backgroundColor !== "#ffffff";

  // Calculate actual pixel positions
  let leftColumnX = MARGIN;
  let leftColumnWidth: number;
  let rightColumnX: number;
  let rightColumnWidth: number;

  if (hasSidebar) {
    const sidebarWidth = sidebar!.width || 200;
    if (sidebar!.position === "left") {
      leftColumnX = 0;
      leftColumnWidth = sidebarWidth;
      rightColumnX = sidebarWidth + columnGap;
      rightColumnWidth = A4_WIDTH - sidebarWidth - columnGap - MARGIN;
      // Draw sidebar background - SELECTABLE so user can edit
      objects.push(
        createRectObject(0, 0, sidebarWidth, A4_HEIGHT, sidebar!.backgroundColor, { selectable: true })
      );
    } else {
      leftColumnX = MARGIN;
      leftColumnWidth = A4_WIDTH - (sidebar!.width || 200) - columnGap - MARGIN;
      rightColumnX = A4_WIDTH - (sidebar!.width || 200);
      rightColumnWidth = (sidebar!.width || 200);
      // Draw sidebar background - SELECTABLE so user can edit
      objects.push(
        createRectObject(rightColumnX, 0, sidebar!.width || 200, A4_HEIGHT, sidebar!.backgroundColor, { selectable: true })
      );
    }
  } else {
    // Two white columns - check if we need a column background
    const totalWidth = CONTENT_WIDTH - columnGap;
    leftColumnWidth = Math.floor(totalWidth * (leftWidthPct / 100));
    rightColumnWidth = totalWidth - leftColumnWidth;
    rightColumnX = leftColumnX + leftColumnWidth + columnGap;

    // Add left column background if colors indicate a visual division
    // Check if primary color is different from background (indicating a column bg)
    const primaryColor = styles.colors.primary;
    const bgColor = styles.colors.background;
    if (primaryColor && primaryColor !== bgColor && primaryColor !== "#000000" && primaryColor !== "#ffffff") {
      // Add a subtle column background for the left column
      objects.push(
        createRectObject(0, 0, leftColumnX + leftColumnWidth + columnGap / 2, A4_HEIGHT, primaryColor, { selectable: true })
      );
    }
  }

  // Header configuration
  const headerConfig = dynamicLayout.header;
  const headerHeight = headerConfig.hasHeader ? (headerConfig.height || 100) : 0;
  const headerContentY = headerHeight > 0 ? 25 : MARGIN;

  // We'll add the divider after processing header sections (see below)
  let dividerAdded = false;

  // Track Y positions for each area
  const yPositions: PositionTracker = {
    "header-left": headerContentY,
    "header-center": headerContentY,
    "header-right": headerContentY,
    "left-column": headerHeight + 20,
    "right-column": headerHeight + 20,
    "full-width": headerHeight + 20,
  };

  // Sort sections by position and order
  const sections = [...dynamicLayout.sections].sort((a, b) => {
    if (a.position !== b.position) {
      const posOrder = ["header-left", "header-center", "header-right", "left-column", "right-column", "full-width"];
      return posOrder.indexOf(a.position) - posOrder.indexOf(b.position);
    }
    return a.order - b.order;
  });

  // Get text color based on position (for sidebar scenarios)
  const getTextColor = (position: SectionPosition, isHeader: boolean = false): string => {
    if (hasSidebar) {
      const isInSidebar =
        (sidebar!.position === "left" && position === "left-column") ||
        (sidebar!.position === "right" && position === "right-column");
      if (isInSidebar) {
        return sidebar!.textColor || styles.colors.headerText;
      }
    }
    return isHeader ? styles.colors.accent : styles.colors.text;
  };

  // Get X position and width for a section position
  const getXAndWidth = (position: SectionPosition): { x: number; width: number } => {
    switch (position) {
      case "header-left":
        return { x: MARGIN, width: leftColumnWidth };
      case "header-center":
        // Full width for centering text/elements
        return { x: MARGIN, width: CONTENT_WIDTH };
      case "header-right":
        return { x: A4_WIDTH - MARGIN - 150, width: 150 };
      case "left-column":
        return { x: hasSidebar && sidebar!.position === "left" ? 20 : leftColumnX, width: leftColumnWidth - (hasSidebar ? 40 : 0) };
      case "right-column":
        return { x: rightColumnX, width: rightColumnWidth - (hasSidebar && sidebar!.position === "right" ? 40 : 0) };
      case "full-width":
        return { x: MARGIN, width: CONTENT_WIDTH };
      default:
        return { x: MARGIN, width: CONTENT_WIDTH };
    }
  };

  // Decorative bullet helper
  const formatSectionHeader = (text: string, style?: SectionLayout["style"]): string => {
    if (style?.decorativeBullets) {
      return `◦ ${text} ◦`;
    }
    return text;
  };

  // Render each section
  for (const section of sections) {
    const { x, width } = getXAndWidth(section.position);
    const y = yPositions[section.position];
    const textColor = getTextColor(section.position);
    const sectionTextColor = getTextColor(section.position, true);

    let heightAdded = 0;

    // Check if this is a center-aligned header section
    const isCentered = section.position === "header-center";

    switch (section.type) {
      case "photo": {
        const photoSize = headerConfig.photoSize || 70;
        // Center photo horizontally if in header-center
        const photoX = isCentered ? (A4_WIDTH - photoSize) / 2 : x;
        objects.push(
          createRectObject(photoX, y, photoSize, photoSize, "#f0f0f0", {
            stroke: "#e0e0e0",
            strokeWidth: 1,
          })
        );
        objects.push({
          id: createId(),
          type: "textbox",
          left: photoX + photoSize / 2 - 12,
          top: y + photoSize / 2 - 12,
          text: "👤",
          fontSize: 20,
          fill: "#cccccc",
          width: 30,
          textAlign: "center",
          originX: "left",
          originY: "top",
        });
        heightAdded = photoSize + 15;
        break;
      }

      case "name": {
        const nameText = section.style?.uppercase
          ? resume.personalInfo.fullName.toUpperCase()
          : resume.personalInfo.fullName;
        const nameObj = createTextObject(nameText, x, y, styles, {
          fontSize: styles.fontSizes.name,
          fontWeight: "bold",
          fill: textColor,
          fontFamily: styles.fonts.heading,
          width,
          semanticType: "name",
        });
        if (isCentered) {
          nameObj.textAlign = "center";
        }
        objects.push(nameObj);
        heightAdded = styles.fontSizes.name + 8;
        break;
      }

      case "title": {
        if (resume.personalInfo.title) {
          const titleObj = createTextObject(resume.personalInfo.title, x, y, styles, {
            fontSize: styles.fontSizes.title,
            fill: styles.colors.secondary,
            fontFamily: styles.fonts.body,
            width,
            semanticType: "title",
          });
          if (isCentered) {
            titleObj.textAlign = "center";
          }
          objects.push(titleObj);
          heightAdded = styles.fontSizes.title + 10;
        }
        break;
      }

      case "contact": {
        const withIcons = section.style?.withIcons;
        const contactItems: string[] = [];

        if (resume.personalInfo.location) {
          contactItems.push(withIcons ? `📍 ${resume.personalInfo.location}` : resume.personalInfo.location);
        }
        if (resume.personalInfo.phone) {
          contactItems.push(withIcons ? `📞 ${resume.personalInfo.phone}` : resume.personalInfo.phone);
        }
        if (resume.personalInfo.email) {
          contactItems.push(withIcons ? `✉️ ${resume.personalInfo.email}` : resume.personalInfo.email);
        }

        // For header positions, display inline
        if (section.position.startsWith("header")) {
          if (contactItems.length > 0) {
            const contactObj = createTextObject(contactItems.join("     "), x, y, styles, {
              fontSize: styles.fontSizes.small,
              fill: styles.colors.secondary,
              width,
              semanticType: "contact_info",
            });
            if (isCentered) {
              contactObj.textAlign = "center";
            }
            objects.push(contactObj);
            heightAdded = styles.fontSizes.small + 12;
          }
        } else {
          // For column positions, display vertically
          let localY = y;
          for (const item of contactItems) {
            objects.push(
              createTextObject(item, x, localY, styles, {
                fontSize: styles.fontSizes.small,
                fill: textColor,
                width,
                semanticType: "contact_info",
              })
            );
            localY += 16;
          }
          heightAdded = contactItems.length * 16 + 10;
        }
        break;
      }

      case "details": {
        // Details section - contact info displayed vertically with header
        objects.push(
          createTextObject(formatSectionHeader(headers.details, section.style), x, y, styles, {
            fontSize: styles.fontSizes.sectionHeader,
            fontWeight: "bold",
            fill: sectionTextColor,
            fontFamily: styles.fonts.heading,
            width,
            semanticType: "section_header",
          })
        );
        let detailsY = y + 22;

        if (resume.personalInfo.location) {
          objects.push(
            createTextObject(resume.personalInfo.location, x, detailsY, styles, {
              fontSize: styles.fontSizes.small,
              fill: textColor,
              width,
              semanticType: "location",
            })
          );
          detailsY += 18;
        }
        if (resume.personalInfo.phone) {
          objects.push(
            createTextObject(resume.personalInfo.phone, x, detailsY, styles, {
              fontSize: styles.fontSizes.small,
              fill: textColor,
              width,
              semanticType: "phone",
            })
          );
          detailsY += 18;
        }
        if (resume.personalInfo.email) {
          objects.push(
            createTextObject(resume.personalInfo.email, x, detailsY, styles, {
              fontSize: styles.fontSizes.small,
              fill: styles.colors.accent,
              width,
              semanticType: "email",
            })
          );
          detailsY += 18;
        }
        if (resume.personalInfo.linkedin) {
          objects.push(
            createTextObject(resume.personalInfo.linkedin, x, detailsY, styles, {
              fontSize: styles.fontSizes.small,
              fill: styles.colors.accent,
              width,
              semanticType: "linkedin",
            })
          );
          detailsY += 18;
        }
        heightAdded = detailsY - y + 15;
        break;
      }

      case "profile":
      case "summary": {
        objects.push(
          createTextObject(formatSectionHeader(headers.profile, section.style), x, y, styles, {
            fontSize: styles.fontSizes.sectionHeader,
            fontWeight: "bold",
            fill: sectionTextColor,
            fontFamily: styles.fonts.heading,
            width,
            semanticType: "section_header",
          })
        );
        let localY = y + 22; // Increased spacing after header

        if (resume.summary) {
          const summary = resume.summary.length > 500 ? resume.summary.substring(0, 500) + "..." : resume.summary;
          objects.push(
            createTextObject(summary, x, localY, styles, {
              fontSize: styles.fontSizes.body,
              fill: textColor === styles.colors.text ? styles.colors.textLight : textColor,
              width,
              semanticType: "summary",
            })
          );
          heightAdded = 22 + estimateTextHeight(summary, styles.fontSizes.body, styles.layout.lineHeight, width) + 18;
        } else {
          heightAdded = 28;
        }
        break;
      }

      case "experience": {
        objects.push(
          createTextObject(formatSectionHeader(headers.employment, section.style), x, y, styles, {
            fontSize: styles.fontSizes.sectionHeader,
            fontWeight: "bold",
            fill: sectionTextColor,
            fontFamily: styles.fonts.heading,
            width,
            semanticType: "experience_section",
          })
        );
        let localY = y + 24; // Increased spacing after header

        for (let i = 0; i < resume.experience.length; i++) {
          const job = resume.experience[i];
          const expGroup = `experience_${i}`;

          // Job title (bold)
          const jobTitleText = job.title;
          objects.push(
            createTextObject(jobTitleText, x, localY, styles, {
              fontSize: styles.fontSizes.jobTitle,
              fontWeight: "bold",
              fill: textColor,
              width,
              semanticType: "experience_title",
              semanticGroup: expGroup,
            })
          );
          localY += estimateTextHeight(jobTitleText, styles.fontSizes.jobTitle, styles.layout.lineHeight, width, true) + 4;

          // Company and location
          const companyText = `${job.company}${job.location ? `, ${job.location}` : ""}`;
          objects.push(
            createTextObject(companyText, x, localY, styles, {
              fontSize: styles.fontSizes.small,
              fill: styles.colors.secondary,
              width,
              semanticType: "experience_company",
              semanticGroup: expGroup,
            })
          );
          localY += estimateTextHeight(companyText, styles.fontSizes.small, styles.layout.lineHeight, width) + 4;

          // Date range
          const dateRange = job.current ? `${job.startDate} — Present` : `${job.startDate}${job.endDate ? ` — ${job.endDate}` : ""}`;
          objects.push(
            createTextObject(dateRange, x, localY, styles, {
              fontSize: styles.fontSizes.small,
              fill: styles.colors.secondary,
              width,
              semanticType: "experience_dates",
              semanticGroup: expGroup,
            })
          );
          localY += 18; // Increased spacing after date

          // Bullet points
          if (job.description.length > 0) {
            for (const desc of job.description) { // No limit - infinite canvas
              objects.push(
                createTextObject(`• ${desc}`, x, localY, styles, {
                  fontSize: styles.fontSizes.body,
                  fill: textColor === styles.colors.text ? styles.colors.textLight : textColor,
                  width,
                  semanticType: "experience_description",
                  semanticGroup: expGroup,
                })
              );
              localY += estimateTextHeight(`• ${desc}`, styles.fontSizes.body, styles.layout.lineHeight, width) + 6;
            }
            localY += 16; // Increased spacing after job
          }
        }
        heightAdded = localY - y + 12;
        break;
      }

      case "education": {
        objects.push(
          createTextObject(formatSectionHeader(headers.education, section.style), x, y, styles, {
            fontSize: styles.fontSizes.sectionHeader,
            fontWeight: "bold",
            fill: sectionTextColor,
            fontFamily: styles.fonts.heading,
            width,
            semanticType: "education_section",
          })
        );
        let localY = y + 22;

        for (let i = 0; i < resume.education.length; i++) {
          const edu = resume.education[i];
          const eduGroup = `education_${i}`;

          objects.push(
            createTextObject(edu.degree, x, localY, styles, {
              fontSize: styles.fontSizes.jobTitle,
              fontWeight: "bold",
              fill: textColor,
              width,
              semanticType: "education_degree",
              semanticGroup: eduGroup,
            })
          );
          localY += estimateTextHeight(edu.degree, styles.fontSizes.jobTitle, styles.layout.lineHeight, width, true) + 4;

          objects.push(
            createTextObject(edu.institution, x, localY, styles, {
              fontSize: styles.fontSizes.small,
              fill: textColor === styles.colors.text ? styles.colors.textLight : textColor,
              width,
              semanticType: "education_institution",
              semanticGroup: eduGroup,
            })
          );
          localY += estimateTextHeight(edu.institution, styles.fontSizes.small, styles.layout.lineHeight, width) + 4;

          if (edu.endDate) {
            objects.push(
              createTextObject(edu.endDate, x, localY, styles, {
                fontSize: styles.fontSizes.small - 1,
                fill: styles.colors.secondary,
                width,
                semanticType: "education_dates",
                semanticGroup: eduGroup,
              })
            );
            localY += 20;
          }
        }
        heightAdded = localY - y + 12;
        break;
      }

      case "skills": {
        objects.push(
          createTextObject(formatSectionHeader(headers.skills, section.style), x, y, styles, {
            fontSize: styles.fontSizes.sectionHeader,
            fontWeight: "bold",
            fill: sectionTextColor,
            fontFamily: styles.fonts.heading,
            width,
            semanticType: "skills_section",
          })
        );
        let localY = y + 22;

        if (section.style?.withBullets) {
          // Vertical list with bullets
          for (const skill of resume.skills) { // No limit - infinite canvas
            objects.push(
              createTextObject(`• ${skill}`, x, localY, styles, {
                fontSize: styles.fontSizes.small,
                fill: textColor,
                width,
                semanticType: "skill_list",
              })
            );
            localY += 17; // Increased spacing between skills
          }
          heightAdded = localY - y + 12;
        } else {
          // Inline display
          const skillsText = resume.skills.join("  •  "); // No limit - infinite canvas
          objects.push(
            createTextObject(skillsText, x, localY, styles, {
              fontSize: styles.fontSizes.small,
              fill: textColor,
              width,
              semanticType: "skill_list",
            })
          );
          heightAdded = 20 + estimateTextHeight(skillsText, styles.fontSizes.body, styles.layout.lineHeight, width) + 10;
        }
        break;
      }

      case "languages": {
        if (resume.languages && resume.languages.length > 0) {
          objects.push(
            createTextObject(formatSectionHeader(headers.languages, section.style), x, y, styles, {
              fontSize: styles.fontSizes.sectionHeader,
              fontWeight: "bold",
              fill: sectionTextColor,
              fontFamily: styles.fonts.heading,
              width,
              semanticType: "languages_section",
            })
          );
          let localY = y + 20;

          for (const lang of (resume.languages || [])) { // No limit - infinite canvas
            objects.push(
              createTextObject(`${lang.language} - ${lang.level}`, x, localY, styles, {
                fontSize: styles.fontSizes.small,
                fill: textColor,
                width,
                semanticType: "language_entry",
              })
            );
            localY += 15;
          }
          heightAdded = localY - y + 10;
        }
        break;
      }

      case "certifications": {
        if (resume.certifications && resume.certifications.length > 0) {
          objects.push(
            createTextObject(formatSectionHeader(headers.certifications, section.style), x, y, styles, {
              fontSize: styles.fontSizes.sectionHeader,
              fontWeight: "bold",
              fill: sectionTextColor,
              fontFamily: styles.fonts.heading,
              width,
              semanticType: "certifications_section",
            })
          );
          let localY = y + 20;

          for (let i = 0; i < (resume.certifications || []).length; i++) {
            const cert = resume.certifications![i];
            const certGroup = `certification_${i}`;

            objects.push(
              createTextObject(cert.name, x, localY, styles, {
                fontSize: styles.fontSizes.small,
                fontWeight: "bold",
                fill: textColor,
                width,
                semanticType: "certification_name",
                semanticGroup: certGroup,
              })
            );
            localY += 14;

            if (cert.issuer || cert.date) {
              const certInfo = [cert.issuer, cert.date].filter(Boolean).join(" | ");
              objects.push(
                createTextObject(certInfo, x, localY, styles, {
                  fontSize: styles.fontSizes.small - 1,
                  fill: styles.colors.secondary,
                  width,
                  semanticType: "certification_issuer",
                  semanticGroup: certGroup,
                })
              );
              localY += 14;
            }
          }
          heightAdded = localY - y + 10;
        }
        break;
      }

      case "divider": {
        objects.push(
          createRectObject(x, y + 5, width, 1, styles.colors.secondary, { selectable: true })
        );
        heightAdded = 15;
        break;
      }
    }

    // Update Y position for the position area
    yPositions[section.position] += heightAdded;

    // If this was a header section, ensure column positions start after header content
    if (section.position.startsWith("header")) {
      const maxHeaderY = Math.max(
        yPositions["header-left"],
        yPositions["header-center"],
        yPositions["header-right"]
      );
      // Add more padding after header for cleaner separation
      const columnStartY = maxHeaderY + 25;
      if (yPositions["left-column"] < columnStartY) {
        yPositions["left-column"] = columnStartY;
      }
      if (yPositions["right-column"] < columnStartY) {
        yPositions["right-column"] = columnStartY;
      }
      if (yPositions["full-width"] < columnStartY) {
        yPositions["full-width"] = columnStartY;
      }
    } else if (!dividerAdded && headerConfig.hasDivider) {
      // First non-header section - add divider now at the actual header end
      const dividerY = Math.max(
        yPositions["header-left"],
        yPositions["header-center"],
        yPositions["header-right"]
      );
      objects.push(
        createRectObject(MARGIN, dividerY, CONTENT_WIDTH, 1, headerConfig.dividerColor || "#dddddd", { selectable: true })
      );
      dividerAdded = true;
    }
  }

  return {
    version: "6.0.0",
    objects,
    background: styles.colors.background,
  };
}

// ============================================================================
// BLUEPRINT-BASED CANVAS GENERATOR
// Renders canvas from AI-analyzed reference image with precise coordinates
// ============================================================================

// Convert percentage to pixels
function pctToX(pct: number): number {
  return Math.round((pct / 100) * A4_WIDTH);
}

function pctToY(pct: number, pageHeight: number = A4_HEIGHT): number {
  return Math.round((pct / 100) * pageHeight);
}

function pctToWidth(pct: number): number {
  return Math.round((pct / 100) * A4_WIDTH);
}

function pctToHeight(pct: number, pageHeight: number = A4_HEIGHT): number {
  return Math.round((pct / 100) * pageHeight);
}

// Section data trackers for filling content
interface SectionDataTracker {
  experienceIndex: number;
  experienceBulletIndex: number;
  educationIndex: number;
  skillIndex: number;
  contactIndex: number;
}

export function generateCanvasFromBlueprint(
  resume: ParsedResume,
  blueprintData: BlueprintData,
  region: "US" | "EU" | "UA" = "US"
): CanvasData {
  const { blueprint, fonts, estimatedPages } = blueprintData;
  const headers = SECTION_HEADERS[region];

  // Normalize fonts
  const headingFont = normalizeFont(fonts.heading);
  const bodyFont = normalizeFont(fonts.body);

  console.log(`[Blueprint] Generating canvas from blueprint`);
  console.log(`[Blueprint] Backgrounds: ${blueprint.backgrounds.length}, Elements: ${blueprint.elements.length}`);
  console.log(`[Blueprint] Fonts - Heading: ${headingFont}, Body: ${bodyFont}`);
  console.log(`[Blueprint] Estimated pages: ${estimatedPages}`);

  // Multi-page support constants
  const PAGE_BOTTOM_MARGIN = 50; // Space at bottom before new page

  // For single page, use simple objects array
  const objects: CanvasObject[] = [];

  // Track which data items we've used
  const tracker: SectionDataTracker = {
    experienceIndex: 0,
    experienceBulletIndex: 0,
    educationIndex: 0,
    skillIndex: 0,
    contactIndex: 0,
  };

  // Group elements by section to understand structure
  const sectionElements: Record<string, BlueprintElement[]> = {};
  for (const el of blueprint.elements) {
    const section = el.section || el.type;
    if (!sectionElements[section]) {
      sectionElements[section] = [];
    }
    sectionElements[section].push(el);
  }

  // 1. Render background shapes first (z-order)
  for (const bg of blueprint.backgrounds) {
    const x = pctToX(bg.x);
    const y = pctToY(bg.y);
    const width = pctToWidth(bg.width);
    const height = pctToHeight(bg.height);

    objects.push(
      createRectObject(x, y, width, height, bg.color, { selectable: true })
    );
    console.log(`[Blueprint] Added background: ${bg.type} at (${x}, ${y}) ${width}x${height}`);
  }

  // 2. Render elements in Y-order (top to bottom)
  const sortedElements = [...blueprint.elements].sort((a, b) => {
    if (Math.abs(a.y - b.y) < 2) {
      return a.x - b.x; // Same row, sort by X
    }
    return a.y - b.y;
  });

  // Track experience/education indices per section header encounter
  let currentExpIdx = 0;
  let currentBulletIdx = 0;
  let currentEduIdx = 0;

  for (const el of sortedElements) {
    const x = pctToX(el.x);
    const y = pctToY(el.y);
    const width = pctToWidth(el.width);
    const fontSize = el.fontSize || 10;
    const fontFamily = el.fontFamily ? normalizeFont(el.fontFamily) : bodyFont;
    const fontWeight = el.fontWeight || "normal";
    const color = el.color || "#333333";
    const align = el.align || "left";

    switch (el.type) {
      case "photo": {
        const photoWidth = pctToWidth(el.width);
        const photoHeight = el.height ? pctToHeight(el.height) : photoWidth;
        const shape = el.shape || "square";

        // Photo frame
        if (shape === "circle") {
          objects.push({
            id: createId(),
            type: "circle",
            left: x + photoWidth / 2,
            top: y + photoHeight / 2,
            radius: Math.min(photoWidth, photoHeight) / 2,
            fill: "#f0f0f0",
            stroke: "#e0e0e0",
            strokeWidth: 1,
            selectable: true,
            originX: "center",
            originY: "center",
          });
        } else {
          objects.push(
            createRectObject(x, y, photoWidth, photoHeight, "#f0f0f0", {
              stroke: "#e0e0e0",
              strokeWidth: 1,
            })
          );
        }
        // Photo icon
        objects.push({
          id: createId(),
          type: "textbox",
          left: x + photoWidth / 2 - 12,
          top: y + photoHeight / 2 - 12,
          text: "👤",
          fontSize: Math.min(photoWidth, photoHeight) / 3,
          fill: "#cccccc",
          width: 30,
          textAlign: "center",
          originX: "left",
          originY: "top",
        });
        break;
      }

      case "name": {
        const nameText = el.uppercase
          ? resume.personalInfo.fullName.toUpperCase()
          : resume.personalInfo.fullName;
        const nameObj: CanvasObject = {
          id: createId(),
          type: "textbox",
          left: x,
          top: y,
          text: nameText,
          fontSize,
          fontFamily: fontFamily || headingFont,
          fontWeight: "bold",
          fill: color,
          width,
          lineHeight: 1.3,
          originX: "left",
          originY: "top",
          semanticType: "name",
        };
        if (align === "center") {
          nameObj.textAlign = "center";
        } else if (align === "right") {
          nameObj.textAlign = "right";
        }
        objects.push(nameObj);
        break;
      }

      case "title": {
        if (resume.personalInfo.title) {
          const titleObj: CanvasObject = {
            id: createId(),
            type: "textbox",
            left: x,
            top: y,
            text: resume.personalInfo.title,
            fontSize,
            fontFamily,
            fontWeight,
            fill: color,
            width,
            lineHeight: 1.4,
            originX: "left",
            originY: "top",
            semanticType: "title",
          };
          if (align === "center") {
            titleObj.textAlign = "center";
          } else if (align === "right") {
            titleObj.textAlign = "right";
          }
          objects.push(titleObj);
        }
        break;
      }

      case "section-header": {
        // Use label if provided, otherwise try to match to headers
        let headerText = el.label || "";
        let semanticSectionType: SemanticType = "section_header";
        if (!headerText) {
          // Try to determine from section
          switch (el.section) {
            case "profile":
            case "summary":
              headerText = headers.profile;
              break;
            case "experience":
              headerText = headers.experience;
              semanticSectionType = "experience_section";
              break;
            case "education":
              headerText = headers.education;
              semanticSectionType = "education_section";
              break;
            case "skills":
              headerText = headers.skills;
              semanticSectionType = "skills_section";
              break;
            case "contact":
            case "details":
              headerText = headers.details;
              break;
            case "languages":
              headerText = headers.languages;
              semanticSectionType = "languages_section";
              break;
            default:
              headerText = el.section?.toUpperCase() || "SECTION";
          }
        }

        objects.push({
          id: createId(),
          type: "textbox",
          left: x,
          top: y,
          text: headerText,
          fontSize,
          fontFamily: fontFamily || headingFont,
          fontWeight: "bold",
          fill: color,
          width,
          lineHeight: 1.4,
          originX: "left",
          originY: "top",
          semanticType: semanticSectionType,
        });

        // Reset bullet index when we see a new experience section header
        if (el.section === "experience") {
          currentBulletIdx = 0;
        }
        break;
      }

      case "body-text": {
        // For profile/summary section
        if ((el.section === "profile" || el.section === "summary") && resume.summary) {
          const summaryText = resume.summary.length > 600
            ? resume.summary.substring(0, 600) + "..."
            : resume.summary;
          objects.push({
            id: createId(),
            type: "textbox",
            left: x,
            top: y,
            text: summaryText,
            fontSize,
            fontFamily,
            fontWeight,
            fill: color,
            width,
            lineHeight: 1.5,
            originX: "left",
            originY: "top",
            semanticType: "summary",
          });
        }
        break;
      }

      case "job-title": {
        const exp = resume.experience[currentExpIdx];
        if (exp) {
          objects.push({
            id: createId(),
            type: "textbox",
            left: x,
            top: y,
            text: exp.title,
            fontSize,
            fontFamily,
            fontWeight: "bold",
            fill: color,
            width,
            lineHeight: 1.4,
            originX: "left",
            originY: "top",
            semanticType: "experience_title",
            semanticGroup: `experience_${currentExpIdx}`,
          });
        }
        break;
      }

      case "company": {
        const exp = resume.experience[currentExpIdx];
        if (exp) {
          const companyText = exp.location
            ? `${exp.company}, ${exp.location}`
            : exp.company;
          objects.push({
            id: createId(),
            type: "textbox",
            left: x,
            top: y,
            text: companyText,
            fontSize,
            fontFamily,
            fontWeight,
            fill: color,
            width,
            lineHeight: 1.4,
            originX: "left",
            originY: "top",
            semanticType: "experience_company",
            semanticGroup: `experience_${currentExpIdx}`,
          });
        }
        break;
      }

      case "date": {
        // Date can be for experience or education
        if (el.section === "experience" || !el.section) {
          const exp = resume.experience[currentExpIdx];
          if (exp) {
            const dateText = exp.current
              ? `${exp.startDate} — Present`
              : `${exp.startDate}${exp.endDate ? ` — ${exp.endDate}` : ""}`;
            objects.push({
              id: createId(),
              type: "textbox",
              left: x,
              top: y,
              text: dateText,
              fontSize,
              fontFamily,
              fontWeight,
              fill: color,
              width,
              lineHeight: 1.4,
              originX: "left",
              originY: "top",
              semanticType: "experience_dates",
              semanticGroup: `experience_${currentExpIdx}`,
            });
            // Move to next experience after date (typical pattern)
            currentExpIdx++;
            currentBulletIdx = 0;
          }
        }
        break;
      }

      case "bullet-point": {
        // Get the current experience's bullets
        const expIdx = Math.max(0, currentExpIdx - 1); // We increment after date
        const exp = resume.experience[expIdx];
        if (exp && exp.description[currentBulletIdx]) {
          const bulletText = `• ${exp.description[currentBulletIdx]}`;
          objects.push({
            id: createId(),
            type: "textbox",
            left: x,
            top: y,
            text: bulletText,
            fontSize,
            fontFamily,
            fontWeight,
            fill: color,
            width,
            lineHeight: 1.5,
            originX: "left",
            originY: "top",
            semanticType: "experience_description",
            semanticGroup: `experience_${expIdx}`,
          });
          currentBulletIdx++;
        }
        break;
      }

      case "skill-item": {
        const skill = resume.skills[tracker.skillIndex];
        if (skill) {
          const bulletChar = el.bulletStyle === "dash" ? "—" : el.bulletStyle === "none" ? "" : "•";
          const skillText = bulletChar ? `${bulletChar} ${skill}` : skill;
          objects.push({
            id: createId(),
            type: "textbox",
            left: x,
            top: y,
            text: skillText,
            fontSize,
            fontFamily,
            fontWeight,
            fill: color,
            width,
            lineHeight: 1.4,
            originX: "left",
            originY: "top",
            semanticType: "skill_list",
          });
          tracker.skillIndex++;
        }
        break;
      }

      case "contact-item": {
        const contactData = [
          resume.personalInfo.location,
          resume.personalInfo.phone,
          resume.personalInfo.email,
          resume.personalInfo.linkedin,
          resume.personalInfo.website,
        ].filter(Boolean);

        if (contactData[tracker.contactIndex]) {
          objects.push({
            id: createId(),
            type: "textbox",
            left: x,
            top: y,
            text: contactData[tracker.contactIndex] as string,
            fontSize,
            fontFamily,
            fontWeight,
            fill: color,
            width,
            lineHeight: 1.4,
            originX: "left",
            originY: "top",
            semanticType: "contact_info",
          });
          tracker.contactIndex++;
        }
        break;
      }

      case "divider": {
        const dividerHeight = el.thickness || 1;
        objects.push(
          createRectObject(x, y, width, dividerHeight, color, { selectable: true })
        );
        break;
      }
    }
  }

  // Update tracker with final indices
  tracker.experienceIndex = currentExpIdx;
  tracker.educationIndex = currentEduIdx;

  // 3. Fill in any remaining content not covered by the blueprint
  // Track max Y for page overflow detection
  let maxY = 0;
  for (const obj of objects) {
    const objBottom = (obj.top as number) + ((obj.height as number) || 30);
    if (objBottom > maxY) maxY = objBottom;
  }

  // If content overflows, we'll handle it in addRemainingContent
  const needsMultiPage = maxY > A4_HEIGHT - PAGE_BOTTOM_MARGIN;

  addRemainingContent(objects, resume, blueprint, tracker, headingFont, bodyFont, headers);

  // Recalculate max Y after adding remaining content
  maxY = 0;
  for (const obj of objects) {
    const objBottom = (obj.top as number) + ((obj.height as number) || 30);
    if (objBottom > maxY) maxY = objBottom;
  }

  // Check if we need multiple pages
  if (maxY > A4_HEIGHT) {
    console.log(`[Blueprint] Content exceeds page height (${maxY}px > ${A4_HEIGHT}px), creating multi-page layout`);

    // Split objects into pages based on Y position
    const page1Objects: CanvasObject[] = [];
    const page2Objects: CanvasObject[] = [];
    const pageBreakY = A4_HEIGHT - PAGE_BOTTOM_MARGIN;

    for (const obj of objects) {
      const objY = obj.top as number;
      if (objY < pageBreakY) {
        page1Objects.push(obj);
      } else {
        // Adjust Y position for second page
        const adjustedObj = { ...obj, top: objY - pageBreakY + MARGIN };
        page2Objects.push(adjustedObj);
      }
    }

    // Add sidebar backgrounds to page 2 if needed
    for (const bg of blueprint.backgrounds) {
      if (bg.height >= 90) {
        const x = pctToX(bg.x);
        const width = pctToWidth(bg.width);
        page2Objects.unshift(
          createRectObject(x, 0, width, A4_HEIGHT, bg.color, { selectable: true })
        );
      }
    }

    return {
      version: "6.0.0",
      objects: page1Objects, // First page for backwards compatibility
      background: "#ffffff",
      pageCount: 2,
      pages: [
        { pageNumber: 1, objects: page1Objects, background: "#ffffff" },
        { pageNumber: 2, objects: page2Objects, background: "#ffffff" },
      ],
    };
  }

  return {
    version: "6.0.0",
    objects,
    background: "#ffffff",
    pageCount: 1,
  };
}

// Add remaining content that wasn't covered by the blueprint
function addRemainingContent(
  objects: CanvasObject[],
  resume: ParsedResume,
  blueprint: Blueprint,
  tracker: SectionDataTracker,
  headingFont: string,
  bodyFont: string,
  headers: typeof SECTION_HEADERS["US"]
): void {
  // Find the lowest Y position of existing objects
  let maxY = 0;
  for (const obj of objects) {
    const objBottom = (obj.top as number) + ((obj.height as number) || 20);
    if (objBottom > maxY) maxY = objBottom;
  }

  // Don't add content if we're already near the page bottom
  if (maxY > A4_HEIGHT - 100) return;

  // Calculate column positions from blueprint
  const leftX = pctToX(blueprint.margins.left);
  const leftWidth = pctToWidth(blueprint.columns.leftWidth);
  const rightX = pctToX(blueprint.columns.leftWidth + blueprint.columns.gap);
  const rightWidth = pctToWidth(blueprint.columns.rightWidth);

  let y = maxY + 30;
  const lineHeight = 1.4;

  // Add remaining experience
  while (tracker.experienceIndex < resume.experience.length && y < A4_HEIGHT - 150) {
    const exp = resume.experience[tracker.experienceIndex];

    // Job title
    objects.push({
      id: createId(),
      type: "textbox",
      left: rightX,
      top: y,
      text: exp.title,
      fontSize: 11,
      fontFamily: bodyFont,
      fontWeight: "bold",
      fill: "#333333",
      width: rightWidth,
      lineHeight,
      originX: "left",
      originY: "top",
    });
    y += 16;

    // Company
    objects.push({
      id: createId(),
      type: "textbox",
      left: rightX,
      top: y,
      text: `${exp.company}${exp.location ? `, ${exp.location}` : ""}`,
      fontSize: 9,
      fontFamily: bodyFont,
      fontWeight: "normal",
      fill: "#666666",
      width: rightWidth,
      lineHeight,
      originX: "left",
      originY: "top",
    });
    y += 14;

    // Date
    const dateText = exp.current
      ? `${exp.startDate} — Present`
      : `${exp.startDate}${exp.endDate ? ` — ${exp.endDate}` : ""}`;
    objects.push({
      id: createId(),
      type: "textbox",
      left: rightX,
      top: y,
      text: dateText,
      fontSize: 9,
      fontFamily: bodyFont,
      fontWeight: "normal",
      fill: "#999999",
      width: rightWidth,
      lineHeight,
      originX: "left",
      originY: "top",
    });
    y += 16;

    // Bullets
    for (const desc of exp.description) { // No limit - infinite canvas
      if (y > A4_HEIGHT - 50) break;
      objects.push({
        id: createId(),
        type: "textbox",
        left: rightX,
        top: y,
        text: `• ${desc}`,
        fontSize: 9,
        fontFamily: bodyFont,
        fontWeight: "normal",
        fill: "#666666",
        width: rightWidth,
        lineHeight: 1.5,
        originX: "left",
        originY: "top",
      });
      y += estimateTextHeight(`• ${desc}`, 9, 1.5, rightWidth) + 4;
    }

    y += 15;
    tracker.experienceIndex++;
  }

  // Add remaining skills in left column if space permits
  if (tracker.skillIndex < resume.skills.length) {
    let leftY = pctToY(blueprint.margins.top) + 200; // Start below header area
    const remainingSkills = resume.skills.slice(tracker.skillIndex);
    for (const skill of remainingSkills) { // No limit - infinite canvas
      if (leftY > A4_HEIGHT - 50) break;
      objects.push({
        id: createId(),
        type: "textbox",
        left: leftX + 10,
        top: leftY,
        text: `• ${skill}`,
        fontSize: 9,
        fontFamily: bodyFont,
        fontWeight: "normal",
        fill: "#333333",
        width: leftWidth - 20,
        lineHeight,
        originX: "left",
        originY: "top",
      });
      leftY += 15;
    }
  }
}

// ============================================================================
// ZONE-BASED CANVAS GENERATOR
// Renders content by filling zones with sections, content flows naturally
// ============================================================================

export function generateCanvasFromZones(
  resume: ParsedResume,
  zoneData: ZoneLayoutData,
  region: "US" | "EU" | "UA" = "US"
): CanvasData {
  const objects: CanvasObject[] = [];
  const { layout, styling } = zoneData;
  const headers = SECTION_HEADERS[region];

  // Normalize fonts
  const headingFont = normalizeFont(styling.fonts.heading);
  const bodyFont = normalizeFont(styling.fonts.body);

  console.log(`[Zones] Generating canvas from ${layout.zones.length} zones`);
  console.log(`[Zones] Layout type: ${layout.type}`);

  // Track sidebar background index for later height update
  const sidebarBgIndices: { index: number; zone: LayoutZone }[] = [];

  // 1. Draw zone backgrounds first (placeholders - will update sidebar height later)
  for (const zone of layout.zones) {
    if (zone.backgroundColor && zone.backgroundColor !== "#ffffff" && zone.backgroundColor !== "transparent") {
      const x = pctToX(zone.x);
      const y = pctToY(zone.y);
      const width = pctToWidth(zone.width);
      const height = pctToHeight(zone.height);

      // Track sidebar backgrounds for height update
      if (zone.id === "sidebar" || zone.id.includes("sidebar")) {
        sidebarBgIndices.push({ index: objects.length, zone });
      }

      objects.push(
        createRectObject(x, y, width, height, zone.backgroundColor, { selectable: true })
      );
      console.log(`[Zones] Added background for ${zone.id}: ${zone.backgroundColor}`);
    }
  }

  // 2. Render content in each zone
  for (const zone of layout.zones) {
    renderZoneContent(objects, zone, resume, styling, headingFont, bodyFont, headers);
  }

  // 3. Calculate max content height and update sidebar backgrounds
  let maxContentY = A4_HEIGHT;
  for (const obj of objects) {
    const objTop = typeof obj.top === 'number' ? obj.top : 0;
    const objHeight = typeof obj.height === 'number' ? obj.height : 20;
    const objBottom = objTop + objHeight;
    if (objBottom > maxContentY) {
      maxContentY = objBottom;
    }
  }

  // Round up to next page boundary for cleaner page breaks
  const pageAlignedHeight = Math.ceil((maxContentY + 40) / A4_HEIGHT) * A4_HEIGHT;

  // Update sidebar backgrounds to extend full height
  for (const { index, zone } of sidebarBgIndices) {
    if (pageAlignedHeight > A4_HEIGHT) {
      const x = pctToX(zone.x);
      const width = pctToWidth(zone.width);
      objects[index] = createRectObject(x, 0, width, pageAlignedHeight, zone.backgroundColor, { selectable: true });
      console.log(`[Zones] Extended sidebar "${zone.id}" to height ${pageAlignedHeight}`);
    }
  }

  return {
    version: "6.0.0",
    objects,
    background: styling.colors.background || "#ffffff",
    pageCount: 1,
  };
}

// Render content within a specific zone
function renderZoneContent(
  objects: CanvasObject[],
  zone: LayoutZone,
  resume: ParsedResume,
  styling: ZoneLayoutData["styling"],
  headingFont: string,
  bodyFont: string,
  headers: typeof SECTION_HEADERS["US"]
): void {
  // Calculate zone boundaries in pixels
  const zoneX = pctToX(zone.x);
  const zoneY = pctToY(zone.y);
  const zoneWidth = pctToWidth(zone.width);
  const zoneHeight = pctToHeight(zone.height);

  // Padding inside zone
  const padding = 20;
  const contentX = zoneX + padding;
  const contentWidth = zoneWidth - padding * 2;
  let y = zoneY + padding;

  // Max Y for this zone
  const maxY = zoneY + zoneHeight - padding;

  // Text color for this zone
  const textColor = zone.textColor || styling.colors.text;
  const lightTextColor = zone.backgroundColor !== "#ffffff" ? zone.textColor : styling.colors.textLight;

  // Section header color
  const sectionHeaderColor = styling.sectionHeaderStyle?.color || styling.colors.accent;

  console.log(`[Zones] Rendering zone "${zone.id}" with sections: ${zone.sections.join(", ")}`);

  // Render each section in order
  // Note: No maxY boundary check - infinite canvas will grow as needed
  for (const section of zone.sections) {
    switch (section) {
      case "photo": {
        const photoSize = Math.min(80, contentWidth * 0.6);
        const photoX = contentX + (contentWidth - photoSize) / 2;

        objects.push(
          createRectObject(photoX, y, photoSize, photoSize, "#e0e0e0", {
            stroke: "#cccccc",
            strokeWidth: 1,
          })
        );
        objects.push({
          id: createId(),
          type: "textbox",
          left: photoX + photoSize / 2 - 15,
          top: y + photoSize / 2 - 15,
          text: "👤",
          fontSize: 24,
          fill: "#999999",
          width: 30,
          textAlign: "center",
          originX: "left",
          originY: "top",
        });
        y += photoSize + 20;
        break;
      }

      case "name": {
        const nameText = styling.nameStyle?.uppercase
          ? resume.personalInfo.fullName.toUpperCase()
          : resume.personalInfo.fullName;

        const nameObj: CanvasObject = {
          id: createId(),
          type: "textbox",
          left: contentX,
          top: y,
          text: nameText,
          fontSize: styling.sizes.name,
          fontFamily: headingFont,
          fontWeight: "bold",
          fill: textColor,
          width: contentWidth,
          lineHeight: 1.2,
          originX: "left",
          originY: "top",
          semanticType: "name",
        };

        if (styling.nameStyle?.letterSpacing) {
          nameObj.charSpacing = styling.nameStyle.letterSpacing * 10;
        }

        objects.push(nameObj);
        y += styling.sizes.name + 8;
        break;
      }

      case "title": {
        if (resume.personalInfo.title) {
          objects.push({
            id: createId(),
            type: "textbox",
            left: contentX,
            top: y,
            text: resume.personalInfo.title,
            fontSize: styling.sizes.title,
            fontFamily: bodyFont,
            fontWeight: "normal",
            fill: lightTextColor,
            width: contentWidth,
            lineHeight: 1.4,
            originX: "left",
            originY: "top",
            semanticType: "title",
          });
          y += styling.sizes.title + 12;
        }
        break;
      }

      case "contact": {
        const contactItems = [
          resume.personalInfo.location,
          resume.personalInfo.phone,
          resume.personalInfo.email,
        ].filter(Boolean);

        // For header zone, display inline
        if (zone.id === "header") {
          if (contactItems.length > 0) {
            objects.push({
              id: createId(),
              type: "textbox",
              left: contentX,
              top: y,
              text: contactItems.join("  |  "),
              fontSize: styling.sizes.small,
              fontFamily: bodyFont,
              fontWeight: "normal",
              fill: lightTextColor,
              width: contentWidth,
              lineHeight: 1.4,
              originX: "left",
              originY: "top",
              semanticType: "contact_info",
            });
            y += styling.sizes.small + 15;
          }
        } else {
          // For sidebar, display vertically
          for (const item of contactItems) {
            objects.push({
              id: createId(),
              type: "textbox",
              left: contentX,
              top: y,
              text: item as string,
              fontSize: styling.sizes.small,
              fontFamily: bodyFont,
              fontWeight: "normal",
              fill: textColor,
              width: contentWidth,
              lineHeight: 1.4,
              originX: "left",
              originY: "top",
              semanticType: "contact_info",
            });
            y += styling.sizes.small + 8;
          }
          y += 10;
        }
        break;
      }

      case "profile":
      case "summary": {
        // Section header
        const headerText = styling.sectionHeaderStyle?.uppercase
          ? headers.profile.toUpperCase()
          : headers.profile;

        objects.push({
          id: createId(),
          type: "textbox",
          left: contentX,
          top: y,
          text: headerText,
          fontSize: styling.sizes.sectionHeader,
          fontFamily: headingFont,
          fontWeight: "bold",
          fill: sectionHeaderColor,
          width: contentWidth,
          lineHeight: 1.4,
          originX: "left",
          originY: "top",
          semanticType: "section_header",
        });
        y += styling.sizes.sectionHeader + 12;

        // Summary text
        if (resume.summary) {
          const summaryText = resume.summary.length > 500
            ? resume.summary.substring(0, 500) + "..."
            : resume.summary;

          objects.push({
            id: createId(),
            type: "textbox",
            left: contentX,
            top: y,
            text: summaryText,
            semanticType: "summary",
            fontSize: styling.sizes.body,
            fontFamily: bodyFont,
            fontWeight: "normal",
            fill: textColor,
            width: contentWidth,
            lineHeight: 1.5,
            originX: "left",
            originY: "top",
          });
          y += estimateTextHeight(summaryText, styling.sizes.body, 1.5, contentWidth) + 20;
        }
        break;
      }

      case "experience": {
        // Section header
        const headerText = styling.sectionHeaderStyle?.uppercase
          ? headers.experience.toUpperCase()
          : headers.experience;

        objects.push({
          id: createId(),
          type: "textbox",
          left: contentX,
          top: y,
          text: headerText,
          fontSize: styling.sizes.sectionHeader,
          fontFamily: headingFont,
          fontWeight: "bold",
          fill: sectionHeaderColor,
          width: contentWidth,
          lineHeight: 1.4,
          originX: "left",
          originY: "top",
          semanticType: "experience_section",
        });
        y += styling.sizes.sectionHeader + 15;

        // Experience items - GROUPED together
        for (let expIdx = 0; expIdx < resume.experience.length; expIdx++) {
          const job = resume.experience[expIdx];
          const expGroup = `experience_${expIdx}`;

          // Job title (bold)
          objects.push({
            id: createId(),
            type: "textbox",
            left: contentX,
            top: y,
            text: job.title,
            fontSize: styling.sizes.jobTitle,
            fontFamily: bodyFont,
            fontWeight: "bold",
            fill: textColor,
            width: contentWidth,
            lineHeight: 1.3,
            originX: "left",
            originY: "top",
            semanticType: "experience_title",
            semanticGroup: expGroup,
          });
          y += styling.sizes.jobTitle + 4;

          // Company and location
          const companyText = job.location
            ? `${job.company}, ${job.location}`
            : job.company;
          objects.push({
            id: createId(),
            type: "textbox",
            left: contentX,
            top: y,
            text: companyText,
            fontSize: styling.sizes.small,
            fontFamily: bodyFont,
            fontWeight: "normal",
            fill: styling.colors.secondary,
            width: contentWidth,
            lineHeight: 1.4,
            originX: "left",
            originY: "top",
            semanticType: "experience_company",
            semanticGroup: expGroup,
          });
          y += styling.sizes.small + 4;

          // Date range
          const dateText = job.current
            ? `${job.startDate} — Present`
            : `${job.startDate}${job.endDate ? ` — ${job.endDate}` : ""}`;
          objects.push({
            id: createId(),
            type: "textbox",
            left: contentX,
            top: y,
            text: dateText,
            fontSize: styling.sizes.small,
            fontFamily: bodyFont,
            fontWeight: "normal",
            fill: styling.colors.secondary,
            width: contentWidth,
            lineHeight: 1.4,
            originX: "left",
            originY: "top",
            semanticType: "experience_dates",
            semanticGroup: expGroup,
          });
          y += styling.sizes.small + 8;

          // Bullet points (limit to 3)
          for (const desc of job.description) { // No limit - infinite canvas
            const bulletText = `• ${desc}`;
            objects.push({
              id: createId(),
              type: "textbox",
              left: contentX,
              top: y,
              text: bulletText,
              fontSize: styling.sizes.body,
              fontFamily: bodyFont,
              fontWeight: "normal",
              fill: lightTextColor,
              width: contentWidth,
              lineHeight: 1.5,
              originX: "left",
              originY: "top",
              semanticType: "experience_description",
              semanticGroup: expGroup,
            });
            y += estimateTextHeight(bulletText, styling.sizes.body, 1.5, contentWidth) + 4;
          }

          y += 18; // Space between jobs
        }
        break;
      }

      case "education": {
        // Section header
        const headerText = styling.sectionHeaderStyle?.uppercase
          ? headers.education.toUpperCase()
          : headers.education;

        objects.push({
          id: createId(),
          type: "textbox",
          left: contentX,
          top: y,
          text: headerText,
          fontSize: styling.sizes.sectionHeader,
          fontFamily: headingFont,
          fontWeight: "bold",
          fill: sectionHeaderColor,
          width: contentWidth,
          lineHeight: 1.4,
          originX: "left",
          originY: "top",
          semanticType: "education_section",
        });
        y += styling.sizes.sectionHeader + 15;

        // Education items
        for (let eduIdx = 0; eduIdx < resume.education.length; eduIdx++) {
          const edu = resume.education[eduIdx];
          const eduGroup = `education_${eduIdx}`;

          // Degree
          objects.push({
            id: createId(),
            type: "textbox",
            left: contentX,
            top: y,
            text: edu.degree,
            fontSize: styling.sizes.jobTitle,
            fontFamily: bodyFont,
            fontWeight: "bold",
            fill: textColor,
            width: contentWidth,
            lineHeight: 1.3,
            originX: "left",
            originY: "top",
            semanticType: "education_degree",
            semanticGroup: eduGroup,
          });
          y += styling.sizes.jobTitle + 4;

          // Institution
          objects.push({
            id: createId(),
            type: "textbox",
            left: contentX,
            top: y,
            text: edu.institution,
            fontSize: styling.sizes.small,
            fontFamily: bodyFont,
            fontWeight: "normal",
            fill: lightTextColor,
            width: contentWidth,
            lineHeight: 1.4,
            originX: "left",
            originY: "top",
            semanticType: "education_institution",
            semanticGroup: eduGroup,
          });
          y += styling.sizes.small + 4;

          // Date
          if (edu.endDate) {
            objects.push({
              id: createId(),
              type: "textbox",
              left: contentX,
              top: y,
              text: edu.endDate,
              fontSize: styling.sizes.small,
              fontFamily: bodyFont,
              fontWeight: "normal",
              fill: styling.colors.secondary,
              width: contentWidth,
              lineHeight: 1.4,
              originX: "left",
              originY: "top",
              semanticType: "education_dates",
              semanticGroup: eduGroup,
            });
            y += styling.sizes.small + 4;
          }

          y += 15; // Space between items
        }
        break;
      }

      case "skills": {
        // Section header
        const headerText = styling.sectionHeaderStyle?.uppercase
          ? headers.skills.toUpperCase()
          : headers.skills;

        objects.push({
          id: createId(),
          type: "textbox",
          left: contentX,
          top: y,
          text: headerText,
          fontSize: styling.sizes.sectionHeader,
          fontFamily: headingFont,
          fontWeight: "bold",
          fill: sectionHeaderColor,
          width: contentWidth,
          lineHeight: 1.4,
          originX: "left",
          originY: "top",
          semanticType: "skills_section",
        });
        y += styling.sizes.sectionHeader + 12;

        // Skills list - vertical in sidebar, can be inline in main
        const isSidebar = zone.id === "sidebar";

        if (isSidebar) {
          for (const skill of resume.skills) { // No limit - infinite canvas
            objects.push({
              id: createId(),
              type: "textbox",
              left: contentX,
              top: y,
              text: skill,
              fontSize: styling.sizes.body,
              fontFamily: bodyFont,
              fontWeight: "normal",
              fill: textColor,
              width: contentWidth,
              lineHeight: 1.4,
              originX: "left",
              originY: "top",
              semanticType: "skill_list",
            });
            y += styling.sizes.body + 8;
          }
        } else {
          // Inline display for main area
          const skillsText = resume.skills.join("  •  "); // No limit - infinite canvas
          objects.push({
            id: createId(),
            type: "textbox",
            left: contentX,
            top: y,
            text: skillsText,
            fontSize: styling.sizes.body,
            fontFamily: bodyFont,
            fontWeight: "normal",
            fill: textColor,
            width: contentWidth,
            lineHeight: 1.5,
            originX: "left",
            originY: "top",
            semanticType: "skill_list",
          });
          y += estimateTextHeight(skillsText, styling.sizes.body, 1.5, contentWidth) + 15;
        }
        y += 10;
        break;
      }

      case "languages": {
        if (resume.languages && resume.languages.length > 0) {
          // Section header
          const headerText = styling.sectionHeaderStyle?.uppercase
            ? headers.languages.toUpperCase()
            : headers.languages;

          objects.push({
            id: createId(),
            type: "textbox",
            left: contentX,
            top: y,
            text: headerText,
            fontSize: styling.sizes.sectionHeader,
            fontFamily: headingFont,
            fontWeight: "bold",
            fill: sectionHeaderColor,
            width: contentWidth,
            lineHeight: 1.4,
            originX: "left",
            originY: "top",
          });
          y += styling.sizes.sectionHeader + 12;

          // Languages list
          for (const lang of (resume.languages || [])) { // No limit - infinite canvas
            objects.push({
              id: createId(),
              type: "textbox",
              left: contentX,
              top: y,
              text: `${lang.language} — ${lang.level}`,
              fontSize: styling.sizes.body,
              fontFamily: bodyFont,
              fontWeight: "normal",
              fill: textColor,
              width: contentWidth,
              lineHeight: 1.4,
              originX: "left",
              originY: "top",
            });
            y += styling.sizes.body + 8;
          }
          y += 10;
        }
        break;
      }

      case "certifications": {
        if (resume.certifications && resume.certifications.length > 0) {
          // Section header
          const headerText = styling.sectionHeaderStyle?.uppercase
            ? headers.certifications.toUpperCase()
            : headers.certifications;

          objects.push({
            id: createId(),
            type: "textbox",
            left: contentX,
            top: y,
            text: headerText,
            fontSize: styling.sizes.sectionHeader,
            fontFamily: headingFont,
            fontWeight: "bold",
            fill: sectionHeaderColor,
            width: contentWidth,
            lineHeight: 1.4,
            originX: "left",
            originY: "top",
          });
          y += styling.sizes.sectionHeader + 12;

          // Certifications list
          for (const cert of (resume.certifications || [])) { // No limit - infinite canvas
            objects.push({
              id: createId(),
              type: "textbox",
              left: contentX,
              top: y,
              text: cert.name,
              fontSize: styling.sizes.body,
              fontFamily: bodyFont,
              fontWeight: "bold",
              fill: textColor,
              width: contentWidth,
              lineHeight: 1.4,
              originX: "left",
              originY: "top",
            });
            y += styling.sizes.body + 4;

            if (cert.issuer || cert.date) {
              const certInfo = [cert.issuer, cert.date].filter(Boolean).join(" | ");
              objects.push({
                id: createId(),
                type: "textbox",
                left: contentX,
                top: y,
                text: certInfo,
                fontSize: styling.sizes.small,
                fontFamily: bodyFont,
                fontWeight: "normal",
                fill: styling.colors.secondary,
                width: contentWidth,
                lineHeight: 1.4,
                originX: "left",
                originY: "top",
              });
              y += styling.sizes.small + 8;
            }
          }
          y += 10;
        }
        break;
      }
    }
  }
}
