import { create } from "zustand";

// Types for actionable review
export type SuggestionStatus = 'pending' | 'applied' | 'stale' | 'dismissed';

export interface ActionableSuggestion {
  id: string;
  type: 'text_improvement' | 'missing_section' | 'reorder' | 'add_content';
  severity: 'critical' | 'important' | 'suggestion';
  title: string;
  description: string;
  targetSemanticType?: string;
  targetElementId?: string;
  currentValue?: string;
  suggestedValue?: string;
  canQuickApply: boolean;
  previewRequired: boolean;
  // Runtime state (not from API)
  status?: SuggestionStatus;
  appliedAt?: number;
}

export interface MissingSection {
  section: string;
  importance: 'required' | 'recommended' | 'optional';
  reason: string;
}

export interface ActionableReviewResult {
  overallScore: number;
  industryDetected: string | null;
  suggestions: ActionableSuggestion[];
  missingSections: MissingSection[];
  strengths: string[];
}

// Types for formatting
export interface FormattingColors {
  primary: string;
  secondary: string;
  text: string;
  textLight: string;
  accent: string;
  background: string;
}

export interface FormattingFonts {
  heading: string;
  body: string;
}

export interface FormattingFontSizes {
  name: number;
  title: number;
  sectionHeader: number;
  jobTitle: number;
  body: number;
  small: number;
}

export interface FormattingSpacing {
  sectionSpacing: number;
  lineHeight: number;
  itemSpacing: number;
}

export interface FormattingStyling {
  colors: FormattingColors;
  fonts: FormattingFonts;
  fontSizes: FormattingFontSizes;
  spacing: FormattingSpacing;
}

export interface SectionChange {
  section: string;
  reason: string;
}

export interface FormattingResult {
  detectedIndustry: string;
  detectedLevel: 'entry' | 'mid' | 'senior' | 'executive';
  recommendedLayout: string;
  styling: FormattingStyling;
  sectionOrder: string[];
  sectionsToAdd: SectionChange[];
  sectionsToRemove: SectionChange[];
  rationale: string;
}

// Track element snapshots for change detection
interface ElementSnapshot {
  id: string;
  text: string;
  semanticType: string;
}

interface AIFeaturesStore {
  // Review state
  reviewLoading: boolean;
  reviewResult: ActionableReviewResult | null;
  reviewError: string | null;
  reviewTimestamp: number | null;

  // Element snapshots (captured at review time)
  elementSnapshots: Map<string, ElementSnapshot>;

  // Formatting state
  formattingLoading: boolean;
  formattingResult: FormattingResult | null;
  formattingError: string | null;

  // Highlighting state
  highlightedElementId: string | null;
  highlightTimeout: NodeJS.Timeout | null;

  // Partial re-review state
  revalidatingIds: Set<string>;

  // Review actions
  setReviewLoading: (loading: boolean) => void;
  setReviewResult: (result: ActionableReviewResult | null, snapshots?: ElementSnapshot[]) => void;
  setReviewError: (error: string | null) => void;
  clearReview: () => void;

  // Formatting actions
  setFormattingLoading: (loading: boolean) => void;
  setFormattingResult: (result: FormattingResult | null) => void;
  setFormattingError: (error: string | null) => void;
  clearFormatting: () => void;

  // Highlighting actions
  highlightElement: (elementId: string, duration?: number) => void;
  clearHighlight: () => void;

  // Suggestion status actions
  markSuggestionApplied: (suggestionId: string, newValue?: string) => void;
  markSuggestionStale: (suggestionId: string) => void;
  markSuggestionDismissed: (suggestionId: string) => void;
  removeSuggestion: (suggestionId: string) => void;

  // Change detection
  checkForStaleElements: (currentElements: ElementSnapshot[]) => void;
  handleElementDeleted: (elementId: string, semanticType?: string) => void;

  // Re-validation
  setRevalidating: (suggestionId: string, loading: boolean) => void;
  updateSuggestionAfterRevalidation: (suggestionId: string, newSuggestion: Partial<ActionableSuggestion> | null) => void;
}

export const useAIFeaturesStore = create<AIFeaturesStore>((set, get) => ({
  // Initial state
  reviewLoading: false,
  reviewResult: null,
  reviewError: null,
  reviewTimestamp: null,
  elementSnapshots: new Map(),
  revalidatingIds: new Set(),

  formattingLoading: false,
  formattingResult: null,
  formattingError: null,

  highlightedElementId: null,
  highlightTimeout: null,

  // Review actions
  setReviewLoading: (loading) => set({ reviewLoading: loading }),

  setReviewResult: (result, snapshots) => {
    const snapshotMap = new Map<string, ElementSnapshot>();
    if (snapshots) {
      snapshots.forEach(s => {
        // Key by both id and semantic type for better matching
        snapshotMap.set(s.id, s);
        if (s.semanticType) {
          snapshotMap.set(s.semanticType, s);
        }
      });
    }

    // Initialize all suggestions with 'pending' status
    if (result) {
      result.suggestions = result.suggestions.map(s => ({
        ...s,
        status: s.status || 'pending' as const,
      }));
    }

    set({
      reviewResult: result,
      reviewLoading: false,
      reviewError: null,
      reviewTimestamp: Date.now(),
      elementSnapshots: snapshotMap,
    });
  },

  setReviewError: (error) => set({
    reviewError: error,
    reviewLoading: false
  }),

  clearReview: () => set({
    reviewResult: null,
    reviewError: null,
    reviewLoading: false,
    reviewTimestamp: null,
    elementSnapshots: new Map(),
    revalidatingIds: new Set(),
  }),

  // Formatting actions
  setFormattingLoading: (loading) => set({ formattingLoading: loading }),

  setFormattingResult: (result) => set({
    formattingResult: result,
    formattingLoading: false,
    formattingError: null
  }),

  setFormattingError: (error) => set({
    formattingError: error,
    formattingLoading: false
  }),

  clearFormatting: () => set({
    formattingResult: null,
    formattingError: null,
    formattingLoading: false
  }),

  // Highlighting actions
  highlightElement: (elementId, duration = 3000) => {
    const { highlightTimeout } = get();

    // Clear existing timeout
    if (highlightTimeout) {
      clearTimeout(highlightTimeout);
    }

    // Set new highlight
    const timeout = setTimeout(() => {
      set({ highlightedElementId: null, highlightTimeout: null });
    }, duration);

    set({
      highlightedElementId: elementId,
      highlightTimeout: timeout
    });
  },

  clearHighlight: () => {
    const { highlightTimeout } = get();
    if (highlightTimeout) {
      clearTimeout(highlightTimeout);
    }
    set({ highlightedElementId: null, highlightTimeout: null });
  },

  // Mark suggestion as applied (with visual feedback)
  markSuggestionApplied: (suggestionId, newValue) => {
    const { reviewResult, elementSnapshots } = get();
    if (!reviewResult) return;

    const updatedSuggestions = reviewResult.suggestions.map(s => {
      if (s.id === suggestionId) {
        // Update the snapshot with new value
        if (newValue && s.targetSemanticType) {
          const snapshot = elementSnapshots.get(s.targetSemanticType);
          if (snapshot) {
            elementSnapshots.set(s.targetSemanticType, { ...snapshot, text: newValue });
          }
        }

        return {
          ...s,
          status: 'applied' as const,
          appliedAt: Date.now(),
          currentValue: newValue || s.suggestedValue, // Update current to the applied value
        };
      }
      return s;
    });

    set({
      reviewResult: {
        ...reviewResult,
        suggestions: updatedSuggestions,
      },
      elementSnapshots,
    });
  },

  // Mark suggestion as stale (element was modified)
  markSuggestionStale: (suggestionId) => {
    const { reviewResult } = get();
    if (!reviewResult) return;

    const updatedSuggestions = reviewResult.suggestions.map(s => {
      if (s.id === suggestionId && s.status !== 'applied') {
        return { ...s, status: 'stale' as const };
      }
      return s;
    });

    set({
      reviewResult: {
        ...reviewResult,
        suggestions: updatedSuggestions,
      },
    });
  },

  // Dismiss a suggestion (user doesn't want to apply it)
  markSuggestionDismissed: (suggestionId) => {
    const { reviewResult } = get();
    if (!reviewResult) return;

    const updatedSuggestions = reviewResult.suggestions.map(s => {
      if (s.id === suggestionId) {
        return { ...s, status: 'dismissed' as const };
      }
      return s;
    });

    set({
      reviewResult: {
        ...reviewResult,
        suggestions: updatedSuggestions,
      },
    });
  },

  // Remove suggestion completely
  removeSuggestion: (suggestionId) => {
    const { reviewResult } = get();
    if (!reviewResult) return;

    const updatedSuggestions = reviewResult.suggestions.filter(
      s => s.id !== suggestionId
    );

    set({
      reviewResult: {
        ...reviewResult,
        suggestions: updatedSuggestions,
      },
    });
  },

  // Check if elements have changed since review
  checkForStaleElements: (currentElements) => {
    const { reviewResult, elementSnapshots } = get();
    if (!reviewResult || elementSnapshots.size === 0) return;

    const currentMap = new Map<string, string>();
    currentElements.forEach(el => {
      currentMap.set(el.id, el.text);
      if (el.semanticType) {
        currentMap.set(el.semanticType, el.text);
      }
    });

    const staleSuggestionIds: string[] = [];

    reviewResult.suggestions.forEach(suggestion => {
      if (suggestion.status === 'applied' || suggestion.status === 'dismissed') return;

      // Check by targetElementId or targetSemanticType
      const targetKey = suggestion.targetElementId || suggestion.targetSemanticType;
      if (!targetKey) return;

      const originalSnapshot = elementSnapshots.get(targetKey);
      const currentText = currentMap.get(targetKey);

      // If element was deleted or text changed significantly
      if (!currentText) {
        // Element might be deleted - mark as stale
        staleSuggestionIds.push(suggestion.id);
      } else if (originalSnapshot && currentText !== originalSnapshot.text) {
        // Text changed - mark as stale
        staleSuggestionIds.push(suggestion.id);
      }
    });

    if (staleSuggestionIds.length > 0) {
      const updatedSuggestions = reviewResult.suggestions.map(s => {
        if (staleSuggestionIds.includes(s.id) && s.status !== 'applied') {
          return { ...s, status: 'stale' as const };
        }
        return s;
      });

      set({
        reviewResult: {
          ...reviewResult,
          suggestions: updatedSuggestions,
        },
      });
    }
  },

  // Handle when an element is deleted from canvas
  handleElementDeleted: (elementId, semanticType) => {
    const { reviewResult } = get();
    if (!reviewResult) return;

    // Remove suggestions targeting the deleted element
    const updatedSuggestions = reviewResult.suggestions.filter(s => {
      if (s.targetElementId === elementId) return false;
      if (semanticType && s.targetSemanticType === semanticType) return false;
      return true;
    });

    if (updatedSuggestions.length !== reviewResult.suggestions.length) {
      set({
        reviewResult: {
          ...reviewResult,
          suggestions: updatedSuggestions,
        },
      });
    }
  },

  // Set revalidation loading state
  setRevalidating: (suggestionId, loading) => {
    const { revalidatingIds } = get();
    const newSet = new Set(revalidatingIds);

    if (loading) {
      newSet.add(suggestionId);
    } else {
      newSet.delete(suggestionId);
    }

    set({ revalidatingIds: newSet });
  },

  // Update suggestion after re-validation
  updateSuggestionAfterRevalidation: (suggestionId, newSuggestion) => {
    const { reviewResult, revalidatingIds } = get();
    if (!reviewResult) return;

    // Remove from revalidating set
    const newRevalidatingIds = new Set(revalidatingIds);
    newRevalidatingIds.delete(suggestionId);

    if (newSuggestion === null) {
      // Suggestion is no longer needed - element is now good
      const updatedSuggestions = reviewResult.suggestions.filter(
        s => s.id !== suggestionId
      );
      set({
        reviewResult: {
          ...reviewResult,
          suggestions: updatedSuggestions,
        },
        revalidatingIds: newRevalidatingIds,
      });
    } else {
      // Update the suggestion with new values
      const updatedSuggestions = reviewResult.suggestions.map(s => {
        if (s.id === suggestionId) {
          return {
            ...s,
            ...newSuggestion,
            status: 'pending' as const, // Reset status
          };
        }
        return s;
      });
      set({
        reviewResult: {
          ...reviewResult,
          suggestions: updatedSuggestions,
        },
        revalidatingIds: newRevalidatingIds,
      });
    }
  },
}));
