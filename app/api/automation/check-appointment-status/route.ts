import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    console.log("=== TRACKPR CHECK APPOINTMENT STATUS START ===");

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

    const appointmentId = searchParams.get("appointment_id");
    const organizationId = searchParams.get("organization_id");

    if (!appointmentId || !organizationId) {
      return NextResponse.json(
        {
          error:
            "appointment_id and organization_id are required.",
        },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

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
    // Load appointment
    // --------------------------------------------------

    const appointmentUrl = new URL(
      `${supabaseUrl}/rest/v1/appointments`
    );

    appointmentUrl.searchParams.set(
      "id",
      `eq.${appointmentId}`
    );

    appointmentUrl.searchParams.set(
      "organization_id",
      `eq.${organizationId}`
    );

    appointmentUrl.searchParams.set(
      "select",
      "id,organization_id,lead_id,title,appointment_type,status,start_at,end_at,notes"
    );

    appointmentUrl.searchParams.set("limit", "1");

    const appointmentResponse = await fetch(
      appointmentUrl.toString(),
      {
        method: "GET",
        headers,
        cache: "no-store",
      }
    );

    const appointmentText =
      await appointmentResponse.text();

    if (!appointmentResponse.ok) {
      console.error(
        "Appointment lookup failed:",
        appointmentText
      );

      return NextResponse.json(
        {
          error: "Unable to load appointment.",
          details: appointmentText,
        },
        { status: 500 }
      );
    }

    const appointments = JSON.parse(appointmentText);

    const appointment = Array.isArray(appointments)
      ? appointments[0]
      : null;

    if (!appointment) {
      return NextResponse.json(
        {
          error: "Appointment not found.",
        },
        { status: 404 }
      );
    }

    // --------------------------------------------------
    // Load customer
    // --------------------------------------------------

    let customer = null;

    if (appointment.lead_id) {
      const leadUrl = new URL(
        `${supabaseUrl}/rest/v1/leads`
      );

      leadUrl.searchParams.set(
        "id",
        `eq.${appointment.lead_id}`
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
    // Determine whether reminder should be sent
    // --------------------------------------------------

    const shouldRemind =
      appointment.status === "scheduled";

    console.log(
      "Appointment loaded:",
      appointment.id
    );

    console.log(
      "Appointment status:",
      appointment.status
    );

    console.log(
      "Customer loaded:",
      customer?.id || null
    );

    console.log(
      "Should remind:",
      shouldRemind
    );

    return NextResponse.json({
      success: true,

      appointment_id: appointment.id,
      organization_id:
        appointment.organization_id,

      lead_id: appointment.lead_id,

      title: appointment.title,
      appointment_type:
        appointment.appointment_type,

      status: appointment.status,

      start_at: appointment.start_at,
      end_at: appointment.end_at,

      notes: appointment.notes,

      should_remind: shouldRemind,

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
      "CHECK APPOINTMENT STATUS ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to check appointment status.",
      },
      { status: 500 }
    );
  }
}