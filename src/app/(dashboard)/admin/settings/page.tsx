"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Key, Shield, AlertTriangle, CheckCircle, XCircle, Save, Eye, EyeOff, Bot, Zap, PlayCircle } from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface Setting {
  key: string;
  value: string;
  isSecret: boolean;
  hasValue: boolean;
}

const AI_PROVIDERS = {
  openai: {
    id: "openai",
    name: "OpenAI",
    description: "GPT-4o & GPT-4o-mini",
    tagline: "Speed & Versatility",
    keyName: "OPENAI_API_KEY",
    color: "emerald",
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic",
    description: "Claude Sonnet & Haiku",
    tagline: "Precision & Safety",
    keyName: "ANTHROPIC_API_KEY",
    color: "orange",
  },
  google: {
    id: "google",
    name: "Google AI",
    description: "Gemini 1.5 Pro & Flash",
    tagline: "Multimodal Power",
    keyName: "GOOGLE_AI_API_KEY",
    color: "blue",
  },
} as const;

const SETTING_LABELS: Record<string, { label: string; description: string; category: string; placeholder: string }> = {
  AI_PROVIDER: {
    label: "AI Provider",
    description: "Choose which AI provider to use for all AI features",
    category: "AI",
    placeholder: "",
  },
  OPENAI_API_KEY: {
    label: "OpenAI API Key",
    description: "Required when using OpenAI as provider",
    category: "AI",
    placeholder: "sk-...",
  },
  ANTHROPIC_API_KEY: {
    label: "Anthropic API Key",
    description: "Required when using Anthropic as provider",
    category: "AI",
    placeholder: "sk-ant-...",
  },
  GOOGLE_AI_API_KEY: {
    label: "Google AI API Key",
    description: "Required when using Google AI as provider",
    category: "AI",
    placeholder: "AIza...",
  },
  STRIPE_SECRET_KEY: {
    label: "Stripe Secret Key",
    description: "Server-side Stripe API key",
    category: "Stripe",
    placeholder: "sk_live_...",
  },
  STRIPE_WEBHOOK_SECRET: {
    label: "Stripe Webhook Secret",
    description: "For verifying webhook signatures",
    category: "Stripe",
    placeholder: "whsec_...",
  },
  STRIPE_PUBLISHABLE_KEY: {
    label: "Stripe Publishable Key",
    description: "Client-side Stripe key",
    category: "Stripe",
    placeholder: "pk_live_...",
  },
  STRIPE_PRO_PRICE_ID: {
    label: "Pro Plan Price ID",
    description: "Stripe price ID for Pro subscription",
    category: "Stripe",
    placeholder: "price_...",
  },
  STRIPE_PREMIUM_PRICE_ID: {
    label: "Premium Plan Price ID",
    description: "Stripe price ID for Premium subscription",
    category: "Stripe",
    placeholder: "price_...",
  },
  GOOGLE_CLIENT_ID: {
    label: "Google OAuth Client ID",
    description: "For Google Sign-In",
    category: "OAuth",
    placeholder: "xxxx.apps.googleusercontent.com",
  },
  GOOGLE_CLIENT_SECRET: {
    label: "Google OAuth Client Secret",
    description: "For Google Sign-In",
    category: "OAuth",
    placeholder: "GOCSPX-...",
  },
};

// Custom SVG icons for each provider
function OpenAIIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
    </svg>
  );
}

function AnthropicIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M13.827 3.52h3.603L24 20.48h-3.603l-6.57-16.96zm-7.258 0h3.767L16.906 20.48h-3.674l-1.343-3.461H5.017l-1.344 3.46H0L6.57 3.522zm2.327 10.2l-2.065-5.36-2.063 5.36h4.128z"/>
    </svg>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

const providerIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  openai: OpenAIIcon,
  anthropic: AnthropicIcon,
  google: GoogleIcon,
};

const colorClasses: Record<string, {
  selected: string;
  hover: string;
  icon: string;
  iconSelected: string;
  text: string;
  checkBg: string;
}> = {
  emerald: {
    selected: "border-emerald-500/50 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-lg shadow-emerald-500/10 dark:border-emerald-500/30 dark:from-emerald-950/40 dark:to-teal-950/40",
    hover: "from-emerald-500/5",
    icon: "group-hover:bg-emerald-100 group-hover:text-emerald-600 dark:group-hover:bg-emerald-900/50 dark:group-hover:text-emerald-400",
    iconSelected: "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30",
    text: "text-emerald-700 dark:text-emerald-300",
    checkBg: "bg-emerald-500 shadow-emerald-500/30",
  },
  orange: {
    selected: "border-orange-500/50 bg-gradient-to-br from-orange-50 to-amber-50 shadow-lg shadow-orange-500/10 dark:border-orange-500/30 dark:from-orange-950/40 dark:to-amber-950/40",
    hover: "from-orange-500/5",
    icon: "group-hover:bg-orange-100 group-hover:text-orange-600 dark:group-hover:bg-orange-900/50 dark:group-hover:text-orange-400",
    iconSelected: "bg-orange-500 text-white shadow-lg shadow-orange-500/30",
    text: "text-orange-700 dark:text-orange-300",
    checkBg: "bg-orange-500 shadow-orange-500/30",
  },
  blue: {
    selected: "border-blue-500/50 bg-gradient-to-br from-blue-50 to-sky-50 shadow-lg shadow-blue-500/10 dark:border-blue-500/30 dark:from-blue-950/40 dark:to-sky-950/40",
    hover: "from-blue-500/5",
    icon: "group-hover:bg-blue-100 group-hover:text-blue-600 dark:group-hover:bg-blue-900/50 dark:group-hover:text-blue-400",
    iconSelected: "bg-blue-500 text-white shadow-lg shadow-blue-500/30",
    text: "text-blue-700 dark:text-blue-300",
    checkBg: "bg-blue-500 shadow-blue-500/30",
  },
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [showValue, setShowValue] = useState<Record<string, boolean>>({});
  const [savingProvider, setSavingProvider] = useState(false);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string } | null>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.status === 403) {
        setError("You don't have admin access");
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to fetch settings");
      }
      const data = await res.json();
      setSettings(data);
    } catch {
      setError("Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  }

  async function saveSetting(key: string, value?: string) {
    const valueToSave = value ?? editValue;
    if (!valueToSave.trim()) return;

    setSavingKey(key);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: valueToSave }),
      });

      if (!res.ok) {
        throw new Error("Failed to save");
      }

      await fetchSettings();
      setEditingKey(null);
      setEditValue("");
    } catch (err) {
      console.error("Failed to save setting:", err);
      toast.error("Failed to save setting");
    } finally {
      setSavingKey(null);
    }
  }

  async function saveProvider(providerId: string) {
    setSavingProvider(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "AI_PROVIDER", value: providerId }),
      });

      if (!res.ok) {
        throw new Error("Failed to save");
      }

      await fetchSettings();
    } catch (err) {
      console.error("Failed to save provider:", err);
      toast.error("Failed to save provider");
    } finally {
      setSavingProvider(false);
    }
  }

  async function testApiKey(provider: string) {
    setTestingProvider(provider);
    setTestResults((prev) => ({ ...prev, [provider]: null }));

    try {
      const res = await fetch("/api/admin/test-api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });

      const data = await res.json();

      if (data.success) {
        setTestResults((prev) => ({
          ...prev,
          [provider]: { success: true, message: data.model || "Connected" },
        }));
        toast.success(`${provider.charAt(0).toUpperCase() + provider.slice(1)} API key is valid!`);
      } else {
        setTestResults((prev) => ({
          ...prev,
          [provider]: { success: false, message: data.error || "Test failed" },
        }));
        toast.error(data.error || "API key test failed");
      }
    } catch (err) {
      console.error("Test API key error:", err);
      setTestResults((prev) => ({
        ...prev,
        [provider]: { success: false, message: "Connection error" },
      }));
      toast.error("Failed to test API key");
    } finally {
      setTestingProvider(null);
    }
  }

  function startEditing(key: string) {
    setEditingKey(key);
    setEditValue("");
  }

  function cancelEditing() {
    setEditingKey(null);
    setEditValue("");
  }

  const currentProvider = settings.find(s => s.key === "AI_PROVIDER")?.value || "anthropic";

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl">
        <Card className="border-red-200 dark:border-red-900">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="mb-4 h-12 w-12 text-red-500" />
            <h2 className="mb-2 text-xl font-semibold text-red-600">{error}</h2>
            <p className="text-zinc-300">Only administrators can access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const categories = settings
    .filter(s => s.key !== "AI_PROVIDER")
    .reduce((acc, setting) => {
      const category = SETTING_LABELS[setting.key]?.category || "Other";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(setting);
      return acc;
    }, {} as Record<string, Setting[]>);

  const configuredCount = settings.filter((s) => s.hasValue).length;
  const totalCount = settings.length;

  const requiredKeyForProvider = currentProvider === "openai" ? "OPENAI_API_KEY" : currentProvider === "google" ? "GOOGLE_AI_API_KEY" : "ANTHROPIC_API_KEY";
  const hasRequiredKey = settings.find(s => s.key === requiredKeyForProvider)?.hasValue || false;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Shield className="h-6 w-6" />
          Admin Settings
        </h1>
        <p className="text-zinc-300 dark:text-zinc-300">
          Manage API keys and system configuration
        </p>
      </div>

      <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-900/20">
        <CardContent className="flex items-start gap-3 pt-4">
          <Key className="h-5 w-5 flex-shrink-0 text-blue-600" />
          <div>
            <p className="font-medium text-blue-800 dark:text-blue-200">
              Configuration Status: {configuredCount}/{totalCount} keys configured
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Click on any setting to add or update its value. Settings are stored securely in the database.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* AI Provider Selector - Premium Design */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-br from-zinc-50 via-white to-zinc-50 p-1 shadow-sm dark:border-zinc-800 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800">
        {/* Subtle decorative background */}
        <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        <div className="relative rounded-xl bg-white/80 p-6 backdrop-blur-sm dark:bg-zinc-900/80">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700">
                <Zap className="h-5 w-5 text-zinc-600 dark:text-zinc-300" />
              </div>
              <div>
                <h3 className="font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">AI Engine</h3>
                <p className="text-sm text-zinc-300 dark:text-zinc-300">Select your preferred AI provider</p>
              </div>
            </div>
            {savingProvider && (
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {Object.values(AI_PROVIDERS).map((provider) => {
              const isSelected = currentProvider === provider.id;
              const apiKeySetting = settings.find(s => s.key === provider.keyName);
              const hasApiKey = apiKeySetting?.hasValue || false;
              const Icon = providerIcons[provider.id];
              const colors = colorClasses[provider.color];
              const testResult = testResults[provider.id];
              const isTesting = testingProvider === provider.id;

              return (
                <div
                  key={provider.id}
                  className={`group relative overflow-hidden rounded-xl border-2 p-5 text-left transition-all duration-300 ${
                    isSelected
                      ? colors.selected
                      : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-800/50 dark:hover:border-zinc-600"
                  }`}
                >
                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute right-3 top-3">
                      <div className={`flex h-6 w-6 items-center justify-center rounded-full text-white shadow-lg ${colors.checkBg}`}>
                        <CheckCircle className="h-4 w-4" />
                      </div>
                    </div>
                  )}

                  {/* Hover glow effect */}
                  <div className={`absolute inset-0 opacity-0 transition-opacity duration-300 ${!isSelected && "group-hover:opacity-100"}`}>
                    <div className={`absolute inset-0 bg-gradient-to-br ${colors.hover} to-transparent`} />
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => !savingProvider && saveProvider(provider.id)}
                      disabled={savingProvider}
                      className="w-full text-left"
                    >
                      <div className="mb-4 flex items-center gap-3">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 ${
                          isSelected
                            ? colors.iconSelected
                            : `bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300 ${colors.icon}`
                        }`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div>
                          <p className={`text-lg font-semibold transition-colors ${isSelected ? colors.text : "text-zinc-900 dark:text-zinc-100"}`}>
                            {provider.name}
                          </p>
                          <p className="text-xs font-medium uppercase tracking-wider text-zinc-300 dark:text-zinc-300">
                            {provider.tagline}
                          </p>
                        </div>
                      </div>

                      <p className="mb-4 text-sm text-zinc-300 dark:text-zinc-300">
                        {provider.description}
                      </p>
                    </button>

                    <div className="flex items-center justify-between gap-2">
                      <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        hasApiKey
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                      }`}>
                        {hasApiKey ? (
                          <>
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Ready
                          </>
                        ) : (
                          <>
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                            Needs key
                          </>
                        )}
                      </div>

                      {/* Test Button */}
                      {hasApiKey && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            testApiKey(provider.id);
                          }}
                          disabled={isTesting}
                          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                            testResult?.success
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                              : testResult?.success === false
                              ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                          }`}
                        >
                          {isTesting ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : testResult?.success ? (
                            <CheckCircle className="h-3.5 w-3.5" />
                          ) : testResult?.success === false ? (
                            <XCircle className="h-3.5 w-3.5" />
                          ) : (
                            <PlayCircle className="h-3.5 w-3.5" />
                          )}
                          {isTesting ? "Testing..." : testResult ? (testResult.success ? "OK" : "Failed") : "Test"}
                        </button>
                      )}
                    </div>

                    {/* Test result message */}
                    {testResult && (
                      <p className={`mt-2 text-xs ${testResult.success ? "text-emerald-600" : "text-red-600"}`}>
                        {testResult.message}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {!hasRequiredKey && (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200/50 bg-gradient-to-r from-amber-50 to-orange-50 p-4 dark:border-amber-800/30 dark:from-amber-950/30 dark:to-orange-950/30">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">Configuration Required</p>
                <p className="mt-0.5 text-sm text-amber-700 dark:text-amber-300">
                  Add your <strong>{currentProvider === "openai" ? "OpenAI" : currentProvider === "anthropic" ? "Anthropic" : "Google AI"}</strong> API key below to start using AI features.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Settings - API Keys */}
      {categories["AI"] && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI API Keys
            </CardTitle>
            <CardDescription>
              Configure API keys for AI providers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {categories["AI"].map((setting) => {
                const info = SETTING_LABELS[setting.key];
                const isEditing = editingKey === setting.key;
                const isSaving = savingKey === setting.key;
                const isRequiredForCurrentProvider =
                  (currentProvider === "openai" && setting.key === "OPENAI_API_KEY") ||
                  (currentProvider === "anthropic" && setting.key === "ANTHROPIC_API_KEY") ||
                  (currentProvider === "google" && setting.key === "GOOGLE_AI_API_KEY");

                // Get provider for this key for test button
                const providerForKey = setting.key === "OPENAI_API_KEY" ? "openai" : setting.key === "ANTHROPIC_API_KEY" ? "anthropic" : setting.key === "GOOGLE_AI_API_KEY" ? "google" : null;
                const testResult = providerForKey ? testResults[providerForKey] : null;
                const isTesting = providerForKey === testingProvider;

                return (
                  <div
                    key={setting.key}
                    className={`py-4 first:pt-0 last:pb-0 transition-opacity ${isRequiredForCurrentProvider ? "" : "opacity-40"}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{info?.label || setting.key}</p>
                          {isRequiredForCurrentProvider && (
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              currentProvider === "openai"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                : currentProvider === "google"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                            }`}>
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-zinc-300">{info?.description}</p>

                        {isEditing ? (
                          <div className="mt-3 flex gap-2">
                            <div className="relative flex-1">
                              <Input
                                type={showValue[setting.key] ? "text" : "password"}
                                placeholder={info?.placeholder || "Enter value..."}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="pr-10"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => setShowValue(prev => ({ ...prev, [setting.key]: !prev[setting.key] }))}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-zinc-600"
                              >
                                {showValue[setting.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => saveSetting(setting.key)}
                              disabled={isSaving || !editValue.trim()}
                            >
                              {isSaving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEditing}
                              disabled={isSaving}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          setting.hasValue && (
                            <p className="mt-1 font-mono text-xs text-zinc-300">
                              {setting.value}
                            </p>
                          )
                        )}
                      </div>

                      {!isEditing && (
                        <div className="flex items-center gap-2">
                          {setting.hasValue ? (
                            <span className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              <CheckCircle className="h-4 w-4" />
                              Configured
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
                              <XCircle className="h-4 w-4" />
                              Missing
                            </span>
                          )}
                          {/* Test Button for AI keys */}
                          {setting.hasValue && providerForKey && (
                            <Button
                              size="sm"
                              variant={testResult?.success ? "default" : testResult?.success === false ? "destructive" : "outline"}
                              onClick={() => testApiKey(providerForKey)}
                              disabled={isTesting}
                              className={testResult?.success ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                            >
                              {isTesting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : testResult?.success ? (
                                <CheckCircle className="h-4 w-4" />
                              ) : testResult?.success === false ? (
                                <XCircle className="h-4 w-4" />
                              ) : (
                                <PlayCircle className="h-4 w-4" />
                              )}
                              <span className="ml-1">{isTesting ? "Testing" : testResult ? (testResult.success ? "OK" : "Failed") : "Test"}</span>
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEditing(setting.key)}
                          >
                            {setting.hasValue ? "Update" : "Add"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Other Settings (Stripe, OAuth) */}
      {Object.entries(categories)
        .filter(([category]) => category !== "AI")
        .map(([category, categorySettings]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                {category} Settings
              </CardTitle>
              <CardDescription>
                {category} integration configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {categorySettings.map((setting) => {
                  const info = SETTING_LABELS[setting.key];
                  const isEditing = editingKey === setting.key;
                  const isSaving = savingKey === setting.key;

                  return (
                    <div
                      key={setting.key}
                      className="py-4 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          <p className="font-medium">{info?.label || setting.key}</p>
                          <p className="text-sm text-zinc-300">{info?.description}</p>

                          {isEditing ? (
                            <div className="mt-3 flex gap-2">
                              <div className="relative flex-1">
                                <Input
                                  type={showValue[setting.key] ? "text" : "password"}
                                  placeholder={info?.placeholder || "Enter value..."}
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="pr-10"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowValue(prev => ({ ...prev, [setting.key]: !prev[setting.key] }))}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-zinc-600"
                                >
                                  {showValue[setting.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => saveSetting(setting.key)}
                                disabled={isSaving || !editValue.trim()}
                              >
                                {isSaving ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Save className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelEditing}
                                disabled={isSaving}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            setting.hasValue && (
                              <p className="mt-1 font-mono text-xs text-zinc-300">
                                {setting.value}
                              </p>
                            )
                          )}
                        </div>

                        {!isEditing && (
                          <div className="flex items-center gap-2">
                            {setting.hasValue ? (
                              <span className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                <CheckCircle className="h-4 w-4" />
                                Configured
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                <XCircle className="h-4 w-4" />
                                Missing
                              </span>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEditing(setting.key)}
                            >
                              {setting.hasValue ? "Update" : "Add"}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
    </div>
  );
}
