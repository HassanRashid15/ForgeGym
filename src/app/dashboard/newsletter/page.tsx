"use client";

import { useState, useEffect } from "react";
import { Mail, Trash2, RefreshCw, Download, Search, CheckCircle, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { format } from "date-fns";
import { TableRowSkeleton } from "@/components/loading/TableRowSkeleton";
import { ApiError } from "@/api/client";
import {
  listAdminNewsletter,
  deleteAdminNewsletter,
  subscribeNewsletter,
  cleanupAdminNewsletter,
  type NewsletterSubscription,
} from "@/api/newsletter";

export default function NewsletterPage() {
  const [subscriptions, setSubscriptions] = useState<NewsletterSubscription[]>([]);
  const [filteredSubscriptions, setFilteredSubscriptions] = useState<NewsletterSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [unsubscribingEmail, setUnsubscribingEmail] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const data = await listAdminNewsletter();

      if (data.success) {
        setSubscriptions(data.subscriptions);
        setFilteredSubscriptions(data.subscriptions);
      } else {
        toast.error(data.error || "Failed to fetch subscriptions");
      }
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Failed to fetch subscriptions",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  // Update current time every second for countdown timers
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate time remaining until deletion
  const getTimeRemaining = (deletionScheduledAt: string | null) => {
    if (!deletionScheduledAt) return null;
    
    const deletionTime = new Date(deletionScheduledAt);
    const remaining = deletionTime.getTime() - currentTime.getTime();
    
    if (remaining <= 0) return null;
    
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    
    return { minutes, seconds, total: remaining };
  };

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredSubscriptions(subscriptions);
    } else {
      const filtered = subscriptions.filter((sub) =>
        sub.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredSubscriptions(filtered);
    }
  }, [searchQuery, subscriptions]);

  const handleUnsubscribe = async (email: string) => {
    setUnsubscribingEmail(email);
    try {
      const data = await deleteAdminNewsletter(email);

      if (data.success) {
        toast.success(data.message || "User unsubscribed successfully");
        await fetchSubscriptions();
      } else {
        toast.error(data.error || "Failed to unsubscribe user");
      }
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Failed to unsubscribe user",
      );
    } finally {
      setUnsubscribingEmail(null);
    }
  };

  const handleReactivate = async (email: string) => {
    try {
      const data = await subscribeNewsletter(email);

      if (data.success) {
        toast.success("Subscription reactivated successfully");
        await fetchSubscriptions();
      } else {
        toast.error(data.error || "Failed to reactivate subscription");
      }
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Failed to reactivate subscription",
      );
    }
  };

  const handleCleanup = async () => {
    try {
      const data = await cleanupAdminNewsletter();

      if (data.success) {
        toast.success(`Cleaned up ${data.deleted_count} expired subscription(s)`);
        await fetchSubscriptions();
      } else {
        toast.error(data.error || "Failed to cleanup expired subscriptions");
      }
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Failed to cleanup expired subscriptions",
      );
    }
  };

  const handleExport = () => {
    const csvContent = [
      ["Email", "Subscribed At", "Status", "Unsubscribed At", "Reason"],
      ...filteredSubscriptions.map((sub) => [
        sub.email,
        format(new Date(sub.subscribed_at), "yyyy-MM-dd HH:mm:ss"),
        sub.is_active ? "Active" : "Unsubscribed",
        sub.unsubscribed_at ? format(new Date(sub.unsubscribed_at), "yyyy-MM-dd HH:mm:ss") : "",
        sub.unsubscribe_reason || "",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter-subscriptions-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("CSV exported successfully");
  };

  const activeCount = subscriptions.filter((s) => s.is_active).length;
  const unsubscribedCount = subscriptions.filter((s) => !s.is_active).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl tracking-wide text-foreground sm:text-4xl">
            NEWSLETTER SUBSCRIBERS
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage newsletter subscriptions and view subscriber analytics
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSubscriptions}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCleanup}
            className="gap-2 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Cleanup Expired
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subscriptions.length}</div>
            <p className="text-xs text-muted-foreground">All time subscriptions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Subscribers</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground">Currently subscribed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Unsubscribed</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unsubscribedCount}</div>
            <p className="text-xs text-muted-foreground">Previously subscribed</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Subscriptions</CardTitle>
              <CardDescription>
                {filteredSubscriptions.length} {filteredSubscriptions.length === 1 ? "subscriber" : "subscribers"}
              </CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full sm:w-[300px]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableRowSkeleton rows={5} columns={3} />
          ) : filteredSubscriptions.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center text-center">
              <Mail className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "No subscribers found matching your search" : "No newsletter subscribers yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredSubscriptions.map((subscription) => (
                <div
                  key={subscription.id}
                  className="flex items-center justify-between gap-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{subscription.email}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Subscribed {format(new Date(subscription.subscribed_at), "MMM d, yyyy")}</span>
                        {!subscription.is_active && subscription.unsubscribed_at && (
                          <>
                            <span>•</span>
                            <span>Unsubscribed {format(new Date(subscription.unsubscribed_at), "MMM d, yyyy")}</span>
                          </>
                        )}
                      </div>
                      {!subscription.is_active && subscription.deletion_scheduled_at && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-red-600">
                          <Clock className="h-3 w-3" />
                          <span className="font-medium">
                            {(() => {
                              const timeRemaining = getTimeRemaining(subscription.deletion_scheduled_at);
                              if (!timeRemaining) return "Deleting now...";
                              return `Auto-delete in ${timeRemaining.minutes}:${timeRemaining.seconds.toString().padStart(2, '0')}`;
                            })()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={subscription.is_active ? "default" : "secondary"}
                      className={subscription.is_active ? "bg-green-600 hover:bg-green-700" : ""}
                    >
                      {subscription.is_active ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 mr-1" />
                          Unsubscribed
                        </>
                      )}
                    </Badge>
                    {subscription.is_active ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnsubscribe(subscription.email)}
                        disabled={unsubscribingEmail === subscription.email}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        {unsubscribingEmail === subscription.email ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReactivate(subscription.email)}
                        className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-600/10"
                        title="Reactivate subscription"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}