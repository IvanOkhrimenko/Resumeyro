"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Lock, Sparkles, Filter, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

interface Template {
  id: string;
  name: string;
  nameUk: string;
  description: string;
  descriptionUk: string;
  category: string;
  isPremium: boolean;
  thumbnail: string;
  isHardcoded?: boolean;
  _count?: { resumes: number };
}

const categoryLabels: Record<string, string> = {
  professional: "Professional",
  creative: "Creative",
  academic: "Academic",
  minimal: "Minimal",
  modern: "Modern",
  executive: "Executive",
};

export default function TemplatesPage() {
  const router = useRouter();
  const t = useTranslations("templates");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deleteTemplate, setDeleteTemplate] = useState<Template | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [selectedCategory, isAdmin]);

  async function checkAdminStatus() {
    try {
      const res = await fetch("/api/user/role");
      if (res.ok) {
        const data = await res.json();
        setIsAdmin(data.role === "ADMIN");
      }
    } catch (error) {
      console.error("Failed to check admin status:", error);
    }
  }

  async function fetchTemplates() {
    try {
      // Admins get templates from admin API with usage counts
      if (isAdmin) {
        const res = await fetch("/api/admin/templates");
        if (res.ok) {
          const data = await res.json();
          let adminTemplates = data.templates.map((t: Template & { _count?: { resumes: number } }) => ({
            ...t,
            isHardcoded: false,
          }));

          // Also fetch regular templates to include hardcoded ones
          const publicRes = await fetch("/api/templates");
          if (publicRes.ok) {
            const publicData = await publicRes.json();
            // Add hardcoded templates (those not in DB)
            const dbIds = new Set(adminTemplates.map((t: Template) => t.id));
            const hardcodedTemplates = publicData
              .filter((t: Template) => !dbIds.has(t.id))
              .map((t: Template) => ({ ...t, isHardcoded: true }));
            adminTemplates = [...adminTemplates, ...hardcodedTemplates];
          }

          // Filter by category if selected
          if (selectedCategory) {
            adminTemplates = adminTemplates.filter((t: Template) => t.category === selectedCategory);
          }

          setTemplates(adminTemplates);
        }
      } else {
        const params = new URLSearchParams();
        if (selectedCategory) params.set("category", selectedCategory);

        const url = params.toString()
          ? `/api/templates?${params.toString()}`
          : "/api/templates";
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setTemplates(data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteTemplate() {
    if (!deleteTemplate || deleteTemplate.isHardcoded) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/templates?id=${deleteTemplate.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success(t("deleteSuccess"));
        setTemplates((prev) => prev.filter((t) => t.id !== deleteTemplate.id));
        setDeleteTemplate(null);
      } else {
        const data = await res.json();
        toast.error(data.error || t("deleteFailed"));
      }
    } catch (error) {
      console.error("Failed to delete template:", error);
      toast.error(t("deleteFailed"));
    } finally {
      setIsDeleting(false);
    }
  }

  async function createFromTemplate(templateId: string, isPremium: boolean) {
    if (isCreating) return;

    setIsCreating(templateId);
    try {
      // First get the template with canvas data
      const templateRes = await fetch(`/api/templates/${templateId}`);

      if (!templateRes.ok) {
        const error = await templateRes.json();
        toast.error(error.error || "Failed to load template");
        return;
      }

      const template = await templateRes.json();

      // Create new resume from template
      const res = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${template.name} Resume`,
          showPhoto: true, // Default to showing photo; user can toggle in editor
          canvasData: template.canvasData,
        }),
      });

      if (res.ok) {
        const resume = await res.json();
        router.push(`/resumes/${resume.id}/edit`);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to create resume");
      }
    } catch (error) {
      console.error("Failed to create resume:", error);
    } finally {
      setIsCreating(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Resume Templates</h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          Choose a template to start building your resume
        </p>
      </div>

      {/* Style filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Style:</span>
        <Button
          variant={selectedCategory === null ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedCategory(null)}
        >
          <Filter className="mr-2 h-4 w-4" />
          All
        </Button>
        {(Object.keys(categoryLabels) as Array<keyof typeof categoryLabels>).map(
          (category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {categoryLabels[category]}
            </Button>
          )
        )}
      </div>

      {/* Templates grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card
            key={template.id}
            className={cn(
              "group relative overflow-hidden transition-all hover:shadow-lg",
              template.isPremium && "ring-1 ring-amber-200 dark:ring-amber-900"
            )}
          >
            {/* Admin delete button */}
            {isAdmin && !template.isHardcoded && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTemplate(template);
                }}
                className="absolute left-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
                title={t("delete")}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}

            {/* Premium badge */}
            {template.isPremium && (
              <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2 py-1 text-xs font-medium text-white">
                <Sparkles className="h-3 w-3" />
                {t("premium")}
              </div>
            )}

            {/* Template preview */}
            <div className="aspect-[3/4] overflow-hidden bg-zinc-100 dark:bg-zinc-800">
              {template.thumbnail ? (
                <img
                  src={template.thumbnail}
                  alt={template.name}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <div className="mb-2 text-4xl">📄</div>
                    <p className="text-sm text-zinc-500">{template.name}</p>
                  </div>
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  onClick={() =>
                    createFromTemplate(template.id, template.isPremium)
                  }
                  disabled={isCreating === template.id}
                >
                  {isCreating === template.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : template.isPremium ? (
                    <Lock className="mr-2 h-4 w-4" />
                  ) : null}
                  Use Template
                </Button>
              </div>
            </div>

            <CardContent className="p-4">
              <h3 className="mb-1 font-medium">{template.name}</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {template.description}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {categoryLabels[template.category] || template.category}
                </span>
                {isAdmin && template._count && template._count.resumes > 0 && (
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    {t("usedBy", { count: template._count.resumes })}
                  </span>
                )}
                {isAdmin && template.isHardcoded && (
                  <span className="inline-flex items-center rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
                    {t("builtin")}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-zinc-500">{t("noTemplates")}</p>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTemplate} onOpenChange={() => setDeleteTemplate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("deleteDescription", { name: deleteTemplate?.name || "" })}
              {deleteTemplate?._count && deleteTemplate._count.resumes > 0 && (
                <span className="mt-2 block text-amber-600 dark:text-amber-400">
                  {t("deleteWarning", { count: deleteTemplate._count.resumes })}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTemplate(null)}
              disabled={isDeleting}
            >
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTemplate}
              disabled={isDeleting || (deleteTemplate?._count?.resumes ?? 0) > 0}
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              {t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
