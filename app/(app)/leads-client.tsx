"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  CalendarClock,
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

  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

function formatStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getFollowUpState(date: string | null) {
  if (!date) {
    return {
      label: "No follow-up",
      className: "bg-slate-100 text-slate-500",
    };
  }

  const followUp = new Date(date);

  const formattedDate = followUp.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  return {
    label: formattedDate,
    className: "bg-blue-50 text-blue-700",
  };
}

function getStatusClass(status: string) {
  switch (status) {
    case "new":
      return "bg-blue-50 text-blue-700";
    case "contacted":
      return "bg-violet-50 text-violet-700";
    case "qualified":
      return "bg-emerald-50 text-emerald-700";
    case "unqualified":
      return "bg-slate-100 text-slate-600";
    case "won":
      return "bg-green-50 text-green-700";
    case "lost":
      return "bg-red-50 text-red-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export default function LeadsClient({ leads }: { leads: Lead[] }) {
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
      statusFilter === "all" || lead.status === statusFilter;

    if (!matchesStatus) return false;

    if (followUpFilter !== "all") {
      if (!lead.next_follow_up_at) return false;

      const followUp = new Date(lead.next_follow_up_at);

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
}, [leads, search, statusFilter, followUpFilter]);

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

      return new Date(lead.next_follow_up_at) < startOfToday;
    }).length;

    const dueToday = leads.filter((lead) => {
      if (!lead.next_follow_up_at) return false;

      const date = new Date(lead.next_follow_up_at);

      return date >= startOfToday && date < startOfTomorrow;
    }).length;

    return {
      total: leads.length,
      new: leads.filter((lead) => lead.status === "new").length,
      dueToday,
      overdue,
    };
  }, [leads]);

  return (
    <>
      {/* Header */}
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-blue-600">CRM</p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Leads
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
            Manage opportunities, stay on top of follow-ups, and keep your
            sales pipeline moving.
          </p>
        </div>

        <Link
          href="/leads/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          Add Lead
        </Link>
      </div>

      {/* Lead intelligence */}
<div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
  <button
    onClick={() => {
      setStatusFilter("all");
      setFollowUpFilter("all");
    }}
    className={`rounded-2xl border bg-white p-5 text-left transition ${
      statusFilter === "all" && followUpFilter === "all"
        ? "border-slate-900 ring-1 ring-slate-900"
        : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
    }`}
  >
    <p className="text-sm font-medium text-slate-500">
      Total leads
    </p>

    <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
      {stats.total}
    </p>

    <p className="mt-2 text-xs text-slate-400">
      View all opportunities
    </p>
  </button>

  <button
    onClick={() => {
      setStatusFilter("new");
      setFollowUpFilter("all");
    }}
    className={`rounded-2xl border bg-white p-5 text-left transition ${
      statusFilter === "new"
        ? "border-slate-900 ring-1 ring-slate-900"
        : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
    }`}
  >
    <p className="text-sm font-medium text-slate-500">
      New leads
    </p>

    <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
      {stats.new}
    </p>

    <p className="mt-2 text-xs text-slate-400">
      Recently added opportunities
    </p>
  </button>

  <button
    onClick={() => {
      setStatusFilter("all");
      setFollowUpFilter("today");
    }}
    className={`rounded-2xl border bg-white p-5 text-left transition ${
      followUpFilter === "today"
        ? "border-slate-900 ring-1 ring-slate-900"
        : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
    }`}
  >
    <p className="text-sm font-medium text-slate-500">
      Due today
    </p>

    <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
      {stats.dueToday}
    </p>

    <p className="mt-2 text-xs text-slate-400">
      Follow-ups requiring attention
    </p>
  </button>

  <button
    onClick={() => {
      setStatusFilter("all");
      setFollowUpFilter("overdue");
    }}
    className={`rounded-2xl border bg-white p-5 text-left transition ${
      followUpFilter === "overdue"
        ? "border-red-300 ring-1 ring-red-200"
        : stats.overdue > 0
          ? "border-red-200 hover:border-red-300"
          : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
    }`}
  >
    <p className="text-sm font-medium text-slate-500">
      Overdue
    </p>

    <p
      className={`mt-3 text-3xl font-semibold tracking-tight ${
        stats.overdue > 0
          ? "text-red-600"
          : "text-slate-950"
      }`}
    >
      {stats.overdue}
    </p>

    <p className="mt-2 text-xs text-slate-400">
      Follow-ups past their due date
    </p>
  </button>
</div>

{/* Search and filters */}
<div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
  <div className="flex flex-col gap-4">
    {/* Search row */}
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, email, phone, or source..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-3 pl-10 pr-4 text-sm text-slate-950 outline-none transition-all placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
        />
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <div className="hidden text-right lg:block">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Results
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-900">
            {filteredLeads.length}
            <span className="font-normal text-slate-400">
              {" "}
              of {leads.length}
            </span>
          </p>
        </div>

        {(search ||
          statusFilter !== "all" ||
          followUpFilter !== "all") && (
          <button
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setFollowUpFilter("all");
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
            Clear
          </button>
        )}
      </div>
    </div>

    {/* Divider */}
    <div className="h-px bg-slate-100" />

    {/* Filter row */}
    <div className="flex gap-2 overflow-x-auto pb-1">
      {statuses.map((status) => {
        const isActive = statusFilter === status;

        const count =
          status === "all"
            ? leads.length
            : leads.filter((lead) => lead.status === status).length;

        return (
          <button
            key={status}
            onClick={() => {
              setStatusFilter(status);
              setFollowUpFilter("all");
            }}
            className={`group inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
              isActive
                ? "bg-slate-950 text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <span>
              {status === "all"
                ? "All leads"
                : formatStatus(status)}
            </span>

            <span
              className={`flex min-w-5 items-center justify-center rounded-md px-1.5 py-0.5 text-xs font-semibold ${
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
</div>

      {/* Leads */}
      {leads.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white">
          <div className="flex min-h-[440px] flex-col items-center justify-center p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <Users className="h-6 w-6 text-slate-500" />
            </div>

            <h2 className="mt-5 text-lg font-semibold text-slate-950">
              Your lead pipeline starts here
            </h2>

            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
              Add your first lead and start tracking opportunities, follow-ups,
              and customer conversations in one place.
            </p>

            <Link
              href="/leads/new"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Add your first lead
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing{" "}
              <span className="font-semibold text-slate-700">
                {filteredLeads.length}
              </span>{" "}
              of {leads.length} leads
            </p>
          </div>

          {filteredLeads.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-10 text-center">
              <h2 className="text-base font-semibold text-slate-950">
                No leads found
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Try changing your search or filter.
              </p>
            </div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
  <div className="divide-y divide-slate-100">
    {filteredLeads.map((lead) => {
      const followUp = getFollowUpState(
        lead.next_follow_up_at
      );

      const contact =
        lead.email ||
        lead.phone ||
        "No contact information";

      return (
        <Link
          key={lead.id}
          href={`/leads/${lead.id}`}
          className="group block px-5 py-5 transition hover:bg-slate-50 sm:px-6"
        >
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_130px_150px_160px_24px] lg:items-center">
            
            {/* Lead */}
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-xs font-bold text-white shadow-sm transition-transform duration-200 group-hover:scale-105">
                {getInitials(lead)}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-950 transition-colors group-hover:text-blue-600">
                  {getLeadName(lead)}
                </p>

                <p className="mt-1 truncate text-sm text-slate-500">
                  {contact}
                </p>
              </div>
            </div>

            {/* Status */}
            <div>
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                  lead.status
                )}`}
              >
                {formatStatus(lead.status)}
              </span>
            </div>

            {/* Source */}
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Source
              </p>

              <p className="mt-1 truncate text-sm font-medium text-slate-600">
                {lead.source || "Not specified"}
              </p>
            </div>

            {/* Follow-up */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Follow-up
              </p>

              <div className="mt-1">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${followUp.className}`}
                >
                  <CalendarClock className="h-3.5 w-3.5" />
                  {followUp.label}
                </span>
              </div>
            </div>

            {/* Arrow */}
            <div className="hidden justify-end lg:flex">
              <ArrowUpRight className="h-4 w-4 text-slate-300 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-slate-950" />
            </div>
          </div>
        </Link>
      );
    })}
  </div>
</div>
          )}
        </>
      )}
    </>
  );
}

function StatCard({
  label,
  value,
  attention = false,
}: {
  label: string;
  value: number;
  attention?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border bg-white p-5 ${
        attention
          ? "border-red-200"
          : "border-slate-200"
      }`}
    >
      <p className="text-sm font-medium text-slate-500">
        {label}
      </p>

      <p
        className={`mt-3 text-3xl font-semibold tracking-tight ${
          attention ? "text-red-600" : "text-slate-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}