import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getEnv(name: string) {
  return process.env[name]?.trim() || "";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const leadId = body.lead_id;
    const organizationId = body.organization_id;

    if (!leadId) {
      return NextResponse.json(
        { error: "lead_id is required" },
        { status: 400 }
      );
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: "organization_id is required" },
        { status: 400 }
      );
    }

    const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
    const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    const webhookUrl = getEnv(
      "N8N_TRACKPR_LOST_LEAD_REACTIVATION_WEBHOOK_URL"
    );

    if (!supabaseUrl) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_SUPABASE_URL is not configured." },
        { status: 500 }
      );
    }

    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: "SUPABASE_SERVICE_ROLE_KEY is not configured." },
        { status: 500 }
      );
    }

    if (!webhookUrl) {
      return NextResponse.json(
        {
          error:
            "N8N_TRACKPR_LOST_LEAD_REACTIVATION_WEBHOOK_URL is not configured.",
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

    // Load the lead.
    const { data: lead, error: leadError } =
      await supabase
        .from("leads")
        .select("*")
        .eq("id", leadId)
        .eq("organization_id", organizationId)
        .maybeSingle();

    if (leadError) {
      console.error(
        "Lost lead lookup error:",
        leadError
      );

      return NextResponse.json(
        {
          error: "Unable to load lead.",
          details: leadError.message,
        },
        { status: 500 }
      );
    }

    if (!lead) {
      return NextResponse.json(
        { error: "Lead not found." },
        { status: 404 }
      );
    }

    const customerName =
      lead.name ||
      lead.customer_name ||
      "there";

    const nameParts = String(customerName)
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    const firstName =
      nameParts[0] || "there";

    const lastName =
      nameParts.slice(1).join(" ") || "";

    const phone =
      lead.phone ||
      lead.customer_phone ||
      "";

    const email =
      lead.email ||
      lead.customer_email ||
      "";

    const serviceInterest =
      lead.service_interest ||
      "";

    const lostReason =
      lead.lost_reason ||
      null;

    /*
     * Trackpr sends the customer information inside
     * payload so the n8n workflow can consume it.
     */
    const eventPayload = {
      lead: {
        lead_id: lead.id,
        organization_id: lead.organization_id,
        customer_name: customerName,
        customer_phone: phone,
        customer_email: email,
        service_interest: serviceInterest,
        status: "lost",
        lost_reason: lostReason,
      },

      first_name: firstName,
      last_name: lastName,
      phone,
      email,
      business_name:
        body.business_name ||
        "the company",
      service_interest: serviceInterest,
      status: "lost",
      lost_reason: lostReason,
    };

    // Prevent duplicate reactivation events.
    const { data: existingEvent, error: existingError } =
      await supabase
        .from("automation_events")
        .select("id, status")
        .eq("organization_id", organizationId)
        .eq("lead_id", leadId)
        .eq(
          "event_type",
          "lost_lead_reactivation"
        )
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

    if (existingError) {
      console.error(
        "Lost lead duplicate check error:",
        existingError
      );

      return NextResponse.json(
        {
          error:
            "Unable to check for duplicate automation events.",
          details:
            existingError.message,
        },
        { status: 500 }
      );
    }

    if (existingEvent) {
      return NextResponse.json({
        success: true,
        duplicate: true,
        event_id: existingEvent.id,
        status: existingEvent.status,
        message:
          "Lost lead reactivation event already exists.",
      });
    }

    // Create automation event.
    const { data: automationEvent, error: eventError } =
      await supabase
        .from("automation_events")
        .insert({
          organization_id: organizationId,
          event_type:
            "lost_lead_reactivation",
          lead_id: leadId,
          status: "pending",
          payload: eventPayload,
        })
        .select()
        .single();

    if (eventError) {
      console.error(
        "Lost lead automation event error:",
        eventError
      );

      return NextResponse.json(
        {
          error:
            "Unable to create lost lead automation event.",
          details:
            eventError.message,
        },
        { status: 500 }
      );
    }

    const n8nPayload = {
      event_id:
        automationEvent.id,

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

    console.log(
      "LOST LEAD REACTIVATION → N8N",
      n8nPayload
    );

    const n8nResponse = await fetch(
      webhookUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          n8nPayload
        ),
      }
    );

    const n8nText =
      await n8nResponse.text();

    if (!n8nResponse.ok) {
      console.error(
        "Lost lead n8n error:",
        {
          status:
            n8nResponse.status,
          body: n8nText,
        }
      );

      await supabase
        .from("automation_events")
        .update({
          status: "failed",
        })
        .eq(
          "id",
          automationEvent.id
        );

      return NextResponse.json(
        {
          error:
            "Lost lead reactivation webhook failed.",
          n8n_status:
            n8nResponse.status,
          n8n_response:
            n8nText,
          event_id:
            automationEvent.id,
        },
        { status: 502 }
      );
    }

    // Mark event as sent.
    await supabase
      .from("automation_events")
      .update({
        status: "sent",
      })
      .eq(
        "id",
        automationEvent.id
      );

    return NextResponse.json({
      success: true,
      event_id:
        automationEvent.id,
      event_type:
        automationEvent.event_type,
      n8n_status:
        n8nResponse.status,
      n8n_response:
        n8nText,
    });
  } catch (error: any) {
    console.error(
      "Lost lead automation error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unexpected lost lead automation error.",
      },
      { status: 500 }
    );
  }
}