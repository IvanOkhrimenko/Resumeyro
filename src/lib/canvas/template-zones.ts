// Template Zones System
// Defines where each semantic type should be placed in each template layout
// Enables reliable template switching by mapping semantic elements to layout positions

import { SemanticType, SemanticCategory, SEMANTIC_CATEGORY_MAP } from "./semantic-types";
import { LayoutType, ResumeStyle, ColorScheme, FontSizes, A4_WIDTH, A4_HEIGHT, MARGIN } from "../templates/schema";

// ============================================
// ZONE DEFINITIONS
// ============================================

/**
 * Position and style for a semantic element within a template
 */
export interface ElementZone {
  // Position
  x: number;
  y: number | "auto";  // "auto" means position after previous element
  width: number;
  maxWidth?: number;
  textAlign?: "left" | "center" | "right";

  // Font styling
  fontSize: number;
  fontWeight?: "normal" | "bold";
  fontFamily?: string;
  fontStyle?: "normal" | "italic";

  // Colors
  fill: string;
  backgroundColor?: string;

  // Spacing
  marginTop?: number;
  marginBottom?: number;
  lineHeight?: number;
}

/**
 * Section zone - defines where a section starts and its properties
 */
export interface SectionZone {
  startY: number | "auto";
  x: number;
  width: number;
  headerStyle: Partial<ElementZone>;
  contentStyle: Partial<ElementZone>;
  spacing: number;  // Space between items in section
}

/**
 * Complete layout zones for a template
 */
export interface TemplateZones {
  // Page areas
  headerArea?: {
    x: number;
    y: number;
    width: number;
    height: number;
    backgroundColor: string;
  };
  sidebarArea?: {
    x: number;
    y: number;
    width: number;
    height: number;
    backgroundColor: string;
  };
  mainContentArea: {
    x: number;
    y: number;
    width: number;
  };

  // Personal info zone (header section)
  personal: {
    name: ElementZone;
    title: ElementZone;
    photo?: ElementZone;
  };

  // Contact zone
  contact: {
    x: number;
    y: number | "auto";
    width: number;
    layout: "horizontal" | "vertical" | "grid";
    itemStyle: Partial<ElementZone>;
    separator?: string;
    spacing: number;
  };

  // Summary zone
  summary: {
    x: number;
    y: number | "auto";
    width: number;
    style: Partial<ElementZone>;
    headerStyle?: Partial<ElementZone>;
  };

  // Section zones (for repeatable sections)
  sections: {
    x: number;
    startY: number | "auto";
    width: number;
    spacing: number;  // Space between sections
    headerStyle: Partial<ElementZone>;
    itemSpacing: number;  // Space between items within section
  };

  // Category-specific styling overrides
  categoryStyles?: Partial<Record<SemanticCategory, Partial<ElementZone>>>;
}

// ============================================
// ZONE GENERATORS FOR EACH LAYOUT TYPE
// ============================================

const CONTENT_WIDTH = A4_WIDTH - MARGIN * 2;

/**
 * Generate zones for single-column layout
 */
function generateSingleColumnZones(style: ResumeStyle): TemplateZones {
  const { colors, fontSizes, layout } = style;
  const headerHeight = layout.headerHeight;

  return {
    headerArea: {
      x: 0,
      y: 0,
      width: A4_WIDTH,
      height: headerHeight,
      backgroundColor: colors.primary,
    },
    mainContentArea: {
      x: MARGIN,
      y: headerHeight + 20,
      width: CONTENT_WIDTH,
    },
    personal: {
      name: {
        x: MARGIN,
        y: headerHeight / 2 - fontSizes.name / 2 - 5,
        width: CONTENT_WIDTH,
        textAlign: "left",
        fontSize: fontSizes.name,
        fontWeight: "bold",
        fill: colors.headerText,
      },
      title: {
        x: MARGIN,
        y: "auto",
        width: CONTENT_WIDTH,
        textAlign: "left",
        fontSize: fontSizes.title,
        fontWeight: "normal",
        fill: colors.headerText,
        marginTop: 5,
      },
    },
    contact: {
      x: MARGIN,
      y: "auto",
      width: CONTENT_WIDTH,
      layout: "horizontal",
      itemStyle: {
        fontSize: fontSizes.small,
        fill: colors.headerText,
      },
      separator: " | ",
      spacing: 10,
    },
    summary: {
      x: MARGIN,
      y: "auto",
      width: CONTENT_WIDTH,
      style: {
        fontSize: fontSizes.body,
        fill: colors.text,
        lineHeight: layout.lineHeight,
        marginTop: 15,
      },
    },
    sections: {
      x: MARGIN,
      startY: "auto",
      width: CONTENT_WIDTH,
      spacing: layout.sectionSpacing,
      headerStyle: {
        fontSize: fontSizes.sectionHeader,
        fontWeight: "bold",
        fill: colors.accent,
        marginBottom: 10,
      },
      itemSpacing: layout.itemSpacing,
    },
  };
}

/**
 * Generate zones for sidebar-left layout
 */
function generateSidebarLeftZones(style: ResumeStyle): TemplateZones {
  const { colors, fontSizes, layout } = style;
  const sidebarWidth = layout.sidebarWidth || 180;
  const mainX = sidebarWidth + 20;
  const mainWidth = A4_WIDTH - sidebarWidth - 40;

  return {
    sidebarArea: {
      x: 0,
      y: 0,
      width: sidebarWidth,
      height: A4_HEIGHT,
      backgroundColor: colors.primary,
    },
    mainContentArea: {
      x: mainX,
      y: MARGIN,
      width: mainWidth,
    },
    personal: {
      name: {
        x: 15,
        y: 30,
        width: sidebarWidth - 30,
        textAlign: "center",
        fontSize: fontSizes.name - 4,
        fontWeight: "bold",
        fill: colors.headerText,
      },
      title: {
        x: 15,
        y: "auto",
        width: sidebarWidth - 30,
        textAlign: "center",
        fontSize: fontSizes.title - 2,
        fill: colors.sidebarText || colors.headerText,
        marginTop: 8,
      },
      photo: {
        x: sidebarWidth / 2 - 40,
        y: 100,
        width: 80,
        fontSize: 0,
        fill: "transparent",
      },
    },
    contact: {
      x: 15,
      y: 180,
      width: sidebarWidth - 30,
      layout: "vertical",
      itemStyle: {
        fontSize: fontSizes.small,
        fill: colors.sidebarText || colors.headerText,
      },
      spacing: 8,
    },
    summary: {
      x: mainX,
      y: MARGIN,
      width: mainWidth,
      headerStyle: {
        fontSize: fontSizes.sectionHeader,
        fontWeight: "bold",
        fill: colors.accent,
        marginBottom: 8,
      },
      style: {
        fontSize: fontSizes.body,
        fill: colors.text,
        lineHeight: layout.lineHeight,
      },
    },
    sections: {
      x: mainX,
      startY: "auto",
      width: mainWidth,
      spacing: layout.sectionSpacing,
      headerStyle: {
        fontSize: fontSizes.sectionHeader,
        fontWeight: "bold",
        fill: colors.accent,
        marginBottom: 8,
      },
      itemSpacing: layout.itemSpacing,
    },
    categoryStyles: {
      skills: {
        x: 15,
        width: sidebarWidth - 30,
        fill: colors.sidebarText || colors.headerText,
      },
      languages: {
        x: 15,
        width: sidebarWidth - 30,
        fill: colors.sidebarText || colors.headerText,
      },
      interests: {
        x: 15,
        width: sidebarWidth - 30,
        fill: colors.sidebarText || colors.headerText,
      },
    },
  };
}

/**
 * Generate zones for minimal layout
 */
function generateMinimalZones(style: ResumeStyle): TemplateZones {
  const { colors, fontSizes, layout } = style;

  return {
    mainContentArea: {
      x: MARGIN,
      y: MARGIN,
      width: CONTENT_WIDTH,
    },
    personal: {
      name: {
        x: MARGIN,
        y: MARGIN,
        width: CONTENT_WIDTH,
        textAlign: "center",
        fontSize: fontSizes.name,
        fontWeight: "bold",
        fill: colors.text,
      },
      title: {
        x: MARGIN,
        y: "auto",
        width: CONTENT_WIDTH,
        textAlign: "center",
        fontSize: fontSizes.title,
        fill: colors.accent,
        marginTop: 8,
      },
    },
    contact: {
      x: MARGIN,
      y: "auto",
      width: CONTENT_WIDTH,
      layout: "horizontal",
      itemStyle: {
        fontSize: fontSizes.small,
        fill: colors.textLight,
        textAlign: "center",
      },
      separator: " • ",
      spacing: 15,
    },
    summary: {
      x: MARGIN,
      y: "auto",
      width: CONTENT_WIDTH,
      style: {
        fontSize: fontSizes.body,
        fill: colors.text,
        lineHeight: layout.lineHeight,
        marginTop: 25,
        textAlign: "center",
      },
    },
    sections: {
      x: MARGIN,
      startY: "auto",
      width: CONTENT_WIDTH,
      spacing: layout.sectionSpacing,
      headerStyle: {
        fontSize: fontSizes.sectionHeader,
        fontWeight: "bold",
        fill: colors.accent,
        textAlign: "center",
        marginBottom: 12,
      },
      itemSpacing: layout.itemSpacing,
    },
  };
}

/**
 * Generate zones for modern-split layout
 */
function generateModernSplitZones(style: ResumeStyle): TemplateZones {
  const { colors, fontSizes, layout } = style;
  const headerHeight = layout.headerHeight + 20;
  const leftWidth = (CONTENT_WIDTH * 0.6);
  const rightWidth = (CONTENT_WIDTH * 0.35);
  const rightX = MARGIN + leftWidth + 20;

  return {
    headerArea: {
      x: 0,
      y: 0,
      width: A4_WIDTH,
      height: headerHeight,
      backgroundColor: colors.primary,
    },
    mainContentArea: {
      x: MARGIN,
      y: headerHeight + 15,
      width: leftWidth,
    },
    personal: {
      name: {
        x: MARGIN,
        y: headerHeight / 2 - fontSizes.name / 2,
        width: CONTENT_WIDTH * 0.6,
        textAlign: "left",
        fontSize: fontSizes.name,
        fontWeight: "bold",
        fill: colors.headerText,
      },
      title: {
        x: MARGIN,
        y: "auto",
        width: CONTENT_WIDTH * 0.6,
        textAlign: "left",
        fontSize: fontSizes.title,
        fill: colors.headerText,
        marginTop: 5,
      },
    },
    contact: {
      x: MARGIN + CONTENT_WIDTH * 0.6,
      y: 25,
      width: CONTENT_WIDTH * 0.4,
      layout: "vertical",
      itemStyle: {
        fontSize: fontSizes.small,
        fill: colors.headerText,
        textAlign: "right",
      },
      spacing: 6,
    },
    summary: {
      x: MARGIN,
      y: headerHeight + 15,
      width: leftWidth,
      headerStyle: {
        fontSize: fontSizes.sectionHeader,
        fontWeight: "bold",
        fill: colors.accent,
        marginBottom: 8,
      },
      style: {
        fontSize: fontSizes.body,
        fill: colors.text,
        lineHeight: layout.lineHeight,
      },
    },
    sections: {
      x: MARGIN,
      startY: "auto",
      width: leftWidth,
      spacing: layout.sectionSpacing,
      headerStyle: {
        fontSize: fontSizes.sectionHeader,
        fontWeight: "bold",
        fill: colors.accent,
        marginBottom: 8,
      },
      itemSpacing: layout.itemSpacing,
    },
    categoryStyles: {
      skills: {
        x: rightX,
        width: rightWidth,
      },
      languages: {
        x: rightX,
        width: rightWidth,
      },
      certifications: {
        x: rightX,
        width: rightWidth,
      },
      interests: {
        x: rightX,
        width: rightWidth,
      },
    },
  };
}

/**
 * Generate zones for header-two-column layout
 */
function generateHeaderTwoColumnZones(style: ResumeStyle): TemplateZones {
  const { colors, fontSizes, layout } = style;
  const headerHeight = layout.headerHeight;
  const leftWidth = (CONTENT_WIDTH - 20) / 2;
  const rightX = MARGIN + leftWidth + 20;

  return {
    headerArea: {
      x: 0,
      y: 0,
      width: A4_WIDTH,
      height: headerHeight,
      backgroundColor: colors.primary,
    },
    mainContentArea: {
      x: MARGIN,
      y: headerHeight + 20,
      width: leftWidth,
    },
    personal: {
      name: {
        x: A4_WIDTH / 2,
        y: headerHeight / 2 - fontSizes.name / 2 - 8,
        width: CONTENT_WIDTH,
        textAlign: "center",
        fontSize: fontSizes.name,
        fontWeight: "bold",
        fill: colors.headerText,
      },
      title: {
        x: A4_WIDTH / 2,
        y: "auto",
        width: CONTENT_WIDTH,
        textAlign: "center",
        fontSize: fontSizes.title,
        fill: colors.headerText,
        marginTop: 5,
      },
    },
    contact: {
      x: MARGIN,
      y: "auto",
      width: CONTENT_WIDTH,
      layout: "horizontal",
      itemStyle: {
        fontSize: fontSizes.small,
        fill: colors.headerText,
        textAlign: "center",
      },
      separator: " | ",
      spacing: 10,
    },
    summary: {
      x: MARGIN,
      y: headerHeight + 20,
      width: CONTENT_WIDTH,
      style: {
        fontSize: fontSizes.body,
        fill: colors.text,
        lineHeight: layout.lineHeight,
      },
    },
    sections: {
      x: MARGIN,
      startY: "auto",
      width: leftWidth,
      spacing: layout.sectionSpacing,
      headerStyle: {
        fontSize: fontSizes.sectionHeader,
        fontWeight: "bold",
        fill: colors.accent,
        marginBottom: 8,
      },
      itemSpacing: layout.itemSpacing,
    },
    categoryStyles: {
      skills: {
        x: rightX,
        width: leftWidth,
      },
      education: {
        x: rightX,
        width: leftWidth,
      },
    },
  };
}

/**
 * Generate zones for sidebar-right layout
 */
function generateSidebarRightZones(style: ResumeStyle): TemplateZones {
  const { colors, fontSizes, layout } = style;
  const sidebarWidth = layout.sidebarWidth || 180;
  const mainWidth = A4_WIDTH - sidebarWidth - 40;
  const sidebarX = A4_WIDTH - sidebarWidth;

  return {
    sidebarArea: {
      x: sidebarX,
      y: 0,
      width: sidebarWidth,
      height: A4_HEIGHT,
      backgroundColor: colors.primary,
    },
    mainContentArea: {
      x: MARGIN,
      y: MARGIN,
      width: mainWidth,
    },
    personal: {
      name: {
        x: MARGIN,
        y: MARGIN,
        width: mainWidth,
        textAlign: "left",
        fontSize: fontSizes.name,
        fontWeight: "bold",
        fill: colors.text,
      },
      title: {
        x: MARGIN,
        y: "auto",
        width: mainWidth,
        textAlign: "left",
        fontSize: fontSizes.title,
        fill: colors.accent,
        marginTop: 8,
      },
    },
    contact: {
      x: sidebarX + 15,
      y: 30,
      width: sidebarWidth - 30,
      layout: "vertical",
      itemStyle: {
        fontSize: fontSizes.small,
        fill: colors.sidebarText || colors.headerText,
      },
      spacing: 8,
    },
    summary: {
      x: MARGIN,
      y: "auto",
      width: mainWidth,
      style: {
        fontSize: fontSizes.body,
        fill: colors.text,
        lineHeight: layout.lineHeight,
        marginTop: 20,
      },
    },
    sections: {
      x: MARGIN,
      startY: "auto",
      width: mainWidth,
      spacing: layout.sectionSpacing,
      headerStyle: {
        fontSize: fontSizes.sectionHeader,
        fontWeight: "bold",
        fill: colors.accent,
        marginBottom: 8,
      },
      itemSpacing: layout.itemSpacing,
    },
    categoryStyles: {
      skills: {
        x: sidebarX + 15,
        width: sidebarWidth - 30,
        fill: colors.sidebarText || colors.headerText,
      },
      languages: {
        x: sidebarX + 15,
        width: sidebarWidth - 30,
        fill: colors.sidebarText || colors.headerText,
      },
    },
  };
}

// ============================================
// MAIN ZONE GENERATOR
// ============================================

/**
 * Generate template zones based on style configuration
 */
export function generateTemplateZones(style: ResumeStyle): TemplateZones {
  switch (style.layoutType) {
    case "single-column":
      return generateSingleColumnZones(style);
    case "sidebar-left":
      return generateSidebarLeftZones(style);
    case "sidebar-right":
      return generateSidebarRightZones(style);
    case "minimal":
      return generateMinimalZones(style);
    case "modern-split":
      return generateModernSplitZones(style);
    case "header-two-column":
      return generateHeaderTwoColumnZones(style);
    default:
      return generateSingleColumnZones(style);
  }
}

// ============================================
// ELEMENT STYLE RESOLVER
// ============================================

/**
 * Default text style for any semantic type
 */
export function getDefaultElementStyle(
  semanticType: SemanticType,
  style: ResumeStyle
): Partial<ElementZone> {
  const { colors, fontSizes } = style;
  const category = SEMANTIC_CATEGORY_MAP[semanticType];

  // Base style by category
  const baseStyles: Record<SemanticCategory, Partial<ElementZone>> = {
    personal: {
      fontSize: fontSizes.name,
      fontWeight: "bold",
      fill: colors.text,
    },
    contact: {
      fontSize: fontSizes.small,
      fill: colors.textLight,
    },
    summary: {
      fontSize: fontSizes.body,
      fill: colors.text,
    },
    experience: {
      fontSize: fontSizes.body,
      fill: colors.text,
    },
    education: {
      fontSize: fontSizes.body,
      fill: colors.text,
    },
    skills: {
      fontSize: fontSizes.body,
      fill: colors.text,
    },
    languages: {
      fontSize: fontSizes.body,
      fill: colors.text,
    },
    certifications: {
      fontSize: fontSizes.body,
      fill: colors.text,
    },
    projects: {
      fontSize: fontSizes.body,
      fill: colors.text,
    },
    awards: {
      fontSize: fontSizes.body,
      fill: colors.text,
    },
    publications: {
      fontSize: fontSizes.body,
      fill: colors.text,
    },
    volunteer: {
      fontSize: fontSizes.body,
      fill: colors.text,
    },
    interests: {
      fontSize: fontSizes.body,
      fill: colors.text,
    },
    references: {
      fontSize: fontSizes.body,
      fill: colors.text,
    },
    courses: {
      fontSize: fontSizes.body,
      fill: colors.text,
    },
    memberships: {
      fontSize: fontSizes.body,
      fill: colors.text,
    },
    patents: {
      fontSize: fontSizes.body,
      fill: colors.text,
    },
    military: {
      fontSize: fontSizes.body,
      fill: colors.text,
    },
    layout: {
      fontSize: fontSizes.body,
      fill: colors.secondary,
    },
    custom: {
      fontSize: fontSizes.body,
      fill: colors.text,
    },
  };

  // Specific overrides by semantic type
  const typeOverrides: Partial<Record<SemanticType, Partial<ElementZone>>> = {
    name: { fontSize: fontSizes.name, fontWeight: "bold" },
    title: { fontSize: fontSizes.title, fill: colors.accent },

    // Section headers
    experience_section: { fontSize: fontSizes.sectionHeader, fontWeight: "bold", fill: colors.accent },
    education_section: { fontSize: fontSizes.sectionHeader, fontWeight: "bold", fill: colors.accent },
    skills_section: { fontSize: fontSizes.sectionHeader, fontWeight: "bold", fill: colors.accent },
    languages_section: { fontSize: fontSizes.sectionHeader, fontWeight: "bold", fill: colors.accent },
    certifications_section: { fontSize: fontSizes.sectionHeader, fontWeight: "bold", fill: colors.accent },
    projects_section: { fontSize: fontSizes.sectionHeader, fontWeight: "bold", fill: colors.accent },
    awards_section: { fontSize: fontSizes.sectionHeader, fontWeight: "bold", fill: colors.accent },
    publications_section: { fontSize: fontSizes.sectionHeader, fontWeight: "bold", fill: colors.accent },
    volunteer_section: { fontSize: fontSizes.sectionHeader, fontWeight: "bold", fill: colors.accent },
    interests_section: { fontSize: fontSizes.sectionHeader, fontWeight: "bold", fill: colors.accent },
    references_section: { fontSize: fontSizes.sectionHeader, fontWeight: "bold", fill: colors.accent },
    courses_section: { fontSize: fontSizes.sectionHeader, fontWeight: "bold", fill: colors.accent },
    memberships_section: { fontSize: fontSizes.sectionHeader, fontWeight: "bold", fill: colors.accent },
    patents_section: { fontSize: fontSizes.sectionHeader, fontWeight: "bold", fill: colors.accent },
    military_section: { fontSize: fontSizes.sectionHeader, fontWeight: "bold", fill: colors.accent },
    section_header: { fontSize: fontSizes.sectionHeader, fontWeight: "bold", fill: colors.accent },

    // Job titles
    experience_title: { fontSize: fontSizes.jobTitle, fontWeight: "bold" },
    experience_company: { fontSize: fontSizes.body, fontWeight: "bold", fill: colors.textLight },
    experience_dates: { fontSize: fontSizes.small, fill: colors.textLight },
    experience_description: { fontSize: fontSizes.body },

    // Education
    education_degree: { fontSize: fontSizes.jobTitle, fontWeight: "bold" },
    education_institution: { fontSize: fontSizes.body, fontWeight: "bold", fill: colors.textLight },
    education_dates: { fontSize: fontSizes.small, fill: colors.textLight },

    // Skills
    skill_category: { fontSize: fontSizes.body, fontWeight: "bold" },

    // Summary
    summary: { fontSize: fontSizes.body, fontStyle: "italic" },
    objective: { fontSize: fontSizes.body, fontStyle: "italic" },
    headline: { fontSize: fontSizes.title },
  };

  return {
    ...baseStyles[category],
    ...typeOverrides[semanticType],
  };
}

/**
 * Resolve full element style by combining zones and defaults
 */
export function resolveElementStyle(
  semanticType: SemanticType,
  zones: TemplateZones,
  style: ResumeStyle
): Partial<ElementZone> {
  const category = SEMANTIC_CATEGORY_MAP[semanticType];
  const defaults = getDefaultElementStyle(semanticType, style);

  // Get category-specific override from zones
  const categoryOverride = zones.categoryStyles?.[category];

  return {
    ...defaults,
    ...categoryOverride,
  };
}

// ============================================
// SECTION ORDER
// ============================================

/**
 * Default section order for layouts
 */
export const DEFAULT_SECTION_ORDER: SemanticCategory[] = [
  "personal",
  "contact",
  "summary",
  "experience",
  "education",
  "skills",
  "projects",
  "certifications",
  "languages",
  "awards",
  "publications",
  "volunteer",
  "courses",
  "memberships",
  "interests",
  "references",
  "patents",
  "military",
];

/**
 * Sidebar sections - typically go in sidebar for sidebar layouts
 */
export const SIDEBAR_SECTIONS: SemanticCategory[] = [
  "contact",
  "skills",
  "languages",
  "interests",
  "certifications",
];

/**
 * Main content sections - typically in main area
 */
export const MAIN_SECTIONS: SemanticCategory[] = [
  "summary",
  "experience",
  "education",
  "projects",
  "awards",
  "publications",
  "volunteer",
  "courses",
  "memberships",
  "references",
  "patents",
  "military",
];
