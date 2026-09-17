import { ComingSoon } from "@/components/ComingSoon";
import { CreditCard } from "lucide-react";

export default function MembershipPage() {
  return (
    <ComingSoon
      title="Membership"
      description="Plans, renewals, and billing for members. This ships in the next phase."
      icon={CreditCard}
      features={[
        "Membership plans and upgrades",
        "Renewal reminders",
        "Online payments (later)",
      ]}
    />
  );
}
