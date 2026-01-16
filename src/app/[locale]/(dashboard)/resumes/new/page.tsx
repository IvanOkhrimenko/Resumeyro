"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

export default function NewResumePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
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
            Give your resume a name and configure basic settings
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
