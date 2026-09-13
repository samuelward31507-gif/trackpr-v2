"use client";

import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  DollarSign,
  FileText,
  MessageSquare,
  Plus,
  Star,
  Target,
  TrendingUp,
  UserPlus,
  Users,
  WalletCards,
} from "lucide-react";
import { useMemo } from "react";

type Lead = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  status: string | null;
  created_at: string;
};

type Estimate = {
  id: string;
  lead_id: string | null;
  status: string | null;
  total: number | null;
  created_at: string;
};

type Job = {
  id: string;
  lead_id: string | null;
  title: string;
  status: string | null;
  amount: number | null;
  payment_status: string | null;
  created_at: string;
};

type Payment = {
  id: string;
  job_id: string | null;
  amount: number | null;
  status: string | null;
  payment_date: string | null;
  created_at: string;
};

type Review = {
  id: string;
  rating: number;
  status: string | null;
  reviewer_name: string | null;
  review_date: string;
  created_at: string;
};

type Props = {
  leads: Lead[];
  estimates: Estimate[];
  jobs: Job[];
  payments: Payment[];
  reviews: Review[];
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactCurrency(value: number) {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }

  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }

  return formatCurrency(value);
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

function getLeadName(lead: Lead) {
  const name = `${lead.first_name ?? ""} ${
    lead.last_name ?? ""
  }`.trim();

  return name || "Unnamed lead";
}

function getInitials(lead: Lead) {
  const first = lead.first_name?.charAt(0) ?? "";
  const last = lead.last_name?.charAt(0) ?? "";

  const initials = `${first}${last}`.toUpperCase();

  return initials || "L";
}

function isPaidPayment(payment: Payment) {
  const status = (payment.status ?? "").toLowerCase();

  return [
    "paid",
    "completed",
    "succeeded",
    "success",
  ].includes(status);
}

function isWonEstimate(estimate: Estimate) {
  const status = (estimate.status ?? "").toLowerCase();

  return [
    "accepted",
    "approved",
    "won",
    "converted",
  ].includes(status);
}

function isActiveJob(job: Job) {
  const status = (job.status ?? "").toLowerCase();

  return ![
    "completed",
    "complete",
    "cancelled",
    "canceled",
    "closed",
  ].includes(status);
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
}

function getMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
  }).format(date);
}

function getStatusLabel(status: string | null) {
  if (!status) return "New";

  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function DashboardClient({
  leads,
  estimates,
  jobs,
  payments,
  reviews,
}: Props) {
  const now = new Date();

  const currentMonthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );

  const previousMonthStart = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1
  );

  const currentMonthLeads = useMemo(() => {
    return leads.filter(
      (lead) => new Date(lead.created_at) >= currentMonthStart
    ).length;
  }, [leads, currentMonthStart]);

  const previousMonthLeads = useMemo(() => {
    return leads.filter((lead) => {
      const date = new Date(lead.created_at);

      return (
        date >= previousMonthStart &&
        date < currentMonthStart
      );
    }).length;
  }, [leads, previousMonthStart, currentMonthStart]);

  const revenue = useMemo(() => {
    return payments
      .filter(isPaidPayment)
      .reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0
      );
  }, [payments]);

  const currentMonthRevenue = useMemo(() => {
    return payments
      .filter((payment) => {
        if (!isPaidPayment(payment)) return false;

        const date = new Date(
          payment.payment_date || payment.created_at
        );

        return date >= currentMonthStart;
      })
      .reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0
      );
  }, [payments, currentMonthStart]);

  const previousMonthRevenue = useMemo(() => {
    return payments
      .filter((payment) => {
        if (!isPaidPayment(payment)) return false;

        const date = new Date(
          payment.payment_date || payment.created_at
        );

        return (
          date >= previousMonthStart &&
          date < currentMonthStart
        );
      })
      .reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0
      );
  }, [payments, previousMonthStart, currentMonthStart]);

  const revenueChange = useMemo(() => {
    if (previousMonthRevenue === 0) {
      return currentMonthRevenue > 0 ? 100 : 0;
    }

    return Math.round(
      ((currentMonthRevenue - previousMonthRevenue) /
        previousMonthRevenue) *
        100
    );
  }, [currentMonthRevenue, previousMonthRevenue]);

  const leadChange = useMemo(() => {
    if (previousMonthLeads === 0) {
      return currentMonthLeads > 0 ? 100 : 0;
    }

    return Math.round(
      ((currentMonthLeads - previousMonthLeads) /
        previousMonthLeads) *
        100
    );
  }, [currentMonthLeads, previousMonthLeads]);

  const outstanding = useMemo(() => {
    return jobs
      .filter((job) => {
        const paymentStatus = (
          job.payment_status ?? ""
        ).toLowerCase();

        return ![
          "paid",
          "complete",
          "completed",
        ].includes(paymentStatus);
      })
      .reduce(
        (sum, job) => sum + Number(job.amount || 0),
        0
      );
  }, [jobs]);

  const activeJobs = useMemo(() => {
    return jobs.filter(isActiveJob).length;
  }, [jobs]);

  const completedJobs = useMemo(() => {
    return jobs.filter((job) => {
      const status = (job.status ?? "").toLowerCase();

      return [
        "completed",
        "complete",
      ].includes(status);
    }).length;
  }, [jobs]);

  const openEstimates = useMemo(() => {
    return estimates.filter(
      (estimate) => !isWonEstimate(estimate)
    ).length;
  }, [estimates]);

  const estimateValue = useMemo(() => {
    return estimates
      .filter(
        (estimate) =>
          ![
            "rejected",
            "declined",
            "lost",
          ].includes(
            (estimate.status ?? "").toLowerCase()
          )
      )
      .reduce(
        (sum, estimate) =>
          sum + Number(estimate.total || 0),
        0
      );
  }, [estimates]);

  const wonEstimateValue = useMemo(() => {
    return estimates
      .filter(isWonEstimate)
      .reduce(
        (sum, estimate) =>
          sum + Number(estimate.total || 0),
        0
      );
  }, [estimates]);

  const averageRating = useMemo(() => {
    if (!reviews.length) return 0;

    return (
      reviews.reduce(
        (sum, review) => sum + Number(review.rating || 0),
        0
      ) / reviews.length
    );
  }, [reviews]);

  const fiveStarPercentage = useMemo(() => {
    if (!reviews.length) return 0;

    const fiveStar = reviews.filter(
      (review) => Number(review.rating) === 5
    ).length;

    return Math.round(
      (fiveStar / reviews.length) * 100
    );
  }, [reviews]);

  const closeRate = useMemo(() => {
    if (!estimates.length) return 0;

    const won = estimates.filter(isWonEstimate).length;

    return Math.round((won / estimates.length) * 100);
  }, [estimates]);

  const averageJobValue = useMemo(() => {
    if (!jobs.length) return 0;

    return (
      jobs.reduce(
        (sum, job) => sum + Number(job.amount || 0),
        0
      ) / jobs.length
    );
  }, [jobs]);

  const monthlyRevenue = useMemo(() => {
    const months: {
      key: string;
      label: string;
      revenue: number;
    }[] = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - i,
        1
      );

      const key = getMonthKey(date);

      const revenueForMonth = payments
        .filter((payment) => {
          if (!isPaidPayment(payment)) return false;

          const paymentDate = new Date(
            payment.payment_date || payment.created_at
          );

          return getMonthKey(paymentDate) === key;
        })
        .reduce(
          (sum, payment) =>
            sum + Number(payment.amount || 0),
          0
        );

      months.push({
        key,
        label: getMonthLabel(date),
        revenue: revenueForMonth,
      });
    }

    return months;
  }, [payments, now]);

  const maxMonthlyRevenue = Math.max(
    ...monthlyRevenue.map((month) => month.revenue),
    1
  );

  const recentLeads = useMemo(() => {
    return leads.slice(0, 5);
  }, [leads]);

  const recentPayments = useMemo(() => {
    return payments
      .filter(isPaidPayment)
      .slice(0, 5);
  }, [payments]);

  const recentReviews = useMemo(() => {
    return reviews.slice(0, 4);
  }, [reviews]);

  const attentionCount = reviews.filter(
    (review) =>
      Number(review.rating) <= 3 ||
      review.status === "needs_attention"
  ).length;

  const pipelineCoverage = useMemo(() => {
    if (!revenue && !estimateValue) return 0;

    return Math.min(
      Math.round((estimateValue / Math.max(revenue, 1)) * 100),
      999
    );
  }, [estimateValue, revenue]);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">

        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Business Overview
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Dashboard
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Your business at a glance — revenue, pipeline,
                jobs, and customer activity.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/leads"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <Plus className="h-4 w-4" />
                New Lead
              </Link>

              <Link
                href="/estimates"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md"
              >
                <Plus className="h-4 w-4" />
                New Estimate
              </Link>
            </div>
          </div>
        </header>

        {/* KPI Cards */}
        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Total Revenue"
            value={formatCompactCurrency(revenue)}
            description={`${formatCurrency(
              currentMonthRevenue
            )} collected this month`}
            icon={<DollarSign className="h-5 w-5" />}
            href="/payments"
            trend={revenueChange}
            trendLabel="vs last month"
          />

          <KpiCard
            label="Total Leads"
            value={leads.length.toString()}
            description={`${currentMonthLeads} added this month`}
            icon={<Users className="h-5 w-5" />}
            href="/leads"
            trend={leadChange}
            trendLabel="vs last month"
          />

          <KpiCard
            label="Open Estimates"
            value={openEstimates.toString()}
            description={`${formatCompactCurrency(
              estimateValue
            )} currently in pipeline`}
            icon={<FileText className="h-5 w-5" />}
            href="/estimates"
          />

          <KpiCard
            label="Active Jobs"
            value={activeJobs.toString()}
            description={`${formatCompactCurrency(
              outstanding
            )} outstanding`}
            icon={
              <BriefcaseBusiness className="h-5 w-5" />
            }
            href="/jobs"
          />
        </section>

        {/* Revenue + Sales Snapshot */}
        <section className="grid gap-6 xl:grid-cols-3">

          {/* Revenue */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
            <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-slate-950">
                    Revenue
                  </h2>

                  <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    6 months
                  </span>
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Paid revenue collected over time.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div>
                  <p className="text-right text-xs font-medium text-slate-400">
                    This month
                  </p>

                  <p className="mt-0.5 text-right text-lg font-bold tracking-tight text-slate-950">
                    {formatCurrency(currentMonthRevenue)}
                  </p>
                </div>

                {revenueChange !== 0 && (
                  <div
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold ${
                      revenueChange > 0
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {revenueChange > 0 ? (
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5" />
                    )}
                    {Math.abs(revenueChange)}%
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 pb-6 pt-8 sm:px-6">
              <div className="flex h-64 items-end gap-2 sm:gap-4">
                {monthlyRevenue.map((month, index) => {
                  const height =
                    month.revenue === 0
                      ? 4
                      : Math.max(
                          8,
                          (month.revenue /
                            maxMonthlyRevenue) *
                            100
                        );

                  const isCurrentMonth =
                    index === monthlyRevenue.length - 1;

                  return (
                    <div
                      key={month.key}
                      className="flex min-w-0 flex-1 flex-col items-center justify-end gap-3"
                    >
                      <div className="relative flex h-full w-full items-end justify-center">
                        <div
                          className={`group relative w-full max-w-16 rounded-t-xl transition-all ${
                            isCurrentMonth
                              ? "bg-slate-950"
                              : "bg-slate-200 hover:bg-slate-300"
                          }`}
                          style={{
                            height: `${height}%`,
                          }}
                        >
                          <div className="pointer-events-none absolute -top-10 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white shadow-xl group-hover:block">
                            {formatCurrency(month.revenue)}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`text-xs font-medium ${
                          isCurrentMonth
                            ? "text-slate-900"
                            : "text-slate-400"
                        }`}
                      >
                        {month.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sales Snapshot */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-950">
                    Sales Snapshot
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Pipeline performance at a glance.
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <Target className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              <SnapshotRow
                label="Close Rate"
                value={`${closeRate}%`}
                icon={<Target className="h-4 w-4" />}
              />

              <SnapshotRow
                label="Average Job"
                value={formatCurrency(averageJobValue)}
                icon={<DollarSign className="h-4 w-4" />}
              />

              <SnapshotRow
                label="Won Estimate Value"
                value={formatCompactCurrency(
                  wonEstimateValue
                )}
                icon={<CheckCircle2 className="h-4 w-4" />}
              />

              <SnapshotRow
                label="Outstanding"
                value={formatCompactCurrency(outstanding)}
                icon={<WalletCards className="h-4 w-4" />}
              />

              <SnapshotRow
                label="Average Rating"
                value={
                  reviews.length
                    ? `${averageRating.toFixed(1)} / 5`
                    : "—"
                }
                icon={<Star className="h-4 w-4" />}
              />
            </div>

            <div className="border-t border-slate-100 px-6 py-4">
              <Link
                href="/reporting"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 transition hover:text-slate-950"
              >
                View full reporting
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Pipeline Health */}
        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-slate-950">
                  Pipeline Health
                </h2>

                <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  Active
                </span>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                {openEstimates} open estimates representing{" "}
                <span className="font-semibold text-slate-700">
                  {formatCompactCurrency(estimateValue)}
                </span>{" "}
                in potential work.
              </p>
            </div>

            <Link
              href="/estimates"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Open pipeline
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="border-t border-slate-100 px-6 py-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Pipeline coverage
              </span>

              <span className="text-xs font-bold text-slate-700">
                {pipelineCoverage}%
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-slate-900 transition-all"
                style={{
                  width: `${Math.min(pipelineCoverage, 100)}%`,
                }}
              />
            </div>
          </div>
        </section>

        {/* Activity Grid */}
        <section className="mt-6 grid gap-6 xl:grid-cols-3">

          {/* Leads */}
          <DashboardSection
            title="Recent Leads"
            subtitle="Your newest opportunities"
            href="/leads"
            viewLabel="View all"
          >
            {recentLeads.length === 0 ? (
              <EmptySmall
                icon={<Users className="h-5 w-5" />}
                text="No leads yet"
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {recentLeads.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/leads/${lead.id}`}
                    className="group flex items-center gap-3 px-6 py-4 transition hover:bg-slate-50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                      {getInitials(lead)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {getLeadName(lead)}
                      </p>

                      <div className="mt-1 flex items-center gap-2">
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                          {getStatusLabel(lead.status)}
                        </span>

                        <span className="text-[11px] text-slate-400">
                          {formatDate(lead.created_at)}
                        </span>
                      </div>
                    </div>

                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-600" />
                  </Link>
                ))}
              </div>
            )}
          </DashboardSection>

          {/* Payments */}
          <DashboardSection
            title="Recent Payments"
            subtitle="Latest collected revenue"
            href="/payments"
            viewLabel="View all"
          >
            {recentPayments.length === 0 ? (
              <EmptySmall
                icon={<DollarSign className="h-5 w-5" />}
                text="No payments yet"
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {recentPayments.map((payment) => (
                  <Link
                    key={payment.id}
                    href={`/payments/${payment.id}`}
                    className="group flex items-center gap-3 px-6 py-4 transition hover:bg-slate-50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <DollarSign className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">
                        {formatCurrency(
                          Number(payment.amount || 0)
                        )}
                      </p>

                      <p className="mt-1 text-[11px] text-slate-400">
                        {formatDate(
                          payment.payment_date ||
                            payment.created_at
                        )}
                      </p>
                    </div>

                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-600" />
                  </Link>
                ))}
              </div>
            )}
          </DashboardSection>

          {/* Reputation */}
          <DashboardSection
            title="Reputation"
            subtitle="Recent customer feedback"
            href="/reviews"
            viewLabel="View all"
          >
            <div className="px-6 py-5">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50">
                  <Star className="h-7 w-7 fill-amber-400 text-amber-400" />
                </div>

                <div>
                  <p className="text-2xl font-bold tracking-tight text-slate-950">
                    {reviews.length
                      ? averageRating.toFixed(1)
                      : "—"}
                  </p>

                  <p className="mt-0.5 text-xs text-slate-400">
                    {reviews.length
                      ? `${reviews.length} total reviews`
                      : "No reviews yet"}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    5-star rate
                  </span>

                  <span className="text-xs font-bold text-slate-900">
                    {fiveStarPercentage}%
                  </span>
                </div>

                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all"
                    style={{
                      width: `${fiveStarPercentage}%`,
                    }}
                  />
                </div>
              </div>

              {attentionCount > 0 && (
                <Link
                  href="/reviews"
                  className="mt-4 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 transition hover:bg-amber-100"
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-amber-600" />

                    <span className="text-xs font-semibold text-amber-800">
                      {attentionCount} review
                      {attentionCount === 1 ? "" : "s"} need
                      attention
                    </span>
                  </div>

                  <ArrowRight className="h-4 w-4 text-amber-600" />
                </Link>
              )}

              {recentReviews.length > 0 && (
                <div className="mt-5 space-y-3">
                  {recentReviews.slice(0, 3).map((review) => (
                    <div
                      key={review.id}
                      className="flex items-center gap-3"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                        {(review.reviewer_name || "R")
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-800">
                          {review.reviewer_name || "Customer"}
                        </p>

                        <div className="mt-0.5 flex items-center gap-2">
                          <StarRating
                            rating={Number(review.rating)}
                          />

                          <span className="text-[11px] text-slate-400">
                            {formatDate(review.review_date)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DashboardSection>
        </section>

        {/* Quick Actions */}
        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <Plus className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-semibold text-slate-950">
                  Quick Actions
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Jump directly into the work that matters.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-4">
            <QuickAction
              href="/leads"
              icon={<UserPlus className="h-5 w-5" />}
              title="Add Lead"
              description="Create a new opportunity"
            />

            <QuickAction
              href="/estimates"
              icon={<FileText className="h-5 w-5" />}
              title="Create Estimate"
              description="Build a new estimate"
            />

            <QuickAction
              href="/jobs"
              icon={<BriefcaseBusiness className="h-5 w-5" />}
              title="View Jobs"
              description="Manage active work"
            />

            <QuickAction
              href="/calendar"
              icon={<CalendarDays className="h-5 w-5" />}
              title="Open Calendar"
              description="See your schedule"
            />
          </div>
        </section>

        {/* Bottom Insight */}
        <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
              <TrendingUp className="h-5 w-5 text-slate-600" />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-900">
                Keep the pipeline moving
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Review open estimates and outstanding payments
                to keep cash flowing.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/estimates"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Estimates
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/payments"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Payments
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function KpiCard({
  label,
  value,
  description,
  icon,
  href,
  trend,
  trendLabel,
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  trend?: number;
  trendLabel?: string;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
            {label}
          </p>

          <p className="mt-2 truncate text-2xl font-bold tracking-tight text-slate-950 sm:text-[28px]">
            {value}
          </p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition group-hover:bg-slate-100">
          {icon}
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="text-xs leading-5 text-slate-400">
          {description}
        </p>

        {typeof trend === "number" && trend !== 0 ? (
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-bold ${
              trend > 0
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700"
            }`}
          >
            {trend > 0 ? "+" : ""}
            {trend}%
          </span>
        ) : (
          <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-slate-600" />
        )}
      </div>

      {trendLabel && typeof trend === "number" && (
        <p className="mt-1 text-[10px] text-slate-300">
          {trendLabel}
        </p>
      )}
    </Link>
  );
}

function DashboardSection({
  title,
  subtitle,
  href,
  viewLabel,
  children,
}: {
  title: string;
  subtitle: string;
  href: string;
  viewLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div>
          <h2 className="font-semibold text-slate-950">
            {title}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {subtitle}
          </p>
        </div>

        <Link
          href={href}
          className="text-sm font-semibold text-slate-500 transition hover:text-slate-950"
        >
          {viewLabel}
        </Link>
      </div>

      {children}
    </section>
  );
}

function SnapshotRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
          {icon}
        </div>

        <span className="text-sm font-medium text-slate-600">
          {label}
        </span>
      </div>

      <span className="text-sm font-bold text-slate-950">
        {value}
      </span>
    </div>
  );
}

function EmptySmall({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        {icon}
      </div>

      <p className="mt-3 text-sm font-medium text-slate-500">
        {text}
      </p>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 bg-white px-6 py-5 transition hover:bg-slate-50"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition group-hover:bg-slate-200">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">
          {title}
        </p>

        <p className="mt-0.5 text-xs text-slate-400">
          {description}
        </p>
      </div>

      <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-600" />
    </Link>
  );
}

function StarRating({
  rating,
}: {
  rating: number;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3 w-3 ${
            star <= rating
              ? "fill-amber-400 text-amber-400"
              : "text-slate-200"
          }`}
        />
      ))}
    </div>
  );
}