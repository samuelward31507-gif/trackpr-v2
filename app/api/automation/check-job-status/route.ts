import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    console.log("=== TRACKPR CHECK JOB STATUS START ===");

    const authHeader = request.headers.get("authorization");
    const expectedSecret = process.env.N8N_TRACKPR_WEBHOOK_SECRET;

    if (!expectedSecret) {
      return NextResponse.json(
        { error: "Automation secret is not configured." },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    const jobId = searchParams.get("job_id");
    const organizationId = searchParams.get("organization_id");

    if (!jobId || !organizationId) {
      return NextResponse.json(
        {
          error: "job_id and organization_id are required.",
        },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          error: "Supabase server configuration is missing.",
        },
        { status: 500 }
      );
    }

    const headers = {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    };

    // --------------------------------------------------
    // Load Job
    // --------------------------------------------------

    const jobUrl = new URL(
      `${supabaseUrl}/rest/v1/jobs`
    );

    jobUrl.searchParams.set(
      "id",
      `eq.${jobId}`
    );

    jobUrl.searchParams.set(
      "organization_id",
      `eq.${organizationId}`
    );

    jobUrl.searchParams.set(
      "select",
      "id,organization_id,lead_id,estimate_id,title,amount,status,payment_status,start_date,due_date,completed_date,notes"
    );

    jobUrl.searchParams.set("limit", "1");

    const jobResponse = await fetch(
      jobUrl.toString(),
      {
        method: "GET",
        headers,
        cache: "no-store",
      }
    );

    const jobText = await jobResponse.text();

    if (!jobResponse.ok) {
      console.error(
        "Job lookup failed:",
        jobText
      );

      return NextResponse.json(
        {
          error: "Unable to load job.",
          details: jobText,
        },
        { status: 500 }
      );
    }

    const jobs = JSON.parse(jobText);

    const job = Array.isArray(jobs)
      ? jobs[0]
      : null;

    if (!job) {
      return NextResponse.json(
        {
          error: "Job not found.",
        },
        { status: 404 }
      );
    }

    // --------------------------------------------------
    // Load Customer
    // --------------------------------------------------

    let customer = null;

    if (job.lead_id) {
      const leadUrl = new URL(
        `${supabaseUrl}/rest/v1/leads`
      );

      leadUrl.searchParams.set(
        "id",
        `eq.${job.lead_id}`
      );

      leadUrl.searchParams.set(
        "organization_id",
        `eq.${organizationId}`
      );

      leadUrl.searchParams.set(
        "select",
        "id,first_name,last_name,phone,email"
      );

      leadUrl.searchParams.set("limit", "1");

      const leadResponse = await fetch(
        leadUrl.toString(),
        {
          method: "GET",
          headers,
          cache: "no-store",
        }
      );

      const leadText = await leadResponse.text();

      if (!leadResponse.ok) {
        console.error(
          "Lead lookup failed:",
          leadText
        );

        return NextResponse.json(
          {
            error:
              "Unable to load customer information.",
            details: leadText,
          },
          { status: 500 }
        );
      }

      const leads = JSON.parse(leadText);

      customer = Array.isArray(leads)
        ? leads[0] || null
        : null;
    }

    // --------------------------------------------------
    // Determine whether review request should send
    // --------------------------------------------------

    const shouldSendReview =
      job.status === "completed";

    console.log(
      "Job loaded:",
      job.id
    );

    console.log(
      "Job status:",
      job.status
    );

    console.log(
      "Customer loaded:",
      customer?.id || null
    );

    console.log(
      "Should send review:",
      shouldSendReview
    );

    return NextResponse.json({
      success: true,

      job_id: job.id,

      organization_id:
        job.organization_id,

      lead_id:
        job.lead_id,

      estimate_id:
        job.estimate_id,

      title:
        job.title,

      amount:
        job.amount,

      status:
        job.status,

      payment_status:
        job.payment_status,

      start_date:
        job.start_date,

      due_date:
        job.due_date,

      completed_date:
        job.completed_date,

      notes:
        job.notes,

      should_send_review:
        shouldSendReview,

      customer_first_name:
        customer?.first_name || "there",

      customer_last_name:
        customer?.last_name || "",

      customer_phone:
        customer?.phone || null,

      customer_email:
        customer?.email || null,
    });
  } catch (error) {
    console.error(
      "CHECK JOB STATUS ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to check job status.",
      },
      { status: 500 }
    );
  }
}