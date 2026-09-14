"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Trash2,
  User,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Appointment = {
  id: string;
  organization_id: string;
  lead_id: string | null;
  title: string;
  status: string;
  start_at: string;
  end_at: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type Lead = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
};

type Props = {
  organizationId: string;
  appointments: Appointment[];
  leads: Lead[];
};

type FormState = {
  title: string;
  lead_id: string;
  status: string;
  start_at: string;
  end_at: string;
  notes: string;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_OPTIONS = [
  "scheduled",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
];

function getLeadName(lead?: Lead | null) {
  if (!lead) return "Unknown Contact";

  const name = `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim();

  return name || "Unknown Contact";
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatStatus(status: string) {
  return status
    .replace("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);

  const pad = (number: number) => String(number).padStart(2, "0");

  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`;
}

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getCalendarDays(date: Date) {
  const first = getMonthStart(date);
  const startDay = first.getDay();

  const start = new Date(
    date.getFullYear(),
    date.getMonth(),
    1 - startDay
  );

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function isSameDay(dateA: Date, dateB: Date) {
  return dateKey(dateA) === dateKey(dateB);
}

function emptyForm(): FormState {
  const now = new Date();

  now.setSeconds(0, 0);

  const end = new Date(now);
  end.setHours(end.getHours() + 1);

  return {
    title: "",
    lead_id: "",
    status: "scheduled",
    start_at: toDateTimeLocal(now.toISOString()),
    end_at: toDateTimeLocal(end.toISOString()),
    notes: "",
  };
}

function getStatusClasses(status: string) {
  switch (status) {
    case "confirmed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "completed":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "cancelled":
      return "border-red-200 bg-red-50 text-red-700";

    case "no_show":
      return "border-amber-200 bg-amber-50 text-amber-700";

    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
}

function getCalendarAppointmentClasses(status: string) {
  switch (status) {
    case "confirmed":
      return "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300 hover:bg-emerald-100";

    case "completed":
      return "border-blue-200 bg-blue-50 text-blue-800 hover:border-blue-300 hover:bg-blue-100";

    case "cancelled":
      return "border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100";

    case "no_show":
      return "border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300 hover:bg-amber-100";

    default:
      return "border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300 hover:bg-slate-100";
  }
}

export default function CalendarClient({
  organizationId,
  appointments: initialAppointments,
  leads,
}: Props) {
  const supabase = createClient();

  const [appointments, setAppointments] =
    useState<Appointment[]>(initialAppointments);

  const [currentMonth, setCurrentMonth] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );

  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [form, setForm] = useState<FormState>(emptyForm());

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const calendarDays = useMemo(
    () => getCalendarDays(currentMonth),
    [currentMonth]
  );

  const leadMap = useMemo(() => {
    return new Map(leads.map((lead) => [lead.id, lead]));
  }, [leads]);

  const filteredAppointments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return appointments.filter((appointment) => {
      const lead = leadMap.get(appointment.lead_id ?? "");
      const leadName = getLeadName(lead);

      const matchesSearch =
        !query ||
        appointment.title.toLowerCase().includes(query) ||
        leadName.toLowerCase().includes(query) ||
        (appointment.notes ?? "").toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" || appointment.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [appointments, leadMap, search, statusFilter]);

  const upcomingAppointments = useMemo(() => {
    const now = Date.now();

    return [...filteredAppointments]
      .filter((appointment) => {
        return new Date(appointment.end_at).getTime() >= now;
      })
      .sort(
        (a, b) =>
          new Date(a.start_at).getTime() -
          new Date(b.start_at).getTime()
      )
      .slice(0, 6);
  }, [filteredAppointments]);

  const monthAppointmentCount = useMemo(() => {
    return filteredAppointments.filter((appointment) => {
      const date = new Date(appointment.start_at);

      return (
        date.getFullYear() === currentMonth.getFullYear() &&
        date.getMonth() === currentMonth.getMonth()
      );
    }).length;
  }, [filteredAppointments, currentMonth]);

  const confirmedCount = useMemo(() => {
    return filteredAppointments.filter(
      (appointment) => appointment.status === "confirmed"
    ).length;
  }, [filteredAppointments]);

  const scheduledCount = useMemo(() => {
    return filteredAppointments.filter(
      (appointment) => appointment.status === "scheduled"
    ).length;
  }, [filteredAppointments]);

  function appointmentsForDay(day: Date) {
    return filteredAppointments
      .filter((appointment) =>
        isSameDay(new Date(appointment.start_at), day)
      )
      .sort(
        (a, b) =>
          new Date(a.start_at).getTime() -
          new Date(b.start_at).getTime()
      );
  }

  function openCreate(day?: Date) {
    setSelectedAppointment(null);
    setError("");

    const nextForm = emptyForm();

    if (day) {
      const start = new Date(day);
      start.setHours(9, 0, 0, 0);

      const end = new Date(start);
      end.setHours(10, 0, 0, 0);

      nextForm.start_at = toDateTimeLocal(start.toISOString());
      nextForm.end_at = toDateTimeLocal(end.toISOString());
    }

    setForm(nextForm);
    setIsCreating(true);
    setIsModalOpen(true);
  }

  function openEdit(appointment: Appointment) {
    setSelectedAppointment(appointment);
    setError("");

    setForm({
      title: appointment.title,
      lead_id: appointment.lead_id ?? "",
      status: appointment.status,
      start_at: toDateTimeLocal(appointment.start_at),
      end_at: toDateTimeLocal(appointment.end_at),
      notes: appointment.notes ?? "",
    });

    setIsCreating(false);
    setIsModalOpen(true);
  }

  function closeModal() {
    if (saving || deleting) return;

    setIsModalOpen(false);
    setSelectedAppointment(null);
    setError("");
  }

  async function dispatchAppointmentEvent(
    appointment: Appointment,
    eventType: string
  ) {
    try {
      const lead = leadMap.get(appointment.lead_id ?? "");

      /*
       * Generate the event ID ourselves.
       *
       * This lets us insert the event without requiring a SELECT
       * permission on automation_events.
       */
      const eventId = crypto.randomUUID();

      const { error: eventError } = await supabase
        .from("automation_events")
        .insert({
          id: eventId,
          organization_id: organizationId,
          event_type: eventType,
          lead_id: appointment.lead_id,
          contact_id: null,
          appointment_id: appointment.id,
          estimate_id: null,
          job_id: null,
          payment_id: null,
          review_id: null,
          payload: {
            appointment_id: appointment.id,
            organization_id: organizationId,
            lead_id: appointment.lead_id,
            title: appointment.title,
            status: appointment.status,
            start_at: appointment.start_at,
            end_at: appointment.end_at,
            notes: appointment.notes,
            first_name: lead?.first_name ?? null,
            last_name: lead?.last_name ?? null,
            phone: lead?.phone ?? null,
            email: lead?.email ?? null,
          },
          status: "pending",
        });

      if (eventError) {
        console.error(
          "Appointment automation event creation failed:",
          eventError
        );

        setError(
          `Appointment created, but automation event failed: ${eventError.message}`
        );

        return;
      }

      console.log("Appointment automation event created successfully", {
        event_id: eventId,
        event_type: eventType,
      });

      const response = await fetch("/api/automation/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_id: eventId,
          organization_id: organizationId,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        console.error(
          "Appointment automation event dispatch failed:",
          result
        );

        setError(
          `Appointment created and event saved, but automation dispatch failed: ${
            result?.error ?? "Unknown dispatch error"
          }`
        );

        return;
      }

      console.log("Appointment automation event delivered successfully", {
        event_id: eventId,
        event_type: eventType,
        n8n_response: result,
      });
    } catch (dispatchError) {
      console.error(
        "Unexpected appointment automation dispatch error:",
        dispatchError
      );

      setError(
        `Appointment created, but automation failed: ${
          dispatchError instanceof Error
            ? dispatchError.message
            : "Unknown error"
        }`
      );
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    setError("");

    if (!form.title.trim()) {
      setError("Please enter an appointment title.");
      return;
    }

    if (!form.start_at || !form.end_at) {
      setError("Please choose a start and end time.");
      return;
    }

    const start = new Date(form.start_at);
    const end = new Date(form.end_at);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setError("Please enter valid appointment times.");
      return;
    }

    if (end <= start) {
      setError("The end time must be after the start time.");
      return;
    }

    setSaving(true);

    const payload = {
      organization_id: organizationId,
      lead_id: form.lead_id || null,
      title: form.title.trim(),
      status: form.status,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      notes: form.notes.trim() || null,
    };

    if (selectedAppointment) {
      const { data, error: updateError } = await supabase
        .from("appointments")
        .update(payload)
        .eq("id", selectedAppointment.id)
        .select(
          "id, organization_id, lead_id, title, status, start_at, end_at, notes, created_at, updated_at"
        )
        .single();

      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }

      setAppointments((current) =>
        current.map((appointment) =>
          appointment.id === selectedAppointment.id ? data : appointment
        )
      );
    } else {
      const { data, error: insertError } = await supabase
        .from("appointments")
        .insert(payload)
        .select(
          "id, organization_id, lead_id, title, status, start_at, end_at, notes, created_at, updated_at"
        )
        .single();

      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }

      setAppointments((current) =>
        [...current, data].sort(
          (a, b) =>
            new Date(a.start_at).getTime() -
            new Date(b.start_at).getTime()
        )
      );

      /*
       * Only brand-new appointments trigger appointment_booked.
       * Editing an existing appointment does not create another
       * booking event and therefore will not duplicate reminders.
       */
      await dispatchAppointmentEvent(data, "appointment_booked");
    }

    setSaving(false);
    setIsModalOpen(false);
    setSelectedAppointment(null);
  }

  async function handleDelete() {
    if (!selectedAppointment) return;

    const confirmed = window.confirm(
      "Delete this appointment? This action cannot be undone."
    );

    if (!confirmed) return;

    setDeleting(true);
    setError("");

    const { error: deleteError } = await supabase
      .from("appointments")
      .delete()
      .eq("id", selectedAppointment.id);

    if (deleteError) {
      setError(deleteError.message);
      setDeleting(false);
      return;
    }

    setAppointments((current) =>
      current.filter(
        (appointment) => appointment.id !== selectedAppointment.id
      )
    );

    setDeleting(false);
    setIsModalOpen(false);
    setSelectedAppointment(null);
  }

  function goToToday() {
    const today = new Date();

    setCurrentMonth(
      new Date(today.getFullYear(), today.getMonth(), 1)
    );
  }

  function previousMonth() {
    setCurrentMonth(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() - 1,
          1
        )
    );
  }

  function nextMonth() {
    setCurrentMonth(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() + 1,
          1
        )
    );
  }

  const monthLabel = currentMonth.toLocaleDateString([], {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
                  <CalendarDays size={22} />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                      Calendar
                    </h1>

                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Schedule
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-slate-500">
                    Manage appointments, customer visits, and your team&apos;s
                    schedule.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => openCreate()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md"
            >
              <Plus size={18} />
              New Appointment
            </button>
          </div>
        </div>

        <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <CalendarDays size={17} />
              </div>

              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                This Month
              </span>
            </div>

            <div className="mt-4">
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                {monthAppointmentCount}
              </div>

              <p className="mt-1 text-xs text-slate-500">
                Appointments scheduled
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Clock3 size={17} />
              </div>

              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Confirmed
              </span>
            </div>

            <div className="mt-4">
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                {confirmedCount}
              </div>

              <p className="mt-1 text-xs text-slate-500">
                Customer-confirmed appointments
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <CalendarDays size={17} />
            </div>

            <div className="mt-4">
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                {scheduledCount}
              </div>

              <p className="mt-1 text-xs text-slate-500">
                Appointments awaiting confirmation
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <User size={17} />
              </div>

              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Upcoming
              </span>
            </div>

            <div className="mt-4">
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                {upcomingAppointments.length}
              </div>

              <p className="mt-1 text-xs text-slate-500">
                Next appointments in view
              </p>
            </div>
          </div>
        </div>

        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={previousMonth}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                aria-label="Previous month"
              >
                <ChevronLeft size={18} />
              </button>

              <button
                onClick={nextMonth}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                aria-label="Next month"
              >
                <ChevronRight size={18} />
              </button>

              <button
                onClick={goToToday}
                className="ml-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Today
              </button>

              <div className="ml-1 h-6 w-px bg-slate-200" />

              <h2 className="text-lg font-bold tracking-tight text-slate-900">
                {monthLabel}
              </h2>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search appointments..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100 sm:w-64"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              >
                <option value="all">All statuses</option>

                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {formatStatus(status)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="border-r border-slate-200 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 last:border-r-0"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {calendarDays.map((day) => {
                const dayAppointments = appointmentsForDay(day);

                const isCurrentMonth =
                  day.getMonth() === currentMonth.getMonth();

                const isToday = isSameDay(day, new Date());

                return (
                  <div
                    key={dateKey(day)}
                    onDoubleClick={() => openCreate(day)}
                    className={`group relative min-h-[145px] border-b border-r border-slate-200 p-2 transition ${
                      !isCurrentMonth
                        ? "bg-slate-50/60"
                        : "bg-white hover:bg-slate-50/50"
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <button
                        onClick={() => openCreate(day)}
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition ${
                          isToday
                            ? "bg-slate-900 text-white shadow-sm"
                            : isCurrentMonth
                            ? "text-slate-700 hover:bg-slate-100"
                            : "text-slate-400 hover:bg-slate-100"
                        }`}
                      >
                        {day.getDate()}
                      </button>

                      <button
                        onClick={() => openCreate(day)}
                        className="hidden rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-slate-700 group-hover:block"
                        title="Add appointment"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {dayAppointments.slice(0, 3).map((appointment) => {
                        const lead = leadMap.get(
                          appointment.lead_id ?? ""
                        );

                        return (
                          <button
                            key={appointment.id}
                            onClick={() => openEdit(appointment)}
                            className={`w-full rounded-lg border px-2 py-1.5 text-left shadow-sm transition hover:-translate-y-px hover:shadow ${getCalendarAppointmentClasses(
                              appointment.status
                            )}`}
                          >
                            <div className="truncate text-[10px] font-bold">
                              {formatTime(appointment.start_at)} ·{" "}
                              {appointment.title}
                            </div>

                            <div className="mt-0.5 truncate text-[9px] opacity-70">
                              {getLeadName(lead)}
                            </div>
                          </button>
                        );
                      })}

                      {dayAppointments.length > 3 && (
                        <div className="px-1 text-[10px] font-semibold text-slate-400">
                          +{dayAppointments.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50/60 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900">
                      Upcoming
                    </h3>

                    <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white">
                      {upcomingAppointments.length}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    Your next scheduled appointments
                  </p>
                </div>

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200">
                  <Clock3 size={16} />
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {upcomingAppointments.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
                    <CalendarDays size={23} />
                  </div>

                  <p className="mt-4 text-sm font-semibold text-slate-600">
                    No upcoming appointments
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Create an appointment to start building your schedule.
                  </p>

                  <button
                    onClick={() => openCreate()}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                  >
                    <Plus size={14} />
                    Create Appointment
                  </button>
                </div>
              ) : (
                upcomingAppointments.map((appointment) => {
                  const lead = leadMap.get(
                    appointment.lead_id ?? ""
                  );

                  return (
                    <button
                      key={appointment.id}
                      onClick={() => openEdit(appointment)}
                      className="w-full p-4 text-left transition hover:bg-slate-50"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                          <Clock3 size={16} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-slate-900">
                                {appointment.title}
                              </div>

                              <div className="mt-1 text-xs text-slate-500">
                                {formatDate(appointment.start_at)}
                              </div>
                            </div>

                            <span
                              className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-wide ${getStatusClasses(
                                appointment.status
                              )}`}
                            >
                              {formatStatus(appointment.status)}
                            </span>
                          </div>

                          <div className="mt-2 text-xs font-bold text-slate-700">
                            {formatTime(appointment.start_at)} –{" "}
                            {formatTime(appointment.end_at)}
                          </div>

                          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                            <User size={13} />

                            <span className="truncate">
                              {getLeadName(lead)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>
        </div>
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  {isCreating ? (
                    <Plus size={18} />
                  ) : (
                    <CalendarDays size={18} />
                  )}
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {isCreating
                      ? "New Appointment"
                      : "Appointment Details"}
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500">
                    {isCreating
                      ? "Add an appointment to your schedule."
                      : "Update appointment information and status."}
                  </p>
                </div>
              </div>

              <button
                onClick={closeModal}
                disabled={saving || deleting}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                aria-label="Close"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5">
              {error && (
                <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid gap-5">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Appointment Title
                  </label>

                  <input
                    value={form.title}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    placeholder="Estimate visit, service call, consultation..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  />
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Customer / Lead
                    </label>

                    <select
                      value={form.lead_id}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          lead_id: event.target.value,
                        }))
                      }
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    >
                      <option value="">No customer selected</option>

                      {leads.map((lead) => (
                        <option key={lead.id} value={lead.id}>
                          {getLeadName(lead)}
                          {lead.phone ? ` · ${lead.phone}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Status
                    </label>

                    <select
                      value={form.status}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          status: event.target.value,
                        }))
                      }
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {formatStatus(status)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <Clock3 size={14} className="text-slate-400" />

                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Schedule
                    </span>
                  </div>

                  <div className="grid gap-5 rounded-xl border border-slate-200 bg-slate-50/70 p-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Start
                      </label>

                      <input
                        type="datetime-local"
                        value={form.start_at}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            start_at: event.target.value,
                          }))
                        }
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        End
                      </label>

                      <input
                        type="datetime-local"
                        value={form.end_at}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            end_at: event.target.value,
                          }))
                        }
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Notes
                  </label>

                  <textarea
                    value={form.notes}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    rows={4}
                    placeholder="Appointment notes, location, customer requests..."
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  />
                </div>

                {form.lead_id && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    {(() => {
                      const lead = leadMap.get(form.lead_id);

                      if (!lead) return null;

                      return (
                        <>
                          <div className="mb-4 flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm ring-1 ring-slate-200">
                              <User size={15} />
                            </div>

                            <div>
                              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                Customer Information
                              </div>

                              <div className="mt-0.5 text-sm font-semibold text-slate-800">
                                {getLeadName(lead)}
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            {lead.phone && (
                              <div className="flex min-w-0 items-center gap-2 rounded-lg bg-white px-3 py-2.5 text-xs text-slate-600 ring-1 ring-slate-200">
                                <Phone
                                  size={14}
                                  className="shrink-0 text-slate-400"
                                />

                                <span className="truncate">
                                  {lead.phone}
                                </span>
                              </div>
                            )}

                            {lead.email && (
                              <div className="flex min-w-0 items-center gap-2 rounded-lg bg-white px-3 py-2.5 text-xs text-slate-600 ring-1 ring-slate-200">
                                <Mail
                                  size={14}
                                  className="shrink-0 text-slate-400"
                                />

                                <span className="truncate">
                                  {lead.email}
                                </span>
                              </div>
                            )}

                            <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2.5 text-xs text-slate-400 ring-1 ring-slate-200">
                              <MapPin size={14} />
                              Customer linked to lead
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  {!isCreating && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting || saving}
                      className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 size={16} />

                      {deleting ? "Deleting..." : "Delete"}
                    </button>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving || deleting}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving || deleting}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving
                      ? "Saving..."
                      : isCreating
                      ? "Create Appointment"
                      : "Save Changes"}
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