"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HandCoins, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  fetchPlatformFeeConcessions,
  resolvePlatformFeeConcession,
  type PlatformFeeConcessionItem,
} from "@/api/auth";
import { queryKeys } from "@/lib/query-keys";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function SuperAdminFeeConcessions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [actingId, setActingId] = useState<string | null>(null);
  const instanceId = useRef(Math.random().toString(36).slice(2, 9));

  const query = useQuery({
    queryKey: queryKeys.platformFeeConcessions,
    queryFn: fetchPlatformFeeConcessions,
    staleTime: 2_000,
    refetchInterval: 4_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase.channel(
      `fee-concessions:${user.id}:${instanceId.current}`,
    );
    let timer: ReturnType<typeof setTimeout> | null = null;

    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        void queryClient.invalidateQueries({
          queryKey: queryKeys.platformFeeConcessions,
        });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.pendingAdmins,
        });
      }, 400);
    };

    channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_notifications" },
        refresh,
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const rows = query.data?.concessions ?? [];

  /** Prefer stored concession amount; if it equals offered fee and note is numeric, use note. */
  const requestedAmount = (row: PlatformFeeConcessionItem) => {
    const offered = (row.platform_monthly_fee || "").trim().replace(/^\$/, "");
    const asked = (row.platform_fee_concession_amount || "")
      .trim()
      .replace(/^\$/, "");
    const note = (row.platform_fee_concession_note || "").trim();
    if ((!asked || asked === offered) && /^\d+(\.\d+)?$/.test(note)) {
      return note;
    }
    return asked || null;
  };

  const reasonText = (row: PlatformFeeConcessionItem) => {
    const note = (row.platform_fee_concession_note || "").trim();
    if (!note) return null;
    if (requestedAmount(row) === note && /^\d+(\.\d+)?$/.test(note)) {
      return null;
    }
    return note;
  };

  const resolve = async (
    row: PlatformFeeConcessionItem,
    decision: "accept" | "reject",
  ) => {
    setActingId(row.user_id);
    try {
      const wants = requestedAmount(row);
      await resolvePlatformFeeConcession(
        row.user_id,
        decision,
        decision === "accept" ? wants || undefined : undefined,
      );
      toast.success(
        decision === "accept"
          ? `Concession approved — $${wants}/mo + 1-month access started.`
          : "Concession rejected — owner can accept original fee or request again.",
      );
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.platformFeeConcessions,
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.pendingAdmins }),
        queryClient.invalidateQueries({ queryKey: queryKeys.membershipFees }),
      ]);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to resolve concession",
      );
    } finally {
      setActingId(null);
    }
  };

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-3 flex items-center gap-2">
        <HandCoins className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Fee concessions
        </h2>
        {query.isFetching && !query.isPending ? (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      {query.isPending && rows.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading…
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No concession requests right now.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const busy = actingId === row.user_id;
            return (
              <li key={row.user_id} className="space-y-2 rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {row.full_name || row.email || "Owner"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {row.gym_name
                      ? `${row.gym_name}${row.gym_city ? ` · ${row.gym_city}` : ""}`
                      : row.email}
                  </p>
                  <p className="mt-1 text-xs text-foreground">
                    Offered{" "}
                    <span className="font-semibold">
                      ${row.platform_monthly_fee || "—"}
                    </span>
                    {" → "}
                    wants{" "}
                    <span className="font-semibold text-primary">
                      ${requestedAmount(row) || "—"}
                    </span>
                    /mo
                  </p>
                  {reasonText(row) ? (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      “{reasonText(row)}”
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    className="h-8 flex-1 gap-1"
                    disabled={busy || !!actingId}
                    onClick={() => void resolve(row, "accept")}
                  >
                    {busy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 flex-1 gap-1"
                    disabled={busy || !!actingId}
                    onClick={() => void resolve(row, "reject")}
                  >
                    <X className="h-3.5 w-3.5" />
                    Reject
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
