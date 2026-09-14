"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Mail,
  Phone,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

type Lead = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  source: string | null;
  service_interest: string | null;
  next_follow_up_at: string | null;
  created_at: string;
};

const statuses = [
  "all",
  "new",
  "contacted",
  "qualified",
  "unqualified",
  "won",
  "lost",
] as const;

function getLeadName(lead: Lead) {
  return (
    [lead.first_name, lead.last_name].filter(Boolean).join(" ") ||
    "Unnamed Lead"
  );
}

function getInitials(lead: Lead) {
  const name = getLeadName(lead);

  return (
    name
      .split(" ")
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase() || "L"
  );
}

function formatStatus(status: string) {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStatusClass(status: string) {
  switch (status) {
    case "new":
      return "bg-blue-50 text-blue-700 ring-blue-100";
    case "contacted":
      return "bg-violet-50 text-violet-700 ring-violet-100";
    case "qualified":
      return "bg-emerald-50 text-emerald-700 ring-emerald-100";
    case "unqualified":
      return "bg-slate-100 text-slate-600 ring-slate-200";
    case "won":
      return "bg-green-50 text-green-700 ring-green-100";
    case "lost":
      return "bg-red-50 text-red-700 ring-red-100";
    default:
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
}

function getFollowUpState(date: string | null) {
  if (!date) {
    return {
      label: "No follow-up",
      shortLabel: "None",
      className: "bg-slate-100 text-slate-500",
      urgent: false,
      icon: Clock3,
    };
  }

  const followUp = new Date(date);
  const now = new Date();

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const startOfTomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1
  );

  const formattedDate = followUp.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  if (followUp < startOfToday) {
    return {
      label: `Overdue · ${formattedDate}`,
      shortLabel: "Overdue",
      className: "bg-red-50 text-red-700",
      urgent: true,
      icon: CalendarClock,
    };
  }

  if (followUp >= startOfToday && followUp < startOfTomorrow) {
    return {
      label: "Due today",
      shortLabel: "Today",
      className: "bg-amber-50 text-amber-700",
      urgent: true,
      icon: CalendarClock,
    };
  }

  return {
    label: formattedDate,
    shortLabel: formattedDate,
    className: "bg-blue-50 text-blue-700",
    urgent: false,
    icon: CalendarClock,
  };
}

function formatRelativeDate(date: string) {
  const created = new Date(date);
  const now = new Date();

  const diffMs = now.getTime() - created.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays <= 0) return "Added today";
  if (diffDays === 1) return "Added yesterday";
  if (diffDays < 7) return `Added ${diffDays} days ago`;

  return `Added ${created.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year:
      created.getFullYear() !== now.getFullYear()
        ? "numeric"
        : undefined,
  })}`;
}

function getStatusCount(leads: Lead[], status: string) {
  if (status === "all") return leads.length;

  return leads.filter((lead) => lead.status === status).length;
}

export default function LeadsClient({
  leads,
}: {
  leads: Lead[];
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [followUpFilter, setFollowUpFilter] = useState<
    "all" | "today" | "overdue"
  >("all");

  const filteredLeads = useMemo(() => {
    const query = search.trim().toLowerCase();

    const now = new Date();

    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const startOfTomorrow = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1
    );

    return leads.filter((lead) => {
      const matchesStatus =
        statusFilter === "all" ||
        lead.status === statusFilter;

      if (!matchesStatus) return false;

      if (followUpFilter !== "all") {
        if (!lead.next_follow_up_at) return false;

        const followUp = new Date(
          lead.next_follow_up_at
        );

        if (
          followUpFilter === "overdue" &&
          followUp >= startOfToday
        ) {
          return false;
        }

        if (
          followUpFilter === "today" &&
          !(
            followUp >= startOfToday &&
            followUp < startOfTomorrow
          )
        ) {
          return false;
        }
      }

      if (!query) return true;

      const searchableValues = [
        lead.first_name,
        lead.last_name,
        lead.email,
        lead.phone,
        lead.source,
        lead.service_interest,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableValues.includes(query);
    });
  }, [
    leads,
    search,
    statusFilter,
    followUpFilter,
  ]);

  const stats = useMemo(() => {
    const now = new Date();

    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const startOfTomorrow = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1
    );

    const overdue = leads.filter((lead) => {
      if (!lead.next_follow_up_at) return false;

      return (
        new Date(lead.next_follow_up_at) <
        startOfToday
      );
    }).length;

    const dueToday = leads.filter((lead) => {
      if (!lead.next_follow_up_at) return false;

      const date = new Date(
        lead.next_follow_up_at
      );

      return (
        date >= startOfToday &&
        date < startOfTomorrow
      );
    }).length;

    return {
      total: leads.length,
      new: leads.filter(
        (lead) => lead.status === "new"
      ).length,
      qualified: leads.filter(
        (lead) => lead.status === "qualified"
      ).length,
      dueToday,
      overdue,
    };
  }, [leads]);

  const hasFilters =
    Boolean(search) ||
    statusFilter !== "all" ||
    followUpFilter !== "all";

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setFollowUpFilter("all");
  }

  return (
    <div className="pb-10">
      {/* =========================================================
          HEADER
      ========================================================= */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-gradient-to-l from-slate-50 to-transparent lg:block" />

        <div className="relative flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />

              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">
                Sales CRM
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Leads
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              Manage opportunities, stay ahead of follow-ups,
              and keep every potential customer moving toward
              the next step.
            </p>
          </div>

          <Link
            href="/leads/new"
            className="group inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md"
          >
            <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
            Add Lead
          </Link>
        </div>
      </section>

      {/* =========================================================
          INTELLIGENCE CARDS
      ========================================================= */}
      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          onClick={() => {
            setStatusFilter("all");
            setFollowUpFilter("all");
          }}
          className={`group relative overflow-hidden rounded-2xl border bg-white p-5 text-left shadow-sm transition-all duration-200 ${
            statusFilter === "all" &&
            followUpFilter === "all"
              ? "border-slate-900 ring-1 ring-slate-900"
              : "border-slate-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white">
              <Users className="h-4 w-4" />
            </div>

            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Pipeline
            </span>
          </div>

          <p className="mt-5 text-3xl font-bold tracking-tight text-slate-950">
            {stats.total}
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-700">
            Total leads
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-400">
            All opportunities in your pipeline
          </p>

          <div className="absolute -bottom-10 -right-10 h-28 w-28 rounded-full bg-slate-50 transition-transform duration-300 group-hover:scale-125" />
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter("new");
            setFollowUpFilter("all");
          }}
          className={`group relative overflow-hidden rounded-2xl border bg-white p-5 text-left shadow-sm transition-all duration-200 ${
            statusFilter === "new" &&
            followUpFilter === "all"
              ? "border-blue-500 ring-1 ring-blue-500"
              : "border-slate-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Plus className="h-4 w-4" />
            </div>

            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
              New
            </span>
          </div>

          <p className="mt-5 text-3xl font-bold tracking-tight text-slate-950">
            {stats.new}
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-700">
            New leads
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-400">
            Opportunities awaiting first contact
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter("all");
            setFollowUpFilter("today");
          }}
          className={`group relative overflow-hidden rounded-2xl border bg-white p-5 text-left shadow-sm transition-all duration-200 ${
            followUpFilter === "today"
              ? "border-amber-300 ring-1 ring-amber-200"
              : "border-slate-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <CalendarClock className="h-4 w-4" />
            </div>

            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Today
            </span>
          </div>

          <p className="mt-5 text-3xl font-bold tracking-tight text-slate-950">
            {stats.dueToday}
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-700">
            Due today
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-400">
            Follow-ups requiring attention
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter("all");
            setFollowUpFilter("overdue");
          }}
          className={`group relative overflow-hidden rounded-2xl border bg-white p-5 text-left shadow-sm transition-all duration-200 ${
            followUpFilter === "overdue"
              ? "border-red-300 ring-1 ring-red-200"
              : stats.overdue > 0
                ? "border-red-200 hover:-translate-y-0.5 hover:border-red-300 hover:shadow-md"
                : "border-slate-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
          }`}
        >
          <div className="flex items-start justify-between">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                stats.overdue > 0
                  ? "bg-red-50 text-red-600"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              <Clock3 className="h-4 w-4" />
            </div>

            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Attention
            </span>
          </div>

          <p
            className={`mt-5 text-3xl font-bold tracking-tight ${
              stats.overdue > 0
                ? "text-red-600"
                : "text-slate-950"
            }`}
          >
            {stats.overdue}
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-700">
            Overdue
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-400">
            Follow-ups past their due date
          </p>
        </button>
      </section>

      {/* =========================================================
          SEARCH + FILTERS
      ========================================================= */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search leads by name, email, phone, source, or service..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-10 text-sm text-slate-950 outline-none transition-all placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 lg:justify-end">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Results
                </p>

                <p className="mt-0.5 text-sm font-semibold text-slate-900">
                  {filteredLeads.length}
                  <span className="font-normal text-slate-400">
                    {" "}
                    of {leads.length}
                  </span>
                </p>
              </div>

              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 px-4 py-3 sm:px-5">
          <div className="flex gap-2 overflow-x-auto">
            {statuses.map((status) => {
              const isActive =
                statusFilter === status;

              const count = getStatusCount(
                leads,
                status
              );

              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => {
                    setStatusFilter(status);
                    setFollowUpFilter("all");
                  }}
                  className={`group inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-slate-950 text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  <span>
                    {status === "all"
                      ? "All leads"
                      : formatStatus(status)}
                  </span>

                  <span
                    className={`flex min-w-5 items-center justify-center rounded-md px-1.5 py-0.5 text-[11px] font-bold ${
                      isActive
                        ? "bg-white/10 text-slate-200"
                        : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================
          EMPTY DATABASE
      ========================================================= */}
      {leads.length === 0 ? (
        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="relative flex min-h-[500px] flex-col items-center justify-center overflow-hidden p-8 text-center">
            <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-50" />

            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 shadow-lg">
              <Users className="h-7 w-7 text-white" />
            </div>

            <p className="relative mt-6 text-xs font-bold uppercase tracking-[0.14em] text-blue-600">
              Your pipeline
            </p>

            <h2 className="relative mt-2 text-xl font-bold tracking-tight text-slate-950">
              Your lead pipeline starts here
            </h2>

            <p className="relative mt-2 max-w-md text-sm leading-6 text-slate-500">
              Add your first lead and start tracking
              opportunities, follow-ups, customer conversations,
              estimates, and jobs from one place.
            </p>

            <Link
              href="/leads/new"
              className="relative mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md"
            >
              <Plus className="h-4 w-4" />
              Add your first lead
            </Link>
          </div>
        </section>
      ) : (
        <>
          {/* =====================================================
              RESULT SUMMARY
          ===================================================== */}
          <div className="mt-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-800">
                  {filteredLeads.length}
                </span>{" "}
                {filteredLeads.length === 1
                  ? "lead"
                  : "leads"}
              </p>
            </div>

            {followUpFilter === "overdue" &&
              stats.overdue > 0 && (
                <div className="hidden items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 sm:flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  Follow-up attention required
                </div>
              )}
          </div>

          {/* =====================================================
              NO FILTER RESULTS
          ===================================================== */}
          {filteredLeads.length === 0 ? (
            <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                <Search className="h-5 w-5 text-slate-400" />
              </div>

              <h2 className="mt-4 text-base font-semibold text-slate-950">
                No leads found
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Try changing your search or filters.
              </p>

              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
                Clear filters
              </button>
            </section>
          ) : (
            <>
              {/* =================================================
                  DESKTOP TABLE
              ================================================= */}
              <section className="mt-4 hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
                <div className="grid grid-cols-[minmax(260px,1.8fr)_130px_minmax(150px,1fr)_150px_32px] items-center gap-4 border-b border-slate-200 bg-slate-50/80 px-6 py-3.5">
                  <TableHeader label="Lead" />
                  <TableHeader label="Status" />
                  <TableHeader label="Source" />
                  <TableHeader label="Follow-up" />
                  <span />
                </div>

                <div className="divide-y divide-slate-100">
                  {filteredLeads.map((lead) => {
                    const followUp =
                      getFollowUpState(
                        lead.next_follow_up_at
                      );

                    const FollowUpIcon =
                      followUp.icon;

                    const contact =
                      lead.email ||
                      lead.phone ||
                      "No contact information";

                    return (
                      <Link
                        key={lead.id}
                        href={`/leads/${lead.id}`}
                        className="group grid grid-cols-[minmax(260px,1.8fr)_130px_minmax(150px,1fr)_150px_32px] items-center gap-4 border-l-2 border-l-transparent px-6 py-4 transition-all duration-200 hover:border-l-slate-950 hover:bg-slate-50"
                      >
                        {/* Lead */}
                        <div className="flex min-w-0 items-center gap-3.5">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-xs font-bold tracking-wide text-white shadow-sm transition-all duration-200 group-hover:scale-105 group-hover:shadow-md">
                            {getInitials(lead)}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-950 transition-colors group-hover:text-blue-600">
                              {getLeadName(lead)}
                            </p>

                            <div className="mt-1 flex min-w-0 items-center gap-2">
                              {lead.email ? (
                                <Mail className="h-3 w-3 shrink-0 text-slate-300" />
                              ) : lead.phone ? (
                                <Phone className="h-3 w-3 shrink-0 text-slate-300" />
                              ) : null}

                              <p className="truncate text-xs text-slate-500">
                                {contact}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Status */}
                        <div>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusClass(
                              lead.status
                            )}`}
                          >
                            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current opacity-60" />

                            {formatStatus(
                              lead.status
                            )}
                          </span>
                        </div>

                        {/* Source */}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-700">
                            {lead.source ||
                              "Not specified"}
                          </p>

                          {lead.service_interest && (
                            <p className="mt-0.5 truncate text-xs text-slate-400">
                              {lead.service_interest}
                            </p>
                          )}
                        </div>

                        {/* Follow-up */}
                        <div>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${followUp.className}`}
                          >
                            <FollowUpIcon className="h-3.5 w-3.5" />
                            {followUp.label}
                          </span>
                        </div>

                        {/* Open */}
                        <div className="flex justify-end">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition-all group-hover:bg-white group-hover:text-slate-950 group-hover:shadow-sm">
                            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>

              {/* =================================================
                  MOBILE / TABLET CARDS
              ================================================= */}
              <section className="mt-4 grid gap-3 lg:hidden">
                {filteredLeads.map((lead) => {
                  const followUp =
                    getFollowUpState(
                      lead.next_follow_up_at
                    );

                  const FollowUpIcon =
                    followUp.icon;

                  return (
                    <Link
                      key={lead.id}
                      href={`/leads/${lead.id}`}
                      className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-slate-300 hover:shadow-md sm:p-5"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-xs font-bold tracking-wide text-white shadow-sm">
                          {getInitials(lead)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-950 transition-colors group-hover:text-blue-600">
                                {getLeadName(lead)}
                              </p>

                              <p className="mt-1 truncate text-xs text-slate-500">
                                {lead.email ||
                                  lead.phone ||
                                  "No contact information"}
                              </p>
                            </div>

                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-300 transition group-hover:bg-slate-50 group-hover:text-slate-900">
                              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusClass(
                                lead.status
                              )}`}
                            >
                              <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current opacity-60" />

                              {formatStatus(
                                lead.status
                              )}
                            </span>

                            <span
                              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${followUp.className}`}
                            >
                              <FollowUpIcon className="h-3.5 w-3.5" />
                              {followUp.shortLabel}
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                                Source
                              </p>

                              <p className="mt-1 truncate text-xs font-semibold text-slate-700">
                                {lead.source ||
                                  "Not specified"}
                              </p>
                            </div>

                            <div className="min-w-0">
                              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                                Added
                              </p>

                              <p className="mt-1 truncate text-xs font-semibold text-slate-700">
                                {formatRelativeDate(
                                  lead.created_at
                                )}
                              </p>
                            </div>
                          </div>

                          {lead.service_interest && (
                            <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                              <p className="truncate text-xs text-slate-500">
                                <span className="font-semibold text-slate-600">
                                  Service:
                                </span>{" "}
                                {lead.service_interest}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}

function TableHeader({
  label,
}: {
  label: string;
}) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
      {label}
    </p>
  );
}