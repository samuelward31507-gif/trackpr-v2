"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  DollarSign,
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

function formatCurrency(value: number | string | null) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function formatShortDate(value: string | null) {
  if (!value) return "—";

  return new Date(`${value}T00:00:00`).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );
}

function getLeadName(lead: Lead | null | undefined) {
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
        word.charAt(0).toUpperCase() + word.slice(1)
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

    default:
      return "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200";
  }
}

export default function JobsClient({
  jobs: initialJobs,
  leads,
  estimates,
}: Props) {
  const supabase = createClient();

  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("all");

  const [isCreateOpen, setIsCreateOpen] =
    useState(false);

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(
    null
  );

  const [title, setTitle] = useState("");
  const [leadId, setLeadId] = useState("");
  const [estimateId, setEstimateId] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] =
    useState<JobStatus>("scheduled");
  const [paymentStatus, setPaymentStatus] =
    useState<PaymentStatus>("unpaid");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return jobs.filter((job) => {
      const customerName =
        getLeadName(job.leads).toLowerCase();

      const matchesSearch =
        !query ||
        job.title.toLowerCase().includes(query) ||
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
      (job) => job.status === "completed"
    );

    const totalValue = jobs.reduce(
      (sum, job) => sum + Number(job.amount ?? 0),
      0
    );

    const activeValue = activeJobs.reduce(
      (sum, job) => sum + Number(job.amount ?? 0),
      0
    );

    return {
      total: jobs.length,
      active: activeJobs.length,
      completed: completedJobs.length,
      totalValue,
      activeValue,
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

  async function createJob() {
    setError(null);

    if (!title.trim()) {
      setError("Please enter a job title.");
      return;
    }

    if (!leadId) {
      setError("Please select a customer.");
      return;
    }

    setCreating(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be signed in.");
      setCreating(false);
      return;
    }

    const { data: membership } =
      await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (!membership) {
      setError(
        "No organization membership was found."
      );
      setCreating(false);
      return;
    }

    const { data, error: createError } =
      await supabase.rpc("create_job", {
        p_organization_id:
          membership.organization_id,
        p_title: title.trim(),
        p_lead_id: leadId,
        p_estimate_id:
          estimateId || null,
        p_amount: Number(amount) || 0,
        p_status: status,
        p_payment_status: paymentStatus,
        p_start_date: startDate || null,
        p_due_date: dueDate || null,
        p_completed_date: null,
        p_notes: notes.trim() || null,
      });

    if (createError) {
      console.error(createError);
      setError(createError.message);
      setCreating(false);
      return;
    }

    const selectedLead =
      leads.find((lead) => lead.id === leadId) ??
      null;

    const newJob: Job = {
      ...(data as Job),
      leads: selectedLead,
    };

    setJobs((current) => [newJob, ...current]);

    setCreating(false);
    setIsCreateOpen(false);
    resetForm();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-500">
              <BriefcaseBusiness className="h-4 w-4" />
              Operations
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Jobs
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Manage active projects, completed work,
              job value, and payment status from one place.
            </p>
          </div>

          <button
            onClick={() => {
              resetForm();
              setIsCreateOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            New Job
          </button>
        </div>

        {/* Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Total Jobs
              </p>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
                <BriefcaseBusiness className="h-4 w-4 text-slate-700" />
              </div>
            </div>

            <p className="mt-4 text-2xl font-bold text-slate-950">
              {stats.total}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Active Jobs
              </p>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
                <Clock3 className="h-4 w-4 text-blue-600" />
              </div>
            </div>

            <p className="mt-4 text-2xl font-bold text-slate-950">
              {stats.active}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              {formatCurrency(stats.activeValue)} active
              value
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Completed
              </p>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
            </div>

            <p className="mt-4 text-2xl font-bold text-slate-950">
              {stats.completed}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Total Job Value
              </p>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50">
                <DollarSign className="h-4 w-4 text-violet-600" />
              </div>
            </div>

            <p className="mt-4 text-2xl font-bold text-slate-950">
              {formatCurrency(stats.totalValue)}
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search jobs or customers..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {statusFilters.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() =>
                    setStatusFilter(filter.value)
                  }
                  className={`whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                    statusFilter === filter.value
                      ? "bg-slate-950 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Jobs */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {filteredJobs.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <BriefcaseBusiness className="h-6 w-6 text-slate-500" />
              </div>

              <h3 className="mt-5 text-lg font-semibold text-slate-950">
                {jobs.length === 0
                  ? "No jobs yet"
                  : "No jobs found"}
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {jobs.length === 0
                  ? "Create your first job to start tracking active work, job value, and payment status."
                  : "Try changing your search or status filter."}
              </p>

              {jobs.length === 0 && (
                <button
                  onClick={() => {
                    resetForm();
                    setIsCreateOpen(true);
                  }}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4" />
                  Create First Job
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop header */}
              <div className="hidden border-b border-slate-200 bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 lg:grid lg:grid-cols-[minmax(220px,1.5fr)_minmax(160px,1fr)_120px_130px_130px_40px] lg:gap-4">
                <div>Job</div>
                <div>Customer</div>
                <div>Amount</div>
                <div>Status</div>
                <div>Payment</div>
                <div />
              </div>

              <div className="divide-y divide-slate-100">
                {filteredJobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="group block px-5 py-5 transition hover:bg-slate-50 lg:px-6"
                  >
                    {/* Desktop */}
                    <div className="hidden items-center lg:grid lg:grid-cols-[minmax(220px,1.5fr)_minmax(160px,1fr)_120px_130px_130px_40px] lg:gap-4">
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

                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-700">
                          {getLeadName(job.leads)}
                        </p>
                      </div>

                      <div className="text-sm font-semibold text-slate-900">
                        {formatCurrency(job.amount)}
                      </div>

                      <div>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                            job.status
                          )}`}
                        >
                          {getStatusLabel(job.status)}
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

                      <div className="text-right text-slate-400">
                        →
                      </div>
                    </div>

                    {/* Mobile */}
                    <div className="lg:hidden">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-950">
                            {job.title}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {getLeadName(job.leads)}
                          </p>
                        </div>

                        <p className="shrink-0 font-semibold text-slate-950">
                          {formatCurrency(job.amount)}
                        </p>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                            job.status
                          )}`}
                        >
                          {getStatusLabel(job.status)}
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
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create Job Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Create New Job
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Add a project to your active job pipeline.
                </p>
              </div>

              <button
                onClick={closeCreate}
                disabled={creating}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-6">
              {/* Estimate */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Link Estimate
                  <span className="ml-1 font-normal text-slate-400">
                    (optional)
                  </span>
                </label>

                <div className="relative">
                  <select
                    value={estimateId}
                    onChange={(e) =>
                      handleEstimateChange(
                        e.target.value
                      )
                    }
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  >
                    <option value="">
                      No estimate linked
                    </option>

                    {estimates.map((estimate) => (
                      <option
                        key={estimate.id}
                        value={estimate.id}
                      >
                        {estimate.title} —{" "}
                        {formatCurrency(
                          estimate.amount
                        )}
                      </option>
                    ))}
                  </select>

                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Job Title
                </label>

                <input
                  value={title}
                  onChange={(e) =>
                    setTitle(e.target.value)
                  }
                  placeholder="Kitchen Remodel"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>

              {/* Customer */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Customer
                </label>

                <div className="relative">
                  <select
                    value={leadId}
                    onChange={(e) =>
                      setLeadId(e.target.value)
                    }
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  >
                    <option value="">
                      Select customer
                    </option>

                    {leads.map((lead) => (
                      <option
                        key={lead.id}
                        value={lead.id}
                      >
                        {getLeadName(lead)}
                      </option>
                    ))}
                  </select>

                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {/* Amount / Status */}
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
                      value={amount}
                      onChange={(e) =>
                        setAmount(e.target.value)
                      }
                      placeholder="0.00"
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-9 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Job Status
                  </label>

                  <div className="relative">
                    <select
                      value={status}
                      onChange={(e) =>
                        setStatus(
                          e.target.value as JobStatus
                        )
                      }
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    >
                      {statusOptions.map((option) => (
                        <option
                          key={option}
                          value={option}
                        >
                          {getStatusLabel(option)}
                        </option>
                      ))}
                    </select>

                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Payment Status
                </label>

                <div className="relative">
                  <select
                    value={paymentStatus}
                    onChange={(e) =>
                      setPaymentStatus(
                        e.target.value as PaymentStatus
                      )
                    }
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  >
                    {paymentOptions.map((option) => (
                      <option
                        key={option}
                        value={option}
                      >
                        {getStatusLabel(option)}
                      </option>
                    ))}
                  </select>

                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {/* Dates */}
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Start Date
                  </label>

                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) =>
                      setStartDate(e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Due Date
                  </label>

                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) =>
                      setDueDate(e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
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
                    setNotes(e.target.value)
                  }
                  rows={4}
                  placeholder="Add job notes..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>

            <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-6 py-5 sm:flex-row sm:justify-end">
              <button
                onClick={closeCreate}
                disabled={creating}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={createJob}
                disabled={creating}
                className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating
                  ? "Creating..."
                  : "Create Job"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}