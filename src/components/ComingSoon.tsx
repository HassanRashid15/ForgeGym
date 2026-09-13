import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Bell } from "lucide-react";

type ComingSoonProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  features?: string[];
  backHref?: string;
  backLabel?: string;
};

export function ComingSoon({
  title,
  description,
  icon: Icon,
  features = [],
  backHref = "/dashboard",
  backLabel = "Back to dashboard",
}: ComingSoonProps) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-16 text-center sm:py-20">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-7 w-7" />
      </div>
      <Badge variant="outline" className="mb-3 border-primary/40 text-primary">
        Coming soon
      </Badge>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
        {description}
      </p>

      {features.length > 0 ? (
        <ul className="mt-6 w-full max-w-md space-y-2 rounded-xl border border-border/70 bg-card/40 p-4 text-left text-sm text-muted-foreground">
          {features.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-6 text-xs text-muted-foreground">
        We’re gathering early gyms and members first. This feature ships next.
      </p>

      <Button asChild className="mt-6 gap-2">
        <Link href={backHref}>
          {backLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
