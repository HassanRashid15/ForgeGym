"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadCount } from "@/hooks/useRealtimeNotifications";
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
  LayoutDashboard,
  Dumbbell,
  Users,
  Calendar,
  Settings,
  CreditCard,
  BarChart3,
  LogOut,
  Home,
  Bell,
  Search,
  ChevronDown,
  ChevronsUpDown,
  Loader2,
  Wallet,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { useAuthGate } from "@/hooks/useAuthGate";

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
  { title: "Notifications", url: "/dashboard/notifications", icon: Bell },
];

const accountItems: NavItem[] = [
  { title: "Settings", url: "/profile?tab=settings", icon: Settings },
  { title: "Site Home", url: "/", icon: Home },
];

const gymOwnerItems: NavItem[] = [
  { title: "Users", url: "/dashboard/users", icon: Users },
  { title: "Trainers", url: "/dashboard/trainers", icon: Dumbbell },
  { title: "Notifications", url: "/dashboard/notifications", icon: Bell },
  { title: "Monthly Fee", url: "/dashboard/monthly-fee", icon: Wallet },
];

const superAdminItems: NavItem[] = [
  { title: "Users", url: "/dashboard/users", icon: Users },
];

function isActivePath(pathname: string, url: string) {
  const pathOnly = url.split("?")[0];
  if (pathOnly === "/dashboard") return pathname === "/dashboard";
  if (pathOnly === "/") return pathname === "/";
  return pathname === pathOnly || pathname.startsWith(`${pathOnly}/`);
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
              <SidebarMenuItem key={`${label}-${item.url}`}>
                <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                  <Link
                    href={item.url}
                    prefetch={false}
                    className="group-data-[collapsible=icon]:justify-center"
                  >
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

function ShellChrome({ children }: { children: ReactNode }) {
  const { user, logout, isAdmin, isSuperAdmin } = useAuth();
  const pathname = usePathname();
  const { unreadCount, isConnected } = useUnreadCount();

  const gymBrand =
    user?.gymName?.trim() ||
    (isSuperAdmin ? "Forge Gym" : isAdmin ? "Your Gym" : "Forge Gym");
  const gymDetailHref = user?.gymOwnerId
    ? `/gyms/${user.gymOwnerId}`
    : user?.id && isAdmin && !isSuperAdmin
      ? `/gyms/${user.id}`
      : "/dashboard";

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
    [...trainItems, ...accountItems, ...gymOwnerItems, ...superAdminItems].find((item) =>
      isActivePath(pathname, item.url),
    )?.title || (pathname.startsWith("/profile") ? "Profile" : "Dashboard");

  return (
    <>
      <Sidebar collapsible="icon" variant="sidebar">
        <SidebarHeader className="flex h-14 shrink-0 flex-row items-center justify-center gap-0 border-b border-sidebar-border p-2 group-data-[collapsible=icon]:px-2">
          <SidebarMenu className="w-full group-data-[collapsible=icon]:w-auto">
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                asChild
                tooltip={gymBrand}
                className="h-10 data-[size=lg]:h-10 group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-0"
              >
                <Link
                  href={gymDetailHref}
                  className="group-data-[collapsible=icon]:!justify-center group-data-[collapsible=icon]:!gap-0"
                >
                  <div className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary text-primary-foreground group-data-[collapsible=icon]:size-8">
                    {user?.gymMainImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.gymMainImageUrl}
                        alt={gymBrand}
                        className="absolute inset-0 size-full object-cover"
                      />
                    ) : (
                      <Dumbbell className="size-4" strokeWidth={2} />
                    )}
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-semibold">{gymBrand}</span>
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

        <SidebarFooter className="flex h-14 shrink-0 flex-row items-center justify-center gap-0 border-t border-sidebar-border p-2 group-data-[collapsible=icon]:px-2">
          <SidebarMenu className="w-full group-data-[collapsible=icon]:w-auto">
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="h-10 data-[size=lg]:h-10 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-0"
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
                    <Link href="/profile?tab=settings">
                      <Settings className="mr-2 size-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/membership">
                      <CreditCard className="mr-2 size-4" />
                      Membership
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/notifications">
                      <Bell className="mr-2 size-4" />
                      Notifications
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="relative size-8"
                  aria-label="Notifications"
                >
                  <Bell className="size-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                  {isConnected && (
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2 items-center justify-center rounded-full bg-green-500" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 rounded-lg">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">Notifications</p>
                      <div className={`flex items-center gap-1 text-xs ${isConnected ? "text-green-500" : "text-yellow-500"}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-yellow-500"}`} />
                        {isConnected ? "Live" : "Connecting..."}
                      </div>
                    </div>
                    <Link
                      href="/dashboard/notifications"
                      className="text-xs text-primary hover:underline"
                    >
                      View all
                    </Link>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {unreadCount > 0 ? (
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/notifications" className="cursor-pointer">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium">System Protocols</p>
                        <p className="text-xs text-muted-foreground">
                          {unreadCount} unread {unreadCount === 1 ? "alert" : "alerts"}
                        </p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                ) : (
                  <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                    No new notifications
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

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
                  <Link href="/profile?tab=settings">
                    <Settings className="mr-2 size-4" />
                    Settings
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

type AuthenticatedShellProps = {
  children: ReactNode;
  redirectPath: string;
  /** True when a server layout already verified the cookie session. */
  serverAuthenticated?: boolean;
};

export function AuthenticatedShell({
  children,
  redirectPath,
  serverAuthenticated = false,
}: AuthenticatedShellProps) {
  const { ready } = useAuthGate(redirectPath, { serverAuthenticated });

  if (!ready) {
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
      <ShellChrome>{children}</ShellChrome>
    </SidebarProvider>
  );
}
