"use client";

import { useState } from "react";
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Trash2,
  Copy,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  Download,
  Save,
  Loader2,
  Grid3X3,
  RotateCcw,
  FileText,
  File,
  Sparkles,
  BringToFront,
  SendToBack,
  Group,
  Ungroup,
  Move,
  MoreHorizontal,
  Layers,
  AlignHorizontalDistributeCenter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCanvasStore } from "@/stores/canvas-store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";

// Helper component for toolbar buttons with tooltips
function ToolbarButton({
  icon: Icon,
  tooltip,
  shortcut,
  onClick,
  disabled,
  variant = "ghost",
  className = "",
}: {
  icon: React.ComponentType<{ className?: string }>;
  tooltip: string;
  shortcut?: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "ghost" | "secondary" | "outline";
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={variant}
          size="icon"
          className={`h-8 w-8 ${className}`}
          onClick={onClick}
          disabled={disabled}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="flex flex-col items-center gap-0.5">
        <span>{tooltip}</span>
        {shortcut && <span className="text-[10px] text-zinc-400">{shortcut}</span>}
      </TooltipContent>
    </Tooltip>
  );
}

interface CanvasToolbarProps {
  onExportPDF?: () => void;
  onSave?: () => void;
  isSaving?: boolean;
  isExporting?: boolean;
  onAIAssistant?: () => void;
}

export function CanvasToolbar({ onExportPDF, onSave, isSaving, isExporting, onAIAssistant }: CanvasToolbarProps) {
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();

  const {
    undo,
    redo,
    canUndo,
    canRedo,
    zoom,
    setZoom,
    resetViewport,
    deleteSelected,
    duplicateSelected,
    bringToFront,
    sendToBack,
    groupSelected,
    ungroupSelected,
    canGroup,
    canUngroup,
    alignObjects,
    selectedObjects,
    isDirty,
    showGrid,
    toggleGrid,
    smartArrangeEnabled,
    toggleSmartArrange,
    clear,
  } = useCanvasStore();

  const hasSelection = selectedObjects.length > 0;

  // Zoom constraints (match resume-canvas.tsx)
  const MIN_ZOOM = 0.25;
  const MAX_ZOOM = 3;

  const handleZoomIn = () => {
    const newZoom = Math.min(zoom * 1.2, MAX_ZOOM);
    setZoom(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom / 1.2, MIN_ZOOM);
    setZoom(newZoom);
  };

  const handleZoomReset = () => {
    resetViewport();
  };

  const handleReset = async (useTemplate: boolean) => {
    const match = window.location.pathname.match(/\/resumes\/([^/]+)\/edit/);
    if (!match) return;

    setIsResetting(true);
    const resumeId = match[1];

    try {
      const response = await fetch(`/api/resumes/${resumeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          canvasData: useTemplate
            ? null
            : { version: "6.0.0", objects: [], background: "#ffffff", skipDefault: true },
        }),
      });

      if (response.ok) {
        clear();
        setShowResetDialog(false);
        window.location.href = window.location.href;
      } else {
        toast.error("Failed to reset. Please try again.");
      }
    } catch (err) {
      console.error("Reset failed:", err);
      toast.error("Failed to reset. Please try again.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1 border-b border-zinc-200 bg-white px-2 py-1.5 dark:border-zinc-800 dark:bg-zinc-950 flex-shrink-0">
        {/* Undo/Redo */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            icon={Undo2}
            tooltip="Скасувати"
            shortcut="Ctrl+Z"
            onClick={undo}
            disabled={!canUndo()}
          />
          <ToolbarButton
            icon={Redo2}
            tooltip="Повернути"
            shortcut="Ctrl+Y"
            onClick={redo}
            disabled={!canRedo()}
          />
        </div>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Zoom - compact */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            icon={ZoomOut}
            tooltip="Зменшити"
            onClick={handleZoomOut}
            disabled={zoom <= MIN_ZOOM}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 min-w-[50px] px-1 text-xs"
                onClick={handleZoomReset}
              >
                {Math.round(zoom * 100)}%
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Скинути масштаб</TooltipContent>
          </Tooltip>
          <ToolbarButton
            icon={ZoomIn}
            tooltip="Збільшити"
            onClick={handleZoomIn}
            disabled={zoom >= MAX_ZOOM}
          />
          <ToolbarButton
            icon={Grid3X3}
            tooltip={showGrid ? "Сховати сітку" : "Показати сітку"}
            onClick={toggleGrid}
            variant={showGrid ? "secondary" : "ghost"}
          />
        </div>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Object actions */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            icon={Copy}
            tooltip="Дублювати"
            shortcut="Ctrl+D"
            onClick={duplicateSelected}
            disabled={!hasSelection}
          />
          <ToolbarButton
            icon={Trash2}
            tooltip="Видалити"
            shortcut="Del"
            onClick={deleteSelected}
            disabled={!hasSelection}
          />
          {onAIAssistant && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-teal-600 hover:bg-teal-50 hover:text-teal-700 dark:text-teal-400 dark:hover:bg-teal-950 dark:hover:text-teal-300"
                  onClick={onAIAssistant}
                  disabled={!hasSelection || !selectedObjects.some(obj => obj.type === "textbox" || obj.type === "i-text")}
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">AI Асистент (Ctrl+I)</TooltipContent>
            </Tooltip>
          )}
        </div>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Alignment & Layers - grouped dropdown */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!hasSelection}>
                  <AlignHorizontalDistributeCenter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">Вирівнювання</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel className="text-xs">Горизонтально</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => alignObjects("left")}>
              <AlignLeft className="mr-2 h-4 w-4" /> Ліворуч
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => alignObjects("center")}>
              <AlignCenter className="mr-2 h-4 w-4" /> По центру
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => alignObjects("right")}>
              <AlignRight className="mr-2 h-4 w-4" /> Праворуч
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">Вертикально</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => alignObjects("top")}>
              <AlignStartVertical className="mr-2 h-4 w-4" /> Вгору
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => alignObjects("middle")}>
              <AlignCenterVertical className="mr-2 h-4 w-4" /> По середині
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => alignObjects("bottom")}>
              <AlignEndVertical className="mr-2 h-4 w-4" /> Вниз
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Layers dropdown */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!hasSelection}>
                  <Layers className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">Шари та групування</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel className="text-xs">Порядок</DropdownMenuLabel>
            <DropdownMenuItem onClick={bringToFront}>
              <BringToFront className="mr-2 h-4 w-4" /> На передній план
            </DropdownMenuItem>
            <DropdownMenuItem onClick={sendToBack}>
              <SendToBack className="mr-2 h-4 w-4" /> На задній план
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">Групування</DropdownMenuLabel>
            <DropdownMenuItem onClick={groupSelected} disabled={!canGroup()}>
              <Group className="mr-2 h-4 w-4" /> Згрупувати (Ctrl+G)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={ungroupSelected} disabled={!canUngroup()}>
              <Ungroup className="mr-2 h-4 w-4" /> Розгрупувати
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Smart Arrange Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={smartArrangeEnabled ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={toggleSmartArrange}
            >
              <Move className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[200px] text-center">
            <span>{smartArrangeEnabled ? "Swap Mode: ON" : "Swap Mode: OFF"}</span>
          </TooltipContent>
        </Tooltip>

        {/* Spacer */}
        <div className="flex-1 min-w-2" />

        {/* Save indicator - hidden on small screens */}
        <span className={`mr-2 text-xs text-zinc-500 hidden sm:inline ${isDirty ? "opacity-100" : "opacity-0"}`}>
          Незбережені зміни
        </span>

        {/* More actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setShowResetDialog(true)}>
              <RotateCcw className="mr-2 h-4 w-4" /> Скинути канвас
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Save & Export - compact */}
        <div className="flex items-center gap-1">
          {onSave && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onSave}
                  disabled={isSaving || !isDirty}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Зберегти (Ctrl+S)</TooltipContent>
            </Tooltip>
          )}
          {onExportPDF && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" className="h-8 px-3" onClick={onExportPDF} disabled={isExporting}>
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  <span className="ml-1.5 hidden sm:inline">PDF</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Експорт PDF</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Reset Dialog */}
        <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Скинути канвас</DialogTitle>
              <DialogDescription>
                Очистити поточний вміст і почати спочатку. Оберіть варіант:
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              <Button
                variant="outline"
                className="h-auto flex-col items-start gap-1 p-4 text-left"
                onClick={() => handleReset(true)}
                disabled={isResetting}
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-zinc-600" />
                  <span className="font-semibold">З шаблоном</span>
                </div>
                <span className="text-xs text-zinc-500">
                  Готова структура резюме з секціями
                </span>
              </Button>
              <Button
                variant="outline"
                className="h-auto flex-col items-start gap-1 p-4 text-left"
                onClick={() => handleReset(false)}
                disabled={isResetting}
              >
                <div className="flex items-center gap-2">
                  <File className="h-5 w-5 text-zinc-600" />
                  <span className="font-semibold">Порожній</span>
                </div>
                <span className="text-xs text-zinc-500">
                  Пустий канвас для створення з нуля
                </span>
              </Button>
            </div>
            <div className="flex justify-end">
              <Button variant="ghost" onClick={() => setShowResetDialog(false)} disabled={isResetting}>
                Скасувати
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
