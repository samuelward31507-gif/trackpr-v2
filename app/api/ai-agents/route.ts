import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function getOrganizationId(supabase: any, userId: string) {
  const { data: membership, error } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (error || !membership?.organization_id) {
    return null;
  }

  return membership.organization_id;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const organizationId = await getOrganizationId(supabase, user.id);

    if (!organizationId) {
      return NextResponse.json(
        { error: "No organization found." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const {
      name,
      description,
      purpose,
      system_prompt,
      tone,
      business_knowledge,
      services,
      qualification_questions,
      operating_hours,
      escalation_rules,
      channels,
      model,
      temperature,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Agent name is required." },
        { status: 400 }
      );
    }

    const { data: agent, error } = await supabase
      .from("ai_agents")
      .insert({
        organization_id: organizationId,
        name: name.trim(),
        description: description || null,
        status: "draft",
        purpose: purpose || null,
        system_prompt: system_prompt || null,
        tone: tone || "professional",
        business_knowledge: business_knowledge || null,
        services: services || null,
        qualification_questions:
          qualification_questions || null,
        operating_hours: operating_hours || null,
        escalation_rules: escalation_rules || null,
        channels:
          Array.isArray(channels) && channels.length
            ? channels
            : ["sms"],
        model: model || "default",
        temperature:
          typeof temperature === "number"
            ? temperature
            : 0.3,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Create AI agent error:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      agent,
    });
  } catch (error) {
    console.error("Create AI agent error:", error);

    return NextResponse.json(
      { error: "Failed to create AI agent." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const organizationId = await getOrganizationId(
      supabase,
      user.id
    );

    if (!organizationId) {
      return NextResponse.json(
        { error: "No organization found." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Agent ID is required." },
        { status: 400 }
      );
    }

    const allowedFields = [
      "name",
      "description",
      "purpose",
      "system_prompt",
      "status",
      "tone",
      "business_knowledge",
      "services",
      "qualification_questions",
      "operating_hours",
      "escalation_rules",
      "channels",
      "model",
      "temperature",
    ];

    const cleanUpdates: Record<string, any> = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(updates, field)) {
        cleanUpdates[field] = updates[field];
      }
    }

    if ("name" in cleanUpdates) {
      if (!cleanUpdates.name?.trim()) {
        return NextResponse.json(
          { error: "Agent name cannot be empty." },
          { status: 400 }
        );
      }

      cleanUpdates.name = cleanUpdates.name.trim();
    }

    if (
      "channels" in cleanUpdates &&
      (!Array.isArray(cleanUpdates.channels) ||
        cleanUpdates.channels.length === 0)
    ) {
      cleanUpdates.channels = ["sms"];
    }

    if ("temperature" in cleanUpdates) {
      const temperature = Number(cleanUpdates.temperature);

      if (
        Number.isNaN(temperature) ||
        temperature < 0 ||
        temperature > 1
      ) {
        return NextResponse.json(
          {
            error:
              "Temperature must be between 0 and 1.",
          },
          { status: 400 }
        );
      }

      cleanUpdates.temperature = temperature;
    }

    const { data: agent, error } = await supabase
      .from("ai_agents")
      .update(cleanUpdates)
      .eq("id", id)
      .eq("organization_id", organizationId)
      .select("*")
      .single();

    if (error) {
      console.error("Update AI agent error:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      agent,
    });
  } catch (error) {
    console.error("Update AI agent error:", error);

    return NextResponse.json(
      { error: "Failed to update AI agent." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const organizationId = await getOrganizationId(
      supabase,
      user.id
    );

    if (!organizationId) {
      return NextResponse.json(
        { error: "No organization found." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Agent ID is required." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("ai_agents")
      .delete()
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (error) {
      console.error("Delete AI agent error:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Delete AI agent error:", error);

    return NextResponse.json(
      { error: "Failed to delete AI agent." },
      { status: 500 }
    );
  }
}