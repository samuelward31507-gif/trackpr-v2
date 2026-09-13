"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  DollarSign,
  FileText,
  Plus,
  Search,
  Send,
  Target,
  TrendingUp,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Lead = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
};

type EstimateStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "declined"
  | "expired";

type Estimate = {
  id: string;
  organization_id: string;
  lead_id: string;
  title: string;
  amount: number | string;
  status: EstimateStatus;
  estimate_date: string;
  expiration_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  leads: Lead | Lead[] | null;
};

type Props = {
  estimates: Estimate[];
  leads: Lead[];
};

function getLeadName(lead: Lead | null) {
  if (!lead) return "Unknown customer";

  const name = `${lead.first_name ?? ""} ${
    lead.last_name ?? ""
  }`.trim();

  return name || "Unnamed customer";
}

function getInitials(lead: Lead | null) {
  const name = getLeadName(lead);

  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getStatusClass(status: EstimateStatus) {
  switch (status) {
    case "accepted":
      return "bg-emerald-50 text-emerald-700";
    case "sent":
      return "bg-blue-50 text-blue-700";
    case "declined":
      return "bg-red-50 text-red-700";
    case "expired":
      return "bg-amber-50 text-amber-700";
    case "draft":
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export default function EstimatesClient({
  estimates: initialEstimates,
  leads,
}: Props) {
  const supabase = createClient();

  const [estimates, setEstimates] =
    useState<Estimate[]>(initialEstimates);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"all" | EstimateStatus>("all");

  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [leadId, setLeadId] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] =
    useState<EstimateStatus>("draft");

  const [estimateDate, setEstimateDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [expirationDate, setExpirationDate] =
    useState("");

  const [notes, setNotes] = useState("");

  const filteredEstimates = useMemo(() => {
    const query = search.trim().toLowerCase();

    return estimates.filter((estimate) => {
      const lead = Array.isArray(estimate.leads)
        ? estimate.leads[0] ?? null
        : estimate.leads;

      const customerName =
        getLeadName(lead).toLowerCase();

      const matchesSearch =
        !query ||
        estimate.title.toLowerCase().includes(query) ||
        customerName.includes(query) ||
        estimate.status.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        estimate.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [estimates, search, statusFilter]);

  const stats = useMemo(() => {
    const total = estimates.length;

    const draft = estimates.filter(
      (estimate) => estimate.status === "draft"
    ).length;

    const sent = estimates.filter(
      (estimate) => estimate.status === "sent"
    ).length;

    const accepted = estimates.filter(
      (estimate) => estimate.status === "accepted"
    );

    const acceptedRevenue = accepted.reduce(
      (sum, estimate) =>
        sum + (Number(estimate.amount) || 0),
      0
    );

    const pipelineValue = estimates
      .filter(
        (estimate) =>
          estimate.status === "draft" ||
          estimate.status === "sent"
      )
      .reduce(
        (sum, estimate) =>
          sum + (Number(estimate.amount) || 0),
        0
      );

    return {
      total,
      draft,
      sent,
      accepted: accepted.length,
      acceptedRevenue,
      pipelineValue,
    };
  }, [estimates]);

  function resetForm() {
    setTitle("");
    setLeadId("");
    setAmount("");
    setStatus("draft");

    setEstimateDate(
      new Date().toISOString().split("T")[0]
    );

    setExpirationDate("");
    setNotes("");
  }

  async function createEstimate(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!leadId || !title.trim()) {
      return;
    }

    setSaving(true);

    try {
      /*
       * Get the currently authenticated user.
       */
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error(
          "Your session has expired. Please sign in again."
        );
      }

      /*
       * Get the user's organization.
       */
      const {
        data: membership,
        error: membershipError,
      } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (membershipError) {
        throw membershipError;
      }

      if (!membership) {
        throw new Error(
          "Your account is not connected to an organization."
        );
      }

      /*
       * IMPORTANT:
       * We now call the secure database function instead
       * of inserting directly into the estimates table.
       *
       * This avoids the RLS INSERT problem while still
       * verifying organization membership inside Postgres.
       */
      const { data, error } = await supabase.rpc(
        "create_estimate",
        {
          p_organization_id:
            membership.organization_id,
          p_lead_id: leadId,
          p_title: title.trim(),
          p_amount: Number(amount) || 0,
          p_status: status,
          p_estimate_date: estimateDate,
          p_expiration_date:
            expirationDate || null,
          p_notes: notes.trim() || null,
        }
      );

      if (error) {
        console.error(
          "CREATE ESTIMATE RPC ERROR:",
          error
        );

        throw new Error(
          error.message ||
            "Unable to create the estimate."
        );
      }

      if (!data) {
        throw new Error(
          "The estimate was created, but no estimate data was returned."
        );
      }

      /*
       * The RPC returns the new estimate row.
       * Fetch the related lead separately so the new
       * estimate has the same shape as the existing list.
       */
      const { data: lead, error: leadError } =
        await supabase
          .from("leads")
          .select(`
            id,
            first_name,
            last_name,
            email,
            phone
          `)
          .eq("id", leadId)
          .maybeSingle();

      if (leadError) {
        console.error(
          "LEAD LOOKUP ERROR:",
          leadError
        );
      }

      const newEstimate: Estimate = {
        ...(data as Estimate),
        leads: lead ?? null,
      };

      setEstimates((current) => [
        newEstimate,
        ...current,
      ]);

      resetForm();
      setShowCreate(false);
    } catch (error: any) {
      console.error(
        "ESTIMATE CREATE FAILED:",
        error?.message || error
      );

      alert(
        `Could not create estimate.\n\n${
          error?.message ||
          "Something went wrong."
        }`
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-600">
            Sales
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
            Estimates
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Build, track, and manage estimates from one
            place.
          </p>
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          Create Estimate
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
              <FileText className="h-5 w-5 text-slate-500" />
            </div>

            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Total
            </span>
          </div>

          <p className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">
            {stats.total}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            All estimates
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <Send className="h-5 w-5 text-blue-600" />
            </div>

            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Active
            </span>
          </div>

          <p className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">
            {stats.sent}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Sent to customers
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>

            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Won
            </span>
          </div>

          <p className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">
            {formatCurrency(
              stats.acceptedRevenue
            )}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Accepted estimate value
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
              <Target className="h-5 w-5 text-violet-600" />
            </div>

            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Pipeline
            </span>
          </div>

          <p className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">
            {formatCurrency(
              stats.pipelineValue
            )}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Open estimate value
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search estimates or customers..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
            />
          </div>

          <div className="relative">
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as
                    | "all"
                    | EstimateStatus
                )
              }
              className="appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-10 text-sm font-medium text-slate-700 outline-none focus:border-slate-400"
            >
              <option value="all">
                All statuses
              </option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="accepted">
                Accepted
              </option>
              <option value="declined">
                Declined
              </option>
              <option value="expired">
                Expired
              </option>
            </select>

            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
              Estimate Intelligence
            </p>

            <h2 className="mt-1 text-lg font-semibold text-slate-950">
              Open pipeline
            </h2>
          </div>

          <p className="text-sm text-slate-400">
            {filteredEstimates.length}{" "}
            {filteredEstimates.length === 1
              ? "estimate"
              : "estimates"}
          </p>
        </div>

        {filteredEstimates.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
              <FileText className="h-5 w-5 text-slate-400" />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-slate-900">
              No estimates found
            </h3>

            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-400">
              Create an estimate or adjust your search
              filters to see results here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    Estimate
                  </th>

                  <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    Customer
                  </th>

                  <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    Amount
                  </th>

                  <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    Status
                  </th>

                  <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    Date
                  </th>

                  <th className="px-6 py-3" />
                </tr>
              </thead>

              <tbody>
                {filteredEstimates.map((estimate) => {
                  const lead = Array.isArray(
                    estimate.leads
                  )
                    ? estimate.leads[0] ?? null
                    : estimate.leads;

                  return (
                    <tr
                      key={estimate.id}
                      className="group border-b border-slate-100 last:border-0"
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/estimates/${estimate.id}`}
                          className="block"
                        >
                          <p className="font-semibold text-slate-900 transition group-hover:text-blue-600">
                            {estimate.title}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            #{estimate.id.slice(0, 8)}
                          </p>
                        </Link>
                      </td>

                      <td className="px-6 py-4">
                        <Link
                          href={`/estimates/${estimate.id}`}
                          className="flex items-center gap-3"
                        >
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                            {getInitials(lead)}
                          </div>

                          <div>
                            <p className="text-sm font-medium text-slate-700">
                              {getLeadName(lead)}
                            </p>

                            {lead?.email && (
                              <p className="mt-0.5 text-xs text-slate-400">
                                {lead.email}
                              </p>
                            )}
                          </div>
                        </Link>
                      </td>

                      <td className="px-6 py-4">
                        <Link
                          href={`/estimates/${estimate.id}`}
                          className="text-sm font-semibold text-slate-900"
                        >
                          {formatCurrency(
                            estimate.amount
                          )}
                        </Link>
                      </td>

                      <td className="px-6 py-4">
                        <Link
                          href={`/estimates/${estimate.id}`}
                        >
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                              estimate.status
                            )}`}
                          >
                            {formatStatus(
                              estimate.status
                            )}
                          </span>
                        </Link>
                      </td>

                      <td className="px-6 py-4">
                        <Link
                          href={`/estimates/${estimate.id}`}
                          className="text-sm text-slate-500"
                        >
                          {formatDate(
                            estimate.estimate_date
                          )}
                        </Link>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/estimates/${estimate.id}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                  Sales
                </p>

                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  Create Estimate
                </h2>
              </div>

              <button
                onClick={() => {
                  setShowCreate(false);
                  resetForm();
                }}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={createEstimate}
              className="space-y-6 p-6"
            >
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Estimate title
                </label>

                <input
                  value={title}
                  onChange={(event) =>
                    setTitle(event.target.value)
                  }
                  placeholder="Kitchen remodel estimate"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Customer
                  </label>

                  <select
                    value={leadId}
                    onChange={(event) =>
                      setLeadId(event.target.value)
                    }
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400"
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
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Amount
                  </label>

                  <div className="relative">
                    <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      value={amount}
                      onChange={(event) =>
                        setAmount(event.target.value)
                      }
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-9 pr-4 text-sm text-slate-900 outline-none focus:border-slate-400"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Status
                  </label>

                  <select
                    value={status}
                    onChange={(event) =>
                      setStatus(
                        event.target.value as EstimateStatus
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400"
                  >
                    <option value="draft">
                      Draft
                    </option>
                    <option value="sent">Sent</option>
                    <option value="accepted">
                      Accepted
                    </option>
                    <option value="declined">
                      Declined
                    </option>
                    <option value="expired">
                      Expired
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Estimate date
                  </label>

                  <input
                    value={estimateDate}
                    onChange={(event) =>
                      setEstimateDate(
                        event.target.value
                      )
                    }
                    type="date"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Expiration
                  </label>

                  <input
                    value={expirationDate}
                    onChange={(event) =>
                      setExpirationDate(
                        event.target.value
                      )
                    }
                    type="date"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Notes
                </label>

                <textarea
                  value={notes}
                  onChange={(event) =>
                    setNotes(event.target.value)
                  }
                  rows={5}
                  placeholder="Add scope, pricing details, or notes..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreate(false);
                    resetForm();
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    !leadId ||
                    !title.trim()
                  }
                  className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Creating..."
                    : "Create Estimate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}