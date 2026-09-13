import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SettingsClient from "./settings-client";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!membership?.organization_id) {
    redirect("/dashboard");
  }

  const organizationId = membership.organization_id;

  const [{ data: organization }, { data: settings }] =
    await Promise.all([
      supabase
        .from("organizations")
        .select("id, name, industry, phone, website")
        .eq("id", organizationId)
        .single(),

      supabase
        .from("organization_settings")
        .select(
          `
          id,
          organization_id,
          email,
          address,
          city,
          state,
          zip_code,
          timezone,
          notifications_enabled,
          email_notifications,
          appointment_reminders,
          lead_notifications,
          payment_notifications,
          review_notifications,
          default_lead_status,
          default_estimate_status,
          default_job_status,
          ai_enabled,
          ai_auto_reply,
          ai_human_handoff
        `
        )
        .eq("organization_id", organizationId)
        .maybeSingle(),
    ]);

  if (!organization) {
    redirect("/dashboard");
  }

  return (
    <SettingsClient
      userEmail={user.email ?? ""}
      role={membership.role ?? "member"}
      organization={organization}
      settings={settings}
    />
  );
}