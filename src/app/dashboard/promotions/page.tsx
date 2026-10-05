"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Megaphone,
  Plus,
  RefreshCw,
  Trash2,
  Send,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TableRowSkeleton } from "@/components/loading/TableRowSkeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { ApiError } from "@/api/client";
import {
  listAdminPromotions,
  createAdminPromotion,
  updateAdminPromotion,
  deleteAdminPromotion,
  getPromotionEmailLogs,
  uploadPromotionImage,
  type Promotion,
} from "@/api/promotions";

function promoLifecycle(
  p: Promotion,
  nowMs: number = Date.now(),
): "Draft" | "Scheduled" | "Live" | "Ended" {
  if (!p.is_published) return "Draft";
  if (p.starts_at && new Date(p.starts_at).getTime() > nowMs) return "Scheduled";
  if (p.ends_at && new Date(p.ends_at).getTime() < nowMs) return "Ended";
  return "Live";
}

/** Compact remaining/elapsed duration, e.g. 1d 2h · 5m 12s · 8s */
function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(Math.abs(ms) / 1000));
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m ${String(secs).padStart(2, "0")}s`;
  return `${secs}s`;
}

/** Live schedule line: countdown to start, then to end, then ended. */
function promoScheduleLabel(p: Promotion, nowMs: number): string | null {
  const startMs = p.starts_at ? new Date(p.starts_at).getTime() : null;
  const endMs = p.ends_at ? new Date(p.ends_at).getTime() : null;
  if (startMs == null && endMs == null) return null;

  if (startMs != null && startMs > nowMs) {
    return `Starts in ${formatCountdown(startMs - nowMs)} · ${format(new Date(startMs), "MMM d HH:mm")}`;
  }
  if (endMs != null && endMs > nowMs) {
    return `Ends in ${formatCountdown(endMs - nowMs)} · ${format(new Date(endMs), "MMM d HH:mm")}`;
  }
  if (endMs != null && endMs <= nowMs) {
    return `Ended ${formatCountdown(nowMs - endMs)} ago · ${format(new Date(endMs), "MMM d HH:mm")}`;
  }
  if (startMs != null) {
    return `Started ${format(new Date(startMs), "MMM d HH:mm")}`;
  }
  return null;
}

const emptyForm = {
  title: "",
  body: "",
  ctaLabel: "",
  ctaHref: "",
  imageUrl: "",
  startsAt: "",
  endsAt: "",
  isPublished: true,
  showOnHome: true,
  sendEmail: true,
};

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [logPromoId, setLogPromoId] = useState<string | null>(null);
  const [emailLogs, setEmailLogs] = useState<
    { recipient_email: string; status: string; sent_at: string; error_message: string | null }[]
  >([]);
  const [logLoading, setLogLoading] = useState(false);
  /** Tick so Scheduled → Live → Ended updates without refreshing */
  const [nowMs, setNowMs] = useState(() => Date.now());

  const fetchPromotions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listAdminPromotions();
      setPromotions(data.promotions || []);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to load promotions",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPromotions();
  }, [fetchPromotions]);

  useEffect(() => {
    const needsClock = promotions.some(
      (p) => p.is_published && (p.starts_at || p.ends_at),
    );
    if (!needsClock) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [promotions]);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  }

  function startCreate() {
    if (showForm && !editingId) {
      resetForm();
      return;
    }
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function startEdit(p: Promotion) {
    setEditingId(p.id);
    setForm({
      title: p.title,
      body: p.body,
      ctaLabel: p.cta_label || "",
      ctaHref: p.cta_href || "",
      imageUrl: p.image_url || "",
      startsAt: toLocalInput(p.starts_at),
      endsAt: toLocalInput(p.ends_at),
      isPublished: p.is_published,
      showOnHome: p.show_on_home,
      sendEmail: false,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      toast.error("Title and body are required");
      return;
    }
    setSaving(true);
    try {
      const data = await createAdminPromotion({
        title: form.title.trim(),
        body: form.body.trim(),
        ctaLabel: form.ctaLabel.trim() || null,
        ctaHref: form.ctaHref.trim() || null,
        imageUrl: form.imageUrl.trim() || null,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
        isPublished: form.isPublished,
        showOnHome: form.showOnHome,
        sendEmail: form.sendEmail,
      });
      const email = data.email as
        | { sent: number; skipped: number; mode: string }
        | null
        | undefined;
      if (email?.mode === "brevo" && email.sent > 0) {
        toast.success(`Promotion published · emailed ${email.sent} subscribers`);
      } else if (email?.mode === "queued") {
        toast.success(
          `Promotion saved · email queued for ${email.skipped} subscribers (set BREVO_API_KEY to send)`,
        );
      } else {
        toast.success("Promotion created");
      }
      resetForm();
      await fetchPromotions();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to create promotion",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    if (!form.title.trim() || !form.body.trim()) {
      toast.error("Title and body are required");
      return;
    }
    setSaving(true);
    try {
      await updateAdminPromotion({
        id: editingId,
        title: form.title.trim(),
        body: form.body.trim(),
        ctaLabel: form.ctaLabel.trim() || null,
        ctaHref: form.ctaHref.trim() || null,
        imageUrl: form.imageUrl.trim() || null,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
        isPublished: form.isPublished,
        showOnHome: form.showOnHome,
      });
      toast.success("Promotion updated");
      resetForm();
      await fetchPromotions();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to update promotion",
      );
    } finally {
      setSaving(false);
    }
  }

  async function viewEmailLog(id: string) {
    if (logPromoId === id) {
      setLogPromoId(null);
      return;
    }
    setLogPromoId(id);
    setLogLoading(true);
    try {
      const data = await getPromotionEmailLogs(id);
      setEmailLogs(data.logs || []);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Could not load email log",
      );
    } finally {
      setLogLoading(false);
    }
  }

  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const data = await uploadPromotionImage(file);
      setForm((f) => ({ ...f, imageUrl: data.imageUrl || data.url || "" }));
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Image upload failed",
      );
    } finally {
      setUploading(false);
    }
  }

  async function togglePublish(p: Promotion) {
    try {
      await updateAdminPromotion({ id: p.id, isPublished: !p.is_published });
      toast.success(p.is_published ? "Unpublished" : "Published");
      await fetchPromotions();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Update failed");
    }
  }

  async function resendEmail(p: Promotion) {
    try {
      const data = await updateAdminPromotion({ id: p.id, sendEmail: true });
      const email = data.email as { sent: number; skipped: number; mode: string } | null;
      if (email?.mode === "brevo") {
        toast.success(`Emailed ${email.sent} subscribers`);
      } else {
        toast.success(`Queued for ${email?.skipped ?? 0} subscribers`);
      }
      await fetchPromotions();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Email send failed");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this promotion?")) return;
    try {
      await deleteAdminPromotion(id);
      toast.success("Deleted");
      await fetchPromotions();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Delete failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Megaphone className="h-6 w-6 text-primary" />
            Promotions
          </h1>
          <p className="text-sm text-muted-foreground">
            Announce new features on the home screen and email newsletter subscribers.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchPromotions()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={startCreate}>
            <Plus className="h-4 w-4" />
            {showForm && !editingId ? "Cancel" : "New promotion"}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit promotion" : "Create promotion"}</CardTitle>
            <CardDescription>
              Published promotions with “Show on home” open as a homepage popup on every visit
              until Ends time (or forever if Ends is empty). Image + X close for that visit only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => void (editingId ? handleUpdate(e) : handleCreate(e))}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="promo-title">Title</Label>
                <Input
                  id="promo-title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="New: Trainer fee matching"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="promo-body">Details</Label>
                <Textarea
                  id="promo-body"
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  placeholder="Describe the feature or offer…"
                  rows={4}
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="promo-cta-label">CTA label (optional)</Label>
                  <Input
                    id="promo-cta-label"
                    value={form.ctaLabel}
                    onChange={(e) => setForm((f) => ({ ...f, ctaLabel: e.target.value }))}
                    placeholder="Learn more"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="promo-cta-href">CTA link (optional)</Label>
                  <Input
                    id="promo-cta-href"
                    value={form.ctaHref}
                    onChange={(e) => setForm((f) => ({ ...f, ctaHref: e.target.value }))}
                    placeholder="/gyms or https://…"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="promo-starts">Starts (optional)</Label>
                  <Input
                    id="promo-starts"
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="promo-ends">Ends (optional)</Label>
                  <Input
                    id="promo-ends"
                    type="datetime-local"
                    value={form.endsAt}
                    onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="promo-image-file">Promotion image</Label>
                <Input
                  id="promo-image-file"
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadImage(file);
                  }}
                />
                {uploading && (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Uploading…
                  </p>
                )}
                {form.imageUrl && (
                  <div className="mt-2 space-y-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.imageUrl}
                      alt="Promotion preview"
                      className="h-28 w-full max-w-sm rounded-lg border object-cover"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))}
                    >
                      Remove image
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={form.isPublished}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, isPublished: v }))}
                  />
                  Publish now
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={form.showOnHome}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, showOnHome: v }))}
                  />
                  Show on home
                </label>
                {!editingId && (
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={form.sendEmail}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, sendEmail: v }))}
                    />
                    Email newsletter subscribers
                  </label>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : editingId ? (
                    <>
                      <Pencil className="h-4 w-4" />
                      Save changes
                    </>
                  ) : (
                    <>
                      <Megaphone className="h-4 w-4" />
                      Create promotion
                    </>
                  )}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel edit
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All promotions</CardTitle>
          <CardDescription>
            Control home visibility and resend feature emails to subscribers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableRowSkeleton rows={4} columns={1} />
          ) : promotions.length === 0 ? (
            <div className="flex min-h-[160px] flex-col items-center justify-center text-center text-sm text-muted-foreground">
              <Megaphone className="mb-3 h-10 w-10 opacity-40" />
              No promotions yet. Create one to show on the home screen.
            </div>
          ) : (
            <div className="space-y-3">
              {promotions.map((p) => {
                const lifecycle = promoLifecycle(p, nowMs);
                const schedule = promoScheduleLabel(p, nowMs);
                return (
                <div
                  key={p.id}
                  className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{p.title}</p>
                      <Badge
                        variant={
                          lifecycle === "Live"
                            ? "default"
                            : lifecycle === "Ended"
                              ? "secondary"
                              : "outline"
                        }
                        className={
                          lifecycle === "Live"
                            ? "bg-emerald-600 text-white hover:bg-emerald-600"
                            : undefined
                        }
                      >
                        {lifecycle === "Live" ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                            Live
                          </span>
                        ) : (
                          lifecycle
                        )}
                      </Badge>
                      {p.show_on_home && <Badge variant="outline">Home</Badge>}
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{p.body}</p>
                    <p className="text-xs text-muted-foreground">
                      Created {format(new Date(p.created_at), "MMM d, yyyy")}
                      {p.email_sent_at
                        ? ` · Emailed ${p.email_recipient_count ?? 0} on ${format(new Date(p.email_sent_at), "MMM d")}`
                        : ""}
                    </p>
                    {schedule ? (
                      <p
                        className={
                          lifecycle === "Live"
                            ? "text-xs font-medium tabular-nums text-emerald-500"
                            : lifecycle === "Scheduled"
                              ? "text-xs font-medium tabular-nums text-amber-500"
                              : "text-xs tabular-nums text-muted-foreground"
                        }
                      >
                        {schedule}
                      </p>
                    ) : null}
                    {logPromoId === p.id && (
                      <div className="mt-2 max-h-40 overflow-auto rounded border bg-muted/30 p-2 text-xs">
                        {logLoading ? (
                          "Loading log…"
                        ) : emailLogs.length === 0 ? (
                          "No email log rows yet."
                        ) : (
                          <ul className="space-y-1">
                            {emailLogs.map((l, i) => (
                              <li key={`${l.recipient_email}-${i}`}>
                                <span className="font-medium">{l.status}</span> ·{" "}
                                {l.recipient_email} ·{" "}
                                {format(new Date(l.sent_at), "MMM d HH:mm")}
                                {l.error_message ? ` — ${l.error_message}` : ""}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(p)}
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void viewEmailLog(p.id)}
                    >
                      Log
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void togglePublish(p)}
                    >
                      {p.is_published ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      {p.is_published ? "Unpublish" : "Publish"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void resendEmail(p)}
                    >
                      <Send className="h-4 w-4" />
                      Email
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                      onClick={() => void remove(p.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
