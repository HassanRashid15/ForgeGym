"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Phone,
  Calendar,
  Shield,
  Loader2,
  CheckCircle2,
  XCircle,
  MapPin,
  Building2,
  Plus,
  Pencil,
  Trash2,
  Users,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import {
  approveAdminAccount,
  rejectAdminAccount,
  fetchPendingAdmins,
  type AdminListItem,
} from "@/api/auth";
import {
  deleteManagedUser,
  listManagedUsers,
  updateManagedUser,
  approveManagedMember,
  rejectManagedMember,
  type ManagedUser,
} from "@/api/admin-users";
import { useAuth } from "@/contexts/AuthContext";
import { AddUserWizard } from "@/components/admin/AddUserWizard";

type FilterTab = "all" | "pending" | "approved" | "rejected";

type UserFormState = {
  full_name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  membership_status: string;
  membership_type: string;
  role: "user" | "moderator" | "admin" | "trainer" | "staff";
};

const emptyForm: UserFormState = {
  full_name: "",
  email: "",
  password: "",
  phone: "",
  address: "",
  membership_status: "active",
  membership_type: "basic",
  role: "staff",
};

function getStatus(admin: AdminListItem): "pending" | "approved" | "rejected" {
  if (admin.status) return admin.status;
  if (admin.admin_approved) return "approved";
  if (admin.admin_rejected_at) return "rejected";
  return "pending";
}

export default function UsersPage() {
  const { user, isLoading, isAdmin, isSuperAdmin } = useAuth();
  const router = useRouter();

  const [mainTab, setMainTab] = useState<"members" | "owners">(
    isSuperAdmin ? "owners" : "members",
  );

  // Members CRUD
  const [members, setMembers] = useState<ManagedUser[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [membersLoading, setMembersLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [viewing, setViewing] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Gym owner approvals (super admin)
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [pending, setPending] = useState<AdminListItem[]>([]);
  const [approved, setApproved] = useState<AdminListItem[]>([]);
  const [rejected, setRejected] = useState<AdminListItem[]>([]);
  const [notifications, setNotifications] = useState<
    Array<{ id: string; title: string; message: string; created_at: string }>
  >([]);
  const [ownersLoading, setOwnersLoading] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [memberApprovingId, setMemberApprovingId] = useState<string | null>(null);
  const [memberRejectingId, setMemberRejectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    // Wait for user to exist — don't bounce while role is still hydrating
    if (user && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [isLoading, isAdmin, user, router]);

  useEffect(() => {
    setMainTab((prev) => {
      const next = isSuperAdmin ? "owners" : "members";
      return prev === next ? prev : next;
    });
  }, [isSuperAdmin]);

  const loadMembers = useCallback(async () => {
    if (!isAdmin) return;
    setMembersLoading(true);
    try {
      const data = await listManagedUsers();
      setMembers(data.users || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load users";
      toast.error(message);
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || isLoading) return;
    void loadMembers();
  }, [isAdmin, isLoading, loadMembers]);

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return members;
    return members.filter((row) =>
      [
        row.full_name,
        row.email,
        row.phone,
        row.role,
        row.staff_type,
        row.specialization,
        row.membership_type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [members, memberSearch]);

  const loadAdmins = useCallback(async () => {
    if (!isSuperAdmin) return;
    setOwnersLoading(true);
    setError(null);
    try {
      const data = await fetchPendingAdmins();
      setPending(data.pending || []);
      setApproved(data.approved || []);
      setRejected(data.rejected || []);
      setNotifications((data.notifications as Array<{ id: string; title: string; message: string; created_at: string }>) || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load admins";
      setPending([]);
      setApproved([]);
      setRejected([]);
      setNotifications([]);
      setError(message);
    } finally {
      setOwnersLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (isSuperAdmin && mainTab === "owners") void loadAdmins();
  }, [isSuperAdmin, mainTab, loadAdmins]);

  const openCreate = () => {
    setWizardOpen(true);
  };

  const openView = (row: ManagedUser) => {
    setViewing(row);
  };

  const openEdit = (row: ManagedUser) => {
    setEditing(row);
    setForm({
      full_name: row.full_name || "",
      email: row.email || "",
      password: "",
      phone: row.phone || "",
      address: row.address || "",
      membership_status: row.account_status || row.membership_status || "active",
      membership_type: row.membership_type || "basic",
      role: row.role,
    });
    setSheetOpen(true);
  };

  const handleSaveUser = async () => {
    if (!form.full_name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!editing) return;
    setSaving(true);
    try {
      await updateManagedUser({
        userId: editing.user_id,
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        membership_status: form.membership_status,
        membership_type: form.membership_type,
        account_status: form.membership_status,
        ...(editing.user_id === user?.id ? {} : { role: form.role }),
      });
      toast.success("User updated");
      setSheetOpen(false);
      await loadMembers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (row: ManagedUser) => {
    if (row.user_id === user?.id) {
      toast.error("You cannot delete your own account");
      return;
    }
    if (!window.confirm(`Delete ${row.full_name || row.email}? This cannot be undone.`)) {
      return;
    }
    setDeletingId(row.user_id);
    try {
      await deleteManagedUser(row.user_id);
      toast.success("User deleted");
      await loadMembers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const handleApprove = async (userId: string) => {
    setApprovingId(userId);
    try {
      await approveAdminAccount(userId);
      toast.success("Admin approved — they can sign in now.");
      await loadAdmins();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to approve admin");
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (userId: string) => {
    setRejectingId(userId);
    try {
      await rejectAdminAccount(userId);
      toast.success("Admin request rejected.");
      await loadAdmins();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to reject admin");
    } finally {
      setRejectingId(null);
    }
  };

  const handleApproveMember = async (userId: string) => {
    setMemberApprovingId(userId);
    try {
      await approveManagedMember(userId);
      toast.success("Member approved — they can sign in now.");
      await loadMembers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to approve member");
    } finally {
      setMemberApprovingId(null);
    }
  };

  const handleRejectMember = async (userId: string) => {
    setMemberRejectingId(userId);
    try {
      await rejectManagedMember(userId);
      toast.success("Membership request rejected.");
      await loadMembers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to reject member");
    } finally {
      setMemberRejectingId(null);
    }
  };

  const allAdmins = useMemo(
    () => [...pending, ...approved, ...rejected],
    [pending, approved, rejected],
  );

  const filteredOwners = useMemo(() => {
    const source =
      filter === "pending"
        ? pending
        : filter === "approved"
          ? approved
          : filter === "rejected"
            ? rejected
            : allAdmins;

    const q = searchQuery.trim().toLowerCase();
    if (!q) return source;

    return source.filter((admin) => {
      const haystack = [
        admin.full_name,
        admin.email,
        admin.phone,
        admin.gym_name,
        admin.gym_city,
        admin.gym_type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [filter, pending, approved, rejected, allAdmins, searchQuery]);

  if (isLoading || !isAdmin) {
    return (
      <div className="flex min-h-[320px] items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="mt-1 text-muted-foreground">
            {isSuperAdmin
              ? "Platform users and gym-owner approvals"
              : "Manage your gym only — Admin, Trainer, Staff, and Members"}
          </p>
        </div>
        {isAdmin && (mainTab === "members" || !isSuperAdmin) && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add admin / trainer / staff
          </Button>
        )}
      </div>

      {isSuperAdmin ? (
        <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as "members" | "owners")}>
          <TabsList>
            <TabsTrigger value="owners">Gym owners</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
          </TabsList>
          <TabsContent value="owners" className="mt-6 space-y-6">
            <OwnersSection
              loading={ownersLoading}
              error={error}
              notifications={notifications}
              filter={filter}
              setFilter={setFilter}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              pendingCount={pending.length}
              approvedCount={approved.length}
              rejectedCount={rejected.length}
              filtered={filteredOwners}
              approvingId={approvingId}
              rejectingId={rejectingId}
              onApprove={handleApprove}
              onReject={handleReject}
              onRefresh={loadAdmins}
            />
          </TabsContent>
          <TabsContent value="members" className="mt-6">
            <MembersTable
              loading={membersLoading}
              members={filteredMembers}
              totalCount={members.length}
              search={memberSearch}
              setSearch={setMemberSearch}
              currentUserId={user?.id}
              deletingId={deletingId}
              approvingId={memberApprovingId}
              rejectingId={memberRejectingId}
              onView={openView}
              onEdit={openEdit}
              onDelete={handleDeleteUser}
              onApproveMember={handleApproveMember}
              onRejectMember={handleRejectMember}
              showRole
            />
          </TabsContent>
        </Tabs>
      ) : (
        <MembersTable
          loading={membersLoading}
          members={filteredMembers}
          totalCount={members.length}
          search={memberSearch}
          setSearch={setMemberSearch}
          currentUserId={user?.id}
          deletingId={deletingId}
          approvingId={memberApprovingId}
          rejectingId={memberRejectingId}
          onView={openView}
          onEdit={openEdit}
          onDelete={handleDeleteUser}
          onApproveMember={handleApproveMember}
          onRejectMember={handleRejectMember}
          showRole
        />
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Edit user</SheetTitle>
            <SheetDescription>
              Update profile and membership details stored in the database.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="membership_type">Plan</Label>
                <Input
                  id="membership_type"
                  value={form.membership_type}
                  onChange={(e) => setForm({ ...form, membership_type: e.target.value })}
                  placeholder="basic / premium / staff"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="membership_status">Status</Label>
                <Input
                  id="membership_status"
                  value={form.membership_status}
                  onChange={(e) => setForm({ ...form, membership_status: e.target.value })}
                  placeholder="active / inactive"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                value={form.role}
                disabled={editing?.user_id === user?.id}
                onChange={(e) =>
                  setForm({
                    ...form,
                    role: e.target.value as UserFormState["role"],
                  })
                }
                placeholder="user / trainer / staff / admin"
              />
              {editing?.user_id === user?.id && (
                <p className="text-xs text-muted-foreground">
                  You can edit your profile, but not change or delete your own admin account.
                </p>
              )}
            </div>
          </div>
          <SheetFooter className="mt-8">
            <Button variant="outline" onClick={() => setSheetOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveUser} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>User details</SheetTitle>
            <SheetDescription>Read-only profile from the database</SheetDescription>
          </SheetHeader>
          {viewing && (
            <div className="mt-6 space-y-3 text-sm">
              <DetailRow label="Name" value={viewing.full_name} />
              <DetailRow label="Email" value={viewing.email} />
              <DetailRow label="Phone" value={viewing.phone} />
              <DetailRow label="Address" value={viewing.address} />
              <DetailRow label="Role" value={viewing.role} />
              <DetailRow
                label="Status"
                value={viewing.account_status || viewing.membership_status}
              />
              <DetailRow label="Plan" value={viewing.membership_type} />
              {viewing.staff_type && (
                <DetailRow label="Staff type" value={viewing.staff_type} />
              )}
              {viewing.specialization && (
                <DetailRow label="Specialization" value={viewing.specialization} />
              )}
              {viewing.department && (
                <DetailRow label="Department" value={viewing.department} />
              )}
              {viewing.employment_type && (
                <DetailRow label="Employment" value={viewing.employment_type} />
              )}
              {viewing.gym_name && <DetailRow label="Gym" value={viewing.gym_name} />}
              {viewing.role === "staff" && (
                <DetailRow
                  label="Login"
                  value={viewing.login_enabled === false ? "Disabled" : "Enabled"}
                />
              )}
              <DetailRow
                label="Joined"
                value={
                  viewing.join_date
                    ? new Date(viewing.join_date).toLocaleDateString()
                    : null
                }
              />
            </div>
          )}
          <SheetFooter className="mt-8">
            <Button variant="outline" onClick={() => setViewing(null)}>
              Close
            </Button>
            {viewing && (
              <Button
                onClick={() => {
                  const row = viewing;
                  setViewing(null);
                  openEdit(row);
                }}
              >
                Edit
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AddUserWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onCreated={() => void loadMembers()}
      />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/40 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[60%] text-right font-medium capitalize">
        {value || "—"}
      </span>
    </div>
  );
}

function MembersTable({
  loading,
  members,
  totalCount,
  search,
  setSearch,
  currentUserId,
  deletingId,
  approvingId,
  rejectingId,
  onView,
  onEdit,
  onDelete,
  onApproveMember,
  onRejectMember,
  showRole,
}: {
  loading: boolean;
  members: ManagedUser[];
  totalCount: number;
  search: string;
  setSearch: (v: string) => void;
  currentUserId?: string;
  deletingId: string | null;
  approvingId: string | null;
  rejectingId: string | null;
  onView: (row: ManagedUser) => void;
  onEdit: (row: ManagedUser) => void;
  onDelete: (row: ManagedUser) => void;
  onApproveMember: (userId: string) => void;
  onRejectMember: (userId: string) => void;
  showRole: boolean;
}) {
  const pendingMembers = members.filter(
    (m) =>
      m.role === "user" &&
      m.admin_approved !== true &&
      (m.membership_status === "pending" || m.account_status === "pending"),
  );

  return (
    <div className="space-y-6">
      {pendingMembers.length > 0 && (
        <Card className="border-amber-500/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-amber-500" />
              Pending memberships ({pendingMembers.length})
            </CardTitle>
            <CardDescription>
              Customers who registered for your gym and are waiting for approval
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingMembers.map((row) => (
              <div
                key={row.user_id}
                className="flex flex-col gap-3 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{row.full_name || "—"}</p>
                  <p className="text-sm text-muted-foreground">{row.email || "—"}</p>
                  {row.phone && (
                    <p className="text-xs text-muted-foreground">{row.phone}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="gap-1"
                    disabled={approvingId === row.user_id || rejectingId === row.user_id}
                    onClick={() => onApproveMember(row.user_id)}
                  >
                    {approvingId === row.user_id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-destructive"
                    disabled={approvingId === row.user_id || rejectingId === row.user_id}
                    onClick={() => onRejectMember(row.user_id)}
                  >
                    {rejectingId === row.user_id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5" />
                    )}
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

    <Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Staff & members
          </CardTitle>
          <CardDescription>
            {search.trim()
              ? `${members.length} of ${totalCount} account(s)`
              : `${totalCount} account(s) from the database`}
          </CardDescription>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email…"
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : members.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  {showRole && <TableHead>Role</TableHead>}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((row) => {
                  const isSelf = row.user_id === currentUserId;
                  const isPendingMember =
                    row.role === "user" &&
                    row.admin_approved !== true &&
                    (row.membership_status === "pending" ||
                      row.account_status === "pending");
                  return (
                  <TableRow key={row.user_id}>
                    <TableCell className="font-medium">
                      {row.full_name || "—"}
                      {isSelf && (
                        <Badge variant="secondary" className="ml-2 text-[10px]">
                          You
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{row.email || "—"}</TableCell>
                    <TableCell>{row.phone || "—"}</TableCell>
                    <TableCell className="capitalize">
                      {row.role === "staff"
                        ? row.staff_type || "Staff"
                        : row.specialization || row.membership_type || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {isPendingMember
                          ? "pending approval"
                          : row.account_status || row.membership_status || "—"}
                      </Badge>
                      {row.role === "staff" && row.login_enabled === false && (
                        <Badge variant="secondary" className="ml-1 text-[10px]">
                          No login
                        </Badge>
                      )}
                    </TableCell>
                    {showRole && (
                      <TableCell>
                        <Badge
                          className={
                            row.role === "admin"
                              ? "bg-red-600 text-white capitalize"
                              : row.role === "trainer"
                                ? "bg-sky-600 text-white capitalize"
                                : row.role === "staff"
                                  ? "bg-amber-600 text-white capitalize"
                                  : "capitalize"
                          }
                          variant={row.role === "user" ? "outline" : "default"}
                        >
                          {row.role}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {isPendingMember && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-emerald-600"
                              disabled={approvingId === row.user_id}
                              onClick={() => onApproveMember(row.user_id)}
                              title="Approve"
                            >
                              {approvingId === row.user_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive"
                              disabled={rejectingId === row.user_id}
                              onClick={() => onRejectMember(row.user_id)}
                              title="Reject"
                            >
                              {rejectingId === row.user_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <XCircle className="h-4 w-4" />
                              )}
                            </Button>
                          </>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onView(row)}
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onEdit(row)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {!isSelf && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive"
                            disabled={deletingId === row.user_id}
                            onClick={() => onDelete(row)}
                            title="Delete"
                          >
                            {deletingId === row.user_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
}

function OwnersSection({
  loading,
  error,
  notifications,
  filter,
  setFilter,
  searchQuery,
  setSearchQuery,
  pendingCount,
  approvedCount,
  rejectedCount,
  filtered,
  approvingId,
  rejectingId,
  onApprove,
  onReject,
  onRefresh,
}: {
  loading: boolean;
  error: string | null;
  notifications: Array<{ id: string; title: string; message: string; created_at: string }>;
  filter: FilterTab;
  setFilter: (v: FilterTab) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  filtered: AdminListItem[];
  approvingId: string | null;
  rejectingId: string | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-6">
      {error && (
        <Card className="border-destructive/40">
          <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {notifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent approval requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {notifications.slice(0, 5).map((n) => (
              <div key={n.id} className="rounded-lg border p-3 text-sm">
                <p className="font-medium">{n.title}</p>
                <p className="text-muted-foreground">{n.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "All"],
              ["pending", `Pending (${pendingCount})`],
              ["approved", `Approved (${approvedCount})`],
              ["rejected", `Rejected (${rejectedCount})`],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              size="sm"
              variant={filter === key ? "default" : "outline"}
              onClick={() => setFilter(key)}
            >
              {label}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={onRefresh}>
            Refresh
          </Button>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search gym owners…"
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No gym owner accounts match.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Owner</TableHead>
                    <TableHead>Gym</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((admin) => {
                    const status = getStatus(admin);
                    return (
                      <TableRow key={admin.user_id}>
                        <TableCell>
                          <div className="font-medium">{admin.full_name || "—"}</div>
                          <div className="text-xs text-muted-foreground">{admin.email}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            {admin.gym_name || "—"}
                          </div>
                          {(admin.gym_city || admin.gym_type) && (
                            <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                              {admin.gym_city && (
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {admin.gym_city}
                                </span>
                              )}
                              {admin.gym_type && <span>{admin.gym_type}</span>}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {admin.phone ? (
                            <span className="inline-flex items-center gap-1 text-sm">
                              <Phone className="h-3.5 w-3.5" />
                              {admin.phone}
                            </span>
                          ) : (
                            "—"
                          )}
                          {admin.created_at && (
                            <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {new Date(admin.created_at).toLocaleDateString()}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              status === "approved"
                                ? "bg-emerald-500 text-white"
                                : status === "rejected"
                                  ? "bg-zinc-600 text-white"
                                  : "bg-amber-500 text-white"
                            }
                          >
                            <Shield className="mr-1 h-3 w-3" />
                            {status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {status !== "approved" && (
                            <Button
                              size="sm"
                              className="mr-2"
                              disabled={approvingId === admin.user_id}
                              onClick={() => onApprove(admin.user_id)}
                            >
                              {approvingId === admin.user_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle2 className="mr-1 h-4 w-4" />
                                  Approve
                                </>
                              )}
                            </Button>
                          )}
                          {status !== "rejected" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={rejectingId === admin.user_id}
                              onClick={() => onReject(admin.user_id)}
                            >
                              {rejectingId === admin.user_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <XCircle className="mr-1 h-4 w-4" />
                                  Reject
                                </>
                              )}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
