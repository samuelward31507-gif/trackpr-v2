import { createClient } from "@/lib/supabase/server";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
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
    console.error("Dashboard membership error:", membershipError);
  }

  if (!membership?.organization_id) {
    return null;
  }

  const organizationId = membership.organization_id;

  const [
    leadsResult,
    estimatesResult,
    jobsResult,
    paymentsResult,
    reviewsResult,
  ] = await Promise.all([
    supabase
      .from("leads")
      .select(`
        id,
        first_name,
        last_name,
        status,
        created_at
      `)
      .eq("organization_id", organizationId)
      .order("created_at", {
        ascending: false,
      }),

    supabase
      .from("estimates")
      .select(`
        id,
        lead_id,
        status,
        amount,
        created_at
      `)
      .eq("organization_id", organizationId)
      .order("created_at", {
        ascending: false,
      }),

    supabase
      .from("jobs")
      .select(`
        id,
        lead_id,
        title,
        status,
        amount,
        payment_status,
        created_at
      `)
      .eq("organization_id", organizationId)
      .order("created_at", {
        ascending: false,
      }),

    supabase
      .from("payments")
      .select(`
        id,
        job_id,
        amount,
        status,
        payment_date,
        created_at
      `)
      .eq("organization_id", organizationId)
      .order("created_at", {
        ascending: false,
      }),

    supabase
      .from("reviews")
      .select(`
        id,
        rating,
        status,
        reviewer_name,
        review_date,
        created_at
      `)
      .eq("organization_id", organizationId)
      .order("created_at", {
        ascending: false,
      }),
  ]);

  if (leadsResult.error) {
    console.error("Dashboard leads error:", leadsResult.error);
  }

  if (estimatesResult.error) {
    console.error("Dashboard estimates error:", estimatesResult.error);
  }

  if (jobsResult.error) {
    console.error("Dashboard jobs error:", jobsResult.error);
  }

  if (paymentsResult.error) {
    console.error("Dashboard payments error:", paymentsResult.error);
  }

  if (reviewsResult.error) {
    console.error("Dashboard reviews error:", reviewsResult.error);
  }

  /*
   * The database column is "amount", while the
   * DashboardClient expects the estimate value
   * under the property "total".
   */
  const estimates = (estimatesResult.data ?? []).map((estimate) => ({
    ...estimate,
    total: estimate.amount,
  }));

  return (
    <DashboardClient
      leads={leadsResult.data ?? []}
      estimates={estimates}
      jobs={jobsResult.data ?? []}
      payments={paymentsResult.data ?? []}
      reviews={reviewsResult.data ?? []}
    />
  );
}