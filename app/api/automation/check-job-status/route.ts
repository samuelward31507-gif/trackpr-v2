import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const expectedSecret = process.env.N8N_AUTOMATION_SECRET;

    if (!expectedSecret) {
      console.error("N8N_AUTOMATION_SECRET is not configured.");
      return NextResponse.json(
        {
          success: false,
          error: "Automation secret is not configured.",
        },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const jobId = request.nextUrl.searchParams.get("job_id");
    const organizationId =
      request.nextUrl.searchParams.get("organization_id");

    if (!jobId) {
      return NextResponse.json(
        {
          success: false,
          error: "job_id is required.",
        },
        { status: 400 }
      );
    }

    if (!organizationId) {
      return NextResponse.json(
        {
          success: false,
          error: "organization_id is required.",
        },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Supabase server environment variables are missing.");

      return NextResponse.json(
        {
          success: false,
          error: "Supabase server configuration is missing.",
        },
        { status: 500 }
      );
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get the job.
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
        updated_at
      `)
      .eq("id", jobId)
      .limit(1)
      .maybeSingle();

    if (jobError) {
      console.error("Job lookup error:", jobError);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to look up job.",
          details: jobError.message,
        },
        { status: 500 }
      );
    }

    if (!job) {
      return NextResponse.json({
        success: true,
        found: false,
        job_id: jobId,
        organization_id: organizationId,
      });
    }

    // Make sure the job belongs to the organization
    // that requested the status check.
    if (job.organization_id !== organizationId) {
      return NextResponse.json(
        {
          success: false,
          error: "Job does not belong to this organization.",
        },
        { status: 403 }
      );
    }

    // Get the customer attached to the job's lead.
    let customer = null;

    if (job.lead_id) {
      const { data: lead, error: leadError } = await supabase
        .from("leads")
        .select(`
          id,
          first_name,
          last_name,
          phone,
          email
        `)
        .eq("id", job.lead_id)
        .eq("organization_id", organizationId)
        .limit(1)
        .maybeSingle();

      if (leadError) {
        console.error("Lead lookup error:", leadError);

        return NextResponse.json(
          {
            success: false,
            error: "Failed to look up customer.",
            details: leadError.message,
          },
          { status: 500 }
        );
      }

      if (lead) {
        customer = {
          id: lead.id,
          first_name: lead.first_name || "",
          last_name: lead.last_name || "",
          name:
            `${lead.first_name || ""} ${lead.last_name || ""}`.trim(),
          phone: lead.phone || "",
          email: lead.email || "",
        };
      }
    }

    return NextResponse.json({
      success: true,
      found: true,

      job_id: job.id,
      organization_id: job.organization_id,
      lead_id: job.lead_id,
      estimate_id: job.estimate_id,

      title: job.title,
      amount: job.amount,
      status: job.status,
      payment_status: job.payment_status,

      start_date: job.start_date,
      due_date: job.due_date,
      completed_date: job.completed_date,

      notes: job.notes,
      created_at: job.created_at,
      updated_at: job.updated_at,

      customer_name: customer?.name || "",
      customer_first_name: customer?.first_name || "",
      customer_last_name: customer?.last_name || "",
      customer_phone: customer?.phone || "",
      customer_email: customer?.email || "",
    });
  } catch (error) {
    console.error("Check job status unexpected error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unexpected server error.",
      },
      { status: 500 }
    );
  }
}