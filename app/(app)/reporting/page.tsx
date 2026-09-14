import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ReportingClient from "./reporting-client";

export default async function ReportingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    console.error(
      "Reporting membership error:",
      membershipError
    );
  }

  if (!membership?.organization_id) {
    redirect("/dashboard");
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
      .select(
        "id, status, source, created_at, updated_at"
      )
      .eq("organization_id", organizationId),

    supabase
      .from("estimates")
      .select(
        "id, lead_id, title, amount, status, estimate_date, expiration_date, created_at"
      )
      .eq("organization_id", organizationId),

    supabase
      .from("jobs")
      .select(
        "id, lead_id, estimate_id, title, amount, status, created_at"
      )
      .eq("organization_id", organizationId),

    supabase
      .from("payments")
      .select(
        "id, job_id, lead_id, amount, payment_date, payment_method, status, created_at"
      )
      .eq("organization_id", organizationId),

    supabase
      .from("reviews")
      .select(
        "id, lead_id, job_id, rating, review_text, source, status, review_date, created_at"
      )
      .eq("organization_id", organizationId),
  ]);

  if (leadsResult.error) {
    console.error(
      "Reporting leads error:",
      leadsResult.error
    );
  }

  if (estimatesResult.error) {
    console.error(
      "Reporting estimates error:",
      estimatesResult.error
    );
  }

  if (jobsResult.error) {
    console.error(
      "Reporting jobs error:",
      jobsResult.error
    );
  }

  if (paymentsResult.error) {
    console.error(
      "Reporting payments error:",
      paymentsResult.error
    );
  }

  if (reviewsResult.error) {
    console.error(
      "Reporting reviews error:",
      reviewsResult.error
    );
  }

  return (
    <ReportingClient
      leads={leadsResult.data ?? []}
      estimates={estimatesResult.data ?? []}
      jobs={jobsResult.data ?? []}
      payments={paymentsResult.data ?? []}
      reviews={reviewsResult.data ?? []}
    />
  );
}