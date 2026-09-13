"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  FileText,
  Filter,
  Star,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

type Lead = {
  id: string;
  status: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
};

type Estimate = {
  id: string;
  lead_id: string | null;
  title: string | null;
  amount: number | string | null;
  status: string | null;
  estimate_date: string | null;
  expiration_date: string | null;
  created_at: string;
};

type Job = {
  id: string;
  lead_id: string | null;
  estimate_id: string | null;
  title: string | null;
  amount: number | string | null;
  status: string | null;
  created_at: string;
};

type Payment = {
  id: string;
  job_id: string | null;
  lead_id: string | null;
  amount: number | string | null;
  payment_date: string | null;
  payment_method: string | null;
  status: string | null;
  created_at: string;
};

type Review = {
  id: string;
  lead_id: string | null;
  job_id: string | null;
  rating: number | null;
  review_text: string | null;
  source: string | null;
  status: string | null;
  review_date: string | null;
  created_at: string;
};

type Props = {
  leads: Lead[];
  estimates: Estimate[];
  jobs: Job[];
  payments: Payment[];
  reviews: Review[];
};

type Period = "30" | "90" | "365" | "all";

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function number(value: number) {
  return new Intl.NumberFormat("en-US").format(value || 0);
}

function titleCase(value: string | null | undefined) {
  if (!value) return "Unknown";

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function amount(value: number | string | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isPaid(payment: Payment) {
  const status = (payment.status || "").toLowerCase();

  return [
    "paid",
    "completed",
    "complete",
    "successful",
    "success",
    "received",
  ].includes(status);
}

function isCompletedJob(job: Job) {
  const status = (job.status || "").toLowerCase();

  return [
    "completed",
    "complete",
    "closed",
    "won",
    "finished",
  ].includes(status);
}

function isCancelledJob(job: Job) {
  const status = (job.status || "").toLowerCase();

  return ["cancelled", "canceled", "lost"].includes(status);
}

function isAcceptedEstimate(estimate: Estimate) {
  const status = (estimate.status || "").toLowerCase();

  return [
    "accepted",
    "approved",
    "won",
    "converted",
  ].includes(status);
}

function isOpenEstimate(estimate: Estimate) {
  const status = (estimate.status || "").toLowerCase();

  return [
    "draft",
    "sent",
    "open",
    "pending",
    "awaiting",
  ].includes(status);
}

function dateValue(value: string | null) {
  if (!value) return 0;

  const timestamp = new Date(value).getTime();

  return Number.isFinite(timestamp) ? timestamp : 0;
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatFullDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ReportingClient({
  leads,
  estimates,
  jobs,
  payments,
  reviews,
}: Props) {
  const [period, setPeriod] = useState<Period>("30");

  const periodStart = useMemo(() => {
    if (period === "all") return 0;

    const days = Number(period);
    const date = new Date();

    date.setDate(date.getDate() - days);

    return date.getTime();
  }, [period]);

  const filteredLeads = useMemo(
    () =>
      leads.filter(
        (item) => dateValue(item.created_at) >= periodStart
      ),
    [leads, periodStart]
  );

  const filteredEstimates = useMemo(
    () =>
      estimates.filter(
        (item) =>
          dateValue(item.estimate_date || item.created_at) >=
          periodStart
      ),
    [estimates, periodStart]
  );

  const filteredJobs = useMemo(
    () =>
      jobs.filter(
        (item) => dateValue(item.created_at) >= periodStart
      ),
    [jobs, periodStart]
  );

  const filteredPayments = useMemo(
    () =>
      payments.filter(
        (item) =>
          dateValue(item.payment_date || item.created_at) >=
          periodStart
      ),
    [payments, periodStart]
  );

  const filteredReviews = useMemo(
    () =>
      reviews.filter(
        (item) =>
          dateValue(item.review_date || item.created_at) >=
          periodStart
      ),
    [reviews, periodStart]
  );

  const totalRevenue = filteredPayments
    .filter(isPaid)
    .reduce((sum, payment) => sum + amount(payment.amount), 0);

  const completedJobRevenue = filteredJobs
    .filter(isCompletedJob)
    .reduce((sum, job) => sum + amount(job.amount), 0);

  const pipelineValue = filteredEstimates
    .filter(isOpenEstimate)
    .reduce((sum, estimate) => sum + amount(estimate.amount), 0);

  const acceptedEstimateValue = filteredEstimates
    .filter(isAcceptedEstimate)
    .reduce((sum, estimate) => sum + amount(estimate.amount), 0);

  const totalEstimateValue = filteredEstimates.reduce(
    (sum, estimate) => sum + amount(estimate.amount),
    0
  );

  const completedJobs = filteredJobs.filter(isCompletedJob);

  const averageJobValue =
    completedJobs.length > 0
      ? completedJobs.reduce(
          (sum, job) => sum + amount(job.amount),
          0
        ) / completedJobs.length
      : 0;

  const acceptedEstimates = filteredEstimates.filter(
    isAcceptedEstimate
  );

  const estimateConversion =
    filteredEstimates.length > 0
      ? (acceptedEstimates.length / filteredEstimates.length) * 100
      : 0;

  const leadToJobConversion =
    filteredLeads.length > 0
      ? (filteredJobs.length / filteredLeads.length) * 100
      : 0;

  const paidPayments = filteredPayments.filter(isPaid);

  const outstandingPayments = filteredPayments
    .filter((payment) => !isPaid(payment))
    .reduce((sum, payment) => sum + amount(payment.amount), 0);

  const averageRating =
    filteredReviews.length > 0
      ? filteredReviews.reduce(
          (sum, review) => sum + Number(review.rating || 0),
          0
        ) / filteredReviews.length
      : 0;

  const attentionReviews = filteredReviews.filter((review) =>
    ["new", "needs_attention"].includes(
      (review.status || "").toLowerCase()
    )
  ).length;

  const sourceBreakdown = useMemo(() => {
    const map = new Map<string, number>();

    filteredLeads.forEach((lead) => {
      const source = lead.source?.trim() || "Unknown";

      map.set(source, (map.get(source) || 0) + 1);
    });

    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [filteredLeads]);

  const leadStatusBreakdown = useMemo(() => {
    const map = new Map<string, number>();

    filteredLeads.forEach((lead) => {
      const status = lead.status?.trim() || "Unknown";

      map.set(status, (map.get(status) || 0) + 1);
    });

    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [filteredLeads]);

  const monthlyRevenue = useMemo(() => {
    const buckets = new Map<
      string,
      {
        label: string;
        value: number;
        date: Date;
      }
    >();

    const months =
      period === "30"
        ? 6
        : period === "90"
        ? 6
        : 12;

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();

      date.setDate(1);
      date.setMonth(date.getMonth() - i);

      const key = `${date.getFullYear()}-${date.getMonth()}`;

      buckets.set(key, {
        label: date.toLocaleDateString(undefined, {
          month: "short",
        }),
        value: 0,
        date,
      });
    }

    filteredPayments
      .filter(isPaid)
      .forEach((payment) => {
        const sourceDate = new Date(
          payment.payment_date || payment.created_at
        );

        const key = `${sourceDate.getFullYear()}-${sourceDate.getMonth()}`;

        const bucket = buckets.get(key);

        if (bucket) {
          bucket.value += amount(payment.amount);
        }
      });

    return [...buckets.values()];
  }, [filteredPayments, period]);

  const maxRevenue = Math.max(
    ...monthlyRevenue.map((item) => item.value),
    1
  );

  const recentPayments = [...filteredPayments]
    .sort(
      (a, b) =>
        dateValue(b.payment_date || b.created_at) -
        dateValue(a.payment_date || a.created_at)
    )
    .slice(0, 5);

  const recentReviews = [...filteredReviews]
    .sort(
      (a, b) =>
        dateValue(b.review_date || b.created_at) -
        dateValue(a.review_date || a.created_at)
    )
    .slice(0, 4);

  const cancelledJobs = filteredJobs.filter(isCancelledJob).length;

  const collectionRate =
    filteredPayments.length > 0
      ? (paidPayments.length / filteredPayments.length) * 100
      : 0;

  const openEstimateCount = filteredEstimates.filter(
    isOpenEstimate
  ).length;

  const averageEstimateValue =
    filteredEstimates.length > 0
      ? totalEstimateValue / filteredEstimates.length
      : 0;

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-slate-900">
      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        {/* HEADER */}
        <div className="mb-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-violet-600">
                <BarChart3 size={15} />
                Business Intelligence
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Reporting
              </h1>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                Understand how your business is performing across
                leads, estimates, jobs, payments, and customer
                experience.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500 shadow-sm sm:flex">
                <CalendarDays size={14} />
                {period === "all"
                  ? "All time"
                  : period === "365"
                  ? "Last 12 months"
                  : `Last ${period} days`}
              </div>

              <div className="relative">
                <Filter
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <select
                  value={period}
                  onChange={(event) =>
                    setPeriod(event.target.value as Period)
                  }
                  className="h-10 appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-10 text-sm font-semibold text-slate-700 shadow-sm outline-none transition hover:border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                >
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="365">Last 12 months</option>
                  <option value="all">All time</option>
                </select>

                <ChevronDown
                  size={15}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* EXECUTIVE SUMMARY */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={<CircleDollarSign size={19} />}
            label="Revenue Collected"
            value={money(totalRevenue)}
            helper={`${number(
              paidPayments.length
            )} successful payments`}
            accent="emerald"
          />

          <MetricCard
            icon={<Users size={19} />}
            label="New Leads"
            value={number(filteredLeads.length)}
            helper={`${leadToJobConversion.toFixed(
              1
            )}% lead → job`}
            accent="violet"
          />

          <MetricCard
            icon={<BriefcaseBusiness size={19} />}
            label="Completed Jobs"
            value={number(completedJobs.length)}
            helper={`${money(
              averageJobValue
            )} average job value`}
            accent="blue"
          />

          <MetricCard
            icon={<Target size={19} />}
            label="Estimate Conversion"
            value={`${estimateConversion.toFixed(1)}%`}
            helper={`${number(
              acceptedEstimates.length
            )} accepted estimates`}
            accent="amber"
          />
        </div>

        {/* REVENUE + PIPELINE */}
        <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-[1.65fr_1fr]">
          <Panel>
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-950">
                    Revenue performance
                  </h2>

                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                    Collected
                  </span>
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  Successfully collected payments over time
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <TrendingUp size={18} />
              </div>
            </div>

            <div className="mb-5 flex items-end gap-3">
              <p className="text-3xl font-bold tracking-tight text-slate-950">
                {money(totalRevenue)}
              </p>

              <p className="mb-1 text-xs font-medium text-slate-400">
                collected
              </p>
            </div>

            <div className="relative h-64">
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
                {[100, 75, 50, 25, 0].map((line) => (
                  <div
                    key={line}
                    className="border-t border-dashed border-slate-100"
                  />
                ))}
              </div>

              <div className="relative flex h-full items-end gap-2 pt-3 sm:gap-4">
                {monthlyRevenue.map((item) => {
                  const height =
                    item.value > 0
                      ? Math.max(
                          (item.value / maxRevenue) * 100,
                          7
                        )
                      : 3;

                  return (
                    <div
                      key={`${item.date.getFullYear()}-${item.date.getMonth()}`}
                      className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                    >
                      <div className="flex w-full flex-1 items-end">
                        <div
                          className="group relative w-full rounded-t-xl bg-slate-900 transition-all duration-300 hover:bg-slate-700"
                          style={{
                            height: `${height}%`,
                          }}
                          title={`${item.label}: ${money(
                            item.value
                          )}`}
                        >
                          <div className="pointer-events-none absolute -top-9 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-950 px-2 py-1 text-[10px] font-semibold text-white shadow-lg group-hover:block">
                            {money(item.value)}
                          </div>
                        </div>
                      </div>

                      <span className="text-[10px] font-medium text-slate-400">
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5">
              <SummaryStat
                label="Collected"
                value={money(totalRevenue)}
                icon={<Wallet size={14} />}
              />

              <SummaryStat
                label="Completed job value"
                value={money(completedJobRevenue)}
                icon={<BriefcaseBusiness size={14} />}
              />
            </div>
          </Panel>

          <Panel>
            <div className="mb-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-950">
                    Pipeline
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Revenue currently in motion
                  </p>
                </div>

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <Target size={18} />
                </div>
              </div>
            </div>

            <div className="mb-5 rounded-2xl bg-slate-950 p-5 text-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Open estimate value
              </p>

              <p className="mt-2 text-3xl font-bold tracking-tight">
                {money(pipelineValue)}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                {number(openEstimateCount)} open estimates
              </p>
            </div>

            <div className="space-y-3">
              <PipelineRow
                icon={<FileText size={17} />}
                label="Open estimates"
                value={money(pipelineValue)}
                detail={`${number(
                  openEstimateCount
                )} opportunities`}
              />

              <PipelineRow
                icon={<CheckCircle2 size={17} />}
                label="Accepted estimates"
                value={money(acceptedEstimateValue)}
                detail={`${number(
                  acceptedEstimates.length
                )} accepted`}
              />

              <PipelineRow
                icon={<Wallet size={17} />}
                label="Outstanding payments"
                value={money(outstandingPayments)}
                detail={`${number(
                  filteredPayments.filter(
                    (payment) => !isPaid(payment)
                  ).length
                )} unpaid`}
              />

              <PipelineRow
                icon={<BarChart3 size={17} />}
                label="Avg. estimate"
                value={money(averageEstimateValue)}
                detail={`${number(
                  filteredEstimates.length
                )} total estimates`}
              />
            </div>
          </Panel>
        </div>

        {/* KPI STRIP */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={<FileText size={17} />}
            label="Estimate value"
            value={money(totalEstimateValue)}
            detail={`${number(
              filteredEstimates.length
            )} estimates created`}
          />

          <KpiCard
            icon={<Wallet size={17} />}
            label="Collection rate"
            value={`${collectionRate.toFixed(1)}%`}
            detail={`${number(
              paidPayments.length
            )} of ${number(
              filteredPayments.length
            )} payments paid`}
          />

          <KpiCard
            icon={<BriefcaseBusiness size={17} />}
            label="Average job"
            value={money(averageJobValue)}
            detail={`${number(
              completedJobs.length
            )} completed jobs`}
          />

          <KpiCard
            icon={<Star size={17} />}
            label="Customer rating"
            value={
              filteredReviews.length > 0
                ? `${averageRating.toFixed(1)} / 5`
                : "—"
            }
            detail={`${number(
              filteredReviews.length
            )} reviews recorded`}
          />
        </div>

        {/* FUNNEL / PERFORMANCE */}
        <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <PerformanceCard
            icon={<Users size={18} />}
            title="Lead volume"
            value={number(filteredLeads.length)}
            description="New leads during selected period"
            trend={
              filteredLeads.length > 0
                ? "up"
                : "neutral"
            }
          />

          <PerformanceCard
            icon={<FileText size={18} />}
            title="Estimates sent"
            value={number(filteredEstimates.length)}
            description={`${money(
              totalEstimateValue
            )} total estimate value`}
            trend={
              filteredEstimates.length > 0
                ? "up"
                : "neutral"
            }
          />

          <PerformanceCard
            icon={<BriefcaseBusiness size={18} />}
            title="Lead → job"
            value={`${leadToJobConversion.toFixed(
              1
            )}%`}
            description={`${number(
              filteredJobs.length
            )} jobs from ${number(
              filteredLeads.length
            )} leads`}
            trend={
              leadToJobConversion >= 20
                ? "up"
                : leadToJobConversion > 0
                ? "down"
                : "neutral"
            }
          />
        </div>

        {/* SOURCES + STATUS */}
        <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Panel>
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-950">
                  Lead sources
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Where your opportunities are coming from
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <Users size={17} />
              </div>
            </div>

            {sourceBreakdown.length === 0 ? (
              <EmptyState text="No lead source data available for this period." />
            ) : (
              <div className="space-y-4">
                {sourceBreakdown.map(
                  ([source, count], index) => {
                    const percentage =
                      filteredLeads.length > 0
                        ? (count /
                            filteredLeads.length) *
                          100
                        : 0;

                    return (
                      <div key={source}>
                        <div className="mb-1.5 flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-500">
                              {index + 1}
                            </span>

                            <span className="truncate text-sm font-semibold text-slate-700">
                              {titleCase(source)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-medium text-slate-400">
                              {percentage.toFixed(0)}%
                            </span>

                            <span className="text-xs font-bold text-slate-700">
                              {count}
                            </span>
                          </div>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-slate-900 transition-all duration-500"
                            style={{
                              width: `${percentage}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </Panel>

          <Panel>
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-950">
                  Lead status
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Current status distribution
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <BarChart3 size={17} />
              </div>
            </div>

            {leadStatusBreakdown.length === 0 ? (
              <EmptyState text="No lead status data available for this period." />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {leadStatusBreakdown.map(
                  ([status, count]) => (
                    <div
                      key={status}
                      className="rounded-xl border border-slate-100 bg-slate-50 p-4 transition hover:border-slate-200 hover:bg-white"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-semibold text-slate-500">
                          {titleCase(status)}
                        </p>

                        <span className="h-2 w-2 rounded-full bg-slate-900" />
                      </div>

                      <p className="mt-2 text-xl font-bold text-slate-950">
                        {count}
                      </p>

                      <p className="mt-1 text-[10px] font-medium text-slate-400">
                        {filteredLeads.length > 0
                          ? `${(
                              (count /
                                filteredLeads.length) *
                              100
                            ).toFixed(0)}% of leads`
                          : "0% of leads"}
                      </p>
                    </div>
                  )
                )}
              </div>
            )}
          </Panel>
        </div>

        {/* CUSTOMER EXPERIENCE */}
        <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.5fr]">
          <Panel>
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-950">
                  Customer experience
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Review performance during this period
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
                <Star size={17} />
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <div className="flex items-end gap-3">
                <span className="text-4xl font-bold tracking-tight text-slate-950">
                  {filteredReviews.length > 0
                    ? averageRating.toFixed(1)
                    : "—"}
                </span>

                {filteredReviews.length > 0 && (
                  <div className="mb-1 flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(
                      (star) => (
                        <Star
                          key={star}
                          size={17}
                          className={
                            star <=
                            Math.round(
                              averageRating
                            )
                              ? "fill-current text-amber-400"
                              : "text-slate-300"
                          }
                        />
                      )
                    )}
                  </div>
                )}
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Based on{" "}
                {number(filteredReviews.length)}{" "}
                reviews
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <MiniMetric
                label="Reviews"
                value={number(
                  filteredReviews.length
                )}
                icon={<Star size={15} />}
              />

              <MiniMetric
                label="Needs attention"
                value={number(attentionReviews)}
                icon={<Clock3 size={15} />}
              />
            </div>
          </Panel>

          <Panel>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-950">
                  Recent reviews
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Latest customer feedback
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
                <Star size={17} />
              </div>
            </div>

            {recentReviews.length === 0 ? (
              <EmptyState text="No reviews recorded during this period." />
            ) : (
              <div className="space-y-3">
                {recentReviews.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-4 transition hover:border-slate-200 hover:bg-white"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(
                          (star) => (
                            <Star
                              key={star}
                              size={13}
                              className={
                                star <=
                                Number(
                                  review.rating || 0
                                )
                                  ? "fill-current text-amber-400"
                                  : "text-slate-300"
                              }
                            />
                          )
                        )}
                      </div>

                      <span className="shrink-0 text-[10px] font-medium text-slate-400">
                        {formatFullDate(
                          review.review_date ||
                            review.created_at
                        )}
                      </span>
                    </div>

                    <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-600">
                      {review.review_text ||
                        "No written review provided."}
                    </p>

                    <div className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      {titleCase(review.source)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* PAYMENTS */}
        <Panel>
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-950">
                Recent payments
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Latest payment activity
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <Wallet size={17} />
            </div>
          </div>

          {recentPayments.length === 0 ? (
            <EmptyState text="No payments recorded during this period." />
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-xl border border-slate-100 sm:block">
                <table className="w-full text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Date
                      </th>

                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Method
                      </th>

                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Status
                      </th>

                      <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Amount
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {recentPayments.map((payment) => (
                      <tr
                        key={payment.id}
                        className="transition hover:bg-slate-50/70"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-slate-700">
                          {formatShortDate(
                            payment.payment_date ||
                              payment.created_at
                          )}
                        </td>

                        <td className="px-4 py-3 text-sm text-slate-500">
                          {titleCase(
                            payment.payment_method
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full border px-2 py-1 text-[10px] font-bold ${
                              isPaid(payment)
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-amber-200 bg-amber-50 text-amber-700"
                            }`}
                          >
                            {isPaid(payment)
                              ? "Paid"
                              : titleCase(
                                  payment.status
                                )}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right text-sm font-bold text-slate-950">
                          {money(
                            amount(payment.amount)
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-2 sm:hidden">
                {recentPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {titleCase(
                          payment.payment_method
                        )}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {formatShortDate(
                          payment.payment_date ||
                            payment.created_at
                        )}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-slate-950">
                        {money(
                          amount(payment.amount)
                        )}
                      </p>

                      <p
                        className={`mt-1 text-[10px] font-semibold ${
                          isPaid(payment)
                            ? "text-emerald-600"
                            : "text-amber-600"
                        }`}
                      >
                        {isPaid(payment)
                          ? "Paid"
                          : titleCase(
                              payment.status
                            )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Panel>

        {/* FOOTER */}
        <div className="mt-5 flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs leading-5 text-slate-500 shadow-sm">
          <CalendarDays
            size={14}
            className="mt-0.5 shrink-0"
          />

          <span>
            Reporting is calculated from your Trackpr
            operational data and updates automatically as
            leads, estimates, jobs, payments, and reviews
            change.
          </span>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  helper,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper: string;
  accent:
    | "emerald"
    | "violet"
    | "blue"
    | "amber";
}) {
  const accentStyles = {
    emerald:
      "bg-emerald-50 text-emerald-600",
    violet:
      "bg-violet-50 text-violet-600",
    blue:
      "bg-blue-50 text-blue-600",
    amber:
      "bg-amber-50 text-amber-600",
  };

  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <div
        className={`mb-4 flex h-9 w-9 items-center justify-center rounded-xl ${accentStyles[accent]}`}
      >
        {icon}
      </div>

      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-2xl font-bold tracking-tight text-slate-950">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {helper}
      </p>
    </div>
  );
}

function Panel({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      {children}
    </section>
  );
}

function SummaryStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}

        <span className="text-[10px] font-semibold uppercase tracking-wide">
          {label}
        </span>
      </div>

      <p className="mt-1.5 text-sm font-bold text-slate-950">
        {value}
      </p>
    </div>
  );
}

function PipelineRow({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3.5 transition hover:border-slate-200 hover:bg-white">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-700">
          {label}
        </p>

        <p className="mt-0.5 text-[10px] text-slate-400">
          {detail}
        </p>
      </div>

      <p className="shrink-0 text-sm font-bold text-slate-950">
        {value}
      </p>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          {icon}
        </div>

        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
          {label}
        </p>
      </div>

      <p className="mt-4 text-xl font-bold tracking-tight text-slate-950">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {detail}
      </p>
    </div>
  );
}

function PerformanceCard({
  icon,
  title,
  value,
  description,
  trend,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
  trend: "up" | "down" | "neutral";
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          {icon}
        </div>

        {trend === "up" && (
          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-600">
            <ArrowUpRight size={13} />
            Positive
          </span>
        )}

        {trend === "down" && (
          <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-600">
            <ArrowDownRight size={13} />
            Watch
          </span>
        )}

        {trend === "neutral" && (
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-400">
            No data
          </span>
        )}
      </div>

      <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
        {title}
      </p>

      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {description}
      </p>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}

        <span className="text-[10px] font-semibold uppercase tracking-wide">
          {label}
        </span>
      </div>

      <p className="mt-2 text-lg font-bold text-slate-950">
        {value}
      </p>
    </div>
  );
}

function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
      <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-300 shadow-sm">
        <BarChart3 size={15} />
      </div>

      <p className="text-xs text-slate-400">
        {text}
      </p>
    </div>
  );
}