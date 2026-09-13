import { createClient } from "@/lib/supabase/server";
import LeadsClient from "./leads-client";

export default async function LeadsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    console.error("Leads membership error:", membershipError);
  }

  if (!membership) {
    return null;
  }

  const { data: leads, error } = await supabase
    .from("leads")
    .select(`
      id,
      first_name,
      last_name,
      email,
      phone,
      status,
      source,
      service_interest,
      next_follow_up_at,
      created_at
    `)
    .eq("organization_id", membership.organization_id)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error("Error loading leads:", error);
  }

  return <LeadsClient leads={leads ?? []} />;
}