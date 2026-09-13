"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  CreditCard,
  DollarSign,
  Edit3,
  FileText,
  Mail,
  Phone,
  Plus,
  Save,
  Trash2,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type JobStatus =
  | "scheduled"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "cancelled";

type PaymentStatus = "unpaid" | "partial" | "paid";

type PaymentRecordStatus =
  | "pending"
  | "completed"
  | "failed"
  | "refunded";

type PaymentMethod =
  | "cash"
  | "check"
  | "card"
  | "bank_transfer"
  | "other";

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
  amount: number | null;
  status: string;
  lead_id: string | null;
};

type Payment = {
  id: string;
  organization_id: string;
  job_id: string | null;
  lead_id: string | null;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  status: PaymentRecordStatus;
  reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type Job = {
  id: string;
  organization_id: string;
  lead_id: string | null;
  estimate_id: string | null;
  title: string;
  amount: number | null;
  status: JobStatus;
  payment_status: PaymentStatus;
  start_date: string | null;
  due_date: string | null;
  completed_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  leads: Lead | null;
};

type Props = {
  job: Job;
  leads: Lead[];
  estimates: Estimate[];
  payments: Payment[];
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getLeadName(lead: Lead | null | undefined) {
  if (!lead) return "No customer";

  const name = `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim();

  return name || "Unnamed customer";
}

function getInitials(lead: Lead | null | undefined) {
  const name = getLeadName(lead);

  if (name === "No customer" || name === "Unnamed customer") {
    return "?";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getStatusLabel(status: JobStatus) {
  switch (status) {
    case "scheduled":
      return "Scheduled";
    case "in_progress":
      return "In Progress";
    case "on_hold":
      return "On Hold";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

function getStatusClasses(status: JobStatus) {
  switch (status) {
    case "completed":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "in_progress":
      return "bg-blue-50 text-blue-700 ring-blue-200";
    case "scheduled":
      return "bg-violet-50 text-violet-700 ring-violet-200";
    case "on_hold":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "cancelled":
      return "bg-red-50 text-red-700 ring-red-200";
    default:
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
}

function getPaymentClasses(status: PaymentStatus) {
  switch (status) {
    case "paid":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "partial":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "unpaid":
      return "bg-slate-100 text-slate-600 ring-slate-200";
    default:
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
}

function getPaymentStatusLabel(status: PaymentStatus) {
  switch (status) {
    case "paid":
      return "Paid";
    case "partial":
      return "Partial";
    case "unpaid":
      return "Unpaid";
    default:
      return status;
  }
}

function getRecordStatusLabel(status: PaymentRecordStatus) {
  switch (status) {
    case "completed":
      return "Completed";
    case "pending":
      return "Pending";
    case "failed":
      return "Failed";
    case "refunded":
      return "Refunded";
    default:
      return status;
  }
}

function getMethodLabel(method: PaymentMethod) {
  switch (method) {
    case "cash":
      return "Cash";
    case "check":
      return "Check";
    case "card":
      return "Card";
    case "bank_transfer":
      return "Bank transfer";
    default:
      return "Other";
  }
}

export default function JobDetailClient({
  job: initialJob,
  leads,
  estimates,
  payments: initialPayments,
}: Props) {
  const supabase = createClient();

  const [job, setJob] = useState<Job>(initialJob);
  const [payments, setPayments] =
    useState<Payment[]>(initialPayments);

  const [editing, setEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] =
    useState(false);
  const [showPaymentModal, setShowPaymentModal] =
    useState(false);
  const [editingPayment, setEditingPayment] =
    useState<Payment | null>(null);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savingPayment, setSavingPayment] =
    useState(false);

  const [error, setError] = useState("");
  const [paymentError, setPaymentError] =
    useState("");

  const [title, setTitle] = useState(job.title);
  const [leadId, setLeadId] = useState(job.lead_id ?? "");
  const [estimateId, setEstimateId] = useState(
    job.estimate_id ?? ""
  );
  const [amount, setAmount] = useState(
    String(job.amount ?? 0)
  );
  const [status, setStatus] = useState<JobStatus>(
    job.status
  );
  const [paymentStatus, setPaymentStatus] =
    useState<PaymentStatus>(job.payment_status);
  const [startDate, setStartDate] = useState(
    job.start_date ?? ""
  );
  const [dueDate, setDueDate] = useState(
    job.due_date ?? ""
  );
  const [completedDate, setCompletedDate] = useState(
    job.completed_date ?? ""
  );
  const [notes, setNotes] = useState(job.notes ?? "");

  const [paymentAmount, setPaymentAmount] =
    useState("");
  const [paymentDate, setPaymentDate] =
    useState(getTodayDate());
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("card");
  const [paymentRecordStatus, setPaymentRecordStatus] =
    useState<PaymentRecordStatus>("completed");
  const [paymentReference, setPaymentReference] =
    useState("");
  const [paymentNotes, setPaymentNotes] =
    useState("");

  const totalCollected = useMemo(() => {
    return payments
      .filter((payment) => payment.status === "completed")
      .reduce(
        (sum, payment) =>
          sum + Number(payment.amount || 0),
        0
      );
  }, [payments]);

  const jobTotal = Number(job.amount || 0);

  const remainingBalance = Math.max(
    jobTotal - totalCollected,
    0
  );

  function beginEditing() {
    setTitle(job.title);
    setLeadId(job.lead_id ?? "");
    setEstimateId(job.estimate_id ?? "");
    setAmount(String(job.amount ?? 0));
    setStatus(job.status);
    setPaymentStatus(job.payment_status);
    setStartDate(job.start_date ?? "");
    setDueDate(job.due_date ?? "");
    setCompletedDate(job.completed_date ?? "");
    setNotes(job.notes ?? "");
    setError("");
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setError("");
  }

  function handleEstimateChange(value: string) {
    setEstimateId(value);

    if (!value) return;

    const selectedEstimate = estimates.find(
      (estimate) => estimate.id === value
    );

    if (!selectedEstimate) return;

    if (selectedEstimate.lead_id) {
      setLeadId(selectedEstimate.lead_id);
    }

    if (selectedEstimate.amount !== null) {
      setAmount(String(selectedEstimate.amount));
    }
  }

  async function saveJob() {
    if (!title.trim()) {
      setError("Job title is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const { data, error: rpcError } =
        await supabase.rpc("update_job", {
          p_job_id: job.id,
          p_title: title.trim(),
          p_lead_id: leadId || null,
          p_estimate_id: estimateId || null,
          p_amount: Number(amount) || 0,
          p_status: status,
          p_payment_status: paymentStatus,
          p_start_date: startDate || null,
          p_due_date: dueDate || null,
          p_completed_date: completedDate || null,
          p_notes: notes.trim() || null,
        });

      if (rpcError) {
        throw rpcError;
      }

      const updatedJob: Job = {
        ...(data as Job),
        leads:
          leads.find((lead) => lead.id === leadId) ??
          null,
      };

      setJob(updatedJob);
      setEditing(false);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message || "Something went wrong while saving."
      );
    } finally {
      setSaving(false);
    }
  }

  async function markCompleted() {
    try {
      setSaving(true);
      setError("");

      const { data, error: rpcError } =
        await supabase.rpc("update_job", {
          p_job_id: job.id,
          p_title: job.title,
          p_lead_id: job.lead_id,
          p_estimate_id: job.estimate_id,
          p_amount: Number(job.amount) || 0,
          p_status: "completed",
          p_payment_status: job.payment_status,
          p_start_date: job.start_date,
          p_due_date: job.due_date,
          p_completed_date: getTodayDate(),
          p_notes: job.notes,
        });

      if (rpcError) {
        throw rpcError;
      }

      const updatedJob: Job = {
        ...(data as Job),
        leads: job.leads,
      };

      setJob(updatedJob);
      setStatus("completed");
      setCompletedDate(getTodayDate());
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message ||
          "Something went wrong while completing the job."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteJob() {
    try {
      setDeleting(true);
      setError("");

      const { error: rpcError } =
        await supabase.rpc("delete_job", {
          p_job_id: job.id,
        });

      if (rpcError) {
        throw rpcError;
      }

      window.location.href = "/jobs";
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message ||
          "Something went wrong while deleting the job."
      );
      setDeleting(false);
    }
  }

  function resetPaymentForm() {
    setPaymentAmount("");
    setPaymentDate(getTodayDate());
    setPaymentMethod("card");
    setPaymentRecordStatus("completed");
    setPaymentReference("");
    setPaymentNotes("");
    setPaymentError("");
  }

  function openCreatePayment() {
    setEditingPayment(null);
    resetPaymentForm();
    setShowPaymentModal(true);
  }

  function openEditPayment(payment: Payment) {
    setEditingPayment(payment);
    setPaymentAmount(String(payment.amount ?? ""));
    setPaymentDate(payment.payment_date);
    setPaymentMethod(payment.payment_method);
    setPaymentRecordStatus(payment.status);
    setPaymentReference(payment.reference ?? "");
    setPaymentNotes(payment.notes ?? "");
    setPaymentError("");
    setShowPaymentModal(true);
  }

  function closePaymentModal() {
    if (savingPayment) return;

    setShowPaymentModal(false);
    setEditingPayment(null);
    resetPaymentForm();
  }

  async function savePayment() {
    const numericAmount = Number(paymentAmount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setPaymentError(
        "Enter a payment amount greater than $0."
      );
      return;
    }

    if (!paymentDate) {
      setPaymentError("Select a payment date.");
      return;
    }

    try {
      setSavingPayment(true);
      setPaymentError("");

      if (editingPayment) {
        const { data, error: rpcError } =
          await supabase.rpc("update_payment", {
            p_payment_id: editingPayment.id,
            p_job_id: job.id,
            p_lead_id: job.lead_id,
            p_amount: numericAmount,
            p_payment_date: paymentDate,
            p_payment_method: paymentMethod,
            p_status: paymentRecordStatus,
            p_reference:
              paymentReference.trim() || null,
            p_notes: paymentNotes.trim() || null,
          });

        if (rpcError) {
          throw rpcError;
        }

        setPayments((current) =>
          current.map((payment) =>
            payment.id === editingPayment.id
              ? (data as Payment)
              : payment
          )
        );
      } else {
        const { data, error: rpcError } =
          await supabase.rpc("create_payment", {
            p_job_id: job.id,
            p_lead_id: job.lead_id,
            p_amount: numericAmount,
            p_payment_date: paymentDate,
            p_payment_method: paymentMethod,
            p_status: paymentRecordStatus,
            p_reference:
              paymentReference.trim() || null,
            p_notes: paymentNotes.trim() || null,
          });

        if (rpcError) {
          throw rpcError;
        }

        setPayments((current) => [
          data as Payment,
          ...current,
        ]);
      }

      setShowPaymentModal(false);
      setEditingPayment(null);
      resetPaymentForm();
    } catch (err: any) {
      console.error(err);
      setPaymentError(
        err?.message ||
          "Something went wrong while saving the payment."
      );
    } finally {
      setSavingPayment(false);
    }
  }

  async function deletePayment(payment: Payment) {
    const confirmed = window.confirm(
      `Delete this ${formatCurrency(
        Number(payment.amount || 0)
      )} payment? This cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setError("");

      const { error: rpcError } =
        await supabase.rpc("delete_payment", {
          p_payment_id: payment.id,
        });

      if (rpcError) {
        throw rpcError;
      }

      setPayments((current) =>
        current.filter((item) => item.id !== payment.id)
      );
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message ||
          "Something went wrong while deleting the payment."
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/jobs"
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Jobs
          </Link>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                  {job.title}
                </h1>

                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusClasses(
                    job.status
                  )}`}
                >
                  {getStatusLabel(job.status)}
                </span>
              </div>

              <p className="mt-2 text-sm text-slate-500">
                Created {formatDateTime(job.created_at)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {job.status !== "completed" &&
                job.status !== "cancelled" && (
                  <button
                    type="button"
                    onClick={markCompleted}
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Mark Completed
                  </button>
                )}

              <button
                type="button"
                onClick={beginEditing}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <Edit3 className="h-4 w-4" />
                Edit
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Financial Summary */}
        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-950">
              Financial Summary
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              See exactly how much of this job has been collected.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <FinancialCard
              label="Job Total"
              value={formatCurrency(jobTotal)}
              icon={<DollarSign className="h-5 w-5" />}
            />

            <FinancialCard
              label="Collected"
              value={formatCurrency(totalCollected)}
              icon={<CheckCircle2 className="h-5 w-5" />}
            />

            <FinancialCard
              label="Remaining"
              value={formatCurrency(remainingBalance)}
              icon={<WalletCards className="h-5 w-5" />}
              emphasis={remainingBalance > 0}
            />
          </div>
        </section>

        {/* Main Content */}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            {/* Overview */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="font-semibold text-slate-950">
                  Overview
                </h2>
              </div>

              {editing ? (
                <div className="space-y-5 p-6">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-800">
                      Job Title
                    </label>

                    <input
                      value={title}
                      onChange={(event) =>
                        setTitle(event.target.value)
                      }
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                    />
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <SelectField
                      label="Customer"
                      value={leadId}
                      onChange={setLeadId}
                      placeholder="Select customer"
                      options={leads.map((lead) => ({
                        value: lead.id,
                        label: getLeadName(lead),
                      }))}
                    />

                    <SelectField
                      label="Estimate"
                      value={estimateId}
                      onChange={handleEstimateChange}
                      placeholder="Select estimate"
                      options={estimates.map(
                        (estimate) => ({
                          value: estimate.id,
                          label: `${estimate.title} — ${formatCurrency(
                            Number(
                              estimate.amount || 0
                            )
                          )}`,
                        })
                      )}
                    />
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <InputField
                      label="Job Amount"
                      type="number"
                      value={amount}
                      onChange={setAmount}
                    />

                    <SelectField
                      label="Job Status"
                      value={status}
                      onChange={(value) =>
                        setStatus(
                          value as JobStatus
                        )
                      }
                      placeholder="Select status"
                      options={[
                        {
                          value: "scheduled",
                          label: "Scheduled",
                        },
                        {
                          value: "in_progress",
                          label: "In Progress",
                        },
                        {
                          value: "on_hold",
                          label: "On Hold",
                        },
                        {
                          value: "completed",
                          label: "Completed",
                        },
                        {
                          value: "cancelled",
                          label: "Cancelled",
                        },
                      ]}
                    />
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <SelectField
                      label="Payment Status"
                      value={paymentStatus}
                      onChange={(value) =>
                        setPaymentStatus(
                          value as PaymentStatus
                        )
                      }
                      placeholder="Select payment status"
                      options={[
                        {
                          value: "unpaid",
                          label: "Unpaid",
                        },
                        {
                          value: "partial",
                          label: "Partial",
                        },
                        {
                          value: "paid",
                          label: "Paid",
                        },
                      ]}
                    />

                    <InputField
                      label="Start Date"
                      type="date"
                      value={startDate}
                      onChange={setStartDate}
                    />
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <InputField
                      label="Due Date"
                      type="date"
                      value={dueDate}
                      onChange={setDueDate}
                    />

                    <InputField
                      label="Completed Date"
                      type="date"
                      value={completedDate}
                      onChange={setCompletedDate}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-800">
                      Notes
                    </label>

                    <textarea
                      value={notes}
                      onChange={(event) =>
                        setNotes(event.target.value)
                      }
                      rows={5}
                      className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                    />
                  </div>

                  <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={cancelEditing}
                      disabled={saving}
                      className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={saveJob}
                      disabled={saving}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                    >
                      <Save className="h-4 w-4" />
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-6 p-6 sm:grid-cols-2">
                  <InfoItem
                    label="Job Amount"
                    value={formatCurrency(jobTotal)}
                    icon={<DollarSign className="h-4 w-4" />}
                  />

                  <InfoItem
                    label="Payment Status"
                    value={getPaymentStatusLabel(
                      job.payment_status
                    )}
                    icon={
                      <WalletCards className="h-4 w-4" />
                    }
                  />

                  <InfoItem
                    label="Start Date"
                    value={formatDate(job.start_date)}
                    icon={
                      <CalendarDays className="h-4 w-4" />
                    }
                  />

                  <InfoItem
                    label="Due Date"
                    value={formatDate(job.due_date)}
                    icon={
                      <Clock3 className="h-4 w-4" />
                    }
                  />

                  <InfoItem
                    label="Completed Date"
                    value={formatDate(
                      job.completed_date
                    )}
                    icon={
                      <CheckCircle2 className="h-4 w-4" />
                    }
                  />

                  <InfoItem
                    label="Last Updated"
                    value={formatDateTime(
                      job.updated_at
                    )}
                    icon={
                      <Clock3 className="h-4 w-4" />
                    }
                  />
                </div>
              )}
            </section>

            {/* Payment History */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-semibold text-slate-950">
                    Payment History
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {payments.length}{" "}
                    {payments.length === 1
                      ? "payment"
                      : "payments"}{" "}
                    recorded for this job.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openCreatePayment}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4" />
                  Record Payment
                </button>
              </div>

              {payments.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                    <CreditCard className="h-6 w-6" />
                  </div>

                  <h3 className="text-sm font-semibold text-slate-950">
                    No payments recorded
                  </h3>

                  <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                    Record the first payment for this job to start tracking the balance.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                          <CreditCard className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-950">
                              {formatCurrency(
                                Number(
                                  payment.amount || 0
                                )
                              )}
                            </p>

                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${
                                payment.status ===
                                "completed"
                                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                  : payment.status ===
                                    "pending"
                                  ? "bg-amber-50 text-amber-700 ring-amber-200"
                                  : payment.status ===
                                    "refunded"
                                  ? "bg-slate-100 text-slate-600 ring-slate-200"
                                  : "bg-red-50 text-red-700 ring-red-200"
                              }`}
                            >
                              {getRecordStatusLabel(
                                payment.status
                              )}
                            </span>
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                            <span>
                              {formatDate(
                                payment.payment_date
                              )}
                            </span>

                            <span>
                              {getMethodLabel(
                                payment.payment_method
                              )}
                            </span>

                            {payment.reference && (
                              <span>
                                Ref:{" "}
                                {payment.reference}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            openEditPayment(payment)
                          }
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                          title="Edit payment"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deletePayment(payment)
                          }
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                          title="Delete payment"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Notes */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="font-semibold text-slate-950">
                  Notes
                </h2>
              </div>

              <div className="p-6">
                {job.notes ? (
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {job.notes}
                  </p>
                ) : (
                  <p className="text-sm text-slate-400">
                    No notes added to this job.
                  </p>
                )}
              </div>
            </section>

            {/* Timeline */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="font-semibold text-slate-950">
                  Timeline
                </h2>
              </div>

              <div className="p-6">
                <TimelineItem
                  icon={<FileText className="h-4 w-4" />}
                  title="Job created"
                  date={formatDateTime(
                    job.created_at
                  )}
                />

                {job.start_date && (
                  <TimelineItem
                    icon={
                      <CalendarDays className="h-4 w-4" />
                    }
                    title="Job scheduled"
                    date={formatDate(job.start_date)}
                  />
                )}

                {job.completed_date && (
                  <TimelineItem
                    icon={
                      <CheckCircle2 className="h-4 w-4" />
                    }
                    title="Job completed"
                    date={formatDate(
                      job.completed_date
                    )}
                    last
                  />
                )}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Customer */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="font-semibold text-slate-950">
                  Customer
                </h2>
              </div>

              <div className="p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                    {getInitials(job.leads)}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-950">
                      {getLeadName(job.leads)}
                    </p>

                    <p className="text-xs text-slate-500">
                      Customer
                    </p>
                  </div>
                </div>

                {job.leads && (
                  <div className="mt-5 space-y-3">
                    {job.leads.phone && (
                      <a
                        href={`tel:${job.leads.phone}`}
                        className="flex items-center gap-3 rounded-xl p-2 text-sm text-slate-600 transition hover:bg-slate-50"
                      >
                        <Phone className="h-4 w-4 text-slate-400" />
                        {job.leads.phone}
                      </a>
                    )}

                    {job.leads.email && (
                      <a
                        href={`mailto:${job.leads.email}`}
                        className="flex min-w-0 items-center gap-3 rounded-xl p-2 text-sm text-slate-600 transition hover:bg-slate-50"
                      >
                        <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="truncate">
                          {job.leads.email}
                        </span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Quick Actions */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-slate-950">
                Quick Actions
              </h2>

              <div className="mt-4 space-y-2">
                {job.leads?.phone && (
                  <a
                    href={`tel:${job.leads.phone}`}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Phone className="h-4 w-4 text-slate-500" />
                    Call Customer
                  </a>
                )}

                {job.leads?.email && (
                  <a
                    href={`mailto:${job.leads.email}`}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Mail className="h-4 w-4 text-slate-500" />
                    Email Customer
                  </a>
                )}

                {job.lead_id && (
                  <Link
                    href={`/leads/${job.lead_id}`}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <UserRound className="h-4 w-4 text-slate-500" />
                    View Customer
                  </Link>
                )}

                {job.estimate_id && (
                  <Link
                    href={`/estimates/${job.estimate_id}`}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <FileText className="h-4 w-4 text-slate-500" />
                    View Estimate
                  </Link>
                )}
              </div>
            </section>

            {/* Linked Estimate */}
            {job.estimate_id && (
              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-6 py-5">
                  <h2 className="font-semibold text-slate-950">
                    Linked Estimate
                  </h2>
                </div>

                <div className="p-6">
                  {(() => {
                    const estimate = estimates.find(
                      (item) =>
                        item.id === job.estimate_id
                    );

                    if (!estimate) {
                      return (
                        <p className="text-sm text-slate-400">
                          Estimate not found.
                        </p>
                      );
                    }

                    return (
                      <Link
                        href={`/estimates/${estimate.id}`}
                        className="block rounded-xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-950">
                              {estimate.title}
                            </p>

                            <p className="mt-1 text-xs capitalize text-slate-500">
                              {estimate.status}
                            </p>
                          </div>

                          <p className="shrink-0 text-sm font-bold text-slate-950">
                            {formatCurrency(
                              Number(
                                estimate.amount || 0
                              )
                            )}
                          </p>
                        </div>
                      </Link>
                    );
                  })()}
                </div>
              </section>
            )}
          </aside>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  {editingPayment
                    ? "Edit Payment"
                    : "Record Payment"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {job.title}
                </p>
              </div>

              <button
                type="button"
                onClick={closePaymentModal}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-6">
              {paymentError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {paymentError}
                </div>
              )}

              <InputField
                label="Payment Amount"
                type="number"
                value={paymentAmount}
                onChange={setPaymentAmount}
                placeholder="0.00"
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <InputField
                  label="Payment Date"
                  type="date"
                  value={paymentDate}
                  onChange={setPaymentDate}
                />

                <SelectField
                  label="Payment Method"
                  value={paymentMethod}
                  onChange={(value) =>
                    setPaymentMethod(
                      value as PaymentMethod
                    )
                  }
                  placeholder="Select method"
                  options={[
                    {
                      value: "cash",
                      label: "Cash",
                    },
                    {
                      value: "check",
                      label: "Check",
                    },
                    {
                      value: "card",
                      label: "Card",
                    },
                    {
                      value: "bank_transfer",
                      label: "Bank transfer",
                    },
                    {
                      value: "other",
                      label: "Other",
                    },
                  ]}
                />
              </div>

              <SelectField
                label="Payment Status"
                value={paymentRecordStatus}
                onChange={(value) =>
                  setPaymentRecordStatus(
                    value as PaymentRecordStatus
                  )
                }
                placeholder="Select status"
                options={[
                  {
                    value: "completed",
                    label: "Completed",
                  },
                  {
                    value: "pending",
                    label: "Pending",
                  },
                  {
                    value: "failed",
                    label: "Failed",
                  },
                  {
                    value: "refunded",
                    label: "Refunded",
                  },
                ]}
              />

              <InputField
                label="Reference"
                value={paymentReference}
                onChange={setPaymentReference}
                placeholder="Check #, transaction ID, etc."
              />

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Notes
                </label>

                <textarea
                  value={paymentNotes}
                  onChange={(event) =>
                    setPaymentNotes(event.target.value)
                  }
                  rows={4}
                  placeholder="Add payment notes..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closePaymentModal}
                disabled={savingPayment}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={savePayment}
                disabled={savingPayment}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {savingPayment
                  ? "Saving..."
                  : editingPayment
                  ? "Save Changes"
                  : "Record Payment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Trash2 className="h-5 w-5" />
            </div>

            <h2 className="mt-5 text-lg font-bold text-slate-950">
              Delete this job?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              This will permanently delete{" "}
              <span className="font-semibold text-slate-700">
                {job.title}
              </span>
              . This action cannot be undone.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  setShowDeleteModal(false)
                }
                disabled={deleting}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={deleteJob}
                disabled={deleting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? "Deleting..." : "Delete Job"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function FinancialCard({
  label,
  value,
  icon,
  emphasis = false,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
        {icon}
      </div>

      <p className="text-sm font-medium text-slate-500">
        {label}
      </p>

      <p
        className={`mt-1 text-2xl font-bold tracking-tight ${
          emphasis
            ? "text-amber-600"
            : "text-slate-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function InfoItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
        {icon}
        {label}
      </div>

      <p className="text-sm font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function TimelineItem({
  icon,
  title,
  date,
  last = false,
}: {
  icon: ReactNode;
  title: string;
  date: string;
  last?: boolean;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600">
          {icon}
        </div>

        {!last && (
          <div className="mt-2 h-full min-h-8 w-px bg-slate-200" />
        )}
      </div>

      <div className="pb-6">
        <p className="text-sm font-semibold text-slate-900">
          {title}
        </p>

        <p className="mt-1 text-xs text-slate-500">
          {date}
        </p>
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: {
    value: string;
    label: string;
  }[];
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-800">
        {label}
      </label>

      <div className="relative">
        <select
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 pr-10 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
        >
          <option value="">{placeholder}</option>

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
    </div>
  );
}

function InputField({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-800">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
      />
    </div>
  );
}