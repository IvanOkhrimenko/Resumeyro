// Semantic Types for Resume Elements
// Each element on canvas has a semantic type that defines what data it represents
// This enables reliable template switching and data extraction

// ============================================
// SEMANTIC TYPE DEFINITIONS
// ============================================

/**
 * All possible semantic types for resume elements
 */
export type SemanticType =
  // ─────────────────────────────────────
  // PERSONAL INFO / HEADER
  // ─────────────────────────────────────
  | "name"                    // Full name
  | "first_name"              // First name only
  | "last_name"               // Last name only
  | "title"                   // Professional title / Job title
  | "photo"                   // Profile photo placeholder

  // ─────────────────────────────────────
  // CONTACT INFORMATION
  // ─────────────────────────────────────
  | "email"                   // Email address
  | "phone"                   // Phone number
  | "location"                // City, Country / Address
  | "address"                 // Full address
  | "linkedin"                // LinkedIn URL/username
  | "github"                  // GitHub URL/username
  | "website"                 // Personal website
  | "portfolio"               // Portfolio URL
  | "twitter"                 // Twitter/X handle
  | "instagram"               // Instagram handle
  | "facebook"                // Facebook profile
  | "youtube"                 // YouTube channel
  | "dribbble"                // Dribbble profile
  | "behance"                 // Behance profile
  | "medium"                  // Medium profile
  | "stackoverflow"           // Stack Overflow profile
  | "skype"                   // Skype ID
  | "telegram"                // Telegram username
  | "whatsapp"                // WhatsApp number
  | "discord"                 // Discord username
  | "custom_link"             // Any other link

  // ─────────────────────────────────────
  // SUMMARY / OBJECTIVE
  // ─────────────────────────────────────
  | "summary"                 // Professional summary / About me
  | "objective"               // Career objective
  | "headline"                // Short headline / tagline

  // ─────────────────────────────────────
  // WORK EXPERIENCE
  // ─────────────────────────────────────
  | "experience_section"      // Section header "Experience"
  | "experience_title"        // Job title
  | "experience_company"      // Company name
  | "experience_location"     // Job location
  | "experience_start_date"   // Start date
  | "experience_end_date"     // End date
  | "experience_dates"        // Combined dates (Jan 2020 - Present)
  | "experience_description"  // Job description / responsibilities
  | "experience_achievements" // Key achievements (bulleted)
  | "experience_technologies" // Technologies used

  // ─────────────────────────────────────
  // EDUCATION
  // ─────────────────────────────────────
  | "education_section"       // Section header "Education"
  | "education_degree"        // Degree name (Bachelor of Science)
  | "education_field"         // Field of study (Computer Science)
  | "education_institution"   // University / School name
  | "education_location"      // Institution location
  | "education_start_date"    // Start date
  | "education_end_date"      // End date / Expected graduation
  | "education_dates"         // Combined dates
  | "education_gpa"           // GPA / Grade
  | "education_honors"        // Honors / Distinctions
  | "education_description"   // Additional info, coursework
  | "education_thesis"        // Thesis title

  // ─────────────────────────────────────
  // SKILLS
  // ─────────────────────────────────────
  | "skills_section"          // Section header "Skills"
  | "skill"                   // Single skill
  | "skill_category"          // Skill category header (e.g., "Programming")
  | "skill_list"              // List of skills (comma/bullet separated)
  | "skill_level"             // Skill proficiency level
  | "technical_skills"        // Technical skills group
  | "soft_skills"             // Soft skills group
  | "tools"                   // Tools & Software
  | "frameworks"              // Frameworks
  | "programming_languages"   // Programming languages

  // ─────────────────────────────────────
  // LANGUAGES
  // ─────────────────────────────────────
  | "languages_section"       // Section header "Languages"
  | "language"                // Language name
  | "language_level"          // Proficiency level (Native, Fluent, B2)
  | "language_entry"          // Combined: "English - Native"

  // ─────────────────────────────────────
  // CERTIFICATIONS
  // ─────────────────────────────────────
  | "certifications_section"  // Section header
  | "certification_name"      // Certificate name
  | "certification_issuer"    // Issuing organization
  | "certification_date"      // Date obtained
  | "certification_expiry"    // Expiration date
  | "certification_id"        // Certificate ID / Credential ID
  | "certification_url"       // Verification URL

  // ─────────────────────────────────────
  // PROJECTS
  // ─────────────────────────────────────
  | "projects_section"        // Section header
  | "project_name"            // Project name
  | "project_role"            // Your role in the project
  | "project_description"     // Project description
  | "project_technologies"    // Technologies used
  | "project_url"             // Project URL / Demo link
  | "project_github"          // GitHub repo URL
  | "project_dates"           // Project dates
  | "project_achievements"    // Key achievements

  // ─────────────────────────────────────
  // AWARDS & ACHIEVEMENTS
  // ─────────────────────────────────────
  | "awards_section"          // Section header
  | "award_name"              // Award name
  | "award_issuer"            // Issuing organization
  | "award_date"              // Date received
  | "award_description"       // Description

  // ─────────────────────────────────────
  // PUBLICATIONS
  // ─────────────────────────────────────
  | "publications_section"    // Section header
  | "publication_title"       // Publication title
  | "publication_authors"     // Authors
  | "publication_journal"     // Journal / Conference name
  | "publication_date"        // Publication date
  | "publication_url"         // URL / DOI
  | "publication_description" // Abstract / Description

  // ─────────────────────────────────────
  // VOLUNTEER EXPERIENCE
  // ─────────────────────────────────────
  | "volunteer_section"       // Section header
  | "volunteer_role"          // Role / Position
  | "volunteer_organization"  // Organization name
  | "volunteer_location"      // Location
  | "volunteer_dates"         // Dates
  | "volunteer_description"   // Description

  // ─────────────────────────────────────
  // INTERESTS / HOBBIES
  // ─────────────────────────────────────
  | "interests_section"       // Section header
  | "interest"                // Single interest
  | "interests_list"          // List of interests

  // ─────────────────────────────────────
  // REFERENCES
  // ─────────────────────────────────────
  | "references_section"      // Section header
  | "reference_name"          // Reference person name
  | "reference_title"         // Their job title
  | "reference_company"       // Their company
  | "reference_email"         // Their email
  | "reference_phone"         // Their phone
  | "reference_relationship"  // Relationship to you
  | "references_available"    // "References available upon request"

  // ─────────────────────────────────────
  // COURSES / TRAINING
  // ─────────────────────────────────────
  | "courses_section"         // Section header
  | "course_name"             // Course name
  | "course_provider"         // Provider (Coursera, Udemy, etc.)
  | "course_date"             // Completion date
  | "course_certificate"      // Certificate URL

  // ─────────────────────────────────────
  // MEMBERSHIPS / AFFILIATIONS
  // ─────────────────────────────────────
  | "memberships_section"     // Section header
  | "membership_organization" // Organization name
  | "membership_role"         // Your role / membership type
  | "membership_dates"        // Membership period

  // ─────────────────────────────────────
  // PATENTS
  // ─────────────────────────────────────
  | "patents_section"         // Section header
  | "patent_title"            // Patent title
  | "patent_number"           // Patent number
  | "patent_date"             // Filing/Grant date
  | "patent_description"      // Description

  // ─────────────────────────────────────
  // MILITARY SERVICE
  // ─────────────────────────────────────
  | "military_section"        // Section header
  | "military_branch"         // Branch (Army, Navy, etc.)
  | "military_rank"           // Rank achieved
  | "military_dates"          // Service dates
  | "military_description"    // Description / Duties

  // ─────────────────────────────────────
  // DECORATIVE / LAYOUT
  // ─────────────────────────────────────
  | "section_header"          // Generic section header
  | "divider"                 // Horizontal divider line
  | "spacer"                  // Empty space
  | "icon"                    // Icon element
  | "background"              // Background shape
  | "custom_text"             // Custom text (not categorized)
  | "custom_shape";           // Custom shape


// ============================================
// SEMANTIC CATEGORIES
// ============================================

/**
 * Categories for grouping semantic types
 */
export type SemanticCategory =
  | "personal"
  | "contact"
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "languages"
  | "certifications"
  | "projects"
  | "awards"
  | "publications"
  | "volunteer"
  | "interests"
  | "references"
  | "courses"
  | "memberships"
  | "patents"
  | "military"
  | "layout"
  | "custom";

/**
 * Map semantic types to their categories
 */
export const SEMANTIC_CATEGORY_MAP: Record<SemanticType, SemanticCategory> = {
  // Personal
  name: "personal",
  first_name: "personal",
  last_name: "personal",
  title: "personal",
  photo: "personal",

  // Contact
  email: "contact",
  phone: "contact",
  location: "contact",
  address: "contact",
  linkedin: "contact",
  github: "contact",
  website: "contact",
  portfolio: "contact",
  twitter: "contact",
  instagram: "contact",
  facebook: "contact",
  youtube: "contact",
  dribbble: "contact",
  behance: "contact",
  medium: "contact",
  stackoverflow: "contact",
  skype: "contact",
  telegram: "contact",
  whatsapp: "contact",
  discord: "contact",
  custom_link: "contact",

  // Summary
  summary: "summary",
  objective: "summary",
  headline: "summary",

  // Experience
  experience_section: "experience",
  experience_title: "experience",
  experience_company: "experience",
  experience_location: "experience",
  experience_start_date: "experience",
  experience_end_date: "experience",
  experience_dates: "experience",
  experience_description: "experience",
  experience_achievements: "experience",
  experience_technologies: "experience",

  // Education
  education_section: "education",
  education_degree: "education",
  education_field: "education",
  education_institution: "education",
  education_location: "education",
  education_start_date: "education",
  education_end_date: "education",
  education_dates: "education",
  education_gpa: "education",
  education_honors: "education",
  education_description: "education",
  education_thesis: "education",

  // Skills
  skills_section: "skills",
  skill: "skills",
  skill_category: "skills",
  skill_list: "skills",
  skill_level: "skills",
  technical_skills: "skills",
  soft_skills: "skills",
  tools: "skills",
  frameworks: "skills",
  programming_languages: "skills",

  // Languages
  languages_section: "languages",
  language: "languages",
  language_level: "languages",
  language_entry: "languages",

  // Certifications
  certifications_section: "certifications",
  certification_name: "certifications",
  certification_issuer: "certifications",
  certification_date: "certifications",
  certification_expiry: "certifications",
  certification_id: "certifications",
  certification_url: "certifications",

  // Projects
  projects_section: "projects",
  project_name: "projects",
  project_role: "projects",
  project_description: "projects",
  project_technologies: "projects",
  project_url: "projects",
  project_github: "projects",
  project_dates: "projects",
  project_achievements: "projects",

  // Awards
  awards_section: "awards",
  award_name: "awards",
  award_issuer: "awards",
  award_date: "awards",
  award_description: "awards",

  // Publications
  publications_section: "publications",
  publication_title: "publications",
  publication_authors: "publications",
  publication_journal: "publications",
  publication_date: "publications",
  publication_url: "publications",
  publication_description: "publications",

  // Volunteer
  volunteer_section: "volunteer",
  volunteer_role: "volunteer",
  volunteer_organization: "volunteer",
  volunteer_location: "volunteer",
  volunteer_dates: "volunteer",
  volunteer_description: "volunteer",

  // Interests
  interests_section: "interests",
  interest: "interests",
  interests_list: "interests",

  // References
  references_section: "references",
  reference_name: "references",
  reference_title: "references",
  reference_company: "references",
  reference_email: "references",
  reference_phone: "references",
  reference_relationship: "references",
  references_available: "references",

  // Courses
  courses_section: "courses",
  course_name: "courses",
  course_provider: "courses",
  course_date: "courses",
  course_certificate: "courses",

  // Memberships
  memberships_section: "memberships",
  membership_organization: "memberships",
  membership_role: "memberships",
  membership_dates: "memberships",

  // Patents
  patents_section: "patents",
  patent_title: "patents",
  patent_number: "patents",
  patent_date: "patents",
  patent_description: "patents",

  // Military
  military_section: "military",
  military_branch: "military",
  military_rank: "military",
  military_dates: "military",
  military_description: "military",

  // Layout
  section_header: "layout",
  divider: "layout",
  spacer: "layout",
  icon: "layout",
  background: "layout",
  custom_text: "custom",
  custom_shape: "custom",
};


// ============================================
// SEMANTIC ELEMENT INTERFACE
// ============================================

/**
 * Extended properties for canvas elements with semantic info
 */
export interface SemanticElementProps {
  semanticType: SemanticType;
  semanticGroup?: string;  // e.g., "experience_0", "education_1" for grouping related items
  semanticIndex?: number;  // Index within the group (for ordering)
}

/**
 * Check if an element has semantic type
 */
export function hasSemanticType(obj: any): obj is { semanticType: SemanticType } {
  return obj && typeof obj.semanticType === "string";
}

/**
 * Get the category for a semantic type
 */
export function getSemanticCategory(type: SemanticType): SemanticCategory {
  return SEMANTIC_CATEGORY_MAP[type];
}


// ============================================
// SECTION DEFINITIONS
// ============================================

/**
 * Definition of a resume section with its allowed semantic types
 */
export interface SectionDefinition {
  id: SemanticCategory;
  nameEn: string;
  nameUk: string;
  headerType: SemanticType;
  allowedTypes: SemanticType[];
  isRepeatable: boolean;  // Can have multiple entries (experience, education)
  isRequired: boolean;    // Required for a complete resume
  defaultOrder: number;   // Default order in resume
}

/**
 * All available sections for a resume
 */
export const SECTION_DEFINITIONS: SectionDefinition[] = [
  {
    id: "personal",
    nameEn: "Personal Info",
    nameUk: "Особиста інформація",
    headerType: "name",
    allowedTypes: ["name", "first_name", "last_name", "title", "photo"],
    isRepeatable: false,
    isRequired: true,
    defaultOrder: 0,
  },
  {
    id: "contact",
    nameEn: "Contact",
    nameUk: "Контакти",
    headerType: "email",
    allowedTypes: [
      "email", "phone", "location", "address", "linkedin", "github",
      "website", "portfolio", "twitter", "instagram", "facebook",
      "youtube", "dribbble", "behance", "medium", "stackoverflow",
      "skype", "telegram", "whatsapp", "discord", "custom_link",
    ],
    isRepeatable: false,
    isRequired: true,
    defaultOrder: 1,
  },
  {
    id: "summary",
    nameEn: "Summary",
    nameUk: "Про мене",
    headerType: "summary",
    allowedTypes: ["summary", "objective", "headline"],
    isRepeatable: false,
    isRequired: false,
    defaultOrder: 2,
  },
  {
    id: "experience",
    nameEn: "Experience",
    nameUk: "Досвід роботи",
    headerType: "experience_section",
    allowedTypes: [
      "experience_section", "experience_title", "experience_company",
      "experience_location", "experience_start_date", "experience_end_date",
      "experience_dates", "experience_description", "experience_achievements",
      "experience_technologies",
    ],
    isRepeatable: true,
    isRequired: false,
    defaultOrder: 3,
  },
  {
    id: "education",
    nameEn: "Education",
    nameUk: "Освіта",
    headerType: "education_section",
    allowedTypes: [
      "education_section", "education_degree", "education_field",
      "education_institution", "education_location", "education_start_date",
      "education_end_date", "education_dates", "education_gpa",
      "education_honors", "education_description", "education_thesis",
    ],
    isRepeatable: true,
    isRequired: false,
    defaultOrder: 4,
  },
  {
    id: "skills",
    nameEn: "Skills",
    nameUk: "Навички",
    headerType: "skills_section",
    allowedTypes: [
      "skills_section", "skill", "skill_category", "skill_list",
      "skill_level", "technical_skills", "soft_skills", "tools",
      "frameworks", "programming_languages",
    ],
    isRepeatable: false,
    isRequired: false,
    defaultOrder: 5,
  },
  {
    id: "languages",
    nameEn: "Languages",
    nameUk: "Мови",
    headerType: "languages_section",
    allowedTypes: ["languages_section", "language", "language_level", "language_entry"],
    isRepeatable: false,
    isRequired: false,
    defaultOrder: 6,
  },
  {
    id: "certifications",
    nameEn: "Certifications",
    nameUk: "Сертифікати",
    headerType: "certifications_section",
    allowedTypes: [
      "certifications_section", "certification_name", "certification_issuer",
      "certification_date", "certification_expiry", "certification_id",
      "certification_url",
    ],
    isRepeatable: true,
    isRequired: false,
    defaultOrder: 7,
  },
  {
    id: "projects",
    nameEn: "Projects",
    nameUk: "Проекти",
    headerType: "projects_section",
    allowedTypes: [
      "projects_section", "project_name", "project_role",
      "project_description", "project_technologies", "project_url",
      "project_github", "project_dates", "project_achievements",
    ],
    isRepeatable: true,
    isRequired: false,
    defaultOrder: 8,
  },
  {
    id: "awards",
    nameEn: "Awards",
    nameUk: "Нагороди",
    headerType: "awards_section",
    allowedTypes: ["awards_section", "award_name", "award_issuer", "award_date", "award_description"],
    isRepeatable: true,
    isRequired: false,
    defaultOrder: 9,
  },
  {
    id: "publications",
    nameEn: "Publications",
    nameUk: "Публікації",
    headerType: "publications_section",
    allowedTypes: [
      "publications_section", "publication_title", "publication_authors",
      "publication_journal", "publication_date", "publication_url",
      "publication_description",
    ],
    isRepeatable: true,
    isRequired: false,
    defaultOrder: 10,
  },
  {
    id: "volunteer",
    nameEn: "Volunteer Experience",
    nameUk: "Волонтерство",
    headerType: "volunteer_section",
    allowedTypes: [
      "volunteer_section", "volunteer_role", "volunteer_organization",
      "volunteer_location", "volunteer_dates", "volunteer_description",
    ],
    isRepeatable: true,
    isRequired: false,
    defaultOrder: 11,
  },
  {
    id: "interests",
    nameEn: "Interests",
    nameUk: "Інтереси",
    headerType: "interests_section",
    allowedTypes: ["interests_section", "interest", "interests_list"],
    isRepeatable: false,
    isRequired: false,
    defaultOrder: 12,
  },
  {
    id: "courses",
    nameEn: "Courses",
    nameUk: "Курси",
    headerType: "courses_section",
    allowedTypes: ["courses_section", "course_name", "course_provider", "course_date", "course_certificate"],
    isRepeatable: true,
    isRequired: false,
    defaultOrder: 13,
  },
  {
    id: "memberships",
    nameEn: "Memberships",
    nameUk: "Членство",
    headerType: "memberships_section",
    allowedTypes: ["memberships_section", "membership_organization", "membership_role", "membership_dates"],
    isRepeatable: true,
    isRequired: false,
    defaultOrder: 14,
  },
  {
    id: "patents",
    nameEn: "Patents",
    nameUk: "Патенти",
    headerType: "patents_section",
    allowedTypes: ["patents_section", "patent_title", "patent_number", "patent_date", "patent_description"],
    isRepeatable: true,
    isRequired: false,
    defaultOrder: 15,
  },
  {
    id: "military",
    nameEn: "Military Service",
    nameUk: "Військова служба",
    headerType: "military_section",
    allowedTypes: ["military_section", "military_branch", "military_rank", "military_dates", "military_description"],
    isRepeatable: false,
    isRequired: false,
    defaultOrder: 16,
  },
  {
    id: "references",
    nameEn: "References",
    nameUk: "Рекомендації",
    headerType: "references_section",
    allowedTypes: [
      "references_section", "reference_name", "reference_title",
      "reference_company", "reference_email", "reference_phone",
      "reference_relationship", "references_available",
    ],
    isRepeatable: true,
    isRequired: false,
    defaultOrder: 17,
  },
];

/**
 * Get section definition by ID
 */
export function getSectionDefinition(id: SemanticCategory): SectionDefinition | undefined {
  return SECTION_DEFINITIONS.find(s => s.id === id);
}


// ============================================
// DISPLAY LABELS
// ============================================

/**
 * Human-readable labels for semantic types
 */
export const SEMANTIC_TYPE_LABELS: Record<SemanticType, { en: string; uk: string }> = {
  // Personal
  name: { en: "Full Name", uk: "Повне ім'я" },
  first_name: { en: "First Name", uk: "Ім'я" },
  last_name: { en: "Last Name", uk: "Прізвище" },
  title: { en: "Job Title", uk: "Посада" },
  photo: { en: "Photo", uk: "Фото" },

  // Contact
  email: { en: "Email", uk: "Email" },
  phone: { en: "Phone", uk: "Телефон" },
  location: { en: "Location", uk: "Місто" },
  address: { en: "Address", uk: "Адреса" },
  linkedin: { en: "LinkedIn", uk: "LinkedIn" },
  github: { en: "GitHub", uk: "GitHub" },
  website: { en: "Website", uk: "Веб-сайт" },
  portfolio: { en: "Portfolio", uk: "Портфоліо" },
  twitter: { en: "Twitter/X", uk: "Twitter/X" },
  instagram: { en: "Instagram", uk: "Instagram" },
  facebook: { en: "Facebook", uk: "Facebook" },
  youtube: { en: "YouTube", uk: "YouTube" },
  dribbble: { en: "Dribbble", uk: "Dribbble" },
  behance: { en: "Behance", uk: "Behance" },
  medium: { en: "Medium", uk: "Medium" },
  stackoverflow: { en: "Stack Overflow", uk: "Stack Overflow" },
  skype: { en: "Skype", uk: "Skype" },
  telegram: { en: "Telegram", uk: "Telegram" },
  whatsapp: { en: "WhatsApp", uk: "WhatsApp" },
  discord: { en: "Discord", uk: "Discord" },
  custom_link: { en: "Custom Link", uk: "Інше посилання" },

  // Summary
  summary: { en: "Summary", uk: "Про мене" },
  objective: { en: "Objective", uk: "Мета" },
  headline: { en: "Headline", uk: "Заголовок" },

  // Experience
  experience_section: { en: "Experience", uk: "Досвід роботи" },
  experience_title: { en: "Job Title", uk: "Посада" },
  experience_company: { en: "Company", uk: "Компанія" },
  experience_location: { en: "Location", uk: "Місто" },
  experience_start_date: { en: "Start Date", uk: "Дата початку" },
  experience_end_date: { en: "End Date", uk: "Дата завершення" },
  experience_dates: { en: "Dates", uk: "Період" },
  experience_description: { en: "Description", uk: "Опис" },
  experience_achievements: { en: "Achievements", uk: "Досягнення" },
  experience_technologies: { en: "Technologies", uk: "Технології" },

  // Education
  education_section: { en: "Education", uk: "Освіта" },
  education_degree: { en: "Degree", uk: "Ступінь" },
  education_field: { en: "Field of Study", uk: "Спеціальність" },
  education_institution: { en: "Institution", uk: "Навчальний заклад" },
  education_location: { en: "Location", uk: "Місто" },
  education_start_date: { en: "Start Date", uk: "Дата початку" },
  education_end_date: { en: "End Date", uk: "Дата завершення" },
  education_dates: { en: "Dates", uk: "Період" },
  education_gpa: { en: "GPA", uk: "Середній бал" },
  education_honors: { en: "Honors", uk: "Відзнаки" },
  education_description: { en: "Description", uk: "Опис" },
  education_thesis: { en: "Thesis", uk: "Дипломна робота" },

  // Skills
  skills_section: { en: "Skills", uk: "Навички" },
  skill: { en: "Skill", uk: "Навичка" },
  skill_category: { en: "Skill Category", uk: "Категорія навичок" },
  skill_list: { en: "Skills List", uk: "Список навичок" },
  skill_level: { en: "Skill Level", uk: "Рівень" },
  technical_skills: { en: "Technical Skills", uk: "Технічні навички" },
  soft_skills: { en: "Soft Skills", uk: "Soft Skills" },
  tools: { en: "Tools", uk: "Інструменти" },
  frameworks: { en: "Frameworks", uk: "Фреймворки" },
  programming_languages: { en: "Programming Languages", uk: "Мови програмування" },

  // Languages
  languages_section: { en: "Languages", uk: "Мови" },
  language: { en: "Language", uk: "Мова" },
  language_level: { en: "Level", uk: "Рівень" },
  language_entry: { en: "Language", uk: "Мова" },

  // Certifications
  certifications_section: { en: "Certifications", uk: "Сертифікати" },
  certification_name: { en: "Certificate Name", uk: "Назва сертифікату" },
  certification_issuer: { en: "Issuer", uk: "Видавець" },
  certification_date: { en: "Date", uk: "Дата" },
  certification_expiry: { en: "Expiry Date", uk: "Дійсний до" },
  certification_id: { en: "Credential ID", uk: "ID сертифікату" },
  certification_url: { en: "URL", uk: "Посилання" },

  // Projects
  projects_section: { en: "Projects", uk: "Проекти" },
  project_name: { en: "Project Name", uk: "Назва проекту" },
  project_role: { en: "Role", uk: "Роль" },
  project_description: { en: "Description", uk: "Опис" },
  project_technologies: { en: "Technologies", uk: "Технології" },
  project_url: { en: "URL", uk: "Посилання" },
  project_github: { en: "GitHub", uk: "GitHub" },
  project_dates: { en: "Dates", uk: "Період" },
  project_achievements: { en: "Achievements", uk: "Досягнення" },

  // Awards
  awards_section: { en: "Awards", uk: "Нагороди" },
  award_name: { en: "Award Name", uk: "Назва нагороди" },
  award_issuer: { en: "Issuer", uk: "Видавець" },
  award_date: { en: "Date", uk: "Дата" },
  award_description: { en: "Description", uk: "Опис" },

  // Publications
  publications_section: { en: "Publications", uk: "Публікації" },
  publication_title: { en: "Title", uk: "Назва" },
  publication_authors: { en: "Authors", uk: "Автори" },
  publication_journal: { en: "Journal", uk: "Видання" },
  publication_date: { en: "Date", uk: "Дата" },
  publication_url: { en: "URL", uk: "Посилання" },
  publication_description: { en: "Description", uk: "Опис" },

  // Volunteer
  volunteer_section: { en: "Volunteer", uk: "Волонтерство" },
  volunteer_role: { en: "Role", uk: "Роль" },
  volunteer_organization: { en: "Organization", uk: "Організація" },
  volunteer_location: { en: "Location", uk: "Місто" },
  volunteer_dates: { en: "Dates", uk: "Період" },
  volunteer_description: { en: "Description", uk: "Опис" },

  // Interests
  interests_section: { en: "Interests", uk: "Інтереси" },
  interest: { en: "Interest", uk: "Інтерес" },
  interests_list: { en: "Interests", uk: "Інтереси" },

  // References
  references_section: { en: "References", uk: "Рекомендації" },
  reference_name: { en: "Name", uk: "Ім'я" },
  reference_title: { en: "Title", uk: "Посада" },
  reference_company: { en: "Company", uk: "Компанія" },
  reference_email: { en: "Email", uk: "Email" },
  reference_phone: { en: "Phone", uk: "Телефон" },
  reference_relationship: { en: "Relationship", uk: "Зв'язок" },
  references_available: { en: "Available on Request", uk: "За запитом" },

  // Courses
  courses_section: { en: "Courses", uk: "Курси" },
  course_name: { en: "Course Name", uk: "Назва курсу" },
  course_provider: { en: "Provider", uk: "Провайдер" },
  course_date: { en: "Date", uk: "Дата" },
  course_certificate: { en: "Certificate", uk: "Сертифікат" },

  // Memberships
  memberships_section: { en: "Memberships", uk: "Членство" },
  membership_organization: { en: "Organization", uk: "Організація" },
  membership_role: { en: "Role", uk: "Роль" },
  membership_dates: { en: "Dates", uk: "Період" },

  // Patents
  patents_section: { en: "Patents", uk: "Патенти" },
  patent_title: { en: "Patent Title", uk: "Назва патенту" },
  patent_number: { en: "Patent Number", uk: "Номер патенту" },
  patent_date: { en: "Date", uk: "Дата" },
  patent_description: { en: "Description", uk: "Опис" },

  // Military
  military_section: { en: "Military Service", uk: "Військова служба" },
  military_branch: { en: "Branch", uk: "Рід військ" },
  military_rank: { en: "Rank", uk: "Звання" },
  military_dates: { en: "Dates", uk: "Період" },
  military_description: { en: "Description", uk: "Опис" },

  // Layout
  section_header: { en: "Section Header", uk: "Заголовок секції" },
  divider: { en: "Divider", uk: "Розділювач" },
  spacer: { en: "Spacer", uk: "Відступ" },
  icon: { en: "Icon", uk: "Іконка" },
  background: { en: "Background", uk: "Фон" },
  custom_text: { en: "Custom Text", uk: "Текст" },
  custom_shape: { en: "Custom Shape", uk: "Фігура" },
};

/**
 * Get label for semantic type
 */
export function getSemanticTypeLabel(type: SemanticType, locale: "en" | "uk" = "en"): string {
  return SEMANTIC_TYPE_LABELS[type]?.[locale] || type;
}
