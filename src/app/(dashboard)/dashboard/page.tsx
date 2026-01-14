import { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Plus, FileText, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Dashboard - Resumeyro",
  description: "Manage your resumes and create new ones",
};

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            {t("subtitle")}
          </p>
        </div>
        <Button asChild>
          <Link href="/resumes/new">
            <Plus className="mr-2 h-4 w-4" />
            {t("newResume")}
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("totalResumes")}</CardTitle>
            <FileText className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-zinc-500">1 {t("availableOnFreePlan")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("aiGenerations")}</CardTitle>
            <Sparkles className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0/3</div>
            <p className="text-xs text-zinc-500">{t("usedThisMonth")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("profileScore")}</CardTitle>
            <TrendingUp className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-zinc-500">{t("completeResumeToSee")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("currentPlan")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{t("free")}</div>
            <Link
              href="/billing"
              className="text-xs text-zinc-500 hover:text-zinc-900 hover:underline dark:hover:text-zinc-50"
            >
              {t("upgradeToPro")}
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Resumes */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">{t("recentResumes")}</h2>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
              <FileText className="h-6 w-6 text-zinc-500" />
            </div>
            <CardTitle className="mb-2 text-lg">{t("noResumesYet")}</CardTitle>
            <CardDescription className="mb-4 text-center">
              {t("createFirstResume")}
            </CardDescription>
            <Button asChild>
              <Link href="/resumes/new">
                <Plus className="mr-2 h-4 w-4" />
                {t("createResume")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">{t("quickActions")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
            <Link href="/resumes/new">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Plus className="h-5 w-5" />
                  {t("createFromScratch")}
                </CardTitle>
                <CardDescription>
                  {t("startBlankCanvas")}
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>
          <Card className="cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
            <Link href="/templates">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-5 w-5" />
                  {t("browseTemplates")}
                </CardTitle>
                <CardDescription>
                  {t("chooseProfessionalDesigns")}
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>
          <Card className="cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
            <Link href="/resumes/import">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-5 w-5" />
                  {t("importPdf")}
                </CardTitle>
                <CardDescription>
                  {t("parseWithAi")}
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
