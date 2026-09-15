import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const body = await request.json();

    const appointmentId =
      body?.appointment_id;

    const organizationId =
      body?.organization_id;

    if (!appointmentId) {
      return NextResponse.json(
        {
          error:
            "appointment_id is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!organizationId) {
      return NextResponse.json(
        {
          error:
            "organization_id is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Verify the authenticated user belongs
     * to the organization being submitted.
     */
    const {
      data: membership,
      error: membershipError,
    } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      console.error(
        "No-show membership lookup failed:",
        membershipError
      );

      return NextResponse.json(
        {
          error:
            "Unable to verify organization membership.",
          details:
            membershipError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (!membership) {
      return NextResponse.json(
        {
          error:
            "You are not authorized for this organization.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * Load the appointment using the authenticated
     * Supabase client so normal RLS still protects
     * the appointment lookup.
     */
    const {
      data: appointment,
      error: appointmentError,
    } = await supabase
      .from("appointments")
      .select(
        `
          id,
          organization_id,
          lead_id,
          assigned_to,
          title,
          appointment_type,
          status,
          start_at,
          end_at,
          notes,
          created_at,
          updated_at
        `
      )
      .eq("id", appointmentId)
      .eq(
        "organization_id",
        organizationId
      )
      .single();

    if (appointmentError) {
      console.error(
        "No-show appointment lookup failed:",
        appointmentError
      );

      return NextResponse.json(
        {
          error:
            "Unable to load appointment.",
          details:
            appointmentError.message,
          code:
            appointmentError.code,
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Load the linked lead.
     */
    let lead: {
      id: string;
      first_name: string | null;
      last_name: string | null;
      phone: string | null;
      email: string | null;
      service_interest: string | null;
    } | null = null;

    if (appointment.lead_id) {
      const {
        data: leadData,
        error: leadError,
      } = await supabase
        .from("leads")
        .select(
          `
            id,
            first_name,
            last_name,
            phone,
            email,
            service_interest
          `
        )
        .eq(
          "id",
          appointment.lead_id
        )
        .eq(
          "organization_id",
          organizationId
        )
        .maybeSingle();

      if (leadError) {
        console.error(
          "No-show lead lookup failed:",
          leadError
        );
      }

      lead = leadData || null;
    }

    const customerName = [
      lead?.first_name,
      lead?.last_name,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    /*
     * Use the service-role client ONLY on the server
     * to create the automation event.
     *
     * This bypasses the browser RLS INSERT problem
     * while still requiring the authenticated user
     * to belong to the organization above.
     */
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      return NextResponse.json(
        {
          error:
            "NEXT_PUBLIC_SUPABASE_URL is missing.",
        },
        {
          status: 500,
        }
      );
    }

    if (!serviceRoleKey) {
      console.error(
        "SUPABASE_SERVICE_ROLE_KEY is missing."
      );

      return NextResponse.json(
        {
          error:
            "SUPABASE_SERVICE_ROLE_KEY is missing from the server environment.",
        },
        {
          status: 500,
        }
      );
    }

    const adminSupabase =
      createAdminClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

    const eventPayload = {
      appointment: {
        appointment_id:
          appointment.id,
        organization_id:
          appointment.organization_id,
        lead_id:
          appointment.lead_id,
        title:
          appointment.title,
        appointment_type:
          appointment.appointment_type,
        status: "no_show",
        start_at:
          appointment.start_at,
        end_at:
          appointment.end_at,
        notes:
          appointment.notes,
      },

      lead: {
        lead_id:
          lead?.id ||
          appointment.lead_id ||
          null,

        customer_name:
          customerName ||
          "there",

        customer_phone:
          lead?.phone || "",

        customer_email:
          lead?.email || "",

        service_interest:
          lead?.service_interest || "",
      },
    };

    /*
     * Prevent duplicate automation events if the user
     * clicks No Show again or retries the request.
     */
    const {
      data: existingEvent,
      error: existingEventError,
    } = await adminSupabase
      .from("automation_events")
      .select("id, status")
      .eq(
        "organization_id",
        organizationId
      )
      .eq(
        "event_type",
        "appointment_no_show"
      )
      .eq(
        "appointment_id",
        appointment.id
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (existingEventError) {
      console.error(
        "No-show duplicate check failed:",
        existingEventError
      );
    }

    let automationEvent =
      existingEvent;

    /*
     * Only create a new event if one doesn't
     * already exist.
     */
    if (!automationEvent) {
      const {
        data: createdEvent,
        error: eventError,
      } = await adminSupabase
        .from("automation_events")
        .insert({
          organization_id:
            organizationId,

          event_type:
            "appointment_no_show",

          lead_id:
            appointment.lead_id,

          contact_id: null,

          appointment_id:
            appointment.id,

          estimate_id: null,

          job_id: null,

          payment_id: null,

          review_id: null,

          payload:
            eventPayload,

          status: "pending",
        })
        .select("id, status")
        .single();

      if (eventError) {
        console.error(
          "No-show automation event insert failed:",
          eventError
        );

        return NextResponse.json(
          {
            error:
              "Failed to create automation event.",
            details:
              eventError.message,
            code:
              eventError.code,
            hint:
              eventError.hint,
          },
          {
            status: 500,
          }
        );
      }

      automationEvent =
        createdEvent;
    }

    if (!automationEvent?.id) {
      return NextResponse.json(
        {
          error:
            "Automation event was not created.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * Send the event directly to the No Show
     * n8n production webhook.
     */
    const webhookUrl =
      process.env
        .N8N_TRACKPR_APPOINTMENT_NO_SHOW_WEBHOOK_URL;

    if (!webhookUrl) {
      console.error(
        "N8N_TRACKPR_APPOINTMENT_NO_SHOW_WEBHOOK_URL is missing."
      );

      return NextResponse.json(
        {
          success: false,
          event_id:
            automationEvent.id,
          error:
            "Automation event created, but N8N_TRACKPR_APPOINTMENT_NO_SHOW_WEBHOOK_URL is missing.",
        },
        {
          status: 500,
        }
      );
    }

    const n8nPayload = {
      event_id:
        automationEvent.id,

      event_type:
        "appointment_no_show",

      organization_id:
        organizationId,

      lead_id:
        appointment.lead_id,

      contact_id:
        null,

      appointment_id:
        appointment.id,

      estimate_id:
        null,

      job_id:
        null,

      payment_id:
        null,

      review_id:
        null,

      payload:
        eventPayload,

      status:
        automationEvent.status ||
        "pending",

      created_at:
        new Date().toISOString(),
    };

    let n8nResponse: Response;

    try {
      n8nResponse =
        await fetch(
          webhookUrl,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              n8nPayload
            ),

            cache: "no-store",
          }
        );
    } catch (webhookError: any) {
      console.error(
        "No-show n8n webhook request failed:",
        webhookError
      );

      return NextResponse.json(
        {
          success: false,
          event_id:
            automationEvent.id,
          error:
            "Automation event created, but the n8n webhook request failed.",
          details:
            webhookError?.message ||
            String(webhookError),
        },
        {
          status: 502,
        }
      );
    }

    const n8nText =
      await n8nResponse.text();

    console.log(
      "NO-SHOW AUTOMATION DISPATCH:",
      {
        event_id:
          automationEvent.id,
        appointment_id:
          appointment.id,
        organization_id:
          organizationId,
        n8n_status:
          n8nResponse.status,
        n8n_response:
          n8nText,
      }
    );

    if (!n8nResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          event_id:
            automationEvent.id,
          error:
            "Automation event was created, but n8n rejected the webhook.",
          n8n_status:
            n8nResponse.status,
          n8n_response:
            n8nText,
        },
        {
          status: 502,
        }
      );
    }

    /*
     * Mark the event as dispatched.
     */
    const {
      error: updateEventError,
    } = await adminSupabase
      .from("automation_events")
      .update({
        status: "sent",
      })
      .eq(
        "id",
        automationEvent.id
      );

    if (updateEventError) {
      console.error(
        "Unable to mark no-show event as sent:",
        updateEventError
      );
    }

    return NextResponse.json(
      {
        success: true,

        event_id:
          automationEvent.id,

        appointment_id:
          appointment.id,

        organization_id:
          organizationId,

        n8n_status:
          n8nResponse.status,

        n8n_response:
          n8nText,
      },
      {
        status: 200,
      }
    );
  } catch (error: any) {
    console.error(
      "No-show automation route error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unexpected no-show automation error.",
        details:
          error?.message ||
          String(error),
      },
      {
        status: 500,
      }
    );
  }
}