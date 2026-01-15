import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Plus, FileText, Sparkles, TrendingUp, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Dashboard - Resumeyro",
  description: "Manage your resumes and create new ones",
};

// Plan limits
const PLAN_LIMITS = {
  FREE: { resumes: 1, aiGenerations: 3 },
  PRO: { resumes: 10, aiGenerations: 50 },
  PREMIUM: { resumes: -1, aiGenerations: -1 }, // unlimited
};

async function getDashboardData(userId: string) {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [
    resumeCount,
    recentResumes,
    aiGenerationsUsage,
    subscription,
    latestReview,
  ] = await Promise.all([
    // Total resumes count
    db.resume.count({ where: { userId } }),
    // Recent 5 resumes
    db.resume.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        thumbnail: true,
        updatedAt: true,
      },
    }),
    // AI generations this month
    db.usageRecord.findFirst({
      where: {
        userId,
        type: "AI_GENERATION",
        periodStart: { gte: periodStart },
        periodEnd: { lte: periodEnd },
      },
    }),
    // User subscription
    db.subscription.findUnique({
      where: { userId },
      select: { plan: true, status: true },
    }),
    // Latest AI review score
    db.aIReview.findFirst({
      where: { resume: { userId } },
      orderBy: { createdAt: "desc" },
      select: { score: true },
    }),
  ]);

  const plan = subscription?.plan ?? "FREE";
  const limits = PLAN_LIMITS[plan];
  const aiGenerationsCount = aiGenerationsUsage?.count ?? 0;

  return {
    resumeCount,
    recentResumes,
    aiGenerationsCount,
    aiGenerationsLimit: limits.aiGenerations,
    resumeLimit: limits.resumes,
    plan,
    profileScore: latestReview?.score ?? null,
  };
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const t = await getTranslations("dashboard");
  const data = await getDashboardData(session.user.id);

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
            <div className="text-2xl font-bold">{data.resumeCount}</div>
            <p className="text-xs text-zinc-500">
              {data.resumeLimit === -1
                ? t("unlimited")
                : `${data.resumeLimit} ${t("availableOnPlan")}`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("aiGenerations")}</CardTitle>
            <Sparkles className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.aiGenerationsLimit === -1
                ? data.aiGenerationsCount
                : `${data.aiGenerationsCount}/${data.aiGenerationsLimit}`}
            </div>
            <p className="text-xs text-zinc-500">{t("usedThisMonth")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("profileScore")}</CardTitle>
            <TrendingUp className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.profileScore !== null ? `${data.profileScore}/100` : "--"}
            </div>
            <p className="text-xs text-zinc-500">
              {data.profileScore !== null ? t("latestReview") : t("completeResumeToSee")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("currentPlan")}</CardTitle>
            {data.plan !== "FREE" && <Crown className="h-4 w-4 text-amber-500" />}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{t(data.plan.toLowerCase())}</div>
            {data.plan === "FREE" ? (
              <Link
                href="/billing"
                className="text-xs text-zinc-500 hover:text-zinc-900 hover:underline dark:hover:text-zinc-50"
              >
                {t("upgradeToPro")}
              </Link>
            ) : (
              <Link
                href="/billing"
                className="text-xs text-zinc-500 hover:text-zinc-900 hover:underline dark:hover:text-zinc-50"
              >
                {t("managePlan")}
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Resumes */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">{t("recentResumes")}</h2>
        {data.recentResumes.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.recentResumes.map((resume) => (
              <Card key={resume.id} className="group overflow-hidden transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <Link href={`/resumes/${resume.id}`}>
                  <div className="aspect-[3/4] relative bg-zinc-100 dark:bg-zinc-800">
                    {resume.thumbnail ? (
                      <img
                        src={resume.thumbnail}
                        alt={resume.title}
                        className="h-full w-full object-cover object-top"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <FileText className="h-12 w-12 text-zinc-300 dark:text-zinc-600" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <CardTitle className="truncate text-sm font-medium">{resume.title}</CardTitle>
                    <CardDescription className="text-xs">
                      {new Date(resume.updatedAt).toLocaleDateString()}
                    </CardDescription>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        ) : (
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
        )}
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
