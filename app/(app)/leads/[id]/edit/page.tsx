import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditLeadForm from "./edit-lead-form";

type EditLeadPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditLeadPage({
  params,
}: EditLeadPageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  // Load the lead.
  // RLS ensures the signed-in user can only access
  // leads belonging to their organization.
  const { data: lead, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !lead) {
    notFound();
  }

  return <EditLeadForm lead={lead} />;
}