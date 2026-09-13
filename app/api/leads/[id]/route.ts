import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(
  request: Request,
  { params }: RouteContext
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: "Lead ID is required." },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  /*
   * Get authenticated user
   */
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: "You must be signed in." },
      { status: 401 }
    );
  }

  /*
   * Get user's organization
   */
  const { data: membership, error: membershipError } =
    await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .maybeSingle();

  if (membershipError || !membership) {
    return NextResponse.json(
      { error: "Workspace not found." },
      { status: 403 }
    );
  }

  /*
   * Delete the lead.
   *
   * Database foreign-key rules handle related records:
   *
   * - Activities → deleted
   * - Tasks → deleted
   * - Estimates → deleted
   * - Appointments → lead_id becomes NULL
   * - Jobs → lead_id becomes NULL
   * - Payments → lead_id becomes NULL
   * - Reviews → lead_id becomes NULL
   * - Conversations → lead_id becomes NULL
   * - Messages → lead_id becomes NULL
   * - Workflow runs → lead_id becomes NULL
   * - Contacts → lead_id becomes NULL
   */
  const { error: deleteError } = await supabase
    .from("leads")
    .delete()
    .eq("id", id)
    .eq("organization_id", membership.organization_id);

  if (deleteError) {
    console.error("Error deleting lead:", deleteError);

    return NextResponse.json(
      {
        error:
          deleteError.message ||
          "Unable to delete the lead.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
  });
}