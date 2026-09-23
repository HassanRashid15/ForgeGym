"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Mail, Loader2, Eye, Archive, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getContactMessages,
  updateContactMessageStatus,
  type ContactMessage,
} from "@/api/contact-messages";
import { toast } from "sonner";

/**
 * Dashboard card: messages submitted via /contact (not membership approvals).
 */
export function ContactMessagesCard() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["contactMessages"],
    queryFn: () => getContactMessages({ status: "all", limit: 20 }),
    refetchInterval: 15_000,
  });

  const messages = query.data?.messages || [];
  const newCount = query.data?.newCount ?? 0;

  async function setStatus(id: string, status: ContactMessage["status"]) {
    setActingId(id);
    try {
      await updateContactMessageStatus(id, status);
      await queryClient.invalidateQueries({ queryKey: ["contactMessages"] });
      if (selected?.id === id) {
        setSelected((prev) => (prev ? { ...prev, status } : null));
      }
      toast.success(status === "archived" ? "Archived" : "Marked as read");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setActingId(null);
    }
  }

  async function openMessage(msg: ContactMessage) {
    setSelected(msg);
    if (msg.status === "new") {
      void setStatus(msg.id, "read");
    }
  }

  return (
    <>
      <section className="rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-500/10 via-card to-card p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-sky-600" />
            <h2 className="text-lg font-semibold text-foreground">
              Contact messages
            </h2>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                newCount > 0
                  ? "bg-sky-500/20 text-sky-700 dark:text-sky-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {newCount} new
            </span>
          </div>
          <p className="hidden text-xs text-muted-foreground sm:block">
            From /contact form · not membership approvals
          </p>
        </div>

        {query.isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/70 py-8 text-center text-sm text-muted-foreground">
            No contact messages yet. Submissions from the contact page appear
            here.
          </p>
        ) : (
          <div className="space-y-2">
            {messages.slice(0, 5).map((msg) => (
              <button
                key={msg.id}
                type="button"
                onClick={() => void openMessage(msg)}
                className="flex w-full items-start justify-between gap-3 rounded-lg border border-border/60 bg-card/50 p-3 text-left transition-colors hover:bg-muted/40"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium text-foreground">
                      {msg.name}
                    </p>
                    {msg.status === "new" && (
                      <Badge className="bg-sky-600/15 text-sky-700 hover:bg-sky-600/15 dark:text-sky-400">
                        New
                      </Badge>
                    )}
                    <Badge variant="secondary" className="truncate">
                      {msg.subject}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {msg.email}
                    {msg.phone ? ` · ${msg.phone}` : ""}
                  </p>
                  <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                    {msg.message}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(msg.created_at), "MMM d · h:mm a")}
                  </span>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-4 pr-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Contact inquiry
                </p>
                <h3 className="mt-1 text-xl font-semibold">{selected.subject}</h3>
              </div>

              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">From:</span>{" "}
                  <span className="font-medium">{selected.name}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Email:</span>{" "}
                  <a
                    href={`mailto:${selected.email}`}
                    className="text-primary hover:underline"
                  >
                    {selected.email}
                  </a>
                </p>
                {selected.phone && (
                  <p>
                    <span className="text-muted-foreground">Phone:</span>{" "}
                    <a
                      href={`tel:${selected.phone.replace(/[^\d+]/g, "")}`}
                      className="text-primary hover:underline"
                    >
                      {selected.phone}
                    </a>
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {format(
                    new Date(selected.created_at),
                    "MMM d, yyyy · h:mm a",
                  )}
                </p>
              </div>

              <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {selected.message}
                </p>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={() => setSelected(null)}>
                  Close
                </Button>
                <Button asChild variant="secondary">
                  <a href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject)}`}>
                    Reply by email
                  </a>
                </Button>
                <Button
                  variant="outline"
                  disabled={actingId === selected.id}
                  onClick={() => void setStatus(selected.id, "archived")}
                >
                  {actingId === selected.id ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Archive className="mr-1 h-4 w-4" />
                  )}
                  Archive
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
