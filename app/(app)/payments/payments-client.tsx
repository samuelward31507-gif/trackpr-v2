"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  DollarSign,
  Edit3,
  FileText,
  Plus,
  Receipt,
  Search,
  Trash2,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type PaymentStatus = "pending" | "completed" | "failed" | "refunded";

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

type Job = {
  id: string;
  title: string;
  amount: number | null;
  status: string;
  payment_status: string;
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
  status: PaymentStatus;
  reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  jobs: Job | null;
  leads: Lead | null;
};

type Props = {
  payments: Payment[];
  jobs: Job[];
  leads: Lead[];
};

const paymentMethods: PaymentMethod[] = [
  "cash",
  "check",
  "card",
  "bank_transfer",
  "other",
];

const paymentStatuses: PaymentStatus[] = [
  "pending",
  "completed",
  "failed",
  "refunded",
];

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

function getStatusLabel(status: PaymentStatus) {
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

function getStatusClasses(status: PaymentStatus) {
  switch (status) {
    case "completed":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "pending":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "failed":
      return "bg-red-50 text-red-700 ring-red-200";
    case "refunded":
      return "bg-slate-100 text-slate-600 ring-slate-200";
    default:
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
}

function getMethodIcon(method: PaymentMethod) {
  switch (method) {
    case "cash":
      return Banknote;
    case "card":
      return CreditCard;
    case "bank_transfer":
      return WalletCards;
    case "check":
      return FileText;
    default:
      return Receipt;
  }
}

export default function PaymentsClient({
  payments,
  jobs,
  leads,
}: Props) {
  const supabase = createClient();

  const [paymentList, setPaymentList] = useState<Payment[]>(payments);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | PaymentStatus>(
    "all"
  );
  const [methodFilter, setMethodFilter] = useState<
    "all" | PaymentMethod
  >("all");

  const [showModal, setShowModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(
    null
  );

  const [amount, setAmount] = useState("");
  const [jobId, setJobId] = useState("");
  const [leadId, setLeadId] = useState("");
  const [paymentDate, setPaymentDate] = useState(getTodayDate());
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("card");
  const [status, setStatus] =
    useState<PaymentStatus>("completed");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const totals = useMemo(() => {
    const completedPayments = paymentList.filter(
      (payment) => payment.status === "completed"
    );

    const totalCollected = completedPayments.reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0
    );

    const totalJobValue = jobs.reduce(
      (sum, job) => sum + Number(job.amount || 0),
      0
    );

    const outstanding = Math.max(
      totalJobValue - totalCollected,
      0
    );

    const now = new Date();

    const thisMonth = completedPayments
      .filter((payment) => {
        const date = new Date(`${payment.payment_date}T00:00:00`);

        return (
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear()
        );
      })
      .reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0
      );

    return {
      totalCollected,
      outstanding,
      thisMonth,
      count: paymentList.length,
    };
  }, [paymentList, jobs]);

  const filteredPayments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return paymentList.filter((payment) => {
      const customer = getLeadName(payment.leads).toLowerCase();
      const job = payment.jobs?.title?.toLowerCase() ?? "";
      const ref = payment.reference?.toLowerCase() ?? "";

      const matchesSearch =
        !query ||
        customer.includes(query) ||
        job.includes(query) ||
        ref.includes(query) ||
        getMethodLabel(payment.payment_method)
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        payment.status === statusFilter;

      const matchesMethod =
        methodFilter === "all" ||
        payment.payment_method === methodFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesMethod
      );
    });
  }, [
    paymentList,
    search,
    statusFilter,
    methodFilter,
  ]);

  function resetForm() {
    setAmount("");
    setJobId("");
    setLeadId("");
    setPaymentDate(getTodayDate());
    setPaymentMethod("card");
    setStatus("completed");
    setReference("");
    setNotes("");
    setError("");
  }

  function openCreateModal() {
    setEditingPayment(null);
    resetForm();
    setShowModal(true);
  }

  function openEditModal(payment: Payment) {
    setEditingPayment(payment);

    setAmount(String(payment.amount ?? ""));
    setJobId(payment.job_id ?? "");
    setLeadId(payment.lead_id ?? "");
    setPaymentDate(payment.payment_date);
    setPaymentMethod(payment.payment_method);
    setStatus(payment.status);
    setReference(payment.reference ?? "");
    setNotes(payment.notes ?? "");
    setError("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    setEditingPayment(null);
    resetForm();
  }

  function handleJobChange(value: string) {
    setJobId(value);

    if (!value) return;

    const selectedJob = jobs.find((job) => job.id === value);

    if (selectedJob?.lead_id) {
      setLeadId(selectedJob.lead_id);
    }
  }

  async function savePayment() {
    setError("");

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter a payment amount greater than $0.");
      return;
    }

    if (!paymentDate) {
      setError("Select a payment date.");
      return;
    }

    try {
      setSaving(true);

      if (editingPayment) {
        const { data, error: rpcError } = await supabase.rpc(
          "update_payment",
          {
            p_payment_id: editingPayment.id,
            p_job_id: jobId || null,
            p_lead_id: leadId || null,
            p_amount: numericAmount,
            p_payment_date: paymentDate,
            p_payment_method: paymentMethod,
            p_status: status,
            p_reference: reference.trim() || null,
            p_notes: notes.trim() || null,
          }
        );

        if (rpcError) {
          throw rpcError;
        }

        const updatedPayment: Payment = {
          ...(data as Payment),
          jobs:
            jobs.find((job) => job.id === jobId) ??
            null,
          leads:
            leads.find((lead) => lead.id === leadId) ??
            null,
        };

        setPaymentList((current) =>
          current.map((payment) =>
            payment.id === editingPayment.id
              ? updatedPayment
              : payment
          )
        );
      } else {
        const { data, error: rpcError } = await supabase.rpc(
          "create_payment",
          {
            p_job_id: jobId || null,
            p_lead_id: leadId || null,
            p_amount: numericAmount,
            p_payment_date: paymentDate,
            p_payment_method: paymentMethod,
            p_status: status,
            p_reference: reference.trim() || null,
            p_notes: notes.trim() || null,
          }
        );

        if (rpcError) {
          throw rpcError;
        }

        const newPayment: Payment = {
          ...(data as Payment),
          jobs:
            jobs.find((job) => job.id === jobId) ??
            null,
          leads:
            leads.find((lead) => lead.id === leadId) ??
            null,
        };

        setPaymentList((current) => [
          newPayment,
          ...current,
        ]);
      }

      setShowModal(false);
      setEditingPayment(null);
      resetForm();
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message ||
          "Something went wrong while saving the payment."
      );
    } finally {
      setSaving(false);
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
      setDeleting(true);
      setError("");

      const { error: rpcError } = await supabase.rpc(
        "delete_payment",
        {
          p_payment_id: payment.id,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      setPaymentList((current) =>
        current.filter((item) => item.id !== payment.id)
      );
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message ||
          "Something went wrong while deleting the payment."
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
              <DollarSign className="h-4 w-4" />
              Financials
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Payments
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Track money collected from your jobs and customers.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Record Payment
          </button>
        </div>

        {/* Error */}
        {error && !showModal && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Metrics */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total Collected"
            value={formatCurrency(totals.totalCollected)}
            icon={<DollarSign className="h-5 w-5" />}
            description="Completed payments"
          />

          <MetricCard
            label="Outstanding"
            value={formatCurrency(totals.outstanding)}
            icon={<WalletCards className="h-5 w-5" />}
            description="Estimated unpaid job value"
          />

          <MetricCard
            label="This Month"
            value={formatCurrency(totals.thisMonth)}
            icon={<CalendarDays className="h-5 w-5" />}
            description="Collected this month"
          />

          <MetricCard
            label="Payments"
            value={totals.count.toString()}
            icon={<Receipt className="h-5 w-5" />}
            description="Recorded transactions"
          />
        </div>

        {/* Filters */}
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search payments, customers, jobs..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
              />
            </div>

            <FilterSelect
              value={statusFilter}
              onChange={(value) =>
                setStatusFilter(
                  value as "all" | PaymentStatus
                )
              }
              options={[
                { value: "all", label: "All statuses" },
                ...paymentStatuses.map((value) => ({
                  value,
                  label: getStatusLabel(value),
                })),
              ]}
            />

            <FilterSelect
              value={methodFilter}
              onChange={(value) =>
                setMethodFilter(
                  value as "all" | PaymentMethod
                )
              }
              options={[
                { value: "all", label: "All methods" },
                ...paymentMethods.map((value) => ({
                  value,
                  label: getMethodLabel(value),
                })),
              ]}
            />
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
          <div className="border-b border-slate-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-950">
                  Payment History
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {filteredPayments.length}{" "}
                  {filteredPayments.length === 1
                    ? "payment"
                    : "payments"}{" "}
                  shown
                </p>
              </div>
            </div>
          </div>

          {filteredPayments.length === 0 ? (
            <EmptyState
              hasFilters={
                Boolean(search) ||
                statusFilter !== "all" ||
                methodFilter !== "all"
              }
              onRecordPayment={openCreateModal}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-left">
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Job
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Date
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Method
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredPayments.map((payment) => {
                    const MethodIcon = getMethodIcon(
                      payment.payment_method
                    );

                    return (
                      <tr
                        key={payment.id}
                        className="group transition hover:bg-slate-50/70"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                              {getInitials(payment.leads)}
                            </div>

                            <div className="min-w-0">
                              {payment.lead_id ? (
                                <Link
                                  href={`/leads/${payment.lead_id}`}
                                  className="block truncate text-sm font-semibold text-slate-900 hover:text-slate-600"
                                >
                                  {getLeadName(payment.leads)}
                                </Link>
                              ) : (
                                <p className="truncate text-sm font-semibold text-slate-900">
                                  {getLeadName(payment.leads)}
                                </p>
                              )}

                              {payment.reference && (
                                <p className="mt-0.5 truncate text-xs text-slate-500">
                                  Ref: {payment.reference}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {payment.jobs ? (
                            <Link
                              href={`/jobs/${payment.jobs.id}`}
                              className="text-sm font-medium text-slate-700 hover:text-slate-950"
                            >
                              {payment.jobs.title}
                            </Link>
                          ) : (
                            <span className="text-sm text-slate-400">
                              No job linked
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-slate-950">
                            {formatCurrency(
                              Number(payment.amount || 0)
                            )}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-sm text-slate-600">
                          {formatDate(payment.payment_date)}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <MethodIcon className="h-4 w-4 text-slate-400" />
                            {getMethodLabel(
                              payment.payment_method
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusClasses(
                              payment.status
                            )}`}
                          >
                            {payment.status === "completed" && (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                            {getStatusLabel(payment.status)}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-1 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
  <Link
    href={`/payments/${payment.id}`}
    className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
  >
    View
  </Link>

  <button
    type="button"
    onClick={() =>
      openEditModal(payment)
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
    disabled={deleting}
    className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
    title="Delete payment"
  >
    <Trash2 className="h-4 w-4" />
  </button>
</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Mobile Cards */}
        <div className="space-y-3 md:hidden">
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <h2 className="font-semibold text-slate-950">
              Payment History
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {filteredPayments.length}{" "}
              {filteredPayments.length === 1
                ? "payment"
                : "payments"}{" "}
              shown
            </p>
          </div>

          {filteredPayments.length === 0 ? (
            <EmptyState
              hasFilters={
                Boolean(search) ||
                statusFilter !== "all" ||
                methodFilter !== "all"
              }
              onRecordPayment={openCreateModal}
            />
          ) : (
            filteredPayments.map((payment) => {
              const MethodIcon = getMethodIcon(
                payment.payment_method
              );

              return (
                <div
                  key={payment.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                        {getInitials(payment.leads)}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">
                          {getLeadName(payment.leads)}
                        </p>

                        <p className="truncate text-xs text-slate-500">
                          {payment.jobs?.title ??
                            "No job linked"}
                        </p>
                      </div>
                    </div>

                    <span className="shrink-0 text-base font-bold text-slate-950">
                      {formatCurrency(
                        Number(payment.amount || 0)
                      )}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusClasses(
                        payment.status
                      )}`}
                    >
                      {getStatusLabel(payment.status)}
                    </span>

                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      <MethodIcon className="h-3.5 w-3.5" />
                      {getMethodLabel(
                        payment.payment_method
                      )}
                    </span>

                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDate(payment.payment_date)}
                    </span>
                  </div>

                  {payment.reference && (
                    <p className="mt-3 text-xs text-slate-500">
                      Reference:{" "}
                      <span className="font-medium text-slate-700">
                        {payment.reference}
                      </span>
                    </p>
                  )}

                  <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
  <Link
    href={`/payments/${payment.id}`}
    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
  >
    View
  </Link>

  <button
    type="button"
    onClick={() => openEditModal(payment)}
    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
  >
    <Edit3 className="h-3.5 w-3.5" />
    Edit
  </button>

  <button
    type="button"
    onClick={() => deletePayment(payment)}
    disabled={deleting}
    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
  >
    <Trash2 className="h-3.5 w-3.5" />
    Delete
  </button>
</div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  {editingPayment
                    ? "Edit Payment"
                    : "Record Payment"}
                </h2>

                <p className="mt-0.5 text-sm text-slate-500">
                  {editingPayment
                    ? "Update the payment details below."
                    : "Add a payment to Trackpr."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 p-6">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Payment Amount
                </label>

                <div className="relative">
                  <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(event) =>
                      setAmount(event.target.value)
                    }
                    placeholder="0.00"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </div>
              </div>

              {/* Job / Customer */}
              <div className="grid gap-5 sm:grid-cols-2">
                <SelectField
                  label="Job"
                  value={jobId}
                  onChange={handleJobChange}
                  placeholder="Select a job"
                  options={jobs.map((job) => ({
                    value: job.id,
                    label: `${job.title} — ${formatCurrency(
                      Number(job.amount || 0)
                    )}`,
                  }))}
                />

                <SelectField
                  label="Customer"
                  value={leadId}
                  onChange={setLeadId}
                  placeholder="Select a customer"
                  options={leads.map((lead) => ({
                    value: lead.id,
                    label: getLeadName(lead),
                  }))}
                />
              </div>

              {/* Date / Method / Status */}
              <div className="grid gap-5 sm:grid-cols-3">
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
                  options={paymentMethods.map((method) => ({
                    value: method,
                    label: getMethodLabel(method),
                  }))}
                />

                <SelectField
                  label="Status"
                  value={status}
                  onChange={(value) =>
                    setStatus(value as PaymentStatus)
                  }
                  placeholder="Select status"
                  options={paymentStatuses.map((value) => ({
                    value,
                    label: getStatusLabel(value),
                  }))}
                />
              </div>

              {/* Reference */}
              <InputField
                label="Reference"
                value={reference}
                onChange={setReference}
                placeholder="Check #, transaction ID, etc."
              />

              {/* Notes */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Notes
                </label>

                <textarea
                  value={notes}
                  onChange={(event) =>
                    setNotes(event.target.value)
                  }
                  rows={4}
                  placeholder="Add any useful payment notes..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
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
                onClick={savePayment}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  "Saving..."
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    {editingPayment
                      ? "Save Changes"
                      : "Record Payment"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          {icon}
        </div>
      </div>

      <p className="text-sm font-medium text-slate-500">
        {label}
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
        className="h-11 min-w-[160px] appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 pr-10 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
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
          className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 pr-10 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
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
        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
      />
    </div>
  );
}

function EmptyState({
  hasFilters,
  onRecordPayment,
}: {
  hasFilters: boolean;
  onRecordPayment: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <Receipt className="h-7 w-7" />
      </div>

      <h3 className="text-sm font-semibold text-slate-950">
        {hasFilters
          ? "No payments found"
          : "No payments yet"}
      </h3>

      <p className="mt-1 max-w-sm text-sm text-slate-500">
        {hasFilters
          ? "Try adjusting your search or filters."
          : "Record your first payment to start tracking money collected."}
      </p>

      {!hasFilters && (
        <button
          type="button"
          onClick={onRecordPayment}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          Record Payment
        </button>
      )}
    </div>
  );
}