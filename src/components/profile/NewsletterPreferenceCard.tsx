"use client";

import { useEffect, useState } from "react";
import { Mail, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ApiError } from "@/api/client";
import {
  getMyNewsletterPreference,
  updateMyNewsletterPreference,
} from "@/api/newsletter";

/**
 * Newsletter preference for members / gym admins (not shown for superadmin).
 */
export function NewsletterPreferenceCard({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getMyNewsletterPreference();
        if (!cancelled) {
          setSubscribed(Boolean(data.subscribed));
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle(next: boolean) {
    setSaving(true);
    const prev = subscribed;
    setSubscribed(next);
    try {
      await updateMyNewsletterPreference(next);
      toast.success(next ? "Subscribed to newsletter" : "Unsubscribed from newsletter");
    } catch (err) {
      setSubscribed(prev);
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Could not update newsletter preference",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900/40 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Mail className="h-5 w-5 text-primary" />
          Newsletter
        </CardTitle>
        <CardDescription>
          Fitness tips, promotions, and new feature announcements — unsubscribe anytime.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading preference…
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="min-w-0 space-y-1">
              <Label htmlFor="newsletter-toggle" className="text-foreground">
                Email newsletter
              </Label>
              <p className="text-sm text-muted-foreground">
                {disabled
                  ? "Enable edit on this page to change newsletter preference."
                  : subscribed
                    ? "You’re subscribed — promotions and updates go to your inbox."
                    : "You’re not subscribed. Turn on to get promotions and tips."}
              </p>
            </div>
            <Switch
              id="newsletter-toggle"
              checked={subscribed}
              disabled={disabled || saving}
              onCheckedChange={(v) => {
                if (disabled) return;
                void toggle(v);
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
