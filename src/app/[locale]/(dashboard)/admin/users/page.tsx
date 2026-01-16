"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Users,
  Search,
  Loader2,
  AlertTriangle,
  Crown,
  Shield,
  TrendingUp,
  TrendingDown,
  Sparkles,
  FileText,
  Zap,
  DollarSign,
  Gift,
  ChevronDown,
  Check,
  X,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UserStats {
  resumeCount: number;
  aiGenerations: number;
  aiReviews: number;
  pdfParses: number;
  pdfExports: number;
}

interface UserFinancials {
  revenue: number;
  cost: number;
  profit: number;
  isAdminGranted: boolean;
}

interface UserSubscription {
  id: string;
  plan: string;
  status: string;
  grantedByAdmin: boolean;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: string | null;
}

interface UserData {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: "USER" | "ADMIN";
  createdAt: string;
  subscription: UserSubscription | null;
  stats: UserStats;
  financials: UserFinancials;
  planLimits: {
    maxResumes: number;
    aiGenerationsPerMonth: number;
    aiReviewsPerMonth: number;
  } | null;
}

interface PlanOption {
  key: string;
  name: string;
  price: number;
}

interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);

  // Edit states
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [savingUser, setSavingUser] = useState<string | null>(null);
  const [resettingUser, setResettingUser] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Record<string, { role?: string; plan?: string }>>({})

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Summary stats
  const summaryStats = useMemo(() => {
    const totalUsers = pagination?.totalCount || 0;
    const totalRevenue = users.reduce((sum, u) => sum + u.financials.revenue, 0);
    const totalCost = users.reduce((sum, u) => sum + u.financials.cost, 0);
    const totalProfit = users.reduce((sum, u) => sum + u.financials.profit, 0);
    const adminGrantedCount = users.filter((u) => u.financials.isAdminGranted).length;

    return { totalUsers, totalRevenue, totalCost, totalProfit, adminGrantedCount };
  }, [users, pagination]);

  useEffect(() => {
    fetchUsers();
  }, [page, search, planFilter, roleFilter]);

  function showSuccess(message: string) {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  }

  async function fetchUsers() {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(search && { search }),
        ...(planFilter && { plan: planFilter }),
        ...(roleFilter && { role: roleFilter }),
      });

      const res = await fetch(`/api/admin/users?${params}`);
      if (res.status === 403) {
        setError("Admin access required");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch users");

      const data = await res.json();
      setUsers(data.users || []);
      setPlans(data.plans || []);
      setPagination(data.pagination);
    } catch {
      setError("Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }

  async function saveUserChanges(userId: string) {
    const changes = pendingChanges[userId];
    if (!changes) return;

    setSavingUser(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...changes }),
      });

      if (!res.ok) throw new Error("Failed to update user");

      showSuccess("User updated successfully");
      setPendingChanges((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      setEditingUser(null);
      fetchUsers();
    } catch {
      setError("Failed to update user");
    } finally {
      setSavingUser(null);
    }
  }

  async function resetUserLimits(userId: string, userEmail: string) {
    if (!confirm(`Reset all usage limits for ${userEmail}? This will reset AI generations, reviews, PDF parses, and exports to 0.`)) {
      return;
    }

    setResettingUser(userId);
    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to reset limits");

      const data = await res.json();
      showSuccess(`Reset ${data.deletedCount} usage records`);
      fetchUsers();
    } catch {
      setError("Failed to reset user limits");
    } finally {
      setResettingUser(null);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  function handleRoleChange(userId: string, role: string) {
    setPendingChanges((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], role },
    }));
  }

  function handlePlanChange(userId: string, plan: string) {
    setPendingChanges((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], plan },
    }));
  }

  function cancelChanges(userId: string) {
    setPendingChanges((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
    setEditingUser(null);
  }

  const getPlanBadgeColor = (plan: string, isAdminGranted: boolean) => {
    if (isAdminGranted) return "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 border-violet-200 dark:border-violet-800";
    switch (plan) {
      case "PREMIUM":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case "PRO":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      default:
        return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700";
    }
  };

  if (isLoading && users.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (error && users.length === 0) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20">
        <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
        <h2 className="mt-2 text-lg font-semibold text-red-700 dark:text-red-400">
          {error}
        </h2>
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
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
          <Users className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            User Management
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Manage users, subscriptions, and view financial metrics
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">{summaryStats.totalUsers}</p>
              <p className="text-xs text-zinc-500">Total Users</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">${summaryStats.totalRevenue.toFixed(2)}</p>
              <p className="text-xs text-zinc-500">Revenue (page)</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
              <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">${summaryStats.totalCost.toFixed(4)}</p>
              <p className="text-xs text-zinc-500">Costs (page)</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              summaryStats.totalProfit >= 0
                ? "bg-emerald-100 dark:bg-emerald-900/30"
                : "bg-red-100 dark:bg-red-900/30"
            )}>
              <TrendingUp className={cn(
                "h-5 w-5",
                summaryStats.totalProfit >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              )} />
            </div>
            <div>
              <p className={cn(
                "text-2xl font-bold",
                summaryStats.totalProfit >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              )}>
                ${summaryStats.totalProfit.toFixed(2)}
              </p>
              <p className="text-xs text-zinc-500">Profit (page)</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-900/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <Gift className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-violet-700 dark:text-violet-300">{summaryStats.adminGrantedCount}</p>
              <p className="text-xs text-violet-600 dark:text-violet-400">Admin Granted</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <form onSubmit={handleSearch} className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by email or name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-10 w-full rounded-lg border border-zinc-200 bg-zinc-50 pl-10 pr-4 text-sm outline-none transition-colors focus:border-violet-500 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-violet-500 dark:focus:bg-zinc-900"
            />
          </div>
          <Button type="submit" size="sm" variant="outline">
            Search
          </Button>
        </form>

        <div className="flex items-center gap-2">
          <select
            value={planFilter}
            onChange={(e) => {
              setPlanFilter(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none transition-colors focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value="">All Plans</option>
            {plans.map((p) => (
              <option key={p.key} value={p.key}>{p.name}</option>
            ))}
          </select>

          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none transition-colors focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value="">All Roles</option>
            <option value="USER">User</option>
            <option value="ADMIN">Admin</option>
          </select>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchUsers()}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Plan</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-zinc-500">Usage</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">Revenue</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">Cost</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">Profit</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {users.map((user) => {
                const isEditing = editingUser === user.id;
                const isSaving = savingUser === user.id;
                const changes = pendingChanges[user.id];
                const currentRole = changes?.role || user.role;
                const currentPlan = changes?.plan || user.subscription?.plan || "FREE";
                const hasChanges = !!changes;

                return (
                  <tr
                    key={user.id}
                    className={cn(
                      "transition-colors",
                      isEditing && "bg-violet-50/50 dark:bg-violet-900/10"
                    )}
                  >
                    {/* User Info */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {user.image ? (
                          <img
                            src={user.image}
                            alt=""
                            className="h-9 w-9 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-sm font-medium text-white">
                            {user.email[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-white">
                            {user.name || "—"}
                          </p>
                          <p className="text-xs text-zinc-500">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <select
                          value={currentRole}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className="h-8 rounded-lg border border-zinc-200 bg-white px-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                        >
                          <option value="USER">User</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      ) : (
                        <span className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
                          user.role === "ADMIN"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        )}>
                          {user.role === "ADMIN" && <Shield className="h-3 w-3" />}
                          {user.role}
                        </span>
                      )}
                    </td>

                    {/* Plan */}
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <select
                          value={currentPlan}
                          onChange={(e) => handlePlanChange(user.id, e.target.value)}
                          className="h-8 rounded-lg border border-zinc-200 bg-white px-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                        >
                          {plans.map((p) => (
                            <option key={p.key} value={p.key}>{p.name}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium",
                            getPlanBadgeColor(user.subscription?.plan || "FREE", user.financials.isAdminGranted)
                          )}>
                            {user.subscription?.plan === "PREMIUM" && <Crown className="h-3 w-3" />}
                            {user.financials.isAdminGranted && <Gift className="h-3 w-3" />}
                            {user.subscription?.plan || "FREE"}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Usage */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-4 text-xs">
                        <div className="flex items-center gap-1" title="Resumes">
                          <FileText className="h-3.5 w-3.5 text-zinc-400" />
                          <span className="text-zinc-600 dark:text-zinc-400">{user.stats.resumeCount}</span>
                        </div>
                        <div className="flex items-center gap-1" title="AI Generations">
                          <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                          <span className="text-zinc-600 dark:text-zinc-400">{user.stats.aiGenerations}</span>
                        </div>
                        <div className="flex items-center gap-1" title="AI Reviews">
                          <Zap className="h-3.5 w-3.5 text-amber-400" />
                          <span className="text-zinc-600 dark:text-zinc-400">{user.stats.aiReviews}</span>
                        </div>
                      </div>
                    </td>

                    {/* Revenue */}
                    <td className="px-4 py-3 text-right">
                      <span className={cn(
                        "text-sm font-medium",
                        user.financials.isAdminGranted
                          ? "text-zinc-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      )}>
                        {user.financials.isAdminGranted ? (
                          <span className="flex items-center justify-end gap-1">
                            <Gift className="h-3 w-3" />
                            $0
                          </span>
                        ) : (
                          `$${user.financials.revenue.toFixed(2)}`
                        )}
                      </span>
                    </td>

                    {/* Cost */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-medium text-red-600 dark:text-red-400">
                        ${user.financials.cost.toFixed(4)}
                      </span>
                    </td>

                    {/* Profit */}
                    <td className="px-4 py-3 text-right">
                      <span className={cn(
                        "text-sm font-medium",
                        user.financials.profit >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      )}>
                        ${user.financials.profit.toFixed(2)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {isEditing ? (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => cancelChanges(user.id)}
                              disabled={isSaving}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => saveUserChanges(user.id)}
                              disabled={isSaving || !hasChanges}
                              className="h-8 gap-1 px-2"
                            >
                              {isSaving ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                              Save
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingUser(user.id)}
                              className="h-8"
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => resetUserLimits(user.id, user.email)}
                              disabled={resettingUser === user.id}
                              className="h-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:text-amber-300 dark:hover:bg-amber-900/20"
                              title="Reset usage limits"
                            >
                              {resettingUser === user.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800/50">
            <p className="text-sm text-zinc-500">
              Showing {((page - 1) * pagination.limit) + 1} to {Math.min(page * pagination.limit, pagination.totalCount)} of {pagination.totalCount} users
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <span className="text-sm text-zinc-500">
                Page {page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= pagination.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-900/20">
        <div className="flex items-start gap-3">
          <Gift className="mt-0.5 h-5 w-5 text-violet-600 dark:text-violet-400" />
          <div className="text-sm text-violet-800 dark:text-violet-200">
            <p className="font-medium">Admin-granted subscriptions</p>
            <p className="mt-1 text-violet-700 dark:text-violet-300">
              When you change a user's plan from this page, it's marked as "admin-granted" and doesn't count as revenue.
              This helps track actual paid vs. gifted subscriptions in financial metrics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
