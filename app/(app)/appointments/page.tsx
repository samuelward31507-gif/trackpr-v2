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

  /*
   * Get the authenticated user.
   */
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error(
      "Appointments auth error:",
      JSON.stringify(
        userError,
        null,
        2
      )
    );

    notFound();
  }

  if (!user) {
    notFound();
  }

  /*
   * Get the user's organization.
   *
   * We intentionally use limit(1).maybeSingle()
   * rather than assuming there can only ever be
   * one matching membership row.
   */
  const {
    data: membership,
    error: membershipError,
  } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    console.error(
      "Appointments membership error:",
      JSON.stringify(
        membershipError,
        null,
        2
      )
    );

    notFound();
  }

  if (!membership?.organization_id) {
    console.error(
      "Appointments: no organization membership found for user."
    );

    notFound();
  }

  const organizationId =
    membership.organization_id;

  /*
   * Load all appointment-related data
   * in parallel.
   */
  const [
    appointmentsResult,
    leadsResult,
    teamMembersResult,
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        `
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
        `
      )
      .eq(
        "organization_id",
        organizationId
      )
      .order("start_at", {
        ascending: true,
      }),

    supabase
      .from("leads")
      .select(
        `
          id,
          first_name,
          last_name,
          phone,
          email,
          service_interest
        `
      )
      .eq(
        "organization_id",
        organizationId
      )
      .order("created_at", {
        ascending: false,
      }),

    supabase
      .from("organization_members")
      .select("user_id")
      .eq(
        "organization_id",
        organizationId
      ),
  ]);

  const {
    data: appointments,
    error: appointmentsError,
  } = appointmentsResult;

  const {
    data: leads,
    error: leadsError,
  } = leadsResult;

  const {
    data: teamMembers,
    error: teamMembersError,
  } = teamMembersResult;

  /*
   * Log database errors without crashing the
   * entire page. This keeps the existing CRM
   * behavior while giving us useful diagnostics.
   */
  if (appointmentsError) {
    console.error(
      "Appointments database error:",
      JSON.stringify(
        appointmentsError,
        null,
        2
      )
    );
  }

  if (leadsError) {
    console.error(
      "Appointments leads database error:",
      JSON.stringify(
        leadsError,
        null,
        2
      )
    );
  }

  if (teamMembersError) {
    console.error(
      "Appointments team members database error:",
      JSON.stringify(
        teamMembersError,
        null,
        2
      )
    );
  }

  /*
   * Normalize the data before passing it to the
   * client component.
   *
   * This ensures we only pass plain serializable
   * values across the Server → Client boundary.
   */
  const safeAppointments: Appointment[] =
    (appointments || []).map(
      (appointment) => ({
        id: appointment.id,
        organization_id:
          appointment.organization_id,
        lead_id:
          appointment.lead_id,
        assigned_to:
          appointment.assigned_to,
        title:
          appointment.title,
        appointment_type:
          appointment.appointment_type ||
          "",
        status:
          appointment.status,
        start_at:
          appointment.start_at,
        end_at:
          appointment.end_at,
        notes:
          appointment.notes,
        created_at:
          appointment.created_at,
        updated_at:
          appointment.updated_at,
      })
    );

  const safeLeads: Lead[] =
    (leads || []).map(
      (lead) => ({
        id: lead.id,
        first_name:
          lead.first_name,
        last_name:
          lead.last_name,
        phone:
          lead.phone,
        email:
          lead.email,
        service_interest:
          lead.service_interest,
      })
    );

  const safeTeamMembers: TeamMember[] =
    (teamMembers || []).map(
      (member) => ({
        user_id:
          member.user_id,
      })
    );

  return (
    <AppointmentsClient
      initialAppointments={
        safeAppointments
      }
      leads={safeLeads}
      teamMembers={
        safeTeamMembers
      }
      currentUserId={user.id}
      organizationId={
        organizationId
      }
    />
  );
}