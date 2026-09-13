"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  DollarSign,
  Edit3,
  FileText,
  Mail,
  Phone,
  Trash2,
  User,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type EstimateStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "accepted"
  | "declined"
  | "expired";

type Lead = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
};

type Estimate = {
  id: string;
  organization_id: string;
  lead_id: string | null;
  title: string;
  amount: number | string | null;
  status: EstimateStatus | string;
  estimate_date: string | null;
  expiration_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  leads?: Lead | null;
};

type Props = {
  estimate: Estimate;
  leads: Lead[];
};

const statusOptions: EstimateStatus[] = [
  "draft",
  "sent",
  "viewed",
  "accepted",
  "declined",
  "expired",
];

function formatCurrency(value: number | string | null) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(`${value}T00:00:00`);

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(value: string) {
  const date = new Date(value);

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getLeadName(lead: Lead | null | undefined) {
  if (!lead) return "No customer";

  const name = `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim();

  return name || "Unnamed customer";
}

function getStatusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getStatusClasses(status: string) {
  switch (status) {
    case "accepted":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200";

    case "sent":
      return "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200";

    case "viewed":
      return "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200";

    case "declined":
      return "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200";

    case "expired":
      return "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200";

    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200";
  }
}

function StatusProgress({ status }: { status: string }) {
  const steps = ["draft", "sent", "viewed", "accepted"];
  const currentIndex = steps.indexOf(status);

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => {
        const completed =
          currentIndex >= 0 && index <= currentIndex;

        return (
          <div key={step} className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                completed
                  ? "bg-slate-950 text-white"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {completed ? (
                <Check className="h-4 w-4" />
              ) : (
                index + 1
              )}
            </div>

            {index < steps.length - 1 && (
              <div
                className={`mx-2 h-px w-8 ${
                  currentIndex > index
                    ? "bg-slate-950"
                    : "bg-slate-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function EstimateDetailClient({
  estimate: initialEstimate,
  leads,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [estimate, setEstimate] = useState<Estimate>(
    initialEstimate
  );

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(initialEstimate.title ?? "");

  const [leadId, setLeadId] = useState(
    initialEstimate.lead_id ?? ""
  );

  const [amount, setAmount] = useState(
    initialEstimate.amount != null
      ? String(initialEstimate.amount)
      : ""
  );

  const [status, setStatus] = useState<EstimateStatus>(
    (initialEstimate.status as EstimateStatus) ?? "draft"
  );

  const [estimateDate, setEstimateDate] = useState(
    initialEstimate.estimate_date ?? ""
  );

  const [expirationDate, setExpirationDate] = useState(
    initialEstimate.expiration_date ?? ""
  );

  const [notes, setNotes] = useState(
    initialEstimate.notes ?? ""
  );

  /*
   * The estimate's related customer.
   * This was missing in the previous version.
   */
  const customer = estimate.leads ?? null;

  function openEdit() {
    setTitle(estimate.title ?? "");

    setLeadId(
      estimate.lead_id ?? ""
    );

    setAmount(
      estimate.amount != null
        ? String(estimate.amount)
        : ""
    );

    setStatus(
      (estimate.status as EstimateStatus) ?? "draft"
    );

    setEstimateDate(
      estimate.estimate_date ?? ""
    );

    setExpirationDate(
      estimate.expiration_date ?? ""
    );

    setNotes(
      estimate.notes ?? ""
    );

    setError(null);
    setIsEditOpen(true);
  }

  function closeEdit() {
    if (saving) return;

    setIsEditOpen(false);
    setError(null);
  }

  async function saveEstimate() {
    setError(null);

    if (!title.trim()) {
      setError("Please enter an estimate title.");
      return;
    }

    if (!leadId) {
      setError("Please select a customer.");
      return;
    }

    if (!estimateDate) {
      setError("Please select an estimate date.");
      return;
    }

    setSaving(true);

    const { data, error: updateError } =
      await supabase.rpc("update_estimate", {
        p_estimate_id: estimate.id,
        p_title: title.trim(),
        p_lead_id: leadId,
        p_amount: Number(amount) || 0,
        p_status: status,
        p_estimate_date: estimateDate,
        p_expiration_date: expirationDate || null,
        p_notes: notes.trim() || null,
      });

    if (updateError) {
      console.error(
        "Error updating estimate:",
        updateError
      );

      setError(
        updateError.message ||
          "Something went wrong while saving the estimate."
      );

      setSaving(false);
      return;
    }

    const updatedLead =
      leads.find(
        (lead) => lead.id === leadId
      ) ?? null;

    if (data) {
      setEstimate({
        ...(data as Estimate),
        leads: updatedLead,
      });
    } else {
      setEstimate({
        ...estimate,
        title: title.trim(),
        lead_id: leadId,
        amount: Number(amount) || 0,
        status,
        estimate_date: estimateDate,
        expiration_date:
          expirationDate || null,
        notes: notes.trim() || null,
        leads: updatedLead,
      });
    }

    setSaving(false);
    setIsEditOpen(false);
  }

  async function convertToJob() {
    setError(null);

    if (!estimate.lead_id) {
      setError(
        "This estimate does not have a customer attached."
      );
      return;
    }

    try {
      setSaving(true);

      /*
       * Prevent duplicate conversion.
       */
      const {
        data: existingJob,
        error: existingJobError,
      } = await supabase
        .from("jobs")
        .select("id")
        .eq(
          "organization_id",
          estimate.organization_id
        )
        .eq(
          "estimate_id",
          estimate.id
        )
        .maybeSingle();

      if (existingJobError) {
        throw existingJobError;
      }

      /*
       * If this estimate already has a job,
       * open that job instead of creating another one.
       */
      if (existingJob?.id) {
        router.push(
          `/jobs/${existingJob.id}`
        );
        return;
      }

      /*
       * Use the EXISTING Jobs RPC.
       * This matches the existing Jobs creation flow.
       */
      const {
        data,
        error: createJobError,
      } = await supabase.rpc("create_job", {
        p_organization_id:
          estimate.organization_id,

        p_title:
          `${estimate.title} - Job`,

        p_lead_id:
          estimate.lead_id,

        p_estimate_id:
          estimate.id,

        p_amount:
          Number(estimate.amount) || 0,

        p_status:
          "scheduled",

        p_payment_status:
          "unpaid",

        p_start_date:
          null,

        p_due_date:
          null,

        p_completed_date:
          null,

        p_notes:
          estimate.notes || null,
      });

      if (createJobError) {
        throw createJobError;
      }

      const createdJob = Array.isArray(data)
        ? data[0]
        : data;

      if (!createdJob?.id) {
        throw new Error(
          "The job was created, but no job ID was returned."
        );
      }

      router.push(
        `/jobs/${createdJob.id}`
      );

      router.refresh();
    } catch (err: any) {
      console.error(
        "Error converting estimate to job:",
        err
      );

      setError(
        err?.message ||
          "Something went wrong while creating the job."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteEstimate() {
    setError(null);
    setDeleting(true);

    const {
      error: deleteError,
    } = await supabase.rpc(
      "delete_estimate",
      {
        p_estimate_id: estimate.id,
      }
    );

    if (deleteError) {
      console.error(
        "Error deleting estimate:",
        deleteError
      );

      setError(
        deleteError.message ||
          "Something went wrong while deleting the estimate."
      );

      setDeleting(false);
      return;
    }

    router.push("/estimates");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">

        {/* Header */}
        <div className="mb-8">
          <Link
            href="/estimates"
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Estimates
          </Link>

          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                    estimate.status
                  )}`}
                >
                  {getStatusLabel(
                    estimate.status
                  )}
                </span>

                <span className="text-sm text-slate-400">
                  Estimate #
                  {estimate.id.slice(0, 8)}
                </span>
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                {estimate.title}
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Created{" "}
                {formatDateTime(
                  estimate.created_at
                )}
              </p>
            </div>

            <div className="text-left lg:text-right">
              <p className="text-sm font-medium text-slate-500">
                Estimate Amount
              </p>

              <p className="mt-1 text-4xl font-bold tracking-tight text-slate-950">
                {formatCurrency(
                  estimate.amount
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">

          <div className="space-y-6">

            {/* Progress */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">
                    Estimate Progress
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Track where this estimate currently stands.
                  </p>
                </div>

                <StatusProgress
                  status={estimate.status}
                />
              </div>
            </section>

            {/* Customer */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                  <User className="h-5 w-5 text-slate-700" />
                </div>

                <div>
                  <h2 className="text-base font-semibold text-slate-950">
                    Customer
                  </h2>

                  <p className="text-sm text-slate-500">
                    Customer associated with this estimate.
                  </p>
                </div>
              </div>

              {customer ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                    <div>
                      <p className="text-lg font-semibold text-slate-950">
                        {getLeadName(
                          customer
                        )}
                      </p>

                      {customer.email && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                          <Mail className="h-4 w-4" />
                          {customer.email}
                        </div>
                      )}

                      {customer.phone && (
                        <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                          <Phone className="h-4 w-4" />
                          {customer.phone}
                        </div>
                      )}
                    </div>

                    <Link
                      href={`/leads/${customer.id}`}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      View Customer
                    </Link>

                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                  <p className="text-sm font-medium text-slate-700">
                    No customer attached
                  </p>
                </div>
              )}
            </section>

            {/* Details */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                  <FileText className="h-5 w-5 text-slate-700" />
                </div>

                <div>
                  <h2 className="text-base font-semibold text-slate-950">
                    Estimate Details
                  </h2>

                  <p className="text-sm text-slate-500">
                    Important dates and estimate information.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">

                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <CalendarDays className="h-4 w-4" />
                    Estimate Date
                  </div>

                  <p className="mt-2 font-semibold text-slate-900">
                    {formatDate(
                      estimate.estimate_date
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <Clock className="h-4 w-4" />
                    Expiration Date
                  </div>

                  <p className="mt-2 font-semibold text-slate-900">
                    {formatDate(
                      estimate.expiration_date
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <DollarSign className="h-4 w-4" />
                    Amount
                  </div>

                  <p className="mt-2 font-semibold text-slate-900">
                    {formatCurrency(
                      estimate.amount
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <Clock className="h-4 w-4" />
                    Last Updated
                  </div>

                  <p className="mt-2 font-semibold text-slate-900">
                    {formatDateTime(
                      estimate.updated_at
                    )}
                  </p>
                </div>

              </div>
            </section>

            {/* Notes */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-slate-950">
                Notes
              </h2>

              {estimate.notes ? (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {estimate.notes}
                </p>
              ) : (
                <p className="mt-3 text-sm text-slate-400">
                  No notes have been added to this estimate.
                </p>
              )}
            </section>

          </div>

          {/* Sidebar */}
          <aside className="space-y-6">

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-slate-950">
                Actions
              </h2>

              <div className="space-y-3">

                {/* CONVERT TO JOB */}
                <button
                  type="button"
                  onClick={convertToJob}
                  disabled={saving}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Check className="h-4 w-4" />

                  {saving
                    ? "Creating Job..."
                    : "Convert to Job"}
                </button>

                {/* EDIT */}
                <button
                  type="button"
                  onClick={openEdit}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit Estimate
                </button>

                {/* SEND */}
                <button
                  type="button"
                  disabled
                  className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-400"
                >
                  <Mail className="h-4 w-4" />
                  Send Estimate
                </button>

                {/* DELETE */}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setIsDeleteOpen(true);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Estimate
                </button>

              </div>

              {error && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </section>

            {/* Summary */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-950">
                Estimate Summary
              </h2>

              <div className="mt-4 space-y-4">

                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-500">
                    Status
                  </span>

                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                      estimate.status
                    )}`}
                  >
                    {getStatusLabel(
                      estimate.status
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-500">
                    Customer
                  </span>

                  <span className="max-w-[170px] truncate text-right text-sm font-semibold text-slate-900">
                    {getLeadName(
                      customer
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-500">
                    Amount
                  </span>

                  <span className="text-sm font-semibold text-slate-900">
                    {formatCurrency(
                      estimate.amount
                    )}
                  </span>
                </div>

              </div>
            </section>

          </aside>
        </div>
      </div>

      {/* EDIT MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">

          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">

              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Edit Estimate
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Update the details for this estimate.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEdit}
                disabled={saving}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>

            </div>

            <div className="space-y-5 p-6">

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Estimate Title
                </label>

                <input
                  value={title}
                  onChange={(e) =>
                    setTitle(e.target.value)
                  }
                  placeholder="Kitchen Remodel Estimate"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Customer
                </label>

                <div className="relative">

                  <select
                    value={leadId}
                    onChange={(e) =>
                      setLeadId(
                        e.target.value
                      )
                    }
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  >
                    <option value="">
                      Select customer
                    </option>

                    {leads.map(
                      (lead) => (
                        <option
                          key={lead.id}
                          value={lead.id}
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

              <div className="grid gap-5 sm:grid-cols-2">

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Amount
                  </label>

                  <div className="relative">

                    <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={amount}
                      onChange={(e) =>
                        setAmount(
                          e.target.value
                        )
                      }
                      placeholder="0.00"
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-9 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    />

                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Status
                  </label>

                  <div className="relative">

                    <select
                      value={status}
                      onChange={(e) =>
                        setStatus(
                          e.target
                            .value as EstimateStatus
                        )
                      }
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    >
                      {statusOptions.map(
                        (option) => (
                          <option
                            key={option}
                            value={option}
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

              <div className="grid gap-5 sm:grid-cols-2">

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Estimate Date
                  </label>

                  <input
                    type="date"
                    value={estimateDate}
                    onChange={(e) =>
                      setEstimateDate(
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Expiration Date
                  </label>

                  <input
                    type="date"
                    value={expirationDate}
                    onChange={(e) =>
                      setExpirationDate(
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
                </div>

              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Notes
                </label>

                <textarea
                  value={notes}
                  onChange={(e) =>
                    setNotes(
                      e.target.value
                    )
                  }
                  rows={5}
                  placeholder="Add estimate notes..."
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
                type="button"
                onClick={closeEdit}
                disabled={saving}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveEstimate}
                disabled={saving}
                className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>

            </div>

          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">

          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">

            <div className="p-6">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>

              <h2 className="mt-5 text-xl font-bold text-slate-950">
                Delete this estimate?
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                You are about to permanently delete{" "}
                <span className="font-semibold text-slate-700">
                  {estimate.title}
                </span>
                . This action cannot be undone.
              </p>

              {error && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={() => {
                    if (!deleting) {
                      setIsDeleteOpen(false);
                      setError(null);
                    }
                  }}
                  disabled={deleting}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={deleteEstimate}
                  disabled={deleting}
                  className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deleting
                    ? "Deleting..."
                    : "Delete Estimate"}
                </button>

              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}