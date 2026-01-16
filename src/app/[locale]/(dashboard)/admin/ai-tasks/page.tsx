"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Bot,
  Cpu,
  FileSearch,
  Sparkles,
  MessageSquareText,
  ClipboardCheck,
  Image,
  Languages,
  Palette,
  ChevronDown,
  Save,
  Loader2,
  Power,
  AlertTriangle,
  Layers,
  Plus,
  Trash2,
  Crown,
  RefreshCw,
  Shield,
  ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface TaskMetadata {
  name: string;
  nameUk: string;
  description: string;
}

interface FallbackModel {
  provider: string;
  modelId: string;
}

interface TaskConfig {
  taskType: string;
  provider: string;
  modelId: string;
  fallbackModels: FallbackModel[];
  temperature: number;
  maxTokens: number;
  isEnabled: boolean;
  customApiUrl?: string | null;
  customApiKeyRef?: string | null;
  metadata: TaskMetadata;
}

interface Provider {
  id: string;
  name: string;
}

interface Model {
  id: string;
  name: string;
  tier: string;
}

interface ProviderModels {
  models: Model[];
  hasKey: boolean;
}

type ModelsMap = Record<string, ProviderModels>;

interface MultiModelConfig {
  provider: string;
  modelId: string;
  name?: string;
}

interface MultiModelReviewConfigData {
  id?: string;
  models: MultiModelConfig[];
  synthesisProvider: string;
  synthesisModelId: string;
  isEnabled: boolean;
  minModelsRequired: number;
}

const taskIcons: Record<string, React.ElementType> = {
  RESUME_PARSING: FileSearch,
  RESUME_GENERATION: Sparkles,
  TEXT_IMPROVEMENT: MessageSquareText,
  RESUME_REVIEW: ClipboardCheck,
  STYLE_FORMATTING: Palette,
  IMAGE_GENERATION: Image,
  TRANSLATION: Languages,
};

const taskTranslationKeys: Record<string, string> = {
  RESUME_PARSING: "taskResumeParsing",
  RESUME_GENERATION: "taskResumeGeneration",
  TEXT_IMPROVEMENT: "taskTextImprovement",
  RESUME_REVIEW: "taskResumeReview",
  STYLE_FORMATTING: "taskStyleFormatting",
  IMAGE_GENERATION: "taskImageGeneration",
  TRANSLATION: "taskTranslation",
};

export default function AITasksPage() {
  const t = useTranslations("adminAiTasks");
  const [configs, setConfigs] = useState<TaskConfig[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [models, setModels] = useState<ModelsMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<TaskConfig | null>(null);
  const [savingTask, setSavingTask] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [multiModelConfig, setMultiModelConfig] = useState<MultiModelReviewConfigData | null>(null);
  const [isSavingMultiModel, setIsSavingMultiModel] = useState(false);
  const [multiModelExpanded, setMultiModelExpanded] = useState(false);

  useEffect(() => {
    fetchConfigs();
    fetchModels();
    fetchMultiModelConfig();
  }, []);

  function showSuccess(message: string) {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  }

  async function fetchConfigs() {
    try {
      const res = await fetch("/api/admin/ai-tasks");
      if (res.status === 403) {
        setError(t("adminRequired"));
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setConfigs(data.configs || []);
      setProviders(data.providers || []);
    } catch {
      setError(t("failedToLoad"));
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchModels() {
    setIsLoadingModels(true);
    try {
      const res = await fetch("/api/admin/ai-models");
      if (res.ok) {
        const data = await res.json();
        setModels(data || {});
      }
    } catch (err) {
      console.error("Failed to fetch models:", err);
    } finally {
      setIsLoadingModels(false);
    }
  }

  async function refreshProviderModels(provider: string) {
    try {
      const res = await fetch(`/api/admin/ai-models?provider=${provider}&refresh=true`);
      if (res.ok) {
        const data = await res.json();
        setModels((prev) => ({
          ...prev,
          [provider]: { models: data.models || [], hasKey: data.hasKey },
        }));
        showSuccess(t("modelsRefreshed", { provider }));
      }
    } catch (err) {
      console.error("Failed to refresh models:", err);
    }
  }

  async function fetchMultiModelConfig() {
    try {
      const res = await fetch("/api/admin/multi-model-config");
      if (res.ok) {
        const data = await res.json();
        setMultiModelConfig(data);
      }
    } catch (err) {
      console.error("Failed to fetch multi-model config:", err);
    }
  }

  async function saveMultiModelConfig() {
    if (!multiModelConfig) return;
    setIsSavingMultiModel(true);
    try {
      const res = await fetch("/api/admin/multi-model-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(multiModelConfig),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json();
      setMultiModelConfig(data);
      showSuccess(t("multiModelConfigSaved"));
    } catch {
      setError(t("failedToSaveMultiModel"));
    } finally {
      setIsSavingMultiModel(false);
    }
  }

  const allAvailableModels: MultiModelConfig[] = [
    { provider: "anthropic", modelId: "claude-sonnet-4-20250514", name: "Claude Sonnet 4" },
    { provider: "anthropic", modelId: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku" },
    { provider: "openai", modelId: "gpt-4o", name: "GPT-4o" },
    { provider: "openai", modelId: "gpt-4o-mini", name: "GPT-4o Mini" },
    { provider: "google", modelId: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
    { provider: "google", modelId: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
  ];

  function addModelToMultiModel() {
    if (!multiModelConfig) return;
    const existingKeys = new Set(multiModelConfig.models.map((m) => `${m.provider}-${m.modelId}`));
    const nextModel = allAvailableModels.find((m) => !existingKeys.has(`${m.provider}-${m.modelId}`));
    const modelToAdd = nextModel || allAvailableModels[0];
    setMultiModelConfig({
      ...multiModelConfig,
      models: [...multiModelConfig.models, { ...modelToAdd }],
    });
  }

  function removeModelFromMultiModel(index: number) {
    if (!multiModelConfig) return;
    setMultiModelConfig({
      ...multiModelConfig,
      models: multiModelConfig.models.filter((_, i) => i !== index),
    });
  }

  function updateMultiModelModel(index: number, provider: string, modelId: string) {
    if (!multiModelConfig) return;
    const modelData = models[provider]?.models?.find((m) => m.id === modelId);
    const fallbackModel = allAvailableModels.find((m) => m.provider === provider && m.modelId === modelId);
    const name = modelData?.name || fallbackModel?.name || modelId;
    const updatedModels = [...multiModelConfig.models];
    updatedModels[index] = { provider, modelId, name };
    setMultiModelConfig({ ...multiModelConfig, models: updatedModels });
  }

  async function saveConfig(config: TaskConfig) {
    setSavingTask(config.taskType);
    try {
      const res = await fetch("/api/admin/ai-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error("Failed to save");
      await fetchConfigs();
      setExpandedTask(null);
      setEditingConfig(null);
      showSuccess(t("configurationSaved"));
    } catch {
      setError(t("failedToSaveConfig"));
    } finally {
      setSavingTask(null);
    }
  }

  function startEditing(config: TaskConfig) {
    setEditingConfig({ ...config });
    setExpandedTask(config.taskType);
  }

  function cancelEditing() {
    setEditingConfig(null);
    setExpandedTask(null);
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
          {error === "Admin access required" ? t("adminRequired") : t("failedToLoad")}
        </h2>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Toast */}
      {successMessage && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-emerald-600 px-4 py-2 text-white shadow-lg">
          {successMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30">
            <Cpu className="h-6 w-6 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{t("title")}</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {t("subtitle")}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => fetchModels()}
          disabled={isLoadingModels}
          className="gap-2"
        >
          <RefreshCw className={cn("h-4 w-4", isLoadingModels && "animate-spin")} />
          {t("refreshModels")}
        </Button>
      </div>

      {/* Provider Status */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {providers.map((provider) => {
          const providerData = models[provider.id];
          const hasKey = providerData?.hasKey ?? false;
          const modelCount = providerData?.models?.length ?? 0;

          return (
            <div
              key={provider.id}
              className={cn(
                "rounded-lg border p-4",
                hasKey
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20"
                  : "border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50"
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-white">{provider.name}</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {hasKey ? t("models", { count: modelCount }) : t("noApiKey")}
                  </p>
                </div>
                <button
                  onClick={() => refreshProviderModels(provider.id)}
                  disabled={!hasKey}
                  className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        {configs.map((config) => {
          const Icon = taskIcons[config.taskType] || Bot;
          const isExpanded = expandedTask === config.taskType;
          const isEditing = editingConfig?.taskType === config.taskType;
          const isSaving = savingTask === config.taskType;
          // Use editingConfig.provider when editing, otherwise config.provider
          const currentProvider = isEditing && editingConfig ? editingConfig.provider : config.provider;
          const providerData = models[currentProvider];
          const availableModels = providerData?.models || [];
          const hasApiKey = providerData?.hasKey ?? false;

          return (
            <div
              key={config.taskType}
              className={cn(
                "rounded-lg border transition-all",
                isExpanded
                  ? "border-violet-300 bg-violet-50 dark:border-violet-700 dark:bg-violet-900/20"
                  : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-600",
                !config.isEnabled && "opacity-60"
              )}
            >
              {/* Card Header */}
              <div
                className="flex cursor-pointer items-center justify-between p-4"
                onClick={() => !isExpanded && startEditing(config)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-700">
                    <Icon className="h-5 w-5 text-zinc-600 dark:text-zinc-300" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-900 dark:text-white">
                      {t(taskTranslationKeys[config.taskType] || config.taskType)}
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                    {config.provider}
                  </span>
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full",
                      config.isEnabled ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-zinc-100 dark:bg-zinc-700"
                    )}
                  >
                    <Power
                      className={cn(
                        "h-4 w-4",
                        config.isEnabled ? "text-emerald-600" : "text-zinc-400"
                      )}
                    />
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 text-zinc-400 transition-transform",
                      isExpanded && "rotate-180"
                    )}
                  />
                </div>
              </div>

              {/* Collapsed Info */}
              {!isExpanded && (
                <div className="border-t border-zinc-100 px-4 py-2 dark:border-zinc-700">
                  <code className="text-xs text-zinc-500 dark:text-zinc-400">{config.modelId}</code>
                </div>
              )}

              {/* Expanded Edit Form */}
              {isExpanded && isEditing && editingConfig && (
                <div className="space-y-4 border-t border-zinc-200 p-4 dark:border-zinc-700">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {config.metadata.description}
                  </p>

                  {/* Provider Selection */}
                  <div>
                    <Label className="mb-2 block text-sm font-medium">{t("provider")}</Label>
                    <div className="flex gap-2">
                      {providers.map((provider) => (
                        <button
                          key={provider.id}
                          onClick={() =>
                            setEditingConfig({
                              ...editingConfig,
                              provider: provider.id,
                              modelId: models[provider.id]?.models?.[0]?.id || "",
                            })
                          }
                          className={cn(
                            "rounded-lg px-4 py-2 text-sm font-medium transition-all",
                            editingConfig.provider === provider.id
                              ? "bg-violet-600 text-white"
                              : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300"
                          )}
                        >
                          {provider.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Model Selection */}
                  <div>
                    <Label className="mb-2 block text-sm font-medium">{t("model")}</Label>
                    <select
                      value={editingConfig.modelId}
                      onChange={(e) => setEditingConfig({ ...editingConfig, modelId: e.target.value })}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
                    >
                      {availableModels.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name} ({model.tier})
                        </option>
                      ))}
                      {availableModels.length === 0 && (
                        <option value="">{t("noModelsAvailable")}</option>
                      )}
                    </select>
                    {!hasApiKey && (
                      <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                        {t("addApiKeyHint")}
                      </p>
                    )}
                  </div>

                  {/* Temperature */}
                  <div>
                    <Label className="mb-2 block text-sm font-medium">
                      {t("temperature")}: {editingConfig.temperature.toFixed(1)}
                    </Label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={editingConfig.temperature}
                      onChange={(e) =>
                        setEditingConfig({
                          ...editingConfig,
                          temperature: parseFloat(e.target.value),
                        })
                      }
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-zinc-500">
                      <span>{t("precise")}</span>
                      <span>{t("creative")}</span>
                    </div>
                  </div>

                  {/* Max Tokens */}
                  <div>
                    <Label className="mb-2 block text-sm font-medium">{t("maxTokens")}</Label>
                    <Input
                      type="number"
                      value={editingConfig.maxTokens}
                      onChange={(e) =>
                        setEditingConfig({
                          ...editingConfig,
                          maxTokens: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-40"
                    />
                  </div>

                  {/* Enabled Toggle */}
                  <div className="flex items-center justify-between rounded-lg bg-zinc-50 p-3 dark:bg-zinc-700/50">
                    <span className="font-medium text-zinc-900 dark:text-white">{t("enabled")}</span>
                    <button
                      onClick={() =>
                        setEditingConfig({
                          ...editingConfig,
                          isEnabled: !editingConfig.isEnabled,
                        })
                      }
                      className={cn(
                        "relative h-6 w-11 rounded-full transition-colors",
                        editingConfig.isEnabled ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                          editingConfig.isEnabled && "translate-x-5"
                        )}
                      />
                    </button>
                  </div>

                  {/* Fallback Models */}
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-900/20">
                    <div className="mb-3 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <Label className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                        {t("fallbackModels")}
                      </Label>
                    </div>
                    <p className="mb-3 text-xs text-emerald-600 dark:text-emerald-400">
                      {t("fallbackDescription")}
                    </p>

                    {/* Fallback chain visualization */}
                    <div className="space-y-2">
                      {/* Primary model indicator */}
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <span className="rounded bg-violet-100 px-2 py-0.5 font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                          {t("primary")}
                        </span>
                        <span>{editingConfig.provider}/{editingConfig.modelId}</span>
                      </div>

                      {editingConfig.fallbackModels?.map((fb, index) => {
                        const fbProviderModels = models[fb.provider]?.models || [];
                        return (
                          <div key={index} className="flex items-center gap-2">
                            <ArrowDown className="h-3 w-3 text-zinc-400" />
                            <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                              {t("fallback")} {index + 1}
                            </span>
                            <select
                              value={fb.provider}
                              onChange={(e) => {
                                const newProvider = e.target.value;
                                const newModels = models[newProvider]?.models || [];
                                const newFallbacks = [...(editingConfig.fallbackModels || [])];
                                newFallbacks[index] = {
                                  provider: newProvider,
                                  modelId: newModels[0]?.id || "",
                                };
                                setEditingConfig({ ...editingConfig, fallbackModels: newFallbacks });
                              }}
                              className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
                            >
                              {providers.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                            <select
                              value={fb.modelId}
                              onChange={(e) => {
                                const newFallbacks = [...(editingConfig.fallbackModels || [])];
                                newFallbacks[index] = { ...fb, modelId: e.target.value };
                                setEditingConfig({ ...editingConfig, fallbackModels: newFallbacks });
                              }}
                              className="flex-1 rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
                            >
                              {fbProviderModels.map((m) => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                              ))}
                              {fbProviderModels.length === 0 && (
                                <option value={fb.modelId}>{fb.modelId}</option>
                              )}
                            </select>
                            <button
                              onClick={() => {
                                const newFallbacks = editingConfig.fallbackModels?.filter((_, i) => i !== index) || [];
                                setEditingConfig({ ...editingConfig, fallbackModels: newFallbacks });
                              }}
                              className="rounded p-1 text-zinc-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}

                      {/* Add fallback button */}
                      <button
                        onClick={() => {
                          const existingProviders = new Set([
                            editingConfig.provider,
                            ...(editingConfig.fallbackModels?.map((f) => f.provider) || []),
                          ]);
                          // Try to pick a different provider
                          const newProvider = providers.find((p) => !existingProviders.has(p.id))?.id || providers[0]?.id || "openai";
                          const newModels = models[newProvider]?.models || [];
                          const newFallbacks = [
                            ...(editingConfig.fallbackModels || []),
                            { provider: newProvider, modelId: newModels[0]?.id || "gpt-4o" },
                          ];
                          setEditingConfig({ ...editingConfig, fallbackModels: newFallbacks });
                        }}
                        className="flex items-center gap-1 rounded-lg border border-dashed border-emerald-300 px-3 py-1.5 text-xs text-emerald-600 hover:border-emerald-400 hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                      >
                        <Plus className="h-3 w-3" />
                        {t("addFallback")}
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => saveConfig(editingConfig)}
                      disabled={isSaving}
                      className="gap-2"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {t("save")}
                    </Button>
                    <Button variant="outline" onClick={cancelEditing} disabled={isSaving}>
                      {t("cancel")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Multi-Model Review Section */}
      {multiModelConfig && (
        <div className="rounded-lg border border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-900/20">
          <div
            className="flex cursor-pointer items-center justify-between p-4"
            onClick={() => setMultiModelExpanded(!multiModelExpanded)}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/50">
                <Layers className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-zinc-900 dark:text-white">{t("multiModelReview")}</h3>
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    <Crown className="mr-1 inline h-3 w-3" />
                    Premium
                  </span>
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {t("modelsConfigured", { count: multiModelConfig.models.length })}
                </p>
              </div>
            </div>
            <ChevronDown
              className={cn(
                "h-5 w-5 text-zinc-400 transition-transform",
                multiModelExpanded && "rotate-180"
              )}
            />
          </div>

          {multiModelExpanded && (
            <div className="space-y-4 border-t border-violet-200 p-4 dark:border-violet-700">
              {/* Enable toggle */}
              <div className="flex items-center justify-between rounded-lg bg-white p-3 dark:bg-zinc-800">
                <span className="font-medium text-zinc-900 dark:text-white">{t("enableMultiModel")}</span>
                <button
                  onClick={() =>
                    setMultiModelConfig({
                      ...multiModelConfig,
                      isEnabled: !multiModelConfig.isEnabled,
                    })
                  }
                  className={cn(
                    "relative h-6 w-11 rounded-full transition-colors",
                    multiModelConfig.isEnabled ? "bg-violet-500" : "bg-zinc-300 dark:bg-zinc-600"
                  )}
                >
                  <span
                    className={cn(
                      "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                      multiModelConfig.isEnabled && "translate-x-5"
                    )}
                  />
                </button>
              </div>

              {/* Models list */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label className="text-sm font-medium">{t("reviewModels")}</Label>
                  <Button size="sm" variant="outline" onClick={addModelToMultiModel} className="gap-1">
                    <Plus className="h-4 w-4" />
                    {t("add")}
                  </Button>
                </div>
                <div className="space-y-2">
                  {multiModelConfig.models.map((model, index) => {
                    const providerModels =
                      models[model.provider]?.models ||
                      allAvailableModels
                        .filter((m) => m.provider === model.provider)
                        .map((m) => ({ id: m.modelId, name: m.name || m.modelId, tier: "quality" }));

                    return (
                      <div key={index} className="flex items-center gap-2 rounded-lg bg-white p-2 dark:bg-zinc-800">
                        <select
                          value={model.provider}
                          onChange={(e) => {
                            const newProvider = e.target.value;
                            const newModels = models[newProvider]?.models || [];
                            updateMultiModelModel(index, newProvider, newModels[0]?.id || "");
                          }}
                          className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
                        >
                          {providers.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={model.modelId}
                          onChange={(e) => updateMultiModelModel(index, model.provider, e.target.value)}
                          className="flex-1 rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
                        >
                          {providerModels.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => removeModelFromMultiModel(index)}
                          className="rounded p-1 text-zinc-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                  {multiModelConfig.models.length === 0 && (
                    <div className="rounded-lg border-2 border-dashed border-zinc-300 p-4 text-center text-sm text-zinc-500 dark:border-zinc-600">
                      {t("noModelsConfigured")}
                    </div>
                  )}
                </div>
              </div>

              {/* Synthesis model */}
              <div>
                <Label className="mb-2 block text-sm font-medium">{t("synthesisModel")}</Label>
                <div className="flex gap-2">
                  <select
                    value={multiModelConfig.synthesisProvider}
                    onChange={(e) =>
                      setMultiModelConfig({
                        ...multiModelConfig,
                        synthesisProvider: e.target.value,
                        synthesisModelId: models[e.target.value]?.models?.[0]?.id || multiModelConfig.synthesisModelId,
                      })
                    }
                    className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
                  >
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={multiModelConfig.synthesisModelId}
                    onChange={(e) =>
                      setMultiModelConfig({
                        ...multiModelConfig,
                        synthesisModelId: e.target.value,
                      })
                    }
                    className="flex-1 rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
                  >
                    {(
                      models[multiModelConfig.synthesisProvider]?.models ||
                      allAvailableModels
                        .filter((m) => m.provider === multiModelConfig.synthesisProvider)
                        .map((m) => ({ id: m.modelId, name: m.name || m.modelId }))
                    ).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Min models */}
              <div>
                <Label className="mb-2 block text-sm font-medium">{t("minModelsRequired")}</Label>
                <Input
                  type="number"
                  min={2}
                  max={5}
                  value={multiModelConfig.minModelsRequired}
                  onChange={(e) =>
                    setMultiModelConfig({
                      ...multiModelConfig,
                      minModelsRequired: parseInt(e.target.value) || 2,
                    })
                  }
                  className="w-24"
                />
              </div>

              {/* Save button */}
              <Button onClick={saveMultiModelConfig} disabled={isSavingMultiModel} className="w-full gap-2">
                {isSavingMultiModel ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {t("saveConfiguration")}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
