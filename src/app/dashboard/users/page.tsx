"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus } from "lucide-react";
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
  approveManagedMember,
  rejectManagedMember,
  type ManagedUser,
} from "@/api/admin-users";
import { useAuth } from "@/contexts/AuthContext";
import {
  AddUserWizard,
  type StaffCreateRole,
} from "@/components/admin/AddUserWizard";
import { ManagedUserDetails } from "@/components/admin/ManagedUserDetails";
import { MembersTable } from "@/components/admin/MembersTable";
import { OwnersSection, type FilterTab } from "@/components/admin/OwnersSection";

function editRoleFor(user: ManagedUser): StaffCreateRole {
  if (user.is_super_admin) return "super_admin";
  if (
    user.role === "admin" ||
    user.role === "trainer" ||
    user.role === "staff" ||
    user.role === "user"
  ) {
    return user.role;
  }
  return "user";
}

export default function UsersPage() {
  const { user, isLoading, isAdmin, isSuperAdmin } = useAuth();
  const router = useRouter();

  const [mainTab, setMainTab] = useState<"members" | "owners">(
    isSuperAdmin ? "owners" : "members",
  );

  const [members, setMembers] = useState<ManagedUser[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [membersLoading, setMembersLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [viewing, setViewing] = useState<ManagedUser | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    if (user && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [isLoading, isAdmin, user, router]);

  useEffect(() => {
    if (isSuperAdmin) setMainTab("owners");
  }, [isSuperAdmin]);

  const loadMembers = useCallback(async () => {
    if (!isAdmin) return;
    setMembersLoading(true);
    try {
      const data = await listManagedUsers();
      setMembers(data.users || []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load users");
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  }, [isAdmin]);

  const loadAdmins = useCallback(async () => {
    if (!isSuperAdmin) return;
    setOwnersLoading(true);
    setError(null);
    try {
      const data = await fetchPendingAdmins();
      setPending(data.pending || []);
      setApproved(data.approved || []);
      setRejected(data.rejected || []);
      setNotifications(data.notifications || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load owners");
    } finally {
      setOwnersLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!isAdmin || isLoading) return;
    void loadMembers();
  }, [isAdmin, isLoading, loadMembers]);

  useEffect(() => {
    if (isSuperAdmin && mainTab === "owners") void loadAdmins();
  }, [isSuperAdmin, mainTab, loadAdmins]);

  const nonTrainerMembers = useMemo(() => {
    const base = members.filter((row) => row.role !== "trainer");
    if (!isSuperAdmin) return base;
    // Platform view: admins + super admins only (no members/staff)
    return base.filter((row) => row.is_super_admin || row.role === "admin");
  }, [members, isSuperAdmin]);

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return nonTrainerMembers;
    return nonTrainerMembers.filter((row) =>
      [
        row.full_name,
        row.email,
        row.phone,
        row.role,
        row.is_super_admin ? "super admin" : "",
        row.staff_type,
        row.gym_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [nonTrainerMembers, memberSearch]);

  const openCreate = () => {
    setViewing(null);
    setEditing(null);
    setWizardOpen(true);
  };

  const openView = (row: ManagedUser) => {
    setViewing(row);
  };

  const openEdit = (row: ManagedUser) => {
    setViewing(null);
    setEditing(row);
    setWizardOpen(true);
  };

  const handleWizardOpenChange = (open: boolean) => {
    setWizardOpen(open);
    if (!open) setEditing(null);
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

  const wizardAllowedRoles: StaffCreateRole[] = editing
    ? [editRoleFor(editing)]
    : isSuperAdmin
      ? ["super_admin", "admin"]
      : ["admin", "staff"];

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
              ? "Approve gym owners and manage platform admins / super admins"
              : "Manage members, admins, and staff for your gym. Trainers are under Gym → Trainers."}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            {isSuperAdmin ? "Add platform user" : "Add user"}
          </Button>
        )}
      </div>

      {isSuperAdmin ? (
        <Tabs
          value={mainTab}
          onValueChange={(v) => setMainTab(v as "members" | "owners")}
        >
          <TabsList>
            <TabsTrigger value="owners">Gym owners</TabsTrigger>
            <TabsTrigger value="members">Admins & super admins</TabsTrigger>
          </TabsList>
          <TabsContent value="owners" className="mt-6">
            <OwnersSection
              loading={ownersLoading}
              error={error}
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
              notifications={notifications}
            />
          </TabsContent>
          <TabsContent value="members" className="mt-6">
            <MembersTable
              loading={membersLoading}
              members={filteredMembers}
              totalCount={nonTrainerMembers.length}
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
              title="Admins & super admins"
              description={
                memberSearch.trim()
                  ? `${filteredMembers.length} of ${nonTrainerMembers.length} platform admin(s)`
                  : `${nonTrainerMembers.length} platform admin(s)`
              }
              hidePending
            />
          </TabsContent>
        </Tabs>
      ) : (
        <MembersTable
          loading={membersLoading}
          members={filteredMembers}
          totalCount={nonTrainerMembers.length}
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

      {!wizardOpen && (
        <Sheet open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
          <SheetContent className="overflow-y-auto sm:max-w-xl">
            <SheetHeader>
              <SheetTitle>{viewing?.full_name || "User details"}</SheetTitle>
              <SheetDescription>
                Full profile from the database
                {viewing?.role ? ` · ${viewing.role}` : ""}
              </SheetDescription>
            </SheetHeader>
            {viewing && <ManagedUserDetails user={viewing} />}
            <SheetFooter className="mt-8">
              <Button variant="outline" onClick={() => setViewing(null)}>
                Close
              </Button>
              {viewing && (
                <Button type="button" onClick={() => openEdit(viewing)}>
                  Edit
                </Button>
              )}
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}

      <AddUserWizard
        key={editing?.user_id ?? "create-user"}
        open={wizardOpen}
        onOpenChange={handleWizardOpenChange}
        onCreated={() => void loadMembers()}
        allowedRoles={wizardAllowedRoles}
        defaultRole={
          editing
            ? editRoleFor(editing)
            : isSuperAdmin
              ? "admin"
              : "staff"
        }
        editUser={editing}
      />
    </div>
  );
}
