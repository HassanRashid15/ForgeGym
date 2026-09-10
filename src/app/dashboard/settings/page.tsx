import { redirect } from "next/navigation";

/** Settings merged into profile — keep this route for old bookmarks */
export default function SettingsPage() {
  redirect("/profile?tab=settings");
}
