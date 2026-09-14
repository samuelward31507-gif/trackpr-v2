import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AIAgentsClient from "./ai-agents-client";

export default async function AIAgentsPage() {
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
      "AI agents membership load error:",
      membershipError
    );
  }

  if (!membership?.organization_id) {
    redirect("/dashboard");
  }

  const { data: agents, error } = await supabase
    .from("ai_agents")
    .select("*")
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("AI agents load error:", error);
  }

  return (
    <AIAgentsClient
      organizationId={membership.organization_id}
      initialAgents={(agents ?? []) as any}
    />
  );
}