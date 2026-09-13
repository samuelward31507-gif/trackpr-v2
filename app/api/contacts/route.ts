import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ContactPayload = {
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
  phone?: string | null;
  email?: string | null;
  status?: string | null;
  notes?: string | null;
};

async function getOrganizationId() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      supabase,
      user: null,
      organizationId: null,
    };
  }

  const { data: membership, error: membershipError } =
    await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

  if (membershipError || !membership?.organization_id) {
    return {
      supabase,
      user,
      organizationId: null,
    };
  }

  return {
    supabase,
    user,
    organizationId: membership.organization_id,
  };
}

const contactSelect = `
  id,
  organization_id,
  lead_id,
  first_name,
  last_name,
  company_name,
  phone,
  email,
  status,
  notes,
  created_at,
  updated_at
`;

function cleanValue(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed || null;
}

function normalizeStatus(value: unknown) {
  if (
    value === "active" ||
    value === "inactive" ||
    value === "archived"
  ) {
    return value;
  }

  return "active";
}

/* -------------------------------------------------------------------------- */
/* POST - Create contact                                                      */
/* -------------------------------------------------------------------------- */

export async function POST(request: Request) {
  try {
    const {
      supabase,
      user,
      organizationId,
    } = await getOrganizationId();

    if (!user || !organizationId) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const {
      first_name,
      last_name,
      company_name,
      phone,
      email,
      status,
      notes,
    } = body as ContactPayload;

    const { data: contact, error } = await supabase
      .from("contacts")
      .insert({
        organization_id: organizationId,
        first_name: cleanValue(first_name),
        last_name: cleanValue(last_name),
        company_name: cleanValue(company_name),
        phone: cleanValue(phone),
        email: cleanValue(email),
        status: normalizeStatus(status),
        notes: cleanValue(notes),
      })
      .select(contactSelect)
      .maybeSingle();

    if (error) {
      console.error("Create contact error:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (!contact) {
      return NextResponse.json(
        { error: "Contact was not created." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { contact },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/contacts error:", error);

    return NextResponse.json(
      { error: "Unable to create contact." },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* PATCH - Update contact                                                     */
/* -------------------------------------------------------------------------- */

export async function PATCH(request: Request) {
  try {
    const {
      supabase,
      user,
      organizationId,
    } = await getOrganizationId();

    if (!user || !organizationId) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const {
      id,
      first_name,
      last_name,
      company_name,
      phone,
      email,
      status,
      notes,
    } = body as ContactPayload & {
      id?: string;
    };

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Contact ID is required." },
        { status: 400 }
      );
    }

    /*
     * First verify the contact exists inside the user's organization.
     * This gives us a clean "not found" response instead of relying
     * on Supabase's .single() behavior after the update.
     */
    const { data: existingContact, error: existingError } =
      await supabase
        .from("contacts")
        .select("id")
        .eq("id", id)
        .eq("organization_id", organizationId)
        .maybeSingle();

    if (existingError) {
      console.error(
        "Find contact before update error:",
        existingError
      );

      return NextResponse.json(
        { error: existingError.message },
        { status: 400 }
      );
    }

    if (!existingContact) {
      return NextResponse.json(
        { error: "Contact not found." },
        { status: 404 }
      );
    }

    /*
     * Perform the update.
     */
    const { error: updateError } = await supabase
      .from("contacts")
      .update({
        first_name: cleanValue(first_name),
        last_name: cleanValue(last_name),
        company_name: cleanValue(company_name),
        phone: cleanValue(phone),
        email: cleanValue(email),
        status: normalizeStatus(status),
        notes: cleanValue(notes),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (updateError) {
      console.error(
        "Update contact error:",
        updateError
      );

      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      );
    }

    /*
     * Fetch the updated contact separately.
     * This avoids relying on UPDATE ... RETURNING behavior
     * through the Supabase client/RLS combination.
     */
    const { data: contact, error: fetchError } =
      await supabase
        .from("contacts")
        .select(contactSelect)
        .eq("id", id)
        .eq("organization_id", organizationId)
        .maybeSingle();

    if (fetchError) {
      console.error(
        "Fetch updated contact error:",
        fetchError
      );

      return NextResponse.json(
        {
          error:
            "Contact was updated, but the updated record could not be loaded.",
        },
        { status: 500 }
      );
    }

    if (!contact) {
      return NextResponse.json(
        { error: "Updated contact could not be found." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { contact },
      { status: 200 }
    );
  } catch (error) {
    console.error("PATCH /api/contacts error:", error);

    return NextResponse.json(
      { error: "Unable to update contact." },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* DELETE - Delete contact                                                    */
/* -------------------------------------------------------------------------- */

export async function DELETE(request: Request) {
  try {
    const {
      supabase,
      user,
      organizationId,
    } = await getOrganizationId();

    if (!user || !organizationId) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Contact ID is required." },
        { status: 400 }
      );
    }

    /*
     * Verify ownership before deletion.
     */
    const { data: existingContact, error: existingError } =
      await supabase
        .from("contacts")
        .select("id")
        .eq("id", id)
        .eq("organization_id", organizationId)
        .maybeSingle();

    if (existingError) {
      console.error(
        "Find contact before delete error:",
        existingError
      );

      return NextResponse.json(
        { error: existingError.message },
        { status: 400 }
      );
    }

    if (!existingContact) {
      return NextResponse.json(
        { error: "Contact not found." },
        { status: 404 }
      );
    }

    const { error: deleteError } = await supabase
      .from("contacts")
      .delete()
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (deleteError) {
      console.error(
        "Delete contact error:",
        deleteError
      );

      return NextResponse.json(
        { error: deleteError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("DELETE /api/contacts error:", error);

    return NextResponse.json(
      { error: "Unable to delete contact." },
      { status: 500 }
    );
  }
}