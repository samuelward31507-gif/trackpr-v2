import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");
    const n8nSecret = process.env.N8N_TRACKPR_WEBHOOK_SECRET;

    const isN8NRequest =
      n8nSecret &&
      authorization === `Bearer ${n8nSecret}`;

    let userId: string | null = null;

    // --------------------------------------------------
    // N8N SERVER-TO-SERVER REQUEST
    // --------------------------------------------------

    if (isN8NRequest) {
      const body = await request.json();

      const {
        lead_id,
        title,
        description,
        due_at,
        priority,
      } = body;

      if (!lead_id) {
        return NextResponse.json(
          { error: "lead_id is required." },
          { status: 400 }
        );
      }

      if (!title) {
        return NextResponse.json(
          { error: "Task title is required." },
          { status: 400 }
        );
      }

      // Get the lead and organization.
      const supabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL;

      const serviceRoleKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !serviceRoleKey) {
        return NextResponse.json(
          {
            error:
              "Supabase server configuration is missing.",
          },
          { status: 500 }
        );
      }

      const headers = {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      };

      const leadUrl =
        `${supabaseUrl}/rest/v1/leads` +
        `?id=eq.${encodeURIComponent(lead_id)}` +
        `&select=id,organization_id` +
        `&limit=1`;

      const leadResponse = await fetch(
        leadUrl,
        {
          method: "GET",
          headers,
          cache: "no-store",
        }
      );

      if (!leadResponse.ok) {
        const errorText =
          await leadResponse.text();

        return NextResponse.json(
          {
            error: "Unable to retrieve lead.",
            details: errorText,
          },
          { status: 502 }
        );
      }

      const leads =
        await leadResponse.json();

      if (!leads.length) {
        return NextResponse.json(
          { error: "Lead not found." },
          { status: 404 }
        );
      }

      const lead = leads[0];

      // Find an organization member to assign
      // the task to. Prefer the first member.
      const memberUrl =
        `${supabaseUrl}/rest/v1/organization_members` +
        `?organization_id=eq.${encodeURIComponent(
          lead.organization_id
        )}` +
        `&select=user_id` +
        `&limit=1`;

      const memberResponse = await fetch(
        memberUrl,
        {
          method: "GET",
          headers,
          cache: "no-store",
        }
      );

      if (!memberResponse.ok) {
        const errorText =
          await memberResponse.text();

        return NextResponse.json(
          {
            error:
              "Unable to retrieve organization member.",
            details: errorText,
          },
          { status: 502 }
        );
      }

      const members =
        await memberResponse.json();

      userId =
        members.length > 0
          ? members[0].user_id
          : null;

      // Create task using Supabase REST.
      const taskResponse = await fetch(
        `${supabaseUrl}/rest/v1/tasks`,
        {
          method: "POST",
          headers: {
            ...headers,
            Prefer: "return=representation",
          },
          body: JSON.stringify({
            user_id: userId,
            lead_id,
            title,
            description:
              description || null,
            due_at:
              due_at || null,
            status: "pending",
            priority:
              priority || "high",
          }),
        }
      );

      const taskText =
        await taskResponse.text();

      if (!taskResponse.ok) {
        return NextResponse.json(
          {
            error: "Unable to create task.",
            details: taskText,
          },
          { status: 500 }
        );
      }

      const tasks =
        taskText
          ? JSON.parse(taskText)
          : [];

      return NextResponse.json(
        {
          success: true,
          source: "n8n",
          task:
            Array.isArray(tasks)
              ? tasks[0] || null
              : tasks,
        },
        { status: 201 }
      );
    }

    // --------------------------------------------------
    // NORMAL AUTHENTICATED TRACKPR REQUEST
    // --------------------------------------------------

    const supabase =
      await createClient();

    const {
      data: {
        user,
      },
      error: userError,
    } = await supabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    userId = user.id;

    const body =
      await request.json();

    const {
      lead_id,
      title,
      description,
      due_at,
      priority,
    } = body;

    if (!title) {
      return NextResponse.json(
        {
          error:
            "Task title is required.",
        },
        { status: 400 }
      );
    }

    if (!lead_id) {
      return NextResponse.json(
        {
          error:
            "lead_id is required.",
        },
        { status: 400 }
      );
    }

    const {
      data: lead,
      error: leadError,
    } =
      await supabase
        .from("leads")
        .select(
          "id, organization_id"
        )
        .eq("id", lead_id)
        .single();

    if (
      leadError ||
      !lead
    ) {
      return NextResponse.json(
        {
          error:
            "Lead not found.",
        },
        { status: 404 }
      );
    }

    const {
      data: membership,
      error:
        membershipError,
    } =
      await supabase
        .from(
          "organization_members"
        )
        .select(
          "organization_id"
        )
        .eq(
          "organization_id",
          lead.organization_id
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();

    if (
      membershipError ||
      !membership
    ) {
      return NextResponse.json(
        {
          error:
            "You do not have access to this lead.",
        },
        { status: 403 }
      );
    }

    const {
      data: task,
      error: taskError,
    } =
      await supabase
        .from("tasks")
        .insert({
          user_id:
            user.id,
          lead_id,
          title,
          description:
            description ||
            null,
          due_at:
            due_at || null,
          status:
            "pending",
          priority:
            priority ||
            "high",
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
          error:
            "Unable to create task.",
          details:
            taskError.message,
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