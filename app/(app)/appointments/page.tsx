import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppointmentsClient from "./appointments-client";

export type Appointment = {
  id: string;
  organization_id: string;
  lead_id: string | null;
  assigned_to: string | null;
  title: string;
  appointment_type: string;
  status:
    | "scheduled"
    | "confirmed"
    | "completed"
    | "no_show"
    | "cancelled";
  start_at: string;
  end_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Lead = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  service_interest: string | null;
};

export type TeamMember = {
  user_id: string;
};

export default async function AppointmentsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data: membership, error: membershipError } =
    await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .maybeSingle();

  if (membershipError) {
    console.error(
      "Error loading organization membership:",
      JSON.stringify(membershipError, null, 2)
    );
  }

  if (!membership) {
    notFound();
  }

  const organizationId = membership.organization_id;

  const [
    { data: appointments, error: appointmentsError },
    { data: leads, error: leadsError },
    { data: teamMembers, error: teamMembersError },
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select(`
        id,
        organization_id,
        lead_id,
        assigned_to,
        title,
        appointment_type,
        status,
        start_at,
        end_at,
        notes,
        created_at,
        updated_at
      `)
      .eq("organization_id", organizationId)
      .order("start_at", {
        ascending: true,
      }),

    supabase
      .from("leads")
      .select(`
        id,
        first_name,
        last_name,
        phone,
        email,
        service_interest
      `)
      .eq("organization_id", organizationId)
      .order("created_at", {
        ascending: false,
      }),

    supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", organizationId),
  ]);

  if (appointmentsError) {
    console.error(
      "Error loading appointments:",
      JSON.stringify(appointmentsError, null, 2)
    );
  }

  if (leadsError) {
    console.error(
      "Error loading leads:",
      JSON.stringify(leadsError, null, 2)
    );
  }

  if (teamMembersError) {
    console.error(
      "Error loading team members:",
      JSON.stringify(teamMembersError, null, 2)
    );
  }

  return (
    <AppointmentsClient
      initialAppointments={appointments || []}
      leads={leads || []}
      teamMembers={teamMembers || []}
      currentUserId={user.id}
      organizationId={organizationId}
    />
  );
}