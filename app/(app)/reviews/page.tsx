import { createClient } from "@/lib/supabase/server";
import ReviewsClient from "./reviews-client";

export default async function ReviewsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: membership, error: membershipError } =
    await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

  if (membershipError) {
    console.error(
      "Reviews membership error:",
      membershipError
    );
  }

  if (!membership) {
    return null;
  }

  const { data: reviews, error: reviewsError } =
    await supabase
      .from("reviews")
      .select(`
        id,
        organization_id,
        lead_id,
        job_id,
        rating,
        review_text,
        source,
        status,
        reviewer_name,
        reviewer_email,
        review_date,
        response_text,
        responded_at,
        notes,
        created_at,
        updated_at,
        leads (
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        jobs (
          id,
          title,
          amount,
          status,
          payment_status,
          lead_id
        )
      `)
      .eq(
        "organization_id",
        membership.organization_id
      )
      .order("review_date", {
        ascending: false,
      })
      .order("created_at", {
        ascending: false,
      });

  if (reviewsError) {
    console.error(
      "Error loading reviews:",
      reviewsError
    );
  }

  const { data: leads, error: leadsError } =
    await supabase
      .from("leads")
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone
      `)
      .eq(
        "organization_id",
        membership.organization_id
      )
      .order("first_name", {
        ascending: true,
      });

  if (leadsError) {
    console.error(
      "Error loading leads:",
      leadsError
    );
  }

  const { data: jobs, error: jobsError } =
    await supabase
      .from("jobs")
      .select(`
        id,
        title,
        amount,
        status,
        payment_status,
        lead_id
      `)
      .eq(
        "organization_id",
        membership.organization_id
      )
      .order("created_at", {
        ascending: false,
      });

  if (jobsError) {
    console.error(
      "Error loading jobs:",
      jobsError
    );
  }

  const normalizedReviews =
    (reviews ?? []).map((review: any) => ({
      ...review,

      leads: Array.isArray(review.leads)
        ? review.leads[0] ?? null
        : review.leads ?? null,

      jobs: Array.isArray(review.jobs)
        ? review.jobs[0] ?? null
        : review.jobs ?? null,
    }));

  return (
    <ReviewsClient
      reviews={normalizedReviews as any}
      leads={(leads ?? []) as any}
      jobs={(jobs ?? []) as any}
    />
  );
}