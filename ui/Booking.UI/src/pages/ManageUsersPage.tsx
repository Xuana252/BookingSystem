import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Filter,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";
import { getCurrentUserId, isAdmin } from "../lib/auth";
import { ApiError } from "../lib/apiClient";
import {
  activateUser,
  deactivateUser,
  demoteUser,
  getAllUsers,
  promoteUser,
} from "../lib/api";
import { type UserManagementItem, UserRole } from "../lib/types";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { UserModal } from "../components/UserModal";

type RoleFilter = "all" | "admin" | "employee";
type StatusFilter = "all" | "active" | "inactive";

function checkIsAdmin(user: UserManagementItem): boolean {
  return (
    user.role === UserRole.Admin ||
    user.role === 1 ||
    user.role === "Admin"
  );
}

export function ManageUsersPage() {
  const currentUserId = getCurrentUserId();
  const location = useLocation();
  const [users, setUsers] = useState<UserManagementItem[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(
    (location.state as { successMessage?: string } | null)?.successMessage ?? null
  );
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    if (location.state && typeof location.state === "object" && "successMessage" in location.state) {
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const loadUsers = useCallback(async () => {
    try {
      setError(null);
      const data = await getAllUsers();
      setUsers(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load users.");
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    loadUsers().finally(() => setIsLoading(false));
  }, [loadUsers]);

  async function handleToggleActive(user: UserManagementItem) {
    setActionLoadingId(user.id);
    setError(null);
    setSuccessMessage(null);
    try {
      if (user.isActive) {
        await deactivateUser(user.id);
        setSuccessMessage(`Account for "${user.username}" deactivated.`);
      } else {
        await activateUser(user.id);
        setSuccessMessage(`Account for "${user.username}" reactivated.`);
      }
      await loadUsers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update user status.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleToggleRole(user: UserManagementItem) {
    const userIsAdmin = checkIsAdmin(user);
    setActionLoadingId(user.id);
    setError(null);
    setSuccessMessage(null);
    try {
      if (userIsAdmin) {
        await demoteUser(user.id);
        setSuccessMessage(`"${user.username}" demoted to Employee.`);
      } else {
        await promoteUser(user.id);
        setSuccessMessage(`"${user.username}" promoted to Administrator.`);
      }
      await loadUsers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to change user role.");
    } finally {
      setActionLoadingId(null);
    }
  }

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());

      const userIsAdmin = checkIsAdmin(user);
      const matchesRole =
        roleFilter === "all" ||
        (roleFilter === "admin" && userIsAdmin) ||
        (roleFilter === "employee" && !userIsAdmin);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && user.isActive) ||
        (statusFilter === "inactive" && !user.isActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => checkIsAdmin(u)).length;
    const employees = total - admins;
    const active = users.filter((u) => u.isActive).length;
    const deactivated = total - active;
    return { total, admins, employees, active, deactivated };
  }, [users]);

  if (!isAdmin()) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldAlert className="size-6" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Access Restricted</h2>
        <p className="mt-1 text-xs text-muted-foreground">Only system administrators are authorized to manage user accounts.</p>
        <Link
          to="/"
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="size-3.5" />
          <span>Return to calendar</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <Link
            to="/"
            className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            <span>Back to calendar</span>
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-foreground">User Management</h1>
          <p className="text-xs text-muted-foreground">
            Manage employee access, promote or demote administrators, and toggle account activation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsLoading(true);
              loadUsers().finally(() => setIsLoading(false));
            }}
            disabled={isLoading}
            className="gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <button
            onClick={() => setIsUserModalOpen(true)}
            className="inline-flex h-7 items-center justify-center gap-1.5 rounded-md bg-gradient-to-r from-primary to-indigo-600 px-2.5 text-[0.8rem] font-medium text-primary-foreground shadow-sm shadow-primary/25 hover:opacity-95"
          >
            <UserPlus className="size-4" />
            <span>Create User</span>
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="size-4 text-primary" />
            <span>Total Accounts</span>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">{stats.total}</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="size-4 text-indigo-500" />
            <span>Administrators</span>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
            {stats.admins}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="size-4 text-emerald-500" />
            <span>Active</span>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {stats.active}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <UserX className="size-4 text-destructive" />
            <span>Deactivated</span>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-destructive">
            {stats.deactivated}
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between shadow-xs">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by username or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-muted/40"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Role Filter */}
          <div className="flex items-center rounded-lg border border-border bg-muted p-1">
            <Filter className="ml-1 mr-1.5 size-3.5 text-muted-foreground" />
            {(
              [
                { id: "all", label: "All Roles" },
                { id: "admin", label: "Admins" },
                { id: "employee", label: "Employees" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRoleFilter(tab.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  roleFilter === tab.id
                    ? "bg-card text-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center rounded-lg border border-border bg-muted p-1">
            {(
              [
                { id: "all", label: "All Status" },
                { id: "active", label: "Active" },
                { id: "inactive", label: "Deactivated" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  statusFilter === tab.id
                    ? "bg-card text-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
        {isLoading ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center p-8 text-muted-foreground">
            <Loader2 className="mb-2 size-6 animate-spin text-primary" />
            <span className="text-xs">Loading user accounts...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex min-h-[250px] flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <Users className="mb-2 size-8 text-muted-foreground/60" />
            <p className="text-sm font-medium text-foreground">No users found</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {searchQuery ? "Try refining your search term." : "No accounts match the current filters."}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setIsUserModalOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium shadow-xs hover:bg-muted"
              >
                <UserPlus className="size-3.5" />
                <span>Create User</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3.5">User</th>
                  <th className="px-4 py-3.5">Email</th>
                  <th className="px-4 py-3.5">Role</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.map((user) => {
                  const userIsAdmin = checkIsAdmin(user);
                  const isCurrent = user.id === currentUserId;
                  const isPending = actionLoadingId === user.id;

                  return (
                    <tr
                      key={user.id}
                      className={`transition-colors hover:bg-muted/40 ${
                        !user.isActive ? "bg-muted/20 opacity-75" : ""
                      }`}
                    >
                      {/* User Column */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-xs ${
                              userIsAdmin ? "bg-indigo-600" : "bg-primary"
                            }`}
                          >
                            {user.username[0]?.toUpperCase() ?? "U"}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 font-semibold text-foreground">
                              <span className="truncate">{user.username}</span>
                              {isCurrent && (
                                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-normal">
                                  You
                                </Badge>
                              )}
                            </div>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              ID: {user.id.slice(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Email Column */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Mail className="size-3.5 shrink-0" />
                          <span className="truncate">{user.email || "No email"}</span>
                        </div>
                      </td>

                      {/* Role Column */}
                      <td className="px-4 py-3.5">
                        <Badge
                          variant={userIsAdmin ? "indigo" : "secondary"}
                          className="gap-1 text-[11px] font-medium"
                        >
                          {userIsAdmin ? (
                            <>
                              <Shield className="size-3 text-indigo-600 dark:text-indigo-400" />
                              <span>Administrator</span>
                            </>
                          ) : (
                            <>
                              <User className="size-3 text-muted-foreground" />
                              <span>Employee</span>
                            </>
                          )}
                        </Badge>
                      </td>

                      {/* Status Column */}
                      <td className="px-4 py-3.5">
                        <Badge
                          variant={user.isActive ? "default" : "destructive"}
                          className={`gap-1 text-[11px] ${
                            user.isActive
                              ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/20"
                              : "bg-destructive/15 text-destructive border-destructive/20"
                          }`}
                        >
                          {user.isActive ? (
                            <>
                              <CheckCircle2 className="size-3" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <UserX className="size-3" />
                              <span>Deactivated</span>
                            </>
                          )}
                        </Badge>
                      </td>

                      {/* Actions Column */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Role Toggle Action */}
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isPending}
                            onClick={() => handleToggleRole(user)}
                            className="h-7 gap-1 px-2.5 text-[11px]"
                            title={
                              userIsAdmin
                                ? "Demote to standard Employee"
                                : "Promote to Administrator"
                            }
                          >
                            {isPending ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : userIsAdmin ? (
                              <>
                                <UserMinus className="size-3 text-amber-600 dark:text-amber-400" />
                                <span>Demote</span>
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="size-3 text-indigo-600 dark:text-indigo-400" />
                                <span>Make Admin</span>
                              </>
                            )}
                          </Button>

                          {/* Status Toggle Action */}
                          <Button
                            variant={user.isActive ? "outline" : "default"}
                            size="sm"
                            disabled={isPending}
                            onClick={() => handleToggleActive(user)}
                            className={`h-7 gap-1 px-2.5 text-[11px] ${
                              user.isActive
                                ? "text-destructive hover:bg-destructive/10 hover:text-destructive border-border"
                                : "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
                            }`}
                            title={
                              user.isActive
                                ? "Deactivate user account"
                                : "Reactivate user account"
                            }
                          >
                            {isPending ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : user.isActive ? (
                              <>
                                <UserX className="size-3" />
                                <span>Deactivate</span>
                              </>
                            ) : (
                              <>
                                <UserCheck className="size-3" />
                                <span>Reactivate</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onSuccess={(msg) => {
          setIsUserModalOpen(false);
          setSuccessMessage(msg);
          loadUsers();
        }}
      />
    </div>
  );
}
