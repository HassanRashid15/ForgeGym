"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Shield, Image as ImageIcon } from "lucide-react";
import { AddressAutocomplete } from "@/components/forms/AddressAutocomplete";
import { GymMediaSection } from "@/components/profile/GymMediaSection";
import { NewsletterPreferenceCard } from "@/components/profile/NewsletterPreferenceCard";

export type ProfileSettingsFormSlice = {
  email: string;
  phone: string;
  address: string;
  gymName: string;
  gymType: string;
  gymCity: string;
  gymYearsOperating: string;
  gymOperatingDays: string;
  gymPeakHours: string;
  gymMemberCapacity: string;
  gymMonthlyFee: string;
  gymTrainerFee: string;
  gymFacilities: string[];
  gymServices: string[];
  avatarUrl: string;
  gymMainImageUrl: string;
  gymOptionalImagesUrls: string[];
  gymVideoUrl: string;
  gymVideoFileUrl: string;
  gymLatitude?: string;
  gymLongitude?: string;
  gymLocationLabel?: string;
};

type ProfileSettingsTabProps = {
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;
  profileData: ProfileSettingsFormSlice;
  onProfileChange: (partial: Partial<ProfileSettingsFormSlice>) => void;
  onSave?: () => void;
  isSaving?: boolean;
};

const fieldCls = (editing: boolean) =>
  editing ? "bg-zinc-900 border-zinc-700" : "bg-zinc-950/50";

export function ProfileSettingsTab({
  isAdmin,
  isSuperAdmin = false,
  isEditing,
  setIsEditing,
  profileData,
  onProfileChange,
  onSave,
  isSaving,
}: ProfileSettingsTabProps) {
  const patch = (partial: Partial<ProfileSettingsFormSlice>) => {
    onProfileChange(partial);
  };

  return (
    <div className="space-y-6">
      {!isSuperAdmin && <NewsletterPreferenceCard />}

      {isAdmin && (
        <>
          <Card className="border-zinc-800 bg-zinc-900/40 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div className="flex min-w-0 items-start gap-3">
                <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary text-primary-foreground">
                  {profileData.gymMainImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profileData.gymMainImageUrl}
                      alt={profileData.gymName || "Gym"}
                      className="absolute inset-0 size-full object-cover"
                    />
                  ) : (
                    <Building2 className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-xl">Gym details</CardTitle>
                  <CardDescription>
                    Edit the same gym fields stored in your profile from registration
                  </CardDescription>
                </div>
              </div>
              {!isEditing ? (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                    Done
                  </Button>
                  {onSave && (
                    <Button size="sm" onClick={onSave} disabled={isSaving}>
                      {isSaving ? "Saving…" : "Save to DB"}
                    </Button>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="settingsGymName">Gym name</Label>
                  <Input
                    id="settingsGymName"
                    value={profileData.gymName}
                    onChange={(e) => patch({ gymName: e.target.value })}
                    disabled={!isEditing}
                    className={fieldCls(isEditing)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settingsGymType">Gym type</Label>
                  <Input
                    id="settingsGymType"
                    value={profileData.gymType}
                    onChange={(e) => patch({ gymType: e.target.value })}
                    disabled={!isEditing}
                    placeholder="Commercial, Boutique…"
                    className={fieldCls(isEditing)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settingsGymCity">City / location</Label>
                  <Input
                    id="settingsGymCity"
                    value={profileData.gymCity}
                    onChange={(e) => patch({ gymCity: e.target.value })}
                    disabled={!isEditing}
                    className={fieldCls(isEditing)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settingsYears">Years operating</Label>
                  <Input
                    id="settingsYears"
                    value={profileData.gymYearsOperating}
                    onChange={(e) => patch({ gymYearsOperating: e.target.value })}
                    disabled={!isEditing}
                    className={fieldCls(isEditing)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settingsMonthlyFee">Monthly gym fee</Label>
                  <Input
                    id="settingsMonthlyFee"
                    value={profileData.gymMonthlyFee}
                    onChange={(e) => patch({ gymMonthlyFee: e.target.value })}
                    disabled={!isEditing}
                    placeholder="e.g. 5000"
                    className={fieldCls(isEditing)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    What members pay monthly — used on Monthly Fee billing.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settingsTrainerFee">Trainer fee</Label>
                  <Input
                    id="settingsTrainerFee"
                    value={profileData.gymTrainerFee}
                    onChange={(e) => patch({ gymTrainerFee: e.target.value })}
                    disabled={!isEditing}
                    placeholder="e.g. 3000"
                    className={fieldCls(isEditing)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Added to a member&apos;s monthly fee when they choose a trainer.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settingsDays">Operating days / week</Label>
                  <Input
                    id="settingsDays"
                    type="number"
                    min={1}
                    max={7}
                    value={profileData.gymOperatingDays}
                    onChange={(e) => patch({ gymOperatingDays: e.target.value })}
                    disabled={!isEditing}
                    className={fieldCls(isEditing)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settingsCapacity">Member capacity</Label>
                  <Input
                    id="settingsCapacity"
                    value={profileData.gymMemberCapacity}
                    onChange={(e) => patch({ gymMemberCapacity: e.target.value })}
                    disabled={!isEditing}
                    className={fieldCls(isEditing)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settingsPeakHours">Peak hours</Label>
                  <Input
                    id="settingsPeakHours"
                    value={profileData.gymPeakHours}
                    onChange={(e) => patch({ gymPeakHours: e.target.value })}
                    disabled={!isEditing}
                    placeholder="Morning / Evening…"
                    className={fieldCls(isEditing)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settingsPhone">Contact phone</Label>
                  <Input
                    id="settingsPhone"
                    value={profileData.phone}
                    onChange={(e) => patch({ phone: e.target.value })}
                    disabled={!isEditing}
                    className={fieldCls(isEditing)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Address</Label>
                {isEditing ? (
                  <AddressAutocomplete
                    id="settingsAddress"
                    value={profileData.address}
                    placeholder="Search or type gym address"
                    inputClassName="bg-zinc-900 border-zinc-700"
                    showMap
                    onChange={({ address, lat, lon, city }) =>
                      patch({
                        address,
                        ...(lat != null && lon != null
                          ? {
                              gymLatitude: String(lat),
                              gymLongitude: String(lon),
                              gymLocationLabel: address,
                              ...(city?.trim() ? { gymCity: city.trim() } : {}),
                            }
                          : { gymLatitude: "", gymLongitude: "" }),
                      })
                    }
                  />
                ) : (
                  <Input
                    value={profileData.address || "Not specified"}
                    disabled
                    className="bg-zinc-950/50"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label>Facilities</Label>
                {isEditing ? (
                  <Textarea
                    value={profileData.gymFacilities.join(", ")}
                    onChange={(e) =>
                      patch({
                        gymFacilities: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    rows={3}
                    placeholder="Comma-separated (e.g. Free Weights, Pool, Sauna)"
                    className="bg-zinc-900 border-zinc-700"
                  />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {profileData.gymFacilities.length > 0 ? (
                      profileData.gymFacilities.map((item) => (
                        <Badge
                          key={item}
                          variant="secondary"
                          className="bg-red-500/10 text-red-400 border border-red-500/20"
                        >
                          {item}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No facilities listed</p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Services</Label>
                {isEditing ? (
                  <Textarea
                    value={profileData.gymServices.join(", ")}
                    onChange={(e) =>
                      patch({
                        gymServices: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    rows={3}
                    placeholder="Comma-separated (e.g. Memberships, Personal Training)"
                    className="bg-zinc-900 border-zinc-700"
                  />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {profileData.gymServices.length > 0 ? (
                      profileData.gymServices.map((item) => (
                        <Badge
                          key={item}
                          variant="secondary"
                          className="bg-zinc-800 text-zinc-300 border border-zinc-700"
                        >
                          {item}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No services listed</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/40 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ImageIcon className="h-5 w-5 text-primary" />
                Gym photos & video
              </CardTitle>
              <CardDescription>
                Stored in the gym-media bucket and linked on your profile
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GymMediaSection
                logoUrl={profileData.avatarUrl || ""}
                mainImageUrl={profileData.gymMainImageUrl}
                optionalImagesUrls={profileData.gymOptionalImagesUrls}
                videoUrl={profileData.gymVideoUrl}
                videoFileUrl={profileData.gymVideoFileUrl}
                persistToDb
                onUpdate={(media) =>
                  patch({
                    avatarUrl: media.logoUrl,
                    gymMainImageUrl: media.mainImageUrl,
                    gymOptionalImagesUrls: media.optionalImagesUrls,
                    gymVideoUrl: media.videoUrl,
                    gymVideoFileUrl: media.videoFileUrl,
                  })
                }
              />
            </CardContent>
          </Card>
        </>
      )}

      <Card className="border-zinc-800 bg-zinc-900/40 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Shield className="h-5 w-5 text-primary" />
            Account security
          </CardTitle>
          <CardDescription>Manage credentials and login security</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border border-zinc-800 bg-zinc-900/60">
            <div>
              <p className="font-medium text-foreground">Email address</p>
              <p className="text-sm text-muted-foreground">{profileData.email}</p>
            </div>
            <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">
              Verified
            </Badge>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border border-zinc-800 bg-zinc-900/60">
            <div>
              <p className="font-medium text-foreground">Password</p>
              <p className="text-sm text-muted-foreground">Keep your password strong and updated</p>
            </div>
            <Link href="/login">
              <Button variant="outline" size="sm">
                Update password
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
