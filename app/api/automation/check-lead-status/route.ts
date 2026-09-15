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

    const leadId = request.nextUrl.searchParams.get("lead_id");
    const organizationId =
      request.nextUrl.searchParams.get("organization_id");

    if (!leadId) {
      return NextResponse.json(
        {
          success: false,
          error: "lead_id is required.",
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
      console.error(
        "Supabase server environment variables are missing."
      );

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

    // Get the lead.
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select(`
        id,
        organization_id,
        first_name,
        last_name,
        email,
        phone,
        status,
        source,
        service_interest,
        lost_reason,
        next_follow_up_at,
        created_at,
        updated_at
      `)
      .eq("id", leadId)
      .limit(1)
      .maybeSingle();

    if (leadError) {
      console.error("Lead lookup error:", leadError);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to look up lead.",
          details: leadError.message,
        },
        { status: 500 }
      );
    }

    if (!lead) {
      return NextResponse.json({
        success: true,
        found: false,
        lead_id: leadId,
        organization_id: organizationId,
      });
    }

    // Make sure the lead belongs to the organization
    // that requested the status check.
    if (lead.organization_id !== organizationId) {
      return NextResponse.json(
        {
          success: false,
          error: "Lead does not belong to this organization.",
        },
        { status: 403 }
      );
    }

    const customerName =
      `${lead.first_name || ""} ${lead.last_name || ""}`.trim();

    /*
     * The lead should only be reactivated if it is
     * still marked as lost when n8n checks it.
     */
    const shouldReactivate =
      lead.status === "lost";

    return NextResponse.json({
      success: true,
      found: true,

      lead_id: lead.id,
      organization_id: lead.organization_id,

      first_name: lead.first_name || "",
      last_name: lead.last_name || "",
      customer_name: customerName,

      customer_phone: lead.phone || "",
      customer_email: lead.email || "",

      status: lead.status,
      source: lead.source || "",
      service_interest: lead.service_interest || "",
      lost_reason: lead.lost_reason || null,

      next_follow_up_at:
        lead.next_follow_up_at || null,

      created_at: lead.created_at,
      updated_at: lead.updated_at,

      should_reactivate: shouldReactivate,
    });
  } catch (error) {
    console.error(
      "Check lead status unexpected error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Unexpected server error.",
      },
      { status: 500 }
    );
  }
}