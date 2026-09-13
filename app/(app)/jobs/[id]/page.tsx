import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import JobDetailClient from "./job-detail-client";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function JobDetailPage({
  params,
}: PageProps) {
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

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select(`
      id,
      organization_id,
      lead_id,
      estimate_id,
      title,
      amount,
      status,
      payment_status,
      start_date,
      due_date,
      completed_date,
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

  if (jobError) {
    console.error("Error loading job:", jobError);
    notFound();
  }

  if (!job) {
    notFound();
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
      .eq("organization_id", membership.organization_id)
      .order("first_name", { ascending: true });

  if (leadsError) {
    console.error("Error loading leads:", leadsError);
  }

  const { data: estimates, error: estimatesError } =
    await supabase
      .from("estimates")
      .select(`
        id,
        title,
        amount,
        status,
        lead_id
      `)
      .eq("organization_id", membership.organization_id)
      .order("created_at", { ascending: false });

  if (estimatesError) {
    console.error("Error loading estimates:", estimatesError);
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
        updated_at
      `)
      .eq("organization_id", membership.organization_id)
      .eq("job_id", id)
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false });

  if (paymentsError) {
    console.error("Error loading payments:", paymentsError);
  }

  const normalizedJob = {
    ...job,
    leads: Array.isArray(job.leads)
      ? job.leads[0] ?? null
      : job.leads ?? null,
  };

  return (
    <JobDetailClient
      job={normalizedJob as any}
      leads={(leads ?? []) as any}
      estimates={(estimates ?? []) as any}
      payments={(payments ?? []) as any}
    />
  );
}