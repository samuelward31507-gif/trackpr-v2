"use client";

import Link from "next/link";
import {
  FormEvent,
  useMemo,
  useState,
} from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  DollarSign,
  FileText,
  Plus,
  Search,
  Send,
  Target,
  TrendingUp,
  Users,
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

  if (
    name === "Unknown customer" ||
    name === "Unnamed customer"
  ) {
    return "?";
  }

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

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatStatus(status: string) {
  return (
    status.charAt(0).toUpperCase() +
    status.slice(1)
  );
}

function getStatusClass(status: EstimateStatus) {
  switch (status) {
    case "accepted":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "sent":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "declined":
      return "border-red-200 bg-red-50 text-red-700";

    case "expired":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "draft":
    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
}

function getStatusDot(status: EstimateStatus) {
  switch (status) {
    case "accepted":
      return "bg-emerald-500";

    case "sent":
      return "bg-blue-500";

    case "declined":
      return "bg-red-500";

    case "expired":
      return "bg-amber-500";

    case "draft":
    default:
      return "bg-slate-400";
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

  const [showCreate, setShowCreate] =
    useState(false);

  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [leadId, setLeadId] = useState("");
  const [amount, setAmount] = useState("");

  const [status, setStatus] =
    useState<EstimateStatus>("draft");

  const [estimateDate, setEstimateDate] =
    useState(
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
        estimate.title
          .toLowerCase()
          .includes(query) ||
        customerName.includes(query) ||
        estimate.status
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        estimate.status === statusFilter;

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [
    estimates,
    search,
    statusFilter,
  ]);

  const stats = useMemo(() => {
    const total = estimates.length;

    const draft = estimates.filter(
      (estimate) =>
        estimate.status === "draft"
    ).length;

    const sent = estimates.filter(
      (estimate) =>
        estimate.status === "sent"
    ).length;

    const accepted = estimates.filter(
      (estimate) =>
        estimate.status === "accepted"
    );

    const declined = estimates.filter(
      (estimate) =>
        estimate.status === "declined"
    ).length;

    const expired = estimates.filter(
      (estimate) =>
        estimate.status === "expired"
    ).length;

    const acceptedRevenue =
      accepted.reduce(
        (sum, estimate) =>
          sum +
          (Number(estimate.amount) || 0),
        0
      );

    const pipelineValue =
      estimates
        .filter(
          (estimate) =>
            estimate.status === "draft" ||
            estimate.status === "sent"
        )
        .reduce(
          (sum, estimate) =>
            sum +
            (Number(estimate.amount) || 0),
          0
        );

    const totalQuotedValue =
      estimates.reduce(
        (sum, estimate) =>
          sum +
          (Number(estimate.amount) || 0),
        0
      );

    const winRate =
      accepted.length > 0
        ? Math.round(
            (accepted.length /
              Math.max(
                accepted.length +
                  declined +
                  expired,
                1
              )) *
              100
          )
        : 0;

    return {
      total,
      draft,
      sent,
      accepted: accepted.length,
      acceptedRevenue,
      pipelineValue,
      totalQuotedValue,
      winRate,
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

  function closeCreateModal() {
    if (saving) return;

    setShowCreate(false);
    resetForm();
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

      const {
        data: membership,
        error: membershipError,
      } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (membershipError) {
        throw membershipError;
      }

      if (!membership) {
        throw new Error(
          "Your account is not connected to an organization."
        );
      }

      const { data, error } =
        await supabase.rpc(
          "create_estimate",
          {
            p_organization_id:
              membership.organization_id,

            p_lead_id: leadId,

            p_title: title.trim(),

            p_amount:
              Number(amount) || 0,

            p_status: status,

            p_estimate_date:
              estimateDate,

            p_expiration_date:
              expirationDate || null,

            p_notes:
              notes.trim() || null,
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

      const {
        data: lead,
        error: leadError,
      } = await supabase
        .from("leads")
        .select(
          `
            id,
            first_name,
            last_name,
            email,
            phone
          `
        )
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
    <div className="space-y-7 pb-10">
      {/* HEADER */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-gradient-to-l from-slate-50 to-transparent lg:block" />

        <div className="relative flex flex-col gap-6 px-6 py-7 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-9">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-blue-700">
              <FileText className="h-3.5 w-3.5" />
              Sales
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Estimates
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Build, track, and manage your sales
              pipeline from one place.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setShowCreate(true)
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.99]"
          >
            <Plus className="h-4 w-4" />
            Create Estimate
          </button>
        </div>
      </section>

      {/* KPI GRID */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* TOTAL */}
        <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
              <FileText className="h-5 w-5 text-slate-600" />
            </div>

            <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Total
            </span>
          </div>

          <div className="mt-5">
            <p className="text-3xl font-semibold tracking-tight text-slate-950">
              {stats.total}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              All estimates
            </p>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-400">
            <Users className="h-3.5 w-3.5" />
            Customer proposals
          </div>
        </div>

        {/* ACTIVE */}
        <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
              <Send className="h-5 w-5 text-blue-600" />
            </div>

            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-blue-600">
              Active
            </span>
          </div>

          <div className="mt-5">
            <p className="text-3xl font-semibold tracking-tight text-slate-950">
              {stats.sent}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Sent to customers
            </p>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs font-medium text-blue-600">
            <Clock3 className="h-3.5 w-3.5" />
            Awaiting response
          </div>
        </div>

        {/* WON */}
        <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>

            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-600">
              Won
            </span>
          </div>

          <div className="mt-5">
            <p className="text-3xl font-semibold tracking-tight text-slate-950">
              {formatCurrency(
                stats.acceptedRevenue
              )}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Accepted estimate value
            </p>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs font-medium text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {stats.accepted} accepted
          </div>
        </div>

        {/* PIPELINE */}
        <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50">
              <Target className="h-5 w-5 text-violet-600" />
            </div>

            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-violet-600">
              Pipeline
            </span>
          </div>

          <div className="mt-5">
            <p className="text-3xl font-semibold tracking-tight text-slate-950">
              {formatCurrency(
                stats.pipelineValue
              )}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Open estimate value
            </p>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs font-medium text-violet-600">
            <DollarSign className="h-3.5 w-3.5" />
            Draft + sent
          </div>
        </div>
      </section>

      {/* PIPELINE SNAPSHOT */}
      <section className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Sales overview
              </p>

              <h2 className="mt-1 text-lg font-semibold text-slate-950">
                Estimate pipeline
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                A quick view of where your estimates stand.
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 px-4 py-3 text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Win rate
              </p>

              <p className="mt-0.5 text-xl font-semibold text-slate-950">
                {stats.winRate}%
              </p>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-slate-400" />
                <span className="text-xs font-semibold text-slate-500">
                  Draft
                </span>
              </div>

              <p className="text-2xl font-semibold text-slate-950">
                {stats.draft}
              </p>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-xs font-semibold text-blue-600">
                  Sent
                </span>
              </div>

              <p className="text-2xl font-semibold text-slate-950">
                {stats.sent}
              </p>
            </div>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-semibold text-emerald-600">
                  Accepted
                </span>
              </div>

              <p className="text-2xl font-semibold text-slate-950">
                {stats.accepted}
              </p>
            </div>

            <div className="rounded-xl border border-red-100 bg-red-50/40 p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-xs font-semibold text-red-600">
                  Declined
                </span>
              </div>

              <p className="text-2xl font-semibold text-slate-950">
                {
                  estimates.filter(
                    (estimate) =>
                      estimate.status ===
                      "declined"
                  ).length
                }
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                Opportunity
              </p>

              <h2 className="mt-1 text-lg font-semibold">
                Open revenue
              </h2>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
          </div>

          <p className="mt-7 text-3xl font-semibold tracking-tight">
            {formatCurrency(
              stats.pipelineValue
            )}
          </p>

          <p className="mt-2 max-w-xs text-sm leading-6 text-slate-400">
            Revenue currently sitting in draft or
            sent estimates.
          </p>

          <div className="mt-7 border-t border-white/10 pt-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">
                Total quoted
              </span>

              <span className="font-semibold text-white">
                {formatCurrency(
                  stats.totalQuotedValue
                )}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-slate-400">
                Accepted
              </span>

              <span className="font-semibold text-emerald-400">
                {formatCurrency(
                  stats.acceptedRevenue
                )}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* SEARCH / FILTER */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search estimates, customers, or status..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"
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
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-11 text-sm font-semibold text-slate-700 outline-none transition hover:bg-slate-50 focus:border-blue-300 focus:ring-4 focus:ring-blue-50 lg:w-48"
            >
              <option value="all">
                All statuses
              </option>

              <option value="draft">
                Draft
              </option>

              <option value="sent">
                Sent
              </option>

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

            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
      </section>

      {/* ESTIMATE TABLE */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                <FileText className="h-4 w-4 text-slate-600" />
              </div>

              <h2 className="text-lg font-semibold text-slate-950">
                Estimates
              </h2>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Review and manage your sales proposals.
            </p>
          </div>

          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500">
            {filteredEstimates.length}{" "}
            {filteredEstimates.length === 1
              ? "estimate"
              : "estimates"}
          </div>
        </div>

        {filteredEstimates.length === 0 ? (
          <div className="px-6 py-20 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <FileText className="h-6 w-6 text-slate-400" />
            </div>

            <h3 className="mt-5 text-base font-semibold text-slate-900">
              No estimates found
            </h3>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-400">
              Create an estimate or adjust your search
              and status filters to find what you’re
              looking for.
            </p>

            {!search &&
              statusFilter === "all" && (
                <button
                  type="button"
                  onClick={() =>
                    setShowCreate(true)
                  }
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4" />
                  Create your first estimate
                </button>
              )}
          </div>
        ) : (
          <>
            {/* DESKTOP */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-6 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      Estimate
                    </th>

                    <th className="px-6 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      Customer
                    </th>

                    <th className="px-6 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      Amount
                    </th>

                    <th className="px-6 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      Status
                    </th>

                    <th className="px-6 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      Estimate Date
                    </th>

                    <th className="px-6 py-3.5 text-right text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      Open
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredEstimates.map(
                    (estimate) => {
                      const lead =
                        Array.isArray(
                          estimate.leads
                        )
                          ? estimate.leads[0] ??
                            null
                          : estimate.leads;

                      return (
                        <tr
                          key={estimate.id}
                          className="group border-b border-slate-100 last:border-0 transition hover:bg-slate-50/70"
                        >
                          <td className="px-6 py-4">
                            <Link
                              href={`/estimates/${estimate.id}`}
                              className="block"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition group-hover:bg-blue-50 group-hover:text-blue-600">
                                  <FileText className="h-4 w-4" />
                                </div>

                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-slate-900 transition group-hover:text-blue-600">
                                    {estimate.title}
                                  </p>

                                  <p className="mt-1 text-xs text-slate-400">
                                    #
                                    {estimate.id.slice(
                                      0,
                                      8
                                    )}
                                  </p>
                                </div>
                              </div>
                            </Link>
                          </td>

                          <td className="px-6 py-4">
                            <Link
                              href={`/estimates/${estimate.id}`}
                              className="flex items-center gap-3"
                            >
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                                {getInitials(
                                  lead
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-700">
                                  {getLeadName(
                                    lead
                                  )}
                                </p>

                                {lead?.email && (
                                  <p className="mt-0.5 max-w-[220px] truncate text-xs text-slate-400">
                                    {lead.email}
                                  </p>
                                )}
                              </div>
                            </Link>
                          </td>

                          <td className="px-6 py-4">
                            <Link
                              href={`/estimates/${estimate.id}`}
                              className="text-sm font-bold text-slate-950"
                            >
                              {formatCurrency(
                                estimate.amount
                              )}
                            </Link>
                          </td>

                          <td className="px-6 py-4">
                            <Link
                              href={`/estimates/${estimate.id}`}
                              className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-bold ${getStatusClass(
                                estimate.status
                              )}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${getStatusDot(
                                  estimate.status
                                )}`}
                              />

                              {formatStatus(
                                estimate.status
                              )}
                            </Link>
                          </td>

                          <td className="px-6 py-4">
                            <Link
                              href={`/estimates/${estimate.id}`}
                              className="inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-900"
                            >
                              <CalendarDays className="h-4 w-4 text-slate-400" />
                              {formatDate(
                                estimate.estimate_date
                              )}
                            </Link>
                          </td>

                          <td className="px-6 py-4 text-right">
                            <Link
                              href={`/estimates/${estimate.id}`}
                              aria-label={`Open ${estimate.title}`}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-slate-400 transition hover:border-slate-200 hover:bg-white hover:text-slate-900"
                            >
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>

            {/* MOBILE */}
            <div className="divide-y divide-slate-100 lg:hidden">
              {filteredEstimates.map(
                (estimate) => {
                  const lead =
                    Array.isArray(
                      estimate.leads
                    )
                      ? estimate.leads[0] ??
                        null
                      : estimate.leads;

                  return (
                    <Link
                      key={estimate.id}
                      href={`/estimates/${estimate.id}`}
                      className="block p-5 transition hover:bg-slate-50 active:bg-slate-100"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                            <FileText className="h-5 w-5" />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-950">
                              {estimate.title}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              #
                              {estimate.id.slice(
                                0,
                                8
                              )}
                            </p>
                          </div>
                        </div>

                        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-300" />
                      </div>

                      <div className="mt-5 flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                          {getInitials(lead)}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-700">
                            {getLeadName(lead)}
                          </p>

                          {lead?.email && (
                            <p className="truncate text-xs text-slate-400">
                              {lead.email}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-medium text-slate-400">
                            Estimate value
                          </p>

                          <p className="mt-0.5 text-lg font-bold text-slate-950">
                            {formatCurrency(
                              estimate.amount
                            )}
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-bold ${getStatusClass(
                              estimate.status
                            )}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${getStatusDot(
                                estimate.status
                              )}`}
                            />

                            {formatStatus(
                              estimate.status
                            )}
                          </span>

                          <span className="text-xs text-slate-400">
                            {formatDate(
                              estimate.estimate_date
                            )}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                }
              )}
            </div>
          </>
        )}
      </section>

      {/* CREATE MODAL */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeCreateModal();
            }
          }}
        >
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
            {/* MODAL HEADER */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5 sm:px-7">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    Sales
                  </p>

                  <h2 className="mt-0.5 text-xl font-semibold text-slate-950">
                    Create Estimate
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={closeCreateModal}
                disabled={saving}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={createEstimate}
              className="space-y-7 p-6 sm:p-7"
            >
              {/* BASICS */}
              <div>
                <div className="mb-4">
                  <p className="text-sm font-semibold text-slate-900">
                    Estimate details
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Start with the customer and core
                    estimate information.
                  </p>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Estimate title
                    </label>

                    <input
                      value={title}
                      onChange={(event) =>
                        setTitle(
                          event.target.value
                        )
                      }
                      placeholder="Kitchen remodel estimate"
                      required
                      autoFocus
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                    />
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Customer
                      </label>

                      <div className="relative">
                        <select
                          value={leadId}
                          onChange={(
                            event
                          ) =>
                            setLeadId(
                              event.target
                                .value
                            )
                          }
                          required
                          className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
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

                        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Amount
                      </label>

                      <div className="relative">
                        <DollarSign className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                          value={
                            amount
                          }
                          onChange={(
                            event
                          ) =>
                            setAmount(
                              event.target
                                .value
                            )
                          }
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0"
                          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* STATUS / DATES */}
              <div className="border-t border-slate-100 pt-7">
                <div className="mb-4">
                  <p className="text-sm font-semibold text-slate-900">
                    Status & timeline
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Set the current stage and important
                    dates.
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Status
                    </label>

                    <div className="relative">
                      <select
                        value={
                          status
                        }
                        onChange={(
                          event
                        ) =>
                          setStatus(
                            event.target
                              .value as EstimateStatus
                          )
                        }
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                      >
                        <option value="draft">
                          Draft
                        </option>

                        <option value="sent">
                          Sent
                        </option>

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

                      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Estimate date
                    </label>

                    <input
                      value={
                        estimateDate
                      }
                      onChange={(
                        event
                      ) =>
                        setEstimateDate(
                          event.target
                            .value
                        )
                      }
                      type="date"
                      required
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Expiration
                    </label>

                    <input
                      value={
                        expirationDate
                      }
                      onChange={(
                        event
                      ) =>
                        setExpirationDate(
                          event.target
                            .value
                        )
                      }
                      type="date"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                    />
                  </div>
                </div>
              </div>

              {/* NOTES */}
              <div className="border-t border-slate-100 pt-7">
                <div className="mb-4">
                  <p className="text-sm font-semibold text-slate-900">
                    Notes
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Add scope, pricing details, or internal
                    context.
                  </p>
                </div>

                <textarea
                  value={notes}
                  onChange={(event) =>
                    setNotes(
                      event.target.value
                    )
                  }
                  rows={5}
                  placeholder="Add scope, pricing details, or notes..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                />
              </div>

              {/* FOOTER */}
              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-400">
                  You can update the estimate later.
                </p>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={
                      closeCreateModal
                    }
                    disabled={saving}
                    className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
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
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Create Estimate
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}