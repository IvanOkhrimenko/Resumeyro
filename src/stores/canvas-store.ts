import { create } from "zustand";
import { Group, ActiveSelection } from "fabric";
import type { Canvas, Object as FabricObject } from "fabric";

// A4 dimensions at 96 DPI - must match resume-canvas.tsx
const A4_WIDTH = 595;
const A4_HEIGHT = 842;

// Page data structure
export interface PageData {
  id: string;
  objects: any[];
}

// Constrain a single object to canvas bounds
// For infinite canvas: only constrain horizontally, allow unlimited vertical
const constrainObjectToBounds = (obj: FabricObject) => {
  if (!obj) return;

  const scaleX = obj.scaleX || 1;
  const objWidth = (obj.width || 0) * scaleX;

  let left = typeof obj.left === 'number' ? obj.left : 40;
  let top = typeof obj.top === 'number' ? obj.top : 40;

  // Horizontal boundary enforcement only (infinite canvas - no vertical limit)
  left = Math.max(0, left);
  if (objWidth > 0 && left + objWidth > A4_WIDTH) {
    left = Math.max(0, A4_WIDTH - objWidth);
  }
  // Only enforce minimum top (no negative positions)
  top = Math.max(0, top);

  obj.set({ left, top });
  obj.setCoords();
};

export interface CanvasElement {
  id: string;
  type: "text" | "image" | "shape" | "section";
  data: Record<string, unknown>;
}

interface HistoryState {
  json: string;
  timestamp: number;
}

interface CanvasStore {
  canvas: Canvas | null;
  selectedObjects: FabricObject[];
  history: HistoryState[];
  historyIndex: number;
  isDirty: boolean;
  isLoading: boolean;
  zoom: number;
  showGrid: boolean;

  // Multi-page support
  pages: PageData[];
  currentPage: number;
  totalPages: number;

  // AI Assistant trigger counter
  aiAssistantTrigger: number;

  // Canvas actions
  setCanvas: (canvas: Canvas | null) => void;
  setSelectedObjects: (objects: FabricObject[]) => void;
  setZoom: (zoom: number) => void;
  resetViewport: () => void;
  setLoading: (loading: boolean) => void;
  toggleGrid: () => void;
  triggerAIAssistant: () => void;

  // Page actions
  addPage: () => void;
  deletePage: (pageIndex: number) => void;
  goToPage: (pageIndex: number) => void;
  saveCurrentPage: () => void;
  loadPage: (pageIndex: number) => void;

  // History actions
  saveToHistory: () => void;
  initHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Dirty state
  markDirty: () => void;
  markClean: () => void;

  // Canvas operations
  deleteSelected: () => void;
  duplicateSelected: () => void;
  bringForward: () => void;
  sendBackward: () => void;
  bringToFront: () => void;
  sendToBack: () => void;
  groupSelected: () => void;
  ungroupSelected: () => void;
  canGroup: () => boolean;
  canUngroup: () => boolean;
  alignObjects: (alignment: "left" | "center" | "right" | "top" | "middle" | "bottom") => void;

  // Smart arrange mode
  smartArrangeEnabled: boolean;
  toggleSmartArrange: () => void;

  // Serialization
  toJSON: () => string | null;
  toMultiPageJSON: () => string | null;
  loadFromJSON: (json: string) => Promise<void>;
  clear: () => void;
  reset: () => void;

  // Canvas resize request (triggers updateCanvasSize in resume-canvas)
  requestCanvasResize: () => void;
}

const MAX_HISTORY = 50;

// Custom properties to include in JSON serialization
const CUSTOM_PROPERTIES = ["semanticType", "semanticGroup", "id", "photoShape", "isPhoto", "isPhotoPlaceholder", "isBackground"];

// Generate unique page ID
const generatePageId = () => `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  canvas: null,
  selectedObjects: [],
  history: [],
  historyIndex: -1,
  isDirty: false,
  isLoading: false,
  zoom: 1,
  showGrid: true,

  // Multi-page state
  pages: [{ id: generatePageId(), objects: [] }],
  currentPage: 0,
  totalPages: 1,

  // AI Assistant trigger counter
  aiAssistantTrigger: 0,

  // Smart arrange mode
  smartArrangeEnabled: false,

  setCanvas: (canvas) => set({ canvas }),

  // Increment trigger to notify subscribers
  triggerAIAssistant: () => set((state) => ({ aiAssistantTrigger: state.aiAssistantTrigger + 1 })),

  setSelectedObjects: (objects) => set({ selectedObjects: objects }),

  setZoom: (newZoom) => {
    // Just update state - component useEffect handles canvas resize and setZoom
    set({ zoom: newZoom });
  },

  // Reset zoom to 100%
  resetViewport: () => {
    set({ zoom: 1 });
  },

  setLoading: (loading) => set({ isLoading: loading }),

  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),

  // Page management methods
  saveCurrentPage: () => {
    const { canvas, pages, currentPage } = get();
    if (!canvas) return;

    const objects = (canvas as any).toJSON(CUSTOM_PROPERTIES).objects || [];
    const updatedPages = [...pages];
    updatedPages[currentPage] = {
      ...updatedPages[currentPage],
      objects,
    };

    set({ pages: updatedPages, isDirty: true });
  },

  loadPage: (pageIndex: number) => {
    const { canvas, pages } = get();
    if (!canvas || pageIndex < 0 || pageIndex >= pages.length) return;

    const pageData = pages[pageIndex];
    const canvasJSON = {
      version: "6.0.0",
      objects: pageData.objects,
      background: "#ffffff",
    };

    canvas.loadFromJSON(JSON.stringify(canvasJSON)).then(() => {
      // Constrain and configure all objects after loading
      canvas.getObjects().forEach((obj: any) => {
        constrainObjectToBounds(obj);
        if (obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text') {
          obj.set({
            objectCaching: false,
            statefullCache: false,
            noScaleCache: true,
          });
        }
      });
      canvas.renderAll();
      set({ currentPage: pageIndex });
    });
  },

  addPage: () => {
    const { canvas, pages, currentPage } = get();
    if (!canvas) return;

    // Save current page first
    get().saveCurrentPage();

    // Get background elements from current canvas (sidebars, column backgrounds)
    // Use canvas.toJSON() to get current state
    const currentCanvasData = (canvas as any).toJSON(CUSTOM_PROPERTIES);
    const canvasObjects = (currentCanvasData as any).objects || [];

    const backgroundObjects = canvasObjects.filter((o: any) => {
      if (o.type === 'rect') {
        const height = o.height || 0;
        const scaleY = o.scaleY || 1;
        const actualHeight = height * scaleY;

        // Copy if: tall rectangle (>30% page height)
        const isTall = actualHeight > A4_HEIGHT * 0.3;
        return isTall;
      }
      return false;
    }).map((o: any) => ({
      ...o,
      id: `bg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // New unique ID
    }));

    // Create new page with copied background elements
    const newPage: PageData = {
      id: generatePageId(),
      objects: backgroundObjects,
    };

    const newPages = [...pages, newPage];
    const newPageIndex = newPages.length - 1;

    // Load new page with background elements
    const canvasJSON = {
      version: "6.0.0",
      objects: backgroundObjects,
      background: "#ffffff",
    };

    canvas.loadFromJSON(JSON.stringify(canvasJSON)).then(() => {
      canvas.getObjects().forEach((obj: any) => {
        constrainObjectToBounds(obj);
        if (obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text') {
          obj.set({
            objectCaching: false,
            statefullCache: false,
            noScaleCache: true,
          });
        }
      });
      canvas.renderAll();
    });

    set({
      pages: newPages,
      currentPage: newPageIndex,
      totalPages: newPages.length,
      isDirty: true,
    });

    return newPageIndex;
  },

  deletePage: (pageIndex: number) => {
    const { canvas, pages, currentPage } = get();
    if (!canvas || pages.length <= 1 || pageIndex < 0 || pageIndex >= pages.length) return;

    const newPages = pages.filter((_, i) => i !== pageIndex);
    let newCurrentPage = currentPage;

    // Adjust current page if needed
    if (pageIndex <= currentPage) {
      newCurrentPage = Math.max(0, currentPage - 1);
    }

    set({
      pages: newPages,
      totalPages: newPages.length,
      isDirty: true,
    });

    // Load the new current page
    get().loadPage(newCurrentPage);
  },

  goToPage: (pageIndex: number) => {
    const { pages, currentPage } = get();
    if (pageIndex < 0 || pageIndex >= pages.length || pageIndex === currentPage) return;

    // Save current page before switching
    get().saveCurrentPage();

    // Load the target page
    get().loadPage(pageIndex);
  },

  saveToHistory: () => {
    const { canvas, history, historyIndex, isLoading } = get();
    // Don't save history while loading to prevent corrupted states
    if (!canvas || isLoading) return;

    // Get canvas data and filter out guide lines
    const canvasData = (canvas as any).toJSON(CUSTOM_PROPERTIES);
    canvasData.objects = (canvasData.objects || []).filter((obj: any) =>
      !obj._isGuide && !(obj.type === 'line' && obj.selectable === false && obj.evented === false)
    );
    const json = JSON.stringify(canvasData);

    // Don't save if JSON is the same as current state (no changes)
    if (history[historyIndex]?.json === json) return;

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ json, timestamp: Date.now() });

    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift();
    }

    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
      isDirty: true,
    });
  },

  // Initialize history with the current canvas state (called after initial load)
  initHistory: () => {
    const { canvas } = get();
    if (!canvas) return;

    // Get canvas data and filter out guide lines
    const canvasData = (canvas as any).toJSON(CUSTOM_PROPERTIES);
    canvasData.objects = (canvasData.objects || []).filter((obj: any) =>
      !obj._isGuide && !(obj.type === 'line' && obj.selectable === false && obj.evented === false)
    );
    const json = JSON.stringify(canvasData);
    set({
      history: [{ json, timestamp: Date.now() }],
      historyIndex: 0,
      isDirty: false,
    });
  },

  undo: () => {
    const { canvas, history, historyIndex, isLoading } = get();
    if (!canvas || historyIndex <= 0 || isLoading) return;

    const newIndex = historyIndex - 1;
    const state = history[newIndex];

    // Validate state before loading
    if (!state?.json) return;

    set({ isLoading: true });

    // Clear canvas first to prevent artifacts
    canvas.clear();

    canvas.loadFromJSON(state.json).then(() => {
      // Remove guide lines and configure objects
      const objectsToRemove: any[] = [];
      canvas.getObjects().forEach((obj: any) => {
        // Remove guide lines
        if (obj.type === 'line' && obj.selectable === false && obj.evented === false) {
          objectsToRemove.push(obj);
          return;
        }
        constrainObjectToBounds(obj);
        // Disable caching for text objects
        if (obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text') {
          obj.set({
            objectCaching: false,
            statefullCache: false,
            noScaleCache: true,
          });
        }
      });
      objectsToRemove.forEach(obj => canvas.remove(obj));
      canvas.renderAll();
      set({ historyIndex: newIndex, isDirty: true, isLoading: false });
    }).catch(() => {
      set({ isLoading: false });
    });
  },

  redo: () => {
    const { canvas, history, historyIndex, isLoading } = get();
    if (!canvas || historyIndex >= history.length - 1 || isLoading) return;

    const newIndex = historyIndex + 1;
    const state = history[newIndex];

    // Validate state before loading
    if (!state?.json) return;

    set({ isLoading: true });

    // Clear canvas first to prevent artifacts
    canvas.clear();

    canvas.loadFromJSON(state.json).then(() => {
      // Remove guide lines and configure objects
      const objectsToRemove: any[] = [];
      canvas.getObjects().forEach((obj: any) => {
        // Remove guide lines
        if (obj.type === 'line' && obj.selectable === false && obj.evented === false) {
          objectsToRemove.push(obj);
          return;
        }
        constrainObjectToBounds(obj);
        // Disable caching for text objects
        if (obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text') {
          obj.set({
            objectCaching: false,
            statefullCache: false,
            noScaleCache: true,
          });
        }
      });
      objectsToRemove.forEach(obj => canvas.remove(obj));
      canvas.renderAll();
      set({ historyIndex: newIndex, isDirty: true, isLoading: false });
    }).catch(() => {
      set({ isLoading: false });
    });
  },

  canUndo: () => {
    const { historyIndex } = get();
    return historyIndex > 0;
  },

  canRedo: () => {
    const { history, historyIndex } = get();
    return historyIndex < history.length - 1;
  },

  markDirty: () => set({ isDirty: true }),
  markClean: () => set({ isDirty: false }),

  deleteSelected: () => {
    const { canvas } = get();
    if (!canvas) return;

    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length === 0) return;

    activeObjects.forEach((obj) => canvas.remove(obj));
    canvas.discardActiveObject();
    canvas.renderAll();
    get().saveToHistory();
  },

  duplicateSelected: () => {
    const { canvas } = get();
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    activeObject.clone().then((cloned: FabricObject) => {
      cloned.set({
        left: (activeObject.left || 0) + 20,
        top: (activeObject.top || 0) + 20,
      });
      // Constrain to canvas bounds
      constrainObjectToBounds(cloned);
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      canvas.renderAll();
      get().saveToHistory();
    });
  },

  bringForward: () => {
    const { canvas } = get();
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      canvas.bringObjectForward(activeObject);
      canvas.renderAll();
      get().saveToHistory();
    }
  },

  sendBackward: () => {
    const { canvas } = get();
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      canvas.sendObjectBackwards(activeObject);
      canvas.renderAll();
      get().saveToHistory();
    }
  },

  bringToFront: () => {
    const { canvas } = get();
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      canvas.bringObjectToFront(activeObject);
      canvas.renderAll();
      get().saveToHistory();
    }
  },

  sendToBack: () => {
    const { canvas } = get();
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      canvas.sendObjectToBack(activeObject);
      canvas.renderAll();
      get().saveToHistory();
    }
  },

  groupSelected: () => {
    const { canvas } = get();
    if (!canvas) return;

    const activeSelection = canvas.getActiveObject();
    if (!activeSelection || activeSelection.type !== 'activeselection') return;

    const objects = (activeSelection as any).getObjects();
    if (objects.length < 2) return;

    // Get the selection's transform to preserve position
    const selectionLeft = activeSelection.left || 0;
    const selectionTop = activeSelection.top || 0;

    // Remove objects from canvas
    canvas.discardActiveObject();
    objects.forEach((obj: any) => canvas.remove(obj));

    // Create group with the objects
    const group = new Group(objects, {
      left: selectionLeft,
      top: selectionTop,
    });

    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.requestRenderAll();
    get().saveToHistory();
  },

  ungroupSelected: () => {
    const { canvas } = get();
    if (!canvas) return;

    const group = canvas.getActiveObject();
    if (!group || group.type !== "group") return;

    // Get objects from group with their absolute positions
    const items = (group as any).getObjects();
    const groupLeft = group.left || 0;
    const groupTop = group.top || 0;
    const groupScaleX = group.scaleX || 1;
    const groupScaleY = group.scaleY || 1;

    // Remove the group from canvas
    canvas.remove(group);

    // Add individual objects back with correct absolute positions
    const addedObjects: any[] = [];
    items.forEach((item: any) => {
      // Calculate absolute position
      const itemLeft = groupLeft + (item.left || 0) * groupScaleX;
      const itemTop = groupTop + (item.top || 0) * groupScaleY;

      item.set({
        left: itemLeft,
        top: itemTop,
        scaleX: (item.scaleX || 1) * groupScaleX,
        scaleY: (item.scaleY || 1) * groupScaleY,
      });
      item.setCoords();
      canvas.add(item);
      addedObjects.push(item);
    });

    // Select all ungrouped objects
    if (addedObjects.length > 0) {
      canvas.setActiveObject(new ActiveSelection(addedObjects, { canvas }));
    }

    canvas.requestRenderAll();
    get().saveToHistory();
  },

  canGroup: () => {
    const { selectedObjects } = get();
    return selectedObjects.length >= 2;
  },

  canUngroup: () => {
    const { selectedObjects } = get();
    return selectedObjects.length === 1 && selectedObjects[0]?.type === "group";
  },

  toggleSmartArrange: () => set((state) => ({ smartArrangeEnabled: !state.smartArrangeEnabled })),

  alignObjects: (alignment) => {
    const { canvas } = get();
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    const canvasWidth = canvas.getWidth();
    const canvasHeight = canvas.getHeight();

    switch (alignment) {
      case "left":
        activeObject.set({ left: 0 });
        break;
      case "center":
        activeObject.set({ left: (canvasWidth - (activeObject.width || 0)) / 2 });
        break;
      case "right":
        activeObject.set({ left: canvasWidth - (activeObject.width || 0) });
        break;
      case "top":
        activeObject.set({ top: 0 });
        break;
      case "middle":
        activeObject.set({ top: (canvasHeight - (activeObject.height || 0)) / 2 });
        break;
      case "bottom":
        activeObject.set({ top: canvasHeight - (activeObject.height || 0) });
        break;
    }

    canvas.renderAll();
    get().saveToHistory();
  },

  toJSON: () => {
    const { canvas } = get();
    if (!canvas) return null;
    const canvasData = (canvas as any).toJSON(CUSTOM_PROPERTIES);
    canvasData.objects = (canvasData.objects || []).filter((obj: any) =>
      !obj._isGuide && !(obj.type === 'line' && obj.selectable === false && obj.evented === false)
    );
    return JSON.stringify(canvasData);
  },

  toMultiPageJSON: () => {
    const { canvas, pages, currentPage } = get();
    if (!canvas) return null;

    // Save current page first (filter out guides)
    const canvasData = (canvas as any).toJSON(CUSTOM_PROPERTIES);
    const currentObjects = (canvasData.objects || []).filter((obj: any) =>
      !obj._isGuide && !(obj.type === 'line' && obj.selectable === false && obj.evented === false)
    );
    const updatedPages = [...pages];
    updatedPages[currentPage] = {
      ...updatedPages[currentPage],
      objects: currentObjects,
    };

    return JSON.stringify({
      version: "6.0.0",
      pages: updatedPages,
      currentPage,
    });
  },

  loadFromJSON: async (json) => {
    const { canvas } = get();
    if (!canvas) return;

    // Check if canvas context is still valid
    try {
      const ctx = canvas.getContext();
      if (!ctx) {
        console.warn("[loadFromJSON] Canvas context is null, skipping load");
        return;
      }
    } catch {
      console.warn("[loadFromJSON] Canvas context check failed, skipping load");
      return;
    }

    set({ isLoading: true });
    try {
      // Clear canvas first
      canvas.clear();

      await canvas.loadFromJSON(json);
      // Constrain all objects to canvas bounds after loading
      // Also disable caching for text objects to prevent rendering artifacts
      canvas.getObjects().forEach((obj: any) => {
        constrainObjectToBounds(obj);
        if (obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text') {
          obj.set({
            objectCaching: false,
            statefullCache: false,
            noScaleCache: true,
          });
        }
      });
      canvas.renderAll();
      // Initialize history with the loaded state as base
      get().initHistory();
    } finally {
      set({ isLoading: false });
    }
  },

  clear: () => {
    const { canvas } = get();
    if (canvas) {
      canvas.clear();
      canvas.renderAll();
    }
    set({
      history: [],
      historyIndex: -1,
      isDirty: false,
      selectedObjects: [],
    });
  },

  // Reset entire store state
  reset: () => {
    set({
      canvas: null,
      selectedObjects: [],
      history: [],
      historyIndex: -1,
      isDirty: false,
      isLoading: false,
      zoom: 1,
      showGrid: true,
      pages: [{ id: generatePageId(), objects: [] }],
      currentPage: 0,
      totalPages: 1,
      aiAssistantTrigger: 0,
      smartArrangeEnabled: true,
    });
  },

  // Request canvas resize - dispatches event that resume-canvas listens to
  requestCanvasResize: () => {
    window.dispatchEvent(new CustomEvent('canvas-resize-request'));
  },
}));
