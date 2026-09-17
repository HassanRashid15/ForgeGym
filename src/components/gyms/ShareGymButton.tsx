"use client";

import { useState } from "react";
import { Share2, Link2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ShareGymButton({
  gymName,
  ownerId,
}: {
  gymName: string;
  ownerId: string;
}) {
  const [showQr, setShowQr] = useState(false);
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/gyms/${ownerId}`
      : `/gyms/${ownerId}`;
  const registerUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/register?gym=${encodeURIComponent(ownerId)}`
      : `/register?gym=${encodeURIComponent(ownerId)}`;

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: gymName,
          text: `Train at ${gymName} on Forge Gym`,
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      /* user cancelled share */
    }
  }

  async function copyJoin() {
    try {
      await navigator.clipboard.writeText(registerUrl);
      toast.success("Join link copied");
    } catch {
      toast.error("Could not copy");
    }
  }

  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(registerUrl)}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => void share()}>
        <Share2 className="h-4 w-4" />
        Share
      </Button>
      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => void copyJoin()}>
        <Link2 className="h-4 w-4" />
        Copy join link
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setShowQr((v) => !v)}
      >
        <QrCode className="h-4 w-4" />
        QR
      </Button>
      {showQr && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={qrSrc}
          alt="Join QR code"
          className="h-[180px] w-[180px] rounded-lg border border-border bg-white p-2"
        />
      )}
    </div>
  );
}
