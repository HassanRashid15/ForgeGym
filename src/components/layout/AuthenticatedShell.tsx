"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeNotifications, NotificationsRealtimeProvider } from "@/hooks/useRealtimeNotifications";
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
  AlertTriangle,
  Zap,
  RefreshCw,
  Trophy,
  Clock,
  MessageSquare,
  Star,
  Shield,
  Sparkles,
  Tag,
  Lock,
  PieChart,
  Mail,
  Megaphone,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuthGate } from "@/hooks/useAuthGate";

type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  comingSoon?: boolean;
};

const trainItems: NavItem[] = [
  { title: "Overview", url: "/dashboard", icon: LayoutDashboard },
  { title: "Classes", url: "/dashboard/classes", icon: Dumbbell, comingSoon: true },
  { title: "Schedule", url: "/dashboard/schedule", icon: Calendar, comingSoon: true },
  { title: "Membership", url: "/dashboard/membership", icon: CreditCard, comingSoon: true },
  { title: "Progress", url: "/dashboard/progress", icon: BarChart3 },
  { title: "Attendance", url: "/dashboard/attendance", icon: Clock },
  { title: "Feedback", url: "/dashboard/feedback", icon: Star },
  { title: "Notifications", url: "/dashboard/notifications", icon: Bell },
];

const accountItems: NavItem[] = [
  { title: "Settings", url: "/profile?tab=settings", icon: Settings },
  { title: "Site Home", url: "/", icon: Home },
];

const gymOwnerItems: NavItem[] = [
  { title: "Users", url: "/dashboard/users", icon: Users },
  { title: "Trainers", url: "/dashboard/trainers", icon: Dumbbell },
  { title: "Monthly Fee", url: "/dashboard/monthly-fee", icon: Wallet },
  { title: "Stats", url: "/dashboard/statistics", icon: PieChart },
];

const trainerItems: NavItem[] = [
  { title: "Monthly Fee", url: "/dashboard/monthly-fee", icon: Wallet },
];

const superAdminItems: NavItem[] = [
  { title: "Users", url: "/dashboard/users", icon: Users },
  { title: "Membership Set", url: "/dashboard/membership-set", icon: Wallet },
  { title: "Stats", url: "/dashboard/statistics", icon: PieChart },
  { title: "Newsletter", url: "/dashboard/newsletter", icon: Mail },
  { title: "Promotions", url: "/dashboard/promotions", icon: Megaphone },
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

            if (item.comingSoon) {
              return (
                <SidebarMenuItem key={`${label}-${item.url}`}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton
                        type="button"
                        aria-disabled
                        tooltip="Coming soon"
                        className="cursor-not-allowed text-sidebar-foreground/55 hover:bg-transparent hover:text-sidebar-foreground/55"
                        onClick={(e) => e.preventDefault()}
                      >
                        {/* Direct SVG so icon-rail mode still shows the glyph */}
                        <Icon className="text-sidebar-foreground/50" />
                        <span className="truncate">{item.title}</span>
                        <span className="ml-auto flex size-5 shrink-0 items-center justify-center rounded-md bg-muted/70 text-muted-foreground">
                          <Lock className="size-3" strokeWidth={2.5} />
                        </span>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    <TooltipContent side="right" align="center" sideOffset={8}>
                      Coming soon
                    </TooltipContent>
                  </Tooltip>
                </SidebarMenuItem>
              );
            }

            return (
              <SidebarMenuItem key={`${label}-${item.url}`}>
                <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                  <Link
                    href={item.url}
                    prefetch={false}
                    className="group-data-[collapsible=icon]:justify-center"
                  >
                    <Icon />
                    <span className="truncate">{item.title}</span>
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

function getNotificationIcon(type: string) {
  const iconMap: Record<string, React.ReactNode> = {
    confirmation: <Calendar className="h-4 w-4 text-primary" />,
    maintenance: <AlertTriangle className="h-4 w-4 text-destructive" />,
    directive: <Zap className="h-4 w-4 text-amber-500" />,
    info: <RefreshCw className="h-4 w-4 text-blue-500" />,
    alert: <AlertTriangle className="h-4 w-4 text-destructive" />,
    booking: <Calendar className="h-4 w-4 text-purple-500" />,
    payment: <CreditCard className="h-4 w-4 text-green-500" />,
    achievement: <Trophy className="h-4 w-4 text-yellow-500" />,
    reminder: <Clock className="h-4 w-4 text-orange-500" />,
    system: <RefreshCw className="h-4 w-4 text-blue-500" />,
    welcome: <Sparkles className="h-4 w-4 text-pink-500" />,
    membership: <Users className="h-4 w-4 text-indigo-500" />,
    class_update: <Calendar className="h-4 w-4 text-cyan-500" />,
    promotion: <Tag className="h-4 w-4 text-rose-500" />,
    feedback: <MessageSquare className="h-4 w-4 text-teal-500" />,
    security: <Shield className="h-4 w-4 text-red-600" />,
  };
  return iconMap[type] || <Bell className="h-4 w-4 text-muted-foreground" />;
}

function getNotificationLabel(type: string): string {
  const labelMap: Record<string, string> = {
    confirmation: "Confirmation",
    maintenance: "Facility Alert",
    directive: "Daily Directive",
    info: "System",
    alert: "Alert",
    booking: "Booking",
    payment: "Payment",
    achievement: "Achievement",
    reminder: "Reminder",
    system: "System",
    welcome: "Welcome",
    membership: "Membership",
    class_update: "Class Update",
    promotion: "Promotion",
    feedback: "Feedback",
    security: "Security",
  };
  return labelMap[type] || "Notification";
}

function formatNotificationTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function formatNotificationClock(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function ShellChrome({ children }: { children: ReactNode }) {
  const { user, logout, isAdmin, isSuperAdmin, isTrainer } = useAuth();
  const pathname = usePathname();
  const { unreadCount, isConnected, notifications } = useRealtimeNotifications({
    enabled: !!user?.id,
  });

  // Lock document scroll so only the shell content scrolls (fixes double scrollbar + sticky nav)
  useEffect(() => {
    document.documentElement.classList.add("dashboard-scroll-lock");
    return () => {
      document.documentElement.classList.remove("dashboard-scroll-lock");
    };
  }, []);

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
      : isTrainer
        ? "Trainer panel"
        : user?.role === "staff"
          ? "Staff panel"
          : "Member panel";

  const managementItems = isSuperAdmin
    ? superAdminItems
    : isAdmin
      ? gymOwnerItems
      : isTrainer
        ? trainerItems
        : [];

  const pageTitle =
    [
      ...trainItems,
      ...accountItems,
      ...gymOwnerItems,
      ...trainerItems,
      ...superAdminItems,
    ].find((item) => isActivePath(pathname, item.url))?.title ||
    (pathname.startsWith("/profile") ? "Profile" : "Dashboard");

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
              label={isSuperAdmin ? "Platform" : isTrainer ? "Fees" : "Gym"}
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
                    tooltip={user?.name || "Account"}
                    className={cn(
                      "h-10 data-[size=lg]:h-10 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
                      // Icon rail: only the avatar square — hide every other child
                      "group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!gap-0 group-data-[collapsible=icon]:!overflow-hidden group-data-[collapsible=icon]:!p-0",
                      "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:[&>*:not([data-sidebar-avatar])]:!hidden",
                      "group-data-[collapsible=icon]:[&>[data-sidebar-avatar]]:!flex",
                    )}
                  >
                    <div
                      data-sidebar-avatar
                      className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary"
                    >
                      <Avatar className="size-8 rounded-lg">
                        <AvatarImage src={user?.avatar} alt={user?.name || "Account"} />
                        <AvatarFallback className="rounded-lg bg-primary text-xs font-semibold text-primary-foreground">
                          {getNameInitials(user?.name)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold text-sidebar-foreground">
                        {user?.name || "Member"}
                      </span>
                      <span className="truncate text-xs capitalize text-white">
                        {isSuperAdmin ? "Super Admin" : user?.role || "customer"}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4 shrink-0" />
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

      <SidebarInset className="h-svh max-h-svh min-h-0 overflow-hidden">
        <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-sm">
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
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                collisionPadding={12}
                className="w-96 rounded-lg p-0"
              >
                <DropdownMenuLabel className="px-3 py-2 font-normal">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">Notifications</p>
                    <div
                      className={`flex items-center gap-1 text-xs ${isConnected ? "text-green-500" : "text-yellow-500"}`}
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-yellow-500"}`}
                      />
                      {isConnected ? "Live" : "Connecting..."}
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-0" />
                {notifications.length > 0 ? (
                  <ScrollArea className="h-72">
                    <div className="p-2">
                      {notifications.slice(0, 5).map((notification) => (
                        <DropdownMenuItem key={notification.id} asChild>
                          <Link
                            href="/dashboard/notifications"
                            className="group flex cursor-pointer items-start gap-3 rounded-md p-3 text-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground"
                          >
                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                                notification.unread
                                  ? "bg-primary/10 text-primary group-hover:bg-primary-foreground/20 group-hover:text-primary-foreground"
                                  : "bg-muted text-muted-foreground group-hover:bg-primary-foreground/15 group-hover:text-primary-foreground"
                              }`}
                            >
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="mb-1 flex items-center gap-2">
                                <span
                                  className={`text-xs font-medium ${
                                    notification.unread
                                      ? "text-primary group-hover:text-primary-foreground"
                                      : "text-muted-foreground group-hover:text-primary-foreground/80"
                                  }`}
                                >
                                  {getNotificationLabel(notification.type)}
                                </span>
                                {notification.unread && (
                                  <span className="h-2 w-2 rounded-full bg-primary group-hover:bg-primary-foreground" />
                                )}
                              </div>
                              <p className="truncate text-sm font-medium text-foreground group-hover:text-primary-foreground">
                                {notification.title}
                              </p>
                              <p className="line-clamp-2 text-xs text-muted-foreground group-hover:text-primary-foreground/80">
                                {notification.message}
                              </p>
                              <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground group-hover:text-primary-foreground/70">
                                <span>
                                  {formatNotificationTime(notification.created_at)}
                                </span>
                                <span className="shrink-0 tabular-nums">
                                  {formatNotificationClock(notification.created_at)}
                                </span>
                              </div>
                            </div>
                          </Link>
                        </DropdownMenuItem>
                      ))}
                      {notifications.length > 5 && (
                        <DropdownMenuItem asChild>
                          <Link
                            href="/dashboard/notifications"
                            className="cursor-pointer text-center text-sm text-primary py-2"
                          >
                            View {notifications.length - 5} more notifications
                          </Link>
                        </DropdownMenuItem>
                      )}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No new notifications</p>
                  </div>
                )}
                <DropdownMenuSeparator className="my-0" />
                <div className="p-2">
                  <Link
                    href="/dashboard/notifications"
                    className="block w-full text-center text-sm text-primary hover:bg-accent rounded-md py-2 transition-colors"
                  >
                    View all notifications
                  </Link>
                </div>
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
              <DropdownMenuContent
                align="end"
                className="w-56 rounded-lg"
                collisionPadding={12}
              >
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

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-6 lg:p-8">{children}</div>
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
    <SidebarProvider className="h-svh max-h-svh min-h-0 overflow-hidden">
      <NotificationsRealtimeProvider>
        <ShellChrome>{children}</ShellChrome>
      </NotificationsRealtimeProvider>
    </SidebarProvider>
  );
}
