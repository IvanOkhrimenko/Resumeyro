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

// Layer data structure
export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  color: string; // Visual indicator color
  order: number; // Layer order (0 = back, higher = front)
}

// Default layers
const DEFAULT_LAYERS: Layer[] = [
  { id: 'background', name: 'Background', visible: true, locked: false, color: '#8b5cf6', order: 0 },
  { id: 'content', name: 'Content', visible: true, locked: false, color: '#3b82f6', order: 1 },
  { id: 'foreground', name: 'Foreground', visible: true, locked: false, color: '#10b981', order: 2 },
];

// Generate unique layer ID
const generateLayerId = () => `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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

  // Layer system
  layers: Layer[];
  activeLayerId: string;
  addLayer: (name: string) => void;
  deleteLayer: (layerId: string) => void;
  renameLayer: (layerId: string, name: string) => void;
  toggleLayerVisibility: (layerId: string) => void;
  toggleLayerLock: (layerId: string) => void;
  reorderLayers: (fromIndex: number, toIndex: number) => void;
  setActiveLayer: (layerId: string) => void;
  moveObjectToLayer: (objectIdOrObject: string | any, layerId: string) => void;
  getObjectsInLayer: (layerId: string) => FabricObject[];
  reorderCanvasByLayers: () => void;

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
const CUSTOM_PROPERTIES = ["semanticType", "semanticGroup", "id", "photoShape", "isPhoto", "isPhotoPlaceholder", "isBackground", "layerId"];

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

  // Layer system state
  layers: [...DEFAULT_LAYERS],
  activeLayerId: 'content',

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
      // Move to foreground layer and remove background flag
      (activeObject as any).layerId = 'foreground';
      (activeObject as any).isBackground = false;
      // Reorder canvas to reflect layer change
      get().reorderCanvasByLayers();
      // Then bring to front within foreground layer
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
      // Move to background layer and mark as background element
      (activeObject as any).layerId = 'background';
      (activeObject as any).isBackground = true;
      // Reorder canvas to reflect layer change
      get().reorderCanvasByLayers();
      // Then send to back within background layer
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

  // Layer system actions
  addLayer: (name: string) => {
    const { layers } = get();
    const maxOrder = Math.max(...layers.map(l => l.order));
    const colors = ['#f59e0b', '#ef4444', '#06b6d4', '#84cc16', '#f97316', '#a855f7'];
    const usedColors = new Set(layers.map(l => l.color));
    const availableColor = colors.find(c => !usedColors.has(c)) || colors[0];

    const newLayer: Layer = {
      id: generateLayerId(),
      name,
      visible: true,
      locked: false,
      color: availableColor,
      order: maxOrder + 1,
    };

    set({ layers: [...layers, newLayer] });
  },

  deleteLayer: (layerId: string) => {
    const { canvas, layers } = get();
    // Cannot delete default layers
    if (['background', 'content', 'foreground'].includes(layerId)) return;
    if (!canvas) return;

    // Move objects from deleted layer to content layer
    canvas.getObjects().forEach((obj: any) => {
      if (obj.layerId === layerId) {
        obj.layerId = 'content';
      }
    });

    set({
      layers: layers.filter(l => l.id !== layerId),
    });
    get().reorderCanvasByLayers();
    get().saveToHistory();
  },

  renameLayer: (layerId: string, name: string) => {
    const { layers } = get();
    set({
      layers: layers.map(l =>
        l.id === layerId ? { ...l, name } : l
      ),
    });
  },

  toggleLayerVisibility: (layerId: string) => {
    const { canvas, layers } = get();
    const layer = layers.find(l => l.id === layerId);
    if (!layer || !canvas) return;

    const newVisible = !layer.visible;
    canvas.getObjects().forEach((obj: any) => {
      if (obj.layerId === layerId) {
        obj.visible = newVisible;
      }
    });
    canvas.renderAll();

    set({
      layers: layers.map(l =>
        l.id === layerId ? { ...l, visible: newVisible } : l
      ),
    });
  },

  toggleLayerLock: (layerId: string) => {
    const { canvas, layers } = get();
    const layer = layers.find(l => l.id === layerId);
    if (!layer || !canvas) return;

    const newLocked = !layer.locked;
    canvas.getObjects().forEach((obj: any) => {
      if (obj.layerId === layerId) {
        obj.selectable = !newLocked;
        obj.evented = !newLocked;
      }
    });
    canvas.renderAll();

    set({
      layers: layers.map(l =>
        l.id === layerId ? { ...l, locked: newLocked } : l
      ),
    });
  },

  reorderLayers: (fromIndex: number, toIndex: number) => {
    const { layers } = get();
    const sortedLayers = [...layers].sort((a, b) => a.order - b.order);

    // Move layer from fromIndex to toIndex
    const [movedLayer] = sortedLayers.splice(fromIndex, 1);
    sortedLayers.splice(toIndex, 0, movedLayer);

    // Reassign order values
    const updatedLayers = sortedLayers.map((layer, index) => ({
      ...layer,
      order: index,
    }));

    set({ layers: updatedLayers });
    get().reorderCanvasByLayers();
    get().saveToHistory();
  },

  setActiveLayer: (layerId: string) => {
    set({ activeLayerId: layerId });
  },

  moveObjectToLayer: (objectIdOrObject: string | any, layerId: string) => {
    const { canvas, layers } = get();
    if (!canvas) return;

    const targetLayer = layers.find(l => l.id === layerId);
    if (!targetLayer) return;

    // Find the object - either by ID or use the object directly
    let obj: any;
    if (typeof objectIdOrObject === 'string') {
      obj = canvas.getObjects().find((o: any) => o.id === objectIdOrObject);
    } else {
      obj = objectIdOrObject;
    }

    if (!obj) return;

    obj.layerId = layerId;
    // Update isBackground based on layer
    obj.isBackground = layerId === 'background';
    // Apply layer's visibility and lock state
    obj.visible = targetLayer.visible;
    obj.selectable = !targetLayer.locked;
    obj.evented = !targetLayer.locked;

    get().reorderCanvasByLayers();
    canvas.renderAll();
    get().saveToHistory();
  },

  getObjectsInLayer: (layerId: string) => {
    const { canvas } = get();
    if (!canvas) return [];

    return canvas.getObjects().filter((obj: any) => {
      const objLayerId = obj.layerId || 'content';
      return objLayerId === layerId;
    });
  },

  reorderCanvasByLayers: () => {
    const { canvas, layers } = get();
    if (!canvas) return;

    const objects = canvas.getObjects();
    const sortedLayers = [...layers].sort((a, b) => a.order - b.order);

    // Group objects by layer, preserving their relative order within each layer
    const objectsByLayer = new Map<string, FabricObject[]>();
    sortedLayers.forEach(l => objectsByLayer.set(l.id, []));
    // Also handle objects without a layer (put them in content)
    objectsByLayer.set('content', objectsByLayer.get('content') || []);

    objects.forEach((obj: any) => {
      const layerId = obj.layerId || 'content';
      const layerObjects = objectsByLayer.get(layerId);
      if (layerObjects) {
        layerObjects.push(obj);
      } else {
        // Unknown layer, put in content
        objectsByLayer.get('content')?.push(obj);
      }
    });

    // Rebuild canvas objects array in correct order
    (canvas as any)._objects = [];
    sortedLayers.forEach(layer => {
      const layerObjects = objectsByLayer.get(layer.id) || [];
      layerObjects.forEach(obj => (canvas as any)._objects.push(obj));
    });

    canvas.renderAll();
  },

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
      layers: [...DEFAULT_LAYERS],
      activeLayerId: 'content',
    });
  },

  // Request canvas resize - dispatches event that resume-canvas listens to
  requestCanvasResize: () => {
    window.dispatchEvent(new CustomEvent('canvas-resize-request'));
  },
}));
