import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const N8N_SECRET = "trackpr-n8n-secret-2026-change-this";

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

    const estimateId = searchParams.get("estimate_id");
    const organizationId = searchParams.get("organization_id");

    if (!estimateId) {
      return NextResponse.json(
        {
          success: false,
          error: "estimate_id is required",
        },
        { status: 400 }
      );
    }

    if (!organizationId) {
      return NextResponse.json(
        {
          success: false,
          error: "organization_id is required",
        },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing Supabase service-role configuration.");

      return NextResponse.json(
        {
          success: false,
          error: "Server Supabase configuration is missing.",
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

    const { data: estimate, error } = await supabase
      .from("estimates")
      .select(
        `
          id,
          organization_id,
          lead_id,
          title,
          amount,
          status,
          created_at,
          updated_at
        `
      )
      .eq("id", estimateId)
      .eq("organization_id", organizationId)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Check estimate status error:", error);

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    if (!estimate) {
      return NextResponse.json(
        {
          success: false,
          found: false,
          error: "Estimate not found",
          estimate_id: estimateId,
          organization_id: organizationId,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      found: true,
      estimate_id: estimate.id,
      organization_id: estimate.organization_id,
      lead_id: estimate.lead_id,
      title: estimate.title,
      amount: estimate.amount,
      status: estimate.status,

      is_sent: estimate.status === "sent",

      is_draft: estimate.status === "draft",

      is_accepted:
        estimate.status === "accepted" ||
        estimate.status === "approved",

      is_declined:
        estimate.status === "declined" ||
        estimate.status === "rejected",

      created_at: estimate.created_at,
      updated_at: estimate.updated_at,
    });
  } catch (error) {
    console.error("Unexpected check estimate status error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}