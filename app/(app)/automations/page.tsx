import { createClient } from "@/lib/supabase/server";
import AutomationsClient from "./automations-client";

export default async function AutomationsPage() {
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
    .maybeSingle();

  if (!membership) {
    return null;
  }

  const { data: automations, error } = await supabase
    .from("automations")
    .select(`
      id,
      organization_id,
      name,
      description,
      trigger_type,
      action_type,
      status,
      last_run_at,
      last_run_status,
      run_count,
      created_at,
      updated_at
    `)
    .eq(
      "organization_id",
      membership.organization_id
    )
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    console.error(
      "Error loading automations:",
      error
    );
  }

  return (
    <AutomationsClient
      automations={(automations ?? []) as any}
    />
  );
}