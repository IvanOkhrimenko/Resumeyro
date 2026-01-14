"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles, Copy, Check, FileText, Briefcase, GraduationCap, Target } from "lucide-react";

type GenerationType = "summary" | "experience" | "skills" | "education" | "cover_letter";

const generationTypes: { id: GenerationType; name: string; icon: React.ElementType; description: string }[] = [
  { id: "summary", name: "Summary", icon: FileText, description: "Professional summary for your resume" },
  { id: "experience", name: "Experience", icon: Briefcase, description: "Work experience bullet points" },
  { id: "skills", name: "Skills", icon: Target, description: "Relevant skills for your role" },
  { id: "education", name: "Education", icon: GraduationCap, description: "Education section description" },
];

export default function AIPage() {
  const [activeType, setActiveType] = useState<GenerationType>("summary");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [formData, setFormData] = useState({
    jobTitle: "",
    industry: "",
    yearsOfExperience: "",
    skills: "",
    targetRole: "",
    company: "",
    responsibilities: "",
    achievements: "",
    currentSkills: "",
    degree: "",
    major: "",
    university: "",
    graduationYear: "",
    gpa: "",
    coursework: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);
    setResult("");

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: activeType,
          variables: formData,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to generate text");
        return;
      }

      setResult(data.text);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Assistant</h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          Generate professional resume content with AI
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Generate Content
            </CardTitle>
            <CardDescription>
              Fill in the details and let AI create professional content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeType} onValueChange={(v) => setActiveType(v as GenerationType)}>
              <TabsList className="grid w-full grid-cols-4">
                {generationTypes.map((type) => (
                  <TabsTrigger key={type.id} value={type.id}>
                    <type.icon className="mr-2 h-4 w-4 hidden sm:block" />
                    {type.name}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="summary" className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Current/Target Job Title</Label>
                  <Input
                    id="jobTitle"
                    placeholder="e.g., Senior Software Engineer"
                    value={formData.jobTitle}
                    onChange={(e) => handleInputChange("jobTitle", e.target.value)}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    <Input
                      id="industry"
                      placeholder="e.g., Technology"
                      value={formData.industry}
                      onChange={(e) => handleInputChange("industry", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="yearsOfExperience">Years of Experience</Label>
                    <Input
                      id="yearsOfExperience"
                      placeholder="e.g., 5"
                      value={formData.yearsOfExperience}
                      onChange={(e) => handleInputChange("yearsOfExperience", e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="skills">Key Skills</Label>
                  <Input
                    id="skills"
                    placeholder="e.g., React, Node.js, AWS"
                    value={formData.skills}
                    onChange={(e) => handleInputChange("skills", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetRole">Target Role</Label>
                  <Input
                    id="targetRole"
                    placeholder="e.g., Tech Lead"
                    value={formData.targetRole}
                    onChange={(e) => handleInputChange("targetRole", e.target.value)}
                  />
                </div>
              </TabsContent>

              <TabsContent value="experience" className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="expJobTitle">Job Title</Label>
                    <Input
                      id="expJobTitle"
                      placeholder="e.g., Software Engineer"
                      value={formData.jobTitle}
                      onChange={(e) => handleInputChange("jobTitle", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      placeholder="e.g., Google"
                      value={formData.company}
                      onChange={(e) => handleInputChange("company", e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expIndustry">Industry</Label>
                  <Input
                    id="expIndustry"
                    placeholder="e.g., Technology"
                    value={formData.industry}
                    onChange={(e) => handleInputChange("industry", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="responsibilities">Key Responsibilities</Label>
                  <Textarea
                    id="responsibilities"
                    placeholder="Describe your main responsibilities..."
                    value={formData.responsibilities}
                    onChange={(e) => handleInputChange("responsibilities", e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="achievements">Notable Achievements</Label>
                  <Textarea
                    id="achievements"
                    placeholder="Any measurable achievements..."
                    value={formData.achievements}
                    onChange={(e) => handleInputChange("achievements", e.target.value)}
                    rows={3}
                  />
                </div>
              </TabsContent>

              <TabsContent value="skills" className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="skillsJobTitle">Job Title</Label>
                  <Input
                    id="skillsJobTitle"
                    placeholder="e.g., Product Manager"
                    value={formData.jobTitle}
                    onChange={(e) => handleInputChange("jobTitle", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="skillsIndustry">Industry</Label>
                  <Input
                    id="skillsIndustry"
                    placeholder="e.g., Fintech"
                    value={formData.industry}
                    onChange={(e) => handleInputChange("industry", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="skillsTargetRole">Target Role</Label>
                  <Input
                    id="skillsTargetRole"
                    placeholder="e.g., Senior Product Manager"
                    value={formData.targetRole}
                    onChange={(e) => handleInputChange("targetRole", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentSkills">Current Skills (optional)</Label>
                  <Textarea
                    id="currentSkills"
                    placeholder="Skills you already have..."
                    value={formData.currentSkills}
                    onChange={(e) => handleInputChange("currentSkills", e.target.value)}
                    rows={3}
                  />
                </div>
              </TabsContent>

              <TabsContent value="education" className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="degree">Degree</Label>
                    <Input
                      id="degree"
                      placeholder="e.g., Bachelor of Science"
                      value={formData.degree}
                      onChange={(e) => handleInputChange("degree", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="major">Major</Label>
                    <Input
                      id="major"
                      placeholder="e.g., Computer Science"
                      value={formData.major}
                      onChange={(e) => handleInputChange("major", e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="university">University</Label>
                  <Input
                    id="university"
                    placeholder="e.g., MIT"
                    value={formData.university}
                    onChange={(e) => handleInputChange("university", e.target.value)}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="graduationYear">Graduation Year</Label>
                    <Input
                      id="graduationYear"
                      placeholder="e.g., 2020"
                      value={formData.graduationYear}
                      onChange={(e) => handleInputChange("graduationYear", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gpa">GPA (optional)</Label>
                    <Input
                      id="gpa"
                      placeholder="e.g., 3.8"
                      value={formData.gpa}
                      onChange={(e) => handleInputChange("gpa", e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="coursework">Relevant Coursework (optional)</Label>
                  <Input
                    id="coursework"
                    placeholder="e.g., Machine Learning, Data Structures"
                    value={formData.coursework}
                    onChange={(e) => handleInputChange("coursework", e.target.value)}
                  />
                </div>
              </TabsContent>
            </Tabs>

            {error && (
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="mt-6 w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate with AI
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generated Content</CardTitle>
            <CardDescription>
              Copy the generated text and use it in your resume
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900">
                  <p className="whitespace-pre-wrap text-sm">{result}</p>
                </div>
                <Button
                  variant="outline"
                  onClick={copyToClipboard}
                  className="w-full"
                >
                  {copied ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy to Clipboard
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center text-center">
                <Sparkles className="mb-4 h-12 w-12 text-zinc-300 dark:text-zinc-600" />
                <p className="text-zinc-500 dark:text-zinc-400">
                  Fill in the form and click "Generate" to create professional content
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Free plan includes 3 AI generations per month. Upgrade to Pro for 50 generations or Premium for unlimited.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
