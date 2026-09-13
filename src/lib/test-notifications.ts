/**
 * Test script to create sample notifications for development
 * This can be run from the browser console or as a separate script
 */

import { createNotification } from "@/lib/notifications";

export async function createSampleNotifications(userId: string) {
  const notifications = [
    {
      user_id: userId,
      type: "confirmation" as const,
      title: "Hypertrophy Clinic Booking Confirmed",
      message: "Your slot for the 18:00 Hypertrophy Clinic is secured. Arrive 10 minutes early for mobilization protocol.",
      metadata: { icon: "event_available", priority: "high" as const },
    },
    {
      user_id: userId,
      type: "maintenance" as const,
      title: "Squat Rack Alpha Offline",
      message: "Squat Rack Alpha is currently undergoing structural maintenance. Please utilize Beta or Gamma racks.",
      metadata: { icon: "warning", priority: "high" as const },
    },
    {
      user_id: userId,
      type: "directive" as const,
      title: "Embrace the Resistance",
      message: "The iron never lies to you. You can walk outside and listen to all kinds of talk, get told that you're a god or a total bastard. The iron will always kick you the real deal.",
      metadata: { icon: "electric_bolt", priority: "medium" as const },
    },
    {
      user_id: userId,
      type: "info" as const,
      title: "Protocol V2.4 Installed",
      message: "New macro tracking features are now active. Visit your progress dashboard to explore the updated interface.",
      metadata: { icon: "update", priority: "low" as const },
    },
  ];

  const results = await Promise.all(
    notifications.map((notif) => createNotification(notif))
  );

  console.log("Created sample notifications:", results);
  return results;
}

// To use this in a component:
// import { createSampleNotifications } from "@/lib/test-notifications";
// await createSampleNotifications(user.id);