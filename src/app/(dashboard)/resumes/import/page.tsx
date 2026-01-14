"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Upload,
  FileText,
  FileJson,
  Linkedin,
  Globe,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

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

type ImportStep = "upload" | "processing" | "configure" | "error";

interface ImportedData {
  title?: string;
  content?: Record<string, unknown>;
}

export default function ImportResumePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<ImportStep>("upload");
  const [activeTab, setActiveTab] = useState("pdf");
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [importedData, setImportedData] = useState<ImportedData | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>("US");
  const [isCreating, setIsCreating] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        const expectedType = activeTab === "pdf" ? "application/pdf" : "application/json";
        const expectedExt = activeTab === "pdf" ? ".pdf" : ".json";

        if (file.type === expectedType || file.name.endsWith(expectedExt)) {
          setSelectedFile(file);
          setError(null);
        } else {
          setError(`Please upload a ${expectedExt.toUpperCase()} file`);
        }
      }
    },
    [activeTab]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        setSelectedFile(files[0]);
        setError(null);
      }
    },
    []
  );

  const simulateProgress = useCallback(() => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return prev;
        }
        return prev + Math.random() * 15;
      });
    }, 200);
    return interval;
  }, []);

  const handleImport = async () => {
    setStep("processing");
    const progressInterval = simulateProgress();

    try {
      const formData = new FormData();

      if (activeTab === "linkedin") {
        formData.append("linkedinUrl", linkedinUrl);
        formData.append("type", "linkedin");
      } else if (selectedFile) {
        formData.append("file", selectedFile);
        formData.append("type", activeTab);
      }

      const res = await fetch("/api/resumes/import", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (res.ok) {
        const data = await res.json();
        setImportedData(data);
        setTimeout(() => setStep("configure"), 500);
      } else {
        const errorData = await res.json();
        setError(errorData.error || "Failed to import resume");
        setStep("error");
      }
    } catch (err) {
      clearInterval(progressInterval);
      setError("Something went wrong during import");
      setStep("error");
    }
  };

  const handleCreate = async () => {
    if (!importedData) return;

    setIsCreating(true);
    try {
      const res = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: importedData.title || "Imported Resume",
          region: selectedRegion,
          canvasData: importedData.content,
        }),
      });

      if (res.ok) {
        const resume = await res.json();
        router.push(`/resumes/${resume.id}/edit`);
      } else {
        const error = await res.json();
        setError(error.error || "Failed to create resume");
        setStep("error");
      }
    } catch (err) {
      setError("Something went wrong");
      setStep("error");
    } finally {
      setIsCreating(false);
    }
  };

  const resetImport = () => {
    setStep("upload");
    setSelectedFile(null);
    setLinkedinUrl("");
    setProgress(0);
    setError(null);
    setImportedData(null);
  };

  const canImport =
    (activeTab === "linkedin" && linkedinUrl.includes("linkedin.com")) ||
    ((activeTab === "pdf" || activeTab === "json") && selectedFile);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/resumes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Import Resume</h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Import your existing resume from various sources
          </p>
        </div>
      </div>

      {/* Upload Step */}
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Choose Import Method
            </CardTitle>
            <CardDescription>
              Upload a file or connect your LinkedIn profile
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="pdf" className="gap-2">
                  <FileText className="h-4 w-4" />
                  PDF
                </TabsTrigger>
                <TabsTrigger value="json" className="gap-2">
                  <FileJson className="h-4 w-4" />
                  JSON
                </TabsTrigger>
                <TabsTrigger value="linkedin" className="gap-2">
                  <Linkedin className="h-4 w-4" />
                  LinkedIn
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pdf" className="mt-6">
                <DropZone
                  isDragging={isDragging}
                  selectedFile={selectedFile}
                  accept=".pdf"
                  acceptLabel="PDF"
                  icon={<FileText className="h-10 w-10" />}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onFileSelect={handleFileSelect}
                  onClear={() => setSelectedFile(null)}
                  fileInputRef={fileInputRef}
                />
              </TabsContent>

              <TabsContent value="json" className="mt-6">
                <DropZone
                  isDragging={isDragging}
                  selectedFile={selectedFile}
                  accept=".json"
                  acceptLabel="JSON"
                  icon={<FileJson className="h-10 w-10" />}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onFileSelect={handleFileSelect}
                  onClear={() => setSelectedFile(null)}
                  fileInputRef={fileInputRef}
                />
              </TabsContent>

              <TabsContent value="linkedin" className="mt-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="linkedin">LinkedIn Profile URL</Label>
                    <Input
                      id="linkedin"
                      placeholder="https://linkedin.com/in/your-profile"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    We&apos;ll extract your professional information from your
                    public LinkedIn profile.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleImport}
                disabled={!canImport}
                className="flex-1"
              >
                Import Resume
              </Button>
              <Button variant="outline" asChild>
                <Link href="/resumes/new">Create from Scratch</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing Step */}
      {step === "processing" && (
        <Card>
          <CardContent className="flex flex-col items-center py-16">
            <div className="relative mb-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                <Loader2 className="h-10 w-10 animate-spin text-zinc-600 dark:text-zinc-400" />
              </div>
              <svg
                className="absolute inset-0 h-20 w-20 -rotate-90"
                viewBox="0 0 80 80"
              >
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="text-zinc-200 dark:text-zinc-700"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  className="text-zinc-900 transition-all duration-300 dark:text-zinc-100"
                  strokeDasharray={`${progress * 2.26} 226`}
                />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-semibold">Processing your resume</h2>
            <p className="text-center text-zinc-500 dark:text-zinc-400">
              Extracting information and preparing your data...
            </p>
            <p className="mt-4 text-2xl font-bold tabular-nums">
              {Math.round(progress)}%
            </p>
          </CardContent>
        </Card>
      )}

      {/* Configure Step */}
      {step === "configure" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              Import Successful
            </CardTitle>
            <CardDescription>
              Configure your resume settings before editing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {importedData?.title && (
              <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Detected title
                </p>
                <p className="font-medium">{importedData.title}</p>
              </div>
            )}

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
                disabled={isCreating}
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
              <Button variant="outline" onClick={resetImport}>
                Start Over
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Step */}
      {step === "error" && (
        <Card>
          <CardContent className="flex flex-col items-center py-16">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50">
              <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="mb-2 text-xl font-semibold">Import Failed</h2>
            <p className="mb-6 text-center text-zinc-500 dark:text-zinc-400">
              {error || "Something went wrong during the import process."}
            </p>
            <div className="flex gap-3">
              <Button onClick={resetImport}>Try Again</Button>
              <Button variant="outline" asChild>
                <Link href="/resumes/new">Create from Scratch</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface DropZoneProps {
  isDragging: boolean;
  selectedFile: File | null;
  accept: string;
  acceptLabel: string;
  icon: React.ReactNode;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

function DropZone({
  isDragging,
  selectedFile,
  accept,
  acceptLabel,
  icon,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
  onClear,
  fileInputRef,
}: DropZoneProps) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all",
        isDragging
          ? "border-zinc-900 bg-zinc-100 dark:border-white dark:bg-zinc-800"
          : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600",
        selectedFile && "border-solid border-green-500 bg-green-50 dark:bg-green-950/30"
      )}
    >
      {selectedFile ? (
        <>
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <p className="mb-1 font-medium">{selectedFile.name}</p>
          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            {(selectedFile.size / 1024).toFixed(1)} KB
          </p>
          <Button variant="outline" size="sm" onClick={onClear}>
            <X className="mr-2 h-4 w-4" />
            Remove
          </Button>
        </>
      ) : (
        <>
          <div className="mb-4 text-zinc-400 dark:text-zinc-500">{icon}</div>
          <p className="mb-1 text-center font-medium">
            Drop your {acceptLabel} file here
          </p>
          <p className="mb-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
            or click to browse
          </p>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            Select File
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={onFileSelect}
            className="hidden"
          />
        </>
      )}
    </div>
  );
}
