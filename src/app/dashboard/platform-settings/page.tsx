"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

export default function PlatformSettingsPage() {
  const { user, isSuperAdmin, isLoading } = useAuth();
  const router = useRouter();

  const [platformMonthlyFee, setPlatformMonthlyFee] = useState("50");
  const [aiSpeedEnabled, setAiSpeedEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isSuperAdmin) {
      router.replace("/dashboard");
      return;
    }

    // Load current platform settings
    const loadSettings = async () => {
      const { data: feeData } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "platform_monthly_fee")
        .single();

      if (feeData) {
        setPlatformMonthlyFee(feeData.value);
      }

      const { data: aiSpeedData } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "ai_speed_enabled")
        .single();

      if (aiSpeedData) {
        setAiSpeedEnabled(aiSpeedData.value === "true");
      }

      setIsLoaded(true);
    };

    loadSettings();
  }, [isLoading, isSuperAdmin, router]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update platform monthly fee
      const { error: feeError } = await supabase
        .from("platform_settings")
        .update({ value: platformMonthlyFee, updated_at: new Date().toISOString() })
        .eq("key", "platform_monthly_fee");

      if (feeError) throw feeError;

      // Update AI Speed enabled status
      const { error: aiSpeedError } = await supabase
        .from("platform_settings")
        .update({ value: aiSpeedEnabled.toString(), updated_at: new Date().toISOString() })
        .eq("key", "ai_speed_enabled");

      if (aiSpeedError) throw aiSpeedError;

      toast.success("Platform settings updated successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update platform settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !isLoaded) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Configure platform-wide settings accessible to all gym owners and members
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Platform Membership Pricing</CardTitle>
          <CardDescription>
            Set the monthly fee for platform members who want access to all gyms
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="platformMonthlyFee">Monthly Fee (USD)</Label>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">$</span>
              <Input
                id="platformMonthlyFee"
                type="number"
                value={platformMonthlyFee}
                onChange={(e) => setPlatformMonthlyFee(e.target.value)}
                className="max-w-xs"
                min="0"
                step="1"
              />
              <span className="text-muted-foreground">/month</span>
            </div>
            <p className="text-xs text-muted-foreground">
              This is the amount platform members pay monthly to access all gyms on the platform.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Speed Testing</CardTitle>
          <CardDescription>
            Enable or disable the AI speed testing feature for the platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="aiSpeedEnabled">Enable AI Speed Testing</Label>
              <p className="text-xs text-muted-foreground">
                When disabled, the AI Speed Testing page will be inaccessible to all users
              </p>
            </div>
            <Switch
              id="aiSpeedEnabled"
              checked={aiSpeedEnabled}
              onCheckedChange={setAiSpeedEnabled}
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={isSaving} className="gap-2">
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            Save Changes
          </>
        )}
      </Button>
    </div>
  );
}
