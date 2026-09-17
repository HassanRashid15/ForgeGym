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

type Promotion = {
  id: string;
  title: string;
  body: string;
  cta_label: string | null;
  cta_href: string | null;
  image_url: string | null;
  is_published: boolean;
  show_on_home: boolean;
  starts_at: string | null;
  ends_at: string | null;
  email_sent_at: string | null;
  email_recipient_count: number | null;
  created_at: string;
};

function promoLifecycle(p: Promotion): "Draft" | "Scheduled" | "Live" | "Ended" {
  if (!p.is_published) return "Draft";
  const now = Date.now();
  if (p.starts_at && new Date(p.starts_at).getTime() > now) return "Scheduled";
  if (p.ends_at && new Date(p.ends_at).getTime() < now) return "Ended";
  return "Live";
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

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logPromoId, setLogPromoId] = useState<string | null>(null);
  const [emailLogs, setEmailLogs] = useState<
    { recipient_email: string; status: string; sent_at: string; error_message: string | null }[]
  >([]);
  const [logLoading, setLogLoading] = useState(false);

  const fetchPromotions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/promotions", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to load promotions");
        return;
      }
      setPromotions(data.promotions || []);
    } catch {
      toast.error("Failed to load promotions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPromotions();
  }, [fetchPromotions]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      toast.error("Title and body are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/promotions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to create promotion");
        return;
      }
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
      setForm(emptyForm);
      setShowForm(false);
      await fetchPromotions();
    } catch {
      toast.error("Failed to create promotion");
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
      const res = await fetch(`/api/admin/promotions?emailLogId=${encodeURIComponent(id)}`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Could not load email log");
        return;
      }
      setEmailLogs(data.logs || []);
    } finally {
      setLogLoading(false);
    }
  }

  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/promotions/upload", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Image upload failed");
        return;
      }
      setForm((f) => ({ ...f, imageUrl: data.imageUrl || "" }));
      toast.success("Image uploaded");
    } catch {
      toast.error("Image upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function togglePublish(p: Promotion) {
    try {
      const res = await fetch("/api/admin/promotions", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id, isPublished: !p.is_published }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Update failed");
        return;
      }
      toast.success(p.is_published ? "Unpublished" : "Published");
      await fetchPromotions();
    } catch {
      toast.error("Update failed");
    }
  }

  async function resendEmail(p: Promotion) {
    try {
      const res = await fetch("/api/admin/promotions", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id, sendEmail: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Email send failed");
        return;
      }
      const email = data.email as { sent: number; skipped: number; mode: string } | null;
      if (email?.mode === "brevo") {
        toast.success(`Emailed ${email.sent} subscribers`);
      } else {
        toast.success(`Queued for ${email?.skipped ?? 0} subscribers`);
      }
      await fetchPromotions();
    } catch {
      toast.error("Email send failed");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this promotion?")) return;
    try {
      const res = await fetch(`/api/admin/promotions?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Delete failed");
        return;
      }
      toast.success("Deleted");
      await fetchPromotions();
    } catch {
      toast.error("Delete failed");
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
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4" />
            {showForm ? "Cancel" : "New promotion"}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create promotion</CardTitle>
            <CardDescription>
              Published promotions with “Show on home” appear for everyone on the homepage.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void handleCreate(e)} className="space-y-4">
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
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.imageUrl}
                    alt="Promotion preview"
                    className="mt-2 h-28 w-full max-w-sm rounded-lg border object-cover"
                  />
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
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={form.sendEmail}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, sendEmail: v }))}
                  />
                  Email newsletter subscribers
                </label>
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Megaphone className="h-4 w-4" />
                    Create promotion
                  </>
                )}
              </Button>
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
              {promotions.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{p.title}</p>
                      <Badge
                        variant={
                          promoLifecycle(p) === "Live"
                            ? "default"
                            : promoLifecycle(p) === "Ended"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {promoLifecycle(p)}
                      </Badge>
                      {p.show_on_home && <Badge variant="outline">Home</Badge>}
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{p.body}</p>
                    <p className="text-xs text-muted-foreground">
                      Created {format(new Date(p.created_at), "MMM d, yyyy")}
                      {p.email_sent_at
                        ? ` · Emailed ${p.email_recipient_count ?? 0} on ${format(new Date(p.email_sent_at), "MMM d")}`
                        : ""}
                      {p.starts_at
                        ? ` · Starts ${format(new Date(p.starts_at), "MMM d HH:mm")}`
                        : ""}
                      {p.ends_at
                        ? ` · Ends ${format(new Date(p.ends_at), "MMM d HH:mm")}`
                        : ""}
                    </p>
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
