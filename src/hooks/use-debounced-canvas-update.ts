"use client";

import { useCallback, useRef } from "react";
import type { Object as FabricObject } from "fabric";
import { useCanvasStore } from "@/stores/canvas-store";

const DEBOUNCE_DELAY = 150; // ms

// Fabric object with set method - using intersection type for flexibility
type FabricObjectWithSet = FabricObject & {
  set: (property: string, value: unknown) => void;
};

/**
 * Hook for optimized canvas property updates.
 *
 * Problem: When using color pickers or sliders, onChange fires on every pixel movement.
 * This causes lag because saveToHistory() serializes the entire canvas on each call.
 *
 * Solution: This hook provides two functions:
 * 1. updateProperty - Immediately renders canvas, debounces history save
 * 2. flushHistory - Immediately saves to history (call on pointerUp/blur)
 *
 * Usage:
 * const { updateProperty, flushHistory } = useDebouncedCanvasUpdate();
 *
 * <input
 *   onChange={(e) => updateProperty(obj, 'fill', e.target.value)}
 *   onPointerUp={flushHistory}
 *   onBlur={flushHistory}
 * />
 */
export function useDebouncedCanvasUpdate() {
  const { canvas, saveToHistory } = useCanvasStore();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingRef = useRef(false);

  // Cancel any pending debounced save
  const cancelPending = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Immediately save to history and cancel pending debounce
  const flushHistory = useCallback(() => {
    cancelPending();
    if (pendingRef.current) {
      saveToHistory();
      pendingRef.current = false;
    }
  }, [cancelPending, saveToHistory]);

  // Update a single property with immediate render but debounced history save
  const updateProperty = useCallback(
    (obj: FabricObjectWithSet | null, property: string, value: unknown) => {
      if (!canvas || !obj) return;

      // Immediately apply the change and render
      obj.set(property, value);
      canvas.renderAll();

      // Mark that we have pending changes
      pendingRef.current = true;

      // Debounce the history save
      cancelPending();
      timeoutRef.current = setTimeout(() => {
        saveToHistory();
        pendingRef.current = false;
        timeoutRef.current = null;
      }, DEBOUNCE_DELAY);
    },
    [canvas, saveToHistory, cancelPending]
  );

  // Update multiple properties at once
  const updateProperties = useCallback(
    (obj: FabricObjectWithSet | null, properties: Record<string, unknown>) => {
      if (!canvas || !obj) return;

      // Immediately apply all changes and render
      Object.entries(properties).forEach(([property, value]) => {
        obj.set(property, value);
      });
      canvas.renderAll();

      // Mark that we have pending changes
      pendingRef.current = true;

      // Debounce the history save
      cancelPending();
      timeoutRef.current = setTimeout(() => {
        saveToHistory();
        pendingRef.current = false;
        timeoutRef.current = null;
      }, DEBOUNCE_DELAY);
    },
    [canvas, saveToHistory, cancelPending]
  );

  // Update all objects matching a filter
  const updateAllMatching = useCallback(
    (
      filter: (obj: FabricObject) => boolean,
      property: string,
      value: unknown
    ) => {
      if (!canvas) return;

      // Apply to all matching objects
      canvas.getObjects().forEach((obj) => {
        if (filter(obj)) {
          (obj as FabricObjectWithSet).set(property, value);
        }
      });
      canvas.renderAll();

      // Mark that we have pending changes
      pendingRef.current = true;

      // Debounce the history save
      cancelPending();
      timeoutRef.current = setTimeout(() => {
        saveToHistory();
        pendingRef.current = false;
        timeoutRef.current = null;
      }, DEBOUNCE_DELAY);
    },
    [canvas, saveToHistory, cancelPending]
  );

  return {
    updateProperty,
    updateProperties,
    updateAllMatching,
    flushHistory,
    cancelPending,
  };
}
