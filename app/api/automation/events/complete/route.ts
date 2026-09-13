import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type WebhookResult = {
  name: string;
  url: string;
  ok: boolean;
  status: number | null;
  body: string;
  error?: string;
};

export async function POST(request: Request) {
  try {
    console.log("=== TRACKPR AUTOMATION DELIVERY START ===");

    const supabase = await createClient();

    // Authenticate user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Automation delivery authentication failed:", userError);

      return NextResponse.json(
        {
          error: "Unauthorized",
          stage: "authentication",
        },
        { status: 401 }
      );
    }

    console.log("Authenticated user:", user.id);

    // Read request
    const body = await request.json();

    const { event_id, organization_id } = body;

    console.log("Automation delivery request:", {
      event_id,
      organization_id,
    });

    if (!event_id || !organization_id) {
      return NextResponse.json(
        {
          error: "event_id and organization_id are required.",
          stage: "request_validation",
        },
        { status: 400 }
      );
    }

    // Verify organization membership
    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("organization_id", organization_id)
      .eq("user_id", user.id)
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
          error: "You do not have access to this organization.",
          stage: "organization_membership",
        },
        { status: 403 }
      );
    }

    console.log("Organization membership verified.");

    // Load automation event
    const { data: event, error: eventError } = await supabase
      .from("automation_events")
      .select("*")
      .eq("id", event_id)
      .eq("organization_id", organization_id)
      .single();

    if (eventError) {
      console.error("Automation event lookup failed:", eventError);

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

    console.log("Automation event loaded:", event.id);
    console.log("Automation event type:", event.event_type);

    // Determine which n8n workflows should receive the event.
    const webhookTargets: Array<{
      name: string;
      url: string | undefined;
    }> = [];

    if (event.event_type === "lead_created") {
      webhookTargets.push({
        name: "Instant New Lead Response",
        url: process.env.N8N_TRACKPR_WEBHOOK_URL,
      });

      webhookTargets.push({
        name: "New Lead Follow-Up",
        url: process.env.N8N_TRACKPR_NEW_LEAD_FOLLOWUP_WEBHOOK_URL,
      });
    } else if (event.event_type === "missed_call") {
      webhookTargets.push({
        name: "Missed Call Response",
        url: process.env.N8N_TRACKPR_MISSED_CALL_WEBHOOK_URL,
      });
    } else {
      console.error(
        "No n8n workflow configured for event type:",
        event.event_type
      );

      return NextResponse.json(
        {
          error: `No n8n workflow configured for event type: ${event.event_type}`,
          stage: "webhook_routing",
        },
        { status: 400 }
      );
    }

    // Make sure every required webhook URL exists.
    const missingWebhook = webhookTargets.find((target) => !target.url);

    if (missingWebhook) {
      console.error(
        `Missing n8n webhook URL for ${missingWebhook.name}.`
      );

      return NextResponse.json(
        {
          error: `n8n webhook URL is not configured for ${missingWebhook.name}. Check .env.local and restart Next.js.`,
          stage: "environment",
        },
        { status: 500 }
      );
    }

    const eventPayload = {
      event_id: event.id,
      event_type: event.event_type,
      organization_id: event.organization_id,

      lead_id: event.lead_id,
      contact_id: event.contact_id,

      appointment_id: event.appointment_id,
      estimate_id: event.estimate_id,
      job_id: event.job_id,
      payment_id: event.payment_id,
      review_id: event.review_id,

      payload: event.payload,

      status: event.status,
      created_at: event.created_at,
    };

    console.log(
      "Sending event to workflows:",
      webhookTargets.map((target) => target.name)
    );

    // Send to every applicable n8n workflow.
    const results: WebhookResult[] = await Promise.all(
      webhookTargets.map(async (target) => {
        try {
          console.log(`Sending to ${target.name}:`, target.url);

          const response = await fetch(target.url!, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(eventPayload),
          });

          const responseText = await response.text();

          console.log(`${target.name} response:`, {
            status: response.status,
            ok: response.ok,
            body: responseText,
          });

          return {
            name: target.name,
            url: target.url!,
            ok: response.ok,
            status: response.status,
            body: responseText,
          };
        } catch (error) {
          console.error(`${target.name} FETCH FAILED:`, error);

          return {
            name: target.name,
            url: target.url!,
            ok: false,
            status: null,
            body: "",
            error:
              error instanceof Error
                ? error.message
                : "Unable to connect to n8n.",
          };
        }
      })
    );

    const failed = results.filter((result) => !result.ok);

    if (failed.length > 0) {
      console.error("One or more n8n deliveries failed:", failed);

      return NextResponse.json(
        {
          error: "One or more n8n webhook deliveries failed.",
          stage: "n8n_delivery",
          event_id: event.id,
          results,
        },
        { status: 502 }
      );
    }

    console.log("=== TRACKPR AUTOMATION DELIVERY SUCCESS ===");

    return NextResponse.json({
      success: true,
      event_id: event.id,
      event_type: event.event_type,
      workflows_triggered: results.map((result) => result.name),
      results,
    });
  } catch (error) {
    console.error("AUTOMATION EVENT DELIVERY ERROR:", error);

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