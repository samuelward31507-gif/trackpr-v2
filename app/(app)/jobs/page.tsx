import { createClient } from "@/lib/supabase/server";
import JobsClient from "./jobs-client";

export default async function JobsPage() {
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
    console.error("Jobs membership error:", membershipError);
  }

  if (!membership?.organization_id) {
    return null;
  }

  const organizationId = membership.organization_id;

  const [
    { data: jobs, error: jobsError },
    { data: leads, error: leadsError },
    { data: estimates, error: estimatesError },
  ] = await Promise.all([
    supabase
      .from("jobs")
      .select(
        `
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
        `
      )
      .eq("organization_id", organizationId)
      .order("created_at", {
        ascending: false,
      }),

    supabase
      .from("leads")
      .select(
        `
          id,
          first_name,
          last_name,
          email,
          phone
        `
      )
      .eq("organization_id", organizationId)
      .order("first_name", {
        ascending: true,
      }),

    supabase
      .from("estimates")
      .select(
        `
          id,
          title,
          amount,
          status,
          lead_id
        `
      )
      .eq("organization_id", organizationId)
      .order("created_at", {
        ascending: false,
      }),
  ]);

  if (jobsError) {
    console.error("Error loading jobs:", jobsError);
  }

  if (leadsError) {
    console.error("Error loading leads:", leadsError);
  }

  if (estimatesError) {
    console.error("Error loading estimates:", estimatesError);
  }

  const normalizedJobs = (jobs ?? []).map((job: any) => ({
    ...job,
    leads: Array.isArray(job.leads)
      ? job.leads[0] ?? null
      : job.leads ?? null,
  }));

  return (
    <JobsClient
      jobs={normalizedJobs as any}
      leads={(leads ?? []) as any}
      estimates={(estimates ?? []) as any}
    />
  );
}