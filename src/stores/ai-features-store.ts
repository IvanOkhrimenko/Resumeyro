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
  originalValue?: string; // Stored when applied, for undo detection
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
  markSuggestionApplied: (suggestionId: string, newValue?: string, actualElementId?: string, originalText?: string) => void;
  markSuggestionStale: (suggestionId: string) => void;
  markSuggestionDismissed: (suggestionId: string) => void;
  removeSuggestion: (suggestionId: string) => void;

  // Change detection
  checkForStaleElements: (currentElements: ElementSnapshot[]) => void;
  handleElementDeleted: (elementId: string, semanticType?: string) => void;

  // Re-validation
  setRevalidating: (suggestionId: string, loading: boolean) => void;
  updateSuggestionAfterRevalidation: (suggestionId: string, newSuggestion: Partial<ActionableSuggestion> | null) => void;

  // Undo/Redo sync
  revalidateAppliedSuggestions: (currentElements: ElementSnapshot[]) => void;
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
  markSuggestionApplied: (suggestionId, newValue, actualElementId, originalText) => {
    const { reviewResult } = get();
    if (!reviewResult) return;

    const updatedSuggestions = reviewResult.suggestions.map(s => {
      if (s.id === suggestionId) {
        console.log('[markApplied] suggestionId:', suggestionId);
        console.log('[markApplied] actualElementId:', actualElementId);
        console.log('[markApplied] originalText (first 50):', originalText?.substring(0, 50));

        return {
          ...s,
          status: 'applied' as const,
          appliedAt: Date.now(),
          // Store actual element ID for undo detection (not the AI-provided one)
          targetElementId: actualElementId || s.targetElementId,
          // Store original text for undo detection
          originalValue: originalText || s.currentValue,
          // Update currentValue to the new applied text
          currentValue: newValue || s.suggestedValue,
        };
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

  // Revalidate applied suggestions after undo/redo
  // If the current text no longer matches what was applied, revert status to 'pending'
  revalidateAppliedSuggestions: (currentElements) => {
    const { reviewResult } = get();
    if (!reviewResult) {
      console.log('[AI Revalidate] No review result, skipping');
      return;
    }

    const appliedSuggestions = reviewResult.suggestions.filter(s => s.status === 'applied');
    console.log('[AI Revalidate] Checking', appliedSuggestions.length, 'applied suggestions');

    if (appliedSuggestions.length === 0) return;

    // Build list of all current text contents for searching
    const allCurrentTexts = currentElements.map(el => el.text);
    console.log('[AI Revalidate] Canvas texts count:', allCurrentTexts.length);
    // Log first few canvas texts for debugging
    allCurrentTexts.slice(0, 5).forEach((t, i) => {
      console.log(`  Canvas text ${i}:`, t.substring(0, 80));
    });

    let hasChanges = false;
    const updatedSuggestions = reviewResult.suggestions.map(suggestion => {
      // Only check 'applied' suggestions
      if (suggestion.status !== 'applied') return suggestion;

      // Normalize texts to handle whitespace differences
      const originalText = suggestion.originalValue?.trim();
      const appliedText = suggestion.currentValue?.trim(); // This is the FULL text AFTER apply
      const suggestedValue = (suggestion.suggestedValue || '').trim();

      console.log('[AI Revalidate] Checking suggestion:', suggestion.id);
      console.log('  originalText (stored before apply):', originalText?.substring(0, 100));
      console.log('  appliedText (stored after apply):', appliedText?.substring(0, 100));
      console.log('  suggestedValue (replacement):', suggestedValue?.substring(0, 100));

      if (!originalText) {
        console.log('  No originalText stored, skipping');
        return suggestion;
      }

      // Simple check: does the APPLIED full text still exist on canvas?
      // After undo, the appliedText should NOT exist, but originalText should
      // Also normalize canvas texts for comparison
      const appliedTextExactMatch = allCurrentTexts.some(text => text.trim() === appliedText);
      const originalTextExactMatch = allCurrentTexts.some(text => text.trim() === originalText);

      // Also check if suggestedValue (the replacement substring) is in any canvas text
      const suggestedValueInCanvas = allCurrentTexts.some(text =>
        text.includes(suggestedValue)
      );

      console.log('  appliedTextExactMatch:', appliedTextExactMatch);
      console.log('  originalTextExactMatch:', originalTextExactMatch);
      console.log('  suggestedValueInCanvas:', suggestedValueInCanvas);

      // Undo detection: original text is back AND (applied text is gone OR suggested value is gone)
      if (originalTextExactMatch && !appliedTextExactMatch) {
        hasChanges = true;
        console.log('[AI Revalidate] ✓ Reverting to pending (original back, applied gone):', suggestion.id);
        return {
          ...suggestion,
          status: 'pending' as const,
          appliedAt: undefined,
          currentValue: originalText, // Restore original
          originalValue: undefined, // Clear
        };
      }

      // Alternative check: if original text exists and suggested value no longer in canvas
      if (originalTextExactMatch && !suggestedValueInCanvas) {
        hasChanges = true;
        console.log('[AI Revalidate] ✓ Reverting to pending (suggested value gone):', suggestion.id);
        return {
          ...suggestion,
          status: 'pending' as const,
          appliedAt: undefined,
          currentValue: originalText,
          originalValue: undefined,
        };
      }

      return suggestion;
    });

    if (hasChanges) {
      console.log('[AI Revalidate] Updating store with changes');
      set({
        reviewResult: {
          ...reviewResult,
          suggestions: updatedSuggestions,
        },
      });
    } else {
      console.log('[AI Revalidate] No changes detected');
    }
  },
}));
