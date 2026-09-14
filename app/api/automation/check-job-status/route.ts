import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const N8N_SECRET = "trackpr-n8n-secret-2026-change-this";

export async function GET(request: NextRequest) {
  try {
    // -----------------------------------------
    // AUTH
    // -----------------------------------------
    const authorization = request.headers.get("authorization");

    if (authorization !== `Bearer ${N8N_SECRET}`) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    // -----------------------------------------
    // QUERY PARAMETERS
    // -----------------------------------------
    const { searchParams } = new URL(request.url);

    const jobId = searchParams.get("job_id");
    const organizationId = searchParams.get("organization_id");

    if (!jobId || !organizationId) {
      return NextResponse.json(
        {
          success: false,
          error: "job_id and organization_id are required",
          job_id: jobId,
          organization_id: organizationId,
        },
        { status: 400 }
      );
    }

    // -----------------------------------------
    // SUPABASE SERVICE ROLE CLIENT
    // -----------------------------------------
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing Supabase service role configuration.");

      return NextResponse.json(
        {
          success: false,
          error: "Supabase service role configuration is missing",
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

    // -----------------------------------------
    // GET JOB BY ID
    // -----------------------------------------
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select(
        `
          id,
          organization_id,
          title,
          lead_id,
          estimate_id,
          amount,
          status,
          payment_status,
          start_date,
          due_date,
          completed_date,
          notes,
          created_at,
          updated_at
        `
      )
      .eq("id", jobId)
      .limit(1)
      .maybeSingle();

    // -----------------------------------------
    // DATABASE ERROR
    // -----------------------------------------
    if (jobError) {
      console.error("Error checking job status:", jobError);

      return NextResponse.json(
        {
          success: false,
          found: false,
          error: jobError.message,
          job_id: jobId,
          organization_id: organizationId,
        },
        { status: 500 }
      );
    }

    // -----------------------------------------
    // JOB NOT FOUND
    // -----------------------------------------
    if (!job) {
      return NextResponse.json(
        {
          success: true,
          found: false,
          job_id: jobId,
          organization_id: organizationId,
        },
        { status: 200 }
      );
    }

    // -----------------------------------------
    // ORGANIZATION SECURITY CHECK
    // -----------------------------------------
    if (job.organization_id !== organizationId) {
      console.error(
        "Job organization mismatch:",
        {
          job_id: jobId,
          requested_organization_id: organizationId,
          actual_organization_id: job.organization_id,
        }
      );

      return NextResponse.json(
        {
          success: false,
          found: false,
          error: "Job does not belong to the requested organization.",
          job_id: jobId,
          organization_id: organizationId,
        },
        { status: 403 }
      );
    }

    // -----------------------------------------
    // SUCCESS
    // -----------------------------------------
    return NextResponse.json({
      success: true,
      found: true,

      job_id: job.id,
      organization_id: job.organization_id,

      title: job.title,
      lead_id: job.lead_id,
      estimate_id: job.estimate_id,

      amount: job.amount,
      status: job.status,
      payment_status: job.payment_status,

      start_date: job.start_date,
      due_date: job.due_date,
      completed_date: job.completed_date,

      notes: job.notes,

      created_at: job.created_at,
      updated_at: job.updated_at,
    });
  } catch (error) {
    console.error("Unexpected check-job-status error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error",
      },
      { status: 500 }
    );
  }
}