"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { createPortal } from "react-dom";
import { X, AlertTriangle, Trash2, LogOut, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Types
type ModalVariant = "default" | "danger" | "warning";

interface ModalConfig {
  title: string;
  message: string;
  variant?: ModalVariant;
  confirmText?: string;
  cancelText?: string;
  icon?: "delete" | "logout" | "warning" | "alert";
}

interface ModalContextValue {
  confirm: (config: ModalConfig) => Promise<boolean>;
  alert: (config: Omit<ModalConfig, "cancelText">) => Promise<void>;
}

// Variant configurations
const variantConfig: Record<
  ModalVariant,
  {
    colors: {
      overlay: string;
      border: string;
      iconBg: string;
      icon: string;
      confirmBtn: string;
    };
  }
> = {
  default: {
    colors: {
      overlay: "bg-black/60",
      border: "border-zinc-800",
      iconBg: "bg-zinc-800",
      icon: "text-zinc-400",
      confirmBtn: "bg-zinc-100 text-zinc-900 hover:bg-white",
    },
  },
  danger: {
    colors: {
      overlay: "bg-black/70",
      border: "border-red-900/50",
      iconBg: "bg-red-950",
      icon: "text-red-400",
      confirmBtn: "bg-red-600 text-white hover:bg-red-500",
    },
  },
  warning: {
    colors: {
      overlay: "bg-black/60",
      border: "border-amber-900/50",
      iconBg: "bg-amber-950",
      icon: "text-amber-400",
      confirmBtn: "bg-amber-600 text-white hover:bg-amber-500",
    },
  },
};

const iconComponents = {
  delete: Trash2,
  logout: LogOut,
  warning: AlertTriangle,
  alert: AlertCircle,
};

// Context
const ModalContext = createContext<ModalContextValue | null>(null);

// Hook
export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
}

// Modal Component
function ModalDialog({
  config,
  onConfirm,
  onCancel,
  isAlert,
}: {
  config: ModalConfig;
  onConfirm: () => void;
  onCancel: () => void;
  isAlert: boolean;
}) {
  const [isClosing, setIsClosing] = useState(false);
  const variant = config.variant || "default";
  const colors = variantConfig[variant].colors;
  const IconComponent = config.icon ? iconComponents[config.icon] : AlertCircle;

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onCancel, 200);
  };

  const handleConfirm = () => {
    setIsClosing(true);
    setTimeout(onConfirm, 200);
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9998] flex items-center justify-center p-4 transition-opacity duration-200",
        colors.overlay,
        isClosing ? "opacity-0" : "opacity-100"
      )}
      onClick={handleClose}
    >
      <div
        className={cn(
          "relative w-full max-w-md overflow-hidden rounded-2xl border bg-zinc-950 shadow-2xl transition-all duration-200",
          colors.border,
          isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100 animate-in zoom-in-95"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative gradient */}
        <div
          className={cn(
            "absolute inset-x-0 top-0 h-px",
            variant === "danger"
              ? "bg-gradient-to-r from-transparent via-red-500/50 to-transparent"
              : variant === "warning"
              ? "bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"
              : "bg-gradient-to-r from-transparent via-zinc-500/50 to-transparent"
          )}
        />

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Content */}
        <div className="p-6">
          {/* Icon */}
          <div
            className={cn(
              "mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full",
              colors.iconBg
            )}
          >
            <IconComponent className={cn("h-7 w-7", colors.icon)} />
          </div>

          {/* Title */}
          <h2 className="mb-2 text-center text-lg font-semibold text-zinc-100">
            {config.title}
          </h2>

          {/* Message */}
          <p className="mb-6 text-center text-sm text-zinc-400">
            {config.message}
          </p>

          {/* Actions */}
          <div className={cn("flex gap-3", isAlert ? "justify-center" : "")}>
            {!isAlert && (
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1 border-zinc-800 text-zinc-300 hover:bg-zinc-900"
              >
                {config.cancelText || "Cancel"}
              </Button>
            )}
            <Button
              onClick={handleConfirm}
              className={cn(
                isAlert ? "min-w-[120px]" : "flex-1",
                colors.confirmBtn
              )}
            >
              {config.confirmText || (isAlert ? "OK" : "Confirm")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Provider
export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [modalState, setModalState] = useState<{
    config: ModalConfig | null;
    resolve: ((value: boolean) => void) | null;
    isAlert: boolean;
  }>({
    config: null,
    resolve: null,
    isAlert: false,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const confirm = useCallback((config: ModalConfig): Promise<boolean> => {
    return new Promise((resolve) => {
      setModalState({ config, resolve, isAlert: false });
    });
  }, []);

  const alert = useCallback(
    (config: Omit<ModalConfig, "cancelText">): Promise<void> => {
      return new Promise((resolve) => {
        setModalState({
          config: { ...config, cancelText: undefined },
          resolve: () => resolve(),
          isAlert: true,
        });
      });
    },
    []
  );

  const handleConfirm = useCallback(() => {
    modalState.resolve?.(true);
    setModalState({ config: null, resolve: null, isAlert: false });
  }, [modalState.resolve]);

  const handleCancel = useCallback(() => {
    modalState.resolve?.(false);
    setModalState({ config: null, resolve: null, isAlert: false });
  }, [modalState.resolve]);

  return (
    <ModalContext.Provider value={{ confirm, alert }}>
      {children}
      {mounted &&
        modalState.config &&
        createPortal(
          <ModalDialog
            config={modalState.config}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            isAlert={modalState.isAlert}
          />,
          document.body
        )}
    </ModalContext.Provider>
  );
}
