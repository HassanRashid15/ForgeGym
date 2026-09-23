"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Mail, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/api/client";
import { unsubscribeNewsletter } from "@/api/newsletter";

function UnsubscribeInner() {
  const params = useSearchParams();
  const emailParam = params.get("email") || "";
  const tokenParam = params.get("token") || "";

  const [email] = useState(emailParam);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    emailParam && tokenParam ? "loading" : "idle",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!emailParam || !tokenParam) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await unsubscribeNewsletter({
          email: emailParam,
          token: tokenParam,
        });
        if (cancelled) return;
        setStatus("done");
        setMessage(data.message || "Unsubscribed successfully");
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setMessage(
            err instanceof ApiError
              ? err.message
              : "Something went wrong. Try again.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [emailParam, tokenParam]);

  async function confirmManual() {
    setStatus("loading");
    try {
      const data = await unsubscribeNewsletter({
        email,
        token: tokenParam,
      });
      setStatus("done");
      setMessage(data.message || "Unsubscribed successfully");
    } catch (err) {
      setStatus("error");
      setMessage(
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Try again.",
      );
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-7 w-7 text-primary" />
        </div>
        <h1 className="font-display text-3xl">Newsletter</h1>
        <p className="text-muted-foreground">
          Unsubscribe from Forge Gym promotions and tips.
        </p>

        {status === "loading" && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Updating preference…
          </div>
        )}

        {status === "done" && (
          <div className="flex flex-col items-center gap-3 text-emerald-600">
            <CheckCircle className="h-8 w-8" />
            <p>{message}</p>
            <Button asChild variant="outline">
              <Link href="/">Back to home</Link>
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>{message}</span>
            </div>
            <Button asChild variant="outline">
              <Link href="/profile?tab=settings">Open settings</Link>
            </Button>
          </div>
        )}

        {status === "idle" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Open the unsubscribe link from your email, or manage preference while logged in.
            </p>
            {tokenParam ? (
              <Button onClick={() => void confirmManual()} className="w-full">
                Confirm unsubscribe
              </Button>
            ) : (
              <Button asChild variant="outline" className="w-full">
                <Link href="/profile?tab=settings">Go to settings</Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-muted-foreground">
          Loading…
        </div>
      }
    >
      <UnsubscribeInner />
    </Suspense>
  );
}
