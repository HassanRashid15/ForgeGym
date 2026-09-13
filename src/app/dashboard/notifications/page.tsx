"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { 
  Bell, 
  Check, 
  AlertTriangle, 
  Calendar, 
  Zap, 
  RefreshCw,
  Clock,
  X,
  CreditCard,
  Trophy,
  BellRing,
  Sparkles,
  Heart,
  Users,
  Tag,
  MessageSquare,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Notification as LibNotification, NotificationType } from "@/lib/notifications";

type Notification = Pick<
  LibNotification,
  "id" | "type" | "title" | "message" | "unread" | "created_at" | "metadata"
>;

const notificationTypeConfig = {
  confirmation: {
    color: "text-emerald-500",
    label: "Confirmation",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500",
    icon: Calendar,
  },
  maintenance: {
    color: "text-red-500",
    label: "Facility Alert",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500",
    icon: AlertTriangle,
  },
  directive: {
    color: "text-amber-500",
    label: "Daily Directive",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500",
    icon: Zap,
  },
  info: {
    color: "text-blue-500",
    label: "System",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500",
    icon: RefreshCw,
  },
  alert: {
    color: "text-red-500",
    label: "Alert",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500",
    icon: AlertTriangle,
  },
  booking: {
    color: "text-purple-500",
    label: "Booking",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500",
    icon: Calendar,
  },
  payment: {
    color: "text-green-500",
    label: "Payment",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500",
    icon: CreditCard,
  },
  achievement: {
    color: "text-yellow-500",
    label: "Achievement",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500",
    icon: Trophy,
  },
  reminder: {
    color: "text-orange-500",
    label: "Reminder",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500",
    icon: BellRing,
  },
  system: {
    color: "text-blue-500",
    label: "System",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500",
    icon: RefreshCw,
  },
  welcome: {
    color: "text-pink-500",
    label: "Welcome",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500",
    icon: Sparkles,
  },
  membership: {
    color: "text-indigo-500",
    label: "Membership",
    bgColor: "bg-indigo-500/10",
    borderColor: "border-indigo-500",
    icon: Users,
  },
  class_update: {
    color: "text-cyan-500",
    label: "Class Update",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500",
    icon: Calendar,
  },
  promotion: {
    color: "text-rose-500",
    label: "Promotion",
    bgColor: "bg-rose-500/10",
    borderColor: "border-rose-500",
    icon: Tag,
  },
  feedback: {
    color: "text-teal-500",
    label: "Feedback",
    bgColor: "bg-teal-500/10",
    borderColor: "border-teal-500",
    icon: MessageSquare,
  },
  security: {
    color: "text-red-600",
    label: "Security",
    bgColor: "bg-red-600/10",
    borderColor: "border-red-600",
    icon: Shield,
  },
  admin_approval_request: {
    color: "text-amber-600",
    label: "Admin approval",
    bgColor: "bg-amber-600/10",
    borderColor: "border-amber-600",
    icon: Shield,
  },
  member_approval_request: {
    color: "text-indigo-600",
    label: "Member approval",
    bgColor: "bg-indigo-600/10",
    borderColor: "border-indigo-600",
    icon: Users,
  },
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<string>("all");
  const [filterType, setFilterType] = useState<"all" | "unread">("all");

  const { 
    notifications, 
    unreadCount, 
    isConnected, 
    error, 
    refresh 
  } = useRealtimeNotifications({
    enabled: !!user?.id,
    onNewNotification: (notification) => {
      toast.success(`New notification: ${notification.title}`);
    },
  });

  // Handle real-time connection status
  useEffect(() => {
    if (error) {
      console.error("Real-time notifications error:", error);
      toast.error("Connection to notifications failed");
    }
  }, [error]);

  // Show loading state while initially connecting
  const isLoading = !isConnected && notifications.length === 0;

  const filteredNotifications = notifications.filter((notification) => {
    if (filterType === "unread" && !notification.unread) return false;
    if (filter === "all") return true;
    return notification.type === filter;
  });

  const handleAcknowledgeAll = async () => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_all_read" }),
      });

      if (!response.ok) throw new Error("Failed to mark all as read");

      // Real-time hook will automatically update the notifications
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Error acknowledging all:", error);
      toast.error("Failed to mark all as read");
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss" }),
      });

      if (!response.ok) throw new Error("Failed to dismiss notification");

      // Real-time hook will automatically update the notifications
      toast.success("Notification dismissed");
    } catch (error) {
      console.error("Error dismissing notification:", error);
      toast.error("Failed to dismiss notification");
    }
  };

  const handleAcknowledge = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_read" }),
      });

      if (!response.ok) throw new Error("Failed to mark as read");

      // Real-time hook will automatically update the notifications
    } catch (error) {
      console.error("Error acknowledging notification:", error);
      toast.error("Failed to mark as read");
    }
  };

  const formatTimestamp = (timestamp: string) => {
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
  };

  const groupNotificationsByDate = (notifs: Notification[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups: { [key: string]: Notification[] } = {
      today: [],
      yesterday: [],
      older: [],
    };

    notifs.forEach((notif) => {
      const notifDate = new Date(notif.created_at);
      notifDate.setHours(0, 0, 0, 0);

      if (notifDate.getTime() === today.getTime()) {
        groups.today.push(notif);
      } else if (notifDate.getTime() === yesterday.getTime()) {
        groups.yesterday.push(notif);
      } else {
        groups.older.push(notif);
      }
    });

    return groups;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 px-4 py-5 sm:px-6">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
        <p className="animate-pulse text-sm text-muted-foreground">
          Loading notifications…
        </p>
      </div>
    );
  }

  const groupedNotifications = groupNotificationsByDate(filteredNotifications);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 px-4 py-5 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            System Protocols
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            <span>
              {unreadCount} unread {unreadCount === 1 ? "alert" : "alerts"}
            </span>
            <span className="text-border">·</span>
            <span
              className={`inline-flex items-center gap-1.5 text-xs ${
                isConnected ? "text-emerald-500" : "text-amber-500"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isConnected ? "animate-pulse bg-emerald-500" : "bg-amber-500"
                }`}
              />
              {isConnected ? "Live" : "Connecting…"}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={refresh} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          {unreadCount > 0 ? (
            <Button onClick={handleAcknowledgeAll} size="sm">
              <Check className="mr-2 h-4 w-4" />
              Acknowledge All
            </Button>
          ) : null}
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-border/60 bg-card/40 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={filterType === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType("all")}
          >
            All Alerts
          </Button>
          <Button
            variant={filterType === "unread" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType("unread")}
          >
            Unread
          </Button>
          <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            {(
              [
                ["all", "All"],
                ["confirmation", "Confirmations"],
                ["booking", "Bookings"],
                ["payment", "Payments"],
                ["achievement", "Achievements"],
                ["maintenance", "Maintenance"],
                ["system", "System"],
              ] as const
            ).map(([value, label]) => (
              <Button
                key={value}
                variant={filter === value ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(value)}
                className="shrink-0"
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-5">
        {filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bell className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No notifications found</p>
            </CardContent>
          </Card>
        ) : (
          (
            [
              ["today", "Today"],
              ["yesterday", "Yesterday"],
              ["older", "Older"],
            ] as const
          ).map(([key, label]) => {
            const items = groupedNotifications[key];
            if (!items.length) return null;
            return (
              <section key={key} className="space-y-3">
                <div className="flex items-center gap-3 pt-1">
                  <div className="h-px flex-1 bg-border" />
                  <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {label}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="space-y-2.5">
                  {items.map((notification) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      onDismiss={handleDismiss}
                      onAcknowledge={handleAcknowledge}
                      formatTimestamp={formatTimestamp}
                    />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}

function NotificationCard({
  notification,
  onDismiss,
  onAcknowledge,
  formatTimestamp,
}: {
  notification: Notification;
  onDismiss: (id: string) => void;
  onAcknowledge: (id: string) => void;
  formatTimestamp: (timestamp: string) => string;
}) {
  const config =
    notificationTypeConfig[notification.type as keyof typeof notificationTypeConfig] ||
    notificationTypeConfig.system;
  const Icon = config.icon;

  return (
    <Card
      className={`overflow-hidden border-border/70 shadow-none ${
        notification.unread
          ? `border-l-[3px] ${config.borderColor} bg-card`
          : "bg-muted/15"
      }`}
    >
      <CardContent className="relative p-4 pr-12">
        <div className="absolute right-2 top-2 flex items-center gap-0.5">
          {notification.unread ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => onAcknowledge(notification.id)}
              title="Mark as read"
            >
              <Check className="h-4 w-4" />
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => onDismiss(notification.id)}
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              notification.unread ? config.bgColor : "bg-muted"
            }`}
          >
            <Icon
              className={`h-4 w-4 ${
                notification.unread ? config.color : "text-muted-foreground"
              }`}
            />
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span
                className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                  notification.unread
                    ? `${config.bgColor} ${config.color}`
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {config.label}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3 shrink-0" />
                {formatTimestamp(notification.created_at)}
              </span>
            </div>
            <h3 className="text-sm font-semibold leading-snug text-foreground">
              {notification.title}
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {notification.message}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}