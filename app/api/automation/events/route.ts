import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type AutomationEvent = {
  id: string;
  organization_id: string;
  event_type: string;
  lead_id: string | null;
  contact_id: string | null;
  appointment_id: string | null;
  estimate_id: string | null;
  job_id: string | null;
  payment_id: string | null;
  review_id: string | null;
  payload: Record<string, unknown>;
  status: string;
  created_at: string;
};

/*
 * Map Trackpr event types to their n8n webhook environment variables.
 *
 * IMPORTANT:
 * We are intentionally keeping the webhook URLs in Vercel environment
 * variables instead of hard-coding them into the application.
 */
function getWebhookEnvironmentVariable(eventType: string) {
  const webhookMap: Record<string, string> = {
    lead_created: "N8N_TRACKPR_NEW_LEAD_WEBHOOK_URL",
    missed_call: "N8N_TRACKPR_MISSED_CALL_WEBHOOK_URL",
    appointment_booked:
      "N8N_TRACKPR_APPOINTMENT_BOOKED_WEBHOOK_URL",
    appointment_reminder:
      "N8N_TRACKPR_APPOINTMENT_REMINDER_WEBHOOK_URL",
    appointment_no_show:
      "N8N_TRACKPR_APPOINTMENT_NO_SHOW_WEBHOOK_URL",
    estimate_sent:
      "N8N_TRACKPR_ESTIMATE_SENT_WEBHOOK_URL",
    estimate_expired:
      "N8N_TRACKPR_ESTIMATE_EXPIRED_WEBHOOK_URL",
    job_completed:
      "N8N_TRACKPR_JOB_COMPLETED_WEBHOOK_URL",
    payment_received:
      "N8N_TRACKPR_PAYMENT_RECEIVED_WEBHOOK_URL",
    review_requested:
      "N8N_TRACKPR_REVIEW_REQUESTED_WEBHOOK_URL",
    lost_lead:
      "N8N_TRACKPR_LOST_LEAD_WEBHOOK_URL",
    high_priority_lead:
      "N8N_TRACKPR_HIGH_PRIORITY_LEAD_WEBHOOK_URL",
  };

  return webhookMap[eventType];
}

export async function POST(request: Request) {
  try {
    console.log("=== TRACKPR AUTOMATION DISPATCH START ===");

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
        "Automation dispatch authentication failed:",
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

    /*
     * Read request body
     */
    const body = await request.json();

    const {
      event_id,
      organization_id,
    } = body;

    console.log("Automation dispatch request:", {
      event_id,
      organization_id,
    });

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
      .eq("organization_id", organization_id)
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      console.error(
        "Organization membership lookup failed:",
        membershipError
      );

      return NextResponse.json(
        {
          error: membershipError.message,
          stage: "organization_membership",
        },
        { status: 500 }
      );
    }

    if (!membership) {
      return NextResponse.json(
        {
          error:
            "You do not have access to this organization.",
          stage: "organization_membership",
        },
        { status: 403 }
      );
    }

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
      .eq("organization_id", organization_id)
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
          error: "Automation event not found.",
          stage: "automation_event_lookup",
        },
        { status: 404 }
      );
    }

    const automationEvent = event as AutomationEvent;

    console.log("Automation event loaded:", {
      id: automationEvent.id,
      event_type: automationEvent.event_type,
    });

    /*
     * Determine which n8n workflow should receive this event.
     */
    const environmentVariable =
      getWebhookEnvironmentVariable(
        automationEvent.event_type
      );

    if (!environmentVariable) {
      console.warn(
        "No n8n webhook mapping exists for event type:",
        automationEvent.event_type
      );

      return NextResponse.json({
        success: false,
        delivered: false,
        event_id: automationEvent.id,
        event_type: automationEvent.event_type,
        error:
          "No n8n webhook mapping exists for this event type.",
        stage: "webhook_mapping",
      });
    }

    const n8nWebhookUrl =
      process.env[environmentVariable];

    if (!n8nWebhookUrl) {
      console.error(
        `Environment variable ${environmentVariable} is not configured.`
      );

      return NextResponse.json(
        {
          error:
            `n8n webhook is not configured for ${automationEvent.event_type}.`,
          stage: "environment",
          environment_variable:
            environmentVariable,
        },
        { status: 500 }
      );
    }

    console.log("Dispatching automation:", {
      event_type: automationEvent.event_type,
      environment_variable:
        environmentVariable,
    });

    /*
     * Build the standardized payload sent to n8n.
     */
    const n8nPayload = {
      event_id: automationEvent.id,

      event_type:
        automationEvent.event_type,

      organization_id:
        automationEvent.organization_id,

      lead_id:
        automationEvent.lead_id,

      contact_id:
        automationEvent.contact_id,

      appointment_id:
        automationEvent.appointment_id,

      estimate_id:
        automationEvent.estimate_id,

      job_id:
        automationEvent.job_id,

      payment_id:
        automationEvent.payment_id,

      review_id:
        automationEvent.review_id,

      payload:
        automationEvent.payload,

      status:
        automationEvent.status,

      created_at:
        automationEvent.created_at,
    };

    /*
     * Send event to the correct n8n workflow.
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
          body: JSON.stringify(
            n8nPayload
          ),
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
          event_type:
            automationEvent.event_type,
        },
        { status: 502 }
      );
    }

    /*
     * Read n8n response.
     */
    const n8nResponseText =
      await n8nResponse.text();

    console.log("n8n response:", {
      event_type:
        automationEvent.event_type,

      status:
        n8nResponse.status,

      ok:
        n8nResponse.ok,

      body:
        n8nResponseText,
    });

    if (!n8nResponse.ok) {
      return NextResponse.json(
        {
          error:
            "n8n webhook request failed.",

          stage:
            "n8n_response",

          event_type:
            automationEvent.event_type,

          n8n_status:
            n8nResponse.status,

          n8n_response:
            n8nResponseText,
        },
        { status: 502 }
      );
    }

    console.log(
      "=== TRACKPR AUTOMATION DISPATCH SUCCESS ==="
    );

    return NextResponse.json({
      success: true,

      delivered: true,

      event_id:
        automationEvent.id,

      event_type:
        automationEvent.event_type,

      webhook_environment_variable:
        environmentVariable,

      n8n_status:
        n8nResponse.status,

      n8n_response:
        n8nResponseText,
    });
  } catch (error) {
    console.error(
      "AUTOMATION DISPATCH ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to dispatch automation event.",
        stage: "unexpected_error",
      },
      { status: 500 }
    );
  }
}