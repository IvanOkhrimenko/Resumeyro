"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  FileText,
  Palette,
  Settings,
  CreditCard,
  Sparkles,
  Wand2,
  Shield,
  Cpu,
  ToggleLeft,
  Layers,
  Calculator,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const [isAdmin, setIsAdmin] = useState(false);

  const navigation = [
    { name: t("dashboard"), href: "/dashboard", icon: LayoutDashboard },
    { name: t("resumes"), href: "/resumes", icon: FileText },
    { name: t("templates"), href: "/templates", icon: Palette },
    { name: t("aiAssistant"), href: "/ai", icon: Sparkles },
    { name: t("aiBuilder"), href: "/ai-builder", icon: Wand2 },
  ];

  const secondaryNavigation = [
    { name: t("settings"), href: "/settings", icon: Settings },
    { name: t("billing"), href: "/billing", icon: CreditCard },
  ];

  const adminNavigation = [
    { name: t("adminSettings"), href: "/admin/settings", icon: Shield },
    { name: t("aiTasks"), href: "/admin/ai-tasks", icon: Cpu },
    { name: t("features"), href: "/admin/features", icon: ToggleLeft },
    { name: t("plans"), href: "/admin/plans", icon: Layers },
    { name: t("pricingModel"), href: "/admin/pricing-model", icon: Calculator },
  ];

  useEffect(() => {
    fetch("/api/user/role")
      .then((res) => res.json())
      .then((data) => setIsAdmin(data.role === "ADMIN"))
      .catch(() => setIsAdmin(false));
  }, []);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col overflow-y-auto border-r border-zinc-200 bg-white transition-transform duration-300 dark:border-zinc-800 dark:bg-zinc-950 md:static md:z-auto md:h-full md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800 md:hidden">
          <span className="font-bold">{t("menu")}</span>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-50"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
          <nav className="space-y-1">
            {secondaryNavigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-50"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {isAdmin && (
          <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
            <p className="mb-2 px-3 text-xs font-semibold uppercase text-zinc-400">{t("admin")}</p>
            <nav className="space-y-1">
              {adminNavigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-50"
                        : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-50"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </aside>
    </>
  );
}
