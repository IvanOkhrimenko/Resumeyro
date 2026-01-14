"use client";

import { useState, memo, useCallback } from "react";
import { Plus, Sparkles, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DateRangePicker, YearRangePicker, YearPicker } from "./date-range-picker";
import { SkillsInput } from "./skills-input";
import { BulletTextarea } from "./bullet-textarea";

// Types
export interface ExperienceFormData {
  jobTitle: string;
  company: string;
  dates: string;
  description: string;
}

export interface EducationFormData {
  degree: string;
  institution: string;
  dates: string;
}

export interface SkillsFormData {
  category: string;
  skills: string;
}

export interface ContactFormData {
  email: string;
  phone: string;
  location: string;
  linkedIn: string;
  gitHub: string;
  website: string;
}

export interface SummaryFormData {
  text: string;
  instruction: string;
}

export interface CertificationFormData {
  name: string;
  issuer: string;
  date: string;
}

export interface ProjectFormData {
  name: string;
  description: string;
  url: string;
}

// Props interfaces
interface BaseFormProps {
  exists: boolean;
  onSubmit: (data: any) => void;
}

// Experience Form
export const ExperienceForm = memo(function ExperienceForm({
  exists,
  onSubmit
}: BaseFormProps) {
  const [form, setForm] = useState<ExperienceFormData>({
    jobTitle: "",
    company: "",
    dates: "",
    description: "",
  });

  const handleSubmit = useCallback(() => {
    if (!form.jobTitle.trim()) return;
    onSubmit(form);
    setForm({ jobTitle: "", company: "", dates: "", description: "" });
  }, [form, onSubmit]);

  return (
    <div className="space-y-3 p-3 pt-2">
      <div>
        <Label className="text-xs text-zinc-500">Job Title *</Label>
        <Input
          value={form.jobTitle}
          onChange={(e) => setForm(prev => ({ ...prev, jobTitle: e.target.value }))}
          placeholder="Software Engineer"
          className="mt-1 h-8 text-sm"
        />
      </div>
      <div>
        <Label className="text-xs text-zinc-500">Company</Label>
        <Input
          value={form.company}
          onChange={(e) => setForm(prev => ({ ...prev, company: e.target.value }))}
          placeholder="Google"
          className="mt-1 h-8 text-sm"
        />
      </div>
      <div>
        <Label className="text-xs text-zinc-500">Dates</Label>
        <div className="mt-1">
          <DateRangePicker
            value={form.dates}
            onChange={(dates) => setForm(prev => ({ ...prev, dates }))}
          />
        </div>
      </div>
      <div>
        <Label className="text-xs text-zinc-500">Achievements</Label>
        <div className="mt-1">
          <BulletTextarea
            value={form.description}
            onChange={(description) => setForm(prev => ({ ...prev, description }))}
            placeholder="• Key achievement or responsibility"
            rows={3}
          />
        </div>
      </div>
      <Button
        onClick={handleSubmit}
        disabled={!form.jobTitle.trim()}
        size="sm"
        className="w-full"
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        {exists ? "Add Entry" : "Add Section"}
      </Button>
    </div>
  );
});

// Education Form
export const EducationForm = memo(function EducationForm({
  exists,
  onSubmit
}: BaseFormProps) {
  const [form, setForm] = useState<EducationFormData>({
    degree: "",
    institution: "",
    dates: "",
  });

  const handleSubmit = useCallback(() => {
    if (!form.degree.trim()) return;
    onSubmit(form);
    setForm({ degree: "", institution: "", dates: "" });
  }, [form, onSubmit]);

  return (
    <div className="space-y-3 p-3 pt-2">
      <div>
        <Label className="text-xs text-zinc-500">Degree *</Label>
        <Input
          value={form.degree}
          onChange={(e) => setForm(prev => ({ ...prev, degree: e.target.value }))}
          placeholder="Bachelor of Science in CS"
          className="mt-1 h-8 text-sm"
        />
      </div>
      <div>
        <Label className="text-xs text-zinc-500">Institution</Label>
        <Input
          value={form.institution}
          onChange={(e) => setForm(prev => ({ ...prev, institution: e.target.value }))}
          placeholder="Stanford University"
          className="mt-1 h-8 text-sm"
        />
      </div>
      <div>
        <Label className="text-xs text-zinc-500">Years</Label>
        <div className="mt-1">
          <YearRangePicker
            value={form.dates}
            onChange={(dates) => setForm(prev => ({ ...prev, dates }))}
          />
        </div>
      </div>
      <Button
        onClick={handleSubmit}
        disabled={!form.degree.trim()}
        size="sm"
        className="w-full"
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        {exists ? "Add Entry" : "Add Section"}
      </Button>
    </div>
  );
});

// Skills Form
export const SkillsForm = memo(function SkillsForm({
  exists,
  onSubmit
}: BaseFormProps) {
  const [form, setForm] = useState<SkillsFormData>({
    category: "",
    skills: "",
  });

  const handleSubmit = useCallback(() => {
    if (!form.skills.trim()) return;
    onSubmit(form);
    setForm({ category: "", skills: "" });
  }, [form, onSubmit]);

  return (
    <div className="space-y-3 p-3 pt-2">
      <div>
        <Label className="text-xs text-zinc-500">Category (optional)</Label>
        <Input
          value={form.category}
          onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
          placeholder="Programming Languages"
          className="mt-1 h-8 text-sm"
        />
      </div>
      <div>
        <Label className="text-xs text-zinc-500">Skills *</Label>
        <div className="mt-1">
          <SkillsInput
            value={form.skills}
            onChange={(skills) => setForm(prev => ({ ...prev, skills }))}
            placeholder="Type skill and press Enter"
          />
        </div>
      </div>
      <Button
        onClick={handleSubmit}
        disabled={!form.skills.trim()}
        size="sm"
        className="w-full"
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        {exists ? "Add Entry" : "Add Section"}
      </Button>
    </div>
  );
});

// Contact Form
export const ContactForm = memo(function ContactForm({
  exists,
  onSubmit
}: BaseFormProps) {
  const [form, setForm] = useState<ContactFormData>({
    email: "",
    phone: "",
    location: "",
    linkedIn: "",
    gitHub: "",
    website: "",
  });

  const handleSubmit = useCallback(() => {
    if (!form.email.trim() && !form.phone.trim()) return;
    onSubmit(form);
    setForm({ email: "", phone: "", location: "", linkedIn: "", gitHub: "", website: "" });
  }, [form, onSubmit]);

  return (
    <div className="space-y-3 p-3 pt-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs text-zinc-500">Email</Label>
          <Input
            value={form.email}
            onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
            placeholder="email@example.com"
            className="mt-1 h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-zinc-500">Phone</Label>
          <Input
            value={form.phone}
            onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="+1 555 123 4567"
            className="mt-1 h-8 text-sm"
          />
        </div>
      </div>
      <div>
        <Label className="text-xs text-zinc-500">Location</Label>
        <Input
          value={form.location}
          onChange={(e) => setForm(prev => ({ ...prev, location: e.target.value }))}
          placeholder="San Francisco, CA"
          className="mt-1 h-8 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs text-zinc-500">LinkedIn</Label>
          <Input
            value={form.linkedIn}
            onChange={(e) => setForm(prev => ({ ...prev, linkedIn: e.target.value }))}
            placeholder="linkedin.com/in/..."
            className="mt-1 h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-zinc-500">GitHub</Label>
          <Input
            value={form.gitHub}
            onChange={(e) => setForm(prev => ({ ...prev, gitHub: e.target.value }))}
            placeholder="github.com/..."
            className="mt-1 h-8 text-sm"
          />
        </div>
      </div>
      <div>
        <Label className="text-xs text-zinc-500">Website</Label>
        <Input
          value={form.website}
          onChange={(e) => setForm(prev => ({ ...prev, website: e.target.value }))}
          placeholder="www.yoursite.com"
          className="mt-1 h-8 text-sm"
        />
      </div>
      <Button
        onClick={handleSubmit}
        disabled={!form.email.trim() && !form.phone.trim()}
        size="sm"
        className="w-full"
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        {exists ? "Add Entry" : "Add Section"}
      </Button>
    </div>
  );
});

// Summary Form Props
interface SummaryFormProps extends BaseFormProps {
  onGenerateAI: (instruction: string) => Promise<string | null>;
  extractCanvasContext: () => string;
}

export const SummaryForm = memo(function SummaryForm({
  exists,
  onSubmit,
  onGenerateAI,
  extractCanvasContext,
}: SummaryFormProps) {
  const [form, setForm] = useState<SummaryFormData>({ text: "", instruction: "" });
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleSubmit = useCallback(() => {
    if (!form.text.trim()) return;
    onSubmit(form);
    setForm({ text: "", instruction: "" });
  }, [form, onSubmit]);

  const handleGenerateAI = useCallback(async () => {
    setIsGenerating(true);
    setAiError(null);

    try {
      const canvasContext = extractCanvasContext();
      const userInstruction = form.instruction.trim();

      let fullContext = "";
      if (userInstruction) {
        fullContext += `User instructions: ${userInstruction}\n\n`;
      }
      if (canvasContext) {
        fullContext += `Resume content:\n${canvasContext}`;
      }

      if (!fullContext.trim()) {
        setAiError("Please enter some information about yourself or add content to your resume first.");
        return;
      }

      const result = await onGenerateAI(fullContext);
      if (result) {
        setForm(prev => ({ ...prev, text: result }));
      } else {
        setAiError("Failed to generate summary. Please try again.");
      }
    } catch {
      setAiError("Failed to generate summary. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [form.instruction, onGenerateAI, extractCanvasContext]);

  return (
    <div className="space-y-3 p-3 pt-2">
      {/* AI Generation Section */}
      <div className={`rounded-lg border p-2.5 ${aiError ? 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/20' : 'border-violet-200 bg-violet-50/50 dark:border-violet-800 dark:bg-violet-900/20'}`}>
        <div className="mb-2 flex items-center gap-1.5">
          <Sparkles className={`h-3.5 w-3.5 ${aiError ? 'text-red-500' : 'text-violet-500'}`} />
          <span className={`text-xs font-medium ${aiError ? 'text-red-700 dark:text-red-300' : 'text-violet-700 dark:text-violet-300'}`}>AI Generation</span>
        </div>
        <textarea
          value={form.instruction}
          onChange={(e) => {
            setForm(prev => ({ ...prev, instruction: e.target.value }));
            if (aiError) setAiError(null);
          }}
          placeholder="Example: 5 years React developer, looking for Senior Frontend role at a startup"
          className={`w-full rounded-md border bg-white px-2.5 py-1.5 text-xs text-zinc-700 placeholder:text-zinc-400 focus:outline-none dark:bg-zinc-800 dark:text-zinc-300 ${aiError ? 'border-red-200 focus:border-red-400 dark:border-red-700' : 'border-violet-200 focus:border-violet-400 dark:border-violet-700'}`}
          rows={2}
        />
        {aiError && (
          <p className="mt-1.5 text-[10px] text-red-600 dark:text-red-400">
            {aiError}
          </p>
        )}
        <button
          type="button"
          onClick={handleGenerateAI}
          disabled={isGenerating}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md bg-gradient-to-r from-violet-500 to-purple-500 px-3 py-1.5 text-xs font-medium text-white transition-all hover:from-violet-600 hover:to-purple-600 disabled:opacity-50"
        >
          {isGenerating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {isGenerating ? "Generating..." : "Generate Summary"}
        </button>
        {!aiError && (
          <p className="mt-1.5 text-center text-[10px] text-violet-600/70 dark:text-violet-400/70">
            Also uses content from your resume
          </p>
        )}
      </div>

      {/* Manual Entry Section */}
      <div>
        <Label className="text-xs text-zinc-500">Or write manually</Label>
        <textarea
          value={form.text}
          onChange={(e) => setForm(prev => ({ ...prev, text: e.target.value }))}
          placeholder="A brief summary of your professional background..."
          className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
          rows={4}
        />
      </div>
      <Button
        onClick={handleSubmit}
        disabled={!form.text.trim()}
        size="sm"
        className="w-full"
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        {exists ? "Update Summary" : "Add Summary"}
      </Button>
    </div>
  );
});

// Certification Form
export const CertificationForm = memo(function CertificationForm({
  exists,
  onSubmit
}: BaseFormProps) {
  const [form, setForm] = useState<CertificationFormData>({
    name: "",
    issuer: "",
    date: "",
  });

  const handleSubmit = useCallback(() => {
    if (!form.name.trim()) return;
    onSubmit(form);
    setForm({ name: "", issuer: "", date: "" });
  }, [form, onSubmit]);

  return (
    <div className="space-y-3 p-3 pt-2">
      <div>
        <Label className="text-xs text-zinc-500">Certification Name *</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
          placeholder="AWS Solutions Architect"
          className="mt-1 h-8 text-sm"
        />
      </div>
      <div>
        <Label className="text-xs text-zinc-500">Issuer</Label>
        <Input
          value={form.issuer}
          onChange={(e) => setForm(prev => ({ ...prev, issuer: e.target.value }))}
          placeholder="Amazon Web Services"
          className="mt-1 h-8 text-sm"
        />
      </div>
      <div>
        <Label className="text-xs text-zinc-500">Year</Label>
        <div className="mt-1">
          <YearPicker
            value={form.date}
            onChange={(date) => setForm(prev => ({ ...prev, date }))}
            placeholder="Select year"
          />
        </div>
      </div>
      <Button
        onClick={handleSubmit}
        disabled={!form.name.trim()}
        size="sm"
        className="w-full"
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        {exists ? "Add Entry" : "Add Section"}
      </Button>
    </div>
  );
});

// Project Form
export const ProjectForm = memo(function ProjectForm({
  exists,
  onSubmit
}: BaseFormProps) {
  const [form, setForm] = useState<ProjectFormData>({
    name: "",
    description: "",
    url: "",
  });

  const handleSubmit = useCallback(() => {
    if (!form.name.trim()) return;
    onSubmit(form);
    setForm({ name: "", description: "", url: "" });
  }, [form, onSubmit]);

  return (
    <div className="space-y-3 p-3 pt-2">
      <div>
        <Label className="text-xs text-zinc-500">Project Name *</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
          placeholder="E-commerce Platform"
          className="mt-1 h-8 text-sm"
        />
      </div>
      <div>
        <Label className="text-xs text-zinc-500">Description</Label>
        <div className="mt-1">
          <BulletTextarea
            value={form.description}
            onChange={(description) => setForm(prev => ({ ...prev, description }))}
            placeholder="• Built a full-stack platform..."
            rows={2}
          />
        </div>
      </div>
      <div>
        <Label className="text-xs text-zinc-500">URL</Label>
        <Input
          value={form.url}
          onChange={(e) => setForm(prev => ({ ...prev, url: e.target.value }))}
          placeholder="github.com/username/project"
          className="mt-1 h-8 text-sm"
        />
      </div>
      <Button
        onClick={handleSubmit}
        disabled={!form.name.trim()}
        size="sm"
        className="w-full"
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        {exists ? "Add Entry" : "Add Section"}
      </Button>
    </div>
  );
});
