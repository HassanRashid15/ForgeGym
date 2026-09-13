"use client";

import { ComingSoon } from "@/components/ComingSoon";
import { CreditCard } from "lucide-react";

export default function MembershipPage() {
  return (
    <ComingSoon
      title="Payments & Membership"
      description="Online membership plans and payments are coming soon. For now, join your gym and track association on your profile — pay at the gym as usual."
      icon={CreditCard}
      features={[
        "Online plan upgrades",
        "Secure monthly payments",
        "Billing history & receipts",
      ]}
    />
  );
}
