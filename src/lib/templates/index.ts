// Resume templates - Uses shared schema for consistency with AI generation
// When schema updates, templates automatically use the new structure

import {
  ResumeData,
  ResumeStyle,
  createStyle,
  SAMPLE_DATA,
  COLOR_PALETTES,
  FONT_COMBINATIONS,
  FONT_SIZE_PRESETS,
  LAYOUT_PRESETS,
  A4_WIDTH,
  A4_HEIGHT,
} from "./schema";
import { renderResumeToCanvas, toFabricJSON } from "./renderer";

// Template definition interface
export interface TemplateDefinition {
  id: string;
  name: string;
  nameUk: string;
  description: string;
  descriptionUk: string;
  region: "US" | "EU" | "UA" | "INTL";
  category: "professional" | "creative" | "academic" | "minimal" | "modern" | "executive";
  isPremium: boolean;
  thumbnail: string;
  // Template uses ResumeData schema - same as AI generation
  resumeData: ResumeData;
}

// Helper to deep clone sample data
function cloneSampleData(sample: (typeof SAMPLE_DATA)[keyof typeof SAMPLE_DATA]): Omit<ResumeData, "styling"> {
  return JSON.parse(JSON.stringify(sample)) as Omit<ResumeData, "styling">;
}

// Helper to create template with sample data
function createTemplate(
  id: string,
  name: string,
  nameUk: string,
  description: string,
  descriptionUk: string,
  region: TemplateDefinition["region"],
  category: TemplateDefinition["category"],
  isPremium: boolean,
  style: ResumeStyle,
  sampleDataKey: keyof typeof SAMPLE_DATA = "en"
): TemplateDefinition {
  const sample = cloneSampleData(SAMPLE_DATA[sampleDataKey]);
  return {
    id,
    name,
    nameUk,
    description,
    descriptionUk,
    region,
    category,
    isPremium,
    thumbnail: `/templates/${id}.svg`,
    resumeData: {
      ...sample,
      styling: style,
    },
  };
}

// ============================================
// TEMPLATE DEFINITIONS
// ============================================

// 1. US Modern Professional - Clean, ATS-friendly
export const usModernTemplate = createTemplate(
  "us-modern",
  "Modern Professional",
  "Сучасний професійний",
  "Clean, ATS-friendly template for US job market",
  "Чистий, ATS-дружній шаблон для ринку США",
  "US",
  "professional",
  false,
  createStyle("single-column", "navyProfessional", "professional", "standard", "standard")
);

// 2. EU Classic - Europass-inspired with sidebar
export const euClassicTemplate = createTemplate(
  "eu-classic",
  "European Classic",
  "Європейський класичний",
  "Europass-inspired template for EU job market",
  "Шаблон у стилі Europass для ринку ЄС",
  "EU",
  "professional",
  false,
  {
    ...createStyle("sidebar-left", "blueClassic", "professional", "standard", "sidebar"),
    layout: { ...LAYOUT_PRESETS.sidebar, sidebarWidth: 180 },
  },
  "de"
);

// 3. Ukrainian Professional - Formal with accent
export const uaProfessionalTemplate = createTemplate(
  "ua-professional",
  "Ukrainian Professional",
  "Український професійний",
  "Professional template for Ukrainian job market",
  "Професійний шаблон для українського ринку праці",
  "UA",
  "professional",
  false,
  createStyle("single-column", "ukrainianBlue", "professional", "standard", "standard"),
  "uk"
);

// 4. Minimal Creative - Clean design for creatives
export const minimalCreativeTemplate = createTemplate(
  "minimal-creative",
  "Minimal Creative",
  "Мінімалістичний креативний",
  "Clean minimal design for creative professionals",
  "Чистий мінімалістичний дизайн для креативних професіоналів",
  "INTL",
  "creative",
  false,
  createStyle("minimal", "warmCreative", "creative", "spacious", "spacious")
);

// 5. Tech Dark - Modern dark theme for tech professionals
export const techDarkTemplate = createTemplate(
  "tech-dark",
  "Tech Dark",
  "Темна технічна",
  "Modern dark theme perfect for tech professionals",
  "Сучасна темна тема для IT спеціалістів",
  "US",
  "modern",
  false,
  createStyle("single-column", "darkTech", "technical", "standard", "standard")
);

// 6. Teal Modern - Fresh modern look
export const tealModernTemplate = createTemplate(
  "teal-modern",
  "Teal Modern",
  "Бірюзова сучасна",
  "Fresh modern design with teal accents",
  "Свіжий сучасний дизайн з бірюзовими акцентами",
  "INTL",
  "modern",
  false,
  createStyle("sidebar-left", "tealModern", "modern", "standard", "sidebar")
);

// 7. Executive - Professional for senior roles
export const executiveTemplate = createTemplate(
  "executive",
  "Executive",
  "Керівний",
  "Premium design for executive and senior positions",
  "Преміум дизайн для керівних та старших позицій",
  "US",
  "executive",
  true,
  createStyle("modern-split", "charcoalClean", "classic", "spacious", "spacious")
);

// 8. Rose Elegant - Soft elegant design
export const roseElegantTemplate = createTemplate(
  "rose-elegant",
  "Rose Elegant",
  "Рожева елегантна",
  "Soft elegant design perfect for HR and marketing",
  "М'який елегантний дизайн для HR та маркетингу",
  "INTL",
  "creative",
  false,
  createStyle("minimal", "roseElegant", "creative", "spacious", "spacious")
);

// 9. Academic Classic - For researchers and educators
export const academicClassicTemplate = createTemplate(
  "academic-classic",
  "Academic Classic",
  "Академічна класична",
  "Traditional design for academia and research",
  "Традиційний дизайн для академічної сфери",
  "INTL",
  "academic",
  false,
  createStyle("single-column", "slateMinimal", "formal", "compact", "compact")
);

// 10. Startup Bold - Bold design for startups
export const startupBoldTemplate = createTemplate(
  "startup-bold",
  "Startup Bold",
  "Стартап сміливий",
  "Bold energetic design for startup environment",
  "Сміливий енергійний дизайн для стартап середовища",
  "US",
  "modern",
  true,
  createStyle("modern-split", "orangeEnergy", "modern", "standard", "standard")
);

// 11. Forest Professional - Nature-inspired professional
export const forestProfessionalTemplate = createTemplate(
  "forest-professional",
  "Forest Professional",
  "Лісова професійна",
  "Nature-inspired professional design",
  "Професійний дизайн натхненний природою",
  "INTL",
  "professional",
  false,
  createStyle("sidebar-left", "greenForest", "professional", "standard", "sidebar")
);

// 12. Purple Tech - Creative tech design
export const purpleTechTemplate = createTemplate(
  "purple-tech",
  "Purple Tech",
  "Фіолетова технічна",
  "Creative design for tech and design roles",
  "Креативний дизайн для техн. та дизайн позицій",
  "US",
  "creative",
  true,
  createStyle("minimal", "purpleTech", "creative", "standard", "standard")
);

// 13. Mint Fresh - Light refreshing design
export const mintFreshTemplate = createTemplate(
  "mint-fresh",
  "Mint Fresh",
  "М'ятна свіжа",
  "Light refreshing design for any industry",
  "Легкий освіжаючий дизайн для будь-якої галузі",
  "INTL",
  "minimal",
  false,
  createStyle("single-column", "mintFresh", "modern", "standard", "standard")
);

// 14. Red Bold - Strong impactful design
export const redBoldTemplate = createTemplate(
  "red-bold",
  "Red Bold",
  "Червона сміла",
  "Strong impactful design for sales and leadership",
  "Сильний вражаючий дизайн для продажів та лідерства",
  "US",
  "executive",
  true,
  createStyle("modern-split", "redBold", "professional", "bold", "standard")
);

// 15. UA Modern - Modern Ukrainian style
export const uaModernTemplate = createTemplate(
  "ua-modern",
  "Ukrainian Modern",
  "Українська сучасна",
  "Modern design for Ukrainian IT market",
  "Сучасний дизайн для українського IT ринку",
  "UA",
  "modern",
  false,
  createStyle("sidebar-left", "ukrainianBlue", "modern", "standard", "sidebar"),
  "uk"
);

// 16. EU Compact - Space-efficient European style
export const euCompactTemplate = createTemplate(
  "eu-compact",
  "EU Compact",
  "Компактна європейська",
  "Space-efficient design for detailed CVs",
  "Компактний дизайн для детальних резюме",
  "EU",
  "professional",
  false,
  createStyle("single-column", "blueClassic", "professional", "compact", "compact"),
  "de"
);

// ============================================
// EXPORTS
// ============================================

// All templates array
export const templates: TemplateDefinition[] = [
  usModernTemplate,
  euClassicTemplate,
  uaProfessionalTemplate,
  minimalCreativeTemplate,
  techDarkTemplate,
  tealModernTemplate,
  executiveTemplate,
  roseElegantTemplate,
  academicClassicTemplate,
  startupBoldTemplate,
  forestProfessionalTemplate,
  purpleTechTemplate,
  mintFreshTemplate,
  redBoldTemplate,
  uaModernTemplate,
  euCompactTemplate,
];

// Get template by ID
export function getTemplateById(id: string): TemplateDefinition | undefined {
  return templates.find((t) => t.id === id);
}

// Get templates by region
export function getTemplatesByRegion(region: TemplateDefinition["region"]): TemplateDefinition[] {
  return templates.filter((t) => t.region === region || t.region === "INTL");
}

// Get templates by category
export function getTemplatesByCategory(category: TemplateDefinition["category"]): TemplateDefinition[] {
  return templates.filter((t) => t.category === category);
}

// Get free templates only
export function getFreeTemplates(): TemplateDefinition[] {
  return templates.filter((t) => !t.isPremium);
}

// Get premium templates only
export function getPremiumTemplates(): TemplateDefinition[] {
  return templates.filter((t) => t.isPremium);
}

// Convert template to canvas data (Fabric.js JSON)
export function getTemplateCanvasData(template: TemplateDefinition): object {
  const renderResult = renderResumeToCanvas(template.resumeData);
  return toFabricJSON(renderResult);
}

// Render custom resume data with template styling (preserves user content)
// If user data is missing sections, fill them from template sample data
export function renderWithTemplateStyle(
  userData: ResumeData,
  template: TemplateDefinition
): object {
  const templateData = template.resumeData;

  // Merge user data with template styling
  // Fill empty sections from template sample data
  const mergedData: ResumeData = {
    personalInfo: {
      fullName: userData.personalInfo.fullName || templateData.personalInfo.fullName,
      title: userData.personalInfo.title || templateData.personalInfo.title,
      email: userData.personalInfo.email || templateData.personalInfo.email,
      phone: userData.personalInfo.phone || templateData.personalInfo.phone,
      location: userData.personalInfo.location || templateData.personalInfo.location,
      linkedin: userData.personalInfo.linkedin || templateData.personalInfo.linkedin,
      website: userData.personalInfo.website || templateData.personalInfo.website,
      github: userData.personalInfo.github || templateData.personalInfo.github,
    },
    summary: userData.summary || templateData.summary,
    experience: userData.experience.length > 0 ? userData.experience : templateData.experience,
    education: userData.education.length > 0 ? userData.education : templateData.education,
    skills: userData.skills.length > 0 ? userData.skills : templateData.skills,
    languages: (userData.languages?.length ?? 0) > 0 ? userData.languages : templateData.languages,
    certifications: (userData.certifications?.length ?? 0) > 0 ? userData.certifications : templateData.certifications,
    projects: (userData.projects?.length ?? 0) > 0 ? userData.projects : templateData.projects,
    interests: (userData.interests?.length ?? 0) > 0 ? userData.interests : templateData.interests,
    styling: templateData.styling,
  };

  console.log("[renderWithTemplateStyle] Merged data:", {
    fullName: mergedData.personalInfo.fullName,
    experienceCount: mergedData.experience.length,
    educationCount: mergedData.education.length,
    skillsCount: mergedData.skills.length,
  });

  const renderResult = renderResumeToCanvas(mergedData);
  return toFabricJSON(renderResult);
}

// Get just the styling from a template
export function getTemplateStyling(template: TemplateDefinition): ResumeStyle {
  return template.resumeData.styling;
}

// Get canvas data directly by template ID
export function getCanvasDataById(id: string): object | null {
  const template = getTemplateById(id);
  if (!template) return null;
  return getTemplateCanvasData(template);
}

// Add canvasData property to all templates for backwards compatibility
// Using direct reference instead of 'this' to ensure correct template context
function addCanvasDataProperty(template: TemplateDefinition) {
  Object.defineProperty(template, "canvasData", {
    get() {
      return getTemplateCanvasData(template);
    },
    enumerable: true, // Make sure it's included in JSON serialization
  });
}

templates.forEach(addCanvasDataProperty);

// Re-export schema types and renderer for external use
export type { ResumeData, ResumeStyle } from "./schema";
export {
  createStyle,
  COLOR_PALETTES,
  FONT_COMBINATIONS,
  FONT_SIZE_PRESETS,
  LAYOUT_PRESETS,
  SAMPLE_DATA,
  A4_WIDTH,
  A4_HEIGHT,
} from "./schema";

export { renderResumeToCanvas, toFabricJSON } from "./renderer";
