"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Type,
  Image as ImageIcon,
  Square,
  Circle,
  Minus,
  Layers,
  MoreHorizontal,
  GripVertical,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useCanvasStore, type Layer } from "@/stores/canvas-store";
import { cn } from "@/lib/utils";

// Helper to get object display name
function getObjectDisplayName(obj: any): string {
  if (obj.type === "textbox" || obj.type === "i-text" || obj.type === "text") {
    const text = obj.text || "";
    return text.substring(0, 18) + (text.length > 18 ? "…" : "") || "Text";
  }
  if (obj.type === "image") {
    return obj.isPhoto ? "Photo" : "Image";
  }
  if (obj.type === "rect") {
    return "Rectangle";
  }
  if (obj.type === "circle" || obj.type === "ellipse") {
    return "Circle";
  }
  if (obj.type === "line") {
    return "Line";
  }
  if (obj.type === "group") {
    return "Group";
  }
  return obj.type || "Object";
}

// Helper to get object icon
function ObjectIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case "textbox":
    case "i-text":
    case "text":
      return <Type className={className} />;
    case "image":
      return <ImageIcon className={className} />;
    case "rect":
      return <Square className={className} />;
    case "circle":
    case "ellipse":
      return <Circle className={className} />;
    case "line":
      return <Minus className={className} />;
    default:
      return <Square className={className} />;
  }
}

interface LayerItemProps {
  layer: Layer;
  objects: any[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  selectedObjectId: string | null;
  onDragOver: (e: React.DragEvent, layerId: string) => void;
  onDrop: (e: React.DragEvent, layerId: string) => void;
  isDragTarget: boolean;
  onObjectMoved: () => void;
}

function LayerItem({
  layer,
  objects,
  isExpanded,
  onToggleExpand,
  selectedObjectId,
  onDragOver,
  onDrop,
  isDragTarget,
  onObjectMoved,
}: LayerItemProps) {
  const t = useTranslations("layerPanel");
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(layer.name);

  // Handle drag start for objects - uses event handler, not during render
  const handleDragStart = useCallback((e: React.DragEvent, obj: any) => {
    // Store object reference in module-level store (can't pass object through dataTransfer)
    draggedObjectStore.current = obj;
    e.dataTransfer.setData("sourceLayerId", layer.id);
    e.dataTransfer.effectAllowed = "move";
  }, [layer.id]);

  const {
    canvas,
    toggleLayerVisibility,
    toggleLayerLock,
    renameLayer,
    deleteLayer,
    moveObjectToLayer,
    layers,
    activeLayerId,
    setActiveLayer,
  } = useCanvasStore();

  const isDefaultLayer = ["background", "content", "foreground"].includes(layer.id);
  const isActive = activeLayerId === layer.id;

  const handleRename = () => {
    if (newName.trim() && newName !== layer.name) {
      renameLayer(layer.id, newName.trim());
    }
    setIsRenaming(false);
  };

  const handleSelectObject = (obj: any) => {
    if (!canvas || layer.locked) return;
    canvas.setActiveObject(obj);
    canvas.renderAll();
  };

  // Get translated name for default layers
  const displayName = isDefaultLayer
    ? t(layer.id as "background" | "content" | "foreground")
    : layer.name;

  return (
    <div className="select-none">
      {/* Layer Header */}
      <div
        className={cn(
          "group flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-all cursor-pointer border-2",
          isActive
            ? "bg-gradient-to-r from-zinc-100 to-zinc-50 dark:from-zinc-800 dark:to-zinc-800/50 border-zinc-200 dark:border-zinc-700 shadow-sm"
            : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border-transparent",
          isDragTarget && "border-violet-400 bg-violet-50 dark:bg-violet-900/20"
        )}
        onClick={() => setActiveLayer(layer.id)}
        onDragOver={(e) => onDragOver(e, layer.id)}
        onDrop={(e) => onDrop(e, layer.id)}
      >
        {/* Expand/Collapse */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          className="p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
          )}
        </button>

        {/* Color indicator - styled as a small bar */}
        <div
          className="h-4 w-1 rounded-full shrink-0"
          style={{ backgroundColor: layer.color }}
        />

        {/* Layer name */}
        {isRenaming && !isDefaultLayer ? (
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") {
                setNewName(layer.name);
                setIsRenaming(false);
              }
            }}
            className="h-5 px-1.5 py-0 text-xs flex-1 bg-white dark:bg-zinc-900"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className={cn(
              "flex-1 text-xs font-medium truncate transition-colors",
              !layer.visible ? "text-zinc-400 dark:text-zinc-500 line-through" : "text-zinc-700 dark:text-zinc-200"
            )}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (!isDefaultLayer) {
                setNewName(layer.name);
                setIsRenaming(true);
              }
            }}
          >
            {displayName}
          </span>
        )}

        {/* Object count badge */}
        {objects.length > 0 && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 tabular-nums">
            {objects.length}
          </span>
        )}

        {/* Quick actions - always visible for better UX */}
        <div className="flex items-center gap-0.5">
          {/* Visibility toggle */}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLayerVisibility(layer.id);
                  }}
                  className={cn(
                    "p-1 rounded transition-all",
                    layer.visible
                      ? "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
                      : "text-zinc-300 dark:text-zinc-600 hover:text-zinc-500"
                  )}
                >
                  {layer.visible ? (
                    <Eye className="h-3.5 w-3.5" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">{t("visibility")}</TooltipContent>
            </Tooltip>

            {/* Lock toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLayerLock(layer.id);
                  }}
                  className={cn(
                    "p-1 rounded transition-all",
                    layer.locked
                      ? "text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30"
                      : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
                  )}
                >
                  {layer.locked ? (
                    <Lock className="h-3.5 w-3.5" />
                  ) : (
                    <Unlock className="h-3.5 w-3.5" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">{t("lock")}</TooltipContent>
            </Tooltip>

            {/* More menu for custom layers */}
            {!isDefaultLayer && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 rounded text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-700 dark:hover:text-zinc-300 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem
                    onClick={() => {
                      setNewName(layer.name);
                      setIsRenaming(true);
                    }}
                    className="text-xs"
                  >
                    {t("renameLayer")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => deleteLayer(layer.id)}
                    className="text-xs text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-3 w-3 mr-2" />
                    {t("deleteLayer")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </TooltipProvider>
        </div>
      </div>

      {/* Objects List (expanded) */}
      {isExpanded && objects.length > 0 && (
        <div
          className="ml-4 mt-0.5 space-y-0.5 border-l-2 border-zinc-100 dark:border-zinc-800 pl-2"
          onDragOver={(e) => onDragOver(e, layer.id)}
          onDrop={(e) => onDrop(e, layer.id)}
        >
          {objects.map((obj: any, index: number) => {
            const isSelected = selectedObjectId === obj.id;
            // Use object id if available, otherwise use index for stable key
            const itemKey = obj.id || `obj-${index}`;
            return (
              <DropdownMenu key={itemKey}>
                <div
                  draggable={!layer.locked}
                  onDragStart={(e) => handleDragStart(e, obj)}
                  className={cn(
                    "flex items-center gap-1 px-1 py-1 rounded text-xs cursor-pointer group/item transition-all",
                    isSelected
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-800"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400",
                    layer.locked && "opacity-50 cursor-not-allowed",
                    !layer.locked && "cursor-grab active:cursor-grabbing"
                  )}
                  onClick={() => handleSelectObject(obj)}
                >
                  {/* Drag handle */}
                  <GripVertical className="h-3 w-3 text-zinc-300 shrink-0 opacity-0 group-hover/item:opacity-100" />
                  <ObjectIcon type={obj.type} className={cn(
                    "h-3 w-3 shrink-0",
                    isSelected ? "text-blue-500" : "text-zinc-400"
                  )} />
                  <span className="flex-1 truncate">{getObjectDisplayName(obj)}</span>

                  {/* Move to layer trigger */}
                  <DropdownMenuTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="p-0.5 rounded opacity-0 group-hover/item:opacity-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                    >
                      <MoreHorizontal className="h-3 w-3 text-zinc-400" />
                    </button>
                  </DropdownMenuTrigger>
                </div>
                <DropdownMenuContent align="end" className="w-44">
                  <div className="px-2 py-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">
                    {t("moveToLayer")}
                  </div>
                  {layers
                    .filter((l) => l.id !== layer.id)
                    .sort((a, b) => b.order - a.order)
                    .map((targetLayer) => {
                      const targetDisplayName = ["background", "content", "foreground"].includes(targetLayer.id)
                        ? t(targetLayer.id as "background" | "content" | "foreground")
                        : targetLayer.name;
                      return (
                        <DropdownMenuItem
                          key={targetLayer.id}
                          onClick={() => {
                            moveObjectToLayer(obj, targetLayer.id);
                            onObjectMoved();
                          }}
                          className="text-xs"
                        >
                          <div
                            className="h-3 w-1 rounded-full mr-2"
                            style={{ backgroundColor: targetLayer.color }}
                          />
                          {targetDisplayName}
                        </DropdownMenuItem>
                      );
                    })}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {isExpanded && objects.length === 0 && (
        <div className="ml-4 border-l-2 border-zinc-100 dark:border-zinc-800 pl-2 py-2">
          <p className="text-[10px] text-zinc-400 italic px-2">
            Empty
          </p>
        </div>
      )}
    </div>
  );
}

// Module-level ref for dragged object (shared between LayerItem and LayerPanel)
// Using module-level to avoid prop drilling, safe because drag operations are user-initiated
const draggedObjectStore = { current: null as any };

export function LayerPanel() {
  const t = useTranslations("layerPanel");
  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(
    new Set(["content", "foreground"])
  );
  const [isAddingLayer, setIsAddingLayer] = useState(false);
  const [newLayerName, setNewLayerName] = useState("");
  const [dragTargetLayerId, setDragTargetLayerId] = useState<string | null>(null);
  const [updateTrigger, setUpdateTrigger] = useState(0);

  const {
    canvas,
    layers,
    addLayer,
    getObjectsInLayer,
    selectedObjects,
    moveObjectToLayer,
  } = useCanvasStore();

  // Handle drag over a layer
  const handleDragOver = (e: React.DragEvent, layerId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragTargetLayerId(layerId);
  };

  // Handle drop on a layer
  const handleDrop = useCallback((e: React.DragEvent, targetLayerId: string) => {
    e.preventDefault();
    const sourceLayerId = e.dataTransfer.getData("sourceLayerId");

    if (draggedObjectStore.current && sourceLayerId !== targetLayerId) {
      moveObjectToLayer(draggedObjectStore.current, targetLayerId);
      // Force re-render to update the layer list
      setUpdateTrigger(prev => prev + 1);
    }

    draggedObjectStore.current = null;
    setDragTargetLayerId(null);
  }, [moveObjectToLayer]);

  // Clear drag target when leaving the panel
  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the panel entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragTargetLayerId(null);
    }
  };

  // Sort layers by order (highest first = front)
  const sortedLayers = useMemo(
    () => [...layers].sort((a, b) => b.order - a.order),
    [layers]
  );

  // Get objects for each layer
  const objectsByLayer = useMemo(() => {
    const map = new Map<string, any[]>();
    sortedLayers.forEach((layer) => {
      map.set(layer.id, getObjectsInLayer(layer.id));
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedLayers, getObjectsInLayer, canvas, updateTrigger]);

  const toggleExpand = (layerId: string) => {
    setExpandedLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layerId)) {
        next.delete(layerId);
      } else {
        next.add(layerId);
      }
      return next;
    });
  };

  const handleAddLayer = () => {
    if (newLayerName.trim()) {
      addLayer(newLayerName.trim());
      setNewLayerName("");
      setIsAddingLayer(false);
    }
  };

  const selectedObjectId = (selectedObjects[0] as any)?.id || null;

  // Count total objects
  const totalObjects = sortedLayers.reduce(
    (sum, layer) => sum + (objectsByLayer.get(layer.id)?.length || 0),
    0
  );

  return (
    <div className="space-y-3">
      {/* Header with icon */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm">
            <Layers className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
              {t("title")}
            </h4>
            <p className="text-[10px] text-zinc-400">
              {layers.length} layers · {totalObjects} objects
            </p>
          </div>
        </div>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all"
                onClick={() => setIsAddingLayer(true)}
              >
                <Plus className="h-3.5 w-3.5 text-zinc-500" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">{t("addLayer")}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Add layer input */}
      {isAddingLayer && (
        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800">
          <Input
            value={newLayerName}
            onChange={(e) => setNewLayerName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddLayer();
              if (e.key === "Escape") {
                setNewLayerName("");
                setIsAddingLayer(false);
              }
            }}
            placeholder={t("newLayer")}
            className="h-7 text-xs bg-white dark:bg-zinc-900 border-violet-200 dark:border-violet-700 focus-visible:ring-violet-400"
            autoFocus
          />
          <Button
            size="sm"
            className="h-7 px-2.5 bg-violet-500 hover:bg-violet-600 text-white"
            onClick={handleAddLayer}
            disabled={!newLayerName.trim()}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-zinc-500 hover:text-zinc-700"
            onClick={() => {
              setNewLayerName("");
              setIsAddingLayer(false);
            }}
          >
            ✕
          </Button>
        </div>
      )}

      {/* Layer list */}
      <div
        className="space-y-1 max-h-[320px] overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 p-1.5"
        onDragLeave={handleDragLeave}
      >
        {sortedLayers.map((layer) => (
          <LayerItem
            key={layer.id}
            layer={layer}
            objects={objectsByLayer.get(layer.id) || []}
            isExpanded={expandedLayers.has(layer.id)}
            onToggleExpand={() => toggleExpand(layer.id)}
            selectedObjectId={selectedObjectId}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            isDragTarget={dragTargetLayerId === layer.id}
            onObjectMoved={() => setUpdateTrigger(prev => prev + 1)}
          />
        ))}
      </div>

      {/* Help text */}
      <p className="text-[10px] text-zinc-400 text-center">
        Drag objects to move between layers
      </p>
    </div>
  );
}
