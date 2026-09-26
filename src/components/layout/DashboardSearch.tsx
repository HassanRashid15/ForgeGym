"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import * as Dialog from "@radix-ui/react-dialog";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SearchNavItem = {
  title: string;
  url: string;
  group: string;
  icon: React.ComponentType<{ className?: string }>;
  comingSoon?: boolean;
};

type DashboardSearchProps = {
  items: SearchNavItem[];
};

export function DashboardSearch({ items }: DashboardSearchProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, SearchNavItem[]>();
    for (const item of items) {
      const list = map.get(item.group) || [];
      list.push(item);
      map.set(item.group, list);
    }
    return Array.from(map.entries());
  }, [items]);

  const go = useCallback(
    (url: string, comingSoon?: boolean) => {
      if (comingSoon) return;
      setOpen(false);
      router.push(url);
    },
    [router],
  );

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className={cn(
          "relative hidden h-8 w-56 justify-start gap-2 rounded-lg px-3 text-sm font-normal text-muted-foreground md:inline-flex",
        )}
      >
        <Search className="size-3.5 shrink-0" />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="relative size-8 md:hidden"
        aria-label="Search"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" />
      </Button>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content className="fixed left-1/2 top-[12%] z-[101] w-[min(100vw-1.5rem,32rem)] -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
            <Dialog.Title className="sr-only">Search dashboard</Dialog.Title>
            <Dialog.Description className="sr-only">
              Filter pages by typing. Use arrow keys to move, Enter to open.
            </Dialog.Description>

            <Command
              label="Dashboard search"
              className="flex flex-col"
              filter={(value, search, keywords) => {
                const q = search.trim().toLowerCase();
                if (!q) return 1;
                const hay = `${value} ${(keywords || []).join(" ")}`.toLowerCase();
                if (hay.includes(q)) return 1;
                // soft match: all query tokens present
                const tokens = q.split(/\s+/).filter(Boolean);
                return tokens.every((t) => hay.includes(t)) ? 0.5 : 0;
              }}
            >
              <div className="flex items-center gap-2 border-b border-border px-3">
                <Search className="size-4 shrink-0 text-muted-foreground" />
                <Command.Input
                  placeholder="Search pages…"
                  className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  autoFocus
                />
                <kbd className="hidden h-5 shrink-0 items-center rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground sm:inline-flex">
                  ESC
                </kbd>
              </div>

              <Command.List className="max-h-72 overflow-y-auto overscroll-contain p-2">
                <Command.Empty className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No pages match that search
                </Command.Empty>

                {groups.map(([group, groupItems]) => (
                  <Command.Group
                    key={group}
                    heading={group}
                    className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground"
                  >
                    {groupItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Command.Item
                          key={`${group}-${item.url}`}
                          value={`${item.title} ${item.group} ${item.url}`}
                          keywords={[item.title, item.group, item.url]}
                          disabled={item.comingSoon}
                          onSelect={() => go(item.url, item.comingSoon)}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm outline-none",
                            "data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground",
                            "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-45",
                          )}
                        >
                          <Icon className="size-4 shrink-0 opacity-80" />
                          <span className="min-w-0 flex-1 truncate">{item.title}</span>
                          {item.comingSoon ? (
                            <span className="text-[10px] uppercase tracking-wide opacity-70">
                              Soon
                            </span>
                          ) : (
                            <span className="truncate text-[10px] opacity-60">
                              {item.url.split("?")[0]}
                            </span>
                          )}
                        </Command.Item>
                      );
                    })}
                  </Command.Group>
                ))}
              </Command.List>
            </Command>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
