"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Globe, Sparkles, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

interface Template {
  id: string;
  name: string;
  nameUk: string;
  description: string;
  descriptionUk: string;
  region: "US" | "EU" | "UA" | "INTL";
  category: string;
  isPremium: boolean;
  thumbnail: string;
}

const regionLabels = {
  US: { name: "United States", flag: "🇺🇸" },
  EU: { name: "European Union", flag: "🇪🇺" },
  UA: { name: "Ukraine", flag: "🇺🇦" },
  INTL: { name: "International", flag: "🌍" },
};

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
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, [selectedRegion, selectedCategory]);

  async function fetchTemplates() {
    try {
      const params = new URLSearchParams();
      if (selectedRegion) params.set("region", selectedRegion);
      if (selectedCategory) params.set("category", selectedCategory);

      const url = params.toString()
        ? `/api/templates?${params.toString()}`
        : "/api/templates";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    } finally {
      setIsLoading(false);
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

      // Map INTL region to US (INTL is for display only, DB accepts US/EU/UA)
      const dbRegion = template.region === "INTL" ? "US" : template.region;

      // Create new resume from template
      const res = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${template.name} Resume`,
          region: dbRegion,
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

      {/* Filters */}
      <div className="space-y-3">
        {/* Region filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 w-16">Region:</span>
          <Button
            variant={selectedRegion === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedRegion(null)}
          >
            <Globe className="mr-2 h-4 w-4" />
            All
          </Button>
          {(["US", "EU", "UA"] as const).map((region) => (
            <Button
              key={region}
              variant={selectedRegion === region ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedRegion(region)}
            >
              <span className="mr-2">{regionLabels[region].flag}</span>
              {regionLabels[region].name}
            </Button>
          ))}
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 w-16">Style:</span>
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
            {/* Premium badge */}
            {template.isPremium && (
              <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2 py-1 text-xs font-medium text-white">
                <Sparkles className="h-3 w-3" />
                Premium
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
                    <div className="mb-2 text-4xl">
                      {regionLabels[template.region].flag}
                    </div>
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
              <div className="mb-1 flex items-center justify-between">
                <h3 className="font-medium">{template.name}</h3>
                <span className="text-sm">{regionLabels[template.region].flag}</span>
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {template.description}
              </p>
              <div className="mt-2">
                <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {categoryLabels[template.category] || template.category}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-zinc-500">No templates found for this region</p>
        </div>
      )}
    </div>
  );
}
