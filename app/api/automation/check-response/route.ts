import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    console.log("=== TRACKPR CHECK RESPONSE START ===");

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

    const leadId = searchParams.get("lead_id");
    const organizationId = searchParams.get("organization_id");

    if (!leadId || !organizationId) {
      return NextResponse.json(
        {
          error: "lead_id and organization_id are required.",
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

    // Check whether the customer has replied.
    const messagesUrl = new URL(`${supabaseUrl}/rest/v1/messages`);

    messagesUrl.searchParams.set(
      "organization_id",
      `eq.${organizationId}`
    );

    messagesUrl.searchParams.set(
      "lead_id",
      `eq.${leadId}`
    );

    messagesUrl.searchParams.set(
      "direction",
      "eq.inbound"
    );

    messagesUrl.searchParams.set(
      "select",
      "id,direction,body,created_at"
    );

    messagesUrl.searchParams.set("order", "created_at.desc");
    messagesUrl.searchParams.set("limit", "1");

    const messagesResponse = await fetch(messagesUrl.toString(), {
      method: "GET",
      headers,
      cache: "no-store",
    });

    const messagesText = await messagesResponse.text();

    if (!messagesResponse.ok) {
      console.error("Message lookup failed:", messagesText);

      return NextResponse.json(
        {
          error: "Unable to check customer response.",
          details: messagesText,
        },
        { status: 500 }
      );
    }

    const messages = JSON.parse(messagesText);
    const replied = Array.isArray(messages) && messages.length > 0;

    // Get the lead information so n8n can continue without
    // needing to reference an earlier workflow node.
    const leadUrl = new URL(`${supabaseUrl}/rest/v1/leads`);

    leadUrl.searchParams.set("id", `eq.${leadId}`);
    leadUrl.searchParams.set(
      "organization_id",
      `eq.${organizationId}`
    );
    leadUrl.searchParams.set(
      "select",
      "id,first_name,last_name,phone,service_interest"
    );
    leadUrl.searchParams.set("limit", "1");

    const leadResponse = await fetch(leadUrl.toString(), {
      method: "GET",
      headers,
      cache: "no-store",
    });

    const leadText = await leadResponse.text();

    if (!leadResponse.ok) {
      console.error("Lead lookup failed:", leadText);

      return NextResponse.json(
        {
          error: "Unable to load lead information.",
          details: leadText,
        },
        { status: 500 }
      );
    }

    const leads = JSON.parse(leadText);
    const lead = Array.isArray(leads) ? leads[0] : null;

    if (!lead) {
      return NextResponse.json(
        {
          error: "Lead not found.",
        },
        { status: 404 }
      );
    }

    console.log("Customer replied:", replied);
    console.log("Lead loaded:", lead.id);

    return NextResponse.json({
      success: true,
      replied,
      message: replied ? messages[0] : null,

      lead_id: lead.id,
      customer_first_name: lead.first_name || "there",
      customer_last_name: lead.last_name || "",
      customer_phone: lead.phone,
      service: lead.service_interest || "your project",
    });
  } catch (error) {
    console.error("CHECK RESPONSE ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to check customer response.",
      },
      { status: 500 }
    );
  }
}