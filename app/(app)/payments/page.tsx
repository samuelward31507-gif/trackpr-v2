import { createClient } from "@/lib/supabase/server";
import PaymentsClient from "./payments-client";

export default async function PaymentsPage() {
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
      "Payments membership error:",
      membershipError
    );
  }

  if (!membership) {
    return null;
  }

  const { data: payments, error: paymentsError } =
    await supabase
      .from("payments")
      .select(`
        id,
        organization_id,
        job_id,
        lead_id,
        amount,
        payment_date,
        payment_method,
        status,
        reference,
        notes,
        created_at,
        updated_at,
        jobs (
          id,
          title,
          amount
        ),
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
      .order("payment_date", {
        ascending: false,
      })
      .order("created_at", {
        ascending: false,
      });

  if (paymentsError) {
    console.error(
      "Error loading payments:",
      paymentsError
    );
  }

  const { data: jobs, error: jobsError } =
    await supabase
      .from("jobs")
      .select(`
        id,
        title,
        amount,
        status,
        payment_status,
        lead_id
      `)
      .eq(
        "organization_id",
        membership.organization_id
      )
      .order("created_at", {
        ascending: false,
      });

  if (jobsError) {
    console.error(
      "Error loading jobs:",
      jobsError
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

  const normalizedPayments =
    (payments ?? []).map((payment: any) => ({
      ...payment,
      jobs: Array.isArray(payment.jobs)
        ? payment.jobs[0] ?? null
        : payment.jobs ?? null,
      leads: Array.isArray(payment.leads)
        ? payment.leads[0] ?? null
        : payment.leads ?? null,
    }));

  return (
    <PaymentsClient
      payments={normalizedPayments as any}
      jobs={(jobs ?? []) as any}
      leads={(leads ?? []) as any}
    />
  );
}