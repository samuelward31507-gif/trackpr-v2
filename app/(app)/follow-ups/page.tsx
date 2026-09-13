import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Mail,
  Phone,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type Lead = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  next_follow_up_at: string | null;
};

function getLeadName(lead: Lead) {
  return (
    [lead.first_name, lead.last_name]
      .filter(Boolean)
      .join(" ") || "Unnamed Lead"
  );
}

function getInitials(lead: Lead) {
  return getLeadName(lead)
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStatusClass(status: string) {
  switch (status) {
    case "new":
      return "bg-blue-50 text-blue-700";

    case "contacted":
      return "bg-violet-50 text-violet-700";

    case "qualified":
      return "bg-emerald-50 text-emerald-700";

    case "won":
      return "bg-green-50 text-green-700";

    case "lost":
      return "bg-red-50 text-red-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

export default async function FollowUpsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data: leads, error } = await supabase
    .from("leads")
    .select(
      `
        id,
        first_name,
        last_name,
        email,
        phone,
        status,
        next_follow_up_at
      `
    )
    .not("next_follow_up_at", "is", null)
    .order("next_follow_up_at", {
      ascending: true,
    });

  if (error) {
    console.error(
      "Error loading follow-ups:",
      error
    );
  }

  const followUpLeads = (leads || []) as Lead[];

  const now = new Date();

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const startOfTomorrow = new Date(startOfToday);

  startOfTomorrow.setDate(
    startOfTomorrow.getDate() + 1
  );

  const overdue = followUpLeads.filter((lead) => {
    if (!lead.next_follow_up_at) return false;

    return (
      new Date(lead.next_follow_up_at) < startOfToday
    );
  });

  const dueToday = followUpLeads.filter((lead) => {
    if (!lead.next_follow_up_at) return false;

    const followUpDate = new Date(
      lead.next_follow_up_at
    );

    return (
      followUpDate >= startOfToday &&
      followUpDate < startOfTomorrow
    );
  });

  const upcoming = followUpLeads.filter((lead) => {
    if (!lead.next_follow_up_at) return false;

    return (
      new Date(lead.next_follow_up_at) >=
      startOfTomorrow
    );
  });

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div>
        <p className="text-sm font-semibold text-blue-600">
          PRODUCTIVITY
        </p>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          Follow-ups
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
          Stay on top of every opportunity and make sure
          no lead slips through the cracks.
        </p>
      </div>

      {/* Summary cards */}
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <SummaryCard
          label="Overdue"
          value={overdue.length}
          description="Follow-ups requiring immediate attention"
          icon={<AlertCircle className="h-5 w-5" />}
          iconClassName="bg-red-50 text-red-600"
        />

        <SummaryCard
          label="Due today"
          value={dueToday.length}
          description="Follow-ups scheduled for today"
          icon={<CalendarClock className="h-5 w-5" />}
          iconClassName="bg-blue-50 text-blue-600"
        />

        <SummaryCard
          label="Upcoming"
          value={upcoming.length}
          description="Future follow-ups already scheduled"
          icon={<Clock3 className="h-5 w-5" />}
          iconClassName="bg-amber-50 text-amber-600"
        />
      </div>

      {/* Overdue */}
      <FollowUpSection
        title="Overdue"
        description="These leads need attention now."
        leads={overdue}
        emptyMessage="You're all caught up. No overdue follow-ups."
        tone="red"
      />

      {/* Due Today */}
      <FollowUpSection
        title="Due Today"
        description="Follow-ups scheduled for today."
        leads={dueToday}
        emptyMessage="Nothing scheduled for today."
        tone="blue"
      />

      {/* Upcoming */}
      <FollowUpSection
        title="Upcoming"
        description="Your upcoming scheduled follow-ups."
        leads={upcoming}
        emptyMessage="No upcoming follow-ups scheduled."
        tone="slate"
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  description,
  icon,
  iconClassName,
}: {
  label: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  iconClassName: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            {value}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClassName}`}
        >
          {icon}
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-400">
        {description}
      </p>
    </div>
  );
}

function FollowUpSection({
  title,
  description,
  leads,
  emptyMessage,
  tone,
}: {
  title: string;
  description: string;
  leads: Lead[];
  emptyMessage: string;
  tone: "red" | "blue" | "slate";
}) {
  const toneClasses = {
    red: {
      dot: "bg-red-500",
      badge: "bg-red-50 text-red-700",
    },
    blue: {
      dot: "bg-blue-500",
      badge: "bg-blue-50 text-blue-700",
    },
    slate: {
      dot: "bg-slate-400",
      badge: "bg-slate-100 text-slate-600",
    },
  };

  const colors = toneClasses[tone];

  return (
    <section className="mt-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div
              className={`h-2.5 w-2.5 rounded-full ${colors.dot}`}
            />

            <h2 className="text-xl font-semibold tracking-tight text-slate-950">
              {title}
            </h2>

            <span
              className={`inline-flex min-w-6 items-center justify-center rounded-md px-2 py-0.5 text-xs font-semibold ${colors.badge}`}
            >
              {leads.length}
            </span>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            {description}
          </p>
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
          <CheckCircle2 className="mx-auto h-6 w-6 text-slate-300" />

          <p className="mt-3 text-sm text-slate-400">
            {emptyMessage}
          </p>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="divide-y divide-slate-100">
            {leads.map((lead) => (
              <Link
                key={lead.id}
                href={`/leads/${lead.id}`}
                className="group flex flex-col gap-4 px-5 py-5 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white">
                    {getInitials(lead)}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-blue-600">
                      {getLeadName(lead)}
                    </p>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      {lead.phone && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                          <Phone className="h-3.5 w-3.5" />
                          {lead.phone}
                        </span>
                      )}

                      {lead.email && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                          <Mail className="h-3.5 w-3.5" />
                          {lead.email}
                        </span>
                      )}

                      {!lead.phone && !lead.email && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                          <User className="h-3.5 w-3.5" />
                          No contact information
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-5">
                  <div className="text-left sm:text-right">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Follow-up
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      {lead.next_follow_up_at
                        ? formatDateTime(
                            lead.next_follow_up_at
                          )
                        : "Not scheduled"}
                    </p>
                  </div>

                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusClass(
                      lead.status
                    )}`}
                  >
                    {lead.status}
                  </span>

                  <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-500" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}