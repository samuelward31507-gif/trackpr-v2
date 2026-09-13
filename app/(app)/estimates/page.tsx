import { createClient } from "@/lib/supabase/server";
import EstimatesClient from "./estimates-client";

export default async function EstimatesPage() {
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
      "Estimates membership error:",
      membershipError
    );
  }

  if (!membership) {
    return null;
  }

  const { data: estimates, error } =
    await supabase
      .from("estimates")
      .select(`
        id,
        organization_id,
        lead_id,
        title,
        amount,
        status,
        estimate_date,
        expiration_date,
        notes,
        created_at,
        updated_at,
        leads (
          id,
          first_name,
          last_name,
          email,
          phone
        )
      `)
      .eq(
        "organization_id",
        membership.organization_id
      )
      .order("created_at", {
        ascending: false,
      });

  if (error) {
    console.error(
      "Error loading estimates:",
      error
    );
  }

  const { data: leads, error: leadsError } =
    await supabase
      .from("leads")
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone
      `)
      .eq(
        "organization_id",
        membership.organization_id
      )
      .order("first_name", {
        ascending: true,
      });

  if (leadsError) {
    console.error(
      "Error loading leads:",
      leadsError
    );
  }

  return (
    <EstimatesClient
      estimates={(estimates ?? []) as any}
      leads={(leads ?? []) as any}
    />
  );
}