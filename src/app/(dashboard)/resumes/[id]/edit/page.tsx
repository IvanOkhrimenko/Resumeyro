"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ArrowLeft, Loader2, PanelLeft, PanelRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CanvasToolbar } from "@/components/canvas/canvas-toolbar";
import { CanvasSidebar } from "@/components/canvas/canvas-sidebar";
import { TextPropertiesPanel } from "@/components/canvas/text-properties-panel";
import { useCanvasStore } from "@/stores/canvas-store";
import { downloadPDF } from "@/lib/canvas/export";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

// Dynamic import for Fabric.js canvas (client-side only)
const ResumeCanvas = dynamic(
  () => import("@/components/canvas/resume-canvas").then((mod) => mod.ResumeCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    ),
  }
);

interface Resume {
  id: string;
  title: string;
  canvasData: any;
  profession: string | null;
}

interface SubscriptionLimits {
  maxResumes: number;
  aiGenerations: number;
  aiReviews: number;
  multiModelReview: boolean;
  pdfWatermark: boolean;
}

export default function ResumeEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [resume, setResume] = useState<Resume | null>(null);
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [subscriptionLimits, setSubscriptionLimits] = useState<SubscriptionLimits | null>(null);
  const { canvas, markClean, triggerAIAssistant } = useCanvasStore();
  const { toast } = useToast();

  useEffect(() => {
    fetchResume();
    fetchSubscription();
  }, [id]);

  async function fetchSubscription() {
    try {
      const res = await fetch("/api/subscription");
      if (res.ok) {
        const data = await res.json();
        setSubscriptionLimits(data.limits);
      }
    } catch (err) {
      console.warn("Failed to fetch subscription:", err);
    }
  }

  async function fetchResume() {
    try {
      const res = await fetch(`/api/resumes/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError("Resume not found");
        } else {
          setError("Failed to load resume");
        }
        return;
      }

      const data = await res.json();
      setResume(data);
      setTitle(data.title);
    } catch (err) {
      setError("Failed to load resume");
    } finally {
      setIsLoading(false);
    }
  }

  const handleSave = useCallback(
    async (canvasData?: string) => {
      if (!resume) return;

      setIsSaving(true);
      try {
        const body: any = { title };
        if (canvasData) {
          body.canvasData = JSON.parse(canvasData);
        }

        // Generate thumbnail from canvas
        if (canvas) {
          try {
            // Scale down for thumbnail (width 300px, maintain aspect ratio)
            const scale = 300 / canvas.getWidth();
            const thumbnail = canvas.toDataURL({
              format: "png",
              quality: 0.8,
              multiplier: scale,
            });
            body.thumbnail = thumbnail;
          } catch (err) {
            console.warn("Failed to generate thumbnail:", err);
          }
        }

        const res = await fetch(`/api/resumes/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (res.ok) {
          markClean();
        }
      } catch (err) {
        console.error("Failed to save:", err);
      } finally {
        setIsSaving(false);
      }
    },
    [id, resume, title, markClean, canvas]
  );

  const handleTitleChange = async (newTitle: string) => {
    setTitle(newTitle);
    // Debounced save
    setTimeout(() => {
      fetch(`/api/resumes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
    }, 500);
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    if (!canvas) {
      toast.warning("Canvas not ready");
      return;
    }

    setIsExporting(true);
    try {
      // Add watermark based on subscription plan (pdfWatermark: true means user has watermark)
      const addWatermark = subscriptionLimits?.pdfWatermark ?? true;

      await downloadPDF(canvas, {
        filename: title || "resume",
        format: "a4",
        quality: 1,
        addWatermark,
      });
      toast.success("PDF exported successfully");
    } catch (err) {
      console.error("Failed to export PDF:", err);
      toast.error("Failed to export PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (error || !resume) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <p className="mb-4 text-zinc-500">{error || "Resume not found"}</p>
        <Button asChild>
          <Link href="/resumes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Resumes
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-900">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-zinc-200 bg-white px-2 py-2 dark:border-zinc-800 dark:bg-zinc-950 flex-shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
          <Link href="/resumes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>

        {/* Toggle left sidebar */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setShowLeftSidebar(!showLeftSidebar)}
        >
          <PanelLeft className={cn("h-4 w-4", showLeftSidebar && "text-zinc-900 dark:text-zinc-100")} />
        </Button>

        <Input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="h-8 flex-1 max-w-xs border-transparent bg-transparent font-medium hover:border-zinc-200 focus:border-zinc-200 dark:hover:border-zinc-700 dark:focus:border-zinc-700"
        />

        {isSaving && (
          <span className="flex items-center text-xs text-zinc-500">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Saving...
          </span>
        )}

        <div className="flex-1" />

        {/* Toggle right sidebar */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setShowRightSidebar(!showRightSidebar)}
        >
          <PanelRight className={cn("h-4 w-4", showRightSidebar && "text-zinc-900 dark:text-zinc-100")} />
        </Button>
      </div>

      {/* Toolbar */}
      <CanvasToolbar
        onSave={() => handleSave()}
        onExportPDF={handleExportPDF}
        isSaving={isSaving}
        isExporting={isExporting}
        onAIAssistant={triggerAIAssistant}
      />

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left sidebar - collapsible */}
        <div className={cn(
          "transition-all duration-200 ease-in-out overflow-hidden",
          showLeftSidebar ? "w-72" : "w-0"
        )}>
          <CanvasSidebar />
        </div>

        {/* Canvas area */}
        <div className="flex-1 overflow-auto min-w-0">
          <ResumeCanvas
            initialData={
              typeof resume.canvasData === "string"
                ? resume.canvasData
                : JSON.stringify(resume.canvasData)
            }
            onSave={handleSave}
          />
        </div>

        {/* Right sidebar */}
        <div className={cn(
          "transition-all duration-200 ease-in-out overflow-hidden",
          showRightSidebar ? "w-64" : "w-0"
        )}>
          <TextPropertiesPanel />
        </div>
      </div>
    </div>
  );
}
