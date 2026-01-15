"use client";

import { useState, useEffect } from "react";
import {
  CreditCard,
  Loader2,
  AlertTriangle,
  Save,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Check,
  X,
  DollarSign,
  Cpu,
  Settings2,
  Users,
  FileText,
  Zap,
  Crown,
  Infinity,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface AvailableModel {
  id: string;
  name: string;
  provider: string;
  tier: string;
}

interface PlanConfig {
  id: string;
  key: string;
  name: string;
  nameUk: string | null;
  description: string | null;
  descriptionUk: string | null;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  stripePriceIdMonthly: string | null;
  stripePriceIdYearly: string | null;
  maxResumes: number;
  aiGenerationsPerMonth: number;
  aiReviewsPerMonth: number;
  multiModelReview: boolean;
  pdfWatermark: boolean;
  prioritySupport: boolean;
  allowedModels: string[];
  taskModelOverrides: Record<string, { provider: string; modelId: string }>;
  isActive: boolean;
  sortOrder: number;
}

const AI_TASK_TYPES = [
  { key: "RESUME_PARSING", name: "Resume Parsing" },
  { key: "RESUME_GENERATION", name: "Resume Generation" },
  { key: "TEXT_IMPROVEMENT", name: "Text Improvement" },
  { key: "RESUME_REVIEW", name: "Resume Review" },
  { key: "STYLE_FORMATTING", name: "Style Formatting" },
  { key: "TRANSLATION", name: "Translation" },
];

const tierColors: Record<string, string> = {
  fast: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  quality: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  premium: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  reasoning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export default function PlansPage() {
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [showNewPlanForm, setShowNewPlanForm] = useState(false);
  const [newPlan, setNewPlan] = useState({
    key: "",
    name: "",
    nameUk: "",
    priceMonthly: 0,
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  function showSuccess(message: string) {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  }

  async function fetchPlans() {
    try {
      const res = await fetch("/api/admin/plans");
      if (res.status === 403) {
        setError("Admin access required");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setPlans(data.plans || []);
      setAvailableModels(data.availableModels || []);
    } catch {
      setError("Failed to load plans");
    } finally {
      setIsLoading(false);
    }
  }

  async function savePlan(plan: PlanConfig) {
    setSavingKey(plan.key);
    try {
      const res = await fetch("/api/admin/plans", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(plan),
      });
      if (!res.ok) throw new Error("Failed to save");
      showSuccess(`${plan.name} updated`);
      await fetchPlans();
    } catch {
      setError("Failed to save plan");
    } finally {
      setSavingKey(null);
    }
  }

  async function createNewPlan() {
    if (!newPlan.key || !newPlan.name) {
      setError("Key and name are required");
      return;
    }
    setSavingKey("new");
    try {
      const res = await fetch("/api/admin/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: newPlan.key.toUpperCase().replace(/\s+/g, "_"),
          name: newPlan.name,
          nameUk: newPlan.nameUk || null,
          priceMonthly: newPlan.priceMonthly,
          priceYearly: newPlan.priceMonthly * 10,
          allowedModels: [],
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create");
      }
      showSuccess(`${newPlan.name} created`);
      setShowNewPlanForm(false);
      setNewPlan({ key: "", name: "", nameUk: "", priceMonthly: 0 });
      await fetchPlans();
    } catch (err: any) {
      setError(err.message || "Failed to create plan");
    } finally {
      setSavingKey(null);
    }
  }

  async function seedDefaults() {
    setSavingKey("seed");
    try {
      const res = await fetch("/api/admin/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed" }),
      });
      if (!res.ok) throw new Error("Failed to seed");
      showSuccess("Default plans created");
      await fetchPlans();
    } catch {
      setError("Failed to seed defaults");
    } finally {
      setSavingKey(null);
    }
  }

  function updatePlanField(key: string, field: string, value: any) {
    setPlans((prev) =>
      prev.map((p) => (p.key === key ? { ...p, [field]: value } : p))
    );
  }

  function toggleModel(planKey: string, modelId: string) {
    setPlans((prev) =>
      prev.map((p) => {
        if (p.key !== planKey) return p;
        const hasModel = p.allowedModels.includes(modelId);
        return {
          ...p,
          allowedModels: hasModel
            ? p.allowedModels.filter((m) => m !== modelId)
            : [...p.allowedModels, modelId],
        };
      })
    );
  }

  function formatLimit(value: number): string {
    return value === -1 ? "Unlimited" : value.toString();
  }

  function updateTaskModelOverride(
    planKey: string,
    taskType: string,
    modelId: string | null
  ) {
    setPlans((prev) =>
      prev.map((p) => {
        if (p.key !== planKey) return p;

        const newOverrides = { ...p.taskModelOverrides };

        if (modelId === null || modelId === "") {
          // Remove override - use global default
          delete newOverrides[taskType];
        } else {
          // Find the model to get provider
          const model = availableModels.find((m) => m.id === modelId);
          if (model) {
            newOverrides[taskType] = {
              provider: model.provider,
              modelId: model.id,
            };
          }
        }

        return { ...p, taskModelOverrides: newOverrides };
      })
    );
  }

  function getModelNameById(modelId: string): string {
    const model = availableModels.find((m) => m.id === modelId);
    return model?.name || modelId;
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20">
        <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
        <h2 className="mt-2 text-lg font-semibold text-red-700 dark:text-red-400">
          {error}
        </h2>
        <Button className="mt-4" onClick={() => { setError(null); fetchPlans(); }}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Toast */}
      {successMessage && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-white shadow-lg">
          <Check className="h-4 w-4" />
          {successMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30">
            <CreditCard className="h-6 w-6 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
              Subscription Plans
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Configure pricing, limits, and AI model access
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {plans.length === 0 && (
            <Button
              variant="outline"
              onClick={seedDefaults}
              disabled={savingKey === "seed"}
              className="gap-2"
            >
              {savingKey === "seed" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Seed Defaults
            </Button>
          )}
          <Button onClick={() => setShowNewPlanForm(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Plan
          </Button>
        </div>
      </div>

      {/* New Plan Form */}
      {showNewPlanForm && (
        <div className="rounded-lg border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-900/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-violet-800 dark:text-violet-200">
              Create New Plan
            </h3>
            <button
              onClick={() => setShowNewPlanForm(false)}
              className="p-1 hover:bg-violet-200 dark:hover:bg-violet-800 rounded"
            >
              <X className="h-4 w-4 text-violet-600" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label className="text-xs">Key (unique)</Label>
              <Input
                value={newPlan.key}
                onChange={(e) => setNewPlan({ ...newPlan, key: e.target.value })}
                placeholder="BUSINESS"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Name</Label>
              <Input
                value={newPlan.name}
                onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                placeholder="Business"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Name (UK)</Label>
              <Input
                value={newPlan.nameUk}
                onChange={(e) => setNewPlan({ ...newPlan, nameUk: e.target.value })}
                placeholder="Бізнес"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Monthly Price ($)</Label>
              <Input
                type="number"
                value={newPlan.priceMonthly}
                onChange={(e) => setNewPlan({ ...newPlan, priceMonthly: parseFloat(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={createNewPlan} disabled={savingKey === "new"} className="gap-2">
              {savingKey === "new" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create Plan
            </Button>
          </div>
        </div>
      )}

      {/* Plan Cards */}
      <div className="grid gap-4">
        {plans.map((plan) => {
          const isExpanded = expandedPlan === plan.key;
          const isSaving = savingKey === plan.key;
          const isDefault = ["FREE", "PRO", "PREMIUM"].includes(plan.key);

          return (
            <div
              key={plan.key}
              className={cn(
                "rounded-lg border bg-white transition-all dark:bg-zinc-800",
                plan.isActive
                  ? "border-zinc-200 dark:border-zinc-700"
                  : "border-zinc-100 dark:border-zinc-800 opacity-60"
              )}
            >
              {/* Plan Header */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer"
                onClick={() => setExpandedPlan(isExpanded ? null : plan.key)}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-xl",
                    plan.key === "FREE" && "bg-zinc-100 dark:bg-zinc-700",
                    plan.key === "PRO" && "bg-blue-100 dark:bg-blue-900/30",
                    plan.key === "PREMIUM" && "bg-amber-100 dark:bg-amber-900/30",
                    !isDefault && "bg-violet-100 dark:bg-violet-900/30"
                  )}>
                    {plan.key === "FREE" && <Users className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />}
                    {plan.key === "PRO" && <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />}
                    {plan.key === "PREMIUM" && <Crown className="h-6 w-6 text-amber-600 dark:text-amber-400" />}
                    {!isDefault && <CreditCard className="h-6 w-6 text-violet-600 dark:text-violet-400" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-zinc-900 dark:text-white">
                        {plan.name}
                      </h3>
                      {!plan.isActive && (
                        <span className="text-xs bg-zinc-200 dark:bg-zinc-600 px-2 py-0.5 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-500">{plan.nameUk}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Quick Stats */}
                  <div className="hidden md:flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-semibold text-zinc-900 dark:text-white">
                        ${plan.priceMonthly}/mo
                      </div>
                      <div className="text-xs text-zinc-500">Price</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-zinc-900 dark:text-white">
                        {formatLimit(plan.maxResumes)}
                      </div>
                      <div className="text-xs text-zinc-500">Resumes</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-zinc-900 dark:text-white">
                        {formatLimit(plan.aiGenerationsPerMonth)}
                      </div>
                      <div className="text-xs text-zinc-500">AI Gens</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-zinc-900 dark:text-white">
                        {plan.allowedModels.length}
                      </div>
                      <div className="text-xs text-zinc-500">Models</div>
                    </div>
                  </div>

                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-zinc-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-zinc-400" />
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-zinc-100 dark:border-zinc-700 p-4 space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-xs text-zinc-500">Name</Label>
                      <Input
                        value={plan.name}
                        onChange={(e) => updatePlanField(plan.key, "name", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-zinc-500">Name (UK)</Label>
                      <Input
                        value={plan.nameUk || ""}
                        onChange={(e) => updatePlanField(plan.key, "nameUk", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-zinc-500">Description</Label>
                      <Input
                        value={plan.description || ""}
                        onChange={(e) => updatePlanField(plan.key, "description", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <Label className="text-xs text-zinc-500">Active</Label>
                        <button
                          onClick={() => updatePlanField(plan.key, "isActive", !plan.isActive)}
                          className={cn(
                            "mt-1 w-full py-2 rounded-md text-sm font-medium transition-colors",
                            plan.isActive
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"
                          )}
                        >
                          {plan.isActive ? "Active" : "Inactive"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
                      <DollarSign className="h-4 w-4" />
                      Pricing
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-xs text-zinc-500">Monthly ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={plan.priceMonthly}
                          onChange={(e) => updatePlanField(plan.key, "priceMonthly", parseFloat(e.target.value) || 0)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-zinc-500">Yearly ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={plan.priceYearly}
                          onChange={(e) => updatePlanField(plan.key, "priceYearly", parseFloat(e.target.value) || 0)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-zinc-500">Stripe Monthly ID</Label>
                        <Input
                          value={plan.stripePriceIdMonthly || ""}
                          onChange={(e) => updatePlanField(plan.key, "stripePriceIdMonthly", e.target.value || null)}
                          placeholder="price_xxx"
                          className="mt-1 font-mono text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-zinc-500">Stripe Yearly ID</Label>
                        <Input
                          value={plan.stripePriceIdYearly || ""}
                          onChange={(e) => updatePlanField(plan.key, "stripePriceIdYearly", e.target.value || null)}
                          placeholder="price_xxx"
                          className="mt-1 font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Limits */}
                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
                      <Settings2 className="h-4 w-4" />
                      Limits
                      <span className="text-xs font-normal text-zinc-500">(-1 = unlimited)</span>
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs text-zinc-500">Max Resumes</Label>
                        <Input
                          type="number"
                          value={plan.maxResumes}
                          onChange={(e) => updatePlanField(plan.key, "maxResumes", parseInt(e.target.value) || 0)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-zinc-500">AI Generations / Month</Label>
                        <Input
                          type="number"
                          value={plan.aiGenerationsPerMonth}
                          onChange={(e) => updatePlanField(plan.key, "aiGenerationsPerMonth", parseInt(e.target.value) || 0)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-zinc-500">AI Reviews / Month</Label>
                        <Input
                          type="number"
                          value={plan.aiReviewsPerMonth}
                          onChange={(e) => updatePlanField(plan.key, "aiReviewsPerMonth", parseInt(e.target.value) || 0)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Features */}
                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
                      <FileText className="h-4 w-4" />
                      Features
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { key: "multiModelReview", label: "Multi-Model Review", labelUk: "Мульти-модельне рев'ю" },
                        { key: "pdfWatermark", label: "PDF Watermark", labelUk: "Водяний знак" },
                        { key: "prioritySupport", label: "Priority Support", labelUk: "Пріоритетна підтримка" },
                      ].map((feature) => {
                        const isEnabled = plan[feature.key as keyof PlanConfig] as boolean;
                        return (
                          <button
                            key={feature.key}
                            onClick={() => updatePlanField(plan.key, feature.key, !isEnabled)}
                            className={cn(
                              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                              isEnabled
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"
                            )}
                          >
                            {isEnabled ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                            {feature.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* AI Models */}
                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
                      <Cpu className="h-4 w-4" />
                      Allowed AI Models
                      <span className="text-xs font-normal text-zinc-500">
                        ({plan.allowedModels.length} selected)
                      </span>
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {availableModels.map((model) => {
                        const isAllowed = plan.allowedModels.includes(model.id);
                        return (
                          <button
                            key={model.id}
                            onClick={() => toggleModel(plan.key, model.id)}
                            className={cn(
                              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all text-left",
                              isAllowed
                                ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 ring-1 ring-violet-300 dark:ring-violet-700"
                                : "bg-zinc-50 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                            )}
                          >
                            <span className={cn("w-2 h-2 rounded-full", isAllowed ? "bg-violet-500" : "bg-zinc-300 dark:bg-zinc-600")} />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{model.name}</div>
                              <div className="flex items-center gap-1 text-xs opacity-75">
                                <span className="capitalize">{model.provider}</span>
                                <span className={cn("px-1 rounded text-[10px]", tierColors[model.tier] || "bg-zinc-100")}>
                                  {model.tier}
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const allIds = availableModels.map(m => m.id);
                          updatePlanField(plan.key, "allowedModels", allIds);
                        }}
                      >
                        Select All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updatePlanField(plan.key, "allowedModels", [])}
                      >
                        Clear All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const fastIds = availableModels.filter(m => m.tier === "fast").map(m => m.id);
                          updatePlanField(plan.key, "allowedModels", fastIds);
                        }}
                      >
                        Fast Only
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const ids = availableModels.filter(m => m.tier === "fast" || m.tier === "quality").map(m => m.id);
                          updatePlanField(plan.key, "allowedModels", ids);
                        }}
                      >
                        Fast + Quality
                      </Button>
                    </div>
                  </div>

                  {/* Task Model Overrides */}
                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
                      <Wand2 className="h-4 w-4" />
                      Task Model Overrides
                      <span className="text-xs font-normal text-zinc-500">
                        (override default model per task)
                      </span>
                    </h4>
                    <p className="text-xs text-zinc-500 mb-3">
                      Set specific models for each AI task type. Leave empty to use the global default.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {AI_TASK_TYPES.map((task) => {
                        const override = plan.taskModelOverrides[task.key];
                        const currentModelId = override?.modelId || "";

                        return (
                          <div
                            key={task.key}
                            className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-3 bg-zinc-50 dark:bg-zinc-800/50"
                          >
                            <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
                              {task.name}
                            </Label>
                            <select
                              value={currentModelId}
                              onChange={(e) => updateTaskModelOverride(plan.key, task.key, e.target.value || null)}
                              className={cn(
                                "w-full px-3 py-2 rounded-md text-sm border transition-colors",
                                "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700",
                                "focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent",
                                currentModelId
                                  ? "text-zinc-900 dark:text-zinc-100"
                                  : "text-zinc-500 dark:text-zinc-400"
                              )}
                            >
                              <option value="">Use global default</option>
                              {/* Group by provider */}
                              {["anthropic", "openai", "google"].map((provider) => {
                                const providerModels = availableModels.filter(
                                  (m) => m.provider === provider
                                );
                                if (providerModels.length === 0) return null;
                                return (
                                  <optgroup
                                    key={provider}
                                    label={provider.charAt(0).toUpperCase() + provider.slice(1)}
                                  >
                                    {providerModels.map((model) => (
                                      <option key={model.id} value={model.id}>
                                        {model.name} ({model.tier})
                                      </option>
                                    ))}
                                  </optgroup>
                                );
                              })}
                            </select>
                            {override && (
                              <div className="mt-1.5 flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400">
                                <Check className="h-3 w-3" />
                                <span>Custom: {getModelNameById(override.modelId)}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updatePlanField(plan.key, "taskModelOverrides", {})}
                        className="text-zinc-600"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Clear All Overrides
                      </Button>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-700">
                    {!isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={async () => {
                          if (confirm(`Delete plan "${plan.name}"?`)) {
                            const res = await fetch(`/api/admin/plans?key=${plan.key}`, {
                              method: "DELETE",
                            });
                            if (res.ok) {
                              showSuccess("Plan deleted");
                              await fetchPlans();
                            } else {
                              const data = await res.json();
                              setError(data.error || "Failed to delete");
                            }
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Plan
                      </Button>
                    )}
                    <div className="ml-auto">
                      <Button
                        onClick={() => savePlan(plan)}
                        disabled={isSaving}
                        className="gap-2"
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Save Changes
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {plans.length === 0 && (
        <div className="text-center py-12 text-zinc-500">
          <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No plans configured yet.</p>
          <p className="text-sm">Click "Seed Defaults" to create FREE, PRO, and PREMIUM plans.</p>
        </div>
      )}
    </div>
  );
}
