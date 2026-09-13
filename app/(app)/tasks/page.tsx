import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TasksClient from "./tasks-client";

export type Task = {
  id: string;
  lead_id: string | null;
  title: string;
  description: string | null;
  due_at: string | null;
  status: "pending" | "completed";
  priority: "low" | "medium" | "high";
  completed_at: string | null;
  created_at: string;
};

export type Lead = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

export default async function TasksPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
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
      "Error loading organization membership:",
      JSON.stringify(membershipError, null, 2)
    );
  }

  if (!membership) {
    notFound();
  }

  const { data: tasks, error: tasksError } =
    await supabase
      .from("tasks")
      .select(`
        id,
        lead_id,
        title,
        description,
        due_at,
        status,
        priority,
        completed_at,
        created_at
      `)
      .eq("user_id", user.id)
      .order("due_at", {
        ascending: true,
        nullsFirst: false,
      });

  if (tasksError) {
    console.error(
      "Error loading tasks:",
      JSON.stringify(tasksError, null, 2)
    );
  }

  const { data: leads, error: leadsError } =
    await supabase
      .from("leads")
      .select(`
        id,
        first_name,
        last_name
      `)
      .eq(
        "organization_id",
        membership.organization_id
      )
      .order("created_at", {
        ascending: false,
      });

  if (leadsError) {
    console.error(
      "Error loading leads:",
      JSON.stringify(leadsError, null, 2)
    );
  }

  return (
    <TasksClient
      initialTasks={tasks || []}
      leads={leads || []}
    />
  );
}