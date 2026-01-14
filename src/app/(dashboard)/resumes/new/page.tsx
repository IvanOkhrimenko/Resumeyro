"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, FileText, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

const regions = [
  {
    id: "US",
    name: "United States",
    flag: "🇺🇸",
    description: "No photo, single column layout",
  },
  {
    id: "EU",
    name: "European Union",
    flag: "🇪🇺",
    description: "Europass style with photo",
  },
  {
    id: "UA",
    name: "Ukraine",
    flag: "🇺🇦",
    description: "Formal style with photo",
  },
];

export default function NewResumePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("US");
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  async function handleCreate() {
    if (!title.trim()) {
      toast.warning("Please enter a title for your resume");
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          region: selectedRegion,
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
      console.error("Create error:", error);
      toast.error("Something went wrong");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/resumes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create New Resume</h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Start with a blank canvas or choose a template
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Resume Details
          </CardTitle>
          <CardDescription>
            Give your resume a name and select the target region
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Resume Title</Label>
            <Input
              id="title"
              placeholder="e.g., Software Engineer Resume"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isCreating}
            />
          </div>

          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Target Region
            </Label>
            <div className="grid gap-3 sm:grid-cols-3">
              {regions.map((region) => (
                <button
                  key={region.id}
                  onClick={() => setSelectedRegion(region.id)}
                  disabled={isCreating}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-all hover:border-zinc-400 dark:hover:border-zinc-600",
                    selectedRegion === region.id
                      ? "border-zinc-900 bg-zinc-50 dark:border-white dark:bg-zinc-800"
                      : "border-zinc-200 dark:border-zinc-700"
                  )}
                >
                  <span className="text-2xl">{region.flag}</span>
                  <span className="font-medium">{region.name}</span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {region.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleCreate}
              disabled={isCreating || !title.trim()}
              className="flex-1"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Resume"
              )}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/templates">Use Template</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
