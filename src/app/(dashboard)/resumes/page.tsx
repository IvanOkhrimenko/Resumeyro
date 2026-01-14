"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, FileText, MoreHorizontal, Trash2, Copy, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { useModal } from "@/components/ui/modal";

interface Resume {
  id: string;
  title: string;
  slug: string | null;
  region: string;
  profession: string | null;
  isPublic: boolean;
  pdfUrl: string | null;
  thumbnail: string | null;
  createdAt: string;
  updatedAt: string;
  template: {
    id: string;
    name: string;
    thumbnail: string;
  } | null;
}

export default function ResumesPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const { confirm } = useModal();

  useEffect(() => {
    fetchResumes();
  }, []);

  async function fetchResumes() {
    try {
      const res = await fetch("/api/resumes");
      if (res.ok) {
        const data = await res.json();
        setResumes(data);
      }
    } catch (error) {
      console.error("Failed to fetch resumes:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function createResume() {
    setIsCreating(true);
    try {
      const res = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled Resume" }),
      });

      if (res.ok) {
        const resume = await res.json();
        window.location.href = `/resumes/${resume.id}/edit`;
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to create resume");
      }
    } catch (error) {
      console.error("Failed to create resume:", error);
    } finally {
      setIsCreating(false);
    }
  }

  async function deleteResume(id: string) {
    const confirmed = await confirm({
      title: "Delete Resume",
      message: "Are you sure you want to delete this resume? This action cannot be undone.",
      variant: "danger",
      icon: "delete",
      confirmText: "Delete",
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/resumes/${id}`, { method: "DELETE" });
      if (res.ok) {
        setResumes(resumes.filter((r) => r.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete resume:", error);
    }
  }

  async function duplicateResume(resume: Resume) {
    try {
      const originalRes = await fetch(`/api/resumes/${resume.id}`);
      if (!originalRes.ok) return;

      const original = await originalRes.json();

      // Create the duplicate
      const res = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${resume.title} (Copy)`,
          region: resume.region,
          canvasData: original.canvasData,
        }),
      });

      if (res.ok) {
        const newResume = await res.json();
        // Copy the thumbnail if available
        if (resume.thumbnail) {
          await fetch(`/api/resumes/${newResume.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ thumbnail: resume.thumbnail }),
          });
        }
        fetchResumes();
      }
    } catch (error) {
      console.error("Failed to duplicate resume:", error);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Resumes</h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Create and manage your resumes
          </p>
        </div>
        <Button asChild>
          <Link href="/resumes/new">
            <Plus className="mr-2 h-4 w-4" />
            New Resume
          </Link>
        </Button>
      </div>

      {resumes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
              <FileText className="h-8 w-8 text-zinc-400" />
            </div>
            <h2 className="mb-2 text-xl font-semibold">No resumes yet</h2>
            <p className="mb-6 text-center text-zinc-500 dark:text-zinc-400">
              Create your first resume to get started
            </p>
            <Button onClick={createResume} disabled={isCreating}>
              {isCreating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Create Resume
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resumes.map((resume) => (
            <Card
              key={resume.id}
              className="group relative overflow-hidden transition-shadow hover:shadow-lg"
            >
              <Link href={`/resumes/${resume.id}/edit`}>
                <div className="aspect-[3/4] bg-zinc-100 dark:bg-zinc-800">
                  {resume.thumbnail ? (
                    <img
                      src={resume.thumbnail}
                      alt={resume.title}
                      className="h-full w-full object-cover object-top"
                    />
                  ) : resume.template?.thumbnail ? (
                    <img
                      src={resume.template.thumbnail}
                      alt={resume.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <FileText className="h-16 w-16 text-zinc-300 dark:text-zinc-600" />
                    </div>
                  )}
                </div>
              </Link>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/resumes/${resume.id}/edit`}
                      className="font-medium hover:underline"
                    >
                      {resume.title}
                    </Link>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Updated {formatDate(resume.updatedAt)}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/resumes/${resume.id}/edit`}>
                          <FileText className="mr-2 h-4 w-4" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => duplicateResume(resume)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </DropdownMenuItem>
                      {resume.pdfUrl && (
                        <DropdownMenuItem asChild>
                          <a href={resume.pdfUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View PDF
                          </a>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => deleteResume(resume.id)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Create new card */}
          <Card
            className="flex cursor-pointer items-center justify-center border-2 border-dashed transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
            onClick={createResume}
          >
            <CardContent className="flex flex-col items-center py-16">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                <Plus className="h-6 w-6 text-zinc-500" />
              </div>
              <p className="text-sm font-medium">Create New Resume</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
