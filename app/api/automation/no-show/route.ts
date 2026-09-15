import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    console.log("========================================");
    console.log("NO-SHOW AUTOMATION ROUTE — START");
    console.log("========================================");

    /*
     * ---------------------------------------------------------
     * 1. AUTHENTICATE USER
     * ---------------------------------------------------------
     */

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log("NO-SHOW AUTH:", {
      authenticated: !!user,
      user_id: user?.id || null,
      auth_error: authError?.message || null,
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized.",
          details:
            authError?.message ||
            "No authenticated user was found.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * ---------------------------------------------------------
     * 2. READ REQUEST
     * ---------------------------------------------------------
     */

    let body: any;

    try {
      body = await request.json();
    } catch (error: any) {
      console.error(
        "NO-SHOW REQUEST JSON ERROR:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Request body is not valid JSON.",
          details:
            error?.message ||
            String(error),
        },
        {
          status: 400,
        }
      );
    }

    const appointmentId =
      body?.appointment_id;

    const organizationId =
      body?.organization_id;

    console.log(
      "NO-SHOW REQUEST:",
      {
        appointment_id:
          appointmentId,
        organization_id:
          organizationId,
      }
    );

    if (!appointmentId) {
      return NextResponse.json(
        {
          success: false,
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
          success: false,
          error:
            "organization_id is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ---------------------------------------------------------
     * 3. CREATE SERVICE-ROLE CLIENT
     * ---------------------------------------------------------
     */

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log(
      "NO-SHOW SERVER ENV:",
      {
        has_supabase_url:
          !!supabaseUrl,

        has_service_role_key:
          !!serviceRoleKey,

        has_n8n_url:
          !!process.env
            .N8N_TRACKPR_APPOINTMENT_NO_SHOW_WEBHOOK_URL,
      }
    );

    if (!supabaseUrl) {
      return NextResponse.json(
        {
          success: false,
          error:
            "NEXT_PUBLIC_SUPABASE_URL is missing from the server environment.",
        },
        {
          status: 500,
        }
      );
    }

    if (!serviceRoleKey) {
      return NextResponse.json(
        {
          success: false,
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

    /*
     * ---------------------------------------------------------
     * 4. VERIFY ORGANIZATION MEMBERSHIP
     * ---------------------------------------------------------
     */

    const {
      data: membership,
      error: membershipError,
    } = await adminSupabase
      .from("organization_members")
      .select(
        "organization_id, user_id"
      )
      .eq(
        "organization_id",
        organizationId
      )
      .eq(
        "user_id",
        user.id
      )
      .limit(1)
      .maybeSingle();

    console.log(
      "NO-SHOW MEMBERSHIP:",
      {
        found:
          !!membership,
        membership:
          membership || null,
        error:
          membershipError?.message ||
          null,
      }
    );

    if (membershipError) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to verify organization membership.",
          details:
            membershipError.message,
          code:
            membershipError.code,
          hint:
            membershipError.hint,
        },
        {
          status: 500,
        }
      );
    }

    if (!membership) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You are not authorized for this organization.",
          user_id:
            user.id,
          organization_id:
            organizationId,
        },
        {
          status: 403,
        }
      );
    }

    /*
     * ---------------------------------------------------------
     * 5. LOAD APPOINTMENT
     * ---------------------------------------------------------
     */

    const {
      data: appointment,
      error: appointmentError,
    } = await adminSupabase
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
      .eq(
        "id",
        appointmentId
      )
      .eq(
        "organization_id",
        organizationId
      )
      .maybeSingle();

    console.log(
      "NO-SHOW APPOINTMENT:",
      {
        found:
          !!appointment,
        appointment:
          appointment || null,
        error:
          appointmentError?.message ||
          null,
      }
    );

    if (appointmentError) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to load appointment.",
          details:
            appointmentError.message,
          code:
            appointmentError.code,
          hint:
            appointmentError.hint,
        },
        {
          status: 500,
        }
      );
    }

    if (!appointment) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Appointment was not found.",
          appointment_id:
            appointmentId,
          organization_id:
            organizationId,
        },
        {
          status: 404,
        }
      );
    }

    /*
     * ---------------------------------------------------------
     * 6. LOAD LEAD
     * ---------------------------------------------------------
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
      } = await adminSupabase
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

      console.log(
        "NO-SHOW LEAD:",
        {
          found:
            !!leadData,
          lead:
            leadData || null,
          error:
            leadError?.message ||
            null,
        }
      );

      if (leadError) {
        console.error(
          "NO-SHOW LEAD LOOKUP ERROR:",
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
     * ---------------------------------------------------------
     * 7. BUILD AUTOMATION PAYLOAD
     * ---------------------------------------------------------
     */

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

        status:
          "no_show",

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
          lead?.phone ||
          "",

        customer_email:
          lead?.email ||
          "",

        service_interest:
          lead?.service_interest ||
          "",
      },
    };

    console.log(
      "NO-SHOW EVENT PAYLOAD:",
      JSON.stringify(
        eventPayload,
        null,
        2
      )
    );

    /*
     * ---------------------------------------------------------
     * 8. CHECK FOR EXISTING EVENT
     * ---------------------------------------------------------
     */

    const {
      data: existingEvent,
      error: existingEventError,
    } = await adminSupabase
      .from("automation_events")
      .select(
        "id, status, event_type, appointment_id, created_at"
      )
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
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle();

    console.log(
      "NO-SHOW EXISTING EVENT:",
      {
        existing_event:
          existingEvent || null,

        error:
          existingEventError?.message ||
          null,
      }
    );

    if (existingEventError) {
      console.error(
        "NO-SHOW EXISTING EVENT CHECK ERROR:",
        existingEventError
      );
    }

    /*
     * ---------------------------------------------------------
     * 9. CREATE AUTOMATION EVENT
     * ---------------------------------------------------------
     */

    let automationEvent =
      existingEvent;

    if (!automationEvent) {
      console.log(
        "NO-SHOW EVENT INSERT — START"
      );

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
            "pending",
        })
        .select(
          `
            id,
            organization_id,
            event_type,
            lead_id,
            appointment_id,
            status,
            payload,
            created_at
          `
        )
        .single();

      console.log(
        "NO-SHOW EVENT INSERT RESULT:",
        {
          created_event:
            createdEvent || null,

          error:
            eventError || null,
        }
      );

      if (eventError) {
        console.error(
          "NO-SHOW AUTOMATION EVENT INSERT FAILED:",
          eventError
        );

        return NextResponse.json(
          {
            success: false,

            error:
              "Failed to create automation event.",

            details:
              eventError.message,

            code:
              eventError.code,

            hint:
              eventError.hint,

            appointment_id:
              appointment.id,

            organization_id:
              organizationId,
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
          success: false,
          error:
            "Automation event does not have an ID.",
        },
        {
          status: 500,
        }
      );
    }

    console.log(
      "NO-SHOW AUTOMATION EVENT READY:",
      {
        event_id:
          automationEvent.id,

        event_type:
          automationEvent.event_type,

        status:
          automationEvent.status,
      }
    );

    /*
     * ---------------------------------------------------------
     * 10. GET N8N WEBHOOK
     * ---------------------------------------------------------
     */

    const webhookUrlRaw =
      process.env
        .N8N_TRACKPR_APPOINTMENT_NO_SHOW_WEBHOOK_URL;

    const webhookUrl =
      webhookUrlRaw?.trim();

    console.log(
      "NO-SHOW N8N WEBHOOK:",
      {
        configured:
          !!webhookUrl,

        url:
          webhookUrl
            ? webhookUrl
            : null,

        raw_length:
          webhookUrlRaw?.length ||
          0,

        trimmed_length:
          webhookUrl?.length ||
          0,
      }
    );

    if (!webhookUrl) {
      return NextResponse.json(
        {
          success: false,

          event_id:
            automationEvent.id,

          error:
            "Automation event was created, but N8N_TRACKPR_APPOINTMENT_NO_SHOW_WEBHOOK_URL is missing.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * ---------------------------------------------------------
     * 11. BUILD N8N PAYLOAD
     * ---------------------------------------------------------
     */

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
        automationEvent.created_at ||
        new Date().toISOString(),
    };

    console.log(
      "NO-SHOW N8N PAYLOAD:",
      JSON.stringify(
        n8nPayload,
        null,
        2
      )
    );

    /*
     * ---------------------------------------------------------
     * 12. SEND TO N8N
     * ---------------------------------------------------------
     */

    let n8nResponse: Response;

    try {
      console.log(
        "NO-SHOW N8N REQUEST — START"
      );

      n8nResponse =
        await fetch(
          webhookUrl,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            body:
              JSON.stringify(
                n8nPayload
              ),

            cache:
              "no-store",
          }
        );

      console.log(
        "NO-SHOW N8N REQUEST — RESPONSE:",
        {
          status:
            n8nResponse.status,

          statusText:
            n8nResponse.statusText,

          ok:
            n8nResponse.ok,
        }
      );
    } catch (webhookError: any) {
      console.error(
        "NO-SHOW N8N FETCH ERROR:",
        webhookError
      );

      return NextResponse.json(
        {
          success: false,

          event_id:
            automationEvent.id,

          error:
            "Automation event was created, but the n8n webhook request failed.",

          details:
            webhookError?.message ||
            String(webhookError),
        },
        {
          status: 502,
        }
      );
    }

    /*
     * ---------------------------------------------------------
     * 13. READ N8N RESPONSE
     * ---------------------------------------------------------
     */

    const n8nText =
      await n8nResponse.text();

    console.log(
      "NO-SHOW N8N RESPONSE BODY:",
      n8nText
    );

    if (!n8nResponse.ok) {
      console.error(
        "NO-SHOW N8N REJECTED WEBHOOK:",
        {
          status:
            n8nResponse.status,

          response:
            n8nText,
        }
      );

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
     * ---------------------------------------------------------
     * 14. MARK EVENT SENT
     * ---------------------------------------------------------
     */

    const {
      error: updateEventError,
    } = await adminSupabase
      .from("automation_events")
      .update({
        status:
          "sent",
      })
      .eq(
        "id",
        automationEvent.id
      );

    console.log(
      "NO-SHOW EVENT STATUS UPDATE:",
      {
        event_id:
          automationEvent.id,

        status:
          "sent",

        error:
          updateEventError?.message ||
          null,
      }
    );

    if (updateEventError) {
      console.error(
        "NO-SHOW EVENT SENT UPDATE ERROR:",
        updateEventError
      );
    }

    /*
     * ---------------------------------------------------------
     * 15. SUCCESS
     * ---------------------------------------------------------
     */

    console.log(
      "========================================"
    );

    console.log(
      "NO-SHOW AUTOMATION — FULL SUCCESS"
    );

    console.log(
      "========================================"
    );

    return NextResponse.json(
      {
        success: true,

        event_id:
          automationEvent.id,

        event_type:
          "appointment_no_show",

        appointment_id:
          appointment.id,

        organization_id:
          organizationId,

        lead_id:
          appointment.lead_id,

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
      "========================================"
    );

    console.error(
      "NO-SHOW AUTOMATION — UNEXPECTED ERROR"
    );

    console.error(
      "========================================"
    );

    console.error(
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          "Unexpected no-show automation error.",

        details:
          error?.message ||
          String(error),

        stack:
          process.env.NODE_ENV ===
          "development"
            ? error?.stack ||
              null
            : undefined,
      },
      {
        status: 500,
      }
    );
  }
}