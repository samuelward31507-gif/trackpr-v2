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

  /*
   * Authenticate user
   */
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error(
      "Estimate detail authentication failed:",
      userError
    );

    notFound();
  }

  /*
   * Load organization membership.
   *
   * limit(1) + maybeSingle() prevents the
   * "multiple rows returned" issue.
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
      "Error loading organization membership:",
      membershipError
    );

    notFound();
  }

  if (!membership?.organization_id) {
    console.error(
      "No organization membership found for user."
    );

    notFound();
  }

  const organizationId =
    membership.organization_id;

  /*
   * Load the estimate.
   *
   * The organization filter ensures users can
   * only access estimates belonging to their org.
   */
  const {
    data: estimate,
    error: estimateError,
  } = await supabase
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
    .eq(
      "organization_id",
      organizationId
    )
    .limit(1)
    .maybeSingle();

  if (estimateError) {
    console.error(
      "Error loading estimate:",
      estimateError
    );

    notFound();
  }

  if (!estimate) {
    console.error(
      "Estimate not found:",
      id
    );

    notFound();
  }

  /*
   * Load all leads for the Edit Estimate
   * customer selector.
   */
  const {
    data: leads,
    error: leadsError,
  } = await supabase
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
      organizationId
    )
    .order(
      "first_name",
      {
        ascending: true,
      }
    );

  if (leadsError) {
    console.error(
      "Error loading leads:",
      leadsError
    );
  }

  /*
   * Supabase may return the related lead as
   * either an object or an array depending
   * on the relationship shape.
   */
  const lead = Array.isArray(
    estimate.leads
  )
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