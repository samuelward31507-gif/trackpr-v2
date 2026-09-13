import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    console.log("=== TRACKPR CHECK RESPONSE START ===");

    const authHeader = request.headers.get("authorization");
    const expectedSecret = process.env.N8N_TRACKPR_WEBHOOK_SECRET;

    if (!expectedSecret) {
      console.error("N8N_TRACKPR_WEBHOOK_SECRET is not configured.");

      return NextResponse.json(
        { error: "Automation secret is not configured." },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${expectedSecret}`) {
      console.error("Invalid automation authorization.");

      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    const leadId = searchParams.get("lead_id");
    const organizationId = searchParams.get("organization_id");

    if (!leadId || !organizationId) {
      return NextResponse.json(
        {
          error: "lead_id and organization_id are required.",
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("id, direction, body, created_at")
      .eq("organization_id", organizationId)
      .eq("lead_id", leadId)
      .eq("direction", "inbound")
      .order("created_at", { ascending: false })
      .limit(1);

    if (messagesError) {
      console.error("Message lookup failed:", messagesError);

      return NextResponse.json(
        {
          error: messagesError.message,
        },
        { status: 500 }
      );
    }

    const replied = (messages?.length ?? 0) > 0;

    console.log("Customer replied:", replied);

    return NextResponse.json({
      success: true,
      replied,
      message: messages?.[0] ?? null,
    });
  } catch (error) {
    console.error("CHECK RESPONSE ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to check customer response.",
      },
      { status: 500 }
    );
  }
}