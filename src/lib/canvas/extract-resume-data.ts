// Extract ResumeData from canvas objects
// This allows preserving user data when switching templates

import type { ResumeData, ResumeStyle, ExperienceEntry, EducationEntry, LanguageEntry, CertificationEntry, ProjectEntry } from "@/lib/templates/schema";

interface CanvasTextObject {
  type: string;
  text?: string;
  left: number;
  top: number;
  fontSize?: number;
  fontWeight?: string | number;
  fill?: string;
  charSpacing?: number;
  width?: number;
  height?: number;
  scaleX?: number;
  scaleY?: number;
}

interface CanvasJSON {
  objects: CanvasTextObject[];
  background?: string;
}

// Section types we can recognize
type SectionType =
  | "header"
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "languages"
  | "certifications"
  | "projects"
  | "interests"
  | "contact"
  | "unknown";

// Section markers (case-insensitive)
const SECTION_PATTERNS: { type: SectionType; patterns: RegExp[] }[] = [
  {
    type: "summary",
    patterns: [
      /^(professional\s+)?summary$/i,
      /^profile$/i,
      /^about(\s+me)?$/i,
      /^objective$/i,
      /^профіль$/i,
      /^про\s+мене$/i,
      /^резюме$/i,
    ]
  },
  {
    type: "experience",
    patterns: [
      /^(work\s+)?experience$/i,
      /^employment(\s+history)?$/i,
      /^work\s+history$/i,
      /^досвід(\s+роботи)?$/i,
      /^робочий\s+досвід$/i,
      /^berufserfahrung$/i,
    ]
  },
  {
    type: "education",
    patterns: [
      /^education$/i,
      /^academic(\s+background)?$/i,
      /^qualifications$/i,
      /^освіта$/i,
      /^ausbildung$/i,
    ]
  },
  {
    type: "skills",
    patterns: [
      /^(technical\s+)?skills$/i,
      /^competencies$/i,
      /^expertise$/i,
      /^навички$/i,
      /^kenntnisse$/i,
    ]
  },
  {
    type: "languages",
    patterns: [
      /^languages?(\s+skills)?$/i,
      /^мови$/i,
      /^sprachen$/i,
    ]
  },
  {
    type: "certifications",
    patterns: [
      /^certifications?$/i,
      /^certificates?$/i,
      /^credentials?$/i,
      /^сертифікати$/i,
    ]
  },
  {
    type: "projects",
    patterns: [
      /^(personal\s+)?projects?$/i,
      /^проекти$/i,
    ]
  },
  {
    type: "interests",
    patterns: [
      /^interests?$/i,
      /^hobbies?$/i,
      /^інтереси$/i,
      /^хобі$/i,
    ]
  },
  {
    type: "contact",
    patterns: [
      /^contact(\s+info(rmation)?)?$/i,
      /^контакти$/i,
      /^kontakt$/i,
    ]
  },
];

// Detect section type from text
function detectSectionType(text: string): SectionType | null {
  const trimmed = text.trim();
  for (const section of SECTION_PATTERNS) {
    for (const pattern of section.patterns) {
      if (pattern.test(trimmed)) {
        return section.type;
      }
    }
  }
  return null;
}

// Check if text looks like a section header (short, possibly uppercase/bold)
function looksLikeSectionHeader(obj: CanvasTextObject): boolean {
  const text = obj.text?.trim() || "";
  if (text.length > 40) return false; // Headers are usually short
  if (text.includes("\n")) return false; // Headers are single line

  // Check for section patterns
  if (detectSectionType(text)) return true;

  // Check for uppercase with char spacing (common header style)
  if (obj.charSpacing && obj.charSpacing > 20 && text === text.toUpperCase()) {
    return true;
  }

  return false;
}

// Parse contact info from texts
function extractContactInfo(texts: string[]): Partial<ResumeData["personalInfo"]> {
  const info: Partial<ResumeData["personalInfo"]> = {};

  for (const text of texts) {
    const lower = text.toLowerCase();

    // Email
    const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch && !info.email) {
      info.email = emailMatch[0];
    }

    // Phone (various formats)
    const phoneMatch = text.match(/(\+?\d[\d\s().-]{8,})/);
    if (phoneMatch && !info.phone) {
      info.phone = phoneMatch[0].trim();
    }

    // LinkedIn
    if (lower.includes("linkedin.com") || lower.includes("linkedin:")) {
      info.linkedin = text.replace(/^linkedin:?\s*/i, "").trim();
    }

    // GitHub
    if (lower.includes("github.com") || lower.includes("github:")) {
      info.github = text.replace(/^github:?\s*/i, "").trim();
    }

    // Website (generic URL not linkedin/github)
    const urlMatch = text.match(/(?:https?:\/\/)?(?:www\.)?[\w.-]+\.[a-z]{2,}(?:\/\S*)?/i);
    if (urlMatch && !lower.includes("linkedin") && !lower.includes("github") && !info.website) {
      info.website = urlMatch[0];
    }

    // Location (city, country pattern)
    if (text.includes(",") && !text.includes("@") && !text.includes("http") && text.length < 50) {
      if (!info.location) {
        info.location = text;
      }
    }
  }

  return info;
}

// Group consecutive text objects that belong together
interface TextGroup {
  sectionType: SectionType;
  headerText?: string;
  objects: CanvasTextObject[];
}

function groupTextsBySections(textObjects: CanvasTextObject[]): TextGroup[] {
  const groups: TextGroup[] = [];
  let currentGroup: TextGroup = { sectionType: "header", objects: [] };

  for (const obj of textObjects) {
    const text = obj.text?.trim() || "";
    if (!text) continue;

    // Check if this is a section header
    const sectionType = detectSectionType(text);
    const isHeader = looksLikeSectionHeader(obj);

    console.log("[groupTexts] Text:", text.substring(0, 40), "| sectionType:", sectionType, "| isHeader:", isHeader);

    if (sectionType || isHeader) {
      // Save current group if it has content
      if (currentGroup.objects.length > 0) {
        groups.push(currentGroup);
      }
      // Start new group
      currentGroup = {
        sectionType: sectionType || "unknown",
        headerText: text,
        objects: [],
      };
    } else {
      // Add to current group
      currentGroup.objects.push(obj);
    }
  }

  // Don't forget the last group
  if (currentGroup.objects.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

// Parse experience entries from a group
function parseExperienceFromGroup(objects: CanvasTextObject[]): ExperienceEntry[] {
  const entries: ExperienceEntry[] = [];
  let current: Partial<ExperienceEntry> | null = null;

  for (const obj of objects) {
    const text = obj.text?.trim() || "";
    if (!text) continue;

    const isBold = obj.fontWeight === "bold" || obj.fontWeight === "700" || Number(obj.fontWeight) >= 600;
    const fontSize = obj.fontSize || 10;

    // Job title detection: bold text, not too long, no special chars like |
    if (isBold && fontSize >= 11 && text.length < 80 && !text.includes("|") && !text.startsWith("•")) {
      // Save previous entry
      if (current?.title) {
        if (!current.company) current.company = "";
        if (!current.startDate) current.startDate = "";
        if (!current.description) current.description = [];
        entries.push(current as ExperienceEntry);
      }

      // Handle "Title — Company" format
      const dashMatch = text.match(/^(.+?)\s*[—–-]\s*(.+)$/);
      if (dashMatch) {
        current = {
          title: dashMatch[1].trim(),
          company: dashMatch[2].trim(),
          startDate: "",
          description: [],
        };
      } else {
        current = {
          title: text,
          company: "",
          startDate: "",
          description: [],
        };
      }
    }
    // Company/date line: contains date patterns or |
    else if (current && (!current.company || !current.startDate)) {
      const dateMatch = text.match(/(\w+\.?\s*\d{4}|\d{4})\s*[-–—]\s*(\w+\.?\s*\d{4}|\d{4}|Present|Current|Now|Теперішній час|Зараз)/i);
      if (dateMatch || text.includes("|")) {
        const parts = text.split(/\s*\|\s*/);
        if (!current.company && parts[0]) {
          current.company = parts[0].trim();
        }
        if (dateMatch) {
          current.startDate = dateMatch[1];
          current.endDate = dateMatch[2];
          current.current = /present|current|now|теперішній|зараз/i.test(dateMatch[2]);
        }
        if (parts.length > 2) {
          current.location = parts[parts.length - 1].trim();
        }
      } else if (!current.company) {
        current.company = text;
      }
    }
    // Description: bullets or longer text
    else if (current) {
      const lines = text.split(/\n/).filter(Boolean);
      for (const line of lines) {
        const cleaned = line.replace(/^[•\-·]\s*/, "").trim();
        if (cleaned) {
          current.description = current.description || [];
          current.description.push(cleaned);
        }
      }
    }
  }

  // Don't forget last entry
  if (current?.title) {
    if (!current.company) current.company = "";
    if (!current.startDate) current.startDate = "";
    if (!current.description) current.description = [];
    entries.push(current as ExperienceEntry);
  }

  return entries;
}

// Parse education entries
function parseEducationFromGroup(objects: CanvasTextObject[]): EducationEntry[] {
  const entries: EducationEntry[] = [];
  let current: Partial<EducationEntry> | null = null;

  for (const obj of objects) {
    const text = obj.text?.trim() || "";
    if (!text) continue;

    const isBold = obj.fontWeight === "bold" || obj.fontWeight === "700" || Number(obj.fontWeight) >= 600;

    if (isBold && text.length < 100) {
      if (current?.degree) {
        if (!current.institution) current.institution = "";
        entries.push(current as EducationEntry);
      }
      current = { degree: text, institution: "" };
    } else if (current) {
      if (!current.institution) {
        const parts = text.split(/\s*\|\s*/);
        current.institution = parts[0].trim();

        const dateMatch = text.match(/(\d{4})\s*[-–—]\s*(\d{4}|Present)/i);
        if (dateMatch) {
          current.startDate = dateMatch[1];
          current.endDate = dateMatch[2];
        } else {
          const yearMatch = text.match(/\d{4}/);
          if (yearMatch) current.endDate = yearMatch[0];
        }
      } else if (!current.description) {
        current.description = text;
      }
    }
  }

  if (current?.degree) {
    if (!current.institution) current.institution = "";
    entries.push(current as EducationEntry);
  }

  return entries;
}

// Parse skills from group
function parseSkillsFromGroup(objects: CanvasTextObject[]): string[] {
  const skills: string[] = [];

  for (const obj of objects) {
    const text = obj.text?.trim() || "";
    if (!text) continue;

    // Split by common separators
    const items = text.split(/[•·,\n]/).map(s => s.trim()).filter(s => s && s.length < 50);
    skills.push(...items);
  }

  return [...new Set(skills)];
}

// Parse languages from group
function parseLanguagesFromGroup(objects: CanvasTextObject[]): LanguageEntry[] {
  const languages: LanguageEntry[] = [];

  for (const obj of objects) {
    const text = obj.text?.trim() || "";
    if (!text) continue;

    const items = text.split(/[•·,\n]/).filter(Boolean);
    for (const item of items) {
      // Match "Language - Level" or "Language (Level)"
      const match = item.match(/^(.+?)\s*[-–—(]\s*(.+?)\)?$/);
      if (match) {
        languages.push({
          language: match[1].trim(),
          level: match[2].trim().replace(/\)$/, ""),
        });
      }
    }
  }

  return languages;
}

// Parse certifications
function parseCertificationsFromGroup(objects: CanvasTextObject[]): CertificationEntry[] {
  const certs: CertificationEntry[] = [];

  for (const obj of objects) {
    const text = obj.text?.trim() || "";
    if (!text) continue;

    const lines = text.split(/\n/).filter(Boolean);
    for (const line of lines) {
      const parts = line.split(/\s*[-–—]\s*/);
      certs.push({
        name: parts[0]?.trim() || line,
        issuer: parts[1]?.trim() || null,
        date: parts[2]?.trim() || null,
      });
    }
  }

  return certs;
}

// Parse projects
function parseProjectsFromGroup(objects: CanvasTextObject[]): ProjectEntry[] {
  const projects: ProjectEntry[] = [];
  let current: Partial<ProjectEntry> | null = null;

  for (const obj of objects) {
    const text = obj.text?.trim() || "";
    if (!text) continue;

    const isBold = obj.fontWeight === "bold" || obj.fontWeight === "700" || Number(obj.fontWeight) >= 600;

    if (isBold && text.length < 60) {
      if (current?.name) {
        projects.push(current as ProjectEntry);
      }
      current = { name: text, description: "" };
    } else if (current) {
      if (!current.description) {
        current.description = text;
      }
    }
  }

  if (current?.name) {
    if (!current.description) current.description = "";
    projects.push(current as ProjectEntry);
  }

  return projects;
}

// Parse interests
function parseInterestsFromGroup(objects: CanvasTextObject[]): string[] {
  const interests: string[] = [];

  for (const obj of objects) {
    const text = obj.text?.trim() || "";
    if (!text) continue;

    const items = text.split(/[•·,\n]/).map(s => s.trim()).filter(s => s && s.length < 50);
    interests.push(...items);
  }

  return [...new Set(interests)];
}

// Get all text as single string (for summary)
function getTextFromGroup(objects: CanvasTextObject[]): string {
  return objects.map(o => o.text?.trim()).filter(Boolean).join(" ");
}

/**
 * Extract ResumeData from canvas JSON
 */
export function extractResumeDataFromCanvas(canvasJSON: CanvasJSON | string): ResumeData {
  const data: CanvasJSON = typeof canvasJSON === "string" ? JSON.parse(canvasJSON) : canvasJSON;

  // Get all text objects sorted by position
  const textObjects = (data.objects || [])
    .filter(obj => {
      const type = obj.type?.toLowerCase();
      return type === "textbox" || type === "i-text" || type === "itext" || type === "text";
    })
    .sort((a, b) => (a.top || 0) - (b.top || 0)) as CanvasTextObject[];

  console.log("[extractResumeData] Text objects count:", textObjects.length);

  if (textObjects.length === 0) {
    return {
      personalInfo: { fullName: "" },
      experience: [],
      education: [],
      skills: [],
      styling: {} as ResumeStyle,
    };
  }

  // Find name: largest font at the top
  const topTexts = textObjects.filter(obj => (obj.top || 0) < 200);
  let nameObj = topTexts[0];
  for (const obj of topTexts) {
    if ((obj.fontSize || 0) > (nameObj?.fontSize || 0)) {
      nameObj = obj;
    }
  }

  const fullName = nameObj?.text?.trim() || "";
  console.log("[extractResumeData] Found name:", fullName);

  // Find title: second text near name, smaller font
  const titleObj = topTexts.find(obj =>
    obj !== nameObj &&
    (obj.top || 0) > (nameObj?.top || 0) &&
    (obj.fontSize || 0) >= 10 &&
    (obj.fontSize || 0) < (nameObj?.fontSize || 100)
  );
  const title = titleObj?.text?.trim() || null;

  // Group texts by sections
  const groups = groupTextsBySections(textObjects);
  console.log("[extractResumeData] Found sections:", groups.map(g => g.sectionType));

  // Initialize result
  const result: ResumeData = {
    personalInfo: {
      fullName,
      title,
    },
    experience: [],
    education: [],
    skills: [],
    styling: {} as ResumeStyle,
  };

  // Process each group
  for (const group of groups) {
    const texts = group.objects.map(o => o.text || "").filter(Boolean);

    switch (group.sectionType) {
      case "header":
      case "contact":
        const contactInfo = extractContactInfo(texts);
        Object.assign(result.personalInfo, contactInfo);
        break;

      case "summary":
        result.summary = getTextFromGroup(group.objects);
        break;

      case "experience":
        result.experience = parseExperienceFromGroup(group.objects);
        break;

      case "education":
        result.education = parseEducationFromGroup(group.objects);
        break;

      case "skills":
        result.skills = parseSkillsFromGroup(group.objects);
        break;

      case "languages":
        result.languages = parseLanguagesFromGroup(group.objects);
        break;

      case "certifications":
        result.certifications = parseCertificationsFromGroup(group.objects);
        break;

      case "projects":
        result.projects = parseProjectsFromGroup(group.objects);
        break;

      case "interests":
        result.interests = parseInterestsFromGroup(group.objects);
        break;

      case "unknown":
        // Try to detect what it might be based on content
        const allText = texts.join(" ").toLowerCase();
        if (allText.includes("@") || allText.includes("phone") || allText.includes("linkedin")) {
          const contactInfo = extractContactInfo(texts);
          Object.assign(result.personalInfo, contactInfo);
        }
        break;
    }
  }

  console.log("[extractResumeData] Result:", {
    fullName: result.personalInfo.fullName,
    title: result.personalInfo.title,
    experienceCount: result.experience.length,
    educationCount: result.education.length,
    skillsCount: result.skills.length,
    hasLanguages: !!result.languages?.length,
    hasCertifications: !!result.certifications?.length,
    hasProjects: !!result.projects?.length,
    hasSummary: !!result.summary,
  });

  return result;
}

/**
 * Merge extracted data with template styling
 */
export function mergeWithTemplateStyle(
  extractedData: ResumeData,
  templateStyling: ResumeStyle
): ResumeData {
  return {
    ...extractedData,
    styling: templateStyling,
  };
}
