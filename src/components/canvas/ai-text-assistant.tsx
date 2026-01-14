"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Wand2,
  Expand,
  Shrink,
  Briefcase,
  Trophy,
  Check,
  X,
  Send,
  Loader2,
  SpellCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AITextAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  selectedText: string;
  onApply: (newText: string) => void;
  position: { x: number; y: number };
  canvasRect?: DOMRect;
}

type ActionType = "fix" | "rewrite" | "expand" | "shorten" | "professional" | "achievements" | "custom";

interface Action {
  id: ActionType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const actions: Action[] = [
  { id: "fix", label: "Fix", icon: SpellCheck, description: "Grammar & spelling" },
  { id: "rewrite", label: "Rewrite", icon: Wand2, description: "Clearer wording" },
  { id: "expand", label: "Expand", icon: Expand, description: "Add more detail" },
  { id: "shorten", label: "Shorten", icon: Shrink, description: "Make concise" },
  { id: "professional", label: "Pro", icon: Briefcase, description: "Formal tone" },
  { id: "achievements", label: "Achieve", icon: Trophy, description: "Impact-focused" },
];

export function AITextAssistant({
  isOpen,
  onClose,
  selectedText,
  onApply,
  position,
  canvasRect,
}: AITextAssistantProps) {
  const [activeAction, setActiveAction] = useState<ActionType | null>(null);
  const [customInstruction, setCustomInstruction] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Calculate position to keep popover in view
  const getPopoverStyle = useCallback(() => {
    if (!canvasRect) {
      return { left: position.x, top: position.y };
    }

    const popoverWidth = 340;
    const popoverHeight = 400;

    let left = position.x - popoverWidth / 2;
    let top = position.y - popoverHeight - 20;

    // Keep within canvas bounds
    if (left < canvasRect.left + 10) left = canvasRect.left + 10;
    if (left + popoverWidth > canvasRect.right - 10) left = canvasRect.right - popoverWidth - 10;

    // If not enough space above, show below
    if (top < canvasRect.top + 10) {
      top = position.y + 40;
    }

    return { left, top };
  }, [position, canvasRect]);

  const handleAction = async (action: ActionType, instruction?: string) => {
    setActiveAction(action);
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/ai/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          text: selectedText,
          instruction: action === "custom" ? instruction : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process text");
      }

      setResult(data.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (result) {
      onApply(result);
      handleReset();
      onClose();
    }
  };

  const handleReset = () => {
    setActiveAction(null);
    setResult(null);
    setError(null);
    setCustomInstruction("");
  };

  const handleCustomSubmit = () => {
    if (customInstruction.trim()) {
      handleAction("custom", customInstruction);
    }
  };

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (result) {
          handleReset();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [result, onClose]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      setTimeout(() => document.addEventListener("mousedown", handleClickOutside), 100);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  const popoverStyle = getPopoverStyle();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 5 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="fixed z-[9999]"
          style={popoverStyle}
        >
          {/* Main container with glow effect */}
          <div className="relative">
            {/* Glow backdrop */}
            <div
              className="absolute -inset-1 rounded-xl opacity-50 blur-xl"
              style={{
                background: "linear-gradient(135deg, rgba(0, 212, 170, 0.3) 0%, rgba(0, 150, 136, 0.2) 100%)"
              }}
            />

            {/* Main panel */}
            <div
              className="relative w-[340px] overflow-hidden rounded-xl border border-slate-700/50"
              style={{
                background: "linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(15, 20, 35, 0.99) 100%)",
                boxShadow: `
                  0 0 0 1px rgba(0, 212, 170, 0.1),
                  0 4px 6px -1px rgba(0, 0, 0, 0.3),
                  0 10px 20px -2px rgba(0, 0, 0, 0.4),
                  inset 0 1px 0 rgba(255, 255, 255, 0.05)
                `,
              }}
            >
              {/* Noise texture overlay */}
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.015]"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                }}
              />

              {/* Header */}
              <div className="relative border-b border-slate-700/50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-md"
                    style={{
                      background: "linear-gradient(135deg, rgba(0, 212, 170, 0.2) 0%, rgba(0, 212, 170, 0.1) 100%)",
                      boxShadow: "0 0 12px rgba(0, 212, 170, 0.3)"
                    }}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-[#00d4aa]" />
                  </div>
                  <span
                    className="font-mono text-xs font-medium tracking-wide text-slate-300"
                    style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
                  >
                    AI_ASSISTANT
                  </span>
                  <div className="ml-auto flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#00d4aa] shadow-[0_0_8px_rgba(0,212,170,0.6)]" />
                    <span className="font-mono text-[10px] text-slate-500">READY</span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="relative p-4">
                <AnimatePresence mode="wait">
                  {/* Loading State */}
                  {isLoading && (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="py-8"
                    >
                      <div className="relative flex flex-col items-center gap-4">
                        {/* Scanning animation */}
                        <div className="relative h-16 w-full overflow-hidden rounded-lg bg-slate-800/50">
                          <motion.div
                            className="absolute inset-y-0 w-1/3"
                            style={{
                              background: "linear-gradient(90deg, transparent, rgba(0, 212, 170, 0.3), transparent)"
                            }}
                            animate={{ x: ["-100%", "400%"] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-[#00d4aa]" />
                          </div>
                        </div>
                        <span className="font-mono text-xs text-slate-400">
                          Processing {activeAction?.toUpperCase()}...
                        </span>
                      </div>
                    </motion.div>
                  )}

                  {/* Error State */}
                  {error && !isLoading && (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="py-4"
                    >
                      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                        <p className="text-center text-sm text-red-400">{error}</p>
                      </div>
                      <button
                        onClick={handleReset}
                        className="mt-3 w-full rounded-lg bg-slate-800 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-700"
                      >
                        Try Again
                      </button>
                    </motion.div>
                  )}

                  {/* Result Preview */}
                  {result && !isLoading && (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      {/* Preview label */}
                      <div className="mb-2 flex items-center gap-2">
                        <div className="h-px flex-1 bg-gradient-to-r from-[#00d4aa]/50 to-transparent" />
                        <span className="font-mono text-[10px] tracking-wider text-[#00d4aa]">PREVIEW</span>
                        <div className="h-px flex-1 bg-gradient-to-l from-[#00d4aa]/50 to-transparent" />
                      </div>

                      {/* Result text */}
                      <div
                        className="max-h-40 overflow-y-auto rounded-lg border border-slate-700/50 bg-slate-800/50 p-3"
                        style={{ scrollbarWidth: "thin", scrollbarColor: "#334155 transparent" }}
                      >
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                          {result}
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={handleReset}
                          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-800 py-2.5 text-sm font-medium text-slate-300 transition-all hover:border-slate-500 hover:bg-slate-700"
                        >
                          <X className="h-4 w-4" />
                          Discard
                        </button>
                        <button
                          onClick={handleApply}
                          className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium text-slate-900 transition-all hover:opacity-90"
                          style={{
                            background: "linear-gradient(135deg, #00d4aa 0%, #00b894 100%)",
                            boxShadow: "0 0 20px rgba(0, 212, 170, 0.3)"
                          }}
                        >
                          <Check className="h-4 w-4" />
                          Apply
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Main Actions */}
                  {!isLoading && !result && !error && (
                    <motion.div
                      key="actions"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      {/* Selected text preview */}
                      <div className="mb-4">
                        <div className="mb-1.5 flex items-center gap-2">
                          <span className="font-mono text-[10px] tracking-wider text-slate-500">SELECTED_TEXT</span>
                        </div>
                        <div className="max-h-16 overflow-hidden rounded-md border border-slate-700/50 bg-slate-800/30 p-2">
                          <p className="line-clamp-2 text-xs text-slate-400">
                            {selectedText || "No text selected"}
                          </p>
                        </div>
                      </div>

                      {/* Quick actions grid */}
                      <div className="mb-4">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="font-mono text-[10px] tracking-wider text-slate-500">QUICK_ACTIONS</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {actions.map((action) => (
                            <motion.button
                              key={action.id}
                              onClick={() => handleAction(action.id)}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className={cn(
                                "group relative flex flex-col items-center gap-1 rounded-lg border border-slate-700/50 bg-slate-800/50 p-2.5 transition-all",
                                "hover:border-[#00d4aa]/50 hover:bg-slate-800"
                              )}
                            >
                              <action.icon className="h-4 w-4 text-slate-400 transition-colors group-hover:text-[#00d4aa]" />
                              <span className="font-mono text-[10px] font-medium text-slate-300">
                                {action.label}
                              </span>
                              {/* Glow on hover */}
                              <div className="absolute inset-0 rounded-lg opacity-0 transition-opacity group-hover:opacity-100"
                                style={{ boxShadow: "inset 0 0 20px rgba(0, 212, 170, 0.1)" }}
                              />
                            </motion.button>
                          ))}
                        </div>
                      </div>

                      {/* Custom instruction */}
                      <div>
                        <div className="mb-2 flex items-center gap-2">
                          <span className="font-mono text-[10px] tracking-wider text-slate-500">CUSTOM_COMMAND</span>
                        </div>
                        <div className="relative">
                          <textarea
                            ref={textareaRef}
                            value={customInstruction}
                            onChange={(e) => setCustomInstruction(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleCustomSubmit();
                              }
                            }}
                            placeholder="e.g., Make it sound more confident..."
                            className="w-full resize-none rounded-lg border border-slate-700/50 bg-slate-800/50 p-3 pr-12 text-sm text-slate-200 placeholder-slate-500 transition-colors focus:border-[#00d4aa]/50 focus:outline-none focus:ring-1 focus:ring-[#00d4aa]/30"
                            rows={2}
                            style={{ scrollbarWidth: "thin" }}
                          />
                          <button
                            onClick={handleCustomSubmit}
                            disabled={!customInstruction.trim()}
                            className={cn(
                              "absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-md transition-all",
                              customInstruction.trim()
                                ? "bg-[#00d4aa] text-slate-900 hover:opacity-90"
                                : "bg-slate-700 text-slate-500"
                            )}
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="border-t border-slate-700/50 px-4 py-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-slate-600">ESC to close</span>
                  <span className="font-mono text-[10px] text-slate-600">ENTER to send</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
