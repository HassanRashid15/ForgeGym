"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  User,
  LayoutDashboard,
  Dumbbell,
  Calendar,
  CreditCard,
  BarChart3,
  LogOut,
  Home,
  Settings,
  Users,
  Bell,
  Search,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import { cn, getNameInitials } from "@/lib/utils";
import ThemeToggle from "@/components/marketing/ThemeToggle";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
};

const trainItems: NavItem[] = [
  { title: "Overview", url: "/dashboard", icon: LayoutDashboard },
  { title: "Classes", url: "/dashboard/classes", icon: Dumbbell },
  { title: "Schedule", url: "/dashboard/schedule", icon: Calendar },
  { title: "Membership", url: "/dashboard/membership", icon: CreditCard },
  { title: "Progress", url: "/dashboard/progress", icon: BarChart3 },
];

const accountItems: NavItem[] = [
  { title: "Profile", url: "/profile", icon: User },
  { title: "Site Home", url: "/", icon: Home },
];

const gymOwnerItems: NavItem[] = [
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

const superAdminItems: NavItem[] = [
  { title: "Users", url: "/dashboard/users", icon: Users },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

function isActivePath(pathname: string, url: string) {
  if (url === "/dashboard") return pathname === "/dashboard";
  if (url === "/") return pathname === "/";
  return pathname === url || pathname.startsWith(`${url}/`);
}

function NavGroup({
  label,
  items,
  pathname,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="truncate">{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const active = isActivePath(pathname, item.url);
            const Icon = item.icon;
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                  <Link href={item.url}>
                    <Icon className="shrink-0" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function ProfileShell({ children }: { children: React.ReactNode }) {
  const { user, logout, isAdmin, isSuperAdmin } = useAuth();
  const pathname = usePathname();

  const panelLabel = isSuperAdmin
    ? "Super Admin"
    : isAdmin
      ? "Gym Owner"
      : "Member panel";

  const managementItems = isSuperAdmin
    ? superAdminItems
    : isAdmin
      ? gymOwnerItems
      : [];

  const pageTitle =
    [...trainItems, ...accountItems, ...superAdminItems].find((item) =>
      isActivePath(pathname, item.url),
    )?.title || "Profile";

  return (
    <>
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                asChild
                tooltip="Forge Gym"
                className="group-data-[collapsible=icon]:justify-center"
              >
                <Link href="/dashboard">
                  <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Dumbbell className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-semibold">Forge Gym</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {panelLabel}
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <NavGroup label="Home" items={trainItems} pathname={pathname} />
          <NavGroup label="Account" items={accountItems} pathname={pathname} />
          {managementItems.length > 0 && (
            <NavGroup
              label={isSuperAdmin ? "Platform" : "Gym"}
              items={managementItems}
              pathname={pathname}
            />
          )}
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center"
                    tooltip={user?.name || "Account"}
                  >
                    <Avatar className="size-8 shrink-0 rounded-lg">
                      <AvatarImage src={user?.avatar} alt={user?.name} />
                      <AvatarFallback className="rounded-lg bg-primary/15 text-xs font-semibold text-primary">
                        {getNameInitials(user?.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                      <span className="truncate font-semibold">
                        {user?.name || "Member"}
                      </span>
                      <span className="truncate text-xs capitalize text-muted-foreground">
                        {user?.role || "customer"}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                  side="bottom"
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                      <Avatar className="size-8 rounded-lg">
                        <AvatarImage src={user?.avatar} alt={user?.name} />
                        <AvatarFallback className="rounded-lg bg-primary/15 text-xs font-semibold text-primary">
                          {getNameInitials(user?.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">{user?.name}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {user?.email}
                        </span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <User className="mr-2 size-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/membership">
                      <CreditCard className="mr-2 size-4" />
                      Membership
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={logout}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 size-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />

          <Breadcrumb className="hidden sm:block">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <p className="truncate text-sm font-medium sm:hidden">{pageTitle}</p>

          <div className="ml-auto flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
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
            >
              <Search className="size-4" />
            </Button>

            <ThemeToggle />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="relative size-8"
              aria-label="Notifications"
            >
              <Bell className="size-4" />
              <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 gap-2 rounded-lg px-1.5"
                >
                  <Avatar className="size-7 rounded-lg">
                    <AvatarImage src={user?.avatar} alt={user?.name} />
                    <AvatarFallback className="rounded-lg bg-primary/15 text-[10px] font-semibold text-primary">
                      {getNameInitials(user?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="hidden size-3.5 text-muted-foreground md:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-lg">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <User className="mr-2 size-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/">
                    <Home className="mr-2 size-4" />
                    Site home
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 size-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </>
  );
}

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (isAuthLoading) return;

    if (user) {
      setAuthChecked(true);
      return;
    }

    let cancelled = false;
    const failSafe = setTimeout(() => {
      if (!cancelled) router.replace("/login?redirect=/profile");
    }, 5000);

    const checkUnverified = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (cancelled) return;
        if (data?.user && !data.user.email_confirmed_at) {
          const encodedEmail = encodeURIComponent(data.user.email || "");
          router.replace(`/verification?email=${encodedEmail}`);
          return;
        }
      } catch {
        // ignore
      }
      if (!cancelled) router.replace("/login?redirect=/profile");
    };

    void checkUnverified();
    return () => {
      cancelled = true;
      clearTimeout(failSafe);
    };
  }, [user, isAuthLoading, router]);

  if (isAuthLoading || !authChecked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="size-10 animate-spin text-primary" />
        <p className="animate-pulse text-sm text-muted-foreground">
          Verifying session…
        </p>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <ProfileShell>{children}</ProfileShell>
    </SidebarProvider>
  );
}