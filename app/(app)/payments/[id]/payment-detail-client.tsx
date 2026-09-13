"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Edit3,
  FileText,
  Mail,
  Phone,
  Receipt,
  Trash2,
  UserRound,
  WalletCards,
  XCircle,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type PaymentStatus =
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
  payment: Payment;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatDate(
  value: string | null | undefined,
  includeTime = false
) {
  if (!value) return "—";

  const date = new Date(
    value.includes("T")
      ? value
      : `${value}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) return "—";

  if (includeTime) {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getLeadName(
  lead: Lead | null | undefined
) {
  if (!lead) return "No customer";

  const name =
    `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim();

  return name || "Unnamed customer";
}

function getInitials(
  lead: Lead | null | undefined
) {
  const name = getLeadName(lead);

  if (
    name === "No customer" ||
    name === "Unnamed customer"
  ) {
    return "?";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getMethodLabel(
  method: PaymentMethod
) {
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

function getMethodIcon(
  method: PaymentMethod
) {
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

function getStatusLabel(
  status: PaymentStatus
) {
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

function getStatusClasses(
  status: PaymentStatus
) {
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

function getStatusIcon(
  status: PaymentStatus
) {
  switch (status) {
    case "completed":
      return CheckCircle2;
    case "failed":
      return XCircle;
    default:
      return Receipt;
  }
}

export default function PaymentDetailClient({
  payment: initialPayment,
}: Props) {
  const supabase = createClient();

  const [payment, setPayment] =
    useState<Payment>(initialPayment);

  const [showDeleteModal, setShowDeleteModal] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const [error, setError] =
    useState("");

  const MethodIcon = getMethodIcon(
    payment.payment_method
  );

  const StatusIcon = getStatusIcon(
    payment.status
  );

  const customerName = getLeadName(
    payment.leads
  );

  async function deletePayment() {
    try {
      setDeleting(true);
      setError("");

      const { error: rpcError } =
        await supabase.rpc(
          "delete_payment",
          {
            p_payment_id: payment.id,
          }
        );

      if (rpcError) {
        throw rpcError;
      }

      window.location.href = "/payments";
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message ||
          "Something went wrong while deleting the payment."
      );

      setDeleting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-8 lg:px-8">

        {/* Back */}
        <div className="mb-6">
          <Link
            href="/payments"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Payments
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-500">
              <Receipt className="h-4 w-4" />
              Payment Record
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                {formatCurrency(
                  Number(payment.amount || 0)
                )}
              </h1>

              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${getStatusClasses(
                  payment.status
                )}`}
              >
                <StatusIcon className="h-3.5 w-3.5" />
                {getStatusLabel(payment.status)}
              </span>
            </div>

            <p className="mt-2 text-sm text-slate-500">
              Recorded on{" "}
              {formatDate(payment.created_at, true)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/payments/${payment.id}?edit=true`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <Edit3 className="h-4 w-4" />
              Edit
            </Link>

            <button
              type="button"
              onClick={() =>
                setShowDeleteModal(true)
              }
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Main Grid */}
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">

          {/* Left */}
          <div className="space-y-6">

            {/* Payment Overview */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="font-semibold text-slate-950">
                  Payment Details
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Transaction information and payment status.
                </p>
              </div>

              <div className="grid gap-6 px-6 py-6 sm:grid-cols-2">

                <DetailItem
                  label="Amount"
                  value={formatCurrency(
                    Number(payment.amount || 0)
                  )}
                  large
                />

                <DetailItem
                  label="Status"
                  value={
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusClasses(
                        payment.status
                      )}`}
                    >
                      {getStatusLabel(
                        payment.status
                      )}
                    </span>
                  }
                />

                <DetailItem
                  label="Payment Date"
                  value={
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-slate-400" />
                      {formatDate(
                        payment.payment_date
                      )}
                    </span>
                  }
                />

                <DetailItem
                  label="Payment Method"
                  value={
                    <span className="inline-flex items-center gap-2">
                      <MethodIcon className="h-4 w-4 text-slate-400" />
                      {getMethodLabel(
                        payment.payment_method
                      )}
                    </span>
                  }
                />

                <DetailItem
                  label="Reference"
                  value={
                    payment.reference || "No reference"
                  }
                />

                <DetailItem
                  label="Payment ID"
                  value={
                    <span className="break-all font-mono text-xs">
                      {payment.id}
                    </span>
                  }
                />
              </div>
            </section>

            {/* Customer */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="font-semibold text-slate-950">
                  Customer
                </h2>
              </div>

              <div className="p-6">
                {payment.leads ? (
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                        {getInitials(
                          payment.leads
                        )}
                      </div>

                      <div>
                        <Link
                          href={`/leads/${payment.leads.id}`}
                          className="text-base font-bold text-slate-950 hover:text-slate-600"
                        >
                          {customerName}
                        </Link>

                        <div className="mt-1 space-y-1">
                          {payment.leads.email && (
                            <p className="flex items-center gap-2 text-sm text-slate-500">
                              <Mail className="h-3.5 w-3.5" />
                              {payment.leads.email}
                            </p>
                          )}

                          {payment.leads.phone && (
                            <p className="flex items-center gap-2 text-sm text-slate-500">
                              <Phone className="h-3.5 w-3.5" />
                              {payment.leads.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/leads/${payment.leads.id}`}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <UserRound className="h-4 w-4" />
                      View Customer
                    </Link>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <UserRound className="h-5 w-5 text-slate-400" />
                    No customer is linked to this payment.
                  </div>
                )}
              </div>
            </section>

            {/* Notes */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="font-semibold text-slate-950">
                  Notes
                </h2>
              </div>

              <div className="p-6">
                {payment.notes ? (
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {payment.notes}
                  </p>
                ) : (
                  <p className="text-sm text-slate-400">
                    No notes were added to this payment.
                  </p>
                )}
              </div>
            </section>
          </div>

          {/* Right */}
          <div className="space-y-6">

            {/* Job */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="font-semibold text-slate-950">
                  Linked Job
                </h2>
              </div>

              <div className="p-6">
                {payment.jobs ? (
                  <div>
                    <div className="mb-5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Job
                      </p>

                      <Link
                        href={`/jobs/${payment.jobs.id}`}
                        className="mt-1 block text-base font-bold text-slate-950 hover:text-slate-600"
                      >
                        {payment.jobs.title}
                      </Link>
                    </div>

                    <div className="space-y-4">
                      <InfoRow
                        label="Job Value"
                        value={formatCurrency(
                          Number(
                            payment.jobs.amount || 0
                          )
                        )}
                      />

                      <InfoRow
                        label="Job Status"
                        value={formatSimpleStatus(
                          payment.jobs.status
                        )}
                      />

                      <InfoRow
                        label="Payment Status"
                        value={formatSimpleStatus(
                          payment.jobs.payment_status
                        )}
                      />
                    </div>

                    <Link
                      href={`/jobs/${payment.jobs.id}`}
                      className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      View Job
                    </Link>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                      <FileText className="h-6 w-6" />
                    </div>

                    <p className="text-sm font-semibold text-slate-900">
                      No job linked
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      This payment isn't currently associated with a job.
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Record Information */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="font-semibold text-slate-950">
                  Record Information
                </h2>
              </div>

              <div className="space-y-4 p-6">
                <InfoRow
                  label="Created"
                  value={formatDate(
                    payment.created_at,
                    true
                  )}
                />

                <InfoRow
                  label="Last Updated"
                  value={formatDate(
                    payment.updated_at,
                    true
                  )}
                />

                <InfoRow
                  label="Payment ID"
                  value={
                    <span className="font-mono text-xs">
                      {payment.id.slice(0, 8)}...
                    </span>
                  }
                />
              </div>
            </section>

            {/* Quick Summary */}
            <section className="rounded-2xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Payment Summary
              </p>

              <p className="mt-2 text-3xl font-bold tracking-tight">
                {formatCurrency(
                  Number(payment.amount || 0)
                )}
              </p>

              <div className="mt-5 flex items-center gap-2 text-sm text-slate-300">
                <MethodIcon className="h-4 w-4" />
                {getMethodLabel(
                  payment.payment_method
                )}
              </div>

              <div className="mt-2 flex items-center gap-2 text-sm text-slate-300">
                <CalendarDays className="h-4 w-4" />
                {formatDate(
                  payment.payment_date
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Delete Payment
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  This action cannot be undone.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowDeleteModal(false)
                }
                disabled={deleting}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-6">
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-800">
                  You're about to permanently delete the payment for{" "}
                  <span className="font-bold">
                    {formatCurrency(
                      Number(payment.amount || 0)
                    )}
                  </span>
                  .
                </p>

                <p className="mt-2 text-xs leading-5 text-red-700">
                  The payment record will be removed from Trackpr and
                  your job's financial history.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  setShowDeleteModal(false)
                }
                disabled={deleting}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={deletePayment}
                disabled={deleting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                {deleting
                  ? "Deleting..."
                  : "Delete Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function DetailItem({
  label,
  value,
  large = false,
}: {
  label: string;
  value: React.ReactNode;
  large?: boolean;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <div
        className={
          large
            ? "text-xl font-bold text-slate-950"
            : "text-sm font-medium text-slate-700"
        }
      >
        {value}
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span className="text-right text-sm font-semibold text-slate-800">
        {value}
      </span>
    </div>
  );
}

function formatSimpleStatus(
  value: string | null | undefined
) {
  if (!value) return "—";

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}