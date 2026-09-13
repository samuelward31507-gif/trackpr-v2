"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Edit3,
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
          new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
      )
      .slice(0, 6);
  }, [filteredAppointments]);

  function appointmentsForDay(day: Date) {
    return filteredAppointments
      .filter((appointment) =>
        isSameDay(new Date(appointment.start_at), day)
      )
      .sort(
        (a, b) =>
          new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
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
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
                <CalendarDays size={21} />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Calendar
                </h1>

                <p className="text-sm text-slate-500">
                  Manage appointments and your schedule.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => openCreate()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Plus size={18} />
            New Appointment
          </button>
        </div>

        {/* Controls */}
        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={previousMonth}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                aria-label="Previous month"
              >
                <ChevronLeft size={18} />
              </button>

              <button
                onClick={nextMonth}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                aria-label="Next month"
              >
                <ChevronRight size={18} />
              </button>

              <button
                onClick={goToToday}
                className="ml-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Today
              </button>

              <h2 className="ml-2 text-lg font-bold text-slate-900">
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
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 sm:w-64"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-slate-400"
              >
                <option value="all">All statuses</option>

                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status
                      .replace("_", " ")
                      .replace(/\b\w/g, (letter) =>
                        letter.toUpperCase()
                      )}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          {/* Calendar */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* Weekday header */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="px-2 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Days */}
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
                    className={`group relative min-h-[125px] border-b border-r border-slate-200 p-2 transition hover:bg-slate-50 ${
                      !isCurrentMonth ? "bg-slate-50/60" : "bg-white"
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <button
                        onClick={() => openCreate(day)}
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition ${
                          isToday
                            ? "bg-slate-900 text-white"
                            : isCurrentMonth
                            ? "text-slate-700 hover:bg-slate-100"
                            : "text-slate-400 hover:bg-slate-100"
                        }`}
                      >
                        {day.getDate()}
                      </button>

                      <button
                        onClick={() => openCreate(day)}
                        className="hidden rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 group-hover:block"
                        title="Add appointment"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <div className="space-y-1">
                      {dayAppointments.slice(0, 3).map((appointment) => {
                        const lead = leadMap.get(
                          appointment.lead_id ?? ""
                        );

                        return (
                          <button
                            key={appointment.id}
                            onClick={() => openEdit(appointment)}
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-left transition hover:border-slate-300 hover:bg-slate-100"
                          >
                            <div className="truncate text-[11px] font-semibold text-slate-800">
                              {formatTime(appointment.start_at)} ·{" "}
                              {appointment.title}
                            </div>

                            <div className="mt-0.5 truncate text-[10px] text-slate-500">
                              {getLeadName(lead)}
                            </div>
                          </button>
                        );
                      })}

                      {dayAppointments.length > 3 && (
                        <div className="px-1 text-[10px] font-medium text-slate-400">
                          +{dayAppointments.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upcoming */}
          <aside className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">
                    Upcoming
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Your next appointments
                  </p>
                </div>

                <div className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {upcomingAppointments.length}
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {upcomingAppointments.length === 0 ? (
                <div className="p-6 text-center">
                  <CalendarDays
                    size={24}
                    className="mx-auto text-slate-300"
                  />

                  <p className="mt-3 text-sm font-medium text-slate-600">
                    No upcoming appointments
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Create one to get started.
                  </p>
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
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                          <Clock3 size={16} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-slate-900">
                            {appointment.title}
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            {formatDate(appointment.start_at)}
                          </div>

                          <div className="mt-1 text-xs font-medium text-slate-700">
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {isCreating
                    ? "New Appointment"
                    : "Appointment Details"}
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  {isCreating
                    ? "Create a new appointment."
                    : "Update appointment information."}
                </p>
              </div>

              <button
                onClick={closeModal}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5">
              {error && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="grid gap-5">
                {/* Title */}
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
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                {/* Lead + Status */}
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
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
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
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status
                            .replace("_", " ")
                            .replace(/\b\w/g, (letter) =>
                              letter.toUpperCase()
                            )}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Date/time */}
                <div className="grid gap-5 md:grid-cols-2">
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
                      className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
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
                      className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    />
                  </div>
                </div>

                {/* Notes */}
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
                    className="w-full resize-none rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                {/* Customer info */}
                {form.lead_id && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    {(() => {
                      const lead = leadMap.get(form.lead_id);

                      if (!lead) return null;

                      return (
                        <>
                          <div className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                            Customer Information
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <User size={15} />
                              {getLeadName(lead)}
                            </div>

                            {lead.phone && (
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Phone size={15} />
                                {lead.phone}
                              </div>
                            )}

                            {lead.email && (
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Mail size={15} />
                                {lead.email}
                              </div>
                            )}

                            <div className="flex items-center gap-2 text-sm text-slate-400">
                              <MapPin size={15} />
                              Customer linked to lead
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Footer */}
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
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
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