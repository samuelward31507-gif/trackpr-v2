import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const N8N_SECRET = process.env.N8N_TRACKPR_WEBHOOK_SECRET!;

export async function GET(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url);

    const paymentId = searchParams.get("payment_id");
    const organizationId = searchParams.get("organization_id");

    if (!paymentId || !organizationId) {
      return NextResponse.json(
        {
          success: false,
          error: "payment_id and organization_id are required",
        },
        { status: 400 }
      );
    }

    const headers = {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    };

    // --------------------------------------------------
    // GET PAYMENT
    // --------------------------------------------------

    const paymentUrl =
      `${SUPABASE_URL}/rest/v1/payments` +
      `?id=eq.${encodeURIComponent(paymentId)}` +
      `&organization_id=eq.${encodeURIComponent(organizationId)}` +
      `&select=id,organization_id,job_id,lead_id,amount,payment_date,payment_method,status` +
      `&limit=1`;

    const paymentResponse = await fetch(paymentUrl, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();

      return NextResponse.json(
        {
          success: false,
          error: "Failed to retrieve payment",
          details: errorText,
        },
        { status: 502 }
      );
    }

    const payments = await paymentResponse.json();

    if (!payments || payments.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment not found",
        },
        { status: 404 }
      );
    }

    const payment = payments[0];

    // --------------------------------------------------
    // GET JOB
    // --------------------------------------------------

    let job = null;

    if (payment.job_id) {
      const jobUrl =
        `${SUPABASE_URL}/rest/v1/jobs` +
        `?id=eq.${encodeURIComponent(payment.job_id)}` +
        `&organization_id=eq.${encodeURIComponent(organizationId)}` +
        `&select=id,title,amount,status,payment_status,lead_id` +
        `&limit=1`;

      const jobResponse = await fetch(jobUrl, {
        method: "GET",
        headers,
        cache: "no-store",
      });

      if (!jobResponse.ok) {
        const errorText = await jobResponse.text();

        return NextResponse.json(
          {
            success: false,
            error: "Failed to retrieve job",
            details: errorText,
          },
          { status: 502 }
        );
      }

      const jobs = await jobResponse.json();

      job = Array.isArray(jobs) ? jobs[0] || null : null;
    }

    // --------------------------------------------------
    // GET CUSTOMER
    // --------------------------------------------------

    let customer = null;

    const leadId = payment.lead_id || job?.lead_id;

    if (leadId) {
      const leadUrl =
        `${SUPABASE_URL}/rest/v1/leads` +
        `?id=eq.${encodeURIComponent(leadId)}` +
        `&organization_id=eq.${encodeURIComponent(organizationId)}` +
        `&select=id,first_name,last_name,phone,email` +
        `&limit=1`;

      const leadResponse = await fetch(leadUrl, {
        method: "GET",
        headers,
        cache: "no-store",
      });

      if (!leadResponse.ok) {
        const errorText = await leadResponse.text();

        return NextResponse.json(
          {
            success: false,
            error: "Failed to retrieve customer",
            details: errorText,
          },
          { status: 502 }
        );
      }

      const leads = await leadResponse.json();

      customer = Array.isArray(leads)
        ? leads[0] || null
        : null;
    }

    // --------------------------------------------------
    // GET BUSINESS
    // --------------------------------------------------

    const organizationUrl =
      `${SUPABASE_URL}/rest/v1/organizations` +
      `?id=eq.${encodeURIComponent(organizationId)}` +
      `&select=id,name` +
      `&limit=1`;

    const organizationResponse = await fetch(
      organizationUrl,
      {
        method: "GET",
        headers,
        cache: "no-store",
      }
    );

    if (!organizationResponse.ok) {
      const errorText = await organizationResponse.text();

      return NextResponse.json(
        {
          success: false,
          error: "Failed to retrieve business",
          details: errorText,
        },
        { status: 502 }
      );
    }

    const organizations =
      await organizationResponse.json();

    const organization = Array.isArray(organizations)
      ? organizations[0] || null
      : null;

    const businessName =
      organization?.name || "our company";

    // --------------------------------------------------
    // DETERMINE WHETHER FOLLOW-UP IS NEEDED
    // --------------------------------------------------

    const paymentStatus =
      job?.payment_status || payment.status || null;

    const shouldFollowUp =
      paymentStatus === "unpaid" ||
      paymentStatus === "partial";

    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    return NextResponse.json({
      success: true,

      payment_id:
        payment.id,

      organization_id:
        payment.organization_id,

      job_id:
        payment.job_id || null,

      lead_id:
        leadId || null,

      business_name:
        businessName,

      customer_first_name:
        customer?.first_name || "there",

      customer_last_name:
        customer?.last_name || "",

      customer_phone:
        customer?.phone || null,

      customer_email:
        customer?.email || null,

      payment_amount:
        payment.amount || 0,

      payment_date:
        payment.payment_date || null,

      payment_method:
        payment.payment_method || null,

      payment_status:
        paymentStatus,

      job_title:
        job?.title || "your project",

      job_amount:
        job?.amount || 0,

      job_status:
        job?.status || null,

      should_follow_up:
        shouldFollowUp,
    });
  } catch (error) {
    console.error(
      "CHECK PAYMENT STATUS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to check payment status",
      },
      { status: 500 }
    );
  }
}