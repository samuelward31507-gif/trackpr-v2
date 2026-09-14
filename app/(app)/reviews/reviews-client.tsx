"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Edit3,
  ExternalLink,
  MessageSquare,
  Plus,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  User,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type ReviewStatus =
  | "new"
  | "responded"
  | "needs_attention"
  | "resolved";

type ReviewSource =
  | "google"
  | "facebook"
  | "yelp"
  | "website"
  | "other";

type Lead = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
};

type Job = {
  id: string;
  title: string;
  amount: number | null;
  status: string;
  payment_status: string;
  lead_id: string | null;
};

type Review = {
  id: string;
  organization_id: string;
  lead_id: string | null;
  job_id: string | null;
  rating: number;
  review_text: string | null;
  source: ReviewSource;
  status: ReviewStatus;
  reviewer_name: string | null;
  reviewer_email: string | null;
  review_date: string;
  response_text: string | null;
  responded_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  leads: Lead | null;
  jobs: Job | null;
};

type Props = {
  reviews: Review[];
  leads: Lead[];
  jobs: Job[];
};

function getLeadName(lead: Lead | null | undefined) {
  if (!lead) return "No customer";

  const name =
    `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim();

  return name || "Unnamed customer";
}

function getReviewerName(review: Review) {
  if (review.reviewer_name?.trim()) {
    return review.reviewer_name.trim();
  }

  return getLeadName(review.leads);
}

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "?";

  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return `${parts[0].charAt(0)}${parts[
    parts.length - 1
  ].charAt(0)}`.toUpperCase();
}

function getSourceLabel(source: ReviewSource) {
  switch (source) {
    case "google":
      return "Google";
    case "facebook":
      return "Facebook";
    case "yelp":
      return "Yelp";
    case "website":
      return "Website";
    default:
      return "Other";
  }
}

function getStatusLabel(status: ReviewStatus) {
  switch (status) {
    case "new":
      return "New";
    case "responded":
      return "Responded";
    case "needs_attention":
      return "Needs attention";
    case "resolved":
      return "Resolved";
    default:
      return status;
  }
}

function getStatusClasses(status: ReviewStatus) {
  switch (status) {
    case "new":
      return "bg-blue-50 text-blue-700 ring-blue-200";

    case "responded":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";

    case "needs_attention":
      return "bg-amber-50 text-amber-700 ring-amber-200";

    case "resolved":
      return "bg-slate-100 text-slate-600 ring-slate-200";

    default:
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
}

function getRatingClasses(rating: number) {
  if (rating >= 5) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (rating >= 4) {
    return "bg-blue-50 text-blue-700 ring-blue-200";
  }

  if (rating >= 3) {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  return "bg-red-50 text-red-700 ring-red-200";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(
    value.includes("T") ? value : `${value}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function StarRating({
  rating,
  size = "sm",
}: {
  rating: number;
  size?: "sm" | "md";
}) {
  const sizeClass =
    size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClass} ${
            star <= rating
              ? "fill-amber-400 text-amber-400"
              : "text-slate-200"
          }`}
        />
      ))}
    </div>
  );
}

function getReviewRowAccent(review: Review) {
  if (
    review.status === "needs_attention" ||
    review.rating <= 3
  ) {
    return "border-l-2 border-l-amber-400";
  }

  if (review.status === "responded") {
    return "border-l-2 border-l-emerald-400";
  }

  return "";
}

export default function ReviewsClient({
  reviews: initialReviews,
  leads,
  jobs,
}: Props) {
  const supabase = createClient();

  const [reviews, setReviews] =
    useState<Review[]>(initialReviews);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState<"all" | ReviewStatus>("all");

  const [sourceFilter, setSourceFilter] =
    useState<"all" | ReviewSource>("all");

  const [ratingFilter, setRatingFilter] =
    useState<
      "all" | "5" | "4" | "3" | "2" | "1"
    >("all");

  const [showModal, setShowModal] =
    useState(false);

  const [editingReview, setEditingReview] =
    useState<Review | null>(null);

  const [reviewerName, setReviewerName] =
    useState("");

  const [reviewerEmail, setReviewerEmail] =
    useState("");

  const [leadId, setLeadId] =
    useState("");

  const [jobId, setJobId] =
    useState("");

  const [rating, setRating] = useState(5);

  const [reviewText, setReviewText] =
    useState("");

  const [source, setSource] =
    useState<ReviewSource>("google");

  const [status, setStatus] =
    useState<ReviewStatus>("new");

  const [reviewDate, setReviewDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [responseText, setResponseText] =
    useState("");

  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");

  const [deleteTarget, setDeleteTarget] =
    useState<Review | null>(null);

  const filteredReviews = useMemo(() => {
    const query = search.trim().toLowerCase();

    return reviews.filter((review) => {
      const reviewer =
        getReviewerName(review).toLowerCase();

      const reviewContent =
        review.review_text?.toLowerCase() ?? "";

      const jobTitle =
        review.jobs?.title?.toLowerCase() ?? "";

      const sourceLabel =
        getSourceLabel(review.source).toLowerCase();

      const matchesSearch =
        !query ||
        reviewer.includes(query) ||
        reviewContent.includes(query) ||
        jobTitle.includes(query) ||
        sourceLabel.includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        review.status === statusFilter;

      const matchesSource =
        sourceFilter === "all" ||
        review.source === sourceFilter;

      const matchesRating =
        ratingFilter === "all" ||
        review.rating === Number(ratingFilter);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesSource &&
        matchesRating
      );
    });
  }, [
    reviews,
    search,
    statusFilter,
    sourceFilter,
    ratingFilter,
  ]);

  const metrics = useMemo(() => {
    const total = reviews.length;

    const average =
      total > 0
        ? reviews.reduce(
            (sum, review) =>
              sum + Number(review.rating || 0),
            0
          ) / total
        : 0;

    const fiveStar = reviews.filter(
      (review) => review.rating === 5
    ).length;

    const needsAttention = reviews.filter(
      (review) =>
        review.status === "needs_attention" ||
        review.rating <= 3
    ).length;

    const responded = reviews.filter(
      (review) =>
        review.status === "responded" ||
        review.status === "resolved"
    ).length;

    const responseRate =
      total > 0
        ? Math.round((responded / total) * 100)
        : 0;

    return {
      total,
      average,
      fiveStar,
      needsAttention,
      responded,
      responseRate,
    };
  }, [reviews]);

  const ratingBreakdown = useMemo(() => {
    return [5, 4, 3, 2, 1].map((value) => {
      const count = reviews.filter(
        (review) => review.rating === value
      ).length;

      const percentage =
        reviews.length > 0
          ? Math.round(
              (count / reviews.length) * 100
            )
          : 0;

      return {
        value,
        count,
        percentage,
      };
    });
  }, [reviews]);

  function resetForm() {
    setReviewerName("");
    setReviewerEmail("");
    setLeadId("");
    setJobId("");
    setRating(5);
    setReviewText("");
    setSource("google");
    setStatus("new");
    setReviewDate(
      new Date().toISOString().split("T")[0]
    );
    setResponseText("");
    setNotes("");
    setError("");
  }

  function openCreateModal() {
    resetForm();
    setEditingReview(null);
    setShowModal(true);
  }

  function openEditModal(review: Review) {
    setEditingReview(review);

    setReviewerName(
      review.reviewer_name ?? ""
    );

    setReviewerEmail(
      review.reviewer_email ?? ""
    );

    setLeadId(review.lead_id ?? "");
    setJobId(review.job_id ?? "");
    setRating(review.rating);
    setReviewText(review.review_text ?? "");
    setSource(review.source);
    setStatus(review.status);
    setReviewDate(review.review_date);
    setResponseText(
      review.response_text ?? ""
    );
    setNotes(review.notes ?? "");
    setError("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    setEditingReview(null);
    resetForm();
  }

  async function saveReview() {
    try {
      setSaving(true);
      setError("");

      if (!reviewerName.trim()) {
        throw new Error(
          "Please enter the reviewer's name."
        );
      }

      if (!reviewDate) {
        throw new Error(
          "Please select a review date."
        );
      }

      if (rating < 1 || rating > 5) {
        throw new Error(
          "Please select a rating from 1 to 5."
        );
      }

      const respondedAt =
        status === "responded" ||
        status === "resolved"
          ? editingReview?.responded_at ??
            new Date().toISOString()
          : null;

      const payload = {
        reviewer_name:
          reviewerName.trim() || null,

        reviewer_email:
          reviewerEmail.trim() || null,

        lead_id: leadId || null,

        job_id: jobId || null,

        rating,

        review_text:
          reviewText.trim() || null,

        source,

        status,

        review_date: reviewDate,

        response_text:
          responseText.trim() || null,

        responded_at: respondedAt,

        notes: notes.trim() || null,

        updated_at: new Date().toISOString(),
      };

      if (editingReview) {
        const { data, error: updateError } =
          await supabase
            .from("reviews")
            .update(payload)
            .eq("id", editingReview.id)
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
            .single();

        if (updateError) {
          throw updateError;
        }

        const normalizedReview = {
          ...data,
          leads: Array.isArray(data.leads)
            ? data.leads[0] ?? null
            : data.leads ?? null,
          jobs: Array.isArray(data.jobs)
            ? data.jobs[0] ?? null
            : data.jobs ?? null,
        } as Review;

        setReviews((current) =>
          current.map((review) =>
            review.id === editingReview.id
              ? normalizedReview
              : review
          )
        );
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error(
            "You must be signed in to create a review."
          );
        }

        const {
          data: membership,
          error: membershipError,
        } = await supabase
          .from("organization_members")
          .select("organization_id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        if (membershipError) {
          throw membershipError;
        }

        if (!membership?.organization_id) {
          throw new Error(
            "No organization was found for your account."
          );
        }

        const { data, error: insertError } =
          await supabase
            .from("reviews")
            .insert({
              organization_id:
                membership.organization_id,
              ...payload,
            })
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
            .single();

        if (insertError) {
          throw insertError;
        }

        const normalizedReview = {
          ...data,
          leads: Array.isArray(data.leads)
            ? data.leads[0] ?? null
            : data.leads ?? null,
          jobs: Array.isArray(data.jobs)
            ? data.jobs[0] ?? null
            : data.jobs ?? null,
        } as Review;

        setReviews((current) => [
          normalizedReview,
          ...current,
        ]);
      }

      closeModal();
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message ||
          "Something went wrong while saving the review."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteReview() {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      setError("");

      const { error: deleteError } =
        await supabase
          .from("reviews")
          .delete()
          .eq("id", deleteTarget.id);

      if (deleteError) {
        throw deleteError;
      }

      setReviews((current) =>
        current.filter(
          (review) =>
            review.id !== deleteTarget.id
        )
      );

      setDeleteTarget(null);
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message ||
          "Something went wrong while deleting the review."
      );
    } finally {
      setDeleting(false);
    }
  }

  async function markResponded(review: Review) {
    try {
      setError("");

      const respondedAt =
        review.responded_at ??
        new Date().toISOString();

      const { data, error: updateError } =
        await supabase
          .from("reviews")
          .update({
            status: "responded",
            responded_at: respondedAt,
            updated_at: new Date().toISOString(),
          })
          .eq("id", review.id)
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
          .single();

      if (updateError) {
        throw updateError;
      }

      const normalizedReview = {
        ...data,
        leads: Array.isArray(data.leads)
          ? data.leads[0] ?? null
          : data.leads ?? null,
        jobs: Array.isArray(data.jobs)
          ? data.jobs[0] ?? null
          : data.jobs ?? null,
      } as Review;

      setReviews((current) =>
        current.map((item) =>
          item.id === review.id
            ? normalizedReview
            : item
        )
      );
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message ||
          "Something went wrong while updating the review."
      );
    }
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setSourceFilter("all");
    setRatingFilter("all");
  }

  const hasFilters =
    Boolean(search.trim()) ||
    statusFilter !== "all" ||
    sourceFilter !== "all" ||
    ratingFilter !== "all";

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 xl:px-10">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5" />
              Reputation Management
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Reviews
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              Monitor customer feedback, manage responses,
              and protect the reputation behind your business.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Record Review
          </button>
        </div>

        {/* Error */}
        {error && !showModal && (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-700">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>

            <button
              type="button"
              onClick={() => setError("")}
              className="shrink-0 rounded-lg p-1 text-red-400 transition hover:bg-red-100 hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* KPI Cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total Reviews"
            value={metrics.total.toString()}
            icon={
              <MessageSquare className="h-5 w-5 text-slate-600" />
            }
            description="All recorded customer feedback"
          />

          <MetricCard
            label="Average Rating"
            value={
              metrics.total > 0
                ? metrics.average.toFixed(1)
                : "—"
            }
            icon={
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
            }
            description={
              metrics.total > 0
                ? "Out of 5.0"
                : "No ratings yet"
            }
          />

          <MetricCard
            label="5-Star Reviews"
            value={metrics.fiveStar.toString()}
            icon={
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            }
            description={
              metrics.total > 0
                ? `${Math.round(
                    (metrics.fiveStar /
                      metrics.total) *
                      100
                  )}% of all reviews`
                : "No reviews yet"
            }
          />

          <MetricCard
            label="Needs Attention"
            value={metrics.needsAttention.toString()}
            icon={
              <AlertCircle className="h-5 w-5 text-amber-600" />
            }
            description="Low ratings or flagged reviews"
          />
        </div>

        {/* Reputation Overview */}
        {metrics.total > 0 && (
          <section className="mb-6 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">

            {/* Rating Overview */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <div className="min-w-[170px]">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Reputation Overview
                  </p>

                  <div className="mt-3 flex items-end gap-2">
                    <span className="text-5xl font-bold tracking-tight text-slate-950">
                      {metrics.average.toFixed(1)}
                    </span>

                    <span className="pb-1 text-sm text-slate-400">
                      / 5.0
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <StarRating
                      rating={Math.round(
                        metrics.average
                      )}
                      size="md"
                    />

                    <span className="text-xs font-medium text-slate-500">
                      Based on {metrics.total}{" "}
                      {metrics.total === 1
                        ? "review"
                        : "reviews"}
                    </span>
                  </div>
                </div>

                <div className="flex-1 space-y-2.5">
                  {ratingBreakdown.map(
                    (item) => (
                      <button
                        type="button"
                        key={item.value}
                        onClick={() =>
                          setRatingFilter(
                            item.value.toString() as
                              | "5"
                              | "4"
                              | "3"
                              | "2"
                              | "1"
                          )
                        }
                        className="group flex w-full items-center gap-3 text-left"
                      >
                        <span className="w-10 text-xs font-semibold text-slate-500">
                          {item.value} star
                        </span>

                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-amber-400 transition-all group-hover:bg-amber-500"
                            style={{
                              width: `${item.percentage}%`,
                            }}
                          />
                        </div>

                        <span className="w-8 text-right text-xs font-semibold text-slate-500">
                          {item.count}
                        </span>
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Response Overview */}
            <div className="rounded-2xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Response Coverage
                  </p>

                  <p className="mt-3 text-4xl font-bold tracking-tight">
                    {metrics.responseRate}%
                  </p>

                  <p className="mt-2 text-sm leading-5 text-slate-400">
                    Reviews marked responded or resolved.
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
                  <MessageSquare className="h-5 w-5 text-slate-300" />
                </div>
              </div>

              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    Response progress
                  </span>

                  <span className="font-semibold text-slate-200">
                    {metrics.responded} /{" "}
                    {metrics.total}
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-all"
                    style={{
                      width: `${metrics.responseRate}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Filters */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search reviews, customers, jobs..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:flex">
              <FilterSelect
                value={statusFilter}
                onChange={(value) =>
                  setStatusFilter(
                    value as "all" | ReviewStatus
                  )
                }
                options={[
                  {
                    value: "all",
                    label: "All statuses",
                  },
                  {
                    value: "new",
                    label: "New",
                  },
                  {
                    value: "responded",
                    label: "Responded",
                  },
                  {
                    value: "needs_attention",
                    label: "Needs attention",
                  },
                  {
                    value: "resolved",
                    label: "Resolved",
                  },
                ]}
              />

              <FilterSelect
                value={sourceFilter}
                onChange={(value) =>
                  setSourceFilter(
                    value as
                      | "all"
                      | ReviewSource
                  )
                }
                options={[
                  {
                    value: "all",
                    label: "All sources",
                  },
                  {
                    value: "google",
                    label: "Google",
                  },
                  {
                    value: "facebook",
                    label: "Facebook",
                  },
                  {
                    value: "yelp",
                    label: "Yelp",
                  },
                  {
                    value: "website",
                    label: "Website",
                  },
                  {
                    value: "other",
                    label: "Other",
                  },
                ]}
              />

              <FilterSelect
                value={ratingFilter}
                onChange={(value) =>
                  setRatingFilter(
                    value as
                      | "all"
                      | "5"
                      | "4"
                      | "3"
                      | "2"
                      | "1"
                  )
                }
                options={[
                  {
                    value: "all",
                    label: "All ratings",
                  },
                  {
                    value: "5",
                    label: "5 stars",
                  },
                  {
                    value: "4",
                    label: "4 stars",
                  },
                  {
                    value: "3",
                    label: "3 stars",
                  },
                  {
                    value: "2",
                    label: "2 stars",
                  },
                  {
                    value: "1",
                    label: "1 star",
                  },
                ]}
              />
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            )}
          </div>
        </section>

        {/* Review Activity */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="font-semibold text-slate-950">
                Review Activity
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {filteredReviews.length}{" "}
                {filteredReviews.length === 1
                  ? "review"
                  : "reviews"}{" "}
                shown
                {hasFilters &&
                  ` of ${reviews.length}`}
              </p>
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-left text-xs font-semibold text-slate-500 hover:text-slate-900 sm:text-right"
              >
                Reset filters
              </button>
            )}
          </div>

          {filteredReviews.length === 0 ? (
            <EmptyState
              hasFilters={hasFilters}
              onCreate={openCreateModal}
              onClear={clearFilters}
            />
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70">
                      <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Customer
                      </th>

                      <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Rating
                      </th>

                      <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Review
                      </th>

                      <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Source
                      </th>

                      <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Status
                      </th>

                      <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Date
                      </th>

                      <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredReviews.map(
                      (review) => (
                        <tr
                          key={review.id}
                          className={`transition hover:bg-slate-50/70 ${getReviewRowAccent(
                            review
                          )}`}
                        >
                          {/* Customer */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                                {getInitials(
                                  getReviewerName(
                                    review
                                  )
                                )}
                              </div>

                              <div className="min-w-0">
                                {review.lead_id ? (
                                  <Link
                                    href={`/leads/${review.lead_id}`}
                                    className="block truncate text-sm font-semibold text-slate-950 hover:text-slate-600"
                                  >
                                    {getReviewerName(
                                      review
                                    )}
                                  </Link>
                                ) : (
                                  <p className="truncate text-sm font-semibold text-slate-950">
                                    {getReviewerName(
                                      review
                                    )}
                                  </p>
                                )}

                                {review.reviewer_email && (
                                  <p className="mt-0.5 max-w-[190px] truncate text-xs text-slate-400">
                                    {
                                      review.reviewer_email
                                    }
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Rating */}
                          <td className="px-6 py-4">
                            <div className="space-y-1.5">
                              <StarRating
                                rating={
                                  review.rating
                                }
                              />

                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${getRatingClasses(
                                  review.rating
                                )}`}
                              >
                                {review.rating}.0
                              </span>
                            </div>
                          </td>

                          {/* Review */}
                          <td className="max-w-sm px-6 py-4">
                            <p className="line-clamp-2 text-sm leading-5 text-slate-600">
                              {review.review_text ||
                                "No review text provided."}
                            </p>

                            {review.jobs && (
                              <Link
                                href={`/jobs/${review.jobs.id}`}
                                className="mt-1.5 inline-flex max-w-full items-center gap-1 text-xs font-semibold text-slate-400 transition hover:text-slate-700"
                              >
                                <span className="truncate">
                                  {
                                    review.jobs
                                      .title
                                  }
                                </span>

                                <ExternalLink className="h-3 w-3 shrink-0" />
                              </Link>
                            )}
                          </td>

                          {/* Source */}
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-slate-700">
                              {getSourceLabel(
                                review.source
                              )}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusClasses(
                                review.status
                              )}`}
                            >
                              {getStatusLabel(
                                review.status
                              )}
                            </span>
                          </td>

                          {/* Date */}
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                            {formatDate(
                              review.review_date
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-1">
                              {review.status !==
                                "responded" &&
                                review.status !==
                                  "resolved" && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      markResponded(
                                        review
                                      )
                                    }
                                    title="Mark responded"
                                    className="rounded-lg p-2 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600"
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                  </button>
                                )}

                              <button
                                type="button"
                                onClick={() =>
                                  openEditModal(
                                    review
                                  )
                                }
                                title="Edit review"
                                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteTarget(
                                    review
                                  )
                                }
                                title="Delete review"
                                className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="divide-y divide-slate-100 lg:hidden">
                {filteredReviews.map(
                  (review) => (
                    <div
                      key={review.id}
                      className={`p-5 ${getReviewRowAccent(
                        review
                      )}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                            {getInitials(
                              getReviewerName(
                                review
                              )
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-950">
                              {getReviewerName(
                                review
                              )}
                            </p>

                            <p className="mt-0.5 text-xs text-slate-400">
                              {getSourceLabel(
                                review.source
                              )}{" "}
                              ·{" "}
                              {formatDate(
                                review.review_date
                              )}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusClasses(
                            review.status
                          )}`}
                        >
                          {getStatusLabel(
                            review.status
                          )}
                        </span>
                      </div>

                      <div className="mt-4 flex items-center gap-3">
                        <StarRating
                          rating={review.rating}
                          size="md"
                        />

                        <span className="text-sm font-semibold text-slate-600">
                          {review.rating}.0 / 5.0
                        </span>
                      </div>

                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {review.review_text ||
                          "No review text provided."}
                      </p>

                      {review.jobs && (
                        <Link
                          href={`/jobs/${review.jobs.id}`}
                          className="mt-3 inline-flex max-w-full items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900"
                        >
                          <span className="truncate">
                            {review.jobs.title}
                          </span>

                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </Link>
                      )}

                      <div className="mt-4 flex items-center justify-end gap-1 border-t border-slate-100 pt-4">
                        {review.status !==
                          "responded" &&
                          review.status !==
                            "resolved" && (
                            <button
                              type="button"
                              onClick={() =>
                                markResponded(
                                  review
                                )
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-50"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Responded
                            </button>
                          )}

                        <button
                          type="button"
                          onClick={() =>
                            openEditModal(review)
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget(
                              review
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">

            {/* Modal Header */}
            <div className="flex shrink-0 items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Reputation
                </div>

                <h2 className="text-xl font-bold tracking-tight text-slate-950">
                  {editingReview
                    ? "Edit Review"
                    : "Record Review"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {editingReview
                    ? "Update the review record, status, and response details."
                    : "Add a customer review to your reputation history."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mx-6 mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Modal Body */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-7 px-6 py-6">

                {/* Customer */}
                <div>
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                      <User className="h-4 w-4 text-slate-500" />
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-slate-950">
                        Customer
                      </h3>

                      <p className="text-xs text-slate-400">
                        Who left the review?
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Reviewer Name"
                      required
                    >
                      <input
                        type="text"
                        value={reviewerName}
                        onChange={(event) =>
                          setReviewerName(
                            event.target.value
                          )
                        }
                        placeholder="John Smith"
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Email">
                      <input
                        type="email"
                        value={reviewerEmail}
                        onChange={(event) =>
                          setReviewerEmail(
                            event.target.value
                          )
                        }
                        placeholder="john@example.com"
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Link to Lead">
                      <Select
                        value={leadId}
                        onChange={(value) => {
                          setLeadId(value);

                          const selectedLead =
                            leads.find(
                              (lead) =>
                                lead.id === value
                            );

                          if (
                            selectedLead &&
                            !reviewerName.trim()
                          ) {
                            setReviewerName(
                              getLeadName(
                                selectedLead
                              )
                            );

                            if (
                              selectedLead.email
                            ) {
                              setReviewerEmail(
                                selectedLead.email
                              );
                            }
                          }
                        }}
                        options={[
                          {
                            value: "",
                            label:
                              "No lead linked",
                          },
                          ...leads.map(
                            (lead) => ({
                              value: lead.id,
                              label:
                                getLeadName(
                                  lead
                                ),
                            })
                          ),
                        ]}
                      />
                    </Field>

                    <Field label="Link to Job">
                      <Select
                        value={jobId}
                        onChange={setJobId}
                        options={[
                          {
                            value: "",
                            label:
                              "No job linked",
                          },
                          ...jobs.map(
                            (job) => ({
                              value: job.id,
                              label: `${job.title} · ${formatCurrency(
                                job.amount
                              )}`,
                            })
                          ),
                        ]}
                      />
                    </Field>
                  </div>
                </div>

                {/* Review Details */}
                <div className="border-t border-slate-100 pt-7">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-slate-950">
                        Review Details
                      </h3>

                      <p className="text-xs text-slate-400">
                        Rating, source, and customer feedback.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Rating"
                      required
                    >
                      <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5">
                        {[1, 2, 3, 4, 5].map(
                          (value) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() =>
                                setRating(value)
                              }
                              className="transition hover:scale-110"
                              aria-label={`${value} star${
                                value === 1
                                  ? ""
                                  : "s"
                              }`}
                            >
                              <Star
                                className={`h-5 w-5 ${
                                  value <= rating
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-slate-200"
                                }`}
                              />
                            </button>
                          )
                        )}

                        <span className="ml-auto text-sm font-semibold text-slate-500">
                          {rating}/5
                        </span>
                      </div>
                    </Field>

                    <Field
                      label="Source"
                      required
                    >
                      <Select
                        value={source}
                        onChange={(value) =>
                          setSource(
                            value as ReviewSource
                          )
                        }
                        options={[
                          {
                            value: "google",
                            label: "Google",
                          },
                          {
                            value: "facebook",
                            label: "Facebook",
                          },
                          {
                            value: "yelp",
                            label: "Yelp",
                          },
                          {
                            value: "website",
                            label: "Website",
                          },
                          {
                            value: "other",
                            label: "Other",
                          },
                        ]}
                      />
                    </Field>

                    <Field
                      label="Status"
                      required
                    >
                      <Select
                        value={status}
                        onChange={(value) =>
                          setStatus(
                            value as ReviewStatus
                          )
                        }
                        options={[
                          {
                            value: "new",
                            label: "New",
                          },
                          {
                            value: "responded",
                            label: "Responded",
                          },
                          {
                            value:
                              "needs_attention",
                            label:
                              "Needs attention",
                          },
                          {
                            value: "resolved",
                            label: "Resolved",
                          },
                        ]}
                      />
                    </Field>

                    <Field
                      label="Review Date"
                      required
                    >
                      <input
                        type="date"
                        value={reviewDate}
                        onChange={(event) =>
                          setReviewDate(
                            event.target.value
                          )
                        }
                        className={inputClass}
                      />
                    </Field>
                  </div>

                  <div className="mt-4">
                    <Field label="Review Text">
                      <textarea
                        value={reviewText}
                        onChange={(event) =>
                          setReviewText(
                            event.target.value
                          )
                        }
                        rows={5}
                        placeholder="What did the customer say?"
                        className={`${inputClass} min-h-[120px] resize-y py-3`}
                      />
                    </Field>
                  </div>
                </div>

                {/* Response */}
                <div className="border-t border-slate-100 pt-7">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                      <MessageSquare className="h-4 w-4 text-emerald-600" />
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-slate-950">
                        Response
                      </h3>

                      <p className="text-xs text-slate-400">
                        Track the response sent to the customer.
                      </p>
                    </div>
                  </div>

                  <Field label="Response Text">
                    <textarea
                      value={responseText}
                      onChange={(event) =>
                        setResponseText(
                          event.target.value
                        )
                      }
                      rows={4}
                      placeholder="Add the response you sent to the customer..."
                      className={`${inputClass} min-h-[100px] resize-y py-3`}
                    />
                  </Field>
                </div>

                {/* Internal Notes */}
                <div className="border-t border-slate-100 pt-7">
                  <Field label="Internal Notes">
                    <textarea
                      value={notes}
                      onChange={(event) =>
                        setNotes(event.target.value)
                      }
                      rows={3}
                      placeholder="Private notes about this review..."
                      className={`${inputClass} min-h-[90px] resize-y py-3`}
                    />
                  </Field>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveReview}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editingReview
                    ? "Save Changes"
                    : "Record Review"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">

            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-red-500">
                  <Trash2 className="h-3.5 w-3.5" />
                  Destructive Action
                </div>

                <h2 className="text-lg font-bold text-slate-950">
                  Delete Review
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  This action cannot be undone.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setDeleteTarget(null)
                }
                disabled={deleting}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-6">
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg bg-red-100 p-2 text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-red-900">
                      Delete this review?
                    </p>

                    <p className="mt-1 text-sm leading-5 text-red-700">
                      The review from{" "}
                      <span className="font-semibold">
                        {getReviewerName(
                          deleteTarget
                        )}
                      </span>{" "}
                      will be permanently removed.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  setDeleteTarget(null)
                }
                disabled={deleting}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={deleteReview}
                disabled={deleting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />

                {deleting
                  ? "Deleting..."
                  : "Delete Review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100";

function MetricCard({
  label,
  value,
  icon,
  description,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            {value}
          </p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50">
          {icon}
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-400">
        {description}
      </p>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: {
    value: string;
    label: string;
  }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3.5 pr-9 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 xl:min-w-[155px]"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>

      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: {
    value: string;
    label: string;
  }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className={`${inputClass} appearance-none pr-9`}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>

      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </span>

      {children}
    </label>
  );
}

function EmptyState({
  hasFilters,
  onCreate,
  onClear,
}: {
  hasFilters: boolean;
  onCreate: () => void;
  onClear: () => void;
}) {
  return (
    <div className="px-6 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <MessageSquare className="h-7 w-7" />
      </div>

      <h3 className="mt-5 text-base font-semibold text-slate-950">
        {hasFilters
          ? "No reviews match your filters"
          : "No reviews yet"}
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {hasFilters
          ? "Try adjusting your search or filters to find the review you're looking for."
          : "Start building your reputation history by recording your first customer review."}
      </p>

      {hasFilters ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <X className="h-4 w-4" />
          Clear Filters
        </button>
      ) : (
        <button
          type="button"
          onClick={onCreate}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          Record Review
        </button>
      )}
    </div>
  );
}