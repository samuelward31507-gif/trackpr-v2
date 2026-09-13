import { createClient } from "@/lib/supabase/server";
import ConversationsClient from "./conversations-client";

export default async function ConversationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) return null;

  const organizationId = membership.organization_id;

  const { data: conversations, error: conversationsError } = await supabase
    .from("conversations")
    .select(`
      id,
      organization_id,
      lead_id,
      channel,
      status,
      subject,
      last_message_at,
      last_message_preview,
      unread_count,
      created_at,
      updated_at
    `)
    .eq("organization_id", organizationId)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (conversationsError) {
    console.error("Error loading conversations:", conversationsError);
  }

  const conversationRows = conversations ?? [];

  const leadIds = Array.from(
    new Set(
      conversationRows
        .map((conversation) => conversation.lead_id)
        .filter(Boolean)
    )
  );

  let leads: any[] = [];

  if (leadIds.length > 0) {
    const { data: leadRows, error: leadsError } = await supabase
      .from("leads")
      .select(`
        id,
        first_name,
        last_name,
        phone,
        email,
        status,
        created_at
      `)
      .eq("organization_id", organizationId)
      .in("id", leadIds);

    if (leadsError) {
      console.error("Error loading conversation leads:", leadsError);
    }

    leads = leadRows ?? [];
  }

  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select(`
      id,
      organization_id,
      conversation_id,
      lead_id,
      direction,
      channel,
      body,
      sender_name,
      sender_phone,
      sender_email,
      is_read,
      external_message_id,
      sent_at,
      created_at
    `)
    .eq("organization_id", organizationId)
    .order("sent_at", { ascending: true });

  if (messagesError) {
    console.error("Error loading messages:", messagesError);
  }

  const leadMap = new Map(
    leads.map((lead) => [lead.id, lead])
  );

  const normalizedConversations = conversationRows.map((conversation) => ({
    ...conversation,
    lead: conversation.lead_id
      ? leadMap.get(conversation.lead_id) ?? null
      : null,
  }));

  return (
    <ConversationsClient
      conversations={normalizedConversations as any}
      messages={(messages ?? []) as any}
      organizationId={organizationId}
    />
  );
}