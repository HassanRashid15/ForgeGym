"use client";

export function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/40 py-2">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="max-w-[65%] whitespace-pre-wrap break-words text-right font-medium">
        {value?.trim() ? value : "—"}
      </span>
    </div>
  );
}
