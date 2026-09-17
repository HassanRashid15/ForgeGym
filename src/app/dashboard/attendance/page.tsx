"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableRowSkeleton } from "@/components/loading/TableRowSkeleton";
import { format } from "date-fns";

type Checkin = {
  id: string;
  user_id: string;
  checked_in_at: string;
  source: string;
};

export default function AttendancePage() {
  const [rows, setRows] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/attendance?scope=gym", { credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok) setRows(data.checkins || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Clock className="h-6 w-6 text-primary" />
          Attendance
        </h1>
        <p className="text-sm text-muted-foreground">Recent member check-ins at your gym.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent check-ins</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableRowSkeleton rows={5} columns={2} />
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No check-ins yet.</p>
          ) : (
            <ul className="space-y-2">
              {rows.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                >
                  <span className="font-mono text-xs text-muted-foreground">
                    {r.user_id.slice(0, 8)}…
                  </span>
                  <span>{format(new Date(r.checked_in_at), "MMM d, yyyy · HH:mm")}</span>
                  <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase">
                    {r.source}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
