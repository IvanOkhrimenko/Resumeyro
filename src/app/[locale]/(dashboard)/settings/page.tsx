"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, User, Globe, Shield, Trash2 } from "lucide-react";

export default function SettingsPage() {
  const t = useTranslations("settings");
  const locale = useLocale();
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isChangingLocale, setIsChangingLocale] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (session?.user?.name) {
      setName(session.user.name);
    }
  }, [session]);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (res.ok) {
        await updateSession({ name });
        setMessage({ type: "success", text: "Profile updated successfully" });
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to update profile" });
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleChangeLocale(newLocale: string) {
    if (newLocale === locale) return;

    setIsChangingLocale(true);
    try {
      await fetch("/api/user/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: newLocale }),
      });
      router.refresh();
    } catch (error) {
      console.error("Failed to change locale:", error);
    } finally {
      setIsChangingLocale(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          {t("subtitle")}
        </p>
      </div>

      {message && (
        <div
          className={`rounded-lg p-3 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
              : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
          <CardDescription>
            Update your personal information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                value={session?.user?.email || ""}
                disabled
                className="bg-zinc-50 dark:bg-zinc-900"
              />
              <p className="text-xs text-zinc-500">
                {t("emailCannotChange")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">{t("fullName")}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                disabled={isLoading}
              />
            </div>

            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("saveChanges")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t("preferences")}
          </CardTitle>
          <CardDescription>
            {t("preferencesDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("language")}</Label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleChangeLocale("en")}
                disabled={isChangingLocale}
                className={locale === "en" ? "border-zinc-900 dark:border-white ring-2 ring-zinc-900 dark:ring-white" : ""}
              >
                {isChangingLocale && locale !== "en" ? (
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                ) : null}
                {t("english")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleChangeLocale("uk")}
                disabled={isChangingLocale}
                className={locale === "uk" ? "border-zinc-900 dark:border-white ring-2 ring-zinc-900 dark:ring-white" : ""}
              >
                {isChangingLocale && locale !== "uk" ? (
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                ) : null}
                {t("ukrainian")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t("security")}
          </CardTitle>
          <CardDescription>
            {t("securityDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t("changePassword")}</p>
              <p className="text-sm text-zinc-500">
                {t("changePasswordDesc")}
              </p>
            </div>
            <Button variant="outline" disabled>
              {t("changePassword")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-200 dark:border-red-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <Trash2 className="h-5 w-5" />
            {t("dangerZone")}
          </CardTitle>
          <CardDescription>
            {t("dangerZoneDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t("deleteAccount")}</p>
              <p className="text-sm text-zinc-500">
                {t("deleteAccountDesc")}
              </p>
            </div>
            <Button variant="destructive" disabled>
              {t("deleteAccount")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
