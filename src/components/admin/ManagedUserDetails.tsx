"use client";

import type { ManagedUser } from "@/api/admin-users";
import { DetailRow } from "@/components/admin/DetailRow";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getNameInitials } from "@/lib/utils";

function listValue(value?: string[] | string | null) {
  if (!value) return null;
  if (Array.isArray(value)) {
    const joined = value.filter(Boolean).join(", ");
    return joined || null;
  }
  return String(value) || null;
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1">
      <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-primary">
        {title}
      </h4>
      {children}
    </section>
  );
}

export function ManagedUserDetails({ user }: { user: ManagedUser }) {
  const isStaff = user.role === "staff";
  const isTrainer = user.role === "trainer";
  const isAdmin = user.role === "admin";
  const isMember = user.role === "user" || user.role === "moderator";

  return (
    <div className="mt-6 space-y-6 text-sm">
      <div className="flex items-center gap-3">
        <Avatar className="h-14 w-14">
          <AvatarImage src={user.avatar_url || undefined} alt={user.full_name || "User"} />
          <AvatarFallback>{getNameInitials(user.full_name || user.email || "U")}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">{user.full_name || "—"}</p>
          <p className="truncate text-muted-foreground">{user.email || "—"}</p>
        </div>
      </div>

      <Section title="Basic">
        <DetailRow label="Name" value={user.full_name} />
        <DetailRow label="Email" value={user.email} />
        <DetailRow label="Phone" value={user.phone} />
        <DetailRow label="Gender" value={user.gender} />
        <DetailRow label="Date of birth" value={formatDate(user.date_of_birth)} />
        <DetailRow label="Address" value={user.address} />
        <DetailRow label="Emergency contact" value={user.emergency_contact} />
        <DetailRow label="Role" value={user.role} />
        <DetailRow
          label="Status"
          value={user.account_status || user.membership_status}
        />
        {(isMember || isAdmin) && (
          <DetailRow label="Plan" value={user.membership_type} />
        )}
        <DetailRow label="Gym" value={user.gym_name} />
        <DetailRow label="Joined" value={formatDate(user.join_date || user.created_at)} />
      </Section>

      {isTrainer && (
        <>
          <Section title="Professional">
            <DetailRow label="Specialization" value={user.specialization} />
            <DetailRow label="Certifications" value={listValue(user.certifications)} />
            <DetailRow label="Certification #" value={user.certification_number} />
            <DetailRow label="Years experience" value={user.years_experience} />
            <DetailRow label="Education" value={user.education} />
            <DetailRow label="Skills" value={listValue(user.skills)} />
            <DetailRow label="Languages" value={listValue(user.languages)} />
            <DetailRow label="Bio" value={user.trainer_bio} />
            <DetailRow label="Instagram" value={user.instagram_url} />
            <DetailRow label="Facebook" value={user.facebook_url} />
            <DetailRow label="X / Twitter" value={user.twitter_url} />
            <DetailRow label="YouTube" value={user.youtube_url} />
            <DetailRow label="TikTok" value={user.tiktok_url} />
          </Section>
          <Section title="Employment">
            <DetailRow label="Employment type" value={user.employment_type} />
            <DetailRow label="Branch / department" value={user.branch_department} />
            <DetailRow label="Department" value={user.department} />
            <DetailRow label="Salary" value={user.salary} />
            <DetailRow
              label="Commission %"
              value={
                user.commission_percentage !== null && user.commission_percentage !== undefined
                  ? String(user.commission_percentage)
                  : null
              }
            />
            <DetailRow label="Working days" value={user.working_days} />
            <DetailRow label="Working hours" value={user.working_hours} />
          </Section>
          <Section title="Gym / clients">
            <DetailRow label="Max clients" value={user.max_client_capacity} />
            <DetailRow label="Assigned members" value={listValue(user.assigned_members)} />
            <DetailRow label="Availability" value={user.availability} />
            <DetailRow label="PT sessions" value={user.pt_sessions} />
            <DetailRow label="Leave info" value={user.leave_info} />
          </Section>
        </>
      )}

      {isStaff && (
        <>
          <Section title="Job">
            <DetailRow label="Staff type" value={user.staff_type} />
            <DetailRow label="Department" value={user.department} />
            <DetailRow label="Branch / department" value={user.branch_department} />
            <DetailRow label="Employment type" value={user.employment_type} />
            <DetailRow label="Supervisor" value={user.supervisor} />
          </Section>
          <Section title="Work">
            <DetailRow label="Shift" value={user.shift} />
            <DetailRow label="Working days" value={user.working_days} />
            <DetailRow label="Working hours" value={user.working_hours} />
            <DetailRow label="Salary" value={user.salary} />
            <DetailRow label="Overtime rate" value={user.overtime_rate} />
            <DetailRow label="Responsibilities" value={user.responsibilities} />
            <DetailRow label="Leave info" value={user.leave_info} />
          </Section>
        </>
      )}

      {(isStaff || isAdmin || isTrainer) && (
        <Section title="Account">
          {(isStaff || isTrainer) && (
            <DetailRow
              label="Login"
              value={user.login_enabled === false ? "Disabled" : "Enabled"}
            />
          )}
          <DetailRow
            label="Permissions"
            value={listValue(user.system_permissions)}
          />
          {user.is_super_admin != null && (
            <DetailRow
              label="Super admin"
              value={user.is_super_admin ? "Yes" : "No"}
            />
          )}
          {user.admin_approved != null && (
            <DetailRow
              label="Admin approved"
              value={user.admin_approved ? "Yes" : "No"}
            />
          )}
        </Section>
      )}
    </div>
  );
}
