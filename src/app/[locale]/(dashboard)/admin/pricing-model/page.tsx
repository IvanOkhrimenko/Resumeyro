"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Cpu,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Calculator,
  Settings2,
  Save,
  Check,
  Layers,
  Sparkles,
  X,
  Plus,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

interface ModelPricing {
  inputPer1M: number;
  outputPer1M: number;
}

interface AvailableModel {
  id: string;
  name: string;
  provider: string;
  tier: string;
  bestFor?: string;
  strengths?: string[];
}

interface PlanConfig {
  key: string;
  name: string;
  priceMonthly: number;
  aiGenerationsPerMonth: number;
  aiReviewsPerMonth: number;
  multiModelReview: boolean;
  isActive: boolean;
  taskModelOverrides: Record<string, { provider: string; modelId: string }>;
}

// Multi-model review configuration
interface MultiModelConfig {
  provider: string;
  modelId: string;
  name?: string;
}

interface MultiModelReviewConfig {
  models: MultiModelConfig[];
  synthesisProvider: string;
  synthesisModelId: string;
  isEnabled: boolean;
  minModelsRequired: number;
}

// Token usage for multi-model review steps
const MULTI_MODEL_TOKEN_USAGE = {
  REVIEW_PROMPT: { input: 4000, output: 3000 }, // Each model reviews
  SYNTHESIS_PROMPT: { input: 8000, output: 2000 }, // Combine all reviews
  VERIFICATION_PROMPT: { input: 3000, output: 1500 }, // Verify suggestions
};

// Task types with metadata
const TASK_TYPES = {
  RESUME_PARSING: { name: "Resume Parsing", avgInput: 3000, avgOutput: 2000 },
  RESUME_GENERATION: { name: "Resume Generation", avgInput: 2000, avgOutput: 4000 },
  TEXT_IMPROVEMENT: { name: "Text Improvement", avgInput: 500, avgOutput: 800 },
  RESUME_REVIEW: { name: "Resume Review", avgInput: 4000, avgOutput: 3000 },
  STYLE_FORMATTING: { name: "Style Formatting", avgInput: 1000, avgOutput: 1500 },
};

// Fallback pricing if API fails (comprehensive list)
// Last updated: January 2026
// Sources: anthropic.com/pricing, openai.com/api/pricing, ai.google.dev/gemini-api/docs/pricing
const FALLBACK_MODEL_PRICING: Record<string, ModelPricing> = {
  // Anthropic - Claude 4.5 series (November 2025)
  "claude-opus-4-5-20251101": { inputPer1M: 5.0, outputPer1M: 25.0 },
  "claude-sonnet-4-5-20251101": { inputPer1M: 3.0, outputPer1M: 15.0 },
  "claude-haiku-4-5-20251101": { inputPer1M: 1.0, outputPer1M: 5.0 },
  // Anthropic - Claude 4.x series
  "claude-opus-4-20250514": { inputPer1M: 15.0, outputPer1M: 75.0 },
  "claude-sonnet-4-20250514": { inputPer1M: 3.0, outputPer1M: 15.0 },
  // Anthropic - Claude 3.x series (legacy)
  "claude-3-5-sonnet-20241022": { inputPer1M: 3.0, outputPer1M: 15.0 },
  "claude-3-5-haiku-20241022": { inputPer1M: 1.0, outputPer1M: 5.0 },
  "claude-3-opus-20240229": { inputPer1M: 15.0, outputPer1M: 75.0 },
  // OpenAI
  "gpt-4o": { inputPer1M: 2.5, outputPer1M: 10.0 },
  "gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.6 },
  "gpt-4-turbo": { inputPer1M: 10.0, outputPer1M: 30.0 },
  "gpt-4": { inputPer1M: 30.0, outputPer1M: 60.0 },
  "o1": { inputPer1M: 15.0, outputPer1M: 60.0 },
  "o1-preview": { inputPer1M: 15.0, outputPer1M: 60.0 },
  "o1-mini": { inputPer1M: 3.0, outputPer1M: 12.0 },
  "o3-mini": { inputPer1M: 1.1, outputPer1M: 4.4 },
  // Google Gemini 3 (Preview - November 2025)
  "gemini-3-pro": { inputPer1M: 2.0, outputPer1M: 12.0 },
  "gemini-3-pro-preview": { inputPer1M: 2.0, outputPer1M: 12.0 },
  "gemini-3-flash": { inputPer1M: 0.15, outputPer1M: 0.6 },
  "gemini-3-flash-preview": { inputPer1M: 0.15, outputPer1M: 0.6 },
  // Google Gemini 2.5
  "gemini-2.5-pro": { inputPer1M: 1.25, outputPer1M: 10.0 },
  "gemini-2.5-pro-preview": { inputPer1M: 1.25, outputPer1M: 10.0 },
  "gemini-2.5-flash": { inputPer1M: 0.15, outputPer1M: 0.6 },
  "gemini-2.5-flash-preview": { inputPer1M: 0.15, outputPer1M: 0.6 },
  // Google Gemini 2.0
  "gemini-2.0-pro": { inputPer1M: 1.0, outputPer1M: 4.0 },
  "gemini-2.0-pro-exp": { inputPer1M: 1.0, outputPer1M: 4.0 },
  "gemini-2.0-flash": { inputPer1M: 0.1, outputPer1M: 0.4 },
  "gemini-2.0-flash-exp": { inputPer1M: 0.1, outputPer1M: 0.4 },
  "gemini-2.0-flash-lite": { inputPer1M: 0.075, outputPer1M: 0.3 },
  // Google Gemini 1.5
  "gemini-1.5-pro": { inputPer1M: 1.25, outputPer1M: 5.0 },
  "gemini-1.5-pro-latest": { inputPer1M: 1.25, outputPer1M: 5.0 },
  "gemini-1.5-flash": { inputPer1M: 0.075, outputPer1M: 0.3 },
  "gemini-1.5-flash-latest": { inputPer1M: 0.075, outputPer1M: 0.3 },
  "gemini-1.5-flash-8b": { inputPer1M: 0.0375, outputPer1M: 0.15 },
};

// Valid model name patterns - filter out suspicious/test models
const VALID_MODEL_PATTERNS = [
  /^claude-/i,
  /^gpt-/i,
  /^o1/i,
  /^o3/i,
  /^gemini-/i,
  /^text-embedding/i,
];

// Default pricing per provider when specific model not found
function getDefaultPricing(provider: string): ModelPricing {
  switch (provider) {
    case "anthropic":
      return { inputPer1M: 1.0, outputPer1M: 5.0 };
    case "openai":
      return { inputPer1M: 1.0, outputPer1M: 3.0 };
    case "google":
      return { inputPer1M: 0.5, outputPer1M: 1.5 };
    default:
      return { inputPer1M: 1.0, outputPer1M: 3.0 };
  }
}

const CHART_COLORS = {
  revenue: "#10b981",
  costs: "#f59e0b",
  profit: "#3b82f6",
};

type TaskType = keyof typeof TASK_TYPES;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PricingModelPage() {
  // Data state
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [savedPlans, setSavedPlans] = useState<PlanConfig[]>([]);
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([]);
  const [modelPricing, setModelPricing] = useState<Record<string, ModelPricing & { name: string; provider: string }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modelsLastUpdated, setModelsLastUpdated] = useState<string | null>(null);

  // Model selection matrix: planKey -> taskType -> modelId
  const [modelMatrix, setModelMatrix] = useState<Record<string, Record<TaskType, string>>>({});

  // Editable plan configs: planKey -> { priceMonthly, aiGenerationsPerMonth, aiReviewsPerMonth }
  const [planEdits, setPlanEdits] = useState<Record<string, { price: string; generations: string; reviews: string }>>({});

  // Track saved state to detect changes
  const [savedModelMatrix, setSavedModelMatrix] = useState<Record<string, Record<TaskType, string>>>({});
  const [savedPlanEdits, setSavedPlanEdits] = useState<Record<string, { price: string; generations: string; reviews: string }>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // User counts per plan
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});

  // Growth settings
  const [growthRate, setGrowthRate] = useState(15);
  const [usageIntensity, setUsageIntensity] = useState(50);

  // Unlimited usage estimates (for plans with -1 limits)
  const [unlimitedGenerations, setUnlimitedGenerations] = useState("50");
  const [unlimitedReviews, setUnlimitedReviews] = useState("20");

  // Multi-model review configuration
  const [multiModelConfig, setMultiModelConfig] = useState<MultiModelReviewConfig | null>(null);
  const [savedMultiModelConfig, setSavedMultiModelConfig] = useState<MultiModelReviewConfig | null>(null);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData(refreshModels = false) {
    setIsLoading(true);
    try {
      // Fetch plans, models, pricing, and multi-model config from APIs
      const [plansRes, modelsRes, pricingRes, multiModelRes] = await Promise.all([
        fetch("/api/admin/plans"),
        fetch("/api/admin/ai-models"), // Use same API as AI Tasks page
        fetch("/api/admin/pricing"), // Fetch real-time pricing from LiteLLM
        fetch("/api/admin/multi-model-config"), // Multi-model review config
      ]);

      if (!plansRes.ok) throw new Error("Failed to fetch plans");

      const plansData = await plansRes.json();
      const fetchedPlans: PlanConfig[] = (plansData.plans || []).map((p: any) => ({
        key: p.key,
        name: p.name,
        priceMonthly: p.priceMonthly,
        aiGenerationsPerMonth: p.aiGenerationsPerMonth,
        aiReviewsPerMonth: p.aiReviewsPerMonth,
        multiModelReview: p.multiModelReview || false,
        isActive: p.isActive ?? true,
        taskModelOverrides: p.taskModelOverrides || {},
      }));
      setPlans(fetchedPlans);
      setSavedPlans(JSON.parse(JSON.stringify(fetchedPlans))); // Deep copy for comparison

      // Fetch multi-model review configuration
      if (multiModelRes.ok) {
        const mmConfig = await multiModelRes.json();
        setMultiModelConfig(mmConfig);
        setSavedMultiModelConfig(JSON.parse(JSON.stringify(mmConfig))); // Deep copy for comparison
        console.log(`[pricing-model] Multi-model config: ${mmConfig.models?.length || 0} review models, synthesis: ${mmConfig.synthesisModelId}`);
      }

      // Initialize user counts
      const counts: Record<string, number> = {};
      fetchedPlans.forEach((p) => {
        counts[p.key] = p.key === "FREE" ? 1000 : p.key === "PRO" ? 100 : 20;
      });
      setUserCounts(counts);

      // Get pricing from LiteLLM API (or fallback)
      let livePricing: Record<string, { inputPer1M: number; outputPer1M: number }> = FALLBACK_MODEL_PRICING;
      let pricingSource = "fallback";

      if (pricingRes.ok) {
        const pricingData = await pricingRes.json();
        if (pricingData.pricing && Object.keys(pricingData.pricing).length > 0) {
          livePricing = pricingData.pricing;
          pricingSource = pricingData.source || "litellm";
          console.log(`[pricing-model] Loaded ${Object.keys(livePricing).length} prices from ${pricingSource}`);
        }
      }

      // Helper to find pricing with flexible matching
      const findPricing = (modelId: string): { inputPer1M: number; outputPer1M: number } | null => {
        // Exact match
        if (livePricing[modelId]) return livePricing[modelId];
        // Remove suffixes like -latest, -exp, -preview, version numbers
        const baseId = modelId.replace(/-(latest|exp|preview|\d{6,})$/, "");
        if (livePricing[baseId]) return livePricing[baseId];
        // Try prefix match
        for (const key of Object.keys(livePricing)) {
          if (modelId.startsWith(key) || key.startsWith(modelId)) {
            return livePricing[key];
          }
        }
        return null;
      };

      let models: Array<AvailableModel & { inputPer1M: number; outputPer1M: number }> = [];

      if (modelsRes.ok) {
        const modelsData = await modelsRes.json();
        // API returns { openai: { models, hasKey }, anthropic: {...}, google: {...} }
        const providers = ["openai", "anthropic", "google"] as const;

        for (const provider of providers) {
          const providerData = modelsData[provider];
          if (providerData?.models) {
            for (const model of providerData.models) {
              // Filter out suspicious model names (like "Nano Banana Pro")
              const isValidModel = VALID_MODEL_PATTERNS.some((pattern) => pattern.test(model.id));
              if (!isValidModel) {
                console.warn(`[pricing-model] Skipping suspicious model: ${model.id}`);
                continue;
              }

              // Get pricing from live API or fallback
              const pricing = findPricing(model.id);
              models.push({
                id: model.id,
                name: model.name,
                provider,
                tier: model.tier || "quality",
                bestFor: model.bestFor,
                strengths: model.strengths,
                inputPer1M: pricing?.inputPer1M ?? getDefaultPricing(provider).inputPer1M,
                outputPer1M: pricing?.outputPer1M ?? getDefaultPricing(provider).outputPer1M,
              });
            }
          }
        }
        setModelsLastUpdated(new Date().toISOString());
      }

      // Use fallback if API failed or returned empty array
      if (models.length === 0) {
        console.warn("Models API returned empty, using fallback");
        const fallbackModels: AvailableModel[] = Object.entries(FALLBACK_MODEL_PRICING).map(([id, pricing]) => ({
          id,
          name: id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          provider: id.includes("claude") ? "anthropic" : id.includes("gpt") || id.includes("o1") ? "openai" : "google",
          tier: id.includes("haiku") || id.includes("mini") || id.includes("flash") ? "fast" : "quality",
        }));
        models = fallbackModels.map((m) => ({ ...m, inputPer1M: FALLBACK_MODEL_PRICING[m.id].inputPer1M, outputPer1M: FALLBACK_MODEL_PRICING[m.id].outputPer1M }));
      }

      setAvailableModels(models);

      // Build pricing map
      const pricingMap: Record<string, ModelPricing & { name: string; provider: string }> = {};
      models.forEach((model) => {
        pricingMap[model.id] = {
          inputPer1M: model.inputPer1M,
          outputPer1M: model.outputPer1M,
          name: model.name,
          provider: model.provider,
        };
      });
      setModelPricing(pricingMap);

      // Initialize model matrix from existing taskModelOverrides or use defaults
      const defaultFast = models.find((m) => m.tier === "fast")?.id || models[0]?.id || "";
      const defaultQuality = models.find((m) => m.tier === "quality")?.id || defaultFast;

      const matrix: Record<string, Record<TaskType, string>> = {};
      fetchedPlans.forEach((plan) => {
        const overrides = plan.taskModelOverrides || {};
        matrix[plan.key] = {
          RESUME_PARSING: overrides.RESUME_PARSING?.modelId || defaultFast,
          RESUME_GENERATION: overrides.RESUME_GENERATION?.modelId || defaultQuality,
          TEXT_IMPROVEMENT: overrides.TEXT_IMPROVEMENT?.modelId || defaultFast,
          RESUME_REVIEW: overrides.RESUME_REVIEW?.modelId || defaultQuality,
          STYLE_FORMATTING: overrides.STYLE_FORMATTING?.modelId || defaultFast,
        };
      });
      setModelMatrix(matrix);
      setSavedModelMatrix(JSON.parse(JSON.stringify(matrix))); // Deep copy for comparison

      // Initialize editable plan configs
      const edits: Record<string, { price: string; generations: string; reviews: string }> = {};
      fetchedPlans.forEach((plan) => {
        edits[plan.key] = {
          price: String(plan.priceMonthly),
          generations: String(plan.aiGenerationsPerMonth),
          reviews: String(plan.aiReviewsPerMonth),
        };
      });
      setPlanEdits(edits);
      setSavedPlanEdits(JSON.parse(JSON.stringify(edits)));
    } catch (err) {
      setError("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }

  // ============================================================================
  // CALCULATIONS
  // ============================================================================

  const calculateTaskCost = useCallback(
    (taskType: TaskType, modelId: string): number => {
      const task = TASK_TYPES[taskType];
      const pricing = modelPricing[modelId];
      if (!pricing || !task) return 0;

      const inputCost = (task.avgInput / 1_000_000) * pricing.inputPer1M;
      const outputCost = (task.avgOutput / 1_000_000) * pricing.outputPer1M;
      return inputCost + outputCost;
    },
    [modelPricing]
  );

  // Calculate cost for multi-model review (all review models + synthesis + verification)
  const calculateMultiModelReviewCost = useCallback((): number => {
    if (!multiModelConfig || !multiModelConfig.isEnabled || multiModelConfig.models.length === 0) {
      return 0;
    }

    let totalCost = 0;

    // Cost for each review model
    for (const reviewModel of multiModelConfig.models) {
      const pricing = modelPricing[reviewModel.modelId];
      if (pricing) {
        const inputCost = (MULTI_MODEL_TOKEN_USAGE.REVIEW_PROMPT.input / 1_000_000) * pricing.inputPer1M;
        const outputCost = (MULTI_MODEL_TOKEN_USAGE.REVIEW_PROMPT.output / 1_000_000) * pricing.outputPer1M;
        totalCost += inputCost + outputCost;
      }
    }

    // Cost for synthesis model
    const synthesisPricing = modelPricing[multiModelConfig.synthesisModelId];
    if (synthesisPricing) {
      // Synthesis prompt
      const synthInputCost = (MULTI_MODEL_TOKEN_USAGE.SYNTHESIS_PROMPT.input / 1_000_000) * synthesisPricing.inputPer1M;
      const synthOutputCost = (MULTI_MODEL_TOKEN_USAGE.SYNTHESIS_PROMPT.output / 1_000_000) * synthesisPricing.outputPer1M;
      totalCost += synthInputCost + synthOutputCost;

      // Verification prompt (also uses synthesis model)
      const verifyInputCost = (MULTI_MODEL_TOKEN_USAGE.VERIFICATION_PROMPT.input / 1_000_000) * synthesisPricing.inputPer1M;
      const verifyOutputCost = (MULTI_MODEL_TOKEN_USAGE.VERIFICATION_PROMPT.output / 1_000_000) * synthesisPricing.outputPer1M;
      totalCost += verifyInputCost + verifyOutputCost;
    }

    return totalCost;
  }, [multiModelConfig, modelPricing]);

  // Calculate costs for a plan in a quarter
  const calculatePlanQuarter = useCallback(
    (plan: PlanConfig, quarterIdx: number) => {
      const baseUsers = userCounts[plan.key] || 0;
      const users = Math.round(baseUsers * Math.pow(1 + growthRate / 100, quarterIdx));
      const usageFactor = usageIntensity / 100;

      if (users === 0 || !modelMatrix[plan.key]) {
        return { users, revenue: 0, cost: 0, profit: 0 };
      }

      // Use editable values or fallback to plan defaults
      const editedPlan = planEdits[plan.key];
      const priceMonthly = parseFloat(editedPlan?.price || "0") || plan.priceMonthly;
      const aiGenerations = parseInt(editedPlan?.generations || "0", 10);
      const aiReviews = parseInt(editedPlan?.reviews || "0", 10);

      let monthlyCostPerUser = 0;

      // Generations: parsing + generation
      const unlimitedGenNum = parseInt(unlimitedGenerations, 10) || 0;
      const genLimit = aiGenerations === -1 ? unlimitedGenNum : aiGenerations;
      const avgGen = genLimit * usageFactor;
      monthlyCostPerUser += avgGen * calculateTaskCost("RESUME_PARSING", modelMatrix[plan.key].RESUME_PARSING);
      monthlyCostPerUser += avgGen * calculateTaskCost("RESUME_GENERATION", modelMatrix[plan.key].RESUME_GENERATION);

      // Reviews - check if multi-model review is enabled for this plan
      const unlimitedRevNum = parseInt(unlimitedReviews, 10) || 0;
      const reviewLimit = aiReviews === -1 ? unlimitedRevNum : aiReviews;
      const avgReviews = reviewLimit * usageFactor;

      if (plan.multiModelReview && multiModelConfig?.isEnabled) {
        // Use multi-model review cost (all models + synthesis + verification)
        monthlyCostPerUser += avgReviews * calculateMultiModelReviewCost();
      } else {
        // Use single-model review cost
        monthlyCostPerUser += avgReviews * calculateTaskCost("RESUME_REVIEW", modelMatrix[plan.key].RESUME_REVIEW);
      }

      // Text improvements (estimate 10 per user per month)
      monthlyCostPerUser += 10 * usageFactor * calculateTaskCost("TEXT_IMPROVEMENT", modelMatrix[plan.key].TEXT_IMPROVEMENT);

      // Style formatting (estimate 5 per user per month)
      monthlyCostPerUser += 5 * usageFactor * calculateTaskCost("STYLE_FORMATTING", modelMatrix[plan.key].STYLE_FORMATTING);

      const quarterRevenue = users * priceMonthly * 3;
      const quarterCost = users * monthlyCostPerUser * 3;

      return {
        users,
        revenue: quarterRevenue,
        cost: quarterCost,
        profit: quarterRevenue - quarterCost,
      };
    },
    [userCounts, growthRate, usageIntensity, unlimitedGenerations, unlimitedReviews, modelMatrix, planEdits, calculateTaskCost, calculateMultiModelReviewCost, multiModelConfig]
  );

  // Filter only active plans for analytics
  const activePlans = useMemo(() => plans.filter(p => p.isActive), [plans]);

  // Quarterly data for charts (only active plans)
  const quarterlyData = useMemo(() => {
    const quarters = ["Q1", "Q2", "Q3", "Q4"];
    return quarters.map((quarter, idx) => {
      let totalRevenue = 0;
      let totalCost = 0;
      let totalUsers = 0;

      activePlans.forEach((plan) => {
        const result = calculatePlanQuarter(plan, idx);
        totalRevenue += result.revenue || 0;
        totalCost += result.cost || 0;
        totalUsers += result.users || 0;
      });

      return {
        quarter,
        revenue: totalRevenue,
        costs: totalCost,
        profit: totalRevenue - totalCost,
        users: totalUsers,
      };
    });
  }, [activePlans, calculatePlanQuarter]);

  // Per-plan breakdown (only active plans)
  const planBreakdown = useMemo(() => {
    return activePlans.map((plan) => {
      const q4 = calculatePlanQuarter(plan, 3);
      return {
        plan,
        ...q4,
        margin: q4.revenue > 0 ? (q4.profit / q4.revenue) * 100 : 0,
        costPerUser: q4.users > 0 ? q4.cost / q4.users / 3 : 0, // monthly cost per user
      };
    });
  }, [activePlans, calculatePlanQuarter]);

  // Totals
  const totals = useMemo(() => {
    const q4 = quarterlyData[3] || { revenue: 0, costs: 0, profit: 0, users: 0 };
    const yearlyRevenue = quarterlyData.reduce((sum, q) => sum + (q.revenue || 0), 0);
    const yearlyCosts = quarterlyData.reduce((sum, q) => sum + (q.costs || 0), 0);

    return {
      revenue: q4.revenue || 0,
      costs: q4.costs || 0,
      profit: q4.profit || 0,
      users: q4.users || 0,
      margin: q4.revenue > 0 ? ((q4.profit || 0) / q4.revenue) * 100 : 0,
      yearlyRevenue,
      yearlyCosts,
      yearlyProfit: yearlyRevenue - yearlyCosts,
    };
  }, [quarterlyData]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const updateModelForPlanTask = (planKey: string, taskType: TaskType, modelId: string) => {
    setModelMatrix((prev) => ({
      ...prev,
      [planKey]: {
        ...prev[planKey],
        [taskType]: modelId,
      },
    }));
  };

  const applyModelToAllPlans = (taskType: TaskType, modelId: string) => {
    setModelMatrix((prev) => {
      const updated = { ...prev };
      // Only apply to active plans
      activePlans.forEach((plan) => {
        updated[plan.key] = { ...updated[plan.key], [taskType]: modelId };
      });
      return updated;
    });
  };

  // Multi-model config handlers
  const toggleMultiModelEnabled = () => {
    if (!multiModelConfig) return;
    setMultiModelConfig({
      ...multiModelConfig,
      isEnabled: !multiModelConfig.isEnabled,
    });
  };

  const addReviewModel = (provider: string, modelId: string, name?: string) => {
    if (!multiModelConfig) return;
    // Don't add duplicates
    if (multiModelConfig.models.some(m => m.modelId === modelId)) return;
    setMultiModelConfig({
      ...multiModelConfig,
      models: [...multiModelConfig.models, { provider, modelId, name }],
    });
  };

  const removeReviewModel = (modelId: string) => {
    if (!multiModelConfig) return;
    setMultiModelConfig({
      ...multiModelConfig,
      models: multiModelConfig.models.filter(m => m.modelId !== modelId),
    });
  };

  const setSynthesisModel = (provider: string, modelId: string) => {
    if (!multiModelConfig) return;
    setMultiModelConfig({
      ...multiModelConfig,
      synthesisProvider: provider,
      synthesisModelId: modelId,
    });
  };

  const togglePlanMultiModel = (planKey: string) => {
    setPlans(prev => prev.map(p =>
      p.key === planKey ? { ...p, multiModelReview: !p.multiModelReview } : p
    ));
  };

  // Check if there are unsaved changes
  const hasChanges = useMemo(() => {
    const modelMatrixChanged = JSON.stringify(modelMatrix) !== JSON.stringify(savedModelMatrix);
    const planEditsChanged = JSON.stringify(planEdits) !== JSON.stringify(savedPlanEdits);
    const multiModelChanged = JSON.stringify(multiModelConfig) !== JSON.stringify(savedMultiModelConfig);
    const plansChanged = JSON.stringify(plans.map(p => ({ key: p.key, multiModelReview: p.multiModelReview }))) !==
                         JSON.stringify(savedPlans.map(p => ({ key: p.key, multiModelReview: p.multiModelReview })));
    return modelMatrixChanged || planEditsChanged || multiModelChanged || plansChanged;
  }, [modelMatrix, savedModelMatrix, planEdits, savedPlanEdits, multiModelConfig, savedMultiModelConfig, plans, savedPlans]);

  // Save all configurations to plans
  const saveModelConfigurations = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      // Update each plan with model overrides and pricing/limits
      const savePromises = plans.map(async (plan) => {
        const taskOverrides: Record<string, { provider: string; modelId: string }> = {};

        // Build taskModelOverrides from matrix
        (Object.keys(TASK_TYPES) as TaskType[]).forEach((taskType) => {
          const modelId = modelMatrix[plan.key]?.[taskType];
          if (modelId) {
            const model = availableModels.find((m) => m.id === modelId);
            taskOverrides[taskType] = {
              provider: model?.provider || "anthropic",
              modelId,
            };
          }
        });

        // Get edited plan values
        const editedPlan = planEdits[plan.key];
        const updateData: Record<string, unknown> = {
          key: plan.key,
          taskModelOverrides: taskOverrides,
          multiModelReview: plan.multiModelReview,
        };

        // Add price and limits if edited
        if (editedPlan) {
          const price = parseFloat(editedPlan.price);
          const generations = parseInt(editedPlan.generations, 10);
          const reviews = parseInt(editedPlan.reviews, 10);

          if (!isNaN(price)) updateData.priceMonthly = price;
          if (!isNaN(generations)) updateData.aiGenerationsPerMonth = generations;
          if (!isNaN(reviews)) updateData.aiReviewsPerMonth = reviews;
        }

        const res = await fetch("/api/admin/plans", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        });

        if (!res.ok) {
          throw new Error(`Failed to save ${plan.name}`);
        }
      });

      await Promise.all(savePromises);

      // Save multi-model config if changed
      if (multiModelConfig && JSON.stringify(multiModelConfig) !== JSON.stringify(savedMultiModelConfig)) {
        const mmRes = await fetch("/api/admin/multi-model-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(multiModelConfig),
        });
        if (!mmRes.ok) {
          throw new Error("Failed to save multi-model configuration");
        }
      }

      // Refetch data from DB to ensure consistency
      await fetchData();

      setSaveSuccess(true);

      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save:", err);
      setError("Failed to save model configurations");
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

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
        <h2 className="mt-2 text-lg font-semibold text-red-700 dark:text-red-400">{error}</h2>
        <Button className="mt-4" onClick={() => fetchData()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
            <Calculator className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Pricing Model</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Configure models per plan & task, simulate costs</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
              <Check className="h-4 w-4" /> Saved
            </span>
          )}
          {hasChanges && !saveSuccess && (
            <span className="text-sm text-amber-600 dark:text-amber-400">Unsaved changes</span>
          )}
          <Button
            onClick={saveModelConfigurations}
            disabled={!hasChanges || isSaving}
            className={cn(
              hasChanges
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500"
            )}
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Configuration
          </Button>
          <Button variant="outline" onClick={() => fetchData()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label="Q4 Revenue"
          value={`$${(totals.revenue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          color="emerald"
        />
        <KPICard
          label="Q4 API Costs"
          value={`$${(totals.costs || 0).toFixed(2)}`}
          color="amber"
        />
        <KPICard
          label="Q4 Profit"
          value={`$${(totals.profit || 0).toFixed(2)}`}
          color={totals.profit >= 0 ? "blue" : "red"}
        />
        <KPICard
          label="Profit Margin"
          value={`${(totals.margin || 0).toFixed(1)}%`}
          color={totals.margin >= 50 ? "emerald" : totals.margin >= 0 ? "amber" : "red"}
        />
      </div>

      {/* Growth Settings */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-violet-600" />
          Growth Settings
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <Label className="text-sm text-zinc-600 dark:text-zinc-400">Quarterly Growth Rate</Label>
            <div className="flex items-center gap-3 mt-2">
              <input
                type="range"
                min="0"
                max="50"
                value={growthRate}
                onChange={(e) => setGrowthRate(Number(e.target.value))}
                className="flex-1"
              />
              <span className="font-mono text-sm font-medium w-12 text-right">{growthRate}%</span>
            </div>
          </div>
          <div>
            <Label className="text-sm text-zinc-600 dark:text-zinc-400">Usage Intensity (% of limits)</Label>
            <div className="flex items-center gap-3 mt-2">
              <input
                type="range"
                min="10"
                max="100"
                value={usageIntensity}
                onChange={(e) => setUsageIntensity(Number(e.target.value))}
                className="flex-1"
              />
              <span className="font-mono text-sm font-medium w-12 text-right">{usageIntensity}%</span>
            </div>
          </div>
          <div>
            <Label className="text-sm text-zinc-600 dark:text-zinc-400">Unlimited Gen. Estimate</Label>
            <p className="text-xs text-zinc-400 mb-1">Avg. generations/mo for unlimited plans</p>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={unlimitedGenerations}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "");
                setUnlimitedGenerations(val === "" ? "" : String(parseInt(val, 10)));
              }}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-sm text-zinc-600 dark:text-zinc-400">Unlimited Reviews Estimate</Label>
            <p className="text-xs text-zinc-400 mb-1">Avg. reviews/mo for unlimited plans</p>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={unlimitedReviews}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "");
                setUnlimitedReviews(val === "" ? "" : String(parseInt(val, 10)));
              }}
              className="h-8 text-sm"
            />
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <Label className="text-sm text-zinc-600 dark:text-zinc-400">Starting Users (Q1)</Label>
          <div className="flex gap-2 mt-2">
            {activePlans.map((plan) => (
              <div key={plan.key} className="flex-1">
                <Label className="text-xs text-zinc-400">{plan.name}</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={userCounts[plan.key] ?? ""}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    setUserCounts((prev) => ({
                      ...prev,
                      [plan.key]: val === "" ? 0 : parseInt(val, 10),
                    }));
                  }}
                  className="mt-1 h-8 text-sm"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Plan Configuration - Price & Limits */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-emerald-600" />
          Plan Configuration
          <span className="text-xs font-normal text-zinc-400 ml-2">(-1 = unlimited)</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700">
                <th className="py-3 px-2 text-left font-medium text-zinc-500 dark:text-zinc-400">Plan</th>
                <th className="py-3 px-2 text-left font-medium text-zinc-500 dark:text-zinc-400">Price/mo ($)</th>
                <th className="py-3 px-2 text-left font-medium text-zinc-500 dark:text-zinc-400">AI Generations/mo</th>
                <th className="py-3 px-2 text-left font-medium text-zinc-500 dark:text-zinc-400">AI Reviews/mo</th>
              </tr>
            </thead>
            <tbody>
              {activePlans.map((plan) => (
                <tr key={plan.key} className="border-b border-zinc-100 dark:border-zinc-800">
                  <td className="py-3 px-2 font-medium text-zinc-900 dark:text-white">{plan.name}</td>
                  <td className="py-3 px-2">
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={planEdits[plan.key]?.price ?? ""}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.]/g, "");
                        setPlanEdits((prev) => ({
                          ...prev,
                          [plan.key]: { ...prev[plan.key], price: val },
                        }));
                      }}
                      className="h-8 w-24 text-sm"
                    />
                  </td>
                  <td className="py-3 px-2">
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={planEdits[plan.key]?.generations ?? ""}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9-]/g, "");
                        setPlanEdits((prev) => ({
                          ...prev,
                          [plan.key]: { ...prev[plan.key], generations: val === "" ? "" : val.startsWith("-") ? "-1" : String(parseInt(val, 10) || 0) },
                        }));
                      }}
                      className="h-8 w-24 text-sm"
                    />
                  </td>
                  <td className="py-3 px-2">
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={planEdits[plan.key]?.reviews ?? ""}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9-]/g, "");
                        setPlanEdits((prev) => ({
                          ...prev,
                          [plan.key]: { ...prev[plan.key], reviews: val === "" ? "" : val.startsWith("-") ? "-1" : String(parseInt(val, 10) || 0) },
                        }));
                      }}
                      className="h-8 w-24 text-sm"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Model Matrix - Per Plan Per Task */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
          <Cpu className="h-4 w-4 text-violet-600" />
          Model Selection (per Plan × Task)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700">
                <th className="py-3 px-2 text-left font-medium text-zinc-500 dark:text-zinc-400">Task Type</th>
                {activePlans.map((plan) => (
                  <th key={plan.key} className="py-3 px-2 text-left font-medium text-zinc-500 dark:text-zinc-400">
                    {plan.name}
                  </th>
                ))}
                <th className="py-3 px-2 text-left font-medium text-zinc-500 dark:text-zinc-400">Apply to All</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(TASK_TYPES) as TaskType[]).map((taskType) => (
                <tr key={taskType} className="border-b border-zinc-100 dark:border-zinc-800">
                  <td className="py-3 px-2">
                    <span className="font-medium text-zinc-900 dark:text-white">{TASK_TYPES[taskType].name}</span>
                    <p className="text-xs text-zinc-400">
                      ~{TASK_TYPES[taskType].avgInput + TASK_TYPES[taskType].avgOutput} tokens
                    </p>
                  </td>
                  {activePlans.map((plan) => (
                    <td key={plan.key} className="py-3 px-2">
                      <select
                        value={modelMatrix[plan.key]?.[taskType] || ""}
                        onChange={(e) => updateModelForPlanTask(plan.key, taskType, e.target.value)}
                        className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                      >
                        {/* Group by provider */}
                        {["anthropic", "openai", "google"].map((provider) => {
                          const providerModels = availableModels.filter((m) => m.provider === provider);
                          if (providerModels.length === 0) return null;
                          return (
                            <optgroup key={provider} label={provider.charAt(0).toUpperCase() + provider.slice(1)}>
                              {providerModels.map((model) => {
                                const cost = calculateTaskCost(taskType, model.id);
                                const tierLabel = model.tier === "fast" ? "⚡" : model.tier === "premium" ? "👑" : model.tier === "reasoning" ? "🧠" : "✨";
                                return (
                                  <option key={model.id} value={model.id}>
                                    {tierLabel} {model.name} (${cost.toFixed(4)})
                                  </option>
                                );
                              })}
                            </optgroup>
                          );
                        })}
                      </select>
                      {modelMatrix[plan.key]?.[taskType] && (() => {
                        const selectedModel = availableModels.find(m => m.id === modelMatrix[plan.key][taskType]);
                        return (
                          <div className="mt-1 space-y-0.5">
                            <p className="text-xs text-zinc-400">
                              ${calculateTaskCost(taskType, modelMatrix[plan.key][taskType]).toFixed(4)}/task
                            </p>
                            {selectedModel?.bestFor && (
                              <p className="text-[10px] text-zinc-500 dark:text-zinc-500 leading-tight" title={selectedModel.bestFor}>
                                {selectedModel.bestFor.length > 40 ? selectedModel.bestFor.slice(0, 40) + "..." : selectedModel.bestFor}
                              </p>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                  ))}
                  <td className="py-3 px-2">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          applyModelToAllPlans(taskType, e.target.value);
                          e.target.value = "";
                        }
                      }}
                      className="w-full rounded-md border border-violet-200 bg-violet-50 px-2 py-1.5 text-xs dark:border-violet-800 dark:bg-violet-900/30 dark:text-violet-200"
                      defaultValue=""
                    >
                      <option value="" disabled>Select...</option>
                      {["anthropic", "openai", "google"].map((provider) => {
                        const providerModels = availableModels.filter((m) => m.provider === provider);
                        if (providerModels.length === 0) return null;
                        return (
                          <optgroup key={provider} label={provider.charAt(0).toUpperCase() + provider.slice(1)}>
                            {providerModels.map((model) => {
                              const tierLabel = model.tier === "fast" ? "⚡" : model.tier === "premium" ? "👑" : model.tier === "reasoning" ? "🧠" : "✨";
                              return (
                                <option key={model.id} value={model.id}>
                                  {tierLabel} {model.name}
                                </option>
                              );
                            })}
                          </optgroup>
                        );
                      })}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Multi-Model Review Configuration */}
      {multiModelConfig && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-600" />
                Multi-Model Review
              </h3>
              {/* Enable/Disable Toggle */}
              <button
                onClick={toggleMultiModelEnabled}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  multiModelConfig.isEnabled
                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
                    : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                )}
              >
                {multiModelConfig.isEnabled ? (
                  <>
                    <ToggleRight className="h-3.5 w-3.5" /> Enabled
                  </>
                ) : (
                  <>
                    <ToggleLeft className="h-3.5 w-3.5" /> Disabled
                  </>
                )}
              </button>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Cost per review</p>
              <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                ${calculateMultiModelReviewCost().toFixed(4)}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Review Models */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Review Models ({multiModelConfig.models.length})
                </p>
                {/* Add Review Model Dropdown */}
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      const [provider, modelId] = e.target.value.split("||");
                      const model = availableModels.find(m => m.id === modelId);
                      addReviewModel(provider, modelId, model?.name);
                      e.target.value = "";
                    }
                  }}
                  className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200"
                  defaultValue=""
                >
                  <option value="" disabled>+ Add model...</option>
                  {["anthropic", "openai", "google"].map((provider) => {
                    const providerModels = availableModels.filter(
                      (m) => m.provider === provider && !multiModelConfig.models.some(rm => rm.modelId === m.id)
                    );
                    if (providerModels.length === 0) return null;
                    return (
                      <optgroup key={provider} label={provider.charAt(0).toUpperCase() + provider.slice(1)}>
                        {providerModels.map((model) => {
                          const pricing = modelPricing[model.id];
                          const reviewCost = pricing
                            ? ((MULTI_MODEL_TOKEN_USAGE.REVIEW_PROMPT.input / 1_000_000) * pricing.inputPer1M) +
                              ((MULTI_MODEL_TOKEN_USAGE.REVIEW_PROMPT.output / 1_000_000) * pricing.outputPer1M)
                            : 0;
                          const tierLabel = model.tier === "fast" ? "⚡" : model.tier === "premium" ? "👑" : model.tier === "reasoning" ? "🧠" : "✨";
                          return (
                            <option key={model.id} value={`${provider}||${model.id}`}>
                              {tierLabel} {model.name} (${reviewCost.toFixed(4)}/review)
                            </option>
                          );
                        })}
                      </optgroup>
                    );
                  })}
                </select>
              </div>
              {multiModelConfig.models.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {multiModelConfig.models.map((model, idx) => {
                    const pricing = modelPricing[model.modelId];
                    const modelInfo = availableModels.find(m => m.id === model.modelId);
                    const inputCost = pricing ? (MULTI_MODEL_TOKEN_USAGE.REVIEW_PROMPT.input / 1_000_000) * pricing.inputPer1M : 0;
                    const outputCost = pricing ? (MULTI_MODEL_TOKEN_USAGE.REVIEW_PROMPT.output / 1_000_000) * pricing.outputPer1M : 0;
                    const totalCost = inputCost + outputCost;
                    const tierLabel = modelInfo?.tier === "fast" ? "⚡" : modelInfo?.tier === "premium" ? "👑" : modelInfo?.tier === "reasoning" ? "🧠" : "✨";

                    return (
                      <div
                        key={`${model.provider}-${model.modelId}-${idx}`}
                        className="group rounded-lg border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 min-w-0 flex-1">
                            <span className="flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white shrink-0">
                              {idx + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm">{tierLabel}</span>
                                <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                                  {model.name || model.modelId}
                                </p>
                              </div>
                              <p className="text-[10px] text-zinc-400 capitalize">{model.provider}</p>
                              {modelInfo?.bestFor && (
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-tight">
                                  {modelInfo.bestFor}
                                </p>
                              )}
                              {modelInfo?.strengths && modelInfo.strengths.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {modelInfo.strengths.map((s, i) => (
                                    <span key={i} className="inline-block rounded bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 text-[9px] text-zinc-600 dark:text-zinc-300">
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <p className="text-xs font-mono font-medium text-amber-600 dark:text-amber-400">
                              ${totalCost.toFixed(4)}
                            </p>
                            <button
                              onClick={() => removeReviewModel(model.modelId)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-opacity"
                              title="Remove model"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/50 p-4 text-center dark:border-zinc-700 dark:bg-zinc-800/50">
                  <p className="text-xs text-zinc-400">No review models added. Add models above.</p>
                </div>
              )}
            </div>

            {/* Synthesis Model */}
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Synthesis Model</p>
                {(() => {
                  const synthPricing = modelPricing[multiModelConfig.synthesisModelId];
                  const synthInputCost = synthPricing ? (MULTI_MODEL_TOKEN_USAGE.SYNTHESIS_PROMPT.input / 1_000_000) * synthPricing.inputPer1M : 0;
                  const synthOutputCost = synthPricing ? (MULTI_MODEL_TOKEN_USAGE.SYNTHESIS_PROMPT.output / 1_000_000) * synthPricing.outputPer1M : 0;
                  const verifyInputCost = synthPricing ? (MULTI_MODEL_TOKEN_USAGE.VERIFICATION_PROMPT.input / 1_000_000) * synthPricing.inputPer1M : 0;
                  const verifyOutputCost = synthPricing ? (MULTI_MODEL_TOKEN_USAGE.VERIFICATION_PROMPT.output / 1_000_000) * synthPricing.outputPer1M : 0;
                  const totalSynthCost = synthInputCost + synthOutputCost + verifyInputCost + verifyOutputCost;
                  return (
                    <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400">
                      ${totalSynthCost.toFixed(4)} (synth + verify)
                    </span>
                  );
                })()}
              </div>
              <select
                value={multiModelConfig.synthesisModelId}
                onChange={(e) => {
                  const model = availableModels.find(m => m.id === e.target.value);
                  if (model) {
                    setSynthesisModel(model.provider, model.id);
                  }
                }}
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              >
                {["anthropic", "openai", "google"].map((provider) => {
                  const providerModels = availableModels.filter((m) => m.provider === provider);
                  if (providerModels.length === 0) return null;
                  return (
                    <optgroup key={provider} label={provider.charAt(0).toUpperCase() + provider.slice(1)}>
                      {providerModels.map((model) => {
                        const pricing = modelPricing[model.id];
                        const synthCost = pricing
                          ? ((MULTI_MODEL_TOKEN_USAGE.SYNTHESIS_PROMPT.input / 1_000_000) * pricing.inputPer1M) +
                            ((MULTI_MODEL_TOKEN_USAGE.SYNTHESIS_PROMPT.output / 1_000_000) * pricing.outputPer1M) +
                            ((MULTI_MODEL_TOKEN_USAGE.VERIFICATION_PROMPT.input / 1_000_000) * pricing.inputPer1M) +
                            ((MULTI_MODEL_TOKEN_USAGE.VERIFICATION_PROMPT.output / 1_000_000) * pricing.outputPer1M)
                          : 0;
                        const tierLabel = model.tier === "fast" ? "⚡" : model.tier === "premium" ? "👑" : model.tier === "reasoning" ? "🧠" : "✨";
                        return (
                          <option key={model.id} value={model.id}>
                            {tierLabel} {model.name} (${synthCost.toFixed(4)})
                          </option>
                        );
                      })}
                    </optgroup>
                  );
                })}
              </select>
              {/* Selected synthesis model info */}
              {(() => {
                const synthModel = availableModels.find(m => m.id === multiModelConfig.synthesisModelId);
                if (!synthModel?.bestFor) return null;
                return (
                  <div className="mt-2 p-2 rounded bg-indigo-50 dark:bg-indigo-900/20">
                    <p className="text-[11px] text-indigo-600 dark:text-indigo-400">{synthModel.bestFor}</p>
                    {synthModel.strengths && synthModel.strengths.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {synthModel.strengths.map((s, i) => (
                          <span key={i} className="inline-block rounded bg-indigo-100 dark:bg-indigo-800/50 px-1.5 py-0.5 text-[9px] text-indigo-700 dark:text-indigo-300">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Plans with multi-model enabled */}
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">Enable Multi-Model Review per Plan</p>
              <div className="flex flex-wrap gap-2">
                {activePlans.map(plan => (
                  <button
                    key={plan.key}
                    onClick={() => togglePlanMultiModel(plan.key)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                      plan.multiModelReview
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                    )}
                  >
                    {plan.multiModelReview ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                    {plan.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue vs Costs */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">Quarterly Projection</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={quarterlyData}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.revenue} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.revenue} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="costsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.costs} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.costs} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
                <XAxis dataKey="quarter" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--background)", border: "1px solid var(--border)" }}
                  formatter={(value) => [`$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`, ""]}
                />
                <Legend />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke={CHART_COLORS.revenue} fill="url(#revenueGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="costs" name="API Costs" stroke={CHART_COLORS.costs} fill="url(#costsGrad)" strokeWidth={2} />
                <Line type="monotone" dataKey="profit" name="Profit" stroke={CHART_COLORS.profit} strokeWidth={2} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Plan Comparison */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">Plan Profitability (Q4)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={planBreakdown.map((p) => ({ name: p.plan.name, revenue: p.revenue, costs: p.cost, profit: p.profit }))}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--background)", border: "1px solid var(--border)" }}
                  formatter={(value) => [`$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`, ""]}
                />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill={CHART_COLORS.revenue} radius={[4, 4, 0, 0]} />
                <Bar dataKey="costs" name="Costs" fill={CHART_COLORS.costs} radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="Profit" fill={CHART_COLORS.profit} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Plan Details Table */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">Plan Cost Breakdown (Q4)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700">
                <th className="py-3 px-4 text-left font-medium text-zinc-500">Plan</th>
                <th className="py-3 px-4 text-right font-medium text-zinc-500">Users</th>
                <th className="py-3 px-4 text-right font-medium text-zinc-500">Price/mo</th>
                <th className="py-3 px-4 text-right font-medium text-zinc-500">Revenue</th>
                <th className="py-3 px-4 text-right font-medium text-zinc-500">API Cost</th>
                <th className="py-3 px-4 text-right font-medium text-zinc-500">Cost/User/mo</th>
                <th className="py-3 px-4 text-right font-medium text-zinc-500">Profit</th>
                <th className="py-3 px-4 text-right font-medium text-zinc-500">Margin</th>
              </tr>
            </thead>
            <tbody>
              {planBreakdown.map((item) => {
                const editedPrice = parseFloat(planEdits[item.plan.key]?.price || "0") || item.plan.priceMonthly;
                return (
                <tr key={item.plan.key} className="border-b border-zinc-100 dark:border-zinc-800">
                  <td className="py-3 px-4 font-medium text-zinc-900 dark:text-white">{item.plan.name}</td>
                  <td className="py-3 px-4 text-right text-zinc-600 dark:text-zinc-400">{(item.users || 0).toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-zinc-600 dark:text-zinc-400">${editedPrice}</td>
                  <td className="py-3 px-4 text-right text-emerald-600 font-medium">${(item.revenue || 0).toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-amber-600 font-medium">${(item.cost || 0).toFixed(2)}</td>
                  <td className="py-3 px-4 text-right text-zinc-600 dark:text-zinc-400">${(item.costPerUser || 0).toFixed(4)}</td>
                  <td className={cn("py-3 px-4 text-right font-medium", item.profit >= 0 ? "text-blue-600" : "text-red-600")}>
                    ${(item.profit || 0).toFixed(2)}
                  </td>
                  <td className={cn(
                    "py-3 px-4 text-right font-medium",
                    item.margin >= 50 ? "text-emerald-600" : item.margin >= 0 ? "text-amber-600" : "text-red-600"
                  )}>
                    {(item.margin || 0).toFixed(1)}%
                  </td>
                </tr>
              );
              })}
              {/* Totals row */}
              <tr className="bg-zinc-50 dark:bg-zinc-800/50 font-semibold">
                <td className="py-3 px-4 text-zinc-900 dark:text-white">Total</td>
                <td className="py-3 px-4 text-right">{(totals.users || 0).toLocaleString()}</td>
                <td className="py-3 px-4 text-right">-</td>
                <td className="py-3 px-4 text-right text-emerald-600">${(totals.revenue || 0).toLocaleString()}</td>
                <td className="py-3 px-4 text-right text-amber-600">${(totals.costs || 0).toFixed(2)}</td>
                <td className="py-3 px-4 text-right">-</td>
                <td className={cn("py-3 px-4 text-right", totals.profit >= 0 ? "text-blue-600" : "text-red-600")}>
                  ${(totals.profit || 0).toFixed(2)}
                </td>
                <td className={cn(
                  "py-3 px-4 text-right",
                  totals.margin >= 50 ? "text-emerald-600" : totals.margin >= 0 ? "text-amber-600" : "text-red-600"
                )}>
                  {(totals.margin || 0).toFixed(1)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Yearly Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center dark:border-emerald-800 dark:bg-emerald-900/20">
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            ${(totals.yearlyRevenue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className="text-sm text-emerald-600/70 dark:text-emerald-400/70">Yearly Revenue</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center dark:border-amber-800 dark:bg-amber-900/20">
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            ${(totals.yearlyCosts || 0).toFixed(2)}
          </p>
          <p className="text-sm text-amber-600/70 dark:text-amber-400/70">Yearly API Costs</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-center dark:border-blue-800 dark:bg-blue-900/20">
          <p className={cn("text-2xl font-bold", totals.yearlyProfit >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400")}>
            ${(totals.yearlyProfit || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
          <p className="text-sm text-blue-600/70 dark:text-blue-400/70">Yearly Profit</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTS
// ============================================================================

function KPICard({ label, value, color }: { label: string; value: string; color: "emerald" | "amber" | "blue" | "red" }) {
  const colorClasses = {
    emerald: "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20",
    amber: "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20",
    blue: "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20",
    red: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20",
  };

  const textClasses = {
    emerald: "text-emerald-700 dark:text-emerald-400",
    amber: "text-amber-700 dark:text-amber-400",
    blue: "text-blue-700 dark:text-blue-400",
    red: "text-red-700 dark:text-red-400",
  };

  return (
    <div className={cn("rounded-xl border p-4", colorClasses[color])}>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className={cn("text-2xl font-bold mt-1", textClasses[color])}>{value}</p>
    </div>
  );
}
