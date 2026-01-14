"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Crosshair,
  Zap,
  Eye,
  AlertTriangle,
  AlertCircle,
  Lightbulb,
  Check,
  ArrowRight,
  RefreshCw,
  X,
  CheckCircle2,
  Clock,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActionableSuggestion, SuggestionStatus } from "@/stores/ai-features-store";

interface SuggestionCardProps {
  suggestion: ActionableSuggestion;
  onHighlight: (suggestion: ActionableSuggestion) => void;
  onQuickApply: (suggestion: ActionableSuggestion) => void;
  onPreview: (suggestion: ActionableSuggestion) => void;
  onDismiss?: (suggestion: ActionableSuggestion) => void;
  onRevalidate?: (suggestion: ActionableSuggestion) => void;
  isHighlighted?: boolean;
  isRevalidating?: boolean;
}

const severityConfig = {
  critical: {
    icon: AlertTriangle,
    bg: "bg-gradient-to-r from-rose-500/10 to-rose-500/5",
    border: "border-l-rose-500",
    badge: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    glow: "shadow-rose-500/20",
    label: "Critical",
  },
  important: {
    icon: AlertCircle,
    bg: "bg-gradient-to-r from-amber-500/10 to-amber-500/5",
    border: "border-l-amber-500",
    badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    glow: "shadow-amber-500/20",
    label: "Important",
  },
  suggestion: {
    icon: Lightbulb,
    bg: "bg-gradient-to-r from-sky-500/10 to-sky-500/5",
    border: "border-l-sky-500",
    badge: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    glow: "shadow-sky-500/20",
    label: "Suggestion",
  },
};

// Status configuration for visual feedback
const statusConfig: Record<SuggestionStatus, {
  overlay: string;
  badge: string;
  badgeText: string;
  icon: typeof CheckCircle2;
}> = {
  pending: {
    overlay: "",
    badge: "",
    badgeText: "",
    icon: Clock,
  },
  applied: {
    overlay: "bg-emerald-500/10",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400",
    badgeText: "Applied",
    icon: CheckCircle2,
  },
  stale: {
    overlay: "bg-amber-500/5",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400",
    badgeText: "Outdated",
    icon: Clock,
  },
  dismissed: {
    overlay: "bg-zinc-500/10",
    badge: "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400",
    badgeText: "Dismissed",
    icon: X,
  },
};

export function SuggestionCard({
  suggestion,
  onHighlight,
  onQuickApply,
  onPreview,
  onDismiss,
  onRevalidate,
  isHighlighted = false,
  isRevalidating = false,
}: SuggestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = severityConfig[suggestion.severity];
  const SeverityIcon = config.icon;
  const status = suggestion.status || 'pending';
  const statusConf = statusConfig[status];

  const hasTextChange = suggestion.currentValue && suggestion.suggestedValue;
  const highlightId = suggestion.targetElementId || suggestion.targetSemanticType;
  const canHighlight = !!highlightId;

  // Applied suggestions show differently
  const isApplied = status === 'applied';
  const isStale = status === 'stale';
  const isDismissed = status === 'dismissed';
  const isInteractive = !isApplied && !isDismissed;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: isApplied || isDismissed ? 0.6 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "group relative rounded-lg border-l-[3px] overflow-hidden transition-all duration-200",
        config.border,
        config.bg,
        isHighlighted && "ring-2 ring-cyan-500/50 shadow-lg",
        isInteractive && "hover:shadow-md",
        isApplied && "border-l-emerald-500",
        isStale && "border-l-amber-400",
        isDismissed && "border-l-zinc-400",
        config.glow
      )}
    >
      {/* Status overlay */}
      {statusConf.overlay && (
        <div className={cn("absolute inset-0 pointer-events-none", statusConf.overlay)} />
      )}

      {/* Revalidating overlay */}
      {isRevalidating && (
        <div className="absolute inset-0 bg-white/50 dark:bg-zinc-900/50 flex items-center justify-center z-10">
          <Loader2 className="w-5 h-5 text-violet-600 animate-spin" />
        </div>
      )}

      {/* Main content */}
      <div className="p-3 relative">
        {/* Header */}
        <div className="flex items-start gap-2">
          <div className={cn(
            "p-1.5 rounded-md",
            isApplied ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" :
            isStale ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" :
            isDismissed ? "bg-zinc-500/15 text-zinc-500" :
            config.badge
          )}>
            {isApplied ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : isRevalidating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <SeverityIcon className="w-3.5 h-3.5" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <span className={cn(
                "text-[10px] font-medium uppercase tracking-wider",
                isApplied ? "text-emerald-600 dark:text-emerald-400" :
                isStale ? "text-amber-600 dark:text-amber-400" :
                isDismissed ? "text-zinc-500" :
                config.badge, "bg-transparent px-0"
              )}>
                {config.label}
              </span>
              {/* Status badge */}
              {status !== 'pending' && (
                <span className={cn(
                  "text-[9px] font-medium px-1.5 py-0.5 rounded-full",
                  statusConf.badge
                )}>
                  {statusConf.badgeText}
                </span>
              )}
            </div>
            <h4 className={cn(
              "text-sm font-semibold leading-tight",
              isDismissed ? "text-zinc-500 line-through" :
              isApplied ? "text-zinc-600 dark:text-zinc-400" :
              "text-zinc-900 dark:text-zinc-100"
            )}>
              {suggestion.title}
            </h4>
          </div>

          {/* Actions: Dismiss / Expand */}
          <div className="flex items-center gap-1">
            {/* Dismiss button */}
            {isInteractive && onDismiss && (
              <button
                onClick={() => onDismiss(suggestion)}
                className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 transition-all"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5 text-zinc-400" />
              </button>
            )}
            {/* Expand toggle */}
            {hasTextChange && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 rounded-md hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 transition-colors"
              >
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-zinc-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-zinc-500" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Description */}
        {!isDismissed && (
          <p className={cn(
            "mt-2 text-xs leading-relaxed",
            isApplied ? "text-zinc-500" : "text-zinc-600 dark:text-zinc-400"
          )}>
            {suggestion.description}
          </p>
        )}

        {/* Expanded content */}
        <AnimatePresence>
          {isExpanded && hasTextChange && !isDismissed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 border-t border-zinc-200/50 dark:border-zinc-700/50 space-y-2">
                {/* Current value */}
                <div className="relative">
                  <span className="absolute -top-2 left-2 px-1.5 text-[9px] font-medium uppercase tracking-wider text-zinc-500 bg-white dark:bg-zinc-800 rounded">
                    {isApplied ? "Before" : "Current"}
                  </span>
                  <div className={cn(
                    "p-2.5 rounded-md border",
                    isApplied ? "bg-zinc-50/80 dark:bg-zinc-800/50 border-zinc-200/30 dark:border-zinc-700/30" :
                    "bg-zinc-100/80 dark:bg-zinc-800/80 border-zinc-200/50 dark:border-zinc-700/50"
                  )}>
                    <p className={cn(
                      "text-xs line-clamp-3 font-mono",
                      isApplied ? "text-zinc-400 line-through" : "text-zinc-600 dark:text-zinc-400"
                    )}>
                      {suggestion.currentValue}
                    </p>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <ArrowRight className="w-4 h-4 text-zinc-400 rotate-90" />
                </div>

                {/* Suggested/Applied value */}
                <div className="relative">
                  <span className={cn(
                    "absolute -top-2 left-2 px-1.5 text-[9px] font-medium uppercase tracking-wider bg-white dark:bg-zinc-800 rounded",
                    isApplied ? "text-emerald-600 dark:text-emerald-400" : "text-emerald-600 dark:text-emerald-400"
                  )}>
                    {isApplied ? "Applied" : "Suggested"}
                  </span>
                  <div className={cn(
                    "p-2.5 rounded-md border",
                    isApplied ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200/30 dark:border-emerald-700/20" :
                    "bg-emerald-50/80 dark:bg-emerald-900/20 border-emerald-200/50 dark:border-emerald-700/30"
                  )}>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 line-clamp-3 font-mono">
                      {suggestion.suggestedValue}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action buttons */}
        {!isDismissed && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {/* Stale: Show revalidate button */}
            {isStale && onRevalidate && (
              <button
                onClick={() => onRevalidate(suggestion)}
                disabled={isRevalidating}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
                  "bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/30 dark:hover:bg-amber-900/50",
                  "text-amber-700 dark:text-amber-400",
                  isRevalidating && "opacity-50 cursor-not-allowed"
                )}
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isRevalidating && "animate-spin")} />
                <span>Re-check</span>
              </button>
            )}

            {/* Normal actions for pending suggestions */}
            {!isApplied && !isStale && canHighlight && (
              <button
                onClick={() => onHighlight(suggestion)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
                  "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700",
                  "text-zinc-700 dark:text-zinc-300",
                  isHighlighted && "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400"
                )}
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>Find</span>
              </button>
            )}

            {!isApplied && !isStale && suggestion.canQuickApply && hasTextChange && (
              <button
                onClick={() => onQuickApply(suggestion)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
                  "bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50",
                  "text-emerald-700 dark:text-emerald-400"
                )}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Apply</span>
              </button>
            )}

            {!isApplied && !isStale && suggestion.previewRequired && (
              <button
                onClick={() => onPreview(suggestion)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
                  "bg-violet-100 hover:bg-violet-200 dark:bg-violet-900/30 dark:hover:bg-violet-900/50",
                  "text-violet-700 dark:text-violet-400"
                )}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>
            )}

            {/* Applied: Show undo option (if needed in future) */}
            {isApplied && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Change applied
              </span>
            )}
          </div>
        )}
      </div>

      {/* Highlight indicator */}
      {isHighlighted && (
        <div className="absolute inset-0 bg-cyan-500/5 pointer-events-none" />
      )}
    </motion.div>
  );
}

// Score Badge Component
interface ScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

export function ScoreBadge({ score, size = "md" }: ScoreBadgeProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return { ring: "stroke-emerald-500", fill: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20" };
    if (score >= 60) return { ring: "stroke-amber-500", fill: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20" };
    return { ring: "stroke-rose-500", fill: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-900/20" };
  };

  const colors = getScoreColor(score);
  const sizeConfig = {
    sm: { container: "w-10 h-10", text: "text-sm", stroke: 3, radius: 16 },
    md: { container: "w-14 h-14", text: "text-lg", stroke: 4, radius: 22 },
    lg: { container: "w-20 h-20", text: "text-2xl", stroke: 5, radius: 32 },
  };

  const config = sizeConfig[size];
  const circumference = 2 * Math.PI * config.radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className={cn("relative flex items-center justify-center", config.container, colors.bg, "rounded-full")}>
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 50 50">
        {/* Background circle */}
        <circle
          cx="25"
          cy="25"
          r={config.radius}
          fill="none"
          strokeWidth={config.stroke}
          className="stroke-zinc-200 dark:stroke-zinc-700"
        />
        {/* Progress circle */}
        <motion.circle
          cx="25"
          cy="25"
          r={config.radius}
          fill="none"
          strokeWidth={config.stroke}
          strokeLinecap="round"
          className={colors.ring}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{
            strokeDasharray: circumference,
          }}
        />
      </svg>
      <motion.span
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        className={cn("font-bold", config.text, colors.fill)}
      >
        {score}
      </motion.span>
    </div>
  );
}

// Strength Badge Component
interface StrengthBadgeProps {
  text: string;
}

export function StrengthBadge({ text }: StrengthBadgeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
    >
      <Check className="w-3 h-3" />
      <span className="text-xs font-medium">{text}</span>
    </motion.div>
  );
}

// Missing Section Card
interface MissingSectionCardProps {
  section: string;
  importance: "required" | "recommended" | "optional";
  reason: string;
  onAdd: () => void;
}

export function MissingSectionCard({ section, importance, reason, onAdd }: MissingSectionCardProps) {
  const importanceConfig = {
    required: {
      badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
      label: "Required",
    },
    recommended: {
      badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      label: "Recommended",
    },
    optional: {
      badge: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
      label: "Optional",
    },
  };

  const config = importanceConfig[importance];

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{section}</span>
          <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", config.badge)}>
            {config.label}
          </span>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">{reason}</p>
      </div>
      <button
        onClick={onAdd}
        className="ml-3 px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 transition-colors"
      >
        Add
      </button>
    </motion.div>
  );
}
