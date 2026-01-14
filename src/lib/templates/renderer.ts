// Canvas Renderer - Converts ResumeData schema to Fabric.js canvas objects
// This is the single source of truth for rendering resumes
// Both templates and AI-generated resumes use this renderer

import { nanoid } from "nanoid";
import {
  ResumeData,
  ResumeStyle,
  A4_WIDTH,
  A4_HEIGHT,
  MARGIN,
  CONTENT_WIDTH,
} from "./schema";
import { SemanticType } from "../canvas/semantic-types";

// Fabric.js object types for canvas
interface CanvasObject {
  id?: string;
  type: "rect" | "textbox" | "i-text" | "circle" | "line";
  left: number;
  top: number;
  width?: number;
  height?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  rx?: number;
  ry?: number;
  radius?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  charSpacing?: number;
  lineHeight?: number;
  selectable?: boolean;
  evented?: boolean;
  originX?: string;
  originY?: string;
  // Semantic type for template switching
  semanticType?: SemanticType;
  semanticGroup?: string;
}

// Result of rendering
export interface RenderResult {
  objects: CanvasObject[];
  background: string;
  estimatedHeight: number;
}

// Helper to create unique IDs
const createId = () => nanoid();

// Helper to create text object
function createText(
  text: string,
  left: number,
  top: number,
  style: ResumeStyle,
  options: {
    fontSize?: number;
    fontWeight?: string;
    fill?: string;
    width?: number;
    lineHeight?: number;
    charSpacing?: number;
    type?: "i-text" | "textbox";
    semanticType?: SemanticType;
    semanticGroup?: string;
  } = {}
): CanvasObject {
  return {
    id: createId(),
    type: options.width ? "textbox" : (options.type || "i-text"),
    left,
    top,
    text,
    fontSize: options.fontSize || style.fontSizes.body,
    fontFamily: options.fontWeight === "bold" ? style.fonts.heading : style.fonts.body,
    fontWeight: options.fontWeight,
    fill: options.fill || style.colors.text,
    width: options.width,
    lineHeight: options.lineHeight || style.layout.lineHeight,
    charSpacing: options.charSpacing,
    originX: "left",
    originY: "top",
    semanticType: options.semanticType,
    semanticGroup: options.semanticGroup,
  };
}

// Helper to create rectangle
function createRect(
  left: number,
  top: number,
  width: number,
  height: number,
  fill: string,
  options: {
    selectable?: boolean;
    evented?: boolean;
    rx?: number;
    ry?: number;
    stroke?: string;
    strokeWidth?: number;
  } = {}
): CanvasObject {
  return {
    id: createId(),
    type: "rect",
    left,
    top,
    width,
    height,
    fill,
    selectable: options.selectable ?? true,
    evented: options.evented ?? true,
    rx: options.rx,
    ry: options.ry,
    stroke: options.stroke,
    strokeWidth: options.strokeWidth,
  };
}

// Render single-column layout
function renderSingleColumn(data: ResumeData): RenderResult {
  const style = data.styling;
  const objects: CanvasObject[] = [];
  let currentY = 0;
  let expIndex = 0;
  let eduIndex = 0;

  // Header background
  objects.push(createRect(0, 0, A4_WIDTH, style.layout.headerHeight, style.colors.primary, {
    selectable: true,
    evented: true,
  }));

  // Name
  objects.push(createText(
    data.personalInfo.fullName,
    MARGIN,
    style.layout.headerHeight / 2 - style.fontSizes.name / 2 - 5,
    style,
    {
      fontSize: style.fontSizes.name,
      fontWeight: "bold",
      fill: style.colors.headerText,
      semanticType: "name",
    }
  ));

  // Title
  if (data.personalInfo.title) {
    objects.push(createText(
      data.personalInfo.title,
      MARGIN,
      style.layout.headerHeight / 2 + style.fontSizes.name / 2 - 5,
      style,
      {
        fontSize: style.fontSizes.title,
        fill: style.colors.sidebarText || style.colors.secondary,
        semanticType: "title",
      }
    ));
  }

  currentY = style.layout.headerHeight + 20;

  // Contact info (email, phone, location)
  if (data.personalInfo.email) {
    objects.push(createText(data.personalInfo.email, MARGIN, currentY, style, {
      fontSize: style.fontSizes.small, fill: style.colors.secondary, semanticType: "email",
    }));
  }
  if (data.personalInfo.phone) {
    objects.push(createText(data.personalInfo.phone, MARGIN + 150, currentY, style, {
      fontSize: style.fontSizes.small, fill: style.colors.secondary, semanticType: "phone",
    }));
  }
  if (data.personalInfo.location) {
    objects.push(createText(data.personalInfo.location, MARGIN + 300, currentY, style, {
      fontSize: style.fontSizes.small, fill: style.colors.secondary, semanticType: "location",
    }));
  }
  currentY += 15;

  // Links line
  if (data.personalInfo.linkedin) {
    objects.push(createText(data.personalInfo.linkedin, MARGIN, currentY, style, {
      fontSize: style.fontSizes.small, fill: style.colors.secondary, semanticType: "linkedin",
    }));
  }
  if (data.personalInfo.website) {
    objects.push(createText(data.personalInfo.website, MARGIN + 180, currentY, style, {
      fontSize: style.fontSizes.small, fill: style.colors.secondary, semanticType: "website",
    }));
  }
  if (data.personalInfo.github) {
    objects.push(createText(data.personalInfo.github, MARGIN + 360, currentY, style, {
      fontSize: style.fontSizes.small, fill: style.colors.secondary, semanticType: "github",
    }));
  }
  currentY += 20;

  currentY += style.layout.sectionSpacing;

  // Summary
  if (data.summary) {
    objects.push(createText(
      "PROFESSIONAL SUMMARY",
      MARGIN,
      currentY,
      style,
      {
        fontSize: style.fontSizes.sectionHeader,
        fontWeight: "bold",
        fill: style.colors.accent,
        charSpacing: 50,
        semanticType: "section_header",
      }
    ));
    currentY += style.fontSizes.sectionHeader + 8;

    objects.push(createText(
      data.summary,
      MARGIN,
      currentY,
      style,
      {
        fontSize: style.fontSizes.body,
        fill: style.colors.textLight,
        width: CONTENT_WIDTH,
        lineHeight: style.layout.lineHeight,
        semanticType: "summary",
      }
    ));
    currentY += Math.ceil(data.summary.length / 80) * style.fontSizes.body * style.layout.lineHeight + style.layout.sectionSpacing;
  }

  // Experience
  if (data.experience.length > 0) {
    objects.push(createText(
      "WORK EXPERIENCE",
      MARGIN,
      currentY,
      style,
      {
        fontSize: style.fontSizes.sectionHeader,
        fontWeight: "bold",
        fill: style.colors.accent,
        charSpacing: 50,
        semanticType: "experience_section",
      }
    ));
    currentY += style.fontSizes.sectionHeader + 10;

    for (const exp of data.experience) {
      const expGroup = `experience_${expIndex++}`;

      // Job title
      objects.push(createText(
        exp.title,
        MARGIN,
        currentY,
        style,
        {
          fontSize: style.fontSizes.jobTitle,
          fontWeight: "bold",
          fill: style.colors.text,
          semanticType: "experience_title",
          semanticGroup: expGroup,
        }
      ));
      currentY += style.fontSizes.jobTitle + 4;

      // Company
      objects.push(createText(
        exp.company,
        MARGIN,
        currentY,
        style,
        {
          fontSize: style.fontSizes.small,
          fill: style.colors.secondary,
          semanticType: "experience_company",
          semanticGroup: expGroup,
        }
      ));

      // Dates
      const dates = exp.startDate + " - " + (exp.current ? "Present" : exp.endDate);
      objects.push(createText(
        dates,
        MARGIN + 200,
        currentY,
        style,
        {
          fontSize: style.fontSizes.small,
          fill: style.colors.secondary,
          semanticType: "experience_dates",
          semanticGroup: expGroup,
        }
      ));
      currentY += style.fontSizes.small + 8;

      // Description bullets
      if (exp.description.length > 0) {
        const bulletText = exp.description.map(d => "• " + d).join("\n");
        objects.push(createText(
          bulletText,
          MARGIN,
          currentY,
          style,
          {
            fontSize: style.fontSizes.body,
            fill: style.colors.textLight,
            width: CONTENT_WIDTH,
            lineHeight: style.layout.lineHeight,
            semanticType: "experience_description",
            semanticGroup: expGroup,
          }
        ));
        currentY += exp.description.length * style.fontSizes.body * style.layout.lineHeight + style.layout.itemSpacing;
      }

      currentY += style.layout.itemSpacing;
    }

    currentY += style.layout.sectionSpacing - style.layout.itemSpacing;
  }

  // Education
  if (data.education.length > 0) {
    objects.push(createText(
      "EDUCATION",
      MARGIN,
      currentY,
      style,
      {
        fontSize: style.fontSizes.sectionHeader,
        fontWeight: "bold",
        fill: style.colors.accent,
        charSpacing: 50,
        semanticType: "education_section",
      }
    ));
    currentY += style.fontSizes.sectionHeader + 10;

    for (const edu of data.education) {
      const eduGroup = `education_${eduIndex++}`;

      objects.push(createText(
        edu.degree,
        MARGIN,
        currentY,
        style,
        {
          fontSize: style.fontSizes.jobTitle,
          fontWeight: "bold",
          fill: style.colors.text,
          semanticType: "education_degree",
          semanticGroup: eduGroup,
        }
      ));
      currentY += style.fontSizes.jobTitle + 4;

      objects.push(createText(
        edu.institution,
        MARGIN,
        currentY,
        style,
        {
          fontSize: style.fontSizes.small,
          fill: style.colors.secondary,
          semanticType: "education_institution",
          semanticGroup: eduGroup,
        }
      ));

      if (edu.startDate || edu.endDate) {
        const eduDates = edu.startDate && edu.endDate ? `${edu.startDate} - ${edu.endDate}` : (edu.endDate || "");
        objects.push(createText(
          eduDates,
          MARGIN + 250,
          currentY,
          style,
          {
            fontSize: style.fontSizes.small,
            fill: style.colors.secondary,
            semanticType: "education_dates",
            semanticGroup: eduGroup,
          }
        ));
      }
      currentY += style.fontSizes.small + style.layout.itemSpacing;
    }

    currentY += style.layout.sectionSpacing;
  }

  // Skills
  if (data.skills.length > 0) {
    objects.push(createText(
      "SKILLS",
      MARGIN,
      currentY,
      style,
      {
        fontSize: style.fontSizes.sectionHeader,
        fontWeight: "bold",
        fill: style.colors.accent,
        charSpacing: 50,
        semanticType: "skills_section",
      }
    ));
    currentY += style.fontSizes.sectionHeader + 8;

    objects.push(createText(
      data.skills.join("  •  "),
      MARGIN,
      currentY,
      style,
      {
        fontSize: style.fontSizes.body,
        fill: style.colors.textLight,
        width: CONTENT_WIDTH,
        semanticType: "skill_list",
      }
    ));
    currentY += style.fontSizes.body * 2 + style.layout.sectionSpacing;
  }

  // Languages
  if (data.languages && data.languages.length > 0) {
    objects.push(createText(
      "LANGUAGES",
      MARGIN,
      currentY,
      style,
      {
        fontSize: style.fontSizes.sectionHeader,
        fontWeight: "bold",
        fill: style.colors.accent,
        charSpacing: 50,
        semanticType: "languages_section",
      }
    ));
    currentY += style.fontSizes.sectionHeader + 8;

    const langText = data.languages.map(l => `${l.language} - ${l.level}`).join("  •  ");
    objects.push(createText(
      langText,
      MARGIN,
      currentY,
      style,
      {
        fontSize: style.fontSizes.body,
        fill: style.colors.textLight,
        width: CONTENT_WIDTH,
        semanticType: "language_entry",
      }
    ));
    currentY += style.fontSizes.body * 2 + style.layout.sectionSpacing;
  }

  // Certifications
  if (data.certifications && data.certifications.length > 0) {
    objects.push(createText(
      "CERTIFICATIONS",
      MARGIN,
      currentY,
      style,
      {
        fontSize: style.fontSizes.sectionHeader,
        fontWeight: "bold",
        fill: style.colors.accent,
        charSpacing: 50,
        semanticType: "certifications_section",
      }
    ));
    currentY += style.fontSizes.sectionHeader + 8;

    for (const cert of data.certifications) {
      objects.push(createText(
        cert.name,
        MARGIN,
        currentY,
        style,
        {
          fontSize: style.fontSizes.body,
          fill: style.colors.textLight,
          semanticType: "certification_name",
        }
      ));
      currentY += style.fontSizes.body + 4;
    }
  }

  return {
    objects,
    background: style.colors.background,
    estimatedHeight: Math.max(currentY + MARGIN, A4_HEIGHT),
  };
}

// Render sidebar-left layout
function renderSidebarLeft(data: ResumeData): RenderResult {
  const style = data.styling;
  const objects: CanvasObject[] = [];
  const sidebarWidth = style.layout.sidebarWidth || 180;
  const mainLeft = sidebarWidth + 20;
  const mainWidth = A4_WIDTH - mainLeft - MARGIN;
  let expIndex = 0;
  let eduIndex = 0;

  // Sidebar background
  objects.push(createRect(0, 0, sidebarWidth, A4_HEIGHT, style.colors.primary, {
    selectable: true,
    evented: true,
  }));

  let sidebarY = MARGIN;
  let mainY = MARGIN;

  // Photo placeholder (if enabled)
  if (data.personalInfo.photo) {
    const photoSize = sidebarWidth - 60;
    objects.push(createRect(30, sidebarY, photoSize, photoSize * 1.2, style.colors.secondary, {
      rx: 4,
      ry: 4,
    }));
    objects.push(createText(
      "PHOTO",
      sidebarWidth / 2 - 20,
      sidebarY + photoSize * 0.6 - 7,
      style,
      {
        fontSize: 12,
        fill: style.colors.headerText,
        semanticType: "photo",
      }
    ));
    sidebarY += photoSize * 1.2 + 25;
  }

  // Sidebar: Contact
  objects.push(createText(
    "CONTACT",
    20,
    sidebarY,
    style,
    {
      fontSize: style.fontSizes.sectionHeader - 1,
      fontWeight: "bold",
      fill: style.colors.headerText,
      charSpacing: 30,
      semanticType: "section_header",
    }
  ));
  sidebarY += style.fontSizes.sectionHeader + 12;

  // Individual contact items with semantic types
  if (data.personalInfo.email) {
    objects.push(createText(data.personalInfo.email, 20, sidebarY, style, {
      fontSize: style.fontSizes.small,
      fill: style.colors.sidebarText || style.colors.secondary,
      semanticType: "email",
    }));
    sidebarY += 20;
  }
  if (data.personalInfo.phone) {
    objects.push(createText(data.personalInfo.phone, 20, sidebarY, style, {
      fontSize: style.fontSizes.small,
      fill: style.colors.sidebarText || style.colors.secondary,
      semanticType: "phone",
    }));
    sidebarY += 20;
  }
  if (data.personalInfo.location) {
    objects.push(createText(data.personalInfo.location, 20, sidebarY, style, {
      fontSize: style.fontSizes.small,
      fill: style.colors.sidebarText || style.colors.secondary,
      semanticType: "location",
    }));
    sidebarY += 20;
  }
  if (data.personalInfo.linkedin) {
    objects.push(createText(data.personalInfo.linkedin, 20, sidebarY, style, {
      fontSize: style.fontSizes.small,
      fill: style.colors.sidebarText || style.colors.secondary,
      semanticType: "linkedin",
    }));
    sidebarY += 20;
  }
  if (data.personalInfo.website) {
    objects.push(createText(data.personalInfo.website, 20, sidebarY, style, {
      fontSize: style.fontSizes.small,
      fill: style.colors.sidebarText || style.colors.secondary,
      semanticType: "website",
    }));
    sidebarY += 20;
  }
  sidebarY += 15;

  // Sidebar: Skills
  if (data.skills.length > 0) {
    objects.push(createText(
      "SKILLS",
      20,
      sidebarY,
      style,
      {
        fontSize: style.fontSizes.sectionHeader - 1,
        fontWeight: "bold",
        fill: style.colors.headerText,
        charSpacing: 30,
        semanticType: "skills_section",
      }
    ));
    sidebarY += style.fontSizes.sectionHeader + 12;

    objects.push(createText(
      data.skills.join("\n"),
      20,
      sidebarY,
      style,
      {
        fontSize: style.fontSizes.small,
        fill: style.colors.sidebarText || style.colors.secondary,
        width: sidebarWidth - 40,
        lineHeight: 1.6,
        semanticType: "skill_list",
      }
    ));
    sidebarY += data.skills.length * 14 + 30;
  }

  // Sidebar: Languages
  if (data.languages && data.languages.length > 0) {
    objects.push(createText(
      "LANGUAGES",
      20,
      sidebarY,
      style,
      {
        fontSize: style.fontSizes.sectionHeader - 1,
        fontWeight: "bold",
        fill: style.colors.headerText,
        charSpacing: 30,
        semanticType: "languages_section",
      }
    ));
    sidebarY += style.fontSizes.sectionHeader + 12;

    const langText = data.languages.map(l => `${l.language} - ${l.level}`).join("\n");
    objects.push(createText(
      langText,
      20,
      sidebarY,
      style,
      {
        fontSize: style.fontSizes.small,
        fill: style.colors.sidebarText || style.colors.secondary,
        width: sidebarWidth - 40,
        lineHeight: 1.6,
        semanticType: "language_entry",
      }
    ));
  }

  // Main content: Name
  objects.push(createText(
    data.personalInfo.fullName,
    mainLeft,
    mainY,
    style,
    {
      fontSize: style.fontSizes.name,
      fontWeight: "bold",
      fill: style.colors.accent,
      semanticType: "name",
    }
  ));
  mainY += style.fontSizes.name + 5;

  // Title
  if (data.personalInfo.title) {
    objects.push(createText(
      data.personalInfo.title,
      mainLeft,
      mainY,
      style,
      {
        fontSize: style.fontSizes.title,
        fill: style.colors.secondary,
        semanticType: "title",
      }
    ));
    mainY += style.fontSizes.title + 20;
  }

  // Summary
  if (data.summary) {
    objects.push(createText(
      "PROFILE",
      mainLeft,
      mainY,
      style,
      {
        fontSize: style.fontSizes.sectionHeader,
        fontWeight: "bold",
        fill: style.colors.accent,
        charSpacing: 40,
        semanticType: "section_header",
      }
    ));
    mainY += style.fontSizes.sectionHeader + 8;

    objects.push(createText(
      data.summary,
      mainLeft,
      mainY,
      style,
      {
        fontSize: style.fontSizes.body,
        fill: style.colors.textLight,
        width: mainWidth,
        lineHeight: style.layout.lineHeight,
        semanticType: "summary",
      }
    ));
    mainY += Math.ceil(data.summary.length / 60) * style.fontSizes.body * style.layout.lineHeight + style.layout.sectionSpacing;
  }

  // Experience
  if (data.experience.length > 0) {
    objects.push(createText(
      "WORK EXPERIENCE",
      mainLeft,
      mainY,
      style,
      {
        fontSize: style.fontSizes.sectionHeader,
        fontWeight: "bold",
        fill: style.colors.accent,
        charSpacing: 40,
        semanticType: "experience_section",
      }
    ));
    mainY += style.fontSizes.sectionHeader + 10;

    for (const exp of data.experience) {
      const expGroup = `experience_${expIndex++}`;

      objects.push(createText(
        exp.title,
        mainLeft,
        mainY,
        style,
        {
          fontSize: style.fontSizes.jobTitle,
          fontWeight: "bold",
          fill: style.colors.text,
          semanticType: "experience_title",
          semanticGroup: expGroup,
        }
      ));
      mainY += style.fontSizes.jobTitle + 4;

      objects.push(createText(
        exp.company,
        mainLeft,
        mainY,
        style,
        {
          fontSize: style.fontSizes.small,
          fill: style.colors.secondary,
          semanticType: "experience_company",
          semanticGroup: expGroup,
        }
      ));

      const dates = exp.startDate + " - " + (exp.current ? "Present" : exp.endDate);
      objects.push(createText(
        dates,
        mainLeft + 150,
        mainY,
        style,
        {
          fontSize: style.fontSizes.small,
          fill: style.colors.secondary,
          semanticType: "experience_dates",
          semanticGroup: expGroup,
        }
      ));
      mainY += style.fontSizes.small + 8;

      if (exp.description.length > 0) {
        const bulletText = exp.description.map(d => "• " + d).join("\n");
        objects.push(createText(
          bulletText,
          mainLeft,
          mainY,
          style,
          {
            fontSize: style.fontSizes.body,
            fill: style.colors.textLight,
            width: mainWidth,
            lineHeight: style.layout.lineHeight,
            semanticType: "experience_description",
            semanticGroup: expGroup,
          }
        ));
        mainY += exp.description.length * style.fontSizes.body * style.layout.lineHeight + style.layout.itemSpacing;
      }

      mainY += style.layout.itemSpacing;
    }

    mainY += style.layout.sectionSpacing - style.layout.itemSpacing;
  }

  // Education
  if (data.education.length > 0) {
    objects.push(createText(
      "EDUCATION",
      mainLeft,
      mainY,
      style,
      {
        fontSize: style.fontSizes.sectionHeader,
        fontWeight: "bold",
        fill: style.colors.accent,
        charSpacing: 40,
        semanticType: "education_section",
      }
    ));
    mainY += style.fontSizes.sectionHeader + 10;

    for (const edu of data.education) {
      const eduGroup = `education_${eduIndex++}`;

      objects.push(createText(
        edu.degree,
        mainLeft,
        mainY,
        style,
        {
          fontSize: style.fontSizes.jobTitle,
          fontWeight: "bold",
          fill: style.colors.text,
          semanticType: "education_degree",
          semanticGroup: eduGroup,
        }
      ));
      mainY += style.fontSizes.jobTitle + 4;

      objects.push(createText(
        edu.institution,
        mainLeft,
        mainY,
        style,
        {
          fontSize: style.fontSizes.small,
          fill: style.colors.secondary,
          semanticType: "education_institution",
          semanticGroup: eduGroup,
        }
      ));

      if (edu.startDate || edu.endDate) {
        const eduDates = edu.startDate && edu.endDate ? `${edu.startDate} - ${edu.endDate}` : (edu.endDate || "");
        objects.push(createText(
          eduDates,
          mainLeft + 200,
          mainY,
          style,
          {
            fontSize: style.fontSizes.small,
            fill: style.colors.secondary,
            semanticType: "education_dates",
            semanticGroup: eduGroup,
          }
        ));
      }
      mainY += style.fontSizes.small + style.layout.itemSpacing;
    }
  }

  return {
    objects,
    background: style.colors.background,
    estimatedHeight: Math.max(mainY + MARGIN, sidebarY + MARGIN, A4_HEIGHT),
  };
}

// Render minimal layout
function renderMinimal(data: ResumeData): RenderResult {
  const style = data.styling;
  const objects: CanvasObject[] = [];
  let currentY = MARGIN + 20;
  let expIndex = 0;
  let eduIndex = 0;

  // Accent decoration (subtle)
  objects.push({
    id: createId(),
    type: "circle",
    left: -60,
    top: -60,
    radius: 120,
    fill: style.colors.primary,
    selectable: false,
    evented: false,
  });

  // Name
  objects.push(createText(
    data.personalInfo.fullName,
    MARGIN,
    currentY,
    style,
    {
      fontSize: style.fontSizes.name + 10,
      fontWeight: "bold",
      fill: style.colors.text,
      lineHeight: 1.1,
      semanticType: "name",
    }
  ));
  currentY += (style.fontSizes.name + 10) * 1.1 + 15;

  // Title
  if (data.personalInfo.title) {
    objects.push(createText(
      data.personalInfo.title,
      MARGIN,
      currentY,
      style,
      {
        fontSize: style.fontSizes.title,
        fill: style.colors.secondary,
        semanticType: "title",
      }
    ));
    currentY += style.fontSizes.title + 20;
  }

  // Contact (individual items)
  if (data.personalInfo.email) {
    objects.push(createText(data.personalInfo.email, MARGIN, currentY, style, {
      fontSize: style.fontSizes.small, fill: style.colors.secondary, semanticType: "email",
    }));
    currentY += style.fontSizes.small * 1.6;
  }
  if (data.personalInfo.website) {
    objects.push(createText(data.personalInfo.website, MARGIN, currentY, style, {
      fontSize: style.fontSizes.small, fill: style.colors.secondary, semanticType: "website",
    }));
    currentY += style.fontSizes.small * 1.6;
  }
  if (data.personalInfo.phone) {
    objects.push(createText(data.personalInfo.phone, MARGIN, currentY, style, {
      fontSize: style.fontSizes.small, fill: style.colors.secondary, semanticType: "phone",
    }));
    currentY += style.fontSizes.small * 1.6;
  }
  currentY += style.layout.sectionSpacing + 10;

  // Summary
  if (data.summary) {
    objects.push(createText(
      "ABOUT",
      MARGIN,
      currentY,
      style,
      {
        fontSize: style.fontSizes.sectionHeader - 1,
        fontWeight: "bold",
        fill: style.colors.accent,
        charSpacing: 200,
        semanticType: "section_header",
      }
    ));
    currentY += style.fontSizes.sectionHeader + 12;

    objects.push(createText(
      data.summary,
      MARGIN,
      currentY,
      style,
      {
        fontSize: style.fontSizes.body + 1,
        fill: style.colors.textLight,
        width: CONTENT_WIDTH,
        lineHeight: style.layout.lineHeight + 0.1,
        semanticType: "summary",
      }
    ));
    currentY += Math.ceil(data.summary.length / 70) * (style.fontSizes.body + 1) * style.layout.lineHeight + style.layout.sectionSpacing + 10;
  }

  // Experience
  if (data.experience.length > 0) {
    objects.push(createText(
      "EXPERIENCE",
      MARGIN,
      currentY,
      style,
      {
        fontSize: style.fontSizes.sectionHeader - 1,
        fontWeight: "bold",
        fill: style.colors.accent,
        charSpacing: 200,
        semanticType: "experience_section",
      }
    ));
    currentY += style.fontSizes.sectionHeader + 12;

    for (const exp of data.experience) {
      const expGroup = `experience_${expIndex++}`;

      objects.push(createText(
        exp.title,
        MARGIN,
        currentY,
        style,
        {
          fontSize: style.fontSizes.jobTitle,
          fontWeight: "bold",
          fill: style.colors.text,
          semanticType: "experience_title",
          semanticGroup: expGroup,
        }
      ));
      currentY += style.fontSizes.jobTitle + 4;

      objects.push(createText(
        exp.company,
        MARGIN,
        currentY,
        style,
        {
          fontSize: style.fontSizes.small,
          fill: style.colors.secondary,
          semanticType: "experience_company",
          semanticGroup: expGroup,
        }
      ));

      objects.push(createText(
        exp.startDate + " — " + (exp.current ? "Present" : exp.endDate),
        MARGIN + 150,
        currentY,
        style,
        {
          fontSize: style.fontSizes.small,
          fill: style.colors.secondary,
          semanticType: "experience_dates",
          semanticGroup: expGroup,
        }
      ));
      currentY += style.fontSizes.small + 8;

      if (exp.description.length > 0) {
        objects.push(createText(
          exp.description.join("\n• "),
          MARGIN,
          currentY,
          style,
          {
            fontSize: style.fontSizes.body,
            fill: style.colors.textLight,
            width: CONTENT_WIDTH,
            lineHeight: style.layout.lineHeight,
            semanticType: "experience_description",
            semanticGroup: expGroup,
          }
        ));
        currentY += Math.ceil(exp.description.join(" ").length / 80) * style.fontSizes.body * style.layout.lineHeight + style.layout.itemSpacing + 5;
      }

      currentY += style.layout.itemSpacing;
    }

    currentY += style.layout.sectionSpacing - style.layout.itemSpacing;
  }

  // Skills
  if (data.skills.length > 0) {
    objects.push(createText(
      "SKILLS",
      MARGIN,
      currentY,
      style,
      {
        fontSize: style.fontSizes.sectionHeader - 1,
        fontWeight: "bold",
        fill: style.colors.accent,
        charSpacing: 200,
        semanticType: "skills_section",
      }
    ));
    currentY += style.fontSizes.sectionHeader + 10;

    objects.push(createText(
      data.skills.join("  •  "),
      MARGIN,
      currentY,
      style,
      {
        fontSize: style.fontSizes.body,
        fill: style.colors.textLight,
        width: CONTENT_WIDTH,
        semanticType: "skill_list",
      }
    ));
    currentY += style.fontSizes.body * 2 + style.layout.sectionSpacing;
  }

  // Education
  if (data.education.length > 0) {
    objects.push(createText(
      "EDUCATION",
      MARGIN,
      currentY,
      style,
      {
        fontSize: style.fontSizes.sectionHeader - 1,
        fontWeight: "bold",
        fill: style.colors.accent,
        charSpacing: 200,
        semanticType: "education_section",
      }
    ));
    currentY += style.fontSizes.sectionHeader + 10;

    for (const edu of data.education) {
      const eduGroup = `education_${eduIndex++}`;

      objects.push(createText(
        edu.degree,
        MARGIN,
        currentY,
        style,
        {
          fontSize: style.fontSizes.body,
          fontWeight: "bold",
          fill: style.colors.text,
          semanticType: "education_degree",
          semanticGroup: eduGroup,
        }
      ));
      currentY += style.fontSizes.body + 3;

      objects.push(createText(
        edu.institution,
        MARGIN,
        currentY,
        style,
        {
          fontSize: style.fontSizes.small,
          fill: style.colors.secondary,
          semanticType: "education_institution",
          semanticGroup: eduGroup,
        }
      ));

      if (edu.endDate) {
        objects.push(createText(
          edu.endDate,
          MARGIN + 200,
          currentY,
          style,
          {
            fontSize: style.fontSizes.small,
            fill: style.colors.secondary,
            semanticType: "education_dates",
            semanticGroup: eduGroup,
          }
        ));
      }
      currentY += style.fontSizes.small + style.layout.itemSpacing;
    }
  }

  return {
    objects,
    background: style.colors.background,
    estimatedHeight: Math.max(currentY + MARGIN, A4_HEIGHT),
  };
}

// Render modern-split layout (header with two columns)
function renderModernSplit(data: ResumeData): RenderResult {
  const style = data.styling;
  const objects: CanvasObject[] = [];
  const headerHeight = style.layout.headerHeight + 30;
  let expIndex = 0;
  let eduIndex = 0;

  // Header background with gradient effect (two rects)
  objects.push(createRect(0, 0, A4_WIDTH, headerHeight, style.colors.primary, {
    selectable: true,
    evented: true,
  }));

  // Small accent line at bottom of header
  objects.push(createRect(0, headerHeight - 4, A4_WIDTH, 4, style.colors.accent, {
    selectable: false,
    evented: false,
  }));

  // Name and title in header
  objects.push(createText(
    data.personalInfo.fullName.toUpperCase(),
    MARGIN,
    30,
    style,
    {
      fontSize: style.fontSizes.name,
      fontWeight: "bold",
      fill: style.colors.headerText,
      charSpacing: 100,
      semanticType: "name",
    }
  ));

  if (data.personalInfo.title) {
    objects.push(createText(
      data.personalInfo.title,
      MARGIN,
      30 + style.fontSizes.name + 8,
      style,
      {
        fontSize: style.fontSizes.title,
        fill: style.colors.sidebarText || style.colors.secondary,
        semanticType: "title",
      }
    ));
  }

  // Contact in header (right side) - individual items
  let contactY = 35;
  if (data.personalInfo.email) {
    objects.push(createText(data.personalInfo.email, A4_WIDTH - MARGIN - 180, contactY, style, {
      fontSize: style.fontSizes.small, fill: style.colors.sidebarText || style.colors.secondary, semanticType: "email",
    }));
    contactY += style.fontSizes.small * 1.8;
  }
  if (data.personalInfo.phone) {
    objects.push(createText(data.personalInfo.phone, A4_WIDTH - MARGIN - 180, contactY, style, {
      fontSize: style.fontSizes.small, fill: style.colors.sidebarText || style.colors.secondary, semanticType: "phone",
    }));
    contactY += style.fontSizes.small * 1.8;
  }
  if (data.personalInfo.location) {
    objects.push(createText(data.personalInfo.location, A4_WIDTH - MARGIN - 180, contactY, style, {
      fontSize: style.fontSizes.small, fill: style.colors.sidebarText || style.colors.secondary, semanticType: "location",
    }));
  }

  let currentY = headerHeight + 25;
  const colWidth = (A4_WIDTH - MARGIN * 2 - 30) / 2;
  const col1Left = MARGIN;
  const col2Left = MARGIN + colWidth + 30;

  // Left column: Summary + Experience
  let col1Y = currentY;

  if (data.summary) {
    objects.push(createText(
      "PROFILE",
      col1Left,
      col1Y,
      style,
      {
        fontSize: style.fontSizes.sectionHeader,
        fontWeight: "bold",
        fill: style.colors.accent,
        charSpacing: 50,
        semanticType: "section_header",
      }
    ));
    col1Y += style.fontSizes.sectionHeader + 10;

    objects.push(createText(
      data.summary,
      col1Left,
      col1Y,
      style,
      {
        fontSize: style.fontSizes.body,
        fill: style.colors.textLight,
        width: colWidth,
        lineHeight: style.layout.lineHeight,
        semanticType: "summary",
      }
    ));
    col1Y += Math.ceil(data.summary.length / 45) * style.fontSizes.body * style.layout.lineHeight + style.layout.sectionSpacing;
  }

  // Experience
  if (data.experience.length > 0) {
    objects.push(createText(
      "EXPERIENCE",
      col1Left,
      col1Y,
      style,
      {
        fontSize: style.fontSizes.sectionHeader,
        fontWeight: "bold",
        fill: style.colors.accent,
        charSpacing: 50,
        semanticType: "experience_section",
      }
    ));
    col1Y += style.fontSizes.sectionHeader + 10;

    for (const exp of data.experience) {
      const expGroup = `experience_${expIndex++}`;

      objects.push(createText(
        exp.title,
        col1Left,
        col1Y,
        style,
        {
          fontSize: style.fontSizes.jobTitle - 1,
          fontWeight: "bold",
          fill: style.colors.text,
          semanticType: "experience_title",
          semanticGroup: expGroup,
        }
      ));
      col1Y += style.fontSizes.jobTitle + 2;

      objects.push(createText(
        exp.company,
        col1Left,
        col1Y,
        style,
        {
          fontSize: style.fontSizes.small - 1,
          fill: style.colors.secondary,
          semanticType: "experience_company",
          semanticGroup: expGroup,
        }
      ));

      objects.push(createText(
        `${exp.startDate} - ${exp.current ? "Present" : exp.endDate}`,
        col1Left + 120,
        col1Y,
        style,
        {
          fontSize: style.fontSizes.small - 1,
          fill: style.colors.secondary,
          semanticType: "experience_dates",
          semanticGroup: expGroup,
        }
      ));
      col1Y += style.fontSizes.small + 6;

      if (exp.description.length > 0) {
        const bulletText = exp.description.slice(0, 3).map(d => "• " + d).join("\n");
        objects.push(createText(
          bulletText,
          col1Left,
          col1Y,
          style,
          {
            fontSize: style.fontSizes.body - 1,
            fill: style.colors.textLight,
            width: colWidth,
            lineHeight: style.layout.lineHeight,
            semanticType: "experience_description",
            semanticGroup: expGroup,
          }
        ));
        col1Y += Math.min(3, exp.description.length) * (style.fontSizes.body - 1) * style.layout.lineHeight + 8;
      }

      col1Y += style.layout.itemSpacing;
    }
  }

  // Right column: Education, Skills, Languages
  let col2Y = currentY;

  // Education
  if (data.education.length > 0) {
    objects.push(createText(
      "EDUCATION",
      col2Left,
      col2Y,
      style,
      {
        fontSize: style.fontSizes.sectionHeader,
        fontWeight: "bold",
        fill: style.colors.accent,
        charSpacing: 50,
        semanticType: "education_section",
      }
    ));
    col2Y += style.fontSizes.sectionHeader + 10;

    for (const edu of data.education) {
      const eduGroup = `education_${eduIndex++}`;

      objects.push(createText(
        edu.degree,
        col2Left,
        col2Y,
        style,
        {
          fontSize: style.fontSizes.jobTitle - 1,
          fontWeight: "bold",
          fill: style.colors.text,
          semanticType: "education_degree",
          semanticGroup: eduGroup,
        }
      ));
      col2Y += style.fontSizes.jobTitle + 2;

      objects.push(createText(
        edu.institution,
        col2Left,
        col2Y,
        style,
        {
          fontSize: style.fontSizes.small - 1,
          fill: style.colors.secondary,
          semanticType: "education_institution",
          semanticGroup: eduGroup,
        }
      ));

      if (edu.endDate) {
        objects.push(createText(
          edu.endDate,
          col2Left + 150,
          col2Y,
          style,
          {
            fontSize: style.fontSizes.small - 1,
            fill: style.colors.secondary,
            semanticType: "education_dates",
            semanticGroup: eduGroup,
          }
        ));
      }
      col2Y += style.fontSizes.small + style.layout.itemSpacing;
    }

    col2Y += style.layout.sectionSpacing;
  }

  // Skills
  if (data.skills.length > 0) {
    objects.push(createText(
      "SKILLS",
      col2Left,
      col2Y,
      style,
      {
        fontSize: style.fontSizes.sectionHeader,
        fontWeight: "bold",
        fill: style.colors.accent,
        charSpacing: 50,
        semanticType: "skills_section",
      }
    ));
    col2Y += style.fontSizes.sectionHeader + 10;

    objects.push(createText(
      data.skills.join("\n"),
      col2Left,
      col2Y,
      style,
      {
        fontSize: style.fontSizes.body - 1,
        fill: style.colors.textLight,
        width: colWidth,
        lineHeight: 1.6,
        semanticType: "skill_list",
      }
    ));
    col2Y += data.skills.length * (style.fontSizes.body - 1) * 1.6 + style.layout.sectionSpacing;
  }

  // Languages
  if (data.languages && data.languages.length > 0) {
    objects.push(createText(
      "LANGUAGES",
      col2Left,
      col2Y,
      style,
      {
        fontSize: style.fontSizes.sectionHeader,
        fontWeight: "bold",
        fill: style.colors.accent,
        charSpacing: 50,
        semanticType: "languages_section",
      }
    ));
    col2Y += style.fontSizes.sectionHeader + 10;

    const langText = data.languages.map(l => `${l.language} — ${l.level}`).join("\n");
    objects.push(createText(
      langText,
      col2Left,
      col2Y,
      style,
      {
        fontSize: style.fontSizes.body - 1,
        fill: style.colors.textLight,
        lineHeight: 1.6,
        semanticType: "language_entry",
      }
    ));
  }

  return {
    objects,
    background: style.colors.background,
    estimatedHeight: Math.max(col1Y + MARGIN, col2Y + MARGIN, A4_HEIGHT),
  };
}

// Main render function - routes to appropriate layout renderer
export function renderResumeToCanvas(data: ResumeData): RenderResult {
  switch (data.styling.layoutType) {
    case "sidebar-left":
    case "sidebar-right":
      return renderSidebarLeft(data);
    case "minimal":
      return renderMinimal(data);
    case "modern-split":
    case "header-two-column":
      return renderModernSplit(data);
    case "single-column":
    default:
      return renderSingleColumn(data);
  }
}

// Convert RenderResult to Fabric.js JSON format for templates
export function toFabricJSON(result: RenderResult): object {
  return {
    version: "6.0.0",
    objects: result.objects,
    background: result.background,
  };
}
