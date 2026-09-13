import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    console.log("=== TRACKPR CHECK ESTIMATE STATUS START ===");

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

    const estimateId = searchParams.get("estimate_id");
    const organizationId = searchParams.get("organization_id");

    if (!estimateId || !organizationId) {
      return NextResponse.json(
        {
          error: "estimate_id and organization_id are required.",
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
    // LOAD ESTIMATE
    // --------------------------------------------------

    const estimateUrl = new URL(
      `${supabaseUrl}/rest/v1/estimates`
    );

    estimateUrl.searchParams.set("id", `eq.${estimateId}`);
    estimateUrl.searchParams.set(
      "organization_id",
      `eq.${organizationId}`
    );
    estimateUrl.searchParams.set(
      "select",
      "id,organization_id,lead_id,title,amount,status,notes"
    );
    estimateUrl.searchParams.set("limit", "1");

    const estimateResponse = await fetch(
      estimateUrl.toString(),
      {
        method: "GET",
        headers,
        cache: "no-store",
      }
    );

    const estimateText = await estimateResponse.text();

    if (!estimateResponse.ok) {
      console.error(
        "Estimate lookup failed:",
        estimateText
      );

      return NextResponse.json(
        {
          error: "Unable to load estimate.",
          details: estimateText,
        },
        { status: 500 }
      );
    }

    const estimates = JSON.parse(estimateText);

    const estimate = Array.isArray(estimates)
      ? estimates[0]
      : null;

    if (!estimate) {
      return NextResponse.json(
        {
          error: "Estimate not found.",
        },
        { status: 404 }
      );
    }

    // --------------------------------------------------
    // LOAD CUSTOMER / LEAD
    // --------------------------------------------------

    let customer = null;

    if (estimate.lead_id) {
      const leadUrl = new URL(
        `${supabaseUrl}/rest/v1/leads`
      );

      leadUrl.searchParams.set(
        "id",
        `eq.${estimate.lead_id}`
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
            error: "Unable to load customer information.",
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
    // LOAD ORGANIZATION / BUSINESS NAME
    // --------------------------------------------------

    const organizationUrl = new URL(
      `${supabaseUrl}/rest/v1/organizations`
    );

    organizationUrl.searchParams.set(
      "id",
      `eq.${organizationId}`
    );

    organizationUrl.searchParams.set(
      "select",
      "id,name"
    );

    organizationUrl.searchParams.set(
      "limit",
      "1"
    );

    const organizationResponse = await fetch(
      organizationUrl.toString(),
      {
        method: "GET",
        headers,
        cache: "no-store",
      }
    );

    const organizationText =
      await organizationResponse.text();

    if (!organizationResponse.ok) {
      console.error(
        "Organization lookup failed:",
        organizationText
      );

      return NextResponse.json(
        {
          error: "Unable to load business information.",
          details: organizationText,
        },
        { status: 500 }
      );
    }

    const organizations = JSON.parse(
      organizationText
    );

    const organization = Array.isArray(
      organizations
    )
      ? organizations[0] || null
      : null;

    const businessName =
      organization?.name || "the company";

    // --------------------------------------------------
    // FOLLOW-UP LOGIC
    // --------------------------------------------------

    const shouldFollowUp =
      estimate.status === "expired";

    console.log(
      "Estimate loaded:",
      estimate.id
    );

    console.log(
      "Estimate status:",
      estimate.status
    );

    console.log(
      "Customer loaded:",
      customer?.id || null
    );

    console.log(
      "Business name:",
      businessName
    );

    console.log(
      "Should follow up:",
      shouldFollowUp
    );

    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    return NextResponse.json({
      success: true,

      estimate_id:
        estimate.id,

      organization_id:
        estimate.organization_id,

      lead_id:
        estimate.lead_id,

      business_name:
        businessName,

      title:
        estimate.title,

      amount:
        estimate.amount,

      status:
        estimate.status,

      notes:
        estimate.notes,

      should_follow_up:
        shouldFollowUp,

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
      "CHECK ESTIMATE STATUS ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to check estimate status.",
      },
      { status: 500 }
    );
  }
}