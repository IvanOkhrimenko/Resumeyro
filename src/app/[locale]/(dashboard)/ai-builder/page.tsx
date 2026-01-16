"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Wand2,
  Upload,
  FileText,
  Image,
  X,
  Loader2,
  CheckCircle2,
  Sparkles,
  Briefcase,
  Palette,
  Minus,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Style = "professional" | "creative" | "minimal";
type Step = "idle" | "analyzing" | "generating" | "formatting" | "complete" | "error";

const styles: { id: Style; translationKey: string; icon: React.ElementType }[] = [
  { id: "professional", translationKey: "styleProfessional", icon: Briefcase },
  { id: "creative", translationKey: "styleCreative", icon: Palette },
  { id: "minimal", translationKey: "styleMinimal", icon: Minus },
];

export default function AIBuilderPage() {
  const router = useRouter();
  const t = useTranslations("aiBuilder");
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);

  const [prompt, setPrompt] = useState("");
  const [resumeFiles, setResumeFiles] = useState<File[]>([]);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<Style>("professional");
  const [isDraggingResume, setIsDraggingResume] = useState(false);
  const [isDraggingTemplate, setIsDraggingTemplate] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  // For internal drag between zones
  const [draggingFile, setDraggingFile] = useState<{ file: File; source: "resume" | "template"; index: number } | null>(null);

  // Resume file handlers
  const handleResumeDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingResume(true);
  }, []);

  const handleResumeDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingResume(false);
  }, []);

  const handleResumeDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingResume(false);

    // Check if it's an internal drag from template zone
    if (draggingFile && draggingFile.source === "template") {
      // Move file from template to resume
      setResumeFiles((prev) => [...prev, draggingFile.file]);
      setTemplateFile(null);
      setDraggingFile(null);
      return;
    }

    // External file drop
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (file) => file.type === "application/pdf" || file.type.startsWith("image/")
    );
    if (droppedFiles.length > 0) {
      setResumeFiles((prev) => [...prev, ...droppedFiles]);
    }
  }, [draggingFile]);

  const handleResumeSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      setResumeFiles((prev) => [...prev, ...Array.from(selectedFiles)]);
    }
    e.target.value = "";
  }, []);

  const removeResumeFile = (index: number) => {
    setResumeFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Template file handlers
  const handleTemplateDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingTemplate(true);
  }, []);

  const handleTemplateDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingTemplate(false);
  }, []);

  const handleTemplateDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingTemplate(false);

    // Check if it's an internal drag from resume zone (only images allowed)
    if (draggingFile && draggingFile.source === "resume" && draggingFile.file.type.startsWith("image/")) {
      // Move file from resume to template
      setTemplateFile(draggingFile.file);
      setResumeFiles((prev) => prev.filter((_, i) => i !== draggingFile.index));
      setDraggingFile(null);
      return;
    }

    // External file drop
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (file) => file.type.startsWith("image/")
    );
    if (droppedFiles.length > 0) {
      setTemplateFile(droppedFiles[0]); // Only one template
    }
  }, [draggingFile]);

  const handleTemplateSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles[0]) {
      setTemplateFile(selectedFiles[0]);
    }
    e.target.value = "";
  }, []);

  // Handle paste from clipboard (Ctrl/Cmd + V) - adds to resume files by default
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const processingSteps = ["analyzing", "generating", "formatting"];
      if (processingSteps.includes(currentStep)) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            const extension = item.type.split("/")[1] || "png";
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, "");
            const namedFile = new File([file], `pasted-resume-${timestamp}.${extension}`, {
              type: file.type,
            });
            imageFiles.push(namedFile);
          }
        }
      }

      if (imageFiles.length > 0) {
        setResumeFiles((prev) => [...prev, ...imageFiles]);
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [currentStep]);

  const handleSubmit = async () => {
    if (!prompt.trim()) return;

    setCurrentStep("analyzing");
    setError(null);

    // Store timeout IDs to clear them on error
    const timeoutIds: NodeJS.Timeout[] = [];

    try {
      const formData = new FormData();
      formData.append("prompt", prompt);
      formData.append("style", selectedStyle);
      // Send resume files (content source)
      resumeFiles.forEach((file) => formData.append("resumeFiles", file));
      // Send template file (style source)
      if (templateFile) {
        formData.append("templateFile", templateFile);
      }

      // Simulate step progression (will be cleared on error)
      timeoutIds.push(setTimeout(() => setCurrentStep("generating"), 1500));
      timeoutIds.push(setTimeout(() => setCurrentStep("formatting"), 4000));

      const res = await fetch("/api/ai/build-resume", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to build resume");
      }

      setCurrentStep("complete");

      // Redirect to editor after short delay
      setTimeout(() => {
        router.push(`/resumes/${data.resumeId}/edit`);
      }, 1000);
    } catch (err) {
      // Clear all pending step progression timeouts
      timeoutIds.forEach(clearTimeout);
      setCurrentStep("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const isProcessing = ["analyzing", "generating", "formatting"].includes(currentStep);
  const canSubmit = prompt.trim().length >= 10 && !isProcessing;

  return (
    <div className="relative min-h-[calc(100vh-8rem)]">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-gradient-to-tr from-amber-600/10 via-yellow-500/5 to-transparent blur-3xl" />
      </div>

      <div className="relative space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25">
                <Wand2 className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
            </div>
            <p className="text-zinc-500 dark:text-zinc-400">
              {t("subtitle")}
            </p>
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Left column - Input */}
          <div className="space-y-5 lg:col-span-3">
            {/* Prompt input */}
            <div className="group relative">
              <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 opacity-0 blur transition-opacity group-focus-within:opacity-100" />
              <div className="relative rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <Label className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  {t("describeResume")}
                </Label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={t("promptPlaceholder")}
                  className="min-h-[160px] resize-none border-0 bg-transparent p-0 text-base shadow-none focus-visible:ring-0"
                  disabled={isProcessing}
                />
                <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <span className="text-xs text-zinc-400">
                    {prompt.length} {t("characters")}
                  </span>
                  {prompt.length > 0 && prompt.length < 10 && (
                    <span className="text-xs text-amber-600">{t("minimumChars")}</span>
                  )}
                </div>
              </div>
            </div>

            {/* File uploads - two separate zones */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Resume upload (content source) */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <Label className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4 text-emerald-500" />
                  {t("yourResume")}
                  <span className="text-xs font-normal text-zinc-400">{t("content")}</span>
                </Label>

                <div
                  onDragOver={handleResumeDragOver}
                  onDragLeave={handleResumeDragLeave}
                  onDrop={handleResumeDrop}
                  onClick={() => !isProcessing && resumeInputRef.current?.click()}
                  className={cn(
                    "relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 transition-all",
                    isDraggingResume || (draggingFile?.source === "template")
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
                      : "border-zinc-200 hover:border-emerald-300 dark:border-zinc-800 dark:hover:border-emerald-800",
                    isProcessing && "pointer-events-none opacity-50"
                  )}
                >
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                    <Upload className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-center text-xs text-zinc-600 dark:text-zinc-400">
                    {t("pdfOrScreenshot")}
                  </p>
                  <p className="mt-0.5 text-[10px] text-zinc-400">
                    {t("pasteHint")}
                  </p>
                  <input
                    ref={resumeInputRef}
                    type="file"
                    accept=".pdf,image/*"
                    multiple
                    onChange={handleResumeSelect}
                    className="hidden"
                  />
                </div>

                {/* Resume file list */}
                {resumeFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {resumeFiles.map((file, index) => (
                      <div
                        key={index}
                        draggable={!isProcessing}
                        onDragStart={(e) => {
                          setDraggingFile({ file, source: "resume", index });
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragEnd={() => setDraggingFile(null)}
                        className={cn(
                          "flex cursor-grab items-center gap-2 rounded-lg bg-emerald-50 px-2 py-1.5 transition-opacity dark:bg-emerald-950/20",
                          draggingFile?.source === "resume" && draggingFile.index === index && "opacity-50"
                        )}
                      >
                        {file.type === "application/pdf" ? (
                          <FileText className="h-3.5 w-3.5 flex-shrink-0 text-red-500" />
                        ) : (
                          <Image className="h-3.5 w-3.5 flex-shrink-0 text-blue-500" />
                        )}
                        <span className="flex-1 truncate text-xs">{file.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeResumeFile(index);
                          }}
                          disabled={isProcessing}
                          className="rounded-full p-0.5 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Template upload (style source) */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <Label className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <Palette className="h-4 w-4 text-violet-500" />
                  {t("designTemplate")}
                  <span className="text-xs font-normal text-zinc-400">{t("styleSource")}</span>
                </Label>

                <div
                  onDragOver={handleTemplateDragOver}
                  onDragLeave={handleTemplateDragLeave}
                  onDrop={handleTemplateDrop}
                  onClick={() => !isProcessing && templateInputRef.current?.click()}
                  className={cn(
                    "relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 transition-all",
                    isDraggingTemplate || (draggingFile?.source === "resume" && draggingFile.file.type.startsWith("image/"))
                      ? "border-violet-500 bg-violet-50 dark:bg-violet-950/20"
                      : "border-zinc-200 hover:border-violet-300 dark:border-zinc-800 dark:hover:border-violet-800",
                    isProcessing && "pointer-events-none opacity-50"
                  )}
                >
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
                    <Palette className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <p className="text-center text-xs text-zinc-600 dark:text-zinc-400">
                    {t("templateImage")}
                  </p>
                  <p className="mt-0.5 text-[10px] text-zinc-400">
                    {t("copyStyleColors")}
                  </p>
                  <input
                    ref={templateInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleTemplateSelect}
                    className="hidden"
                  />
                </div>

                {/* Template file */}
                {templateFile && (
                  <div className="mt-2">
                    <div
                      draggable={!isProcessing}
                      onDragStart={(e) => {
                        setDraggingFile({ file: templateFile, source: "template", index: 0 });
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => setDraggingFile(null)}
                      className={cn(
                        "flex cursor-grab items-center gap-2 rounded-lg bg-violet-50 px-2 py-1.5 transition-opacity dark:bg-violet-950/20",
                        draggingFile?.source === "template" && "opacity-50"
                      )}
                    >
                      <Image className="h-3.5 w-3.5 flex-shrink-0 text-violet-500" />
                      <span className="flex-1 truncate text-xs">{templateFile.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTemplateFile(null);
                        }}
                        disabled={isProcessing}
                        className="rounded-full p-0.5 hover:bg-violet-100 dark:hover:bg-violet-900/50"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Style picker */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <Label className="mb-3 block text-sm font-medium">
                {t("styleLabel")}
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {styles.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    disabled={isProcessing}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all",
                      selectedStyle === style.id
                        ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                        : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                    )}
                  >
                    <style.icon className="h-4 w-4" />
                    <span className="text-xs font-medium">{t(style.translationKey)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit button */}
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              size="lg"
              className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25 hover:from-amber-600 hover:to-orange-700 disabled:from-zinc-400 disabled:to-zinc-500 disabled:shadow-none"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("creatingResume")}
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  {t("buildResume")}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>

          {/* Right column - Progress */}
          <div className="lg:col-span-2">
            <div className="sticky top-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <h3 className="mb-6 text-sm font-semibold uppercase tracking-wider text-zinc-400">
                {t("progress")}
              </h3>

              {/* Progress steps */}
              <div className="space-y-4">
                {(["analyzing", "generating", "formatting", "complete"] as Step[]).map((step, index) => {
                  const stepIndex = ["analyzing", "generating", "formatting", "complete"].indexOf(currentStep);
                  const thisIndex = index;
                  const isActive = step === currentStep;
                  const isComplete = stepIndex > thisIndex || currentStep === "complete";
                  const isPending = stepIndex < thisIndex && currentStep !== "idle";

                  return (
                    <div
                      key={step}
                      className={cn(
                        "flex items-center gap-4 rounded-xl p-3 transition-all duration-500",
                        isActive && "bg-amber-50 dark:bg-amber-950/20",
                        isComplete && "opacity-60"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full transition-all duration-500",
                          isActive && "bg-amber-500 text-white",
                          isComplete && "bg-green-500 text-white",
                          !isActive && !isComplete && "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"
                        )}
                      >
                        {isActive && <Loader2 className="h-4 w-4 animate-spin" />}
                        {isComplete && <CheckCircle2 className="h-4 w-4" />}
                        {!isActive && !isComplete && <span className="text-xs font-bold">{index + 1}</span>}
                      </div>
                      <div className="flex-1">
                        <p
                          className={cn(
                            "text-sm font-medium transition-colors",
                            isActive && "text-amber-700 dark:text-amber-400",
                            isComplete && "text-green-600 dark:text-green-400"
                          )}
                        >
                          {t(step)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Error message */}
              {currentStep === "error" && error && (
                <div className="mt-6 rounded-xl bg-red-50 p-4 dark:bg-red-950/30">
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">{t("errorTitle")}</p>
                  <p className="mt-1 text-sm text-red-500 dark:text-red-400/80">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentStep("idle")}
                    className="mt-3"
                  >
                    {t("tryAgain")}
                  </Button>
                </div>
              )}

              {/* Idle state hint */}
              {currentStep === "idle" && (
                <div className="mt-6 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-900">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    💡 <strong>{t("tipTitle")}:</strong> {t("tipText")}
                  </p>
                  <p className="mt-2 text-xs text-zinc-400">
                    {t("tipHint")}
                  </p>
                </div>
              )}

              {/* Success state */}
              {currentStep === "complete" && (
                <div className="mt-6 rounded-xl bg-green-50 p-4 dark:bg-green-950/30">
                  <p className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" />
                    {t("successTitle")}
                  </p>
                  <p className="mt-1 text-xs text-green-500">
                    {t("redirecting")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
