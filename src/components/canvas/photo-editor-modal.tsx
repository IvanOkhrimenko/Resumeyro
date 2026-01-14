"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  ZoomIn,
  ZoomOut,
  FlipHorizontal,
  FlipVertical,
  RotateCcw,
  Upload,
  Palette,
  Crop,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { removeBackground } from "@imgly/background-removal";

interface PhotoEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onSave: (editedImageUrl: string) => void;
}

type TabType = "crop" | "background";

interface ImageState {
  x: number;
  y: number;
  zoom: number;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  background: string;
}

const PRESET_BACKGROUNDS = [
  { id: "original", color: "transparent", label: "Original" },
  { id: "white", color: "#ffffff", label: "White" },
  { id: "gray", color: "#f4f4f5", label: "Light Gray" },
  { id: "gradient1", color: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", label: "Purple" },
  { id: "gradient2", color: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", label: "Pink" },
  { id: "gradient3", color: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)", label: "Blue" },
  { id: "gradient4", color: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)", label: "Green" },
  { id: "navy", color: "#1e3a5f", label: "Navy" },
];

export function PhotoEditorModal({ isOpen, onClose, imageUrl, onSave }: PhotoEditorModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("crop");
  const [imageState, setImageState] = useState<ImageState>({
    x: 0,
    y: 0,
    zoom: 1,
    rotation: 0,
    flipH: false,
    flipV: false,
    background: "transparent",
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [customColor, setCustomColor] = useState("#ffffff");

  // Background removal state
  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
  const [backgroundRemovedUrl, setBackgroundRemovedUrl] = useState<string | null>(null);
  const [bgRemovalError, setBgRemovalError] = useState<string | null>(null);
  const [bgRemovalProgress, setBgRemovalProgress] = useState(0);

  const previewRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens with new image
  useEffect(() => {
    if (isOpen) {
      setImageState({
        x: 0,
        y: 0,
        zoom: 1,
        rotation: 0,
        flipH: false,
        flipV: false,
        background: "transparent",
      });
      setActiveTab("crop");
      // Reset background removal state
      setBackgroundRemovedUrl(null);
      setBgRemovalError(null);
      setBgRemovalProgress(0);
    }
  }, [isOpen, imageUrl]);

  // Remove background from image
  const handleRemoveBackground = useCallback(async () => {
    if (isRemovingBackground || backgroundRemovedUrl) return;

    setIsRemovingBackground(true);
    setBgRemovalError(null);
    setBgRemovalProgress(10);

    try {
      // Fetch the image and convert to blob
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      setBgRemovalProgress(20);

      // Remove background (progress callback is unreliable, use simple stages)
      const resultBlob = await removeBackground(blob);
      setBgRemovalProgress(80);

      // Convert result blob to data URL
      const reader = new FileReader();
      reader.onload = () => {
        setBackgroundRemovedUrl(reader.result as string);
        setBgRemovalProgress(100);
        // Delay hiding loader to show completion
        setTimeout(() => {
          setIsRemovingBackground(false);
        }, 500);
      };
      reader.onerror = () => {
        setBgRemovalError("Failed to process image");
        setIsRemovingBackground(false);
      };
      reader.readAsDataURL(resultBlob);
    } catch (error) {
      console.error("Background removal error:", error);
      setBgRemovalError(error instanceof Error ? error.message : "Failed to remove background");
      setIsRemovingBackground(false);
    }
  }, [imageUrl, isRemovingBackground, backgroundRemovedUrl]);

  // Get the current display image URL (original or background-removed)
  const displayImageUrl = backgroundRemovedUrl || imageUrl;

  // Handle mouse/touch drag for repositioning
  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    setIsDragging(true);
    setDragStart({ x: clientX - imageState.x, y: clientY - imageState.y });
  }, [imageState.x, imageState.y]);

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return;
    const maxOffset = 100 * imageState.zoom;
    const newX = Math.max(-maxOffset, Math.min(maxOffset, clientX - dragStart.x));
    const newY = Math.max(-maxOffset, Math.min(maxOffset, clientY - dragStart.y));
    setImageState(prev => ({ ...prev, x: newX, y: newY }));
  }, [isDragging, dragStart, imageState.zoom]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Mouse events
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX, e.clientY);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    handleDragMove(e.clientX, e.clientY);
  };

  const onMouseUp = () => handleDragEnd();
  const onMouseLeave = () => handleDragEnd();

  // Touch events
  const onTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleDragStart(touch.clientX, touch.clientY);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleDragMove(touch.clientX, touch.clientY);
  };

  const onTouchEnd = () => handleDragEnd();

  // Generate final image
  const generateImage = useCallback((): string => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return displayImageUrl;

    const size = 480; // Output size (2x for retina quality)
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    if (!ctx) return displayImageUrl;

    // Clear canvas first
    ctx.clearRect(0, 0, size, size);

    // Draw background - always fill first
    if (imageState.background !== "transparent") {
      if (imageState.background.startsWith("linear-gradient")) {
        // Extract colors from gradient and create a simple gradient
        const colors = imageState.background.match(/#[a-fA-F0-9]{6}/g);
        if (colors && colors.length >= 2) {
          const gradient = ctx.createLinearGradient(0, 0, size, size);
          gradient.addColorStop(0, colors[0]);
          gradient.addColorStop(1, colors[1]);
          ctx.fillStyle = gradient;
        } else {
          ctx.fillStyle = colors?.[0] || "#ffffff";
        }
      } else {
        ctx.fillStyle = imageState.background;
      }
      ctx.fillRect(0, 0, size, size);
    }

    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate((imageState.rotation * Math.PI) / 180);
    ctx.scale(imageState.flipH ? -1 : 1, imageState.flipV ? -1 : 1);

    // Calculate image dimensions to fit (contain) in the canvas
    const imgAspect = img.naturalWidth / img.naturalHeight;
    let baseWidth, baseHeight;

    if (imgAspect > 1) {
      // Landscape
      baseWidth = size;
      baseHeight = size / imgAspect;
    } else {
      // Portrait or square
      baseHeight = size;
      baseWidth = size * imgAspect;
    }

    // Apply zoom
    const drawWidth = baseWidth * imageState.zoom;
    const drawHeight = baseHeight * imageState.zoom;

    // Apply position offset (scale offset for larger canvas)
    const scale = size / 240;
    const offsetX = imageState.x * scale;
    const offsetY = imageState.y * scale;

    ctx.drawImage(
      img,
      -drawWidth / 2 + offsetX,
      -drawHeight / 2 + offsetY,
      drawWidth,
      drawHeight
    );

    ctx.restore();

    return canvas.toDataURL("image/png", 1.0);
  }, [displayImageUrl, imageState]);

  const handleSave = () => {
    const editedUrl = generateImage();
    onSave(editedUrl);
    onClose();
  };

  const handleUploadNew = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newUrl = event.target?.result as string;
        if (newUrl) {
          // Reset state and trigger parent to update
          setImageState({
            x: 0,
            y: 0,
            zoom: 1,
            rotation: 0,
            flipH: false,
            flipV: false,
            background: imageState.background,
          });
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const handleReset = () => {
    setImageState({
      x: 0,
      y: 0,
      zoom: 1,
      rotation: 0,
      flipH: false,
      flipV: false,
      background: imageState.background,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-xl mx-4 bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden border border-zinc-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-white tracking-tight">
            Edit Photo
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800">
          <button
            onClick={() => setActiveTab("crop")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "crop"
                ? "text-cyan-400 border-b-2 border-cyan-400 bg-zinc-800/50"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Crop className="w-4 h-4" />
            Crop & Rotate
          </button>
          <button
            onClick={() => setActiveTab("background")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "background"
                ? "text-cyan-400 border-b-2 border-cyan-400 bg-zinc-800/50"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Background
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === "crop" && (
            <div className="space-y-6">
              {/* Preview Area */}
              <div className="flex gap-4">
                {/* Image preview with crop frame */}
                <div
                  ref={previewRef}
                  className="relative w-64 h-64 mx-auto rounded-xl overflow-hidden cursor-move select-none"
                  style={{
                    background: imageState.background === "transparent"
                      ? "repeating-conic-gradient(#27272a 0% 25%, #18181b 0% 50%) 50% / 16px 16px"
                      : imageState.background
                  }}
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onMouseUp={onMouseUp}
                  onMouseLeave={onMouseLeave}
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                >
                  {/* Image */}
                  <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                    <img
                      ref={imageRef}
                      src={displayImageUrl}
                      alt="Preview"
                      className="pointer-events-none"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        transform: `translate(${imageState.x}px, ${imageState.y}px) scale(${imageState.zoom}) rotate(${imageState.rotation}deg) scaleX(${imageState.flipH ? -1 : 1}) scaleY(${imageState.flipV ? -1 : 1})`,
                        transition: isDragging ? "none" : "transform 0.1s ease-out",
                      }}
                      draggable={false}
                    />
                  </div>

                  {/* Grid overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                      {[...Array(9)].map((_, i) => (
                        <div key={i} className="border border-white/20" />
                      ))}
                    </div>
                  </div>

                  {/* Drag hint */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/60 rounded text-[10px] text-white/70 pointer-events-none">
                    Drag to reposition
                  </div>
                </div>

                {/* Zoom control */}
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs text-zinc-500 font-medium">Zoom</span>
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => setImageState(prev => ({ ...prev, zoom: Math.min(3, prev.zoom + 0.1) }))}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <div className="relative h-32 w-6 flex items-center justify-center">
                      <div className="absolute h-full w-1 bg-zinc-700 rounded-full" />
                      <input
                        type="range"
                        min="1"
                        max="3"
                        step="0.05"
                        value={imageState.zoom}
                        onChange={(e) => setImageState(prev => ({ ...prev, zoom: parseFloat(e.target.value) }))}
                        className="absolute h-full w-1 appearance-none bg-transparent cursor-pointer [writing-mode:vertical-lr] [direction:rtl]
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-lg
                          [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-zinc-900"
                      />
                    </div>
                    <button
                      onClick={() => setImageState(prev => ({ ...prev, zoom: Math.max(1, prev.zoom - 0.1) }))}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-xs text-cyan-400 font-mono">{imageState.zoom.toFixed(1)}×</span>
                </div>
              </div>

              {/* Rotation control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500 font-medium">Straighten</span>
                  <span className="text-xs text-cyan-400 font-mono">{imageState.rotation}°</span>
                </div>
                <div className="relative">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-zinc-500">-90°</span>
                    <div className="relative flex-1 h-6 flex items-center">
                      <div className="absolute w-full h-1 bg-zinc-700 rounded-full" />
                      {/* Tick marks */}
                      <div className="absolute w-full flex justify-between px-0">
                        {[-90, -45, 0, 45, 90].map((tick) => (
                          <div
                            key={tick}
                            className={`w-0.5 rounded-full ${tick === 0 ? "h-3 bg-zinc-500" : "h-2 bg-zinc-600"}`}
                          />
                        ))}
                      </div>
                      <input
                        type="range"
                        min="-90"
                        max="90"
                        step="1"
                        value={imageState.rotation}
                        onChange={(e) => setImageState(prev => ({ ...prev, rotation: parseInt(e.target.value) }))}
                        className="absolute w-full appearance-none bg-transparent cursor-pointer
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-lg
                          [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-zinc-900"
                      />
                    </div>
                    <span className="text-[10px] text-zinc-500">+90°</span>
                  </div>
                </div>
              </div>

              {/* Flip & Reset controls */}
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setImageState(prev => ({ ...prev, flipH: !prev.flipH }))}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    imageState.flipH
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-700"
                  }`}
                >
                  <FlipHorizontal className="w-4 h-4" />
                  Flip H
                </button>
                <button
                  onClick={() => setImageState(prev => ({ ...prev, flipV: !prev.flipV }))}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    imageState.flipV
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-700"
                  }`}
                >
                  <FlipVertical className="w-4 h-4" />
                  Flip V
                </button>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-700 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
              </div>
            </div>
          )}

          {activeTab === "background" && (
            <div className="space-y-6">
              {/* Remove Background Button */}
              <div className="space-y-3">
                <button
                  onClick={handleRemoveBackground}
                  disabled={isRemovingBackground || !!backgroundRemovedUrl}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    backgroundRemovedUrl && !isRemovingBackground
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default"
                      : isRemovingBackground
                      ? "bg-violet-500/20 text-violet-300 border border-violet-500/30 cursor-wait"
                      : "bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-500 hover:to-purple-500 shadow-lg shadow-violet-500/25"
                  }`}
                >
                  {isRemovingBackground ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Removing... {bgRemovalProgress}%</span>
                    </>
                  ) : backgroundRemovedUrl ? (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>✓ Background Removed</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Remove Background (AI)</span>
                    </>
                  )}
                </button>

                {/* Progress bar - show during processing */}
                {isRemovingBackground && (
                  <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500 ease-out"
                      style={{ width: `${bgRemovalProgress}%` }}
                    />
                  </div>
                )}

                {/* Error message */}
                {bgRemovalError && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <span className="text-xs text-red-400">{bgRemovalError}</span>
                  </div>
                )}

                {/* Info text */}
                <p className="text-[10px] text-zinc-500 text-center">
                  {backgroundRemovedUrl
                    ? "Background removed. Choose a new background color below."
                    : "Click to remove background from photo using AI"}
                </p>
              </div>

              {/* Preview */}
              <div
                className="relative w-48 h-48 mx-auto rounded-xl overflow-hidden"
                style={{
                  background: imageState.background === "transparent"
                    ? "repeating-conic-gradient(#27272a 0% 25%, #18181b 0% 50%) 50% / 16px 16px"
                    : imageState.background
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                  <img
                    src={displayImageUrl}
                    alt="Preview"
                    className="w-full h-full object-contain"
                    style={{
                      transform: `translate(${imageState.x}px, ${imageState.y}px) scale(${imageState.zoom}) rotate(${imageState.rotation}deg) scaleX(${imageState.flipH ? -1 : 1}) scaleY(${imageState.flipV ? -1 : 1})`,
                    }}
                    draggable={false}
                  />
                </div>
              </div>

              {/* Custom color picker */}
              <div className="flex items-center justify-center gap-3">
                <div className="relative">
                  <input
                    type="color"
                    value={customColor}
                    onChange={(e) => {
                      setCustomColor(e.target.value);
                      setImageState(prev => ({ ...prev, background: e.target.value }));
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-700 hover:border-zinc-600 transition-colors cursor-pointer"
                  >
                    <div
                      className="w-5 h-5 rounded-full border-2 border-white/20"
                      style={{
                        background: `conic-gradient(red, yellow, lime, aqua, blue, magenta, red)`
                      }}
                    />
                    <span className="text-sm text-zinc-300">Custom Color</span>
                  </div>
                </div>
              </div>

              {/* Preset backgrounds */}
              <div className="grid grid-cols-4 gap-3">
                {PRESET_BACKGROUNDS.map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => setImageState(prev => ({ ...prev, background: bg.color }))}
                    className={`relative aspect-square rounded-xl overflow-hidden transition-all ${
                      imageState.background === bg.color
                        ? "ring-2 ring-cyan-400 ring-offset-2 ring-offset-zinc-900 scale-95"
                        : "hover:scale-95"
                    }`}
                    style={{
                      background: bg.color === "transparent"
                        ? "repeating-conic-gradient(#52525b 0% 25%, #3f3f46 0% 50%) 50% / 8px 8px"
                        : bg.color
                    }}
                  >
                    {/* Mini preview of photo */}
                    <div className="absolute inset-2 rounded-lg overflow-hidden">
                      <img
                        src={displayImageUrl}
                        alt={bg.label}
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    </div>
                    <span className="absolute bottom-1 left-1 right-1 text-[9px] text-white font-medium text-center drop-shadow-lg">
                      {bg.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-900/50">
          <button
            onClick={handleUploadNew}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload New
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-cyan-500 hover:bg-cyan-400 text-zinc-900 transition-colors shadow-lg shadow-cyan-500/25"
          >
            Save Changes
          </button>
        </div>

        {/* Hidden elements */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
