"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Minus,
  Plus,
  CaseSensitive,
  CaseUpper,
  CaseLower,
  Space,
  MoveVertical,
  Image as ImageIcon,
  Pencil,
  FileText,
  Palette,
  Type,
  Loader2,
  Check,
} from "lucide-react";
import { FabricImage } from "fabric";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PhotoEditorModal } from "./photo-editor-modal";
import { useCanvasStore } from "@/stores/canvas-store";
import { cn } from "@/lib/utils";
import { templates, getTemplateCanvasData, type TemplateDefinition } from "@/lib/templates";
import { applyTemplateToSemanticElements, canvasHasSemanticElements } from "@/lib/canvas/semantic-template-switcher";
import { addInferredSemanticTypes } from "@/lib/canvas/infer-semantic-types";

const FONT_FAMILIES = [
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Times New Roman", value: "Times New Roman, serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Courier New", value: "Courier New, monospace" },
  { label: "Helvetica", value: "Helvetica, Arial, sans-serif" },
];

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];

export function TextPropertiesPanel() {
  const { canvas, selectedObjects, saveToHistory, loadFromJSON } = useCanvasStore();

  // Template state
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  // Store original canvas state before first template change
  const [originalCanvasState, setOriginalCanvasState] = useState<any>(null);
  const [isReverting, setIsReverting] = useState(false);

  // Text properties state
  const [fontSize, setFontSize] = useState(11);
  const [fontFamily, setFontFamily] = useState("Arial, sans-serif");
  const [fontColor, setFontColor] = useState("#000000");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right" | "justify">("left");
  const [lineHeight, setLineHeight] = useState(1.4);
  const [charSpacing, setCharSpacing] = useState(0);
  const [textTransform, setTextTransform] = useState<"none" | "uppercase" | "lowercase">("none");

  // Photo editor state
  const [photoEditorOpen, setPhotoEditorOpen] = useState(false);
  const [photoEditorImageUrl, setPhotoEditorImageUrl] = useState("");

  // Get selected text object
  const selectedTextObject = selectedObjects.find(
    (obj) => obj.type === "textbox" || obj.type === "i-text" || obj.type === "text"
  ) as any;

  // Get selected image object
  const selectedImageObject = selectedObjects.find(
    (obj) => obj.type === "image"
  ) as any;

  // Get selected shape object (rect, circle, line, path)
  const selectedShapeObject = selectedObjects.find(
    (obj) => obj.type === "rect" || obj.type === "circle" || obj.type === "line" || obj.type === "path" || obj.type === "ellipse"
  ) as any;

  // Update state when selection changes
  useEffect(() => {
    if (!selectedTextObject) return;

    // Function to get styles (either from selection or whole object)
    const updateStyles = () => {
      const isEditing = selectedTextObject.isEditing;
      const selectionStart = selectedTextObject.selectionStart ?? 0;
      const selectionEnd = selectedTextObject.selectionEnd ?? 0;
      const hasSelection = isEditing && selectionStart !== selectionEnd;

      if (hasSelection) {
        // Get styles from the selection (use first character of selection)
        const styles = selectedTextObject.getSelectionStyles?.(selectionStart, selectionStart + 1)?.[0] || {};
        setFontSize(styles.fontSize || selectedTextObject.fontSize || 11);
        setFontFamily(styles.fontFamily || selectedTextObject.fontFamily || "Arial, sans-serif");
        setFontColor(styles.fill || selectedTextObject.fill || "#000000");
        setIsBold((styles.fontWeight || selectedTextObject.fontWeight) === "bold");
        setIsItalic((styles.fontStyle || selectedTextObject.fontStyle) === "italic");
        setIsUnderline(styles.underline ?? selectedTextObject.underline ?? false);
        setIsStrikethrough(styles.linethrough ?? selectedTextObject.linethrough ?? false);
      } else {
        // Get styles from the whole object
        setFontSize(selectedTextObject.fontSize || 11);
        setFontFamily(selectedTextObject.fontFamily || "Arial, sans-serif");
        setFontColor(selectedTextObject.fill || "#000000");
        setIsBold(selectedTextObject.fontWeight === "bold");
        setIsItalic(selectedTextObject.fontStyle === "italic");
        setIsUnderline(selectedTextObject.underline || false);
        setIsStrikethrough(selectedTextObject.linethrough || false);
      }
      setTextAlign(selectedTextObject.textAlign || "left");
      setLineHeight(selectedTextObject.lineHeight || 1.4);
      setCharSpacing(selectedTextObject.charSpacing || 0);
    };

    // Initial update
    updateStyles();

    // Listen for selection changes when editing
    const handleSelectionChange = () => updateStyles();

    if (canvas) {
      canvas.on('text:selection:changed', handleSelectionChange);
      canvas.on('text:editing:entered', handleSelectionChange);
      canvas.on('text:editing:exited', handleSelectionChange);
    }

    return () => {
      if (canvas) {
        canvas.off('text:selection:changed', handleSelectionChange);
        canvas.off('text:editing:entered', handleSelectionChange);
        canvas.off('text:editing:exited', handleSelectionChange);
      }
    };
  }, [selectedTextObject, canvas]);

  // Apply property to selected text (or text selection if in editing mode)
  const applyProperty = useCallback((property: string, value: any) => {
    if (!canvas || !selectedTextObject) return;

    // Properties that should ALWAYS apply to the whole object (not selection)
    const wholeObjectProperties = ['textAlign', 'lineHeight', 'charSpacing'];

    // Check if we're in editing mode with a text selection
    const isEditing = selectedTextObject.isEditing;
    const selectionStart = selectedTextObject.selectionStart ?? 0;
    const selectionEnd = selectedTextObject.selectionEnd ?? 0;
    const hasSelection = isEditing && selectionStart !== selectionEnd;

    // Capture height BEFORE the change for properties that affect text height
    const heightAffectingProperties = ['fontSize', 'fontFamily', 'fontWeight', 'lineHeight'];
    let previousHeight = 0;
    let previousTop = 0;
    if (heightAffectingProperties.includes(property)) {
      previousHeight = selectedTextObject.calcTextHeight ? selectedTextObject.calcTextHeight() : (selectedTextObject.height || 0);
      previousTop = selectedTextObject.top || 0;
    }

    if (hasSelection && !wholeObjectProperties.includes(property)) {
      // Apply style only to selected text using setSelectionStyles
      // Map property names to style property names
      const styleProperty = property === 'fill' ? 'fill' : property;
      selectedTextObject.setSelectionStyles({ [styleProperty]: value });
    } else {
      // Apply the property change to the whole object
      selectedTextObject.set(property, value);
    }

    // For font size and font family changes, force full dimension recalculation
    if (property === 'fontSize' || property === 'fontFamily' || property === 'fontWeight' || property === 'lineHeight') {
      // Force Fabric.js to recalculate text dimensions
      if (selectedTextObject.initDimensions) {
        selectedTextObject.initDimensions();
      }
      // Also try _initDimensions which is used internally
      if ((selectedTextObject as any)._initDimensions) {
        (selectedTextObject as any)._initDimensions();
      }
      // Force bounding rect recalculation
      selectedTextObject.setCoords();
    }

    // Render first to ensure dimensions are updated
    canvas.requestRenderAll();

    // Fire modified event after rendering to trigger auto-push with correct dimensions
    // Include previous height info for accurate push calculation
    // Note: saveToHistory is called by the object:modified handler in resume-canvas.tsx
    setTimeout(() => {
      // Check if loading (undo/redo in progress) - skip if so
      const { isLoading } = useCanvasStore.getState();
      if (isLoading) return;

      const newHeight = selectedTextObject.calcTextHeight ? selectedTextObject.calcTextHeight() : (selectedTextObject.height || 0);
      canvas.fire('object:modified', {
        target: selectedTextObject,
        // Include previous dimensions for push calculation
        previousHeight: previousHeight,
        previousTop: previousTop,
        newHeight: newHeight,
      });
      // saveToHistory is handled by object:modified handler - no need to call here
    }, 0);
  }, [canvas, selectedTextObject]);

  // Handle font size change
  const handleFontSizeChange = (newSize: number) => {
    const clampedSize = Math.max(6, Math.min(200, newSize));
    setFontSize(clampedSize);
    applyProperty("fontSize", clampedSize);
  };

  // Handle font family change
  const handleFontFamilyChange = (family: string) => {
    setFontFamily(family);
    applyProperty("fontFamily", family);
  };

  // Handle color change
  const handleColorChange = (color: string) => {
    setFontColor(color);
    applyProperty("fill", color);
  };

  // Toggle bold
  const toggleBold = () => {
    const newValue = !isBold;
    setIsBold(newValue);
    applyProperty("fontWeight", newValue ? "bold" : "normal");
  };

  // Toggle italic
  const toggleItalic = () => {
    const newValue = !isItalic;
    setIsItalic(newValue);
    applyProperty("fontStyle", newValue ? "italic" : "normal");
  };

  // Toggle underline
  const toggleUnderline = () => {
    const newValue = !isUnderline;
    setIsUnderline(newValue);
    applyProperty("underline", newValue);
  };

  // Toggle strikethrough
  const toggleStrikethrough = () => {
    const newValue = !isStrikethrough;
    setIsStrikethrough(newValue);
    applyProperty("linethrough", newValue);
  };

  // Set text alignment
  const handleTextAlign = (align: "left" | "center" | "right" | "justify") => {
    setTextAlign(align);
    applyProperty("textAlign", align);
  };

  // Handle line height change
  const handleLineHeightChange = (value: number) => {
    const clampedValue = Math.max(0.5, Math.min(3, value));
    setLineHeight(clampedValue);
    applyProperty("lineHeight", clampedValue);
  };

  // Handle character spacing change
  const handleCharSpacingChange = (value: number) => {
    const clampedValue = Math.max(-200, Math.min(800, value));
    setCharSpacing(clampedValue);
    applyProperty("charSpacing", clampedValue);
  };

  // Handle text transform (uppercase/lowercase)
  const handleTextTransform = (transform: "none" | "uppercase" | "lowercase") => {
    if (!selectedTextObject || !canvas) return;
    setTextTransform(transform);

    const isEditing = selectedTextObject.isEditing;
    const selectionStart = selectedTextObject.selectionStart ?? 0;
    const selectionEnd = selectedTextObject.selectionEnd ?? 0;
    const hasSelection = isEditing && selectionStart !== selectionEnd;

    const currentText = selectedTextObject.text || "";
    let newText = currentText;

    if (hasSelection) {
      // Transform only selected text
      const before = currentText.substring(0, selectionStart);
      const selected = currentText.substring(selectionStart, selectionEnd);
      const after = currentText.substring(selectionEnd);

      let transformedSelected = selected;
      if (transform === "uppercase") {
        transformedSelected = selected.toUpperCase();
      } else if (transform === "lowercase") {
        transformedSelected = selected.toLowerCase();
      }

      newText = before + transformedSelected + after;
    } else {
      // Transform entire text
      if (transform === "uppercase") {
        newText = currentText.toUpperCase();
      } else if (transform === "lowercase") {
        newText = currentText.toLowerCase();
      }
    }

    if (newText !== currentText) {
      // Check if loading (undo/redo in progress) - skip if so
      const { isLoading } = useCanvasStore.getState();
      if (isLoading) return;

      selectedTextObject.set("text", newText);

      // Restore selection if was editing
      if (hasSelection) {
        selectedTextObject.selectionStart = selectionStart;
        selectedTextObject.selectionEnd = selectionEnd;
      }

      canvas.requestRenderAll();
      saveToHistory();
    }
  };

  // Handle opening photo editor
  const handleEditPhoto = () => {
    if (!selectedImageObject) return;

    // Get the image source URL
    const imgElement = selectedImageObject.getElement?.();
    if (imgElement && imgElement.src) {
      setPhotoEditorImageUrl(imgElement.src);
      setPhotoEditorOpen(true);
    }
  };

  // Handle saving edited photo
  const handlePhotoEditorSave = async (editedImageUrl: string) => {
    if (!canvas || !selectedImageObject) return;

    // Store position and size of current image
    const position = {
      left: selectedImageObject.left || 0,
      top: selectedImageObject.top || 0,
    };
    const currentRect = selectedImageObject.getBoundingRect();
    const currentSize = Math.max(currentRect.width, currentRect.height);

    // Remove old image
    canvas.remove(selectedImageObject);

    // Create new image from edited URL
    const img = await FabricImage.fromURL(editedImageUrl);
    if (!img) return;

    // Scale to match previous size
    const imgW = img.width || 480;
    const imgH = img.height || 480;
    const scale = currentSize / Math.max(imgW, imgH);

    img.set({
      left: position.left,
      top: position.top,
      scaleX: scale,
      scaleY: scale,
      originX: "left",
      originY: "top",
    });

    // Copy semantic properties
    (img as any).id = nanoid();
    (img as any).semanticType = "photo";
    (img as any).isPhoto = true;

    canvas.add(img);
    canvas.setActiveObject(img);
    canvas.renderAll();
    saveToHistory();
  };

  // Show image properties panel if image is selected
  if (selectedImageObject && !selectedTextObject) {
    return (
      <div className="flex h-full w-64 min-w-64 flex-col border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <h3 className="text-sm font-semibold">Photo</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <p className="text-xs text-zinc-500">
            Edit photo to crop, zoom, rotate, or change background
          </p>

          <Button
            onClick={handleEditPhoto}
            className="w-full gap-2"
          >
            <Pencil className="h-4 w-4" />
            Edit Photo
          </Button>
        </div>

        <PhotoEditorModal
          isOpen={photoEditorOpen}
          onClose={() => setPhotoEditorOpen(false)}
          imageUrl={photoEditorImageUrl}
          onSave={handlePhotoEditorSave}
        />
      </div>
    );
  }

  // Apply template function
  const applyTemplate = async (template: TemplateDefinition) => {
    if (!canvas || isApplyingTemplate) return;

    setIsApplyingTemplate(true);
    setSelectedTemplate(template.id);

    try {
      const currentCanvasJSON = (canvas as any).toJSON([
        "semanticType",
        "semanticGroup",
        "id",
        "photoShape",
        "isPhoto",
        "isPhotoPlaceholder",
        "isBackground",
      ]);

      // Save original state before first template change
      if (!originalCanvasState) {
        setOriginalCanvasState(JSON.parse(JSON.stringify(currentCanvasJSON)));
      }

      let canvasData;
      const hasInferredTypes = addInferredSemanticTypes(currentCanvasJSON);

      if (canvasHasSemanticElements(currentCanvasJSON)) {
        canvasData = applyTemplateToSemanticElements(currentCanvasJSON, template);
      } else {
        canvasData = getTemplateCanvasData(template);
      }

      const jsonString = JSON.stringify(canvasData);
      await loadFromJSON(jsonString);
      canvas.renderAll();
      saveToHistory();
    } catch (error) {
      console.error("Error applying template:", error);
    } finally {
      setIsApplyingTemplate(false);
      setTimeout(() => setSelectedTemplate(null), 1000);
    }
  };

  // Revert to original canvas state (before any template changes)
  const revertToOriginal = async () => {
    if (!canvas || !originalCanvasState || isReverting) return;

    setIsReverting(true);

    try {
      const jsonString = JSON.stringify(originalCanvasState);
      await loadFromJSON(jsonString);
      canvas.renderAll();
      saveToHistory();

      // Clear original state so user can save a new one
      setOriginalCanvasState(null);
    } catch (error) {
      console.error("Error reverting to original:", error);
    } finally {
      setIsReverting(false);
    }
  };

  // Add background shape to canvas
  const addBackgroundShape = (type: string) => {
    if (!canvas) return;

    const { Rect, Circle, Line } = require("fabric");
    let shape: any;

    switch (type) {
      case "rect":
        shape = new Rect({
          left: 40,
          top: 100,
          width: 200,
          height: 80,
          fill: "#f4f4f5",
          rx: 0,
          ry: 0,
          originX: "left",
          originY: "top",
        });
        break;
      case "rect-rounded":
        shape = new Rect({
          left: 40,
          top: 100,
          width: 200,
          height: 80,
          fill: "#f4f4f5",
          rx: 12,
          ry: 12,
          originX: "left",
          originY: "top",
        });
        break;
      case "circle":
        shape = new Circle({
          left: 450,
          top: 50,
          radius: 80,
          fill: "#fef3c7",
          originX: "left",
          originY: "top",
        });
        break;
      case "line":
        shape = new Line([40, 100, 555, 100], {
          stroke: "#d4d4d8",
          strokeWidth: 1,
          originX: "left",
          originY: "top",
        });
        break;
      case "sidebar-left":
        shape = new Rect({
          left: 0,
          top: 0,
          width: 180,
          height: 842,
          fill: "#18181b",
          originX: "left",
          originY: "top",
        });
        break;
      case "sidebar-right":
        shape = new Rect({
          left: 415,
          top: 0,
          width: 180,
          height: 842,
          fill: "#18181b",
          originX: "left",
          originY: "top",
        });
        break;
      case "header":
        shape = new Rect({
          left: 0,
          top: 0,
          width: 595,
          height: 180,
          fill: "#18181b",
          originX: "left",
          originY: "top",
        });
        break;
      case "accent":
        shape = new Rect({
          left: 40,
          top: 100,
          width: 4,
          height: 60,
          fill: "#3b82f6",
          rx: 2,
          ry: 2,
          originX: "left",
          originY: "top",
        });
        break;
      case "sidebar":
        // Legacy support
        shape = new Rect({
          left: 0,
          top: 0,
          width: 180,
          height: 842,
          fill: "#18181b",
          originX: "left",
          originY: "top",
        });
        break;
    }

    if (shape) {
      (shape as any).id = nanoid();
      (shape as any).isBackground = true;
      canvas.add(shape);
      canvas.sendObjectToBack(shape);
      canvas.setActiveObject(shape);
      canvas.renderAll();
      saveToHistory();
    }
  };

  // Document-level state
  const [docFontFamily, setDocFontFamily] = useState("Arial, sans-serif");
  const [docFontColor, setDocFontColor] = useState("#18181b");
  const [docAccentColor, setDocAccentColor] = useState("#3b82f6");

  // Apply global font to all text elements
  const applyGlobalFont = (fontFamily: string) => {
    if (!canvas) return;
    setDocFontFamily(fontFamily);

    canvas.getObjects().forEach((obj: any) => {
      if (obj.type === "textbox" || obj.type === "i-text" || obj.type === "text") {
        obj.set('fontFamily', fontFamily);
      }
    });
    canvas.renderAll();
    saveToHistory();
  };

  // Apply global text color
  const applyGlobalTextColor = (color: string) => {
    if (!canvas) return;
    setDocFontColor(color);

    canvas.getObjects().forEach((obj: any) => {
      if (obj.type === "textbox" || obj.type === "i-text" || obj.type === "text") {
        obj.set('fill', color);
      }
    });
    canvas.renderAll();
    saveToHistory();
  };

  // Apply accent color to section headers
  const applyAccentColor = (color: string) => {
    if (!canvas) return;
    setDocAccentColor(color);

    canvas.getObjects().forEach((obj: any) => {
      if (obj.semanticType && (
        obj.semanticType.includes('_section') ||
        obj.semanticType === 'section_header'
      )) {
        obj.set('fill', color);
      }
    });
    canvas.renderAll();
    saveToHistory();
  };

  // Show Shape Properties panel if shape is selected (and no text)
  if (selectedShapeObject && !selectedTextObject) {
    const shapeColor = selectedShapeObject.fill || "#f4f4f5";
    const strokeColor = selectedShapeObject.stroke || "transparent";
    const strokeWidth = selectedShapeObject.strokeWidth || 0;
    const opacity = selectedShapeObject.opacity ?? 1;

    return (
      <div className="flex h-full w-64 min-w-64 flex-col border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Palette className="h-4 w-4" />
            Shape
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Fill Color */}
          <div className="space-y-2">
            <Label className="text-xs text-zinc-500">Fill Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={typeof shapeColor === 'string' ? shapeColor : "#f4f4f5"}
                onChange={(e) => {
                  selectedShapeObject.set('fill', e.target.value);
                  canvas?.renderAll();
                  saveToHistory();
                }}
                className="h-8 w-8 cursor-pointer rounded border border-zinc-200 dark:border-zinc-700"
              />
              <Input
                value={typeof shapeColor === 'string' ? shapeColor : ""}
                onChange={(e) => {
                  selectedShapeObject.set('fill', e.target.value);
                  canvas?.renderAll();
                  saveToHistory();
                }}
                className="h-8 flex-1 font-mono text-xs"
                placeholder="#000000"
              />
            </div>
            {/* Quick colors */}
            <div className="flex flex-wrap gap-1">
              {["#f4f4f5", "#fef3c7", "#dcfce7", "#dbeafe", "#f3e8ff", "#ffe4e6", "#18181b", "#ffffff"].map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    selectedShapeObject.set('fill', color);
                    canvas?.renderAll();
                    saveToHistory();
                  }}
                  className={cn(
                    "h-6 w-6 rounded border-2 transition-all",
                    shapeColor === color ? "border-zinc-900 dark:border-zinc-100" : "border-transparent hover:border-zinc-300"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <Separator />

          {/* Stroke */}
          <div className="space-y-2">
            <Label className="text-xs text-zinc-500">Stroke</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={strokeColor === "transparent" ? "#000000" : strokeColor}
                onChange={(e) => {
                  selectedShapeObject.set('stroke', e.target.value);
                  if (strokeWidth === 0) {
                    selectedShapeObject.set('strokeWidth', 1);
                  }
                  canvas?.renderAll();
                  saveToHistory();
                }}
                className="h-8 w-8 cursor-pointer rounded border border-zinc-200 dark:border-zinc-700"
              />
              <Input
                type="number"
                value={strokeWidth}
                onChange={(e) => {
                  selectedShapeObject.set('strokeWidth', parseInt(e.target.value) || 0);
                  canvas?.renderAll();
                  saveToHistory();
                }}
                className="h-8 w-16 text-center"
                min={0}
                max={20}
              />
              <span className="text-xs text-zinc-400">px</span>
            </div>
            <button
              onClick={() => {
                selectedShapeObject.set('stroke', null);
                selectedShapeObject.set('strokeWidth', 0);
                canvas?.renderAll();
                saveToHistory();
              }}
              className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Remove stroke
            </button>
          </div>

          <Separator />

          {/* Opacity */}
          <div className="space-y-2">
            <Label className="text-xs text-zinc-500">Opacity</Label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={opacity}
                onChange={(e) => {
                  selectedShapeObject.set('opacity', parseFloat(e.target.value));
                  canvas?.renderAll();
                  saveToHistory();
                }}
                className="flex-1 h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-700"
              />
              <span className="text-xs text-zinc-600 w-10 text-right">{Math.round(opacity * 100)}%</span>
            </div>
          </div>

          <Separator />

          {/* Corner Radius (for rect only) */}
          {selectedShapeObject.type === "rect" && (
            <div className="space-y-2">
              <Label className="text-xs text-zinc-500">Corner Radius</Label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={selectedShapeObject.rx || 0}
                  onChange={(e) => {
                    const radius = parseInt(e.target.value);
                    selectedShapeObject.set('rx', radius);
                    selectedShapeObject.set('ry', radius);
                    canvas?.renderAll();
                    saveToHistory();
                  }}
                  className="flex-1 h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-700"
                />
                <span className="text-xs text-zinc-600 w-8 text-right">{selectedShapeObject.rx || 0}</span>
              </div>
            </div>
          )}

          <Separator />

          {/* Layer controls */}
          <div className="space-y-2">
            <Label className="text-xs text-zinc-500">Layer</Label>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => {
                  canvas?.sendObjectToBack(selectedShapeObject);
                  canvas?.renderAll();
                  saveToHistory();
                }}
              >
                To Back
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => {
                  canvas?.bringObjectToFront(selectedShapeObject);
                  canvas?.renderAll();
                  saveToHistory();
                }}
              >
                To Front
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show Document panel if no editable object selected
  if (!selectedTextObject) {
    return (
      <div className="flex h-full w-64 min-w-64 flex-col border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="h-4 w-4" />
            Document
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Global Font Settings */}
          <div className="space-y-3">
            <Label className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Type className="h-3 w-3" />
              Global Font
            </Label>
            <select
              value={docFontFamily}
              onChange={(e) => applyGlobalFont(e.target.value)}
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              {FONT_FAMILIES.map((font) => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>

            {/* Text Color */}
            <div className="flex items-center gap-2">
              <Label className="text-xs text-zinc-500 w-16">Text</Label>
              <input
                type="color"
                value={docFontColor}
                onChange={(e) => applyGlobalTextColor(e.target.value)}
                className="h-7 w-7 cursor-pointer rounded border border-zinc-200 dark:border-zinc-700"
              />
              <div className="flex gap-1">
                {["#18181b", "#374151", "#6b7280", "#1e40af", "#166534"].map((color) => (
                  <button
                    key={color}
                    onClick={() => applyGlobalTextColor(color)}
                    className={cn(
                      "h-6 w-6 rounded border-2 transition-all",
                      docFontColor === color ? "border-zinc-900 dark:border-zinc-100" : "border-transparent hover:border-zinc-300"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Accent Color */}
            <div className="flex items-center gap-2">
              <Label className="text-xs text-zinc-500 w-16">Accent</Label>
              <input
                type="color"
                value={docAccentColor}
                onChange={(e) => applyAccentColor(e.target.value)}
                className="h-7 w-7 cursor-pointer rounded border border-zinc-200 dark:border-zinc-700"
              />
              <div className="flex gap-1">
                {["#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#10b981"].map((color) => (
                  <button
                    key={color}
                    onClick={() => applyAccentColor(color)}
                    className={cn(
                      "h-6 w-6 rounded border-2 transition-all",
                      docAccentColor === color ? "border-zinc-900 dark:border-zinc-100" : "border-transparent hover:border-zinc-300"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* Templates - 2 columns, limited height with scroll */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Palette className="h-3 w-3" />
              Templates
            </Label>
            {/* Revert to original button */}
            {originalCanvasState && (
              <button
                onClick={revertToOriginal}
                disabled={isReverting || isApplyingTemplate}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed px-2 py-1.5 text-xs font-medium transition-all",
                  "border-amber-300 bg-amber-50 text-amber-700 hover:border-amber-400 hover:bg-amber-100",
                  "dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:border-amber-600 dark:hover:bg-amber-950/50",
                  (isReverting || isApplyingTemplate) && "opacity-50 cursor-not-allowed"
                )}
              >
                {isReverting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                )}
                Повернути оригінал
              </button>
            )}
            <div className="max-h-[220px] overflow-y-auto rounded-lg border border-zinc-100 dark:border-zinc-800">
              <div className="grid grid-cols-2 gap-1.5 p-1.5">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => applyTemplate(template)}
                    disabled={isApplyingTemplate}
                    className={cn(
                      "group relative aspect-[210/297] overflow-hidden rounded border-2 transition-all",
                      selectedTemplate === template.id
                        ? "border-emerald-500 ring-2 ring-emerald-500/20"
                        : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500",
                      isApplyingTemplate && selectedTemplate !== template.id && "opacity-50"
                    )}
                  >
                    <img
                      src={template.thumbnail}
                      alt={template.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                    {selectedTemplate === template.id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        {isApplyingTemplate ? (
                          <Loader2 className="h-4 w-4 animate-spin text-white" />
                        ) : (
                          <Check className="h-4 w-4 text-emerald-400" />
                        )}
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1 pt-4 opacity-0 transition-opacity group-hover:opacity-100">
                      <p className="truncate text-[9px] font-medium text-white">
                        {template.name}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* Background Elements - More options */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Palette className="h-3 w-3" />
              Add Elements
            </Label>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                onClick={() => addBackgroundShape("rect")}
                className="flex flex-col items-center gap-1 rounded-lg border border-zinc-200 p-2 text-[10px] transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                <div className="h-5 w-7 rounded-sm bg-zinc-200 dark:bg-zinc-600" />
                <span className="text-zinc-500">Rect</span>
              </button>
              <button
                onClick={() => addBackgroundShape("rect-rounded")}
                className="flex flex-col items-center gap-1 rounded-lg border border-zinc-200 p-2 text-[10px] transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                <div className="h-5 w-7 rounded-md bg-zinc-200 dark:bg-zinc-600" />
                <span className="text-zinc-500">Rounded</span>
              </button>
              <button
                onClick={() => addBackgroundShape("circle")}
                className="flex flex-col items-center gap-1 rounded-lg border border-zinc-200 p-2 text-[10px] transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                <div className="h-5 w-5 rounded-full bg-amber-200 dark:bg-amber-700" />
                <span className="text-zinc-500">Circle</span>
              </button>
              <button
                onClick={() => addBackgroundShape("line")}
                className="flex flex-col items-center gap-1 rounded-lg border border-zinc-200 p-2 text-[10px] transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                <div className="h-0.5 w-7 bg-zinc-400" />
                <span className="text-zinc-500">Line</span>
              </button>
              <button
                onClick={() => addBackgroundShape("sidebar-left")}
                className="flex flex-col items-center gap-1 rounded-lg border border-zinc-200 p-2 text-[10px] transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                <div className="flex h-5 w-7 overflow-hidden rounded-sm">
                  <div className="w-2 bg-zinc-700 dark:bg-zinc-300" />
                  <div className="flex-1 bg-zinc-100 dark:bg-zinc-600" />
                </div>
                <span className="text-zinc-500">Left</span>
              </button>
              <button
                onClick={() => addBackgroundShape("sidebar-right")}
                className="flex flex-col items-center gap-1 rounded-lg border border-zinc-200 p-2 text-[10px] transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                <div className="flex h-5 w-7 overflow-hidden rounded-sm">
                  <div className="flex-1 bg-zinc-100 dark:bg-zinc-600" />
                  <div className="w-2 bg-zinc-700 dark:bg-zinc-300" />
                </div>
                <span className="text-zinc-500">Right</span>
              </button>
              <button
                onClick={() => addBackgroundShape("header")}
                className="flex flex-col items-center gap-1 rounded-lg border border-zinc-200 p-2 text-[10px] transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                <div className="flex h-5 w-7 flex-col overflow-hidden rounded-sm">
                  <div className="h-2 bg-zinc-700 dark:bg-zinc-300" />
                  <div className="flex-1 bg-zinc-100 dark:bg-zinc-600" />
                </div>
                <span className="text-zinc-500">Header</span>
              </button>
              <button
                onClick={() => addBackgroundShape("accent")}
                className="flex flex-col items-center gap-1 rounded-lg border border-zinc-200 p-2 text-[10px] transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                <div className="h-5 w-1.5 rounded-full bg-blue-500" />
                <span className="text-zinc-500">Accent</span>
              </button>
            </div>
          </div>

          <Separator />

          {/* Keyboard Shortcuts */}
          <div className="space-y-2">
            <Label className="text-xs text-zinc-500">Shortcuts</Label>
            <div className="grid grid-cols-2 gap-y-1 text-[10px]">
              <span className="text-zinc-400">Undo</span>
              <span className="text-right font-mono text-zinc-600 dark:text-zinc-300">⌘Z</span>
              <span className="text-zinc-400">Redo</span>
              <span className="text-right font-mono text-zinc-600 dark:text-zinc-300">⌘⇧Z</span>
              <span className="text-zinc-400">Delete</span>
              <span className="text-right font-mono text-zinc-600 dark:text-zinc-300">⌫</span>
              <span className="text-zinc-400">Duplicate</span>
              <span className="text-right font-mono text-zinc-600 dark:text-zinc-300">⌘D</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-64 min-w-64 flex-col border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h3 className="text-sm font-semibold">Text Properties</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Font Family */}
        <div className="space-y-2">
          <Label className="text-xs text-zinc-500">Font</Label>
          <select
            value={fontFamily}
            onChange={(e) => handleFontFamilyChange(e.target.value)}
            className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {FONT_FAMILIES.map((font) => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
        </div>

        {/* Font Size */}
        <div className="space-y-2">
          <Label className="text-xs text-zinc-500">Size</Label>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleFontSizeChange(fontSize - 1)}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <Input
              type="number"
              value={fontSize}
              onChange={(e) => handleFontSizeChange(parseInt(e.target.value) || 11)}
              className="h-8 w-16 text-center"
            />
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleFontSizeChange(fontSize + 1)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          {/* Quick size buttons */}
          <div className="flex flex-wrap gap-1">
            {[10, 11, 12, 14, 16, 18, 24].map((size) => (
              <button
                key={size}
                onClick={() => handleFontSizeChange(size)}
                className={cn(
                  "rounded px-2 py-1 text-xs transition-colors",
                  fontSize === size
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                )}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Font Style */}
        <div className="space-y-2">
          <Label className="text-xs text-zinc-500">Style</Label>
          <div className="flex gap-1">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isBold ? "default" : "outline"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={toggleBold}
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Bold</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isItalic ? "default" : "outline"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={toggleItalic}
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Italic</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isUnderline ? "default" : "outline"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={toggleUnderline}
                  >
                    <Underline className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Underline</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isStrikethrough ? "default" : "outline"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={toggleStrikethrough}
                  >
                    <Strikethrough className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Strikethrough</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Text Transform */}
        <div className="space-y-2">
          <Label className="text-xs text-zinc-500">Case</Label>
          <div className="flex gap-1">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleTextTransform("uppercase")}
                  >
                    <CaseUpper className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>UPPERCASE</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleTextTransform("lowercase")}
                  >
                    <CaseLower className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>lowercase</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Text Alignment */}
        <div className="space-y-2">
          <Label className="text-xs text-zinc-500">Alignment</Label>
          <div className="flex gap-1">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={textAlign === "left" ? "default" : "outline"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleTextAlign("left")}
                  >
                    <AlignLeft className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Align Left</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={textAlign === "center" ? "default" : "outline"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleTextAlign("center")}
                  >
                    <AlignCenter className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Align Center</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={textAlign === "right" ? "default" : "outline"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleTextAlign("right")}
                  >
                    <AlignRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Align Right</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={textAlign === "justify" ? "default" : "outline"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleTextAlign("justify")}
                  >
                    <AlignJustify className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Justify</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <Separator />

        {/* Line Height */}
        <div className="space-y-2">
          <Label className="text-xs text-zinc-500">Line Height</Label>
          <div className="flex items-center gap-2">
            <MoveVertical className="h-4 w-4 text-zinc-400" />
            <input
              type="range"
              min="0.8"
              max="2.5"
              step="0.1"
              value={lineHeight}
              onChange={(e) => handleLineHeightChange(parseFloat(e.target.value))}
              className="flex-1 h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-700"
            />
            <span className="text-xs text-zinc-600 w-8 text-right">{lineHeight.toFixed(1)}</span>
          </div>
          {/* Quick line height buttons */}
          <div className="flex gap-1">
            {[1.0, 1.2, 1.4, 1.6, 2.0].map((lh) => (
              <button
                key={lh}
                onClick={() => handleLineHeightChange(lh)}
                className={cn(
                  "rounded px-2 py-1 text-xs transition-colors flex-1",
                  Math.abs(lineHeight - lh) < 0.05
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                )}
              >
                {lh}
              </button>
            ))}
          </div>
        </div>

        {/* Character Spacing */}
        <div className="space-y-2">
          <Label className="text-xs text-zinc-500">Letter Spacing</Label>
          <div className="flex items-center gap-2">
            <Space className="h-4 w-4 text-zinc-400" />
            <input
              type="range"
              min="-100"
              max="500"
              step="10"
              value={charSpacing}
              onChange={(e) => handleCharSpacingChange(parseInt(e.target.value))}
              className="flex-1 h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-700"
            />
            <span className="text-xs text-zinc-600 w-8 text-right">{charSpacing}</span>
          </div>
          {/* Quick spacing buttons */}
          <div className="flex gap-1">
            {[0, 50, 100, 200].map((sp) => (
              <button
                key={sp}
                onClick={() => handleCharSpacingChange(sp)}
                className={cn(
                  "rounded px-2 py-1 text-xs transition-colors flex-1",
                  charSpacing === sp
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                )}
              >
                {sp}
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Color */}
        <div className="space-y-2">
          <Label className="text-xs text-zinc-500">Color</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={fontColor}
              onChange={(e) => handleColorChange(e.target.value)}
              className="h-8 w-8 cursor-pointer rounded border border-zinc-200 dark:border-zinc-700"
            />
            <Input
              value={fontColor}
              onChange={(e) => handleColorChange(e.target.value)}
              className="h-8 flex-1 font-mono text-xs"
              placeholder="#000000"
            />
          </div>
          {/* Quick color buttons */}
          <div className="flex gap-1">
            {["#18181b", "#52525b", "#71717a", "#3b82f6", "#10b981", "#ef4444", "#ffffff"].map((color) => (
              <button
                key={color}
                onClick={() => handleColorChange(color)}
                className={cn(
                  "h-6 w-6 rounded border-2 transition-all",
                  fontColor === color ? "border-zinc-900 dark:border-zinc-100" : "border-transparent hover:border-zinc-300"
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
