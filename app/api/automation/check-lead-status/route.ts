import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const N8N_SECRET = process.env.N8N_TRACKPR_WEBHOOK_SECRET!;

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");

    if (authorization !== `Bearer ${N8N_SECRET}`) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    const leadId = searchParams.get("lead_id");
    const organizationId = searchParams.get("organization_id");

    if (!leadId || !organizationId) {
      return NextResponse.json(
        {
          success: false,
          error: "lead_id and organization_id are required",
        },
        { status: 400 }
      );
    }

    const leadUrl =
      `${SUPABASE_URL}/rest/v1/leads` +
      `?id=eq.${encodeURIComponent(leadId)}` +
      `&organization_id=eq.${encodeURIComponent(organizationId)}` +
      `&select=id,organization_id,status,first_name,last_name,phone,email,service_interest,source,notes,created_at,updated_at`;

    const organizationUrl =
      `${SUPABASE_URL}/rest/v1/organizations` +
      `?id=eq.${encodeURIComponent(organizationId)}` +
      `&select=id,name`;

    const headers = {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    };

    const [leadResponse, organizationResponse] = await Promise.all([
      fetch(leadUrl, {
        method: "GET",
        headers,
        cache: "no-store",
      }),
      fetch(organizationUrl, {
        method: "GET",
        headers,
        cache: "no-store",
      }),
    ]);

    if (!leadResponse.ok) {
      const errorText = await leadResponse.text();

      return NextResponse.json(
        {
          success: false,
          error: "Failed to retrieve lead",
          details: errorText,
        },
        { status: 502 }
      );
    }

    if (!organizationResponse.ok) {
      const errorText = await organizationResponse.text();

      return NextResponse.json(
        {
          success: false,
          error: "Failed to retrieve organization",
          details: errorText,
        },
        { status: 502 }
      );
    }

    const leads = await leadResponse.json();
    const organizations = await organizationResponse.json();

    if (!leads || leads.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Lead not found",
        },
        { status: 404 }
      );
    }

    const lead = leads[0];
    const organization = organizations?.[0];

    return NextResponse.json({
      success: true,

      lead_id: lead.id,
      organization_id: lead.organization_id,

      business_name:
        organization?.name || "the company",

      status: lead.status,

      customer_first_name:
        lead.first_name || "there",

      customer_last_name:
        lead.last_name || "",

      customer_phone:
        lead.phone || null,

      customer_email:
        lead.email || null,

      service_interest:
        lead.service_interest || "your project",

      source:
        lead.source || null,

      notes:
        lead.notes || null,

      created_at:
        lead.created_at,

      updated_at:
        lead.updated_at,

      should_reactivate:
        lead.status === "lost",
    });
  } catch (error) {
    console.error("Check Lead Status error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}