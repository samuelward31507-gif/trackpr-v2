import AppShell from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Get the authenticated user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // Not signed in
  if (userError || !user) {
    redirect("/login");
  }

  // Find the user's organization membership
  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    console.error(
      "Error loading organization membership:",
      membershipError
    );
  }

  // Signed in but no workspace
  if (!membership) {
    redirect("/onboarding");
  }

  // Load the organization
  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id, name, industry")
    .eq("id", membership.organization_id)
    .single();

  if (organizationError || !organization) {
    console.error("Error loading organization:", organizationError);
    redirect("/onboarding");
  }

  return (
    <AppShell
      organizationName={organization.name}
      userEmail={user.email ?? ""}
    >
      <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
        {children}
      </div>
    </AppShell>
  );
}