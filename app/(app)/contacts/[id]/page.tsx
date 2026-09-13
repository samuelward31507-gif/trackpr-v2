import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ContactDetailClient from "./contact-detail-client";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ContactDetailPage({
  params,
}: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!membership?.organization_id) {
    notFound();
  }

  const organizationId = membership.organization_id;

  // Contact
  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .select(
      `
        id,
        organization_id,
        lead_id,
        first_name,
        last_name,
        company_name,
        phone,
        email,
        status,
        notes,
        created_at,
        updated_at
      `
    )
    .eq("id", id)
    .eq("organization_id", organizationId)
    .single();

  if (contactError || !contact) {
    notFound();
  }

  // Lead
  let lead = null;

  if (contact.lead_id) {
    const { data } = await supabase
      .from("leads")
      .select(
        `
          id,
          first_name,
          last_name,
          email,
          phone,
          status,
          created_at
        `
      )
      .eq("id", contact.lead_id)
      .eq("organization_id", organizationId)
      .maybeSingle();

    lead = data;
  }

  const leadId = contact.lead_id;

  // Appointments
  let appointments: any[] = [];

  if (leadId) {
    const { data } = await supabase
      .from("appointments")
      .select(
        `
          id,
          lead_id,
          title,
          appointment_type,
          status,
          start_at,
          end_at,
          notes,
          created_at
        `
      )
      .eq("organization_id", organizationId)
      .eq("lead_id", leadId)
      .order("start_at", { ascending: false });

    appointments = data ?? [];
  }

  // Estimates
  let estimates: any[] = [];

  if (leadId) {
    const { data } = await supabase
      .from("estimates")
      .select(
        `
          id,
          lead_id,
          title,
          amount,
          status,
          estimate_date,
          expiration_date,
          notes,
          created_at
        `
      )
      .eq("organization_id", organizationId)
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });

    estimates = data ?? [];
  }

  // Jobs
  let jobs: any[] = [];

  if (leadId) {
    const { data } = await supabase
      .from("jobs")
      .select(
        `
          id,
          lead_id,
          estimate_id,
          title,
          amount,
          status,
          payment_status,
          start_date,
          due_date,
          completed_date,
          notes,
          created_at
        `
      )
      .eq("organization_id", organizationId)
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });

    jobs = data ?? [];
  }

  // Payments
  let payments: any[] = [];

  if (leadId) {
    const { data } = await supabase
      .from("payments")
      .select(
        `
          id,
          job_id,
          lead_id,
          amount,
          payment_date,
          payment_method,
          status,
          reference,
          notes,
          created_at
        `
      )
      .eq("organization_id", organizationId)
      .eq("lead_id", leadId)
      .order("payment_date", { ascending: false });

    payments = data ?? [];
  }

  // Conversations
  let conversations: any[] = [];

  if (leadId) {
    const { data } = await supabase
      .from("conversations")
      .select(
        `
          id,
          lead_id,
          channel,
          status,
          subject,
          last_message_at,
          last_message_preview,
          unread_count,
          created_at,
          updated_at
        `
      )
      .eq("organization_id", organizationId)
      .eq("lead_id", leadId)
      .order("last_message_at", {
        ascending: false,
        nullsFirst: false,
      });

    conversations = data ?? [];
  }

  // Messages belonging to this contact's conversations
  let messages: any[] = [];

  const conversationIds = conversations.map(
    (conversation) => conversation.id
  );

  if (conversationIds.length > 0) {
    const { data } = await supabase
      .from("messages")
      .select(
        `
          id,
          conversation_id,
          lead_id,
          direction,
          channel,
          body,
          sender_name,
          sender_phone,
          sender_email,
          is_read,
          sent_at,
          created_at
        `
      )
      .eq("organization_id", organizationId)
      .in("conversation_id", conversationIds)
      .order("sent_at", { ascending: true });

    messages = data ?? [];
  }

  return (
    <ContactDetailClient
      organizationId={organizationId}
      contact={contact}
      lead={lead}
      appointments={appointments}
      estimates={estimates}
      jobs={jobs}
      payments={payments}
      conversations={conversations}
      messages={messages}
    />
  );
}