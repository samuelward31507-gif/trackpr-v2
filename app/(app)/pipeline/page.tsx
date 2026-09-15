import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PipelineClient from "./pipeline-client";

export type PipelineLead = {
  id: string;
  organization_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  source: string | null;
  service_interest: string | null;
  next_follow_up_at: string | null;
  created_at: string;
};

export default async function PipelinePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data: leads, error } = await supabase
    .from("leads")
    .select(
      `
        id,
        organization_id,
        first_name,
        last_name,
        email,
        phone,
        status,
        source,
        service_interest,
        next_follow_up_at,
        created_at
      `
    )
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Error loading pipeline leads:",
      error
    );
  }

  return (
    <PipelineClient
      initialLeads={leads || []}
    />
  );
}