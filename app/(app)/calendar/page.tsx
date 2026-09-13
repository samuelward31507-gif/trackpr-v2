import { createClient } from "@/lib/supabase/server";
import CalendarClient from "./calendar-client";

export default async function CalendarPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership?.organization_id) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            No organization found
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Your account is not currently connected to an organization.
          </p>
        </div>
      </div>
    );
  }

  const organizationId = membership.organization_id;

  const [{ data: appointments }, { data: leads }] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        "id, organization_id, lead_id, title, status, start_at, end_at, notes, created_at, updated_at"
      )
      .eq("organization_id", organizationId)
      .order("start_at", { ascending: true }),

    supabase
      .from("leads")
      .select("id, first_name, last_name, phone, email")
      .eq("organization_id", organizationId)
      .order("first_name", { ascending: true }),
  ]);

  return (
    <CalendarClient
      organizationId={organizationId}
      appointments={appointments ?? []}
      leads={leads ?? []}
    />
  );
}