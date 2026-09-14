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

    const appointmentId = searchParams.get("appointment_id");
    const organizationId = searchParams.get("organization_id");

    if (!appointmentId || !organizationId) {
      return NextResponse.json(
        {
          success: false,
          error: "appointment_id and organization_id are required",
          appointment_id: appointmentId,
          organization_id: organizationId,
        },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing Supabase environment variables.");

      return NextResponse.json(
        {
          success: false,
          error: "Supabase service configuration is missing",
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

    const { data: appointment, error } = await supabase
      .from("appointments")
      .select(
        `
          id,
          organization_id,
          lead_id,
          title,
          status,
          start_at,
          end_at,
          notes,
          created_at,
          updated_at
        `
      )
      .eq("id", appointmentId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (error) {
      console.error("Check appointment status query failed:", error);

      return NextResponse.json(
        {
          success: false,
          found: false,
          error: error.message,
          appointment_id: appointmentId,
          organization_id: organizationId,
        },
        { status: 500 }
      );
    }

    if (!appointment) {
      return NextResponse.json({
        success: true,
        found: false,
        appointment_id: appointmentId,
        organization_id: organizationId,
      });
    }

    return NextResponse.json({
      success: true,
      found: true,
      appointment_id: appointment.id,
      organization_id: appointment.organization_id,
      lead_id: appointment.lead_id,
      title: appointment.title,
      status: appointment.status,
      start_at: appointment.start_at,
      end_at: appointment.end_at,
      notes: appointment.notes,
      created_at: appointment.created_at,
      updated_at: appointment.updated_at,
    });
  } catch (error) {
    console.error("Check appointment status failed:", error);

    return NextResponse.json(
      {
        success: false,
        found: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown server error",
      },
      { status: 500 }
    );
  }
}