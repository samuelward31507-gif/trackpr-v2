import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const {
      lead_id,
      title,
      description,
      due_at,
      priority,
    } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Task title is required." },
        { status: 400 }
      );
    }

    if (!lead_id) {
      return NextResponse.json(
        { error: "lead_id is required." },
        { status: 400 }
      );
    }

    // Verify the lead belongs to this user/organization.
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, organization_id")
      .eq("id", lead_id)
      .single();

    if (leadError || !lead) {
      return NextResponse.json(
        { error: "Lead not found." },
        { status: 404 }
      );
    }

    const { data: membership, error: membershipError } =
      await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("organization_id", lead.organization_id)
        .eq("user_id", user.id)
        .maybeSingle();

    if (
      membershipError ||
      !membership
    ) {
      return NextResponse.json(
        { error: "You do not have access to this lead." },
        { status: 403 }
      );
    }

    const { data: task, error: taskError } =
      await supabase
        .from("tasks")
        .insert({
          user_id: user.id,
          lead_id,
          title,
          description:
            description || null,
          due_at:
            due_at || null,
          status: "pending",
          priority:
            priority || "high",
        })
        .select()
        .single();

    if (taskError) {
      console.error(
        "TASK CREATE ERROR:",
        taskError
      );

      return NextResponse.json(
        {
          error: "Unable to create task.",
          details: taskError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        task,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "POST /api/tasks ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create task.",
      },
      { status: 500 }
    );
  }
}