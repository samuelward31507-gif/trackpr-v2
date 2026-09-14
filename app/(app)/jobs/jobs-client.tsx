"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  DollarSign,
  FileText,
  Plus,
  Search,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type JobStatus =
  | "scheduled"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "cancelled";

type PaymentStatus =
  | "unpaid"
  | "partial"
  | "paid";

type Lead = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
};

type Estimate = {
  id: string;
  title: string;
  amount: number | string | null;
  status: string;
  lead_id: string | null;
};

type Job = {
  id: string;
  organization_id: string;
  lead_id: string | null;
  estimate_id: string | null;
  title: string;
  amount: number | string | null;
  status: JobStatus | string;
  payment_status: PaymentStatus | string;
  start_date: string | null;
  due_date: string | null;
  completed_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  leads?: Lead | null;
};

type Props = {
  jobs: Job[];
  leads: Lead[];
  estimates: Estimate[];
};

const statusFilters = [
  { label: "All Jobs", value: "all" },
  { label: "Scheduled", value: "scheduled" },
  { label: "In Progress", value: "in_progress" },
  { label: "On Hold", value: "on_hold" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const statusOptions: JobStatus[] = [
  "scheduled",
  "in_progress",
  "on_hold",
  "completed",
  "cancelled",
];

const paymentOptions: PaymentStatus[] = [
  "unpaid",
  "partial",
  "paid",
];

function formatCurrency(
  value: number | string | null
) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function formatShortDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getLeadName(
  lead: Lead | null | undefined
) {
  if (!lead) return "No customer";

  const name =
    `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim();

  return name || "Unnamed customer";
}

function getStatusLabel(status: string) {
  return status
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
}

function getStatusClasses(status: string) {
  switch (status) {
    case "completed":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200";

    case "in_progress":
      return "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200";

    case "scheduled":
      return "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200";

    case "on_hold":
      return "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200";

    case "cancelled":
      return "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200";

    default:
      return "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200";
  }
}

function getPaymentClasses(status: string) {
  switch (status) {
    case "paid":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200";

    case "partial":
      return "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200";

    case "unpaid":
      return "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200";

    default:
      return "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200";
  }
}

function getInitials(
  lead: Lead | null | undefined
) {
  if (!lead) return "—";

  const first =
    lead.first_name?.charAt(0) ?? "";

  const last =
    lead.last_name?.charAt(0) ?? "";

  const initials =
    `${first}${last}`.toUpperCase();

  return initials || "—";
}

export default function JobsClient({
  jobs: initialJobs,
  leads,
  estimates,
}: Props) {
  const supabase = createClient();

  const [jobs, setJobs] =
    useState<Job[]>(initialJobs);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("all");

  const [isCreateOpen, setIsCreateOpen] =
    useState(false);

  const [creating, setCreating] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [leadId, setLeadId] =
    useState("");

  const [estimateId, setEstimateId] =
    useState("");

  const [amount, setAmount] =
    useState("");

  const [status, setStatus] =
    useState<JobStatus>("scheduled");

  const [paymentStatus, setPaymentStatus] =
    useState<PaymentStatus>("unpaid");

  const [startDate, setStartDate] =
    useState("");

  const [dueDate, setDueDate] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const filteredJobs = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return jobs.filter((job) => {
      const customerName =
        getLeadName(job.leads).toLowerCase();

      const matchesSearch =
        !query ||
        job.title
          .toLowerCase()
          .includes(query) ||
        customerName.includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        job.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [jobs, search, statusFilter]);

  const stats = useMemo(() => {
    const activeJobs = jobs.filter(
      (job) =>
        job.status === "scheduled" ||
        job.status === "in_progress"
    );

    const completedJobs = jobs.filter(
      (job) =>
        job.status === "completed"
    );

    const unpaidJobs = jobs.filter(
      (job) =>
        job.payment_status === "unpaid"
    );

    const partialJobs = jobs.filter(
      (job) =>
        job.payment_status === "partial"
    );

    const totalValue = jobs.reduce(
      (sum, job) =>
        sum + Number(job.amount ?? 0),
      0
    );

    const activeValue =
      activeJobs.reduce(
        (sum, job) =>
          sum + Number(job.amount ?? 0),
        0
      );

    const completedValue =
      completedJobs.reduce(
        (sum, job) =>
          sum + Number(job.amount ?? 0),
        0
      );

    const outstandingValue =
      [...unpaidJobs, ...partialJobs].reduce(
        (sum, job) =>
          sum + Number(job.amount ?? 0),
        0
      );

    return {
      total: jobs.length,
      active: activeJobs.length,
      completed: completedJobs.length,
      totalValue,
      activeValue,
      completedValue,
      outstandingValue,
    };
  }, [jobs]);

  function resetForm() {
    setTitle("");
    setLeadId("");
    setEstimateId("");
    setAmount("");
    setStatus("scheduled");
    setPaymentStatus("unpaid");
    setStartDate("");
    setDueDate("");
    setNotes("");
    setError(null);
  }

  function closeCreate() {
    if (creating) return;

    setIsCreateOpen(false);
    resetForm();
  }

  function handleEstimateChange(
    value: string
  ) {
    setEstimateId(value);

    if (!value) return;

    const estimate = estimates.find(
      (item) => item.id === value
    );

    if (!estimate) return;

    if (!title.trim()) {
      setTitle(estimate.title);
    }

    setAmount(
      estimate.amount != null
        ? String(estimate.amount)
        : ""
    );

    if (estimate.lead_id) {
      setLeadId(estimate.lead_id);
    }
  }

  function handleStartDateChange(
    value: string
  ) {
    setStartDate(value);

    if (
      dueDate &&
      value &&
      dueDate < value
    ) {
      setDueDate("");
    }

    setError(null);
  }

  async function createJob() {
    setError(null);

    if (!title.trim()) {
      setError(
        "Please enter a job title."
      );
      return;
    }

    if (!leadId) {
      setError(
        "Please select a customer."
      );
      return;
    }

    if (
      startDate &&
      dueDate &&
      dueDate < startDate
    ) {
      setError(
        "Due date cannot be before the start date."
      );
      return;
    }

    const numericAmount =
      Number(amount);

    if (
      amount.trim() &&
      (Number.isNaN(numericAmount) ||
        numericAmount < 0)
    ) {
      setError(
        "Please enter a valid job value."
      );
      return;
    }

    setCreating(true);

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      setError(
        "You must be signed in."
      );
      setCreating(false);
      return;
    }

    const {
      data: membership,
      error: membershipError,
    } =
      await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

    if (membershipError) {
      console.error(
        membershipError
      );

      setError(
        "Unable to load your organization."
      );

      setCreating(false);
      return;
    }

    if (
      !membership?.organization_id
    ) {
      setError(
        "No organization membership was found."
      );

      setCreating(false);
      return;
    }

    const {
      data,
      error: createError,
    } = await supabase.rpc(
      "create_job",
      {
        p_organization_id:
          membership.organization_id,

        p_title: title.trim(),

        p_lead_id: leadId,

        p_estimate_id:
          estimateId || null,

        p_amount:
          Number(amount) || 0,

        p_status: status,

        p_payment_status:
          paymentStatus,

        p_start_date:
          startDate || null,

        p_due_date:
          dueDate || null,

        p_completed_date:
          status === "completed"
            ? dueDate ||
              startDate ||
              null
            : null,

        p_notes:
          notes.trim() || null,
      }
    );

    if (createError) {
      console.error(createError);

      setError(
        createError.message ||
          "Unable to create the job."
      );

      setCreating(false);
      return;
    }

    const selectedLead =
      leads.find(
        (lead) =>
          lead.id === leadId
      ) ?? null;

    const newJob: Job = {
      ...(data as Job),
      leads: selectedLead,
    };

    setJobs((current) => [
      newJob,
      ...current,
    ]);

    setCreating(false);
    setIsCreateOpen(false);
    resetForm();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-sm">
              <BriefcaseBusiness className="h-3.5 w-3.5" />
              Operations
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Jobs
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              Manage active projects, completed work,
              job value, scheduling, and payment status
              from one place.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              resetForm();
              setIsCreateOpen(true);
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.99] sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            New Job
          </button>
        </div>

        {/* KPI Cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Total Jobs
                </p>

                <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                  {stats.total}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 transition group-hover:bg-slate-200">
                <BriefcaseBusiness className="h-5 w-5 text-slate-700" />
              </div>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="text-xs text-slate-400">
                Across all job statuses
              </p>
            </div>
          </div>

          <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Active Jobs
                </p>

                <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                  {stats.active}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
                <Clock3 className="h-5 w-5 text-blue-600" />
              </div>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="text-xs text-slate-400">
                {formatCurrency(
                  stats.activeValue
                )}{" "}
                currently active
              </p>
            </div>
          </div>

          <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Completed
                </p>

                <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                  {stats.completed}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="text-xs text-slate-400">
                {formatCurrency(
                  stats.completedValue
                )}{" "}
                completed value
              </p>
            </div>
          </div>

          <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Total Job Value
                </p>

                <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  {formatCurrency(
                    stats.totalValue
                  )}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50">
                <DollarSign className="h-5 w-5 text-violet-600" />
              </div>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="text-xs text-slate-400">
                {formatCurrency(
                  stats.outstandingValue
                )}{" "}
                unpaid / partial
              </p>
            </div>
          </div>
        </div>

        {/* Main Jobs Workspace */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Toolbar */}
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="relative w-full xl:max-w-md">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(
                      e.target.value
                    )
                  }
                  placeholder="Search jobs or customers..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                />
              </div>

              <div className="flex min-w-0 gap-2 overflow-x-auto pb-1">
                {statusFilters.map(
                  (filter) => (
                    <button
                      type="button"
                      key={
                        filter.value
                      }
                      onClick={() =>
                        setStatusFilter(
                          filter.value
                        )
                      }
                      className={`whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                        statusFilter ===
                        filter.value
                          ? "bg-slate-950 text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {filter.label}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-400">
              <p>
                Showing{" "}
                <span className="font-semibold text-slate-600">
                  {filteredJobs.length}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-600">
                  {jobs.length}
                </span>{" "}
                jobs
              </p>

              {(search ||
                statusFilter !==
                  "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter(
                      "all"
                    );
                  }}
                  className="font-semibold text-slate-600 transition hover:text-slate-950"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* Empty State */}
          {filteredJobs.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                <BriefcaseBusiness className="h-7 w-7 text-slate-500" />
              </div>

              <h3 className="mt-5 text-lg font-semibold text-slate-950">
                {jobs.length === 0
                  ? "No jobs yet"
                  : "No jobs found"}
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {jobs.length === 0
                  ? "Create your first job to start tracking active work, job value, scheduling, and payments."
                  : "Try adjusting your search or status filter to find what you're looking for."}
              </p>

              {jobs.length === 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setIsCreateOpen(
                      true
                    );
                  }}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4" />
                  Create First Job
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter(
                      "all"
                    );
                  }}
                  className="mt-6 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Header */}
              <div className="hidden border-b border-slate-200 bg-slate-50/80 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400 lg:grid lg:grid-cols-[minmax(240px,1.5fr)_minmax(170px,1fr)_120px_130px_130px_36px] lg:gap-4">
                <div>Job</div>
                <div>Customer</div>
                <div>Amount</div>
                <div>Status</div>
                <div>Payment</div>
                <div />
              </div>

              {/* Job Rows */}
              <div className="divide-y divide-slate-100">
                {filteredJobs.map(
                  (job) => (
                    <Link
                      key={job.id}
                      href={`/jobs/${job.id}`}
                      className="group block px-5 py-5 transition hover:bg-slate-50/80 lg:px-6"
                    >
                      {/* Desktop */}
                      <div className="hidden items-center lg:grid lg:grid-cols-[minmax(240px,1.5fr)_minmax(170px,1fr)_120px_130px_130px_36px] lg:gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600 transition group-hover:bg-slate-200">
                            <BriefcaseBusiness className="h-4 w-4" />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-950 group-hover:text-slate-700">
                              {job.title}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {job.start_date
                                ? `Starts ${formatShortDate(
                                    job.start_date
                                  )}`
                                : "No start date"}
                            </p>
                          </div>
                        </div>

                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                            {getInitials(
                              job.leads
                            )}
                          </div>

                          <p className="truncate text-sm font-medium text-slate-700">
                            {getLeadName(
                              job.leads
                            )}
                          </p>
                        </div>

                        <div className="text-sm font-bold text-slate-950">
                          {formatCurrency(
                            job.amount
                          )}
                        </div>

                        <div>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                              job.status
                            )}`}
                          >
                            {getStatusLabel(
                              job.status
                            )}
                          </span>
                        </div>

                        <div>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getPaymentClasses(
                              job.payment_status
                            )}`}
                          >
                            {getStatusLabel(
                              job.payment_status
                            )}
                          </span>
                        </div>

                        <div className="flex justify-end text-slate-300 transition group-hover:text-slate-500">
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      </div>

                      {/* Mobile */}
                      <div className="lg:hidden">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                              <BriefcaseBusiness className="h-4 w-4 text-slate-600" />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-950">
                                {job.title}
                              </p>

                              <p className="mt-1 text-sm text-slate-500">
                                {getLeadName(
                                  job.leads
                                )}
                              </p>
                            </div>
                          </div>

                          <p className="shrink-0 text-right text-sm font-bold text-slate-950">
                            {formatCurrency(
                              job.amount
                            )}
                          </p>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                              job.status
                            )}`}
                          >
                            {getStatusLabel(
                              job.status
                            )}
                          </span>

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getPaymentClasses(
                              job.payment_status
                            )}`}
                          >
                            {getStatusLabel(
                              job.payment_status
                            )}
                          </span>

                          {job.start_date && (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                              <CalendarDays className="h-3.5 w-3.5" />
                              {formatShortDate(
                                job.start_date
                              )}
                            </span>
                          )}
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400">
                          <span>
                            {job.due_date
                              ? `Due ${formatShortDate(
                                  job.due_date
                                )}`
                              : "No due date"}
                          </span>

                          <span className="inline-flex items-center gap-1 font-semibold text-slate-500">
                            View job
                            <ArrowRight className="h-3.5 w-3.5" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  )
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create Job Modal */}
      {isCreateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeCreate();
            }
          }}
        >
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-5 sm:px-6">
              <div className="min-w-0">
                <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <BriefcaseBusiness className="h-3.5 w-3.5" />
                  Operations
                </div>

                <h2 className="text-lg font-bold text-slate-950">
                  Create New Job
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Add a project to your job pipeline.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCreate}
                disabled={creating}
                className="ml-4 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-6 p-5 sm:p-6">
                {/* Estimate Section */}
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-500" />

                    <h3 className="text-sm font-semibold text-slate-900">
                      Start from an estimate
                    </h3>
                  </div>

                  <div className="relative">
                    <select
                      value={
                        estimateId
                      }
                      onChange={(e) =>
                        handleEstimateChange(
                          e.target
                            .value
                        )
                      }
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                    >
                      <option value="">
                        No estimate linked
                      </option>

                      {estimates.map(
                        (estimate) => (
                          <option
                            key={
                              estimate.id
                            }
                            value={
                              estimate.id
                            }
                          >
                            {
                              estimate.title
                            }{" "}
                            —{" "}
                            {formatCurrency(
                              estimate.amount
                            )}
                          </option>
                        )
                      )}
                    </select>

                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>

                  <p className="mt-2 text-xs text-slate-400">
                    Selecting an estimate can automatically fill the title, customer, and value.
                  </p>
                </div>

                <div className="h-px bg-slate-100" />

                {/* Basic Details */}
                <div>
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Job details
                    </h3>

                    <p className="mt-1 text-xs text-slate-400">
                      Define the project and customer.
                    </p>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Job Title
                      </label>

                      <input
                        value={title}
                        onChange={(e) =>
                          setTitle(
                            e.target
                              .value
                          )
                        }
                        placeholder="Kitchen Remodel"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Customer
                      </label>

                      <div className="relative">
                        <select
                          value={
                            leadId
                          }
                          onChange={(e) =>
                            setLeadId(
                              e.target
                                .value
                            )
                          }
                          className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        >
                          <option value="">
                            Select customer
                          </option>

                          {leads.map(
                            (lead) => (
                              <option
                                key={
                                  lead.id
                                }
                                value={
                                  lead.id
                                }
                              >
                                {getLeadName(
                                  lead
                                )}
                              </option>
                            )
                          )}
                        </select>

                        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Financial / Status */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Financial & status
                    </h3>

                    <p className="mt-1 text-xs text-slate-400">
                      Set the job value, progress, and payment state.
                    </p>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Job Value
                      </label>

                      <div className="relative">
                        <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            amount
                          }
                          onChange={(e) =>
                            setAmount(
                              e.target
                                .value
                            )
                          }
                          placeholder="0.00"
                          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-9 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Job Status
                      </label>

                      <div className="relative">
                        <select
                          value={
                            status
                          }
                          onChange={(e) =>
                            setStatus(
                              e.target
                                .value as JobStatus
                            )
                          }
                          className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        >
                          {statusOptions.map(
                            (
                              option
                            ) => (
                              <option
                                key={
                                  option
                                }
                                value={
                                  option
                                }
                              >
                                {getStatusLabel(
                                  option
                                )}
                              </option>
                            )
                          )}
                        </select>

                        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Payment Status
                      </label>

                      <div className="relative">
                        <select
                          value={
                            paymentStatus
                          }
                          onChange={(e) =>
                            setPaymentStatus(
                              e.target
                                .value as PaymentStatus
                            )
                          }
                          className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        >
                          {paymentOptions.map(
                            (
                              option
                            ) => (
                              <option
                                key={
                                  option
                                }
                                value={
                                  option
                                }
                              >
                                {getStatusLabel(
                                  option
                                )}
                              </option>
                            )
                          )}
                        </select>

                        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Schedule */}
                <div>
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Schedule
                    </h3>

                    <p className="mt-1 text-xs text-slate-400">
                      Add project timing when available.
                    </p>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Start Date
                      </label>

                      <input
                        type="date"
                        value={
                          startDate
                        }
                        onChange={(e) =>
                          handleStartDateChange(
                            e.target
                              .value
                          )
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Due Date
                      </label>

                      <input
                        type="date"
                        min={
                          startDate ||
                          undefined
                        }
                        value={
                          dueDate
                        }
                        onChange={(e) => {
                          setDueDate(
                            e.target
                              .value
                          );
                          setError(
                            null
                          );
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Notes
                  </label>

                  <textarea
                    value={notes}
                    onChange={(e) =>
                      setNotes(
                        e.target
                          .value
                      )
                    }
                    rows={4}
                    placeholder="Add job notes, scope details, materials, or internal context..."
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />

                    <p>{error}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={closeCreate}
                disabled={creating}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={createJob}
                disabled={creating}
                className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating
                  ? "Creating Job..."
                  : "Create Job"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}