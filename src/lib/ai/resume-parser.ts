import { generateText } from "ai";
import { models } from "./client";

// Layout type for different resume styles (legacy - for backwards compatibility)
export type LayoutType =
  | "single-column"       // Simple single column with optional header
  | "sidebar-left"        // Colored sidebar on left, main content on right
  | "sidebar-right"       // Colored sidebar on right, main content on left
  | "header-two-column"   // Header at top, two WHITE columns below (classic style)
  | "dynamic"             // New: AI-defined flexible layout
  // Legacy aliases
  | "two-column-left"     // Alias for sidebar-left
  | "two-column-right";   // Alias for sidebar-right

// Section types that can be placed anywhere
export type SectionType =
  | "photo"
  | "name"
  | "title"
  | "contact"
  | "details"     // Contact details displayed vertically (alias for contact in column)
  | "summary"
  | "profile"     // Alias for summary
  | "experience"
  | "education"
  | "skills"
  | "languages"
  | "certifications"
  | "divider";

// Position options for sections
export type SectionPosition =
  | "header-left"
  | "header-center"
  | "header-right"
  | "left-column"
  | "right-column"
  | "full-width";

// Individual section layout definition
export interface SectionLayout {
  type: SectionType;
  position: SectionPosition;
  order: number; // Order within the position (1, 2, 3...)
  style?: {
    withIcons?: boolean;      // For contact - show 📍📞 icons
    uppercase?: boolean;      // For name/headers
    withBullets?: boolean;    // For skills - show bullets
    decorativeBullets?: boolean; // ◦ SECTION ◦ style
    compact?: boolean;        // Reduce spacing
  };
}

// Complete dynamic layout definition from AI
export interface DynamicLayout {
  // Section placements
  sections: SectionLayout[];

  // Column configuration
  columns: {
    hasLeftColumn: boolean;
    hasRightColumn: boolean;
    leftWidth: number;  // percentage (e.g., 30)
    rightWidth: number; // percentage (e.g., 70)
    gap: number;        // pixels between columns
  };

  // Header configuration
  header: {
    hasHeader: boolean;
    height: number;        // pixels
    hasPhoto: boolean;
    photoPosition: "left" | "right" | "center";
    photoSize: number;     // pixels
    hasDivider: boolean;
    dividerColor: string;
  };

  // Sidebar configuration (if colored sidebar)
  sidebar?: {
    position: "left" | "right";
    width: number;         // pixels
    backgroundColor: string;
    textColor: string;
  };
}

// Styling interface for AI-controlled design
export interface ResumeStylePreset {
  // Layout type (legacy or "dynamic" for flexible layouts)
  layoutType?: LayoutType;
  // Dynamic layout configuration (when layoutType is "dynamic")
  dynamicLayout?: DynamicLayout;
  // Color scheme
  colors: {
    primary: string;      // Header/sidebar background, accent elements
    secondary: string;    // Secondary text, subtle elements
    text: string;         // Main body text
    textLight: string;    // Lighter text (descriptions)
    accent: string;       // Section headers, links
    background: string;   // Page background
    headerText: string;   // Text on header/sidebar background
  };
  // Typography
  fonts: {
    heading: string;      // Font for name and section headers
    body: string;         // Font for body text
  };
  fontSizes: {
    name: number;         // Name size (20-36)
    title: number;        // Job title size (12-18)
    sectionHeader: number; // Section headers (10-14)
    jobTitle: number;     // Job titles in experience (10-14)
    body: number;         // Body text (9-12)
    small: number;        // Small text like dates (8-10)
  };
  // Layout
  layout: {
    headerHeight: number; // Header section height (60-150, 0 if no top header)
    sidebarWidth?: number; // Sidebar width for two-column layouts (150-250)
    sectionSpacing: number; // Space between sections (15-30)
    lineHeight: number;   // Line height (1.2-1.8)
  };
}

// Structured resume data interface
export interface ParsedResume {
  personalInfo: {
    fullName: string;
    title?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    website?: string;
  };
  summary?: string;
  experience: Array<{
    title: string;
    company: string;
    location?: string;
    startDate: string;
    endDate?: string;
    current?: boolean;
    description: string[];
  }>;
  education: Array<{
    degree: string;
    institution: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }>;
  skills: string[];
  languages?: Array<{
    language: string;
    level: string;
  }>;
  certifications?: Array<{
    name: string;
    issuer?: string;
    date?: string;
  }>;
  // AI-controlled styling based on user preferences
  styling?: ResumeStylePreset;
}

const RESUME_PARSE_PROMPT = `You are an expert resume parser. Analyze the following resume text and extract structured information.

CRITICAL - EXTRACT EVERYTHING:
- Extract ALL information - do NOT summarize, truncate, or skip ANY content
- Include EVERY job position from the resume, even if there are 10+ jobs
- Include EVERY bullet point/description for each job
- Include ALL skills, ALL languages, ALL certifications
- If a section is not present, return an empty array or null
- For dates, use format "Month Year" (e.g., "January 2020") or just "Year" if month is unclear
- For current positions, set endDate to null and current to true
- Clean up and format text properly (remove extra spaces, fix capitalization)
- Bullet points in descriptions should be separate array items
- Preserve the original language of the resume content
- NEVER limit the number of items - include EVERYTHING

Return a JSON object with this EXACT structure:
{
  "personalInfo": {
    "fullName": "string (required)",
    "title": "string or null",
    "email": "string or null",
    "phone": "string or null",
    "location": "string or null",
    "linkedin": "string or null",
    "website": "string or null"
  },
  "summary": "string or null (professional summary/about section)",
  "experience": [
    {
      "title": "string",
      "company": "string",
      "location": "string or null",
      "startDate": "string",
      "endDate": "string or null",
      "current": "boolean",
      "description": ["array of bullet points as strings"]
    }
  ],
  "education": [
    {
      "degree": "string",
      "institution": "string",
      "location": "string or null",
      "startDate": "string or null",
      "endDate": "string or null",
      "description": "string or null"
    }
  ],
  "skills": ["array of skill strings"],
  "languages": [
    {
      "language": "string",
      "level": "string (e.g., Native, Fluent, Intermediate, Basic)"
    }
  ],
  "certifications": [
    {
      "name": "string",
      "issuer": "string or null",
      "date": "string or null"
    }
  ]
}

Resume text to parse:
---
{resumeText}
---

Return ONLY valid JSON, no markdown formatting or explanation.`;

export async function parseResumeWithAI(resumeText: string): Promise<ParsedResume> {
  const prompt = RESUME_PARSE_PROMPT.replace("{resumeText}", resumeText);

  const { text } = await generateText({
    model: await models.analysis(),
    prompt,
    maxOutputTokens: 16000, // Increased for large resumes with many jobs
    temperature: 0.1, // Low temperature for consistent extraction
  });

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse resume: No JSON found in AI response");
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as ParsedResume;

    // Validate required fields
    if (!parsed.personalInfo?.fullName) {
      throw new Error("Failed to extract name from resume");
    }

    // Ensure arrays are initialized
    parsed.experience = parsed.experience || [];
    parsed.education = parsed.education || [];
    parsed.skills = parsed.skills || [];
    parsed.languages = parsed.languages || [];
    parsed.certifications = parsed.certifications || [];

    return parsed;
  } catch (e) {
    console.error("JSON parse error:", e, "\nRaw text:", text);
    throw new Error("Failed to parse AI response as JSON");
  }
}
