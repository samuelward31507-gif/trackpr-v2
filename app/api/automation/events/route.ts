import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    console.log("=== TRACKPR AUTOMATION DELIVERY START ===");

    const supabase = await createClient();

    /*
     * Authenticate user
     */
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(
        "Automation delivery authentication failed:",
        userError
      );

      return NextResponse.json(
        {
          error: "Unauthorized",
          stage: "authentication",
        },
        { status: 401 }
      );
    }

    console.log(
      "Authenticated user:",
      user.id
    );

    /*
     * Read request body
     */
    const body = await request.json();

    const {
      event_id,
      organization_id,
    } = body;

    console.log(
      "Automation delivery request:",
      {
        event_id,
        organization_id,
      }
    );

    if (!event_id || !organization_id) {
      return NextResponse.json(
        {
          error:
            "event_id and organization_id are required.",
          stage: "request_validation",
        },
        { status: 400 }
      );
    }

    /*
     * Verify organization membership
     */
    const {
      data: membership,
      error: membershipError,
    } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq(
        "organization_id",
        organization_id
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError) {
      console.error(
        "Organization membership lookup failed:",
        membershipError
      );

      return NextResponse.json(
        {
          error:
            membershipError.message,
          stage: "organization_membership",
        },
        { status: 500 }
      );
    }

    if (!membership) {
      console.error(
        "User does not belong to organization."
      );

      return NextResponse.json(
        {
          error:
            "You do not have access to this organization.",
          stage: "organization_membership",
        },
        { status: 403 }
      );
    }

    console.log(
      "Organization membership verified."
    );

    /*
     * Load automation event
     */
    const {
      data: event,
      error: eventError,
    } = await supabase
      .from("automation_events")
      .select("*")
      .eq("id", event_id)
      .eq(
        "organization_id",
        organization_id
      )
      .single();

    if (eventError) {
      console.error(
        "Automation event lookup failed:",
        eventError
      );

      return NextResponse.json(
        {
          error: eventError.message,
          stage: "automation_event_lookup",
        },
        { status: 500 }
      );
    }

    if (!event) {
      return NextResponse.json(
        {
          error:
            "Automation event not found.",
          stage: "automation_event_lookup",
        },
        { status: 404 }
      );
    }

    console.log(
      "Automation event loaded:",
      event.id
    );

    /*
     * Get private n8n webhook URL
     */
    const n8nWebhookUrl =
      process.env.N8N_TRACKPR_WEBHOOK_URL;

    if (!n8nWebhookUrl) {
      console.error(
        "N8N_TRACKPR_WEBHOOK_URL is not configured."
      );

      return NextResponse.json(
        {
          error:
            "n8n webhook URL is not configured. Restart the Next.js development server after changing .env.local.",
          stage: "environment",
        },
        { status: 500 }
      );
    }

    console.log(
      "n8n webhook URL is configured."
    );

    /*
     * Send event to n8n
     */
    let n8nResponse: Response;

    try {
      n8nResponse = await fetch(
        n8nWebhookUrl,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            event_id: event.id,
            event_type:
              event.event_type,
            organization_id:
              event.organization_id,

            lead_id:
              event.lead_id,
            contact_id:
              event.contact_id,

            appointment_id:
              event.appointment_id,
            estimate_id:
              event.estimate_id,
            job_id:
              event.job_id,
            payment_id:
              event.payment_id,
            review_id:
              event.review_id,

            payload:
              event.payload,

            status:
              event.status,

            created_at:
              event.created_at,
          }),
        }
      );
    } catch (fetchError) {
      console.error(
        "FETCH TO N8N FAILED:",
        fetchError
      );

      return NextResponse.json(
        {
          error:
            fetchError instanceof Error
              ? fetchError.message
              : "Unable to connect to n8n.",
          stage: "n8n_fetch",
        },
        { status: 502 }
      );
    }

    /*
     * Read n8n response
     */
    const n8nResponseText =
      await n8nResponse.text();

    console.log(
      "n8n response:",
      {
        status:
          n8nResponse.status,
        ok:
          n8nResponse.ok,
        body:
          n8nResponseText,
      }
    );

    if (!n8nResponse.ok) {
      return NextResponse.json(
        {
          error:
            "n8n webhook request failed.",
          stage: "n8n_response",
          n8n_status:
            n8nResponse.status,
          n8n_response:
            n8nResponseText,
        },
        { status: 502 }
      );
    }

    console.log(
      "=== TRACKPR AUTOMATION DELIVERY SUCCESS ==="
    );

    return NextResponse.json({
      success: true,
      event_id: event.id,
      n8n_status:
        n8nResponse.status,
      n8n_response:
        n8nResponseText,
    });
  } catch (error) {
    console.error(
      "AUTOMATION EVENT DELIVERY ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to deliver automation event.",
        stage: "unexpected_error",
      },
      { status: 500 }
    );
  }
}