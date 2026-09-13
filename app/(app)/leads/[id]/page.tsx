import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  ListTodo,
  Mail,
  Pencil,
  Phone,
  PhoneCall,
  PlusCircle,
  User,
  Bot,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import DeleteLeadButton from "./delete-lead-button";

type LeadPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type Activity = {
  id: string;
  lead_id: string;
  activity_type: string;
  title: string | null;
  description: string | null;
  created_at: string;
};

type Task = {
  id: string;
  lead_id: string | null;
  title: string;
  description: string | null;
  due_at: string | null;
  status: "pending" | "completed";
  priority: "low" | "medium" | "high";
  completed_at: string | null;
  created_at: string;
};

type Appointment = {
  id: string;
  organization_id: string;
  lead_id: string | null;
  assigned_to: string | null;
  title: string;
  appointment_type: string;
  status:
    | "scheduled"
    | "confirmed"
    | "completed"
    | "no_show"
    | "cancelled";
  start_at: string;
  end_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function getLeadStatusClass(status: string) {
  switch (status) {
    case "new":
      return "bg-blue-50 text-blue-700 ring-blue-600/10";

    case "contacted":
      return "bg-violet-50 text-violet-700 ring-violet-600/10";

    case "qualified":
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/10";

    case "unqualified":
      return "bg-slate-100 text-slate-600 ring-slate-500/10";

    case "won":
      return "bg-green-50 text-green-700 ring-green-600/10";

    case "lost":
      return "bg-red-50 text-red-600 ring-red-600/10";

    default:
      return "bg-slate-100 text-slate-700 ring-slate-500/10";
  }
}

function getTaskPriorityClass(
  priority: "low" | "medium" | "high"
) {
  switch (priority) {
    case "high":
      return "bg-red-50 text-red-600";

    case "medium":
      return "bg-amber-50 text-amber-600";

    case "low":
      return "bg-slate-100 text-slate-500";

    default:
      return "bg-slate-100 text-slate-500";
  }
}

function getAppointmentStatusClass(status: string) {
  switch (status) {
    case "scheduled":
      return "bg-blue-50 text-blue-700 ring-blue-600/10";

    case "confirmed":
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/10";

    case "completed":
      return "bg-slate-100 text-slate-600 ring-slate-500/10";

    case "no_show":
      return "bg-amber-50 text-amber-700 ring-amber-600/10";

    case "cancelled":
      return "bg-red-50 text-red-600 ring-red-600/10";

    default:
      return "bg-slate-100 text-slate-600 ring-slate-500/10";
  }
}

function formatAppointmentType(type: string) {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatAppointmentStatus(status: string) {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatAppointmentDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatAppointmentTime(
  start: string,
  end: string | null
) {
  const startDate = new Date(start);

  const startTime = startDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (!end) {
    return startTime;
  }

  const endTime = new Date(end).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${startTime} – ${endTime}`;
}

function formatTaskDueDate(date: string | null) {
  if (!date) return "No due date";

  const dueDate = new Date(date);
  const today = new Date();

  const isToday =
    dueDate.getFullYear() === today.getFullYear() &&
    dueDate.getMonth() === today.getMonth() &&
    dueDate.getDate() === today.getDate();

  if (isToday) {
    return `Today, ${dueDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }

  return dueDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getActivityPresentation(activityType: string) {
  switch (activityType) {
    case "lead_created":
      return {
        icon: <PlusCircle className="h-4 w-4 text-blue-600" />,
        className: "border-blue-100 bg-blue-50",
      };

    case "note_added":
      return {
        icon: <FileText className="h-4 w-4 text-violet-600" />,
        className: "border-violet-100 bg-violet-50",
      };

    case "follow_up_scheduled":
      return {
        icon: <CalendarClock className="h-4 w-4 text-amber-600" />,
        className: "border-amber-100 bg-amber-50",
      };

    case "lead_updated":
      return {
        icon: <Pencil className="h-4 w-4 text-slate-600" />,
        className: "border-slate-200 bg-slate-100",
      };

    case "call_logged":
      return {
        icon: <PhoneCall className="h-4 w-4 text-emerald-600" />,
        className: "border-emerald-100 bg-emerald-50",
      };

    case "status_changed":
      return {
        icon: (
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        ),
        className: "border-green-100 bg-green-50",
      };

    case "automation":
      return {
        icon: <Bot className="h-4 w-4 text-indigo-600" />,
        className: "border-indigo-100 bg-indigo-50",
      };

    default:
      return {
        icon: <User className="h-4 w-4 text-slate-500" />,
        className: "border-slate-200 bg-slate-100",
      };
  }
}

export default async function LeadPage({
  params,
}: LeadPageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data: lead, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !lead) {
    notFound();
  }

  const {
    data: activitiesData,
    error: activitiesError,
  } = await supabase
    .from("lead_activities")
    .select("*")
    .eq("lead_id", id)
    .order("created_at", {
      ascending: false,
    });

  if (activitiesError) {
    console.error(
      "Error loading lead activities:",
      activitiesError
    );
  }

  const {
    data: tasksData,
    error: tasksError,
  } = await supabase
    .from("tasks")
    .select(`
      id,
      lead_id,
      title,
      description,
      due_at,
      status,
      priority,
      completed_at,
      created_at
    `)
    .eq("lead_id", id)
    .order("due_at", {
      ascending: true,
      nullsFirst: false,
    });

  if (tasksError) {
    console.error(
      "Error loading lead tasks:",
      tasksError
    );
  }

  const {
    data: appointmentsData,
    error: appointmentsError,
  } = await supabase
    .from("appointments")
    .select(`
      id,
      organization_id,
      lead_id,
      assigned_to,
      title,
      appointment_type,
      status,
      start_at,
      end_at,
      notes,
      created_at,
      updated_at
    `)
    .eq("lead_id", id)
    .order("start_at", {
      ascending: true,
    });

  if (appointmentsError) {
    console.error(
      "Error loading lead appointments:",
      appointmentsError
    );
  }

  const activities =
    (activitiesData || []) as Activity[];

  const tasks =
    (tasksData || []) as Task[];

  const appointments =
    (appointmentsData || []) as Appointment[];

  const openTasks = tasks.filter(
    (task) => task.status === "pending"
  );

  const completedTasks = tasks.filter(
    (task) => task.status === "completed"
  );

  const now = new Date();

  const upcomingAppointments = appointments.filter(
    (appointment) =>
      new Date(appointment.start_at) >= now &&
      appointment.status !== "cancelled"
  );

  const pastAppointments = appointments
    .filter(
      (appointment) =>
        new Date(appointment.start_at) < now ||
        appointment.status === "cancelled"
    )
    .reverse();

  const leadName =
    [lead.first_name, lead.last_name]
      .filter(Boolean)
      .join(" ") ||
    lead.company_name ||
    "Unnamed Lead";

  const leadInitials = leadName
    .split(" ")
    .slice(0, 2)
    .map((name: string) => name.charAt(0))
    .join("")
    .toUpperCase();

  const hasEmail = Boolean(lead.email);
  const hasPhone = Boolean(lead.phone);

  const nextFollowUp = lead.next_follow_up_at
    ? new Date(lead.next_follow_up_at)
    : null;

  const followUpIsOverdue =
    nextFollowUp !== null &&
    nextFollowUp < now;

  return (
    <div className="mx-auto max-w-7xl pb-10">
      {/* Back */}
      <Link
        href="/leads"
        className="group inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-950"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        Back to Leads
      </Link>

      {/* Header */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-5 sm:p-6 lg:p-7">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex min-w-0 items-start gap-4 sm:gap-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-lg font-semibold text-white shadow-sm sm:h-16 sm:w-16 sm:text-xl">
                {leadInitials}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="break-words text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                    {leadName}
                  </h1>

                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${getLeadStatusClass(
                      lead.status
                    )}`}
                  >
                    {lead.status}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-slate-500">
                  <span>
                    Lead created {formatDate(lead.created_at)}
                  </span>

                  {lead.source && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span>{lead.source}</span>
                    </>
                  )}

                  {lead.service_interest && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span>{lead.service_interest}</span>
                    </>
                  )}
                </div>

                {(hasEmail || hasPhone) && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {hasPhone && (
                      <a
                        href={`tel:${lead.phone}`}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        Call
                      </a>
                    )}

                    {hasEmail && (
                      <a
                        href={`mailto:${lead.email}`}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        Email
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/leads/${lead.id}/edit`}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <Pencil className="h-4 w-4" />
                Edit Lead
              </Link>

              <DeleteLeadButton leadId={lead.id} />
            </div>
          </div>
        </div>

        {/* Header metrics */}
        <div className="grid border-t border-slate-100 sm:grid-cols-3">
          <HeaderMetric
            label="Appointments"
            value={appointments.length}
            detail={
              upcomingAppointments.length > 0
                ? `${upcomingAppointments.length} upcoming`
                : "No upcoming"
            }
          />

          <HeaderMetric
            label="Open Tasks"
            value={openTasks.length}
            detail={
              openTasks.length > 0
                ? "Needs attention"
                : "Nothing pending"
            }
          />

          <HeaderMetric
            label="Activity"
            value={activities.length}
            detail="Recorded interactions"
          />
        </div>
      </div>

      {/* Main content */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main column */}
        <div className="space-y-6">
          {/* Contact */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <SectionHeader
              title="Contact Information"
              description="How to reach this lead."
              icon={<User className="h-4 w-4" />}
            />

            <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
              <ContactCard
                icon={<Mail className="h-4 w-4" />}
                label="Email"
                value={lead.email || "Not provided"}
                href={
                  lead.email
                    ? `mailto:${lead.email}`
                    : undefined
                }
              />

              <ContactCard
                icon={<Phone className="h-4 w-4" />}
                label="Phone"
                value={lead.phone || "Not provided"}
                href={
                  lead.phone
                    ? `tel:${lead.phone}`
                    : undefined
                }
              />
            </div>
          </section>

          {/* Lead details */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <SectionHeader
              title="Lead Details"
              description="Information about this opportunity."
              icon={<FileText className="h-4 w-4" />}
            />

            <div className="grid gap-6 p-5 sm:grid-cols-2 sm:p-6">
              <InfoItem
                icon={<User className="h-4 w-4" />}
                label="Lead Source"
                value={lead.source || "Not specified"}
              />

              <InfoItem
                icon={<Calendar className="h-4 w-4" />}
                label="Service Interest"
                value={
                  lead.service_interest ||
                  "Not specified"
                }
              />
            </div>
          </section>

          {/* Appointments */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <SectionHeader
              title="Appointments"
              description="Scheduled appointments and service history."
              icon={<CalendarClock className="h-4 w-4" />}
              count={appointments.length}
            />

            {appointments.length === 0 ? (
              <EmptySection
                icon={<CalendarClock className="h-5 w-5" />}
                title="No appointments yet"
                description="Appointments connected to this lead will appear here."
                actionHref="/appointments"
                actionLabel="Open Calendar"
              />
            ) : (
              <div>
                {upcomingAppointments.length > 0 && (
                  <div>
                    <SectionLabel label="Upcoming" />

                    <div className="divide-y divide-slate-100">
                      {upcomingAppointments.map(
                        (appointment) => (
                          <AppointmentRow
                            key={appointment.id}
                            appointment={appointment}
                          />
                        )
                      )}
                    </div>
                  </div>
                )}

                {pastAppointments.length > 0 && (
                  <div>
                    <SectionLabel label="History" />

                    <div className="divide-y divide-slate-100">
                      {pastAppointments.map(
                        (appointment) => (
                          <AppointmentRow
                            key={appointment.id}
                            appointment={appointment}
                            muted
                          />
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {appointments.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="text-xs text-slate-400">
                  {upcomingAppointments.length} upcoming ·{" "}
                  {pastAppointments.length} history
                </p>

                <Link
                  href="/appointments"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 transition hover:text-slate-950"
                >
                  View calendar
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </section>

          {/* Tasks */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <SectionHeader
              title="Related Tasks"
              description="Tasks and follow-ups associated with this lead."
              icon={<ListTodo className="h-4 w-4" />}
              count={tasks.length}
            />

            {tasks.length === 0 ? (
              <EmptySection
                icon={<ListTodo className="h-5 w-5" />}
                title="No tasks yet"
                description="Tasks connected to this lead will appear here."
                actionHref="/tasks"
                actionLabel="Create Task"
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {tasks.map((task) => {
                  const isCompleted =
                    task.status === "completed";

                  const isOverdue =
                    !isCompleted &&
                    Boolean(task.due_at) &&
                    new Date(task.due_at as string) <
                      new Date();

                  return (
                    <div
                      key={task.id}
                      className={`px-5 py-5 sm:px-6 ${
                        isCompleted ? "opacity-60" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            isCompleted
                              ? "bg-green-100 text-green-600"
                              : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <Clock3 className="h-4 w-4" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p
                                className={`text-sm font-semibold ${
                                  isCompleted
                                    ? "text-slate-400 line-through"
                                    : "text-slate-800"
                                }`}
                              >
                                {task.title}
                              </p>

                              {task.description && (
                                <p className="mt-1.5 text-sm leading-6 text-slate-500">
                                  {task.description}
                                </p>
                              )}
                            </div>

                            <span
                              className={`inline-flex w-fit shrink-0 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${getTaskPriorityClass(
                                task.priority
                              )}`}
                            >
                              {task.priority}
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                            <span
                              className={`inline-flex items-center gap-1.5 ${
                                isOverdue
                                  ? "font-semibold text-red-600"
                                  : "text-slate-400"
                              }`}
                            >
                              <Clock3 className="h-3.5 w-3.5" />
                              {formatTaskDueDate(
                                task.due_at
                              )}
                            </span>

                            {isCompleted && (
                              <span className="font-semibold text-green-600">
                                Completed
                              </span>
                            )}

                            {isOverdue && (
                              <span className="rounded-md bg-red-50 px-2 py-1 font-semibold text-red-600">
                                Overdue
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {tasks.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="text-xs text-slate-400">
                  {openTasks.length} open ·{" "}
                  {completedTasks.length} completed
                </p>

                <Link
                  href="/tasks"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 transition hover:text-slate-950"
                >
                  View all tasks
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </section>

          {/* Notes */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <SectionHeader
              title="Notes"
              description="Important information and context about this lead."
              icon={<FileText className="h-4 w-4" />}
            />

            <div className="p-5 sm:p-6">
              {lead.notes ? (
                <div className="rounded-xl bg-slate-50 px-4 py-4">
                  <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">
                    {lead.notes}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-5">
                  <p className="text-sm text-slate-400">
                    No notes have been added yet.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Activity */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <SectionHeader
              title="Activity"
              description="A complete history of activity related to this lead."
              count={activities.length}
            />

            {activities.length === 0 ? (
              <EmptySection
                icon={<Clock3 className="h-5 w-5" />}
                title="No activity yet"
                description="Activity will appear here as this lead is managed."
              />
            ) : (
              <div className="p-5 sm:p-6">
                <div className="space-y-7">
                  {activities.map(
                    (activity, index) => {
                      const presentation =
                        getActivityPresentation(
                          activity.activity_type
                        );

                      const isLast =
                        index ===
                        activities.length - 1;

                      return (
                        <div
                          key={activity.id}
                          className="relative flex gap-4"
                        >
                          {!isLast && (
                            <div className="absolute bottom-[-28px] left-4 top-9 w-px bg-slate-100" />
                          )}

                          <div
                            className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${presentation.className}`}
                          >
                            {presentation.icon}
                          </div>

                          <div className="min-w-0 flex-1 pb-1">
                            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                              <p className="text-sm font-semibold text-slate-800">
                                {activity.title ||
                                  "Lead activity"}
                              </p>

                              <p className="shrink-0 text-xs text-slate-400">
                                {formatDateTime(
                                  activity.created_at
                                )}
                              </p>
                            </div>

                            {activity.description && (
                              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-slate-500">
                                {activity.description}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Next action */}
          <section
            className={`rounded-2xl border bg-white p-5 shadow-sm ${
              followUpIsOverdue
                ? "border-red-200"
                : "border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                Next Follow-up
              </p>

              <CalendarClock
                className={`h-4 w-4 ${
                  followUpIsOverdue
                    ? "text-red-500"
                    : "text-slate-400"
                }`}
              />
            </div>

            <div className="mt-4">
              {nextFollowUp ? (
                <>
                  <p
                    className={`text-base font-semibold ${
                      followUpIsOverdue
                        ? "text-red-600"
                        : "text-slate-900"
                    }`}
                  >
                    {formatDateTime(
                      lead.next_follow_up_at
                    )}
                  </p>

                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        followUpIsOverdue
                          ? "bg-red-500"
                          : "bg-blue-500"
                      }`}
                    />

                    <p
                      className={`text-xs font-medium ${
                        followUpIsOverdue
                          ? "text-red-600"
                          : "text-slate-400"
                      }`}
                    >
                      {followUpIsOverdue
                        ? "Follow-up is overdue"
                        : "Scheduled follow-up"}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-slate-700">
                    No follow-up scheduled
                  </p>

                  <p className="mt-1.5 text-xs leading-5 text-slate-400">
                    Schedule the next touchpoint to keep this opportunity moving.
                  </p>
                </>
              )}
            </div>
          </section>

          {/* Status */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
              Lead Status
            </p>

            <div className="mt-4">
              <span
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold capitalize ring-1 ring-inset ${getLeadStatusClass(
                  lead.status
                )}`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                {lead.status}
              </span>
            </div>
          </section>

          {/* Assignment */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
              Assigned To
            </p>

            <div className="mt-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                <User className="h-4 w-4 text-slate-400" />
              </div>

              <div>
                <p className="text-sm font-medium text-slate-500">
                  Unassigned
                </p>

                <p className="mt-0.5 text-xs text-slate-400">
                  No team member assigned
                </p>
              </div>
            </div>
          </section>

          {/* Summary */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
              Lead Summary
            </p>

            <div className="mt-4 divide-y divide-slate-100">
              <SummaryRow
                label="Activity"
                value={activities.length}
              />

              <SummaryRow
                label="Appointments"
                value={appointments.length}
              />

              <SummaryRow
                label="Upcoming"
                value={upcomingAppointments.length}
              />

              <SummaryRow
                label="Open Tasks"
                value={openTasks.length}
              />

              <SummaryRow
                label="Completed Tasks"
                value={completedTasks.length}
              />
            </div>
          </section>

          {/* Contact details */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
              Contact
            </p>

            <div className="mt-4 space-y-3">
              {lead.phone && (
                <a
                  href={`tel:${lead.phone}`}
                  className="group flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-3 transition hover:border-slate-200 hover:bg-slate-50"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                    <Phone className="h-3.5 w-3.5 text-slate-500" />
                  </div>

                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-600 group-hover:text-slate-950">
                    {lead.phone}
                  </span>

                  <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-700" />
                </a>
              )}

              {lead.email && (
                <a
                  href={`mailto:${lead.email}`}
                  className="group flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-3 transition hover:border-slate-200 hover:bg-slate-50"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                    <Mail className="h-3.5 w-3.5 text-slate-500" />
                  </div>

                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-600 group-hover:text-slate-950">
                    {lead.email}
                  </span>

                  <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-700" />
                </a>
              )}

              {!lead.phone && !lead.email && (
                <p className="text-sm text-slate-400">
                  No contact information provided.
                </p>
              )}
            </div>
          </section>

          {/* Created */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />

              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                Created
              </p>
            </div>

            <p className="mt-3 text-sm font-medium text-slate-700">
              {formatDateTime(lead.created_at)}
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function HeaderMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="border-t border-slate-100 px-5 py-4 first:border-t-0 sm:border-l sm:border-t-0 sm:px-6 sm:py-5 first:sm:border-l-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>

      <div className="mt-1.5 flex items-baseline gap-2">
        <p className="text-xl font-semibold tracking-tight text-slate-950">
          {value}
        </p>

        <p className="text-xs text-slate-400">
          {detail}
        </p>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  description,
  icon,
  count,
}: {
  title: string;
  description: string;
  icon?: React.ReactNode;
  count?: number;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
      <div className="flex min-w-0 gap-3">
        {icon && (
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            {icon}
          </div>
        )}

        <div className="min-w-0">
          <h2 className="font-semibold text-slate-950">
            {title}
          </h2>

          <p className="mt-1 text-sm leading-5 text-slate-500">
            {description}
          </p>
        </div>
      </div>

      {typeof count === "number" && (
        <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
          {count}
        </span>
      )}
    </div>
  );
}

function SectionLabel({
  label,
}: {
  label: string;
}) {
  return (
    <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3 sm:px-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
    </div>
  );
}

function EmptySection({
  icon,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-14 text-center sm:px-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        {icon}
      </div>

      <p className="mt-4 text-sm font-semibold text-slate-700">
        {title}
      </p>

      <p className="mt-1 max-w-sm text-sm leading-6 text-slate-400">
        {description}
      </p>

      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {actionLabel}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

function ContactCard({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
          {label}
        </p>

        <p
          className={`mt-1 break-words text-sm ${
            href
              ? "font-medium text-slate-700"
              : "text-slate-400"
          }`}
        >
          {value}
        </p>
      </div>

      {href && (
        <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300" />
      )}
    </>
  );

  if (!href) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
        {content}
      </div>
    );
  }

  return (
    <a
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-slate-100 p-3.5 transition hover:border-slate-200 hover:bg-slate-50"
    >
      {content}
    </a>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span className="text-sm font-semibold text-slate-800">
        {value}
      </span>
    </div>
  );
}

function AppointmentRow({
  appointment,
  muted = false,
}: {
  appointment: Appointment;
  muted?: boolean;
}) {
  return (
    <div
      className={`flex gap-4 px-5 py-5 sm:px-6 ${
        muted
          ? "opacity-60"
          : "transition hover:bg-slate-50/50"
      }`}
    >
      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-slate-950 text-white">
        <span className="text-[9px] font-bold uppercase tracking-wide text-slate-300">
          {new Date(
            appointment.start_at
          ).toLocaleDateString("en-US", {
            month: "short",
          })}
        </span>

        <span className="text-lg font-semibold leading-none">
          {new Date(
            appointment.start_at
          ).getDate()}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">
              {appointment.title}
            </p>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-400">
              <span>
                {formatAppointmentDate(
                  appointment.start_at
                )}
              </span>

              <span className="hidden text-slate-300 sm:inline">
                •
              </span>

              <span>
                {formatAppointmentTime(
                  appointment.start_at,
                  appointment.end_at
                )}
              </span>
            </div>
          </div>

          <span
            className={`inline-flex w-fit shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${getAppointmentStatusClass(
              appointment.status
            )}`}
          >
            {formatAppointmentStatus(
              appointment.status
            )}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            {formatAppointmentType(
              appointment.appointment_type
            )}
          </span>

          {appointment.notes && (
            <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-slate-400">
              <FileText className="h-3.5 w-3.5 shrink-0" />

              <span className="max-w-[260px] truncate">
                {appointment.notes}
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 shrink-0 text-slate-400">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
          {label}
        </p>

        <p className="mt-1 break-words text-sm text-slate-700">
          {value}
        </p>
      </div>
    </div>
  );
}