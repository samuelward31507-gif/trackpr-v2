import { createClient } from "@/lib/supabase/server";
import WorkflowClient from "./workflow-client";

export default async function WorkflowsPage() {
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
    .limit(1)
    .maybeSingle();

  if (!membership?.organization_id) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            No organization found
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Your account is not currently connected to an organization.
          </p>
        </div>
      </div>
    );
  }

  const organizationId = membership.organization_id;

  const [{ data: workflows }, { data: steps }] = await Promise.all([
    supabase
      .from("workflows")
      .select(
        "id, organization_id, name, description, trigger_type, status, created_at, updated_at"
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),

    supabase
      .from("workflow_steps")
      .select(
        "id, workflow_id, organization_id, step_order, step_type, name, configuration, created_at, updated_at"
      )
      .eq("organization_id", organizationId)
      .order("step_order", { ascending: true }),
  ]);

  return (
    <WorkflowClient
      organizationId={organizationId}
      initialWorkflows={workflows ?? []}
      initialSteps={steps ?? []}
    />
  );
}