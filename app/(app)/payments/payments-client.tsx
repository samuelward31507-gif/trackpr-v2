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
  WalletCards,
  X,
  ArrowUpRight,
  CircleDollarSign,
  TrendingUp,
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

  const [paymentList, setPaymentList] =
    useState<Payment[]>(payments);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"all" | PaymentStatus>("all");
  const [methodFilter, setMethodFilter] =
    useState<"all" | PaymentMethod>("all");

  const [showModal, setShowModal] = useState(false);
  const [editingPayment, setEditingPayment] =
    useState<Payment | null>(null);

  const [amount, setAmount] = useState("");
  const [jobId, setJobId] = useState("");
  const [leadId, setLeadId] = useState("");
  const [paymentDate, setPaymentDate] =
    useState(getTodayDate());
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

    const pendingPayments = paymentList.filter(
      (payment) => payment.status === "pending"
    );

    const refundedPayments = paymentList.filter(
      (payment) => payment.status === "refunded"
    );

    const totalCollected = completedPayments.reduce(
      (sum, payment) =>
        sum + Number(payment.amount || 0),
      0
    );

    const totalPending = pendingPayments.reduce(
      (sum, payment) =>
        sum + Number(payment.amount || 0),
      0
    );

    const totalRefunded = refundedPayments.reduce(
      (sum, payment) =>
        sum + Number(payment.amount || 0),
      0
    );

    const totalJobValue = jobs.reduce(
      (sum, job) =>
        sum + Number(job.amount || 0),
      0
    );

    const outstanding = Math.max(
      totalJobValue - totalCollected,
      0
    );

    const now = new Date();

    const thisMonth = completedPayments
      .filter((payment) => {
        const date = new Date(
          `${payment.payment_date}T00:00:00`
        );

        return (
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear()
        );
      })
      .reduce(
        (sum, payment) =>
          sum + Number(payment.amount || 0),
        0
      );

    const collectionRate =
      totalJobValue > 0
        ? Math.min(
            (totalCollected / totalJobValue) * 100,
            100
          )
        : 0;

    return {
      totalCollected,
      totalPending,
      totalRefunded,
      outstanding,
      thisMonth,
      count: paymentList.length,
      completedCount: completedPayments.length,
      collectionRate,
    };
  }, [paymentList, jobs]);

  const filteredPayments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return paymentList.filter((payment) => {
      const customer = getLeadName(
        payment.leads
      ).toLowerCase();

      const job =
        payment.jobs?.title?.toLowerCase() ?? "";

      const ref =
        payment.reference?.toLowerCase() ?? "";

      const matchesSearch =
        !query ||
        customer.includes(query) ||
        job.includes(query) ||
        ref.includes(query) ||
        getMethodLabel(
          payment.payment_method
        )
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

  const hasFilters =
    Boolean(search) ||
    statusFilter !== "all" ||
    methodFilter !== "all";

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

    const selectedJob = jobs.find(
      (job) => job.id === value
    );

    if (selectedJob?.lead_id) {
      setLeadId(selectedJob.lead_id);
    }
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setMethodFilter("all");
  }

  async function savePayment() {
    setError("");

    const numericAmount = Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      setError(
        "Enter a payment amount greater than $0."
      );
      return;
    }

    if (!paymentDate) {
      setError("Select a payment date.");
      return;
    }

    try {
      setSaving(true);

      if (editingPayment) {
        const { data, error: rpcError } =
          await supabase.rpc("update_payment", {
            p_payment_id: editingPayment.id,
            p_job_id: jobId || null,
            p_lead_id: leadId || null,
            p_amount: numericAmount,
            p_payment_date: paymentDate,
            p_payment_method: paymentMethod,
            p_status: status,
            p_reference:
              reference.trim() || null,
            p_notes: notes.trim() || null,
          });

        if (rpcError) {
          throw rpcError;
        }

        const updatedPayment: Payment = {
          ...(data as Payment),
          jobs:
            jobs.find(
              (job) => job.id === jobId
            ) ?? null,
          leads:
            leads.find(
              (lead) => lead.id === leadId
            ) ?? null,
        };

        setPaymentList((current) =>
          current.map((payment) =>
            payment.id === editingPayment.id
              ? updatedPayment
              : payment
          )
        );
      } else {
        const { data, error: rpcError } =
          await supabase.rpc("create_payment", {
            p_job_id: jobId || null,
            p_lead_id: leadId || null,
            p_amount: numericAmount,
            p_payment_date: paymentDate,
            p_payment_method: paymentMethod,
            p_status: status,
            p_reference:
              reference.trim() || null,
            p_notes: notes.trim() || null,
          });

        if (rpcError) {
          throw rpcError;
        }

        const newPayment: Payment = {
          ...(data as Payment),
          jobs:
            jobs.find(
              (job) => job.id === jobId
            ) ?? null,
          leads:
            leads.find(
              (lead) => lead.id === leadId
            ) ?? null,
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

      const { error: rpcError } =
        await supabase.rpc("delete_payment", {
          p_payment_id: payment.id,
        });

      if (rpcError) {
        throw rpcError;
      }

      setPaymentList((current) =>
        current.filter(
          (item) => item.id !== payment.id
        )
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
      <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
        {/* Header */}
        <section className="mb-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-sm">
                <CircleDollarSign className="h-3.5 w-3.5 text-slate-700" />
                Financial operations
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Payments
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                Track collections, outstanding revenue, and
                every payment moving through your business.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.99]"
            >
              <Plus className="h-4 w-4" />
              Record Payment
            </button>
          </div>
        </section>

        {/* Error */}
        {error && !showModal && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Primary Metrics */}
        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total Collected"
            value={formatCurrency(
              totals.totalCollected
            )}
            icon={
              <DollarSign className="h-5 w-5" />
            }
            description={`${totals.completedCount} completed ${
              totals.completedCount === 1
                ? "payment"
                : "payments"
            }`}
            accent="emerald"
          />

          <MetricCard
            label="Outstanding"
            value={formatCurrency(
              totals.outstanding
            )}
            icon={
              <WalletCards className="h-5 w-5" />
            }
            description="Remaining job value"
            accent="amber"
          />

          <MetricCard
            label="This Month"
            value={formatCurrency(
              totals.thisMonth
            )}
            icon={
              <TrendingUp className="h-5 w-5" />
            }
            description="Completed collections"
            accent="blue"
          />

          <MetricCard
            label="Pending"
            value={formatCurrency(
              totals.totalPending
            )}
            icon={
              <Receipt className="h-5 w-5" />
            }
            description="Payments awaiting completion"
            accent="slate"
          />
        </section>

        {/* Collection Overview */}
        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <ArrowUpRight className="h-4 w-4" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    Collection overview
                  </p>

                  <p className="text-xs text-slate-500">
                    Collected vs. total job value
                  </p>
                </div>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-2xl font-bold tracking-tight text-slate-950">
                {Math.round(
                  totals.collectionRate
                )}
                %
              </p>

              <p className="text-xs text-slate-500">
                collection rate
              </p>
            </div>
          </div>

          <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-slate-950 transition-all duration-500"
              style={{
                width: `${totals.collectionRate}%`,
              }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="font-medium text-slate-600">
              {formatCurrency(
                totals.totalCollected
              )}{" "}
              collected
            </span>

            <span className="text-slate-400">
              {formatCurrency(
                totals.outstanding
              )}{" "}
              remaining
            </span>
          </div>
        </section>

        {/* Filters */}
        <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search customers, jobs, references..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:flex">
              <FilterSelect
                value={statusFilter}
                onChange={(value) =>
                  setStatusFilter(
                    value as
                      | "all"
                      | PaymentStatus
                  )
                }
                options={[
                  {
                    value: "all",
                    label: "All statuses",
                  },
                  ...paymentStatuses.map(
                    (value) => ({
                      value,
                      label: getStatusLabel(
                        value
                      ),
                    })
                  ),
                ]}
              />

              <FilterSelect
                value={methodFilter}
                onChange={(value) =>
                  setMethodFilter(
                    value as
                      | "all"
                      | PaymentMethod
                  )
                }
                options={[
                  {
                    value: "all",
                    label: "All methods",
                  },
                  ...paymentMethods.map(
                    (value) => ({
                      value,
                      label: getMethodLabel(
                        value
                      ),
                    })
                  ),
                ]}
              />
            </div>
          </div>

          {hasFilters && (
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
              <p className="text-xs text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-700">
                  {filteredPayments.length}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-700">
                  {paymentList.length}
                </span>{" "}
                payments
              </p>

              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-semibold text-slate-600 transition hover:text-slate-950"
              >
                Clear filters
              </button>
            </div>
          )}
        </section>

        {/* Desktop */}
        <section className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-slate-500" />

                <h2 className="font-semibold text-slate-950">
                  Payment history
                </h2>
              </div>

              <p className="mt-1 text-xs text-slate-500">
                {filteredPayments.length}{" "}
                {filteredPayments.length === 1
                  ? "payment"
                  : "payments"}{" "}
                shown
              </p>
            </div>

            <div className="hidden items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500 lg:flex">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Completed collections
            </div>
          </div>

          {filteredPayments.length === 0 ? (
            <EmptyState
              hasFilters={hasFilters}
              onRecordPayment={openCreateModal}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-left">
                    <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      Customer
                    </th>

                    <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      Job
                    </th>

                    <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      Amount
                    </th>

                    <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      Date
                    </th>

                    <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      Method
                    </th>

                    <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      Status
                    </th>

                    <th className="px-6 py-3.5 text-right text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredPayments.map(
                    (payment) => {
                      const MethodIcon =
                        getMethodIcon(
                          payment.payment_method
                        );

                      return (
                        <tr
                          key={payment.id}
                          className="group transition hover:bg-slate-50/60"
                        >
                          <td className="px-6 py-4.5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600">
                                {getInitials(
                                  payment.leads
                                )}
                              </div>

                              <div className="min-w-0">
                                {payment.lead_id ? (
                                  <Link
                                    href={`/leads/${payment.lead_id}`}
                                    className="block max-w-[190px] truncate text-sm font-semibold text-slate-900 transition hover:text-slate-600"
                                  >
                                    {getLeadName(
                                      payment.leads
                                    )}
                                  </Link>
                                ) : (
                                  <p className="max-w-[190px] truncate text-sm font-semibold text-slate-900">
                                    {getLeadName(
                                      payment.leads
                                    )}
                                  </p>
                                )}

                                {payment.reference && (
                                  <p className="mt-1 max-w-[190px] truncate text-xs text-slate-400">
                                    Ref:{" "}
                                    {
                                      payment.reference
                                    }
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4.5">
                            {payment.jobs ? (
                              <Link
                                href={`/jobs/${payment.jobs.id}`}
                                className="block max-w-[220px] truncate text-sm font-medium text-slate-700 transition hover:text-slate-950"
                              >
                                {payment.jobs.title}
                              </Link>
                            ) : (
                              <span className="text-sm text-slate-400">
                                No job linked
                              </span>
                            )}
                          </td>

                          <td className="px-6 py-4.5">
                            <span className="text-sm font-bold tracking-tight text-slate-950">
                              {formatCurrency(
                                Number(
                                  payment.amount ||
                                    0
                                )
                              )}
                            </span>
                          </td>

                          <td className="px-6 py-4.5">
                            <span className="text-sm text-slate-600">
                              {formatDate(
                                payment.payment_date
                              )}
                            </span>
                          </td>

                          <td className="px-6 py-4.5">
                            <div className="inline-flex items-center gap-2 text-sm text-slate-600">
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100">
                                <MethodIcon className="h-3.5 w-3.5 text-slate-500" />
                              </div>

                              {getMethodLabel(
                                payment.payment_method
                              )}
                            </div>
                          </td>

                          <td className="px-6 py-4.5">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold ring-1 ring-inset ${getStatusClasses(
                                payment.status
                              )}`}
                            >
                              {payment.status ===
                                "completed" && (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              )}

                              {getStatusLabel(
                                payment.status
                              )}
                            </span>
                          </td>

                          <td className="px-6 py-4.5">
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
                                  openEditModal(
                                    payment
                                  )
                                }
                                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                                title="Edit payment"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  deletePayment(
                                    payment
                                  )
                                }
                                disabled={
                                  deleting
                                }
                                className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                                title="Delete payment"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Mobile */}
        <section className="space-y-3 md:hidden">
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-slate-500" />

                  <h2 className="font-semibold text-slate-950">
                    Payment history
                  </h2>
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  {filteredPayments.length}{" "}
                  {filteredPayments.length === 1
                    ? "payment"
                    : "payments"}{" "}
                  shown
                </p>
              </div>

              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                {paymentList.length}
              </span>
            </div>
          </div>

          {filteredPayments.length === 0 ? (
            <EmptyState
              hasFilters={hasFilters}
              onRecordPayment={openCreateModal}
            />
          ) : (
            filteredPayments.map(
              (payment) => {
                const MethodIcon =
                  getMethodIcon(
                    payment.payment_method
                  );

                return (
                  <article
                    key={payment.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600">
                          {getInitials(
                            payment.leads
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-950">
                            {getLeadName(
                              payment.leads
                            )}
                          </p>

                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {payment.jobs?.title ??
                              "No job linked"}
                          </p>
                        </div>
                      </div>

                      <span className="shrink-0 text-base font-bold tracking-tight text-slate-950">
                        {formatCurrency(
                          Number(
                            payment.amount || 0
                          )
                        )}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusClasses(
                          payment.status
                        )}`}
                      >
                        {payment.status ===
                          "completed" && (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}

                        {getStatusLabel(
                          payment.status
                        )}
                      </span>

                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        <MethodIcon className="h-3.5 w-3.5" />
                        {getMethodLabel(
                          payment.payment_method
                        )}
                      </span>

                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatDate(
                          payment.payment_date
                        )}
                      </span>
                    </div>

                    {payment.reference && (
                      <div className="mt-4 rounded-xl bg-slate-50 px-3.5 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          Reference
                        </p>

                        <p className="mt-1 break-all text-xs font-medium text-slate-700">
                          {payment.reference}
                        </p>
                      </div>
                    )}

                    <div className="mt-4 flex items-center justify-end gap-1 border-t border-slate-100 pt-4">
                      <Link
                        href={`/payments/${payment.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        View
                      </Link>

                      <button
                        type="button"
                        onClick={() =>
                          openEditModal(
                            payment
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          deletePayment(
                            payment
                          )
                        }
                        disabled={
                          deleting
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </article>
                );
              }
            )
          )}
        </section>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              closeModal();
            }
          }}
        >
          <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-5 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white">
                  {editingPayment ? (
                    <Edit3 className="h-4 w-4" />
                  ) : (
                    <Receipt className="h-4 w-4" />
                  )}
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-950">
                    {editingPayment
                      ? "Edit Payment"
                      : "Record Payment"}
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500">
                    {editingPayment
                      ? "Update the payment details below."
                      : "Add a completed or pending payment."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="max-h-[calc(92vh-145px)] overflow-y-auto">
              <div className="space-y-6 p-5 sm:p-6">
                {error && (
                  <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Amount */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                  <label className="mb-2 block text-sm font-semibold text-slate-800">
                    Payment amount
                  </label>

                  <div className="relative">
                    <DollarSign className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={amount}
                      onChange={(event) =>
                        setAmount(
                          event.target.value
                        )
                      }
                      placeholder="0.00"
                      autoFocus
                      className="h-14 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-lg font-semibold text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    />
                  </div>

                  <p className="mt-2 text-xs text-slate-400">
                    Enter the actual amount received.
                  </p>
                </div>

                {/* Job / Customer */}
                <div>
                  <SectionHeading
                    title="Payment assignment"
                    description="Connect the payment to the customer and job."
                  />

                  <div className="mt-4 grid gap-5 sm:grid-cols-2">
                    <SelectField
                      label="Job"
                      value={jobId}
                      onChange={handleJobChange}
                      placeholder="Select a job"
                      options={jobs.map(
                        (job) => ({
                          value: job.id,
                          label: `${job.title} — ${formatCurrency(
                            Number(
                              job.amount ||
                                0
                            )
                          )}`,
                        })
                      )}
                    />

                    <SelectField
                      label="Customer"
                      value={leadId}
                      onChange={setLeadId}
                      placeholder="Select a customer"
                      options={leads.map(
                        (lead) => ({
                          value: lead.id,
                          label: getLeadName(
                            lead
                          ),
                        })
                      )}
                    />
                  </div>
                </div>

                {/* Payment Details */}
                <div>
                  <SectionHeading
                    title="Payment details"
                    description="Set when the payment happened and how it was received."
                  />

                  <div className="mt-4 grid gap-5 sm:grid-cols-3">
                    <InputField
                      label="Payment date"
                      type="date"
                      value={paymentDate}
                      onChange={
                        setPaymentDate
                      }
                    />

                    <SelectField
                      label="Payment method"
                      value={
                        paymentMethod
                      }
                      onChange={(value) =>
                        setPaymentMethod(
                          value as PaymentMethod
                        )
                      }
                      placeholder="Select method"
                      options={paymentMethods.map(
                        (method) => ({
                          value: method,
                          label: getMethodLabel(
                            method
                          ),
                        })
                      )}
                    />

                    <SelectField
                      label="Status"
                      value={status}
                      onChange={(value) =>
                        setStatus(
                          value as PaymentStatus
                        )
                      }
                      placeholder="Select status"
                      options={paymentStatuses.map(
                        (value) => ({
                          value,
                          label: getStatusLabel(
                            value
                          ),
                        })
                      )}
                    />
                  </div>
                </div>

                {/* Reference */}
                <div>
                  <SectionHeading
                    title="Reference"
                    description="Optional transaction or payment reference."
                  />

                  <div className="mt-4">
                    <InputField
                      label="Reference"
                      value={reference}
                      onChange={
                        setReference
                      }
                      placeholder="Check #, transaction ID, confirmation..."
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <SectionHeading
                    title="Notes"
                    description="Add internal context about this payment."
                  />

                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-semibold text-slate-800">
                      Payment notes
                    </label>

                    <textarea
                      value={notes}
                      onChange={(event) =>
                        setNotes(
                          event.target.value
                        )
                      }
                      rows={4}
                      placeholder="Add any useful payment notes..."
                      className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={savePayment}
                disabled={saving}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Saving...
                  </>
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
  accent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  description: string;
  accent:
    | "emerald"
    | "amber"
    | "blue"
    | "slate";
}) {
  const accentClasses = {
    emerald:
      "bg-emerald-50 text-emerald-700",
    amber:
      "bg-amber-50 text-amber-700",
    blue:
      "bg-blue-50 text-blue-700",
    slate:
      "bg-slate-100 text-slate-700",
  };

  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-5 flex items-center justify-between">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${accentClasses[accent]}`}
        >
          {icon}
        </div>

        <div className="h-1.5 w-1.5 rounded-full bg-slate-200 transition group-hover:bg-slate-400" />
      </div>

      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
        {value}
      </p>

      <p className="mt-1.5 text-xs text-slate-400">
        {description}
      </p>
    </div>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h3 className="text-sm font-bold text-slate-950">
        {title}
      </h3>

      <p className="mt-1 text-xs text-slate-500">
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
        className="h-11 min-w-[155px] appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 pr-10 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100"
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
          className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 pr-10 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100"
        >
          <option value="">
            {placeholder}
          </option>

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
        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100"
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
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <Receipt className="h-7 w-7" />
      </div>

      <h3 className="text-base font-bold text-slate-950">
        {hasFilters
          ? "No payments found"
          : "No payments yet"}
      </h3>

      <p className="mt-1.5 max-w-sm text-sm leading-6 text-slate-500">
        {hasFilters
          ? "Try adjusting your search or filters to find what you're looking for."
          : "Record your first payment to start tracking collections and revenue."}
      </p>

      {!hasFilters && (
        <button
          type="button"
          onClick={onRecordPayment}
          className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          Record Payment
        </button>
      )}
    </div>
  );
}