import { ResumeRegion, SubscriptionStatus } from "@prisma/client";

export type { ResumeRegion, SubscriptionStatus };

// SubscriptionPlan is now a dynamic string (not an enum)
// Valid plan keys are stored in SubscriptionPlanConfig table
export type SubscriptionPlan = string;

export interface ResumeData {
  personalInfo: {
    fullName: string;
    email: string;
    phone?: string;
    location?: string;
    website?: string;
    linkedin?: string;
    photo?: string;
  };
  summary?: string;
  experience: {
    id: string;
    title: string;
    company: string;
    location?: string;
    startDate: string;
    endDate?: string;
    current: boolean;
    description: string;
  }[];
  education: {
    id: string;
    degree: string;
    school: string;
    location?: string;
    startDate: string;
    endDate?: string;
    description?: string;
  }[];
  skills: string[];
  languages?: {
    name: string;
    level: string;
  }[];
  certifications?: {
    name: string;
    issuer: string;
    date?: string;
  }[];
  projects?: {
    id: string;
    name: string;
    description: string;
    url?: string;
  }[];
}

export interface AIGenerateRequest {
  type: "about" | "experience" | "skills" | "cover_letter";
  context: {
    profession?: string;
    experience?: string[];
    skills?: string[];
    jobDescription?: string;
  };
  locale: "en" | "uk";
}

export interface AIReviewResult {
  score: number;
  strengths: string[];
  improvements: string[];
  suggestions: {
    section: string;
    suggestion: string;
    priority: "high" | "medium" | "low";
  }[];
}
