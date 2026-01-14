"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import * as fabric from "fabric";
import { Canvas, Textbox, Rect, IText, Line, Circle as FabricCircle, Point, ActiveSelection, Control } from "fabric";
import { useCanvasStore } from "@/stores/canvas-store";
import { useAIFeaturesStore } from "@/stores/ai-features-store";
import { nanoid } from "nanoid";
import { AITextAssistant } from "./ai-text-assistant";
import {
  SpatialHashIndex,
  computeGuidesAndSnaps,
  DEFAULT_GUIDES_CONFIG,
  type ElementData,
  type Guide,
  type LastSnap,
} from "@/lib/canvas/guides-system";
import { renderGuides, DEFAULT_RENDERER_CONFIG } from "@/lib/canvas/guides-renderer";

// Zoom constraints
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;

// A4 dimensions at 96 DPI
const A4_WIDTH = 595;
const A4_HEIGHT = 842;
const PAGE_BREAK_COLOR = "#e11d48"; // Red dashed line for page breaks

// Grid settings
const GRID_SIZE = 5; // Snap to every 5 pixels for precise control

// Margins
const MARGIN_LEFT = 40;
const MARGIN_RIGHT = 40;
const MARGIN_TOP = 40;
const CONTENT_WIDTH = A4_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

// Guides config - alignment guides
const GUIDES_CONFIG = {
  ...DEFAULT_GUIDES_CONFIG,
  gridSize: GRID_SIZE,
  pageWidth: A4_WIDTH,
  pageHeight: A4_HEIGHT,
  snapThresholdPx: 8,
  hysteresisPx: 5,
};

interface ResumeCanvasProps {
  initialData?: string;
  onSave?: (data: string) => void;
}

export function ResumeCanvas({ initialData, onSave }: ResumeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastInitialDataRef = useRef<string | undefined>(undefined);
  const { setCanvas, setSelectedObjects, saveToHistory, initHistory, isDirty, markClean, showGrid, reset: resetStore, aiAssistantTrigger, smartArrangeEnabled, groupSelected, ungroupSelected, zoom, setZoom } =
    useCanvasStore();

  // AI Features store for highlighting
  const { highlightedElementId, clearHighlight } = useAIFeaturesStore();
  const highlightOverlayRef = useRef<Rect | null>(null);

  // Refs for height resize with element pushing
  const resizeStartBottomRef = useRef<number | null>(null);
  // Store original positions of elements below when resize starts
  const resizeOriginalPositionsRef = useRef<Map<any, number> | null>(null);
  // Ref to store canvas for use in control handlers
  const canvasForControlsRef = useRef<Canvas | null>(null);
  // Current canvas height (grows dynamically)
  const [canvasHeight, setCanvasHeight] = useState(A4_HEIGHT);
  // Page break lines
  const pageBreakLinesRef = useRef<Line[]>([]);
  // Ref for updateCanvasSize function
  const updateCanvasSizeRef = useRef<(() => void) | null>(null);

  // Guides system refs
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const spatialIndexRef = useRef<SpatialHashIndex>(new SpatialHashIndex(100));
  const lastSnapXRef = useRef<LastSnap | null>(null);
  const lastSnapYRef = useRef<LastSnap | null>(null);
  const currentGuidesRef = useRef<Guide[]>([]);
  const isDraggingRef = useRef<boolean>(false);
  const zoomRef = useRef<number>(zoom);

  // Keep zoom ref updated
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  // Update canvas height and page break lines based on content
  const updateCanvasSize = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // Find the lowest point of any object (excluding page break lines)
    let maxBottom = A4_HEIGHT;
    canvas.getObjects().forEach((obj: any) => {
      // Skip page break lines and non-interactive objects
      if ((obj as any)._isPageBreak) return;
      if (obj.selectable === false && obj.evented === false) return;

      const rect = obj.getBoundingRect?.() || { top: obj.top || 0, height: obj.height || 0 };
      const bottom = rect.top + rect.height;
      if (bottom > maxBottom) {
        maxBottom = bottom;
      }
    });

    // Calculate needed height
    // Only add a new page if content actually extends onto it (more than just touching the boundary)
    const pageThreshold = 10; // Minimum content on new page to include it
    const neededPages = Math.ceil((maxBottom - pageThreshold) / A4_HEIGHT);
    const newHeight = Math.max(A4_HEIGHT, neededPages * A4_HEIGHT);

    // Update canvas height if needed
    if (newHeight !== canvasHeight) {
      setCanvasHeight(newHeight);
      canvas.setDimensions({ width: A4_WIDTH * zoom, height: newHeight * zoom });
    }

    // Update page break lines
    // Remove old lines
    pageBreakLinesRef.current.forEach(line => {
      canvas.remove(line);
    });
    pageBreakLinesRef.current = [];

    // Add new page break lines
    for (let page = 1; page < neededPages; page++) {
      const y = page * A4_HEIGHT;
      const line = new Line([0, y, A4_WIDTH, y], {
        stroke: PAGE_BREAK_COLOR,
        strokeWidth: 1,
        strokeDashArray: [10, 5],
        selectable: false,
        evented: false,
        excludeFromExport: true,
      });
      (line as any)._isPageBreak = true;
      canvas.add(line);
      pageBreakLinesRef.current.push(line);
    }

    canvas.renderAll();
  }, [canvasHeight, zoom]);

  // Keep ref updated
  useEffect(() => {
    updateCanvasSizeRef.current = updateCanvasSize;
  }, [updateCanvasSize]);

  // Convert fabric objects to ElementData for spatial index
  // Uses actual visible bounds (not container bounds for text)
  // Filters out background elements that shouldn't participate in alignment
  const fabricObjectToElementData = useCallback((obj: any): ElementData | null => {
    if (!obj || obj.selectable === false || (obj as any)._isGuide || (obj as any)._isPageBreak || (obj as any)._isHighlight) {
      return null;
    }

    // Skip objects without ID (likely temporary or system objects)
    const id = (obj as any).id;
    if (!id) return null;

    const objType = obj.type?.toLowerCase() || '';

    // Skip full-page background rectangles (span entire page)
    if (objType === 'rect') {
      const scaleX = obj.scaleX || 1;
      const scaleY = obj.scaleY || 1;
      const width = (obj.width || 0) * scaleX;
      const height = (obj.height || 0) * scaleY;
      // Only skip if it's nearly full page (>90% in both dimensions)
      if (width > A4_WIDTH * 0.9 && height > A4_HEIGHT * 0.9) {
        return null;
      }
    }

    // Get actual visible bounds based on object type
    let x: number, y: number, w: number, h: number;

    const isText = objType === 'textbox' || objType === 'i-text' || objType === 'text';

    if (isText) {
      // For text objects: use actual text dimensions
      const scaleX = obj.scaleX || 1;
      const scaleY = obj.scaleY || 1;
      x = obj.left || 0;
      y = obj.top || 0;
      w = (obj.width || 0) * scaleX;
      h = (obj.height || 0) * scaleY;
    } else if (objType === 'rect' || objType === 'circle' || objType === 'ellipse' || objType === 'polygon') {
      // For shapes: use position and scaled dimensions
      const scaleX = obj.scaleX || 1;
      const scaleY = obj.scaleY || 1;
      x = obj.left || 0;
      y = obj.top || 0;
      w = (obj.width || 0) * scaleX;
      h = (obj.height || 0) * scaleY;
    } else if (objType === 'image') {
      // For images: use position and scaled dimensions
      const scaleX = obj.scaleX || 1;
      const scaleY = obj.scaleY || 1;
      x = obj.left || 0;
      y = obj.top || 0;
      w = (obj.width || 0) * scaleX;
      h = (obj.height || 0) * scaleY;
    } else if (objType === 'group') {
      // For groups: use bounding rect
      const rect = obj.getBoundingRect?.();
      if (rect) {
        x = rect.left;
        y = rect.top;
        w = rect.width;
        h = rect.height;
      } else {
        x = obj.left || 0;
        y = obj.top || 0;
        w = obj.width || 0;
        h = obj.height || 0;
      }
    } else {
      // Skip unknown types
      return null;
    }

    // Skip elements with no size or very small elements
    if (w < 5 || h < 5) return null;

    return {
      id,
      x,
      y,
      w,
      h,
      hidden: !obj.visible,
      isGuide: (obj as any)._isGuide,
      isPageBreak: (obj as any)._isPageBreak,
      isText,
    };
  }, []);

  // Build spatial index from canvas objects
  const buildSpatialIndex = useCallback((excludeId?: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const elements: ElementData[] = [];
    canvas.getObjects().forEach((obj: any) => {
      const el = fabricObjectToElementData(obj);
      if (el && el.id !== excludeId) {
        elements.push(el);
      }
    });

    spatialIndexRef.current.build(elements);
  }, [fabricObjectToElementData]);

  // Render guides on overlay canvas
  const renderGuidesOverlay = useCallback((guides: Guide[]) => {
    const overlayCanvas = overlayCanvasRef.current;
    if (!overlayCanvas) return;

    const ctx = overlayCanvas.getContext('2d');
    if (!ctx) return;

    // Get actual canvas dimensions
    const dpr = window.devicePixelRatio || 1;
    const width = overlayCanvas.width / dpr;
    const height = overlayCanvas.height / dpr;

    renderGuides(ctx, guides, zoomRef.current, width, height, DEFAULT_RENDERER_CONFIG);
    currentGuidesRef.current = guides;
  }, []);

  // Clear guides overlay
  const clearGuidesOverlay = useCallback(() => {
    const overlayCanvas = overlayCanvasRef.current;
    if (!overlayCanvas) return;

    const ctx = overlayCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    currentGuidesRef.current = [];
  }, []);

  // Refs for guide functions (to avoid useEffect dependency issues)
  const buildSpatialIndexRef = useRef(buildSpatialIndex);
  const renderGuidesOverlayRef = useRef(renderGuidesOverlay);
  const clearGuidesOverlayRef = useRef(clearGuidesOverlay);

  // Keep refs updated
  useEffect(() => {
    buildSpatialIndexRef.current = buildSpatialIndex;
    renderGuidesOverlayRef.current = renderGuidesOverlay;
    clearGuidesOverlayRef.current = clearGuidesOverlay;
  }, [buildSpatialIndex, renderGuidesOverlay, clearGuidesOverlay]);

  // AI Assistant state
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [aiAssistantPosition, setAIAssistantPosition] = useState({ x: 0, y: 0 });
  const [canvasRect, setCanvasRect] = useState<DOMRect | undefined>(undefined);
  const selectedTextObjectRef = useRef<IText | Textbox | null>(null);


  // Reset canvas viewport to ensure no transforms
  const resetViewport = useCallback((canvas: Canvas) => {
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    canvas.setZoom(1);
    canvas.absolutePan(new Point(0, 0));
  }, []);

  // Open AI assistant for selected text object
  const openAIAssistant = useCallback((textObj: IText | Textbox) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !containerRef.current) return;

    const text = textObj.text || "";
    if (!text.trim()) return;

    // Get canvas element position
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;

    const canvasBounds = canvasElement.getBoundingClientRect();
    setCanvasRect(canvasBounds);

    // Calculate position for the popup (center of the object)
    const objCenter = textObj.getCenterPoint();
    const absoluteX = canvasBounds.left + objCenter.x;
    const absoluteY = canvasBounds.top + (textObj.top || 0);

    setSelectedText(text);
    setAIAssistantPosition({ x: absoluteX, y: absoluteY });
    selectedTextObjectRef.current = textObj;
    setShowAIAssistant(true);
  }, []);

  // Apply AI-generated text to the selected object
  const handleApplyAIText = useCallback((newText: string) => {
    const textObj = selectedTextObjectRef.current;
    const canvas = fabricCanvasRef.current;
    if (!textObj || !canvas) return;

    // Capture height BEFORE text change
    const previousHeight = textObj.calcTextHeight ? textObj.calcTextHeight() : (textObj.height || 0);
    const previousTop = textObj.top || 0;
    const previousBottom = previousTop + previousHeight;

    // Apply new text
    textObj.set("text", newText);

    // Recalculate dimensions
    if (textObj.initDimensions) {
      textObj.initDimensions();
    }
    textObj.setCoords();

    // Get new height
    const newHeight = textObj.calcTextHeight ? textObj.calcTextHeight() : (textObj.height || 0);
    const currentTop = textObj.top || 0;
    const currentBottom = currentTop + newHeight;

    // Push elements below if height changed
    if (Math.abs(newHeight - previousHeight) >= 1) {
      // Get the pushElementsBelow function by firing object:modified with height info
      canvas.fire('object:modified', {
        target: textObj,
        previousHeight,
        previousTop,
        newHeight,
      });
    } else {
      canvas.renderAll();
      saveToHistory();
    }
  }, [saveToHistory]);

  // Listen for AI assistant trigger from toolbar
  useEffect(() => {
    if (aiAssistantTrigger === 0) return;

    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObj = canvas.getActiveObject();
    if (activeObj && (activeObj.type === "textbox" || activeObj.type === "i-text")) {
      openAIAssistant(activeObj as IText | Textbox);
    }
  }, [aiAssistantTrigger, openAIAssistant]);

  // Handle highlighting elements from AI Review panel
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // Remove any existing highlight overlay
    if (highlightOverlayRef.current) {
      canvas.remove(highlightOverlayRef.current);
      highlightOverlayRef.current = null;
    }

    if (!highlightedElementId) {
      canvas.requestRenderAll();
      return;
    }

    // Find the element to highlight
    const targetObj = canvas.getObjects().find((obj: any) => obj.id === highlightedElementId);
    if (!targetObj) return;

    // Get bounding rect of the element
    const bounds = targetObj.getBoundingRect();
    const padding = 4;

    // Create highlight overlay with pulsing effect
    const highlightRect = new Rect({
      left: bounds.left - padding,
      top: bounds.top - padding,
      width: bounds.width + padding * 2,
      height: bounds.height + padding * 2,
      fill: "transparent",
      stroke: "#06b6d4", // Cyan color for highlight
      strokeWidth: 2,
      strokeDashArray: [8, 4],
      rx: 4,
      ry: 4,
      selectable: false,
      evented: false,
      excludeFromExport: true,
    });

    (highlightRect as any)._isHighlight = true;
    highlightOverlayRef.current = highlightRect;
    canvas.add(highlightRect);
    canvas.bringObjectToFront(highlightRect);
    canvas.requestRenderAll();

    // Animate the highlight with a pulsing effect
    let opacity = 1;
    let increasing = false;
    const animationInterval = setInterval(() => {
      if (increasing) {
        opacity += 0.05;
        if (opacity >= 1) {
          opacity = 1;
          increasing = false;
        }
      } else {
        opacity -= 0.05;
        if (opacity <= 0.3) {
          opacity = 0.3;
          increasing = true;
        }
      }
      if (highlightOverlayRef.current) {
        highlightOverlayRef.current.set("opacity", opacity);
        canvas.requestRenderAll();
      }
    }, 50);

    // Clean up animation when highlight changes
    return () => {
      clearInterval(animationInterval);
    };
  }, [highlightedElementId]);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    // Skip if same data (prevents double init in Strict Mode)
    if (lastInitialDataRef.current === initialData && fabricCanvasRef.current) {
      return;
    }
    lastInitialDataRef.current = initialData;

    // Cleanup any existing canvas first
    if (fabricCanvasRef.current) {
      try {
        fabricCanvasRef.current.dispose();
      } catch (e) {
        console.warn("Error disposing previous canvas:", e);
      }
      fabricCanvasRef.current = null;
    }

    // Set explicit dimensions on canvas element first
    if (canvasRef.current) {
      canvasRef.current.width = A4_WIDTH;
      canvasRef.current.height = A4_HEIGHT;
    }

    const canvas = new Canvas(canvasRef.current, {
      width: A4_WIDTH,
      height: A4_HEIGHT,
      backgroundColor: "#ffffff",
      selection: true,
      preserveObjectStacking: true,
      // Enable Retina/HiDPI rendering for sharp text
      enableRetinaScaling: true,
      // Selection requires full content to be inside (custom logic for text below)
      selectionFullyContained: true,
    });

    // Ensure clean viewport from the start
    resetViewport(canvas);

    fabricCanvasRef.current = canvas;
    canvasForControlsRef.current = canvas;

    // Configure text objects with custom resize controls
    const configureTextObject = (obj: any) => {
      if (obj.type === 'textbox') {
        // Textbox: disable default scaling, we'll use custom width/height controls
        // Disable object caching to prevent rendering artifacts when moving/editing
        obj.set({
          lockScalingX: true,
          lockScalingY: true,
          lockSkewingX: true,
          lockSkewingY: true,
          objectCaching: false, // Prevent text rendering artifacts
          statefullCache: false,
          noScaleCache: true,
        });

        // Override isContainedWithinRect to use actual text content bounds
        // This allows selection based on visible text, not the container width
        obj.isContainedWithinRect = function(pointTL: Point, pointBR: Point) {
          // Get actual text dimensions
          const textWidth = this.calcTextWidth ? this.calcTextWidth() : this.width;
          const textHeight = this.calcTextHeight ? this.calcTextHeight() : this.height;

          // Get object position
          const objLeft = this.left || 0;
          const objTop = this.top || 0;

          // Account for text alignment
          let contentLeft = objLeft;
          const textAlign = this.textAlign || 'left';
          const containerWidth = this.width || textWidth;

          if (textAlign === 'center') {
            contentLeft = objLeft + (containerWidth - textWidth) / 2;
          } else if (textAlign === 'right') {
            contentLeft = objLeft + containerWidth - textWidth;
          }

          // Calculate actual content bounds
          const contentRight = contentLeft + textWidth;
          const contentBottom = objTop + textHeight;

          // Check if content is fully within selection rectangle
          return (
            contentLeft >= pointTL.x &&
            objTop >= pointTL.y &&
            contentRight <= pointBR.x &&
            contentBottom <= pointBR.y
          );
        };

        // Create custom control for right edge (width resize)
        obj.controls.mr = new Control({
          x: 0.5,
          y: 0,
          cursorStyle: 'ew-resize',
          actionHandler: (eventData: any, transform: any, x: number, y: number) => {
            const target = transform.target;
            const targetLeft = target.left || 0;
            const newWidth = Math.max(50, x - targetLeft);
            target.set({ width: newWidth });
            target.setCoords();
            return true;
          },
          actionName: 'resizeWidth',
          render: (ctx: CanvasRenderingContext2D, left: number, top: number) => {
            const size = 8;
            ctx.save();
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.rect(left - size / 2, top - size, size, size * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          },
        });

        // Create custom control for left edge (width resize)
        obj.controls.ml = new Control({
          x: -0.5,
          y: 0,
          cursorStyle: 'ew-resize',
          actionHandler: (eventData: any, transform: any, x: number, y: number) => {
            const target = transform.target;
            const currentRight = (target.left || 0) + (target.width || 100);
            const newWidth = Math.max(50, currentRight - x);
            const newLeft = currentRight - newWidth;
            target.set({ width: newWidth, left: newLeft });
            target.setCoords();
            return true;
          },
          actionName: 'resizeWidth',
          render: (ctx: CanvasRenderingContext2D, left: number, top: number) => {
            const size = 8;
            ctx.save();
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.rect(left - size / 2, top - size, size, size * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          },
        });

        // Create custom control for bottom edge (height resize)
        obj.controls.mb = new Control({
          x: 0,
          y: 0.5,
          cursorStyle: 'ns-resize',
          mouseDownHandler: (eventData: any, transformData: any, x: number, y: number) => {
            const target = transformData.target;
            const canvas = canvasForControlsRef.current;
            if (!canvas) return true;

            const targetTop = target.top || 0;
            const currentHeight = target.height || 0;
            const initialBottom = targetTop + currentHeight;

            // Get target's horizontal bounds for column detection
            const targetLeft = target.left || 0;
            const targetWidth = target.width || 0;
            const targetRight = targetLeft + targetWidth;

            // Store initial bottom position
            resizeStartBottomRef.current = initialBottom;

            // Capture original positions of elements below IN THE SAME COLUMN
            // Skip if target is a background element - they shouldn't push other elements
            const originalPositions = new Map<any, number>();
            if (!(target as any).isBackground) {
              canvas.getObjects().forEach((obj: any) => {
                // Exclude background elements from being pushed
                if (obj !== target && obj.selectable !== false && !(obj as any).isBackground) {
                  const objTop = obj.top || 0;
                  const objLeft = obj.left || 0;
                  const objWidth = obj.width || 0;
                  const objRight = objLeft + objWidth;

                  // Check if element is below AND has horizontal overlap (same column)
                  const hasHorizontalOverlap = !(objRight < targetLeft || objLeft > targetRight);

                  if (objTop >= initialBottom - 5 && hasHorizontalOverlap) {
                    originalPositions.set(obj, objTop);
                  }
                }
              });
            }
            resizeOriginalPositionsRef.current = originalPositions;

            return true;
          },
          actionHandler: (eventData: any, transform: any, x: number, y: number) => {
            const target = transform.target;
            const canvas = canvasForControlsRef.current;
            const targetTop = target.top || 0;
            const textHeight = target.calcTextHeight ? target.calcTextHeight() : 20;
            const newHeight = Math.max(textHeight, y - targetTop);
            const initialBottom = resizeStartBottomRef.current;
            const newBottom = targetTop + newHeight;

            target.set({ height: newHeight });
            target._manualHeight = newHeight;
            target.setCoords();

            // Move elements based on their ORIGINAL positions + total delta
            if (initialBottom !== null && resizeOriginalPositionsRef.current && canvas) {
              const totalDelta = newBottom - initialBottom;

              resizeOriginalPositionsRef.current.forEach((originalTop, obj) => {
                const newTop = originalTop + totalDelta;
                obj.set({ top: Math.round(newTop / GRID_SIZE) * GRID_SIZE });
                obj.setCoords();
              });

              canvas.requestRenderAll();

              // Update canvas size to accommodate new positions
              updateCanvasSizeRef.current?.();
            }

            return true;
          },
          mouseUpHandler: () => {
            // Clear refs when resize ends
            resizeStartBottomRef.current = null;
            resizeOriginalPositionsRef.current = null;
            return true;
          },
          actionName: 'resizeHeight',
          render: (ctx: CanvasRenderingContext2D, left: number, top: number) => {
            const size = 8;
            ctx.save();
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.rect(left - size, top - size / 2, size * 2, size);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          },
        });

        // Hide other controls
        if (obj.setControlsVisibility) {
          obj.setControlsVisibility({
            mt: false,
            tl: false,
            tr: false,
            bl: false,
            br: false,
            mtr: false,
          });
        }
      } else if (obj.type === 'i-text' || obj.type === 'text') {
        // IText: no resizing (single line text)
        // Disable object caching to prevent rendering artifacts when moving/editing
        obj.set({
          lockScalingX: true,
          lockScalingY: true,
          lockSkewingX: true,
          lockSkewingY: true,
          objectCaching: false, // Prevent text rendering artifacts
          statefullCache: false,
          noScaleCache: true,
        });

        // Override isContainedWithinRect to use actual text content bounds
        obj.isContainedWithinRect = function(pointTL: Point, pointBR: Point) {
          // For IText, width/height are the actual text dimensions
          const textWidth = this.width || 0;
          const textHeight = this.height || 0;
          const objLeft = this.left || 0;
          const objTop = this.top || 0;

          // Check if content is fully within selection rectangle
          return (
            objLeft >= pointTL.x &&
            objTop >= pointTL.y &&
            (objLeft + textWidth) <= pointBR.x &&
            (objTop + textHeight) <= pointBR.y
          );
        };

        if (obj.setControlsVisibility) {
          obj.setControlsVisibility({
            mt: false,
            mb: false,
            ml: false,
            mr: false,
            tl: false,
            tr: false,
            bl: false,
            br: false,
            mtr: false,
          });
        }
      }
    };

    // Apply to newly added objects
    canvas.on('object:added', (e) => {
      if (e.target) {
        configureTextObject(e.target);
      }
    });

    // Auto-push elements below when text grows
    // Store baselines for tracking height changes (top and height, not just bottom)
    const textBaselines = new Map<any, { top: number; height: number }>();

    // Get the height of a text object
    const getTextHeight = (obj: any): number => {
      if (obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text') {
        return obj.calcTextHeight ? obj.calcTextHeight() : (obj.height || 0);
      }
      return (obj.height || 0) * (obj.scaleY || 1);
    };

    // Get the bottom position of an object
    const getObjectBottom = (obj: any): number => {
      const top = obj.top || 0;
      const height = getTextHeight(obj);
      return top + height;
    };

    // Push all elements below a certain Y position by delta amount
    // Only pushes elements that are in the same column (have horizontal overlap)
    const pushElementsBelow = (changedObj: any, previousBottom: number, currentBottom: number) => {
      // Don't push if the changed object is a background element
      if ((changedObj as any).isBackground) return false;

      const delta = currentBottom - previousBottom;

      // Only push if there's a meaningful change (at least 1px)
      if (Math.abs(delta) < 1) return false;

      // Get the horizontal bounds of the changed object for column detection
      const changedLeft = changedObj.left || 0;
      const changedWidth = changedObj.width || 0;
      const changedRight = changedLeft + changedWidth;

      let anyMoved = false;

      // Get all other objects sorted by their top position (top to bottom for proper ordering)
      // Exclude background elements from being pushed
      const otherObjects = canvas.getObjects()
        .filter((obj: any) => obj !== changedObj && obj.selectable !== false && !(obj as any)._isPageBreak && !(obj as any).isBackground)
        .sort((a: any, b: any) => (a.top || 0) - (b.top || 0));

      // Threshold: push any object whose top is at or below where the text ended
      const threshold = previousBottom - 5;

      otherObjects.forEach((obj: any) => {
        const objTop = obj.top || 0;
        const objLeft = obj.left || 0;
        const objWidth = obj.width || 0;
        const objRight = objLeft + objWidth;

        // Check if element has horizontal overlap (same column)
        const hasHorizontalOverlap = !(objRight < changedLeft || objLeft > changedRight);

        // Only push if below threshold AND in the same column
        if (objTop >= threshold && hasHorizontalOverlap) {
          const newTop = objTop + delta;
          obj.set({ top: Math.round(newTop / GRID_SIZE) * GRID_SIZE });
          obj.setCoords();
          anyMoved = true;
        }
      });

      if (anyMoved) {
        canvas.requestRenderAll();
        // Update canvas size after pushing elements
        updateCanvasSizeRef.current?.();
      }

      return anyMoved;
    };

    // Handle text changes - capture baseline and push elements
    const handleTextChange = (obj: any) => {
      if (!obj) return;
      // Skip background elements
      if ((obj as any).isBackground) return;

      const baseline = textBaselines.get(obj);
      const currentTop = obj.top || 0;
      const currentHeight = getTextHeight(obj);

      if (baseline !== undefined) {
        // Only push elements if HEIGHT changed, not just position
        const heightDelta = currentHeight - baseline.height;
        if (Math.abs(heightDelta) >= 1) {
          // Height changed - push elements below
          const previousBottom = baseline.top + baseline.height;
          const currentBottom = currentTop + currentHeight;
          pushElementsBelow(obj, previousBottom, currentBottom);
        }
      }

      // Update baseline for next change
      textBaselines.set(obj, { top: currentTop, height: currentHeight });

      // Update minHeight for textbox when text changes
      if (obj.type === 'textbox') {
        const textHeight = obj.calcTextHeight ? obj.calcTextHeight() : obj.height;
        obj.minHeight = textHeight;

        // Get manual height if set
        const manualHeight = obj._manualHeight;

        // If text grew larger than manual height, clear manual height and expand
        if (manualHeight && textHeight > manualHeight) {
          obj._manualHeight = undefined;
          obj.set({ height: textHeight });
          obj.setCoords();
        }
        // If no manual height and current height is less than text, expand
        else if (!manualHeight && (obj.height || 0) < textHeight) {
          obj.set({ height: textHeight });
          obj.setCoords();
        }
        // If manual height is set and larger than text, keep it
        else if (manualHeight && manualHeight > textHeight) {
          obj.set({ height: manualHeight });
          obj.setCoords();
        }
      }
    };

    // When text editing starts - capture initial baseline
    canvas.on('text:editing:entered', (e: any) => {
      const obj = e.target;
      if (obj) {
        textBaselines.set(obj, { top: obj.top || 0, height: getTextHeight(obj) });
      }
    });

    // When text changes during editing (typing or paste)
    canvas.on('text:changed', (e: any) => {
      // Skip during undo/redo operations
      const { isLoading } = useCanvasStore.getState();
      if (isLoading) return;

      const obj = e.target;
      if (!obj) return;

      // Ensure baseline exists - if not, capture current state as baseline
      // This handles edge cases like paste without prior editing
      if (!textBaselines.has(obj)) {
        textBaselines.set(obj, { top: obj.top || 0, height: getTextHeight(obj) });
      }

      // Use setTimeout to ensure fabric has updated the text dimensions
      setTimeout(() => {
        const { isLoading: stillLoading } = useCanvasStore.getState();
        if (stillLoading) return;
        handleTextChange(obj);
      }, 0);
    });

    // Handle paste event - capture baseline BEFORE paste is applied
    const handlePaste = (e: ClipboardEvent) => {
      const activeObj = canvas.getActiveObject();
      if (activeObj && (activeObj.type === 'textbox' || activeObj.type === 'i-text' || activeObj.type === 'text')) {
        if ((activeObj as any).isEditing) {
          // Capture baseline before paste changes the text
          textBaselines.set(activeObj, {
            top: activeObj.top || 0,
            height: getTextHeight(activeObj)
          });
        }
      }
    };
    document.addEventListener('paste', handlePaste);

    // When text editing ends - clean up
    canvas.on('text:editing:exited', (e: any) => {
      const obj = e.target;
      if (obj) {
        textBaselines.delete(obj);
      }
    });

    // When object is selected - capture baseline for property panel changes
    canvas.on('selection:created', (e: any) => {
      const obj = e.selected?.[0];
      if (obj && (obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text')) {
        textBaselines.set(obj, { top: obj.top || 0, height: getTextHeight(obj) });
      }
    });

    canvas.on('selection:updated', (e: any) => {
      const obj = e.selected?.[0];
      if (obj && (obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text')) {
        textBaselines.set(obj, { top: obj.top || 0, height: getTextHeight(obj) });
      }
    });

    canvas.on('selection:cleared', () => {
      textBaselines.clear();
    });

    // When properties change via panel (font size, etc.)
    canvas.on('object:modified', (e: any) => {
      // Skip during undo/redo operations
      const { isLoading } = useCanvasStore.getState();
      if (isLoading) return;

      const obj = e.target;
      if (!obj) return;

      if (obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text') {
        // Check if event includes explicit height change info (from panel)
        if (e.previousHeight && e.newHeight && e.previousHeight !== e.newHeight) {
          const previousTop = e.previousTop || (obj.top || 0);
          const currentTop = obj.top || 0;
          const previousBottom = previousTop + e.previousHeight;
          const currentBottom = currentTop + e.newHeight;

          // Push elements below using explicit height data
          pushElementsBelow(obj, previousBottom, currentBottom);

          // Update baseline for future changes
          textBaselines.set(obj, { top: currentTop, height: e.newHeight });
        } else {
          // Use setTimeout to ensure fabric has recalculated dimensions
          // Capture isLoading state at this moment to check later
          setTimeout(() => {
            const { isLoading: stillLoading } = useCanvasStore.getState();
            if (stillLoading) return;
            handleTextChange(obj);
          }, 10);
        }
      }
    });

    // Constrain object to canvas bounds - only horizontal and top (bottom is infinite)
    const constrainToCanvas = (obj: any) => {
      if (!obj) return;

      // Get bounding rect for accurate dimensions (works with groups, rotation, etc.)
      const rect = obj.getBoundingRect();
      const objLeft = obj.left || 0;
      const objTop = obj.top || 0;

      let newLeft = objLeft;
      let newTop = objTop;

      // Constrain using bounding rect - only left, right, and top (not bottom - canvas grows)
      if (rect.left < 0) {
        newLeft = objLeft - rect.left;
      }
      if (rect.left + rect.width > A4_WIDTH) {
        newLeft = objLeft - (rect.left + rect.width - A4_WIDTH);
      }
      if (rect.top < 0) {
        newTop = objTop - rect.top;
      }
      // No bottom constraint - canvas grows dynamically

      // Only update if changed
      if (newLeft !== objLeft || newTop !== objTop) {
        obj.set({ left: newLeft, top: newTop });
        obj.setCoords();
      }
    };

    // Clear guides and reset snap state when mouse up
    canvas.on("mouse:up", () => {
      clearGuidesOverlayRef.current();
      isDraggingRef.current = false;
      lastSnapXRef.current = null;
      lastSnapYRef.current = null;
      // Update canvas size after movement (infinite canvas grows as needed)
      updateCanvasSizeRef.current?.();
    });

    canvas.on("selection:cleared", () => {
      clearGuidesOverlayRef.current();
    });


    // Advanced guides system with snapping
    canvas.on("mouse:down", (e) => {
      if (e.target && e.target.selectable !== false) {
        isDraggingRef.current = true;
        // Build spatial index when drag starts
        const activeId = (e.target as any).id;
        buildSpatialIndexRef.current(activeId);
      }
    });

    canvas.on("object:moving", (e) => {
      const obj = e.target;
      if (!obj) return;

      const objId = (obj as any).id || 'unknown';
      const rawLeft = obj.left || 0;
      const rawTop = obj.top || 0;

      // Get actual visible dimensions (consistent with fabricObjectToElementData)
      const objType = (obj as any).type?.toLowerCase() || '';
      const isText = objType === 'textbox' || objType === 'i-text' || objType === 'text';

      let objWidth: number;
      let objHeight: number;

      if (isText || objType === 'rect' || objType === 'circle' || objType === 'ellipse' || objType === 'polygon') {
        // Use actual dimensions * scale
        const scaleX = obj.scaleX || 1;
        const scaleY = obj.scaleY || 1;
        objWidth = (obj.width || 0) * scaleX;
        objHeight = (obj.height || 0) * scaleY;
      } else {
        // Use bounding rect for other types (images, groups, etc.)
        const rect = obj.getBoundingRect();
        objWidth = rect.width;
        objHeight = rect.height;
      }

      // Create ElementData with actual visible bounds
      const activeEl: ElementData = {
        id: objId,
        x: rawLeft,
        y: rawTop,
        w: objWidth,
        h: objHeight,
        isText,
      };

      // Get current canvas height for page alignment
      const currentCanvasHeight = canvas.getHeight() / canvas.getZoom();

      // Compute guides and snaps
      const result = computeGuidesAndSnaps(
        activeEl,
        rawLeft,
        rawTop,
        zoomRef.current,
        spatialIndexRef.current,
        GUIDES_CONFIG,
        lastSnapXRef.current,
        lastSnapYRef.current,
        currentCanvasHeight
      );

      // Apply corrected position
      let correctedLeft = result.correctedX;
      let correctedTop = result.correctedY;

      // Constrain to canvas bounds (horizontal only)
      if (correctedLeft < 0) {
        correctedLeft = 0;
      }
      if (correctedLeft + objWidth > A4_WIDTH) {
        correctedLeft = A4_WIDTH - objWidth;
      }
      if (correctedTop < 0) {
        correctedTop = 0;
      }

      obj.set({ left: correctedLeft, top: correctedTop });

      // Update last snap refs for hysteresis
      if (result.snapKeyX) {
        const xGuide = result.guides.find(g => g.axis === 'x');
        lastSnapXRef.current = { key: result.snapKeyX, pos: xGuide?.pos || 0 };
      } else {
        lastSnapXRef.current = null;
      }

      if (result.snapKeyY) {
        const yGuide = result.guides.find(g => g.axis === 'y');
        lastSnapYRef.current = { key: result.snapKeyY, pos: yGuide?.pos || 0 };
      } else {
        lastSnapYRef.current = null;
      }

      // Render guides overlay
      if (result.guides.length > 0) {
        renderGuidesOverlayRef.current(result.guides);
      } else {
        clearGuidesOverlayRef.current();
      }

      // Show page break guide when object crosses page boundary
      const bottomEdge = correctedTop + objHeight;
      const pageNumber = Math.floor(bottomEdge / A4_HEIGHT);
      if (pageNumber > 0) {
        const nearestPageBreak = pageNumber * A4_HEIGHT;
        if (Math.abs(bottomEdge - nearestPageBreak) < 50) {
          const pageBreakGuide: Guide = {
            kind: 'align',
            axis: 'y',
            pos: nearestPageBreak,
            span1: 0,
            span2: A4_WIDTH,
          };
          renderGuidesOverlayRef.current([...result.guides, pageBreakGuide]);
        }
      }
    });

    // Track original bounds before scaling starts (for push-down logic)
    let originalBounds: { bottom: number; right: number } | null = null;

    canvas.on("mouse:down", (e) => {
      const obj = e.target;
      if (obj && obj.selectable !== false) {
        const rect = obj.getBoundingRect();
        originalBounds = {
          bottom: rect.top + rect.height,
          right: rect.left + rect.width,
        };
      }
    });

    // Constrain on scaling (for non-textbox objects)
    canvas.on("object:scaling", (e) => {
      const obj = e.target;
      if (obj) constrainToCanvas(obj);
    });

    // Constrain on object added and update canvas size for infinite canvas
    canvas.on("object:added", (e) => {
      const obj = e.target;
      if (obj) {
        constrainToCanvas(obj);
        // Update canvas size to accommodate new element (infinite canvas grows as needed)
        setTimeout(() => updateCanvasSizeRef.current?.(), 0);
      }
    });

    // Set up event listeners
    canvas.on("selection:created", (e) => {
      setSelectedObjects(e.selected || []);
    });

    canvas.on("selection:updated", (e) => {
      setSelectedObjects(e.selected || []);
    });

    canvas.on("selection:cleared", () => {
      setSelectedObjects([]);
    });

    canvas.on("object:modified", (e: any) => {
      // Skip during undo/redo operations to prevent history corruption
      const { isLoading } = useCanvasStore.getState();
      if (isLoading) return;

      const obj = e.target;
      if (!obj) return;

      // For textbox: ensure text reflows properly after resize, but preserve manual height
      if (obj.type === 'textbox') {
        const textbox = obj as Textbox;
        const manualHeight = (textbox as any)._manualHeight;

        // Recalculate text dimensions (this will reset height to text height)
        textbox.initDimensions();

        // Restore manual height if it was set and is larger than text
        if (manualHeight) {
          const textHeight = textbox.calcTextHeight ? textbox.calcTextHeight() : textbox.height;
          if (manualHeight > textHeight) {
            textbox.set({ height: manualHeight });
          } else {
            // Text grew larger than manual height, clear manual height
            (textbox as any)._manualHeight = undefined;
          }
        }

        textbox.setCoords();
      }

      // Push down elements below when object is resized (vertical only)
      // Skip if the resized object is a background element
      if (originalBounds && e.transform?.action === 'scale' && !(obj as any).isBackground) {
        const newRect = obj.getBoundingRect();
        const newBottom = newRect.top + newRect.height;
        const heightDiff = newBottom - originalBounds.bottom;

        // Only push down if height increased significantly (more than 5px)
        if (heightDiff > 5) {
          const objectsToMove = canvas.getObjects().filter((o: any) => {
            // Exclude background elements from being pushed
            if (o === obj || o._isPageBreak || o._isGuide || o.selectable === false || (o as any).isBackground) return false;
            const oRect = o.getBoundingRect();
            const oTop = oRect.top;
            // Object is below the original bottom of resized object
            return oTop >= originalBounds!.bottom - 10;
          });

          objectsToMove.forEach((o: any) => {
            o.set({ top: (o.top || 0) + heightDiff });
            o.setCoords();
          });
        }
      }

      // Reset original bounds
      originalBounds = null;

      canvas.renderAll();

      // Update canvas size to accommodate new positions (infinite canvas)
      updateCanvasSizeRef.current?.();

      saveToHistory();
    });

    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if typing in input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Don't handle if editing text in canvas
      const activeObj = canvas.getActiveObject();
      if (activeObj && (activeObj as any).isEditing) {
        return;
      }

      const { deleteSelected, duplicateSelected } = useCanvasStore.getState();

      // Delete
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
      }

      // Select all (Ctrl/Cmd + A)
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        canvas.discardActiveObject();
        const allObjects = canvas.getObjects().filter(obj => obj.selectable !== false);
        if (allObjects.length > 0) {
          const selection = new ActiveSelection(allObjects, { canvas });
          canvas.setActiveObject(selection);
          canvas.requestRenderAll();
        }
      }

      // Duplicate (Ctrl/Cmd + D)
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        duplicateSelected();
      }

      // Undo (Ctrl/Cmd + Z)
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        useCanvasStore.getState().undo();
      }

      // Redo (Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y)
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        useCanvasStore.getState().redo();
      }

      // AI Assistant (Ctrl/Cmd + I or /)
      if ((e.ctrlKey || e.metaKey) && e.key === "i") {
        e.preventDefault();
        if (activeObj && (activeObj.type === "textbox" || activeObj.type === "i-text")) {
          openAIAssistant(activeObj as IText | Textbox);
        }
      }

      // Group (Ctrl/Cmd + G)
      if ((e.ctrlKey || e.metaKey) && e.key === "g" && !e.shiftKey) {
        e.preventDefault();
        groupSelected();
      }

      // Ungroup (Ctrl/Cmd + Shift + G)
      if ((e.ctrlKey || e.metaKey) && e.key === "g" && e.shiftKey) {
        e.preventDefault();
        ungroupSelected();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    // Listen for canvas resize requests from sidebar
    const handleCanvasResizeRequest = () => {
      setTimeout(() => updateCanvasSizeRef.current?.(), 50);
    };
    window.addEventListener('canvas-resize-request', handleCanvasResizeRequest);

    setCanvas(canvas);
    setCanvasReady(true);

    // Function to constrain all objects on canvas
    const constrainAllObjects = () => {
      canvas.getObjects().forEach((obj) => {
        constrainToCanvas(obj);
      });
      canvas.renderAll();
    };

    // Load initial data or create default structure
    const loadCanvas = () => {
      // Always reset viewport first
      resetViewport(canvas);

      let shouldCreateDefault = true;

      if (initialData) {
        try {
          const data = typeof initialData === 'string' ? JSON.parse(initialData) : initialData;

          // Check if user chose blank canvas (skipDefault flag)
          if (data.skipDefault) {
            shouldCreateDefault = false;
            canvas.renderAll();
            initHistory();
          }

          // Check if this is multi-page format
          const isMultiPage = data.pages && Array.isArray(data.pages) && data.pages.length > 0;

          if (isMultiPage) {
            // Multi-page format - load pages into store
            const storeState = useCanvasStore.getState();
            const currentPageIndex = data.currentPage || 0;
            const pageToLoad = data.pages[currentPageIndex];

            // Update store with pages data
            useCanvasStore.setState({
              pages: data.pages,
              currentPage: currentPageIndex,
              totalPages: data.pages.length,
            });

            // Load the current page onto canvas
            if (pageToLoad && pageToLoad.objects && pageToLoad.objects.length > 0) {
              const canvasData = {
                version: "6.0.0",
                objects: pageToLoad.objects
                  // Filter out old guide lines
                  .filter((obj: any) => !(obj.type === 'line' && obj.selectable === false && obj.evented === false))
                  .map((obj: any) => ({
                    ...obj,
                    left: typeof obj.left === 'number' ? Math.max(0, obj.left) : MARGIN_LEFT,
                    top: typeof obj.top === 'number' ? Math.max(0, obj.top) : MARGIN_TOP,
                  })),
                background: "#ffffff",
              };

              // Check if canvas is still valid before loading
              if (!fabricCanvasRef.current || !canvas.getContext()) {
                console.warn("[loadCanvas] Canvas context lost before loading multi-page data");
                return;
              }

              canvas.loadFromJSON(canvasData).then(() => {
                if (!fabricCanvasRef.current) return;
                resetViewport(canvas);
                // Remove any stray guide lines and configure text objects
                const objectsToRemove: any[] = [];
                canvas.getObjects().forEach((obj: any) => {
                  // Remove guide lines
                  if (obj.type === 'line' && obj.selectable === false && obj.evented === false) {
                    objectsToRemove.push(obj);
                  }
                  // Disable caching for text objects
                  if (obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text') {
                    obj.set({ objectCaching: false, statefullCache: false, noScaleCache: true });
                  }
                });
                objectsToRemove.forEach(obj => canvas.remove(obj));
                canvas.renderAll();
                // Update canvas size for infinite canvas
                setTimeout(() => updateCanvasSizeRef.current?.(), 100);
                // Initialize history with loaded state as base
                initHistory();
              }).catch((err) => {
                console.error("Failed to load multi-page canvas:", err);
              });

              shouldCreateDefault = false;
            }
          } else {
            // Single-page format (backwards compatible)
            const hasValidObjects = data.objects &&
              Array.isArray(data.objects) &&
              data.objects.length > 0 &&
              data.objects.some((obj: any) => obj.type);

            if (hasValidObjects) {
              // Initialize store with single page containing these objects
              useCanvasStore.setState({
                pages: [{ id: `page-${Date.now()}`, objects: data.objects }],
                currentPage: 0,
                totalPages: 1,
              });

              const cleanData = {
                ...data,
                viewportTransform: undefined,
              };
              delete cleanData.viewportTransform;

              if (cleanData.objects) {
                // Filter out old guide lines that might have been saved
                cleanData.objects = cleanData.objects
                  .filter((obj: any) => !(obj.type === 'line' && obj.selectable === false && obj.evented === false))
                  .map((obj: any) => {
                    const minLeft = obj.type === 'rect' && obj.width === A4_WIDTH ? 0 : 0;
                    return {
                      ...obj,
                      left: typeof obj.left === 'number' ? Math.max(minLeft, obj.left) : MARGIN_LEFT,
                      top: typeof obj.top === 'number' ? Math.max(0, obj.top) : MARGIN_TOP,
                    };
                  });
              }

              // Check if canvas is still valid before loading
              if (!fabricCanvasRef.current || !canvas.getContext()) {
                console.warn("[loadCanvas] Canvas context lost before loading single-page data");
                return;
              }

              canvas.loadFromJSON(cleanData).then(() => {
                if (!fabricCanvasRef.current) return;
                resetViewport(canvas);
                // Remove any stray guide lines and configure text objects
                const objectsToRemove: any[] = [];
                canvas.getObjects().forEach((obj: any) => {
                  // Remove guide lines
                  if (obj.type === 'line' && obj.selectable === false && obj.evented === false) {
                    objectsToRemove.push(obj);
                  }
                  // Disable caching for text objects
                  if (obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text') {
                    obj.set({ objectCaching: false, statefullCache: false, noScaleCache: true });
                  }
                });
                objectsToRemove.forEach(obj => canvas.remove(obj));
                canvas.renderAll();
                // Update canvas size for infinite canvas
                setTimeout(() => updateCanvasSizeRef.current?.(), 100);
                // Initialize history with loaded state as base
                initHistory();
              }).catch((err) => {
                console.error("Failed to load canvas data:", err);
                addDefaultResumeStructure(canvas);
                constrainAllObjects();
                // Update canvas size for infinite canvas
                setTimeout(() => updateCanvasSizeRef.current?.(), 100);
                initHistory();
              });

              shouldCreateDefault = false;
            }
          }
        } catch (err) {
          console.error("Failed to parse canvas data:", err);
        }
      }

      if (shouldCreateDefault) {
        // Initialize store with empty first page
        useCanvasStore.setState({
          pages: [{ id: `page-${Date.now()}`, objects: [] }],
          currentPage: 0,
          totalPages: 1,
        });
        addDefaultResumeStructure(canvas);
        constrainAllObjects();
        canvas.renderAll();
        // Update canvas size for infinite canvas
        setTimeout(() => updateCanvasSizeRef.current?.(), 100);
        // Initialize history with default state as base
        initHistory();
      }
    };

    loadCanvas();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("paste", handlePaste);
      window.removeEventListener('canvas-resize-request', handleCanvasResizeRequest);
      try {
        if (fabricCanvasRef.current) {
          fabricCanvasRef.current.dispose();
        }
      } catch (e) {
        console.warn("Error during canvas cleanup:", e);
      }
      fabricCanvasRef.current = null;
      lastInitialDataRef.current = undefined;
      resetStore();
    };
  }, [initialData, resetViewport, resetStore]);

  // Helper function to apply grid pattern
  const applyGridPattern = useCallback((canvas: Canvas, enabled: boolean) => {
    if (enabled) {
      const patternCanvas = document.createElement('canvas');
      patternCanvas.width = GRID_SIZE;
      patternCanvas.height = GRID_SIZE;
      const ctx = patternCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, GRID_SIZE, GRID_SIZE);
        ctx.fillStyle = '#d4d4d8';
        ctx.beginPath();
        ctx.arc(0, 0, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      const pattern = patternCanvas.toDataURL();
      const canvasEl = canvas.getElement();
      canvasEl.style.backgroundImage = `url(${pattern})`;
      canvasEl.style.backgroundRepeat = 'repeat';
      canvas.backgroundColor = 'transparent';
    } else {
      const canvasEl = canvas.getElement();
      canvasEl.style.backgroundImage = '';
      canvas.backgroundColor = '#ffffff';
    }
    canvas.renderAll();
  }, []);

  // Toggle grid background - runs when showGrid changes or canvas becomes available
  const [canvasReady, setCanvasReady] = useState(false);

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !canvasReady) return;
    applyGridPattern(canvas, showGrid);
  }, [showGrid, canvasReady, applyGridPattern]);

  // Apply zoom by resizing canvas - keeps vector quality
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !canvasReady) return;

    // Resize canvas to zoomed dimensions (use dynamic canvasHeight for infinite canvas)
    const newWidth = A4_WIDTH * zoom;
    const newHeight = canvasHeight * zoom;

    canvas.setDimensions({ width: newWidth, height: newHeight });
    canvas.setZoom(zoom);
    canvas.requestRenderAll();

    // Re-apply grid after resize
    applyGridPattern(canvas, showGrid);

    // Resize overlay canvas to match
    const overlayCanvas = overlayCanvasRef.current;
    if (overlayCanvas) {
      const dpr = window.devicePixelRatio || 1;
      overlayCanvas.width = newWidth * dpr;
      overlayCanvas.height = newHeight * dpr;
      overlayCanvas.style.width = `${newWidth}px`;
      overlayCanvas.style.height = `${newHeight}px`;

      const ctx = overlayCanvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    }
  }, [zoom, canvasReady, showGrid, applyGridPattern, canvasHeight]);

  // Mouse wheel zoom handler
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;

      e.preventDefault();

      const delta = e.deltaY;
      let newZoom: number;

      if (delta < 0) {
        newZoom = Math.min(zoom * 1.1, MAX_ZOOM);
      } else {
        newZoom = Math.max(zoom / 1.1, MIN_ZOOM);
      }

      setZoom(newZoom);
    };

    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [zoom, setZoom]);

  // Space + Drag to pan
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const spaceHeldRef = useRef(false);
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);
  const panStateRef = useRef<{
    isPanning: boolean;
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
    allowScroll: boolean; // Flag to allow our programmatic scroll changes
  }>({ isPanning: false, startX: 0, startY: 0, scrollLeft: 0, scrollTop: 0, allowScroll: false });

  // Store scroll position to restore if space causes unwanted scroll
  const lockedScrollRef = useRef<{ left: number; top: number } | null>(null);

  // Handle space key for panning mode
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Always prevent space from scrolling the page (except in inputs)
      if (e.code === "Space") {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return;
        }
        // Check if editing text in canvas
        const canvas = fabricCanvasRef.current;
        if (canvas) {
          const activeObj = canvas.getActiveObject();
          if (activeObj && (activeObj as any).isEditing) {
            return;
          }
        }
        e.preventDefault();
        e.stopPropagation();

        if (!spaceHeldRef.current) {
          spaceHeldRef.current = true;
          setIsSpaceHeld(true);
          // Lock scroll position when space is first pressed
          if (scrollContainer) {
            lockedScrollRef.current = {
              left: scrollContainer.scrollLeft,
              top: scrollContainer.scrollTop,
            };
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        e.stopPropagation();
        spaceHeldRef.current = false;
        setIsSpaceHeld(false);
        panStateRef.current.isPanning = false;
        lockedScrollRef.current = null;
      }
    };

    // Use capture phase to intercept before other handlers
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("keyup", handleKeyUp, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("keyup", handleKeyUp, { capture: true });
    };
  }, []);

  // Block unwanted scroll events when space is held
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      // If space is held and we're not actively panning, restore scroll position
      if (spaceHeldRef.current && !panStateRef.current.allowScroll && lockedScrollRef.current) {
        scrollContainer.scrollLeft = lockedScrollRef.current.left;
        scrollContainer.scrollTop = lockedScrollRef.current.top;
      }
    };

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Pan handlers using native events for better performance
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (!spaceHeldRef.current) return;

      e.preventDefault();
      e.stopPropagation();

      panStateRef.current = {
        isPanning: true,
        startX: e.clientX,
        startY: e.clientY,
        scrollLeft: scrollContainer.scrollLeft,
        scrollTop: scrollContainer.scrollTop,
        allowScroll: true, // Allow our scroll changes
      };

      // Update locked position for panning
      lockedScrollRef.current = {
        left: scrollContainer.scrollLeft,
        top: scrollContainer.scrollTop,
      };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!panStateRef.current.isPanning) return;

      const dx = e.clientX - panStateRef.current.startX;
      const dy = e.clientY - panStateRef.current.startY;

      const newLeft = panStateRef.current.scrollLeft - dx;
      const newTop = panStateRef.current.scrollTop - dy;

      // Update locked position as we pan
      lockedScrollRef.current = { left: newLeft, top: newTop };

      scrollContainer.scrollLeft = newLeft;
      scrollContainer.scrollTop = newTop;
    };

    const handleMouseUp = () => {
      panStateRef.current.isPanning = false;
      panStateRef.current.allowScroll = false;
    };

    scrollContainer.addEventListener("mousedown", handleMouseDown, { capture: true });
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      scrollContainer.removeEventListener("mousedown", handleMouseDown, { capture: true });
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // Auto-save effect - saves multi-page data
  useEffect(() => {
    if (!isDirty || !onSave) return;

    const timer = setTimeout(() => {
      const canvas = fabricCanvasRef.current;
      if (canvas) {
        try {
          // Get current canvas objects with custom properties
          const customProps = ["semanticType", "semanticGroup", "id", "photoShape", "isPhoto", "isPhotoPlaceholder", "isBackground"];
          const currentCanvasData = (canvas as any).toJSON(customProps);
          delete currentCanvasData.viewportTransform;

          // Filter out guide lines from saved objects (by checking selectable=false and evented=false for Line types)
          if (currentCanvasData.objects) {
            currentCanvasData.objects = currentCanvasData.objects.filter(
              (obj: any) => !(obj.type === 'line' && obj.selectable === false && obj.evented === false)
            );
          }

          // Get store state for multi-page
          const storeState = useCanvasStore.getState();
          const { pages, currentPage } = storeState;

          // Update current page with canvas objects
          const updatedPages = [...pages];
          updatedPages[currentPage] = {
            ...updatedPages[currentPage],
            objects: currentCanvasData.objects || [],
          };

          // Save as multi-page format
          const multiPageData = {
            version: "6.0.0",
            pages: updatedPages,
            currentPage,
            background: "#ffffff",
          };

          onSave(JSON.stringify(multiPageData));
          markClean();
        } catch (err) {
          console.error("Failed to save canvas:", err);
        }
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [isDirty, onSave, markClean]);

  // Drag and drop state
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDraggingOver(true);
  }, []);

  // Handle drag leave
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only set to false if we're actually leaving the container
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingOver(false);
    }
  }, []);

  // Create element at specific position
  const createElementAtPosition = useCallback((type: string, left: number, top: number) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // Check if loading (undo/redo in progress) - skip if so
    const { isLoading } = useCanvasStore.getState();
    if (isLoading) return;

    let element: any;

    switch (type) {
      case "text":
        element = new Textbox("Click to edit text", {
          left,
          top,
          fontSize: 11,
          fontFamily: "Arial, sans-serif",
          fill: "#52525b",
          width: CONTENT_WIDTH,
        });
        break;
      case "heading":
        element = new IText("SECTION TITLE", {
          left,
          top,
          fontSize: 12,
          fontFamily: "Arial, sans-serif",
          fontWeight: "bold",
          fill: "#18181b",
          charSpacing: 50,
        });
        break;
      case "subheading":
        element = new IText("Subheading", {
          left,
          top,
          fontSize: 13,
          fontFamily: "Arial, sans-serif",
          fontWeight: "bold",
          fill: "#27272a",
        });
        break;
      case "rectangle":
        element = new Rect({
          left,
          top,
          width: CONTENT_WIDTH,
          height: 50,
          fill: "#f4f4f5",
          stroke: "#e4e4e7",
          strokeWidth: 1,
          rx: 4,
          ry: 4,
        });
        break;
      case "circle":
        element = new FabricCircle({
          left,
          top,
          radius: 25,
          fill: "#f4f4f5",
          stroke: "#e4e4e7",
          strokeWidth: 1,
        });
        break;
      case "line":
        element = new Rect({
          left,
          top,
          width: CONTENT_WIDTH,
          height: 1,
          fill: "#e4e4e7",
        });
        break;
      case "email":
        element = new IText("email@example.com", {
          left,
          top,
          fontSize: 11,
          fontFamily: "Arial, sans-serif",
          fill: "#52525b",
        });
        break;
      case "phone":
        element = new IText("+1 (555) 123-4567", {
          left,
          top,
          fontSize: 11,
          fontFamily: "Arial, sans-serif",
          fill: "#52525b",
        });
        break;
      case "location":
        element = new IText("City, Country", {
          left,
          top,
          fontSize: 11,
          fontFamily: "Arial, sans-serif",
          fill: "#52525b",
        });
        break;
      case "website":
        element = new IText("www.yourwebsite.com", {
          left,
          top,
          fontSize: 11,
          fontFamily: "Arial, sans-serif",
          fill: "#3b82f6",
        });
        break;
      case "github":
        element = new IText("github.com/username", {
          left,
          top,
          fontSize: 11,
          fontFamily: "Arial, sans-serif",
          fill: "#52525b",
        });
        break;
      case "linkedin":
        element = new IText("linkedin.com/in/username", {
          left,
          top,
          fontSize: 11,
          fontFamily: "Arial, sans-serif",
          fill: "#0077b5",
        });
        break;
      default:
        return;
    }

    if (element) {
      element.id = nanoid();
      canvas.add(element);
      canvas.setActiveObject(element);
      canvas.renderAll();
      saveToHistory();
    }
  }, [saveToHistory]);

  // Create section at position (simplified - sections are complex multi-element structures)
  const createSectionAtPosition = useCallback((type: string, startY: number) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // Check if loading (undo/redo in progress) - skip if so
    const { isLoading } = useCanvasStore.getState();
    if (isLoading) return;

    const addSectionLabel = (label: string, top: number): number => {
      const text = new IText(label.toUpperCase(), {
        left: MARGIN_LEFT,
        top: top,
        fontSize: 12,
        fontFamily: "Arial, sans-serif",
        fontWeight: "bold",
        fill: "#18181b",
        charSpacing: 50,
      });
      (text as any).id = nanoid();
      canvas.add(text);
      return top + 22;
    };

    switch (type) {
      case "header":
        // Header background
        const headerBg = new Rect({
          left: 0,
          top: 0,
          width: A4_WIDTH,
          height: 120,
          fill: "#18181b",
        });
        (headerBg as any).id = nanoid();
        canvas.add(headerBg);

        const nameText = new IText("Your Name", {
          left: MARGIN_LEFT,
          top: 30,
          fontSize: 28,
          fontFamily: "Arial, sans-serif",
          fontWeight: "bold",
          fill: "#ffffff",
        });
        (nameText as any).id = nanoid();
        canvas.add(nameText);

        const titleText = new IText("Professional Title", {
          left: MARGIN_LEFT,
          top: 70,
          fontSize: 14,
          fontFamily: "Arial, sans-serif",
          fill: "#a1a1aa",
        });
        (titleText as any).id = nanoid();
        canvas.add(titleText);
        break;

      case "summary":
        const summaryY = addSectionLabel("Summary", startY);
        const summaryText = new Textbox(
          "A brief summary of your professional background, key skills, and career objectives.",
          {
            left: MARGIN_LEFT,
            top: summaryY,
            fontSize: 11,
            fontFamily: "Arial, sans-serif",
            fill: "#52525b",
            width: CONTENT_WIDTH,
            lineHeight: 1.5,
          }
        );
        (summaryText as any).id = nanoid();
        canvas.add(summaryText);
        break;

      case "experience":
        const expY = addSectionLabel("Experience", startY);
        const jobTitle = new IText("Job Title", {
          left: MARGIN_LEFT,
          top: expY,
          fontSize: 13,
          fontFamily: "Arial, sans-serif",
          fontWeight: "bold",
          fill: "#27272a",
        });
        (jobTitle as any).id = nanoid();
        canvas.add(jobTitle);

        const company = new IText("Company Name | Jan 2020 - Present", {
          left: MARGIN_LEFT,
          top: expY + 18,
          fontSize: 11,
          fontFamily: "Arial, sans-serif",
          fill: "#71717a",
        });
        (company as any).id = nanoid();
        canvas.add(company);

        const desc = new Textbox(
          "• Achieved significant results through innovative approaches\n• Led cross-functional teams to deliver projects on time",
          {
            left: MARGIN_LEFT,
            top: expY + 38,
            fontSize: 11,
            fontFamily: "Arial, sans-serif",
            fill: "#52525b",
            width: CONTENT_WIDTH,
            lineHeight: 1.5,
          }
        );
        (desc as any).id = nanoid();
        canvas.add(desc);
        break;

      case "education":
        const eduY = addSectionLabel("Education", startY);
        const degree = new IText("Bachelor of Science in Computer Science", {
          left: MARGIN_LEFT,
          top: eduY,
          fontSize: 13,
          fontFamily: "Arial, sans-serif",
          fontWeight: "bold",
          fill: "#27272a",
        });
        (degree as any).id = nanoid();
        canvas.add(degree);

        const school = new IText("University Name | 2016 - 2020", {
          left: MARGIN_LEFT,
          top: eduY + 18,
          fontSize: 11,
          fontFamily: "Arial, sans-serif",
          fill: "#71717a",
        });
        (school as any).id = nanoid();
        canvas.add(school);
        break;

      case "skills":
        const skillsY = addSectionLabel("Skills", startY);
        const skills = new Textbox(
          "JavaScript • TypeScript • React • Node.js • Python • SQL • Git • AWS",
          {
            left: MARGIN_LEFT,
            top: skillsY,
            fontSize: 11,
            fontFamily: "Arial, sans-serif",
            fill: "#52525b",
            width: CONTENT_WIDTH,
          }
        );
        (skills as any).id = nanoid();
        canvas.add(skills);
        break;

      case "certifications":
        const certY = addSectionLabel("Certifications", startY);
        const cert = new IText("AWS Certified Solutions Architect - Amazon (2023)", {
          left: MARGIN_LEFT,
          top: certY,
          fontSize: 11,
          fontFamily: "Arial, sans-serif",
          fill: "#52525b",
        });
        (cert as any).id = nanoid();
        canvas.add(cert);
        break;

      case "languages":
        const langY = addSectionLabel("Languages", startY);
        const langs = new IText("English (Native) • Ukrainian (Native) • German (B1)", {
          left: MARGIN_LEFT,
          top: langY,
          fontSize: 11,
          fontFamily: "Arial, sans-serif",
          fill: "#52525b",
        });
        (langs as any).id = nanoid();
        canvas.add(langs);
        break;

      case "projects":
        const projY = addSectionLabel("Projects", startY);
        const projectName = new IText("Project Name", {
          left: MARGIN_LEFT,
          top: projY,
          fontSize: 13,
          fontFamily: "Arial, sans-serif",
          fontWeight: "bold",
          fill: "#27272a",
        });
        (projectName as any).id = nanoid();
        canvas.add(projectName);

        const projectDesc = new Textbox(
          "Brief description of the project and technologies used.",
          {
            left: MARGIN_LEFT,
            top: projY + 18,
            fontSize: 11,
            fontFamily: "Arial, sans-serif",
            fill: "#52525b",
            width: CONTENT_WIDTH,
          }
        );
        (projectDesc as any).id = nanoid();
        canvas.add(projectDesc);
        break;

      case "interests":
        const intY = addSectionLabel("Interests", startY);
        const interests = new IText("Open Source • Machine Learning • Photography • Travel", {
          left: MARGIN_LEFT,
          top: intY,
          fontSize: 11,
          fontFamily: "Arial, sans-serif",
          fill: "#52525b",
        });
        (interests as any).id = nanoid();
        canvas.add(interests);
        break;

      case "objective":
        const objY = addSectionLabel("Objective", startY);
        const objective = new Textbox(
          "Seeking a challenging position where I can leverage my skills to contribute to innovative projects.",
          {
            left: MARGIN_LEFT,
            top: objY,
            fontSize: 11,
            fontFamily: "Arial, sans-serif",
            fill: "#52525b",
            width: CONTENT_WIDTH,
            lineHeight: 1.5,
          }
        );
        (objective as any).id = nanoid();
        canvas.add(objective);
        break;

      default:
        // For unknown section types, just add a label at the drop position
        addSectionLabel(type, startY);
        break;
    }

    canvas.renderAll();
    saveToHistory();
  }, [saveToHistory]);

  // Handle drop on canvas
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);

    const canvas = fabricCanvasRef.current;
    const canvasElement = canvasRef.current;
    const scrollContainer = scrollContainerRef.current;
    if (!canvas || !canvasElement || !scrollContainer) return;

    const elementType = e.dataTransfer.getData("elementType");
    const category = e.dataTransfer.getData("category");

    if (!elementType) return;

    // Calculate drop position relative to canvas element
    const canvasRect = canvasElement.getBoundingClientRect();

    // Get mouse position relative to canvas visible area
    let dropX = e.clientX - canvasRect.left;
    let dropY = e.clientY - canvasRect.top;

    // Account for zoom level
    const currentZoom = canvas.getZoom();
    dropX = dropX / currentZoom;
    dropY = dropY / currentZoom;

    // Constrain X to canvas bounds with margin (infinite canvas only constrains horizontally)
    dropX = Math.max(MARGIN_LEFT, Math.min(dropX, A4_WIDTH - MARGIN_RIGHT - 50));
    // Y is not constrained for infinite canvas - only minimum top margin
    dropY = Math.max(MARGIN_TOP, dropY);

    // Snap to grid
    dropX = Math.round(dropX / GRID_SIZE) * GRID_SIZE;
    dropY = Math.round(dropY / GRID_SIZE) * GRID_SIZE;

    if (category === "element") {
      createElementAtPosition(elementType, dropX, dropY);
    } else if (category === "section") {
      createSectionAtPosition(elementType, dropY);
    }

    // Update canvas size after adding element (for infinite canvas)
    setTimeout(() => updateCanvasSizeRef.current?.(), 100);
  }, [createElementAtPosition, createSectionAtPosition]);

  // Calculate wrapper dimensions based on zoom
  // Note: canvasHeight state is used for the actual canvas height (infinite canvas)
  const padding = 24;

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Inner scroll container - isolated from parent layout */}
      <div
        ref={scrollContainerRef}
        className={`absolute inset-0 overflow-auto ${isSpaceHeld ? "cursor-grab select-none" : ""}`}
      >
        {/* Content wrapper - inline-flex ensures it shrinks to content size */}
        <div
          className="inline-flex items-center justify-center min-w-full min-h-full"
          style={{ padding }}
        >
          {/* Canvas wrapper - Fabric.js handles zoom via setZoom for vector quality */}
          {/* pointer-events-none when panning to prevent canvas interaction */}
          <div
            className={`shadow-2xl rounded-sm flex-shrink-0 relative ${isDraggingOver ? "ring-2 ring-blue-500 ring-offset-2" : ""}`}
            style={{ pointerEvents: isSpaceHeld ? "none" : "auto" }}
          >
            <canvas ref={canvasRef} />
            {/* Overlay canvas for guides rendering */}
            <canvas
              ref={overlayCanvasRef}
              className="absolute top-0 left-0 pointer-events-none"
              style={{ zIndex: 10 }}
            />
          </div>
        </div>
      </div>

      {/* AI Text Assistant */}
      <AITextAssistant
        isOpen={showAIAssistant}
        onClose={() => {
          setShowAIAssistant(false);
          selectedTextObjectRef.current = null;
        }}
        selectedText={selectedText}
        onApply={handleApplyAIText}
        position={aiAssistantPosition}
        canvasRect={canvasRect}
      />
    </div>
  );
}

// Helper function to add default resume structure
function addDefaultResumeStructure(canvas: Canvas) {
  // Clear canvas first to avoid duplicates
  canvas.clear();
  canvas.backgroundColor = "#ffffff";

  // Header background
  const headerBg = new Rect({
    left: 0,
    top: 0,
    width: A4_WIDTH,
    height: 120,
    fill: "#18181b",
    selectable: true,
    evented: true,
  });
  (headerBg as any).id = nanoid();
  (headerBg as any).name = "header-bg";
  canvas.add(headerBg);

  // Name - using IText for editable text
  const nameText = new IText("Your Name", {
    left: MARGIN_LEFT,
    top: 35,
    fontSize: 32,
    fontFamily: "Arial, sans-serif",
    fontWeight: "bold",
    fill: "#ffffff",
    originX: "left",
    originY: "top",
  });
  (nameText as any).id = nanoid();
  canvas.add(nameText);

  // Title
  const titleText = new IText("Professional Title", {
    left: MARGIN_LEFT,
    top: 75,
    fontSize: 16,
    fontFamily: "Arial, sans-serif",
    fill: "#a1a1aa",
    originX: "left",
    originY: "top",
  });
  (titleText as any).id = nanoid();
  canvas.add(titleText);

  // Contact info
  const contactText = new IText("email@example.com | +1 234 567 890 | City, Country", {
    left: MARGIN_LEFT,
    top: 140,
    fontSize: 11,
    fontFamily: "Arial, sans-serif",
    fill: "#71717a",
    originX: "left",
    originY: "top",
  });
  (contactText as any).id = nanoid();
  canvas.add(contactText);

  // Summary section
  const summaryLabel = new IText("PROFESSIONAL SUMMARY", {
    left: MARGIN_LEFT,
    top: 180,
    fontSize: 12,
    fontFamily: "Arial, sans-serif",
    fontWeight: "bold",
    fill: "#18181b",
    charSpacing: 50,
    originX: "left",
    originY: "top",
  });
  (summaryLabel as any).id = nanoid();
  canvas.add(summaryLabel);

  const summaryText = new Textbox(
    "A brief summary of your professional background, key skills, and career objectives.",
    {
      left: MARGIN_LEFT,
      top: 205,
      fontSize: 11,
      fontFamily: "Arial, sans-serif",
      fill: "#52525b",
      width: CONTENT_WIDTH,
      lineHeight: 1.4,
      originX: "left",
      originY: "top",
    }
  );
  (summaryText as any).id = nanoid();
  canvas.add(summaryText);

  // Experience section
  const experienceLabel = new IText("WORK EXPERIENCE", {
    left: MARGIN_LEFT,
    top: 270,
    fontSize: 12,
    fontFamily: "Arial, sans-serif",
    fontWeight: "bold",
    fill: "#18181b",
    charSpacing: 50,
    originX: "left",
    originY: "top",
  });
  (experienceLabel as any).id = nanoid();
  canvas.add(experienceLabel);

  const jobTitle = new IText("Job Title", {
    left: MARGIN_LEFT,
    top: 295,
    fontSize: 13,
    fontFamily: "Arial, sans-serif",
    fontWeight: "bold",
    fill: "#27272a",
    originX: "left",
    originY: "top",
  });
  (jobTitle as any).id = nanoid();
  canvas.add(jobTitle);

  const company = new IText("Company Name | Jan 2020 - Present", {
    left: MARGIN_LEFT,
    top: 315,
    fontSize: 11,
    fontFamily: "Arial, sans-serif",
    fill: "#71717a",
    originX: "left",
    originY: "top",
  });
  (company as any).id = nanoid();
  canvas.add(company);

  const jobDesc = new Textbox(
    "• Achieved significant results through innovative approaches\n• Led cross-functional teams to deliver projects on time\n• Implemented solutions that improved efficiency by 30%",
    {
      left: MARGIN_LEFT,
      top: 335,
      fontSize: 11,
      fontFamily: "Arial, sans-serif",
      fill: "#52525b",
      width: CONTENT_WIDTH,
      lineHeight: 1.5,
      originX: "left",
      originY: "top",
    }
  );
  (jobDesc as any).id = nanoid();
  canvas.add(jobDesc);

  // Education section
  const educationLabel = new IText("EDUCATION", {
    left: MARGIN_LEFT,
    top: 430,
    fontSize: 12,
    fontFamily: "Arial, sans-serif",
    fontWeight: "bold",
    fill: "#18181b",
    charSpacing: 50,
    originX: "left",
    originY: "top",
  });
  (educationLabel as any).id = nanoid();
  canvas.add(educationLabel);

  const degree = new IText("Bachelor of Science in Computer Science", {
    left: MARGIN_LEFT,
    top: 455,
    fontSize: 13,
    fontFamily: "Arial, sans-serif",
    fontWeight: "bold",
    fill: "#27272a",
    originX: "left",
    originY: "top",
  });
  (degree as any).id = nanoid();
  canvas.add(degree);

  const school = new IText("University Name | 2016 - 2020", {
    left: MARGIN_LEFT,
    top: 475,
    fontSize: 11,
    fontFamily: "Arial, sans-serif",
    fill: "#71717a",
    originX: "left",
    originY: "top",
  });
  (school as any).id = nanoid();
  canvas.add(school);

  // Skills section
  const skillsLabel = new IText("SKILLS", {
    left: MARGIN_LEFT,
    top: 520,
    fontSize: 12,
    fontFamily: "Arial, sans-serif",
    fontWeight: "bold",
    fill: "#18181b",
    charSpacing: 50,
    originX: "left",
    originY: "top",
  });
  (skillsLabel as any).id = nanoid();
  canvas.add(skillsLabel);

  const skills = new Textbox(
    "JavaScript • TypeScript • React • Node.js • Python • SQL • Git • AWS • Docker • Agile",
    {
      left: MARGIN_LEFT,
      top: 545,
      fontSize: 11,
      fontFamily: "Arial, sans-serif",
      fill: "#52525b",
      width: CONTENT_WIDTH,
      originX: "left",
      originY: "top",
    }
  );
  (skills as any).id = nanoid();
  canvas.add(skills);

  canvas.renderAll();
}

export { A4_WIDTH, A4_HEIGHT, MARGIN_LEFT, MARGIN_RIGHT, MARGIN_TOP, CONTENT_WIDTH, GRID_SIZE };
