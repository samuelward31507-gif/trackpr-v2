import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY!;
const N8N_SECRET =
  process.env.N8N_TRACKPR_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    // --------------------------------------------------
    // VERIFY N8N REQUEST
    // --------------------------------------------------

    const authorization =
      request.headers.get("authorization");

    if (
      !N8N_SECRET ||
      authorization !== `Bearer ${N8N_SECRET}`
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    // --------------------------------------------------
    // READ REQUEST BODY
    // --------------------------------------------------

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
        {
          success: false,
          error: "lead_id is required.",
        },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          error: "Task title is required.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // VERIFY SUPABASE CONFIG
    // --------------------------------------------------

    if (
      !SUPABASE_URL ||
      !SERVICE_ROLE_KEY
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Supabase server configuration is missing.",
        },
        { status: 500 }
      );
    }

    const headers = {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    };

    // --------------------------------------------------
    // GET LEAD
    // --------------------------------------------------

    const leadUrl =
      `${SUPABASE_URL}/rest/v1/leads` +
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

    const leadText =
      await leadResponse.text();

    if (!leadResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to retrieve lead.",
          details: leadText,
        },
        { status: 502 }
      );
    }

    const leads =
      leadText
        ? JSON.parse(leadText)
        : [];

    if (
      !Array.isArray(leads) ||
      leads.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Lead not found.",
        },
        { status: 404 }
      );
    }

    const lead = leads[0];

    // --------------------------------------------------
    // GET ORGANIZATION MEMBER
    // --------------------------------------------------

    const memberUrl =
      `${SUPABASE_URL}/rest/v1/organization_members` +
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

    const memberText =
      await memberResponse.text();

    if (!memberResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to retrieve organization member.",
          details: memberText,
        },
        { status: 502 }
      );
    }

    const members =
      memberText
        ? JSON.parse(memberText)
        : [];

    const userId =
      Array.isArray(members) &&
      members.length > 0
        ? members[0].user_id
        : null;

    // --------------------------------------------------
    // CREATE TASK
    // --------------------------------------------------

    const taskResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/tasks`,
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
      console.error(
        "TASK CREATE ERROR:",
        taskText
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to create task.",
          details: taskText,
        },
        { status: 500 }
      );
    }

    const tasks =
      taskText
        ? JSON.parse(taskText)
        : [];

    const task =
      Array.isArray(tasks)
        ? tasks[0] || null
        : tasks;

    // --------------------------------------------------
    // SUCCESS
    // --------------------------------------------------

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
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to create task.",
      },
      { status: 500 }
    );
  }
}