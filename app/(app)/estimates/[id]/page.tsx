import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EstimateDetailClient from "./estimate-detail-client";

export default async function EstimateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
    .maybeSingle();

  if (!membership) {
    notFound();
  }

  const { data: estimate, error } = await supabase
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
    .eq("id", id)
    .eq("organization_id", membership.organization_id)
    .maybeSingle();

  if (error) {
    console.error("Error loading estimate:", error);
  }

  if (!estimate) {
    notFound();
  }

  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select(`
      id,
      first_name,
      last_name,
      email,
      phone
    `)
    .eq("organization_id", membership.organization_id)
    .order("first_name", { ascending: true });

  if (leadsError) {
    console.error("Error loading leads:", leadsError);
  }

  const lead = Array.isArray(estimate.leads)
    ? estimate.leads[0] ?? null
    : estimate.leads;

  return (
    <EstimateDetailClient
      estimate={{
        ...estimate,
        leads: lead,
      }}
      leads={leads ?? []}
    />
  );
}