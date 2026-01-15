import { useCallback, useRef, useEffect, useState, useMemo } from "react";
import { useCanvasStore } from "@/stores/canvas-store";
import { useAIFeaturesStore } from "@/stores/ai-features-store";
import { useShallow } from "zustand/react/shallow";
import type { Canvas } from "fabric";

// Detected template style interface
export interface DetectedStyle {
  colors: {
    sectionHeader: string;
    jobTitle: string;
    company: string;
    dates: string;
    body: string;
    link: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  fontSizes: {
    sectionHeader: number;
    jobTitle: number;
    company: number;
    dates: number;
    body: number;
  };
  layout: {
    sectionSpacing: number;
    itemSpacing: number;
    lineHeight: number;
  };
}

// Default style (fallback)
export const defaultStyle: DetectedStyle = {
  colors: {
    sectionHeader: "#18181b",
    jobTitle: "#27272a",
    company: "#52525b",
    dates: "#71717a",
    body: "#52525b",
    link: "#3b82f6",
  },
  fonts: {
    heading: "Arial, sans-serif",
    body: "Arial, sans-serif",
  },
  fontSizes: {
    sectionHeader: 11,
    jobTitle: 12,
    company: 11,
    dates: 10,
    body: 10,
  },
  layout: {
    sectionSpacing: 25,
    itemSpacing: 15,
    lineHeight: 1.4,
  },
};

type SectionType = "experience" | "education" | "skills" | "contact" | "summary" | "certifications" | "projects";

// Section prefixes for detecting existing sections
const sectionPrefixes: Record<SectionType, string[]> = {
  experience: ["experience_"],
  education: ["education_"],
  skills: ["skills_", "skill_", "technical_skills", "soft_skills"],
  contact: ["email", "phone", "location", "linkedin", "github", "website", "portfolio", "twitter", "telegram"],
  summary: ["summary", "objective"],
  certifications: ["certification"],
  projects: ["project"],
};

// Consolidated canvas store hook - batches related subscriptions
export function useCanvasActions() {
  return useCanvasStore(
    useShallow((state) => ({
      canvas: state.canvas,
      saveToHistory: state.saveToHistory,
      requestCanvasResize: state.requestCanvasResize,
    }))
  );
}

// Consolidated AI features store hook - batches subscriptions
export function useAIReviewState() {
  return useAIFeaturesStore(
    useShallow((state) => ({
      reviewResult: state.reviewResult,
      reviewError: state.reviewError,
      highlightedElementId: state.highlightedElementId,
      revalidatingIds: state.revalidatingIds,
      formattingResult: state.formattingResult,
      formattingError: state.formattingError,
    }))
  );
}

// Consolidated AI actions hook
export function useAIActions() {
  return useAIFeaturesStore(
    useShallow((state) => ({
      setReviewResult: state.setReviewResult,
      setReviewError: state.setReviewError,
      highlightElement: state.highlightElement,
      markSuggestionApplied: state.markSuggestionApplied,
      markSuggestionDismissed: state.markSuggestionDismissed,
      markSuggestionStale: state.markSuggestionStale,
      checkForStaleElements: state.checkForStaleElements,
      handleElementDeleted: state.handleElementDeleted,
      setRevalidating: state.setRevalidating,
      updateSuggestionAfterRevalidation: state.updateSuggestionAfterRevalidation,
      setFormattingResult: state.setFormattingResult,
      setFormattingError: state.setFormattingError,
      clearFormatting: state.clearFormatting,
      revalidateAppliedSuggestions: state.revalidateAppliedSuggestions,
    }))
  );
}

// Hook for template style detection with debouncing
export function useTemplateStyle(canvas: Canvas | null) {
  const [templateStyle, setTemplateStyle] = useState<DetectedStyle>(defaultStyle);
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isDetectingRef = useRef<boolean>(false);

  const detectTemplateStyle = useCallback(() => {
    if (!canvas || isDetectingRef.current) return;

    isDetectingRef.current = true;

    const objects = canvas.getObjects().filter((obj: any) =>
      !obj._isPageBreak && !obj.isBackground && obj.selectable !== false
    );

    const detected: DetectedStyle = {
      colors: { ...defaultStyle.colors },
      fonts: { ...defaultStyle.fonts },
      fontSizes: { ...defaultStyle.fontSizes },
      layout: { ...defaultStyle.layout },
    };

    // Find elements by semantic type and extract their styles
    objects.forEach((obj: any) => {
      if (!obj.semanticType) return;

      const type = obj.semanticType;
      const fill = obj.fill || "";
      const fontFamily = obj.fontFamily || "";
      const fontSize = obj.fontSize || 0;

      // Section headers
      if (type.includes("_section") || type === "skills_section" || type === "education_section") {
        if (fill) detected.colors.sectionHeader = fill;
        if (fontFamily) detected.fonts.heading = fontFamily;
        if (fontSize) detected.fontSizes.sectionHeader = fontSize;
      }

      // Job/position titles
      if (type === "experience_title" || type === "project_name") {
        if (fill) detected.colors.jobTitle = fill;
        if (fontFamily) detected.fonts.heading = fontFamily;
        if (fontSize) detected.fontSizes.jobTitle = fontSize;
      }

      // Company/institution names
      if (type === "experience_company" || type === "education_institution" || type === "certification_issuer") {
        if (fill) detected.colors.company = fill;
        if (fontFamily) detected.fonts.body = fontFamily;
        if (fontSize) detected.fontSizes.company = fontSize;
      }

      // Dates
      if (type.includes("_dates") || type === "certification_date") {
        if (fill) detected.colors.dates = fill;
        if (fontSize) detected.fontSizes.dates = fontSize;
      }

      // Body text (descriptions, summary)
      if (type.includes("_description") || type === "summary" || type === "skill_list") {
        if (fill) detected.colors.body = fill;
        if (fontFamily) detected.fonts.body = fontFamily;
        if (fontSize) detected.fontSizes.body = fontSize;
        if (obj.lineHeight) detected.layout.lineHeight = obj.lineHeight;
      }

      // Links
      if (type === "linkedin" || type === "github" || type === "website" || type === "project_url") {
        if (fill) detected.colors.link = fill;
      }
    });

    setTemplateStyle(detected);
    isDetectingRef.current = false;
  }, [canvas]);

  // Debounced detection for canvas changes
  const debouncedDetect = useCallback(() => {
    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(detectTemplateStyle, 150);
  }, [detectTemplateStyle]);

  // Set up canvas listeners with debounce
  useEffect(() => {
    if (!canvas) return;

    // Initial detection
    detectTemplateStyle();

    // Listen for changes with debounce
    canvas.on("object:added", debouncedDetect);
    canvas.on("object:modified", debouncedDetect);

    return () => {
      clearTimeout(debounceTimerRef.current);
      canvas.off("object:added", debouncedDetect);
      canvas.off("object:modified", debouncedDetect);
    };
  }, [canvas, detectTemplateStyle, debouncedDetect]);

  return templateStyle;
}

// Hook for checking existing sections - memoized
export function useSectionExists(canvas: Canvas | null) {
  const [sectionStates, setSectionStates] = useState<Record<SectionType, boolean>>({
    experience: false,
    education: false,
    skills: false,
    contact: false,
    summary: false,
    certifications: false,
    projects: false,
  });

  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const checkSections = useCallback(() => {
    if (!canvas) return;

    const objects = canvas.getObjects().filter((obj: any) =>
      !obj._isPageBreak && !obj.isBackground && obj.selectable !== false
    );

    const newStates: Record<SectionType, boolean> = {
      experience: false,
      education: false,
      skills: false,
      contact: false,
      summary: false,
      certifications: false,
      projects: false,
    };

    objects.forEach((obj: any) => {
      if (!obj.semanticType) return;

      (Object.entries(sectionPrefixes) as [SectionType, string[]][]).forEach(([section, prefixes]) => {
        const matches = prefixes.some(prefix =>
          obj.semanticType === prefix || obj.semanticType.startsWith(prefix)
        );
        if (matches) {
          newStates[section] = true;
        }
      });
    });

    setSectionStates(newStates);
  }, [canvas]);

  // Debounced check for canvas changes
  const debouncedCheck = useCallback(() => {
    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(checkSections, 100);
  }, [checkSections]);

  useEffect(() => {
    if (!canvas) return;

    // Initial check
    checkSections();

    canvas.on("object:added", debouncedCheck);
    canvas.on("object:removed", debouncedCheck);

    return () => {
      clearTimeout(debounceTimerRef.current);
      canvas.off("object:added", debouncedCheck);
      canvas.off("object:removed", debouncedCheck);
    };
  }, [canvas, checkSections, debouncedCheck]);

  return sectionStates;
}

// Hook for element snapshots (used for stale detection)
export function useElementSnapshots(canvas: Canvas | null) {
  const getCurrentElementSnapshots = useCallback(() => {
    if (!canvas) return [];
    const objects = canvas.getObjects().filter((obj: any) =>
      !obj._isPageBreak && !obj.isBackground && obj.selectable !== false
    );
    return objects
      .filter((obj: any) => obj.text)
      .map((obj: any) => ({
        id: obj.id || `obj-${objects.indexOf(obj)}`,
        text: (obj.text || "").trim(),
        semanticType: obj.semanticType || "custom",
      }));
  }, [canvas]);

  return getCurrentElementSnapshots;
}

// Hook for extracting canvas context for AI
export function useCanvasContext(canvas: Canvas | null) {
  const extractCanvasContext = useCallback((): string => {
    if (!canvas) return "";

    const objects = canvas.getObjects().filter((obj: any) =>
      !obj._isPageBreak && !obj.isBackground && obj.selectable !== false
    );

    const contextParts: string[] = [];

    objects.forEach((obj: any) => {
      if (!obj.semanticType || !obj.text) return;

      const type = obj.semanticType;
      const text = obj.text;

      if (type === "name") {
        contextParts.push(`Name: ${text}`);
      } else if (type === "title") {
        contextParts.push(`Job Title: ${text}`);
      } else if (type === "experience_title") {
        contextParts.push(`Experience: ${text}`);
      } else if (type === "experience_company") {
        contextParts.push(`Company: ${text}`);
      } else if (type === "experience_description") {
        contextParts.push(`Responsibilities: ${text}`);
      } else if (type === "education_degree") {
        contextParts.push(`Education: ${text}`);
      } else if (type === "skill_list" || type.startsWith("skill_")) {
        contextParts.push(`Skills: ${text}`);
      }
    });

    return contextParts.join("\n");
  }, [canvas]);

  return extractCanvasContext;
}

// Hook for photo detection
export function usePhotoExists(canvas: Canvas | null) {
  const [hasPhoto, setHasPhoto] = useState(false);

  const checkForPhoto = useCallback(() => {
    if (!canvas) {
      setHasPhoto(false);
      return;
    }
    const photo = canvas.getObjects().find((obj: any) =>
      obj.semanticType === "photo" ||
      obj.isPhoto === true ||
      obj.type === "image"
    );
    setHasPhoto(!!photo);
  }, [canvas]);

  useEffect(() => {
    if (!canvas) return;

    checkForPhoto();
    canvas.on("object:added", checkForPhoto);
    canvas.on("object:removed", checkForPhoto);

    return () => {
      canvas.off("object:added", checkForPhoto);
      canvas.off("object:removed", checkForPhoto);
    };
  }, [canvas, checkForPhoto]);

  return hasPhoto;
}
