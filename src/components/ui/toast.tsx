"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types
type ToastVariant = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
  createdAt: number;
}

interface ToastContextValue {
  toast: {
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
  };
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

// Variant configurations
const variantConfig: Record<
  ToastVariant,
  {
    icon: typeof CheckCircle2;
    colors: {
      bg: string;
      border: string;
      accent: string;
      icon: string;
      progress: string;
    };
    label: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    colors: {
      bg: "bg-emerald-950/80",
      border: "border-emerald-500/30",
      accent: "text-emerald-400",
      icon: "text-emerald-400",
      progress: "bg-emerald-500",
    },
    label: "Success",
  },
  error: {
    icon: XCircle,
    colors: {
      bg: "bg-red-950/80",
      border: "border-red-500/30",
      accent: "text-red-400",
      icon: "text-red-400",
      progress: "bg-red-500",
    },
    label: "Error",
  },
  warning: {
    icon: AlertTriangle,
    colors: {
      bg: "bg-amber-950/80",
      border: "border-amber-500/30",
      accent: "text-amber-400",
      icon: "text-amber-400",
      progress: "bg-amber-500",
    },
    label: "Warning",
  },
  info: {
    icon: Info,
    colors: {
      bg: "bg-blue-950/80",
      border: "border-blue-500/30",
      accent: "text-blue-400",
      icon: "text-blue-400",
      progress: "bg-blue-500",
    },
    label: "Info",
  },
};

// Context
const ToastContext = createContext<ToastContextValue | null>(null);

// Hook
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

// Individual Toast Component
function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const [isLeaving, setIsLeaving] = useState(false);
  const [progress, setProgress] = useState(100);
  const config = variantConfig[toast.variant];
  const Icon = config.icon;

  useEffect(() => {
    const startTime = toast.createdAt;
    const endTime = startTime + toast.duration;

    const updateProgress = () => {
      const now = Date.now();
      const remaining = endTime - now;
      const newProgress = (remaining / toast.duration) * 100;

      if (newProgress <= 0) {
        setIsLeaving(true);
        setTimeout(() => onDismiss(toast.id), 300);
      } else {
        setProgress(newProgress);
        requestAnimationFrame(updateProgress);
      }
    };

    const animationId = requestAnimationFrame(updateProgress);
    return () => cancelAnimationFrame(animationId);
  }, [toast, onDismiss]);

  const handleDismiss = () => {
    setIsLeaving(true);
    setTimeout(() => onDismiss(toast.id), 300);
  };

  return (
    <div
      className={cn(
        "group relative w-80 overflow-hidden rounded-lg border backdrop-blur-xl transition-all duration-300",
        config.colors.bg,
        config.colors.border,
        isLeaving
          ? "translate-x-full opacity-0"
          : "translate-x-0 opacity-100 animate-in slide-in-from-right-full"
      )}
      style={{
        boxShadow: `0 0 40px -10px ${toast.variant === "success" ? "rgba(16, 185, 129, 0.3)" : toast.variant === "error" ? "rgba(239, 68, 68, 0.3)" : toast.variant === "warning" ? "rgba(245, 158, 11, 0.3)" : "rgba(59, 130, 246, 0.3)"}`,
      }}
    >
      {/* Noise texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Content */}
      <div className="relative flex items-start gap-3 p-4">
        {/* Icon with glow */}
        <div className="relative flex-shrink-0">
          <div
            className={cn(
              "absolute inset-0 blur-md opacity-50",
              config.colors.icon
            )}
          />
          <Icon className={cn("relative h-5 w-5", config.colors.icon)} />
        </div>

        {/* Message */}
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-[10px] font-mono uppercase tracking-widest mb-0.5",
              config.colors.accent
            )}
          >
            {config.label}
          </p>
          <p className="text-sm text-zinc-200 leading-snug">{toast.message}</p>
        </div>

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 rounded-md p-1 text-zinc-500 opacity-0 transition-all hover:bg-white/10 hover:text-zinc-300 group-hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="relative h-0.5 w-full bg-white/5">
        <div
          className={cn(
            "absolute left-0 top-0 h-full transition-none",
            config.colors.progress
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// Toast Container
function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Only show last 5 toasts
  const visibleToasts = toasts.slice(-5);

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col-reverse gap-2">
      {visibleToasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{
            transform: `scale(${1 - (visibleToasts.length - 1 - index) * 0.02})`,
            opacity: 1 - (visibleToasts.length - 1 - index) * 0.1,
          }}
        >
          <ToastItem toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>,
    document.body
  );
}

// Provider
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idCounter = useRef(0);

  const addToast = useCallback(
    (message: string, variant: ToastVariant, duration: number = 5000) => {
      const id = `toast-${++idCounter.current}-${Date.now()}`;
      const newToast: Toast = {
        id,
        message,
        variant,
        duration,
        createdAt: Date.now(),
      };

      setToasts((prev) => [...prev, newToast]);
    },
    []
  );

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const toast = {
    success: (message: string, duration?: number) =>
      addToast(message, "success", duration),
    error: (message: string, duration?: number) =>
      addToast(message, "error", duration),
    warning: (message: string, duration?: number) =>
      addToast(message, "warning", duration),
    info: (message: string, duration?: number) =>
      addToast(message, "info", duration),
  };

  return (
    <ToastContext.Provider value={{ toast, dismiss, dismissAll }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}
