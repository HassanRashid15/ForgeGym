"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  deleteManagedUser,
  listManagedUsers,
  type ManagedUser,
} from "@/api/admin-users";
import { useAuth } from "@/contexts/AuthContext";
import { AddUserWizard } from "@/components/admin/AddUserWizard";
import { ManagedUserDetails } from "@/components/admin/ManagedUserDetails";
import { MembersTable } from "@/components/admin/MembersTable";
import { queryKeys } from "@/lib/query-keys";
import { TableRowSkeleton } from "@/components/loading/TableRowSkeleton";

export default function TrainersPage() {
  const { user, isLoading, isAdmin } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [viewing, setViewing] = useState<ManagedUser | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (user && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [isLoading, isAdmin, user, router]);

  const usersQuery = useQuery({
    queryKey: queryKeys.managedUsers,
    queryFn: async () => {
      const data = await listManagedUsers();
      return data.users || [];
    },
    enabled: isAdmin && !isLoading,
  });

  const trainers = useMemo(
    () => (usersQuery.data || []).filter((row) => row.role === "trainer"),
    [usersQuery.data],
  );
  const loading = usersQuery.isPending && !usersQuery.data;

  const invalidateUsers = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.managedUsers });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return trainers;
    return trainers.filter((row) =>
      [row.full_name, row.email, row.phone, row.specialization]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [trainers, search]);

  const openCreate = () => {
    setViewing(null);
    setEditing(null);
    setWizardOpen(true);
  };

  /** Unmount view sheet first — two Radix dialogs race and dismiss the edit modal. */
  const openEdit = (row: ManagedUser) => {
    setViewing(null);
    setEditing(row);
    setWizardOpen(true);
  };

  const handleWizardOpenChange = (open: boolean) => {
    setWizardOpen(open);
    if (!open) setEditing(null);
  };

  const handleDelete = async (row: ManagedUser) => {
    if (!window.confirm(`Remove trainer ${row.full_name || row.email}?`)) return;
    setDeletingId(row.user_id);
    try {
      await deleteManagedUser(row.user_id);
      toast.success("Trainer removed");
      await invalidateUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 animate-pulse bg-primary/10 rounded" />
            <div className="h-4 w-64 animate-pulse bg-primary/10 rounded" />
          </div>
          <div className="h-10 w-32 animate-pulse bg-primary/10 rounded" />
        </div>
        <TableRowSkeleton rows={5} columns={4} />
      </div>
    );
  }

  if (!isAdmin) {
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
          <h1 className="text-3xl font-bold tracking-tight">Trainers</h1>
          <p className="mt-1 text-muted-foreground">
            Add and manage trainers for your gym only.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add trainer
        </Button>
      </div>

      <MembersTable
        loading={loading}
        members={filtered}
        totalCount={trainers.length}
        search={search}
        setSearch={setSearch}
        currentUserId={user?.id}
        deletingId={deletingId}
        approvingId={null}
        rejectingId={null}
        onView={setViewing}
        onEdit={openEdit}
        onDelete={handleDelete}
        onApproveMember={() => undefined}
        onRejectMember={() => undefined}
        showRole={false}
        hidePending
        title="Gym trainers"
        description={
          search.trim()
            ? `${filtered.length} of ${trainers.length} trainer(s)`
            : `${trainers.length} trainer(s) linked to your gym`
        }
      />

      {!wizardOpen && (
        <Sheet
          open={!!viewing}
          onOpenChange={(open) => {
            if (!open) setViewing(null);
          }}
        >
          <SheetContent className="overflow-y-auto sm:max-w-xl">
            <SheetHeader>
              <SheetTitle>{viewing?.full_name || "Trainer"}</SheetTitle>
              <SheetDescription>Full trainer profile from the database</SheetDescription>
            </SheetHeader>
            {viewing && <ManagedUserDetails user={viewing} />}
            <SheetFooter className="mt-6">
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
        key={editing?.user_id ?? "create-trainer"}
        open={wizardOpen}
        onOpenChange={handleWizardOpenChange}
        onCreated={() => void invalidateUsers()}
        allowedRoles={["trainer"]}
        defaultRole="trainer"
        editUser={editing}
      />
    </div>
  );
}
