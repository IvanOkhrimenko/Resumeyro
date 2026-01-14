// Shared Resume Schema - used by both AI generation and templates
// When updating this schema, both AI-generated resumes and templates will automatically use the new structure

// A4 dimensions at 96 DPI
export const A4_WIDTH = 595;
export const A4_HEIGHT = 842;
export const MARGIN = 40;
export const CONTENT_WIDTH = A4_WIDTH - MARGIN * 2;

// Layout types
export type LayoutType =
  | "single-column"      // Simple single column with header band
  | "sidebar-left"       // Colored sidebar on left
  | "sidebar-right"      // Colored sidebar on right
  | "header-two-column"  // Header at top, two columns below
  | "minimal"            // Clean minimal design
  | "modern-split";      // Modern split layout

// Color scheme
export interface ColorScheme {
  primary: string;       // Header/sidebar background
  secondary: string;     // Subtle text, borders
  text: string;          // Main text color
  textLight: string;     // Descriptions, secondary text
  accent: string;        // Section headers, highlights
  background: string;    // Page background
  headerText: string;    // Text on header/sidebar
  sidebarText?: string;  // Text in sidebar (if different from headerText)
}

// Font configuration
export interface FontConfig {
  heading: string;       // Font for headings
  body: string;          // Font for body text
}

// Font sizes
export interface FontSizes {
  name: number;          // 20-36
  title: number;         // 12-18
  sectionHeader: number; // 10-14
  jobTitle: number;      // 10-14
  body: number;          // 9-12
  small: number;         // 8-10
}

// Layout configuration
export interface LayoutConfig {
  headerHeight: number;     // 60-150
  sidebarWidth?: number;    // For sidebar layouts (140-200)
  sectionSpacing: number;   // 15-30
  lineHeight: number;       // 1.2-1.8
  itemSpacing: number;      // 8-15
}

// Complete styling configuration
export interface ResumeStyle {
  layoutType: LayoutType;
  colors: ColorScheme;
  fonts: FontConfig;
  fontSizes: FontSizes;
  layout: LayoutConfig;
}

// Personal information
export interface PersonalInfo {
  fullName: string;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  linkedin?: string | null;
  website?: string | null;
  github?: string | null;
  photo?: boolean; // Whether to show photo placeholder
}

// Work experience entry
export interface ExperienceEntry {
  title: string;
  company: string;
  location?: string | null;
  startDate: string;
  endDate?: string | null;
  current?: boolean;
  description: string[];
}

// Education entry
export interface EducationEntry {
  degree: string;
  institution: string;
  location?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  description?: string | null;
  gpa?: string | null;
}

// Language entry
export interface LanguageEntry {
  language: string;
  level: string;
}

// Certification entry
export interface CertificationEntry {
  name: string;
  issuer?: string | null;
  date?: string | null;
}

// Project entry
export interface ProjectEntry {
  name: string;
  description: string;
  technologies?: string[];
  url?: string | null;
}

// Complete resume data structure
export interface ResumeData {
  personalInfo: PersonalInfo;
  summary?: string | null;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: string[];
  languages?: LanguageEntry[];
  certifications?: CertificationEntry[];
  projects?: ProjectEntry[];
  interests?: string[];
  styling: ResumeStyle;
}

// Predefined color palettes
export const COLOR_PALETTES = {
  // Professional & Corporate
  navyProfessional: {
    primary: "#1a1a2e",
    secondary: "#64748b",
    text: "#334155",
    textLight: "#475569",
    accent: "#1a1a2e",
    background: "#ffffff",
    headerText: "#ffffff",
  },
  blueClassic: {
    primary: "#0f4c81",
    secondary: "#64748b",
    text: "#334155",
    textLight: "#475569",
    accent: "#0f4c81",
    background: "#ffffff",
    headerText: "#ffffff",
    sidebarText: "#b8d4e8",
  },
  ukrainianBlue: {
    primary: "#0057b8",
    secondary: "#64748b",
    text: "#1e293b",
    textLight: "#475569",
    accent: "#0057b8",
    background: "#ffffff",
    headerText: "#ffffff",
  },

  // Modern & Tech
  darkTech: {
    primary: "#0f172a",
    secondary: "#64748b",
    text: "#1e293b",
    textLight: "#475569",
    accent: "#3b82f6",
    background: "#ffffff",
    headerText: "#f1f5f9",
  },
  tealModern: {
    primary: "#134e4a",
    secondary: "#5eead4",
    text: "#1e293b",
    textLight: "#475569",
    accent: "#14b8a6",
    background: "#ffffff",
    headerText: "#ccfbf1",
  },
  purpleTech: {
    primary: "#581c87",
    secondary: "#a855f7",
    text: "#1e293b",
    textLight: "#6b7280",
    accent: "#9333ea",
    background: "#ffffff",
    headerText: "#f3e8ff",
  },

  // Creative & Design
  warmCreative: {
    primary: "#fef3c7",
    secondary: "#9ca3af",
    text: "#1f2937",
    textLight: "#6b7280",
    accent: "#f59e0b",
    background: "#ffffff",
    headerText: "#1f2937",
  },
  roseElegant: {
    primary: "#fce7f3",
    secondary: "#f9a8d4",
    text: "#1f2937",
    textLight: "#6b7280",
    accent: "#ec4899",
    background: "#ffffff",
    headerText: "#831843",
  },
  mintFresh: {
    primary: "#d1fae5",
    secondary: "#6ee7b7",
    text: "#1f2937",
    textLight: "#6b7280",
    accent: "#10b981",
    background: "#ffffff",
    headerText: "#065f46",
  },

  // Minimal & Clean
  slateMinimal: {
    primary: "#f8fafc",
    secondary: "#cbd5e1",
    text: "#1e293b",
    textLight: "#64748b",
    accent: "#475569",
    background: "#ffffff",
    headerText: "#1e293b",
  },
  charcoalClean: {
    primary: "#374151",
    secondary: "#9ca3af",
    text: "#1f2937",
    textLight: "#6b7280",
    accent: "#374151",
    background: "#ffffff",
    headerText: "#f9fafb",
  },

  // Bold & Vibrant
  redBold: {
    primary: "#991b1b",
    secondary: "#fca5a5",
    text: "#1f2937",
    textLight: "#6b7280",
    accent: "#dc2626",
    background: "#ffffff",
    headerText: "#fef2f2",
  },
  greenForest: {
    primary: "#14532d",
    secondary: "#86efac",
    text: "#1e293b",
    textLight: "#6b7280",
    accent: "#22c55e",
    background: "#ffffff",
    headerText: "#dcfce7",
  },
  orangeEnergy: {
    primary: "#c2410c",
    secondary: "#fdba74",
    text: "#1f2937",
    textLight: "#6b7280",
    accent: "#f97316",
    background: "#ffffff",
    headerText: "#fff7ed",
  },
} as const;

// Predefined font combinations
export const FONT_COMBINATIONS = {
  professional: {
    heading: "Arial, sans-serif",
    body: "Arial, sans-serif",
  },
  classic: {
    heading: "Georgia, serif",
    body: "Georgia, serif",
  },
  modern: {
    heading: "Verdana, sans-serif",
    body: "Verdana, sans-serif",
  },
  formal: {
    heading: "Times New Roman, serif",
    body: "Times New Roman, serif",
  },
  technical: {
    heading: "Trebuchet MS, sans-serif",
    body: "Arial, sans-serif",
  },
  creative: {
    heading: "Trebuchet MS, sans-serif",
    body: "Verdana, sans-serif",
  },
} as const;

// Default font sizes for different styles
export const FONT_SIZE_PRESETS = {
  compact: {
    name: 24,
    title: 12,
    sectionHeader: 10,
    jobTitle: 11,
    body: 9,
    small: 8,
  },
  standard: {
    name: 28,
    title: 14,
    sectionHeader: 11,
    jobTitle: 12,
    body: 10,
    small: 9,
  },
  spacious: {
    name: 32,
    title: 16,
    sectionHeader: 12,
    jobTitle: 13,
    body: 11,
    small: 10,
  },
  bold: {
    name: 36,
    title: 18,
    sectionHeader: 13,
    jobTitle: 14,
    body: 11,
    small: 9,
  },
} as const;

// Layout presets
export const LAYOUT_PRESETS = {
  compact: {
    headerHeight: 80,
    sectionSpacing: 18,
    lineHeight: 1.3,
    itemSpacing: 8,
  },
  standard: {
    headerHeight: 100,
    sectionSpacing: 22,
    lineHeight: 1.4,
    itemSpacing: 12,
  },
  spacious: {
    headerHeight: 120,
    sectionSpacing: 28,
    lineHeight: 1.5,
    itemSpacing: 15,
  },
  sidebar: {
    headerHeight: 0,
    sidebarWidth: 180,
    sectionSpacing: 20,
    lineHeight: 1.4,
    itemSpacing: 10,
  },
} as const;

// Helper to create a complete style from presets
export function createStyle(
  layoutType: LayoutType,
  colorPalette: keyof typeof COLOR_PALETTES,
  fontCombo: keyof typeof FONT_COMBINATIONS = "professional",
  fontSizePreset: keyof typeof FONT_SIZE_PRESETS = "standard",
  layoutPreset: keyof typeof LAYOUT_PRESETS = "standard"
): ResumeStyle {
  return {
    layoutType,
    colors: COLOR_PALETTES[colorPalette],
    fonts: FONT_COMBINATIONS[fontCombo],
    fontSizes: FONT_SIZE_PRESETS[fontSizePreset],
    layout: LAYOUT_PRESETS[layoutPreset],
  };
}

// Sample data for templates
export const SAMPLE_DATA = {
  en: {
    personalInfo: {
      fullName: "John Smith",
      title: "Senior Software Engineer",
      email: "john.smith@email.com",
      phone: "+1 (555) 123-4567",
      location: "San Francisco, CA",
      linkedin: "linkedin.com/in/johnsmith",
      website: "johnsmith.dev",
    },
    summary: "Results-driven software engineer with 8+ years of experience developing scalable web applications. Proven track record of leading cross-functional teams and delivering projects that increased revenue by 40%.",
    experience: [
      {
        title: "Senior Software Engineer",
        company: "Tech Company Inc.",
        location: "San Francisco, CA",
        startDate: "Jan 2020",
        endDate: null,
        current: true,
        description: [
          "Led development of microservices architecture serving 2M+ daily users",
          "Reduced API response time by 60% through optimization",
          "Mentored team of 5 junior developers",
        ],
      },
      {
        title: "Software Engineer",
        company: "Startup Co.",
        location: "New York, NY",
        startDate: "Jun 2017",
        endDate: "Dec 2019",
        current: false,
        description: [
          "Built real-time data processing pipeline handling 100K events/second",
          "Implemented CI/CD pipelines reducing deployment time by 50%",
        ],
      },
    ],
    education: [
      {
        degree: "Bachelor of Science in Computer Science",
        institution: "University of Technology",
        location: "Boston, MA",
        startDate: "2013",
        endDate: "2017",
      },
    ],
    skills: ["JavaScript", "TypeScript", "React", "Node.js", "Python", "AWS", "Docker", "PostgreSQL", "Git", "Agile"],
    languages: [
      { language: "English", level: "Native" },
      { language: "Spanish", level: "Intermediate" },
    ],
  },
  uk: {
    personalInfo: {
      fullName: "Іван Петренко",
      title: "Senior Frontend Developer",
      email: "ivan.petrenko@email.com",
      phone: "+380 67 123 4567",
      location: "Київ, Україна",
      linkedin: "linkedin.com/in/ivanpetrenko",
      github: "github.com/ivanpetrenko",
    },
    summary: "Досвідчений Frontend розробник з 6+ роками досвіду у створенні сучасних веб-додатків. Спеціалізуюся на React та TypeScript. Маю досвід роботи в міжнародних командах та успішного delivery проектів для Fortune 500 компаній.",
    experience: [
      {
        title: "Senior Frontend Developer",
        company: "IT Solutions",
        location: "Київ",
        startDate: "Січень 2021",
        endDate: null,
        current: true,
        description: [
          "Розробка та підтримка enterprise веб-додатків на React",
          "Впровадження TypeScript, що зменшило кількість багів на 40%",
          "Менторство junior та middle розробників",
        ],
      },
      {
        title: "Frontend Developer",
        company: "Tech Startup",
        location: "Львів",
        startDate: "Березень 2018",
        endDate: "Грудень 2020",
        current: false,
        description: [
          "Створення SPA додатків з нуля",
          "Оптимізація продуктивності та SEO",
        ],
      },
    ],
    education: [
      {
        degree: "Магістр комп'ютерних наук",
        institution: "Київський політехнічний інститут",
        location: "Київ",
        startDate: "2014",
        endDate: "2020",
      },
    ],
    skills: ["JavaScript", "TypeScript", "React", "Next.js", "Node.js", "PostgreSQL", "Git", "Docker", "AWS"],
    languages: [
      { language: "Українська", level: "Рідна" },
      { language: "Англійська", level: "Upper-Intermediate" },
      { language: "Польська", level: "Базовий" },
    ],
  },
  de: {
    personalInfo: {
      fullName: "Max Müller",
      title: "Software Entwickler",
      email: "max.mueller@email.de",
      phone: "+49 123 456 7890",
      location: "Berlin, Deutschland",
      linkedin: "linkedin.com/in/maxmueller",
      photo: true,
    },
    summary: "Engagierter Software-Entwickler mit Expertise in Full-Stack-Entwicklung. Leidenschaftlich daran interessiert, effiziente und benutzerfreundliche Anwendungen zu erstellen.",
    experience: [
      {
        title: "Software Entwickler",
        company: "Tech GmbH",
        location: "Berlin",
        startDate: "2019",
        endDate: null,
        current: true,
        description: [
          "Entwicklung und Wartung von Enterprise-Webanwendungen",
          "Zusammenarbeit mit internationalen Teams",
          "Implementierung von CI/CD-Pipelines",
        ],
      },
    ],
    education: [
      {
        degree: "Master of Science in Informatik",
        institution: "Technische Universität Berlin",
        location: "Berlin",
        startDate: "2017",
        endDate: "2019",
      },
    ],
    skills: ["React", "Vue.js", "Node.js", "Python", "Java", "PostgreSQL", "MongoDB", "AWS", "Docker", "Kubernetes"],
    languages: [
      { language: "Deutsch", level: "Muttersprache" },
      { language: "Englisch", level: "Fließend" },
      { language: "Französisch", level: "Grundkenntnisse" },
    ],
  },
};
