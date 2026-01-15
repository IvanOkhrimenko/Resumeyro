"use client";

import { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
import {
  Briefcase,
  GraduationCap,
  Code,
  Phone,
  FileText,
  Award,
  Folder,
  Loader2,
  Camera,
  User,
  Type,
  ChevronDown,
  ChevronRight,
  Plus,
  Sparkles,
  Brain,
  Palette,
  RefreshCw,
  CheckCircle2,
  TrendingUp,
  Crown,
  Layers,
} from "lucide-react";
import { IText, Textbox, FabricImage } from "fabric";
import { nanoid } from "nanoid";
import { PhotoEditorModal } from "./photo-editor-modal";
import { useCanvasStore } from "@/stores/canvas-store";
import { MARGIN_LEFT, CONTENT_WIDTH, GRID_SIZE } from "./resume-canvas";
import { Button } from "@/components/ui/button";
import { SuggestionCard, ScoreBadge, StrengthBadge, MissingSectionCard } from "./suggestion-card";
import { extractSemanticMap, formatSemanticMapForPrompt, findElementByTypeAndText } from "@/lib/canvas/extract-semantic-map";
import { applyFullFormatting } from "@/lib/canvas/apply-formatting";
import { cn } from "@/lib/utils";
// Optimized hooks and form components
import {
  useCanvasActions,
  useAIReviewState,
  useAIActions,
  useTemplateStyle,
  useSectionExists,
  useElementSnapshots,
  useCanvasContext,
  usePhotoExists,
  defaultStyle,
} from "./sidebar-hooks";
import {
  ExperienceForm,
  EducationForm,
  SkillsForm,
  ContactForm,
  SummaryForm,
  CertificationForm,
  ProjectForm,
} from "./section-forms";

type TabType = "sections" | "ai-review";

type SectionType =
  | "experience"
  | "education"
  | "skills"
  | "contact"
  | "summary"
  | "certifications"
  | "projects";

// Section configuration
const sections: { type: SectionType; label: string; icon: any }[] = [
  { type: "experience", label: "Experience", icon: Briefcase },
  { type: "education", label: "Education", icon: GraduationCap },
  { type: "skills", label: "Skills", icon: Code },
  { type: "contact", label: "Contact Info", icon: Phone },
  { type: "summary", label: "Summary", icon: FileText },
  { type: "certifications", label: "Certifications", icon: Award },
  { type: "projects", label: "Projects", icon: Folder },
];

// Section header semantic types
const sectionHeaders: Record<SectionType, string> = {
  experience: "experience_section",
  education: "education_section",
  skills: "skills_section",
  contact: "contact",
  summary: "summary",
  certifications: "certifications_section",
  projects: "projects_section",
};

// Section header texts
const sectionHeaderTexts: Record<SectionType, string> = {
  experience: "WORK EXPERIENCE",
  education: "EDUCATION",
  skills: "SKILLS",
  contact: "CONTACT",
  summary: "SUMMARY",
  certifications: "CERTIFICATIONS",
  projects: "PROJECTS",
};

// DetectedStyle is now imported from sidebar-hooks

export function CanvasSidebar() {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>("sections");

  // Expanded sections state
  const [expandedSection, setExpandedSection] = useState<SectionType | null>(null);

  // Photo upload state
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Photo editor modal
  const [photoEditorOpen, setPhotoEditorOpen] = useState(false);
  const [photoEditorImageUrl, setPhotoEditorImageUrl] = useState<string>("");

  // ==========================================
  // OPTIMIZED HOOKS - Consolidated subscriptions
  // ==========================================

  // Canvas actions - batched subscription
  const { canvas, saveToHistory, requestCanvasResize } = useCanvasActions();

  // AI state - batched subscription (values only)
  const { reviewResult, reviewError, highlightedElementId, revalidatingIds, formattingResult } = useAIReviewState();

  // AI actions - batched subscription (functions only)
  const aiActions = useAIActions();

  // Memoized expensive operations
  const templateStyle = useTemplateStyle(canvas);
  const sectionExists = useSectionExists(canvas);
  const getCurrentElementSnapshots = useElementSnapshots(canvas);
  const extractCanvasContext = useCanvasContext(canvas);
  const hasExistingPhoto = usePhotoExists(canvas);

  // Local loading states (more reliable than Zustand for frequent updates)
  const [reviewLoading, setReviewLoading] = useState(false);
  const [formattingLoading, setFormattingLoading] = useState(false);
  const [multiModelEnabled, setMultiModelEnabled] = useState(false);
  const [multiModelAvailable, setMultiModelAvailable] = useState(false);
  const [isMultiModelResult, setIsMultiModelResult] = useState(false);
  const [modelReviews, setModelReviews] = useState<any[] | null>(null);
  const [failedModels, setFailedModels] = useState<any[] | null>(null);
  const [configuredModels, setConfiguredModels] = useState<{name: string; provider: string}[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>("");
  const [currentModelIndex, setCurrentModelIndex] = useState(0);

  // Check multi-model availability and admin status
  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const checkMultiModelAccess = async () => {
      try {
        // Check subscription for multi-model access
        const subResponse = await fetch("/api/subscription", { signal: abortController.signal });
        if (!isMounted) return;

        if (subResponse.ok) {
          const subData = await subResponse.json();
          // TODO: restore Premium check after testing
          // const hasPremium = subData.plan === "PREMIUM" || subData.isAdmin;
          const hasPremium = true; // Enabled for all users during testing
          setMultiModelAvailable(hasPremium);
          setIsAdmin(subData.isAdmin || false);
        } else {
          // Even if API fails, enable for testing
          setMultiModelAvailable(true);
        }

        // Fetch configured models from public endpoint
        const configResponse = await fetch("/api/ai/multi-model-models", { signal: abortController.signal });
        if (!isMounted) return;

        if (configResponse.ok) {
          const configData = await configResponse.json();
          if (configData.models && configData.models.length > 0) {
            setConfiguredModels(configData.models);
          }
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') return; // Ignore abort errors
        console.error("Failed to check multi-model access:", error);
        // Enable for testing even on error
        if (isMounted) setMultiModelAvailable(true);
      }
    };

    checkMultiModelAccess();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, []);

  // Listen to canvas changes for stale detection
  useEffect(() => {
    if (!canvas || !reviewResult) return;

    let debounceTimer: NodeJS.Timeout;

    const handleCanvasChange = () => {
      // Debounce to avoid too many checks
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const currentSnapshots = getCurrentElementSnapshots();
        aiActions.checkForStaleElements(currentSnapshots);
      }, 500);
    };

    const handleObjectRemoved = (e: any) => {
      const obj = e.target;
      if (obj?.id || obj?.semanticType) {
        aiActions.handleElementDeleted(obj.id, obj.semanticType);
      }
    };

    canvas.on('object:modified', handleCanvasChange);
    canvas.on('text:changed', handleCanvasChange);
    canvas.on('object:removed', handleObjectRemoved);

    return () => {
      clearTimeout(debounceTimer);
      canvas.off('object:modified', handleCanvasChange);
      canvas.off('text:changed', handleCanvasChange);
      canvas.off('object:removed', handleObjectRemoved);
    };
  }, [canvas, reviewResult, getCurrentElementSnapshots, aiActions]);

  // Sync suggestions with undo/redo operations
  // Track previous historyIndex to detect changes
  const prevHistoryIndexRef = useRef<number | null>(null);

  useEffect(() => {
    if (!canvas || !reviewResult) return;

    // Subscribe to full state changes and check historyIndex manually
    const unsubscribe = useCanvasStore.subscribe((state) => {
      const currentIndex = state.historyIndex;

      // Only trigger if historyIndex actually changed
      if (prevHistoryIndexRef.current !== null && prevHistoryIndexRef.current !== currentIndex) {
        console.log('[Undo/Redo] historyIndex changed:', prevHistoryIndexRef.current, '->', currentIndex);

        // Delay to ensure canvas is fully updated after undo/redo
        // loadFromJSON needs time to reconstruct all objects
        setTimeout(() => {
          const snapshots = getCurrentElementSnapshots();
          console.log('[Undo/Redo] Revalidating applied suggestions, snapshots count:', snapshots.length);
          aiActions.revalidateAppliedSuggestions(snapshots);
        }, 300);
      }

      prevHistoryIndexRef.current = currentIndex;
    });

    // Initialize with current value
    prevHistoryIndexRef.current = useCanvasStore.getState().historyIndex;

    return () => unsubscribe();
  }, [canvas, reviewResult, getCurrentElementSnapshots, aiActions]);

  // Run AI Review (standard or multi-model)
  const runAIReview = useCallback(async (forceMultiModel?: boolean) => {
    if (!canvas || reviewLoading) return;
    setReviewLoading(true);
    aiActions.setReviewError(null);
    setModelReviews(null);
    setFailedModels(null);
    setIsMultiModelResult(false);
    setAnalysisStep("");
    setCurrentModelIndex(0);

    const useMultiModel = forceMultiModel ?? multiModelEnabled;

    try {
      setAnalysisStep("Extracting resume content...");
      const semanticMap = extractSemanticMap(canvas);
      const semanticMapStr = formatSemanticMapForPrompt(semanticMap);

      // Capture element snapshots for change detection
      const elementSnapshots = getCurrentElementSnapshots();

      const endpoint = useMultiModel
        ? "/api/ai/review-multi-model"
        : "/api/ai/review-actionable";

      if (useMultiModel) {
        setAnalysisStep("Sending to multiple AI models...");
        // Show progress for each configured model dynamically
        const models = configuredModels.length > 0
          ? configuredModels
          : [{ name: "AI Model 1", provider: "anthropic" }, { name: "AI Model 2", provider: "openai" }];

        let delay = 1500;
        models.forEach((model, index) => {
          setTimeout(() => {
            setCurrentModelIndex(index);
            setAnalysisStep(`${model.name} analyzing...`);
          }, delay);
          delay += 2000;
        });
        setTimeout(() => {
          setCurrentModelIndex(models.length);
          setAnalysisStep("Synthesizing results...");
        }, delay);
      } else {
        setAnalysisStep("AI analyzing your resume...");
      }

      console.log("[AI Review Client] Sending request to:", endpoint);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeContent: semanticMap.fullText,
          semanticMap: semanticMapStr,
          profession: "",
          targetRole: "",
        }),
      });

      console.log("[AI Review Client] Response received, status:", response.status);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to analyze resume");
      }

      setAnalysisStep("Processing results...");
      const result = await response.json();

      // Track if this is a multi-model result
      if (result.isMultiModel) {
        setIsMultiModelResult(true);
        setModelReviews(result.modelReviews || null);
        setFailedModels(result.failedModels || null);
      } else {
        setFailedModels(null);
      }

      // Pass snapshots to store for change detection
      aiActions.setReviewResult(result, elementSnapshots);
    } catch (error) {
      console.error("AI Review error:", error);
      aiActions.setReviewError(error instanceof Error ? error.message : "Failed to analyze resume");
    } finally {
      setReviewLoading(false);
      setAnalysisStep("");
    }
  }, [canvas, reviewLoading, multiModelEnabled, configuredModels, getCurrentElementSnapshots, aiActions]);

  // Handle highlighting an element on canvas using suggestion data
  const handleHighlightSuggestion = useCallback((suggestion: any) => {
    if (!canvas) return;

    const semanticType = suggestion.targetSemanticType;
    const textContent = suggestion.currentValue;

    // Use text content for more precise matching
    const obj = findElementByTypeAndText(canvas, semanticType, textContent);

    if (obj) {
      // Update object coordinates to ensure selection box is accurate
      obj.setCoords();

      // Select the object - this will visually highlight it
      canvas.setActiveObject(obj);
      canvas.requestRenderAll();

      // Highlight in store (for visual feedback in sidebar) - use suggestion.id for matching
      aiActions.highlightElement(suggestion.id, 3000);
      console.log('[Highlight] Element found and selected, suggestion.id:', suggestion.id);

      // Get bounding rect for accurate scroll position
      const boundingRect = obj.getBoundingRect();

      // Scroll the canvas wrapper to show the element
      const canvasElement = canvas.getElement();
      let scrollContainer: Element | null = canvasElement?.closest('.overflow-auto') || null;

      // Fallback: traverse up to find scrollable parent
      if (!scrollContainer && canvasElement) {
        let parent = canvasElement.parentElement;
        while (parent) {
          const style = window.getComputedStyle(parent);
          if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
            scrollContainer = parent;
            break;
          }
          parent = parent.parentElement;
        }
      }

      if (scrollContainer && boundingRect) {
        // Get canvas wrapper's position within scroll container
        const canvasWrapper = canvasElement?.parentElement?.parentElement;
        const wrapperRect = canvasWrapper?.getBoundingClientRect();
        const containerRect = scrollContainer.getBoundingClientRect();

        // Calculate the canvas's offset within the scrollable area
        // containerRect.top is the visible top of the scroll container
        // wrapperRect.top accounts for current scroll position
        // scrollContainer.scrollTop is the current scroll offset
        const canvasTopInScroller = wrapperRect
          ? (wrapperRect.top - containerRect.top + scrollContainer.scrollTop)
          : 0;

        // Object's position is relative to canvas, so add canvas offset
        const objectAbsoluteTop = canvasTopInScroller + boundingRect.top;

        // Scroll to put the element in the upper third of the view
        const targetScrollTop = objectAbsoluteTop - (scrollContainer.clientHeight / 3);

        scrollContainer.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: 'smooth'
        });
      }
    } else {
      console.warn('[Highlight] Element NOT found for suggestion:', suggestion.id, 'semanticType:', semanticType, 'currentValue preview:', textContent?.substring(0, 50));
    }
  }, [canvas, aiActions]);

  // Handle quick apply of a suggestion
  const handleQuickApply = useCallback((suggestion: any) => {
    if (!canvas || !suggestion.suggestedValue) return;

    const semanticType = suggestion.targetSemanticType;
    const textContent = suggestion.currentValue;

    // Use text content for precise matching
    const obj = findElementByTypeAndText(canvas, semanticType, textContent);

    if (obj && (obj as any).text !== undefined) {
      const currentFullText = (obj as any).text as string;
      const currentValue = suggestion.currentValue || '';
      const suggestedValue = suggestion.suggestedValue;
      // Get actual element ID for undo tracking
      const actualElementId = (obj as any).id || (obj as any).semanticType;

      let newFullText: string;

      // Check if currentValue is a substring of the full text
      if (currentValue && currentFullText.includes(currentValue)) {
        // Replace only the specific part, not the whole text
        newFullText = currentFullText.replace(currentValue, suggestedValue);
        console.log('[QuickApply] Replaced substring:', currentValue.substring(0, 50), '→', suggestedValue.substring(0, 50));
      } else {
        // Fallback: replace entire text (for cases where currentValue IS the full text)
        newFullText = suggestedValue;
        console.log('[QuickApply] Replaced full text');
      }

      console.log('[QuickApply] actualElementId:', actualElementId, 'originalText:', currentFullText.substring(0, 50));

      (obj as any).set("text", newFullText);
      canvas.requestRenderAll();
      saveToHistory();
      // Mark as applied with actual element ID and original text for undo detection
      aiActions.markSuggestionApplied(suggestion.id, newFullText, actualElementId, currentFullText);
    }
  }, [canvas, saveToHistory, aiActions]);


  // Handle dismiss suggestion
  const handleDismissSuggestion = useCallback((suggestion: any) => {
    aiActions.markSuggestionDismissed(suggestion.id);
  }, [aiActions]);

  // Handle re-validate a single suggestion (for stale suggestions)
  const handleRevalidateSuggestion = useCallback(async (suggestion: any) => {
    if (!canvas) return;

    aiActions.setRevalidating(suggestion.id, true);

    try {
      // Find the current element
      const obj = findElementByTypeAndText(
        canvas,
        suggestion.targetSemanticType,
        suggestion.currentValue
      );

      // Get current text (might have changed)
      let currentText = suggestion.currentValue;
      if (obj && (obj as any).text) {
        currentText = (obj as any).text;
      }

      // If element was deleted or text is empty, remove the suggestion
      if (!obj || !currentText?.trim()) {
        aiActions.updateSuggestionAfterRevalidation(suggestion.id, null);
        return;
      }

      // Check if the element now matches the suggested value (user fixed it)
      if (currentText.trim() === suggestion.suggestedValue?.trim()) {
        // Element now matches suggestion - remove it
        aiActions.updateSuggestionAfterRevalidation(suggestion.id, null);
        return;
      }

      // Call lightweight re-validate API
      const response = await fetch("/api/ai/revalidate-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentText,
          originalSuggestion: suggestion,
          semanticType: suggestion.targetSemanticType,
        }),
      });

      if (!response.ok) {
        // On error, just reset to pending state
        aiActions.updateSuggestionAfterRevalidation(suggestion.id, {
          currentValue: currentText,
        });
        return;
      }

      const result = await response.json();

      if (result.stillNeeded) {
        // Update suggestion with new values
        aiActions.updateSuggestionAfterRevalidation(suggestion.id, {
          currentValue: currentText,
          suggestedValue: result.suggestedValue || suggestion.suggestedValue,
          description: result.description || suggestion.description,
        });
      } else {
        // Suggestion no longer needed
        aiActions.updateSuggestionAfterRevalidation(suggestion.id, null);
      }
    } catch (error) {
      console.error("Revalidation error:", error);
      // On error, reset to pending with current text
      const obj = findElementByTypeAndText(
        canvas,
        suggestion.targetSemanticType,
        suggestion.currentValue
      );
      const currentText = obj ? (obj as any).text : suggestion.currentValue;
      aiActions.updateSuggestionAfterRevalidation(suggestion.id, {
        currentValue: currentText,
      });
    }
  }, [canvas, aiActions]);

  // Run AI Formatting
  const runAIFormatting = useCallback(async () => {
    if (!canvas || formattingLoading) return;

    setFormattingLoading(true);
    aiActions.setFormattingError(null);

    try {
      const semanticMap = extractSemanticMap(canvas);

      const response = await fetch("/api/ai/format", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeContent: semanticMap.fullText,
          currentSections: semanticMap.sectionHeaders,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to analyze formatting");
      }

      const result = await response.json();
      aiActions.setFormattingResult(result);
    } catch (error) {
      console.error("AI Formatting error:", error);
      aiActions.setFormattingError(error instanceof Error ? error.message : "Failed to analyze formatting");
    } finally {
      setFormattingLoading(false);
    }
  }, [canvas, formattingLoading, aiActions]);

  // extractCanvasContext is now provided by the useCanvasContext hook

  // Generate summary with AI - callback for the SummaryForm component
  const generateSummaryAI = useCallback(async (fullContext: string): Promise<string | null> => {
    try {
      const response = await fetch("/api/ai/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_summary",
          text: fullContext,
        }),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const generatedText = data.text?.trim() || "";

      // Check if AI returned an error/clarification instead of a summary
      const errorIndicators = [
        "i apologize", "i cannot", "i'm unable", "cannot generate",
        "need more", "please provide", "would you like", "without specific",
        "do not contain", "does not contain", "no professional",
      ];

      const isErrorResponse = errorIndicators.some(indicator =>
        generatedText.toLowerCase().includes(indicator)
      );

      if (isErrorResponse || generatedText.length > 500) {
        return null;
      }

      return generatedText || null;
    } catch {
      return null;
    }
  }, []);

  // Template style detection and photo detection are now handled by hooks

  // Toggle section expansion
  const toggleSection = useCallback((sectionType: SectionType) => {
    setExpandedSection(prev => prev === sectionType ? null : sectionType);
  }, []);

  // Find the lowest point on the canvas
  const findLowestPoint = useCallback((): number => {
    if (!canvas) return 150;

    const objects = canvas.getObjects();
    if (objects.length === 0) return 150;

    let maxBottom = 0;
    objects.forEach((obj: any) => {
      if (obj._isPageBreak || obj.isBackground || obj.selectable === false) return;
      const objBottom = (obj.top || 0) + (obj.height || 0) * (obj.scaleY || 1);
      if (objBottom > maxBottom) {
        maxBottom = objBottom;
      }
    });

    return Math.round((maxBottom + 25) / GRID_SIZE) * GRID_SIZE;
  }, [canvas]);

  // Section prefixes for finding existing sections
  const sectionPrefixesMap: Record<SectionType, string[]> = useMemo(() => ({
    experience: ["experience_"],
    education: ["education_"],
    skills: ["skills_", "skill_", "technical_skills", "soft_skills"],
    contact: ["email", "phone", "location", "linkedin", "github", "website", "portfolio", "twitter", "telegram"],
    summary: ["summary", "objective"],
    certifications: ["certification"],
    projects: ["project"],
  }), []);

  // Find last element bottom for a section (for positioning new items)
  const findSectionBottom = useCallback((sectionType: SectionType): number => {
    if (!canvas) return 0;

    const objects = canvas.getObjects().filter((obj: any) =>
      !obj._isPageBreak && !obj.isBackground && obj.selectable !== false
    );

    const prefixes = sectionPrefixesMap[sectionType];
    let maxBottom = 0;

    objects.forEach((obj: any) => {
      if (!obj.semanticType) return;
      const matches = prefixes.some(prefix =>
        obj.semanticType === prefix || obj.semanticType.startsWith(prefix)
      );
      if (matches) {
        const objBottom = (obj.top || 0) + (obj.height || 0) * (obj.scaleY || 1);
        if (objBottom > maxBottom) {
          maxBottom = objBottom;
        }
      }
    });

    return maxBottom;
  }, [canvas, sectionPrefixesMap]);

  // Push elements below a certain point down
  const pushElementsBelow = useCallback((startY: number, pushAmount: number) => {
    if (!canvas) return;

    const objects = canvas.getObjects().filter((obj: any) =>
      !obj._isPageBreak && !obj.isBackground && obj.selectable !== false
    );

    objects.forEach((obj: any) => {
      const objTop = obj.top || 0;
      if (objTop >= startY) {
        obj.set('top', objTop + pushAmount);
        obj.setCoords();
      }
    });
  }, [canvas]);

  // Add a text element to canvas with template styles
  const addTextElement = useCallback((
    text: string,
    top: number,
    options: {
      semanticType: string;
      styleType: "sectionHeader" | "jobTitle" | "company" | "dates" | "body" | "link";
      fontWeight?: string;
      width?: number;
      isTextbox?: boolean;
    }
  ): number => {
    if (!canvas) return 0;

    const {
      semanticType,
      styleType,
      fontWeight = "normal",
      width,
      isTextbox = false,
    } = options;

    // Get styles from detected template
    const fill = templateStyle.colors[styleType];
    const fontSize = templateStyle.fontSizes[styleType === "link" ? "body" : styleType];
    const fontFamily = styleType === "sectionHeader" || styleType === "jobTitle"
      ? templateStyle.fonts.heading
      : templateStyle.fonts.body;
    const lineHeight = templateStyle.layout.lineHeight;

    let element;

    if (isTextbox || width) {
      element = new Textbox(text, {
        left: MARGIN_LEFT,
        top,
        fontSize,
        fontFamily,
        fontWeight,
        fill,
        width: width || CONTENT_WIDTH,
        lineHeight,
        originX: "left",
        originY: "top",
      });
    } else {
      element = new IText(text, {
        left: MARGIN_LEFT,
        top,
        fontSize,
        fontFamily,
        fontWeight,
        fill,
        charSpacing: fontWeight === "bold" && fontSize <= 12 ? 50 : 0,
        originX: "left",
        originY: "top",
      });
    }

    (element as any).id = nanoid();
    (element as any).semanticType = semanticType;
    (element as any).semanticGroup = `${semanticType}_${Date.now()}`;

    canvas.add(element);

    const height = element.height || 0;
    return height * (element.scaleY || 1);
  }, [canvas, templateStyle]);

  // Handle adding section from form - now receives data directly from form component
  const handleAddSection = useCallback((sectionType: SectionType, data: any) => {
    if (!canvas) return;

    const { isLoading } = useCanvasStore.getState();
    if (isLoading) return;

    const exists = sectionExists[sectionType];
    const lastElementBottom = findSectionBottom(sectionType);

    let startY: number;
    let needsHeader = !exists;

    if (exists) {
      startY = Math.round((lastElementBottom + templateStyle.layout.itemSpacing) / GRID_SIZE) * GRID_SIZE;
    } else {
      startY = findLowestPoint();
    }

    // Calculate total height
    let totalHeight = 0;
    const measurements: { height: number }[] = [];

    if (needsHeader) {
      measurements.push({ height: 20 });
    }

    switch (sectionType) {
      case "experience":
        measurements.push({ height: 18 });
        if (data.company) measurements.push({ height: 16 });
        if (data.dates) measurements.push({ height: 14 });
        if (data.description) measurements.push({ height: Math.max(40, data.description.split('\n').length * 14) });
        break;
      case "education":
        measurements.push({ height: 18 });
        if (data.institution) measurements.push({ height: 16 });
        if (data.dates) measurements.push({ height: 14 });
        break;
      case "skills":
        if (data.category) measurements.push({ height: 16 });
        measurements.push({ height: Math.max(20, Math.ceil(data.skills.length / 50) * 14) });
        break;
      case "contact":
        let contactLines = 0;
        if (data.email) contactLines++;
        if (data.phone) contactLines++;
        if (data.location) contactLines++;
        if (data.linkedIn) contactLines++;
        if (data.gitHub) contactLines++;
        if (data.website) contactLines++;
        measurements.push({ height: contactLines * 16 });
        break;
      case "summary":
        measurements.push({ height: Math.max(40, Math.ceil(data.text.length / 80) * 14) });
        break;
      case "certifications":
        measurements.push({ height: 16 });
        if (data.issuer || data.date) measurements.push({ height: 14 });
        break;
      case "projects":
        measurements.push({ height: 18 });
        if (data.description) measurements.push({ height: Math.max(30, data.description.split('\n').length * 14) });
        if (data.url) measurements.push({ height: 14 });
        break;
    }

    totalHeight = measurements.reduce((sum, m) => sum + m.height + 5, 0) + templateStyle.layout.sectionSpacing;

    // Push existing content below if needed
    if (!exists) {
      const elementsBelow = canvas.getObjects().filter((obj: any) => {
        if (obj._isPageBreak || obj.isBackground || obj.selectable === false) return false;
        return (obj.top || 0) >= startY - 10;
      });

      if (elementsBelow.length > 0) {
        pushElementsBelow(startY - 10, totalHeight);
      }
    }

    let currentY = startY;

    // Add section header if needed
    if (needsHeader && sectionType !== "contact" && sectionType !== "summary") {
      addTextElement(sectionHeaderTexts[sectionType], currentY, {
        semanticType: sectionHeaders[sectionType],
        styleType: "sectionHeader",
        fontWeight: "bold",
      });
      currentY += templateStyle.layout.sectionSpacing;
    }

    // Add content based on section type
    switch (sectionType) {
      case "experience":
        addTextElement(data.jobTitle, currentY, {
          semanticType: "experience_title",
          styleType: "jobTitle",
          fontWeight: "bold",
        });
        currentY += 18;

        if (data.company) {
          addTextElement(data.company, currentY, {
            semanticType: "experience_company",
            styleType: "company",
          });
          currentY += 16;
        }

        if (data.dates) {
          addTextElement(data.dates, currentY, {
            semanticType: "experience_dates",
            styleType: "dates",
          });
          currentY += 14;
        }

        if (data.description) {
          addTextElement(data.description, currentY, {
            semanticType: "experience_description",
            styleType: "body",
            width: CONTENT_WIDTH,
            isTextbox: true,
          });
        }
        break;

      case "education":
        addTextElement(data.degree, currentY, {
          semanticType: "education_degree",
          styleType: "jobTitle",
          fontWeight: "bold",
        });
        currentY += 18;

        if (data.institution) {
          addTextElement(data.institution, currentY, {
            semanticType: "education_institution",
            styleType: "company",
          });
          currentY += 16;
        }

        if (data.dates) {
          addTextElement(data.dates, currentY, {
            semanticType: "education_dates",
            styleType: "dates",
          });
        }
        break;

      case "skills":
        if (data.category) {
          addTextElement(data.category + ":", currentY, {
            semanticType: "skill_category",
            styleType: "jobTitle",
            fontWeight: "bold",
          });
          currentY += 16;
        }

        addTextElement(data.skills, currentY, {
          semanticType: "skill_list",
          styleType: "body",
          width: CONTENT_WIDTH,
          isTextbox: true,
        });
        break;

      case "contact":
        if (data.email) {
          addTextElement(data.email, currentY, {
            semanticType: "email",
            styleType: "body",
          });
          currentY += 16;
        }

        if (data.phone) {
          addTextElement(data.phone, currentY, {
            semanticType: "phone",
            styleType: "body",
          });
          currentY += 16;
        }

        if (data.location) {
          addTextElement(data.location, currentY, {
            semanticType: "location",
            styleType: "body",
          });
          currentY += 16;
        }

        if (data.linkedIn) {
          addTextElement(data.linkedIn, currentY, {
            semanticType: "linkedin",
            styleType: "link",
          });
          currentY += 16;
        }

        if (data.gitHub) {
          addTextElement(data.gitHub, currentY, {
            semanticType: "github",
            styleType: "link",
          });
          currentY += 16;
        }

        if (data.website) {
          addTextElement(data.website, currentY, {
            semanticType: "website",
            styleType: "link",
          });
        }
        break;

      case "summary":
        addTextElement(data.text, currentY, {
          semanticType: "summary",
          styleType: "body",
          width: CONTENT_WIDTH,
          isTextbox: true,
        });
        break;

      case "certifications":
        addTextElement(data.name, currentY, {
          semanticType: "certification_name",
          styleType: "jobTitle",
          fontWeight: "bold",
        });
        currentY += 16;

        if (data.issuer || data.date) {
          const issuerText = [data.issuer, data.date].filter(Boolean).join(" - ");
          addTextElement(issuerText, currentY, {
            semanticType: "certification_issuer",
            styleType: "dates",
          });
        }
        break;

      case "projects":
        addTextElement(data.name, currentY, {
          semanticType: "project_name",
          styleType: "jobTitle",
          fontWeight: "bold",
        });
        currentY += 18;

        if (data.description) {
          addTextElement(data.description, currentY, {
            semanticType: "project_description",
            styleType: "body",
            width: CONTENT_WIDTH,
            isTextbox: true,
          });
          currentY += 35;
        }

        if (data.url) {
          addTextElement(data.url, currentY, {
            semanticType: "project_url",
            styleType: "link",
          });
        }
        break;
    }

    canvas.renderAll();
    saveToHistory();

    // Request canvas resize to add new page if content overflows
    requestCanvasResize();
    // Forms now reset themselves after successful submit
  }, [canvas, sectionExists, findSectionBottom, findLowestPoint, templateStyle, pushElementsBelow, addTextElement, saveToHistory, requestCanvasResize]);

  // Create memoized submit handlers for each section type
  const handleExperienceSubmit = useCallback((data: any) => handleAddSection("experience", data), [handleAddSection]);
  const handleEducationSubmit = useCallback((data: any) => handleAddSection("education", data), [handleAddSection]);
  const handleSkillsSubmit = useCallback((data: any) => handleAddSection("skills", data), [handleAddSection]);
  const handleContactSubmit = useCallback((data: any) => handleAddSection("contact", data), [handleAddSection]);
  const handleSummarySubmit = useCallback((data: any) => handleAddSection("summary", data), [handleAddSection]);
  const handleCertificationSubmit = useCallback((data: any) => handleAddSection("certifications", data), [handleAddSection]);
  const handleProjectSubmit = useCallback((data: any) => handleAddSection("projects", data), [handleAddSection]);

  // Check if photo already exists on canvas - now using hook
  const findExistingPhoto = useCallback((): any => {
    if (!canvas) return null;
    return canvas.getObjects().find((obj: any) =>
      obj.semanticType === "photo" ||
      obj.isPhoto === true ||
      obj.type === "image"
    );
  }, [canvas]);

  // Handle photo file selection
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      console.error("Invalid file type");
      return;
    }

    e.target.value = "";

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setPhotoEditorImageUrl(dataUrl);
        setPhotoEditorOpen(true);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle edited photo from modal
  const handlePhotoEditorSave = async (editedImageUrl: string) => {
    if (!canvas) return;

    setIsUploadingPhoto(true);

    try {
      const existingPhoto = findExistingPhoto();
      let position: { left: number; top: number };
      let existingSize = 120;

      if (existingPhoto) {
        position = { left: existingPhoto.left || MARGIN_LEFT, top: existingPhoto.top || 150 };
        const existingRect = existingPhoto.getBoundingRect();
        existingSize = Math.max(existingRect.width, existingRect.height) || 120;
        canvas.remove(existingPhoto);
      } else {
        position = { left: MARGIN_LEFT, top: 50 };
      }

      const img = await FabricImage.fromURL(editedImageUrl);
      if (!img) {
        setIsUploadingPhoto(false);
        return;
      }

      const imgW = img.width || 480;
      const imgH = img.height || 480;
      const targetSize = existingPhoto ? existingSize : 120;
      const scale = targetSize / Math.max(imgW, imgH);

      img.set({
        left: position.left,
        top: position.top,
        scaleX: scale,
        scaleY: scale,
        originX: "left",
        originY: "top",
        objectCaching: true,
      });

      (img as any).id = nanoid();
      (img as any).semanticType = "photo";
      (img as any).semanticGroup = `personal_${Date.now()}`;
      (img as any).photoShape = "rounded";
      (img as any).isPhoto = true;

      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
      saveToHistory();
      requestCanvasResize();
    } catch (error) {
      console.error("Error adding photo:", error);
    }

    setIsUploadingPhoto(false);
  };

  // Add personal info (name, title)
  const addPersonalInfo = useCallback((type: "name" | "title") => {
    if (!canvas) return;

    const { isLoading } = useCanvasStore.getState();
    if (isLoading) return;

    const config = type === "name"
      ? { text: "Your Name", fontSize: 28, fontWeight: "bold", fill: templateStyle.colors.jobTitle, top: 50 }
      : { text: "Professional Title", fontSize: 14, fontWeight: "normal", fill: templateStyle.colors.dates, top: 85 };

    const element = new IText(config.text, {
      left: MARGIN_LEFT,
      top: config.top,
      fontSize: config.fontSize,
      fontFamily: templateStyle.fonts.heading,
      fontWeight: config.fontWeight,
      fill: config.fill,
      originX: "left",
      originY: "top",
    });

    (element as any).id = nanoid();
    (element as any).semanticType = type;
    (element as any).semanticGroup = `personal_${Date.now()}`;

    canvas.add(element);
    canvas.setActiveObject(element);
    canvas.renderAll();
    saveToHistory();
    requestCanvasResize();
  }, [canvas, templateStyle, saveToHistory, requestCanvasResize]);

  // Add custom text element
  const addCustomText = useCallback(() => {
    if (!canvas) return;

    const { isLoading } = useCanvasStore.getState();
    if (isLoading) return;

    const startY = findLowestPoint();

    const element = new Textbox("Custom text", {
      left: MARGIN_LEFT,
      top: startY,
      fontSize: templateStyle.fontSizes.body,
      fontFamily: templateStyle.fonts.body,
      fill: templateStyle.colors.body,
      width: CONTENT_WIDTH,
      lineHeight: templateStyle.layout.lineHeight,
      originX: "left",
      originY: "top",
    });

    (element as any).id = nanoid();
    (element as any).semanticType = "custom_text";
    (element as any).semanticGroup = `custom_${Date.now()}`;

    canvas.add(element);
    canvas.setActiveObject(element);
    canvas.renderAll();
    saveToHistory();
    requestCanvasResize();
  }, [canvas, templateStyle, findLowestPoint, saveToHistory, requestCanvasResize]);

  // Render the appropriate form component for a section type
  // Using memoized form components to prevent re-renders
  const renderSectionForm = useCallback((sectionType: SectionType) => {
    const exists = sectionExists[sectionType];

    switch (sectionType) {
      case "experience":
        return <ExperienceForm exists={exists} onSubmit={handleExperienceSubmit} />;
      case "education":
        return <EducationForm exists={exists} onSubmit={handleEducationSubmit} />;
      case "skills":
        return <SkillsForm exists={exists} onSubmit={handleSkillsSubmit} />;
      case "contact":
        return <ContactForm exists={exists} onSubmit={handleContactSubmit} />;
      case "summary":
        return (
          <SummaryForm
            exists={exists}
            onSubmit={handleSummarySubmit}
            onGenerateAI={generateSummaryAI}
            extractCanvasContext={extractCanvasContext}
          />
        );
      case "certifications":
        return <CertificationForm exists={exists} onSubmit={handleCertificationSubmit} />;
      case "projects":
        return <ProjectForm exists={exists} onSubmit={handleProjectSubmit} />;
      default:
        return null;
    }
  }, [
    sectionExists,
    handleExperienceSubmit,
    handleEducationSubmit,
    handleSkillsSubmit,
    handleContactSubmit,
    handleSummarySubmit,
    handleCertificationSubmit,
    handleProjectSubmit,
    generateSummaryAI,
    extractCanvasContext,
  ]);

  return (
    <div className="flex h-full w-72 min-w-72 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      {/* Tab Switcher */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab("sections")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative",
            activeTab === "sections"
              ? "text-zinc-900 dark:text-zinc-50 border-b-2 border-zinc-900 dark:border-zinc-50 -mb-px"
              : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
          )}
        >
          <FileText className="w-4 h-4" />
          <span>Sections</span>
        </button>
        <button
          onClick={() => setActiveTab("ai-review")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative",
            activeTab === "ai-review"
              ? "text-zinc-900 dark:text-zinc-50 border-b-2 border-zinc-900 dark:border-zinc-50 -mb-px"
              : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
          )}
        >
          <Brain className="w-4 h-4" />
          <span>AI Review</span>
          {reviewResult && reviewResult.suggestions.length > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-amber-500 rounded-full" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
          {activeTab === "ai-review" ? (
            <div className="p-3 space-y-4">
              {/* AI Review Content */}
              {!reviewResult && !reviewLoading && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                    <Brain className="w-8 h-8 text-violet-600 dark:text-violet-400" />
                  </div>
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                    AI Resume Analysis
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 px-4">
                    Get actionable suggestions to improve your resume based on industry best practices
                  </p>

                  {/* Multi-Model Toggle (Premium Feature) */}
                  {multiModelAvailable && (
                    <div className="mb-4 mx-4">
                      <button
                        onClick={() => setMultiModelEnabled(!multiModelEnabled)}
                        className={cn(
                          "w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border transition-all",
                          multiModelEnabled
                            ? "border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 dark:border-amber-700"
                            : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Layers className={cn(
                            "w-4 h-4",
                            multiModelEnabled ? "text-amber-600" : "text-zinc-400"
                          )} />
                          <span className={cn(
                            "text-xs font-medium",
                            multiModelEnabled ? "text-amber-700 dark:text-amber-300" : "text-zinc-600 dark:text-zinc-400"
                          )}>
                            Multi-AI Analysis
                          </span>
                          <Crown className="w-3 h-3 text-amber-500" />
                        </div>
                        <div className={cn(
                          "w-8 h-4 rounded-full transition-colors relative",
                          multiModelEnabled ? "bg-amber-500" : "bg-zinc-300 dark:bg-zinc-600"
                        )}>
                          <div className={cn(
                            "absolute w-3 h-3 rounded-full bg-white top-0.5 transition-all shadow-sm",
                            multiModelEnabled ? "left-4" : "left-0.5"
                          )} />
                        </div>
                      </button>
                      {multiModelEnabled && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1.5 text-left px-1">
                          Multiple AI models will analyze your resume for higher quality results
                        </p>
                      )}
                    </div>
                  )}

                  <Button
                    onClick={() => runAIReview()}
                    disabled={reviewLoading}
                    className={cn(
                      "text-white disabled:opacity-70",
                      multiModelEnabled
                        ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                        : "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700"
                    )}
                  >
                    {multiModelEnabled ? (
                      <>
                        <Layers className="w-4 h-4 mr-2" />
                        Multi-AI Analysis
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Analyze Resume
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Loading State */}
              {reviewLoading && (
                <div className="text-center py-8">
                  <div className="relative w-16 h-16 mx-auto mb-4">
                    <div className={cn(
                      "absolute inset-0 rounded-full border-4",
                      multiModelEnabled ? "border-amber-200 dark:border-amber-900" : "border-violet-200 dark:border-violet-900"
                    )} />
                    <div className={cn(
                      "absolute inset-0 rounded-full border-4 border-t-transparent animate-spin",
                      multiModelEnabled ? "border-amber-500" : "border-violet-600"
                    )} />
                    {multiModelEnabled ? (
                      <Layers className="absolute inset-0 m-auto w-6 h-6 text-amber-500" />
                    ) : (
                      <Brain className="absolute inset-0 m-auto w-6 h-6 text-violet-600" />
                    )}
                  </div>

                  {/* Current Step */}
                  <div className={cn(
                    "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-3",
                    multiModelEnabled
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                      : "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                  )}>
                    <span className="relative flex h-2 w-2">
                      <span className={cn(
                        "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                        multiModelEnabled ? "bg-amber-400" : "bg-violet-400"
                      )} />
                      <span className={cn(
                        "relative inline-flex rounded-full h-2 w-2",
                        multiModelEnabled ? "bg-amber-500" : "bg-violet-500"
                      )} />
                    </span>
                    {analysisStep || "Initializing..."}
                  </div>

                  {/* Multi-model progress steps */}
                  {multiModelEnabled && configuredModels.length > 0 && (
                    <div className="mt-4 mx-4 space-y-2">
                      {configuredModels.map((model, index) => {
                        const isActive = currentModelIndex === index;
                        const isCompleted = currentModelIndex > index;
                        const isSynthesizing = analysisStep.includes("Synth") || analysisStep.includes("Processing");

                        return (
                          <div
                            key={index}
                            className={cn(
                              "flex items-center gap-2 text-xs transition-opacity duration-300",
                              isActive || isCompleted || isSynthesizing
                                ? "text-zinc-700 dark:text-zinc-300"
                                : "text-zinc-400 dark:text-zinc-600"
                            )}
                          >
                            <div className={cn(
                              "w-4 h-4 rounded-full flex items-center justify-center text-[10px]",
                              isActive || isCompleted || isSynthesizing
                                ? "bg-amber-500 text-white"
                                : "bg-zinc-200 dark:bg-zinc-700"
                            )}>
                              {isCompleted || isSynthesizing ? "✓" : index + 1}
                            </div>
                            <span>{model.name}</span>
                            {isActive && !isSynthesizing && <Loader2 className="w-3 h-3 animate-spin ml-auto" />}
                          </div>
                        );
                      })}

                      {/* Synthesis step */}
                      <div className={cn(
                        "flex items-center gap-2 text-xs transition-opacity duration-300",
                        analysisStep.includes("Synth") || analysisStep.includes("Processing")
                          ? "text-zinc-700 dark:text-zinc-300"
                          : "text-zinc-400 dark:text-zinc-600"
                      )}>
                        <div className={cn(
                          "w-4 h-4 rounded-full flex items-center justify-center text-[10px]",
                          analysisStep.includes("Processing")
                            ? "bg-amber-500 text-white"
                            : analysisStep.includes("Synth")
                              ? "bg-amber-500 text-white"
                              : "bg-zinc-200 dark:bg-zinc-700"
                        )}>
                          {analysisStep.includes("Processing") ? "✓" : configuredModels.length + 1}
                        </div>
                        <span>Synthesizing results</span>
                        {analysisStep.includes("Synth") && <Loader2 className="w-3 h-3 animate-spin ml-auto" />}
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-4">
                    {multiModelEnabled ? "Combining insights from multiple AI models" : "This may take a moment"}
                  </p>
                </div>
              )}

              {/* Error State */}
              {reviewError && (
                <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
                  <p className="text-sm text-rose-700 dark:text-rose-400">{reviewError}</p>
                  <Button
                    onClick={() => runAIReview()}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Try Again
                  </Button>
                </div>
              )}

              {/* Review Results */}
              {reviewResult && (
                <div className="space-y-4">
                  {/* Multi-Model Badge */}
                  {isMultiModelResult && (
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                          Multi-AI Analysis
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200/70 dark:bg-amber-800/50 text-amber-700 dark:text-amber-300">
                        {(reviewResult as any).modelCount || 2} models
                      </span>
                    </div>
                  )}

                  {/* Score and Industry */}
                  <div className={cn(
                    "flex items-center gap-4 p-3 rounded-xl border",
                    isMultiModelResult
                      ? "bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-900/10 dark:to-orange-900/10 border-amber-200 dark:border-amber-800"
                      : "bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 border-zinc-200 dark:border-zinc-700"
                  )}>
                    <ScoreBadge score={reviewResult.overallScore} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Score</p>
                      <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                        {reviewResult.overallScore}/100
                      </p>
                      {reviewResult.industryDetected && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          Detected: {reviewResult.industryDetected}
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={() => runAIReview()}
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                    >
                      <RefreshCw className={cn("w-4 h-4", reviewLoading && "animate-spin")} />
                    </Button>
                  </div>

                  {/* Strengths */}
                  {reviewResult.strengths && reviewResult.strengths.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <h5 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                          Strengths
                        </h5>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {reviewResult.strengths.map((strength, i) => (
                          <StrengthBadge key={i} text={strength} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggestions */}
                  {reviewResult.suggestions && reviewResult.suggestions.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-amber-600" />
                        <h5 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                          Suggestions ({reviewResult.suggestions.filter(s => s.status !== 'dismissed').length})
                        </h5>
                        {/* Show applied count if any */}
                        {reviewResult.suggestions.filter(s => s.status === 'applied').length > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            {reviewResult.suggestions.filter(s => s.status === 'applied').length} applied
                          </span>
                        )}
                        {/* Show stale count if any */}
                        {reviewResult.suggestions.filter(s => s.status === 'stale').length > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            {reviewResult.suggestions.filter(s => s.status === 'stale').length} outdated
                          </span>
                        )}
                      </div>
                      <div className="space-y-2">
                        {/* Show pending/stale suggestions first, then applied */}
                        {reviewResult.suggestions
                          .filter(s => s.status !== 'dismissed')
                          .sort((a, b) => {
                            const order = { pending: 0, stale: 1, applied: 2, dismissed: 3 };
                            return (order[a.status || 'pending'] || 0) - (order[b.status || 'pending'] || 0);
                          })
                          .map((suggestion) => (
                          <SuggestionCard
                            key={suggestion.id}
                            suggestion={suggestion}
                            onHighlight={handleHighlightSuggestion}
                            onQuickApply={handleQuickApply}
                            onDismiss={handleDismissSuggestion}
                            onRevalidate={handleRevalidateSuggestion}
                            isHighlighted={highlightedElementId === suggestion.id}
                            isRevalidating={revalidatingIds.has(suggestion.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Missing Sections */}
                  {reviewResult.missingSections && reviewResult.missingSections.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Plus className="w-4 h-4 text-violet-600" />
                        <h5 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                          Missing Sections
                        </h5>
                      </div>
                      <div className="space-y-2">
                        {reviewResult.missingSections.map((section, i) => (
                          <MissingSectionCard
                            key={i}
                            section={section.section}
                            importance={section.importance}
                            reason={section.reason}
                            onAdd={() => {
                              // Switch to sections tab and expand the relevant section
                              setActiveTab("sections");
                              // Could auto-expand the relevant section here
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Debug Panel - Individual Model Reviews */}
                  {isMultiModelResult && (
                    <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
                      <button
                        onClick={() => setShowDebugPanel(!showDebugPanel)}
                        className="flex items-center justify-between w-full mb-2"
                      >
                        <div className="flex items-center gap-2">
                          <Code className="w-4 h-4 text-zinc-500" />
                          <h5 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                            Model Details
                          </h5>
                          {modelReviews && modelReviews.length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                              {modelReviews.length} ok
                            </span>
                          )}
                          {failedModels && failedModels.length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                              {failedModels.length} failed
                            </span>
                          )}
                        </div>
                        <ChevronDown className={cn(
                          "w-4 h-4 text-zinc-400 transition-transform",
                          showDebugPanel ? "rotate-180" : ""
                        )} />
                      </button>

                      {showDebugPanel && (
                        <div className="space-y-3">
                          {/* Show successful model reviews */}
                          {modelReviews && modelReviews.length > 0 && (
                            <>
                              <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                Successful ({modelReviews.length})
                              </p>
                              {modelReviews.map((review: any, index: number) => (
                                <div
                                  key={index}
                                  className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                        {review.modelName}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] text-zinc-500">
                                        {review.duration}ms
                                      </span>
                                      <span className={cn(
                                        "text-xs font-bold",
                                        review.review.overallScore >= 80 ? "text-emerald-600" :
                                        review.review.overallScore >= 60 ? "text-amber-600" : "text-rose-600"
                                      )}>
                                        {review.review.overallScore}/100
                                      </span>
                                    </div>
                                  </div>
                                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                                    {review.provider}/{review.modelId}
                                  </p>
                                  {review.review.industryDetected && (
                                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                                      Industry: {review.review.industryDetected}
                                    </p>
                                  )}
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">
                                      {review.review.suggestions?.length || 0} suggestions
                                    </span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                                      {review.review.strengths?.length || 0} strengths
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </>
                          )}

                          {/* Show failed models */}
                          {failedModels && failedModels.length > 0 && (
                            <>
                              <p className="text-[10px] font-medium text-rose-600 dark:text-rose-400 uppercase tracking-wider mt-3">
                                Failed ({failedModels.length})
                              </p>
                              {failedModels.map((model: any, index: number) => (
                                <div
                                  key={index}
                                  className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800"
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                      {model.modelName}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                                    {model.provider}/{model.modelId}
                                  </p>
                                  <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 break-words">
                                    Error: {model.error}
                                  </p>
                                </div>
                              ))}
                            </>
                          )}

                          {/* No data message */}
                          {(!modelReviews || modelReviews.length === 0) && (!failedModels || failedModels.length === 0) && (
                            <div className="p-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Model details not available
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Smart Formatting Section */}
                  <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
                    <div className="flex items-center gap-2 mb-3">
                      <Palette className="w-4 h-4 text-fuchsia-600" />
                      <h5 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                        Smart Formatting
                      </h5>
                    </div>

                    {!formattingResult && !formattingLoading && (
                      <Button
                        onClick={runAIFormatting}
                        variant="outline"
                        className="w-full"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Analyze & Suggest Style
                      </Button>
                    )}

                    {formattingLoading && (
                      <div className="flex items-center justify-center gap-2 py-3 text-sm text-zinc-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Analyzing style...</span>
                      </div>
                    )}

                    {formattingResult && (
                      <div className="p-3 rounded-lg bg-fuchsia-50 dark:bg-fuchsia-900/20 border border-fuchsia-200 dark:border-fuchsia-800">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-fuchsia-200 dark:bg-fuchsia-800 text-fuchsia-700 dark:text-fuchsia-300">
                            {formattingResult.detectedIndustry}
                          </span>
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                            {formattingResult.detectedLevel}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3">
                          {formattingResult.rationale}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            if (canvas && formattingResult) {
                              applyFullFormatting(canvas, formattingResult, {
                                applyColors: true,
                                applyFonts: true,
                                applySpacing: true,
                                reorderSections: false, // Optional: user can enable this
                              });
                              saveToHistory();
                            }
                          }}
                        >
                          Apply Recommended Style
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
        {/* Quick Add - Personal Info */}
        <div className="border-b border-zinc-100 p-3 dark:border-zinc-800/50">
          <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">Quick Add</p>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => photoInputRef.current?.click()}
              disabled={isUploadingPhoto}
              className="flex items-center gap-2 rounded-md border border-zinc-200 px-2.5 py-2 text-left text-xs transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              {isUploadingPhoto ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />
              ) : (
                <Camera className="h-3.5 w-3.5 text-zinc-500" />
              )}
              <span className="text-zinc-700 dark:text-zinc-300">
                {hasExistingPhoto ? "Replace" : "Photo"}
              </span>
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />

            <button
              onClick={() => addPersonalInfo("name")}
              className="flex items-center gap-2 rounded-md border border-zinc-200 px-2.5 py-2 text-left text-xs transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              <User className="h-3.5 w-3.5 text-zinc-500" />
              <span className="text-zinc-700 dark:text-zinc-300">Name</span>
            </button>

            <button
              onClick={() => addPersonalInfo("title")}
              className="flex items-center gap-2 rounded-md border border-zinc-200 px-2.5 py-2 text-left text-xs transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              <Briefcase className="h-3.5 w-3.5 text-zinc-500" />
              <span className="text-zinc-700 dark:text-zinc-300">Title</span>
            </button>

            <button
              onClick={addCustomText}
              className="flex items-center gap-2 rounded-md border border-zinc-200 px-2.5 py-2 text-left text-xs transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              <Type className="h-3.5 w-3.5 text-zinc-500" />
              <span className="text-zinc-700 dark:text-zinc-300">Text</span>
            </button>
          </div>
        </div>

        {/* Accordion Sections */}
        <div className="p-2">
          <p className="mb-2 px-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">Sections</p>
          <div className="space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              const isExpanded = expandedSection === section.type;
              const exists = sectionExists[section.type];

              return (
                <div
                  key={section.type}
                  className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700"
                >
                  {/* Accordion Header */}
                  <button
                    onClick={() => toggleSection(section.type)}
                    className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
                      isExpanded
                        ? "bg-zinc-100 dark:bg-zinc-800"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    }`}
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-200/70 dark:bg-zinc-700">
                      <Icon className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400" />
                    </div>
                    <div className="flex-1">
                      <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        {section.label}
                      </span>
                      {exists && !isExpanded && (
                        <span className="block text-[10px] text-emerald-600 dark:text-emerald-400">
                          Has entries
                        </span>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-zinc-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-zinc-400" />
                    )}
                  </button>

                  {/* Accordion Content */}
                  {isExpanded && (
                    <div className="border-t border-zinc-200 bg-zinc-50/50 dark:border-zinc-700 dark:bg-zinc-900/50">
                      {renderSectionForm(section.type)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
            </div>
          )}
      </div>

      {/* Photo Editor Modal */}
      <PhotoEditorModal
        isOpen={photoEditorOpen}
        onClose={() => setPhotoEditorOpen(false)}
        imageUrl={photoEditorImageUrl}
        onSave={handlePhotoEditorSave}
      />
    </div>
  );
}
