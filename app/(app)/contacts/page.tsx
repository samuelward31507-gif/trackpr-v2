import { createClient } from "@/lib/supabase/server";
import ContactsClient from "./contacts-client";

export default async function ContactsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: membership, error: membershipError } =
    await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

  if (membershipError) {
    console.error(
      "Contacts membership error:",
      membershipError
    );
  }

  if (!membership?.organization_id) {
    return null;
  }

  const organizationId = membership.organization_id;

  const { data: contacts, error } = await supabase
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
    .eq("organization_id", organizationId)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error("Error loading contacts:", error);
  }

  return (
    <ContactsClient
      organizationId={organizationId}
      initialContacts={contacts ?? []}
    />
  );
}