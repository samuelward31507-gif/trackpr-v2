"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "no_show"
  | "cancelled";

type Appointment = {
  id: string;
  organization_id: string;
  lead_id: string | null;
  assigned_to: string | null;
  title: string;
  appointment_type: string | null;
  status: AppointmentStatus;
  start_at: string;
  end_at: string | null;
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
  service_interest: string | null;
};

type TeamMember = {
  user_id: string;
};

type AutomationDiagnostic = {
  type: "info" | "success" | "error";
  message: string;
};

type Props = {
  initialAppointments: Appointment[];
  leads: Lead[];
  teamMembers: TeamMember[];
  currentUserId: string;
  organizationId: string;
};

const supabase = createClient();

const statusLabels: Record<AppointmentStatus, string> = {
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  completed: "Completed",
  no_show: "No Show",
  cancelled: "Cancelled",
};

const statusStyles: Record<AppointmentStatus, string> = {
  scheduled:
    "border-slate-200 bg-slate-50 text-slate-700",
  confirmed:
    "border-blue-200 bg-blue-50 text-blue-700",
  completed:
    "border-emerald-200 bg-emerald-50 text-emerald-700",
  no_show:
    "border-amber-200 bg-amber-50 text-amber-700",
  cancelled:
    "border-rose-200 bg-rose-50 text-rose-700",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getErrorDetails(error: any) {
  return [
    error?.message
      ? `Message: ${error.message}`
      : "",
    error?.code
      ? `Code: ${error.code}`
      : "",
    error?.details
      ? `Details: ${error.details}`
      : "",
    error?.hint
      ? `Hint: ${error.hint}`
      : "",
  ]
    .filter(Boolean)
    .join(" | ");
}

function getMonthStart(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    1
  );
}

function getMonthEnd(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0
  );
}

function getCalendarDays(date: Date) {
  const monthStart = getMonthStart(date);
  const monthEnd = getMonthEnd(date);

  const startDay = monthStart.getDay();
  const daysInMonth = monthEnd.getDate();

  const totalCells = Math.ceil(
    (startDay + daysInMonth) / 7
  ) * 7;

  return Array.from(
    { length: totalCells },
    (_, index) => {
      const dayNumber =
        index - startDay + 1;

      return new Date(
        date.getFullYear(),
        date.getMonth(),
        dayNumber
      );
    }
  );
}

function isSameDay(
  first: Date,
  second: Date
) {
  return (
    first.getFullYear() ===
      second.getFullYear() &&
    first.getMonth() ===
      second.getMonth() &&
    first.getDate() ===
      second.getDate()
  );
}

function getInitialDate(
  appointments: Appointment[]
) {
  if (appointments.length > 0) {
    return new Date(
      appointments[0].start_at
    );
  }

  return new Date();
}

export default function AppointmentsClient({
  initialAppointments,
  leads,
  teamMembers,
  currentUserId,
  organizationId,
}: Props) {
  const [mounted, setMounted] =
    useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [appointments, setAppointments] =
    useState<Appointment[]>(
      initialAppointments
    );

  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);

  const [currentDate, setCurrentDate] =
    useState<Date | null>(null);

  const [showCreateModal, setShowCreateModal] =
    useState(false);

  const [updating, setUpdating] =
    useState(false);

  const [creating, setCreating] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [automationDiagnostic, setAutomationDiagnostic] =
    useState<AutomationDiagnostic | null>(
      null
    );

  const [view, setView] =
    useState<"month" | "list">("month");

  const [form, setForm] = useState({
    lead_id: "",
    title: "",
    appointment_type: "",
    start_at: "",
    end_at: "",
    notes: "",
    assigned_to: "",
  });

  useEffect(() => {
    if (!mounted) {
      return;
    }

    setCurrentDate(
      getInitialDate(initialAppointments)
    );
  }, [mounted, initialAppointments]);

  const calendarDays = useMemo(() => {
    if (!currentDate) {
      return [];
    }

    return getCalendarDays(currentDate);
  }, [currentDate]);

  const monthAppointments = useMemo(() => {
    if (!currentDate) {
      return [];
    }

    return appointments.filter((appointment) => {
      const date = new Date(
        appointment.start_at
      );

      return (
        date.getFullYear() ===
          currentDate.getFullYear() &&
        date.getMonth() ===
          currentDate.getMonth()
      );
    });
  }, [appointments, currentDate]);

  const sortedAppointments = useMemo(() => {
    return [...appointments].sort(
      (a, b) =>
        new Date(a.start_at).getTime() -
        new Date(b.start_at).getTime()
    );
  }, [appointments]);

  function getLead(
    leadId: string | null
  ) {
    if (!leadId) {
      return null;
    }

    return (
      leads.find(
        (lead) => lead.id === leadId
      ) || null
    );
  }

  function getCustomerName(
    appointment: Appointment
  ) {
    const lead = getLead(
      appointment.lead_id
    );

    if (!lead) {
      return "Unknown customer";
    }

    const name = [
      lead.first_name,
      lead.last_name,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    return name || "Unnamed customer";
  }

  function openCreateModal(
    date?: Date
  ) {
    const baseDate =
      date || new Date();

    const start = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate(),
      9,
      0
    );

    const end = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate(),
      10,
      0
    );

    const toInputValue = (
      value: Date
    ) => {
      const year =
        value.getFullYear();

      const month = String(
        value.getMonth() + 1
      ).padStart(2, "0");

      const day = String(
        value.getDate()
      ).padStart(2, "0");

      const hours = String(
        value.getHours()
      ).padStart(2, "0");

      const minutes = String(
        value.getMinutes()
      ).padStart(2, "0");

      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    setForm({
      lead_id: "",
      title: "",
      appointment_type: "",
      start_at: toInputValue(start),
      end_at: toInputValue(end),
      notes: "",
      assigned_to: "",
    });

    setErrorMessage("");
    setAutomationDiagnostic(null);
    setShowCreateModal(true);
  }

  async function createAppointment(
    event: FormEvent
  ) {
    event.preventDefault();

    setCreating(true);
    setErrorMessage("");

    const {
      data,
      error,
    } = await supabase
      .from("appointments")
      .insert({
        organization_id:
          organizationId,
        lead_id:
          form.lead_id || null,
        assigned_to:
          form.assigned_to || null,
        title:
          form.title.trim() ||
          "Appointment",
        appointment_type:
          form.appointment_type.trim() ||
          null,
        status: "scheduled",
        start_at:
          new Date(
            form.start_at
          ).toISOString(),
        end_at: form.end_at
          ? new Date(
              form.end_at
            ).toISOString()
          : null,
        notes:
          form.notes.trim() || null,
      })
      .select(
        `
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
        `
      )
      .single();

    if (error) {
      console.error(
        "Create appointment error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to create appointment."
      );

      setCreating(false);
      return;
    }

    if (data) {
      setAppointments(
        (current) =>
          [
            ...current,
            data,
          ].sort(
            (a, b) =>
              new Date(
                a.start_at
              ).getTime() -
              new Date(
                b.start_at
              ).getTime()
          )
      );

      setSelectedAppointment(data);
    }

    setShowCreateModal(false);
    setCreating(false);
  }

  async function updateAppointment(
    updates: Partial<Appointment>
  ) {
    if (!selectedAppointment) {
      return false;
    }

    setUpdating(true);
    setErrorMessage("");

    const {
      data,
      error,
    } = await supabase
      .from("appointments")
      .update({
        ...updates,
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        selectedAppointment.id
      )
      .select(
        `
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
        `
      )
      .single();

    if (error) {
      console.error(
        "Update appointment error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to update appointment."
      );

      setUpdating(false);
      return false;
    }

    if (data) {
      setAppointments(
        (current) =>
          current
            .map((appointment) =>
              appointment.id === data.id
                ? data
                : appointment
            )
            .sort(
              (a, b) =>
                new Date(
                  a.start_at
                ).getTime() -
                new Date(
                  b.start_at
                ).getTime()
            )
      );

      setSelectedAppointment(data);
    }

    setUpdating(false);

    return true;
  }

async function handleStatusChange(
  nextStatus: AppointmentStatus
) {
  if (!selectedAppointment) {
    setAutomationDiagnostic({
      type: "error",
      message:
        "No-show automation stopped: no appointment is selected.",
    });

    return;
  }

  if (nextStatus === "no_show") {
    setAutomationDiagnostic({
      type: "info",
      message:
        "No-show automation: marking appointment as No Show...",
    });

    console.log(
      "NO-SHOW SERVER AUTOMATION — START",
      {
        appointment_id:
          selectedAppointment.id,
        organization_id:
          selectedAppointment.organization_id,
        lead_id:
          selectedAppointment.lead_id,
        current_status:
          selectedAppointment.status,
      }
    );
  } else {
    setAutomationDiagnostic(null);
  }

  const updated =
    await updateAppointment({
      status: nextStatus,
    });

  if (!updated) {
    if (nextStatus === "no_show") {
      setAutomationDiagnostic({
        type: "error",
        message:
          "No-show automation stopped: appointment status update failed.",
      });
    }

    return;
  }

  if (nextStatus !== "no_show") {
    return;
  }

  setAutomationDiagnostic({
    type: "info",
    message:
      "No-show automation: appointment marked No Show. Sending event to Trackpr server...",
  });

  console.log(
    "NO-SHOW SERVER AUTOMATION — APPOINTMENT UPDATED",
    {
      appointment_id:
        selectedAppointment.id,
      organization_id:
        selectedAppointment.organization_id,
    }
  );

  /*
   * IMPORTANT:
   *
   * We intentionally DO NOT insert into
   * automation_events from the browser anymore.
   *
   * The server route handles:
   *
   * 1. Authentication
   * 2. Organization verification
   * 3. Appointment lookup
   * 4. Lead lookup
   * 5. automation_events creation
   * 6. n8n webhook dispatch
   */

  setAutomationDiagnostic({
    type: "info",
    message:
      "No-show automation: calling /api/automation/no-show...",
  });

  let response: Response;

  try {
    response =
      await fetch(
        "/api/automation/no-show",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            appointment_id:
              selectedAppointment.id,

            organization_id:
              selectedAppointment.organization_id,
          }),
        }
      );
  } catch (error: any) {
    const message =
      error?.message ||
      String(error);

    console.error(
      "NO-SHOW SERVER AUTOMATION — FETCH ERROR",
      error
    );

    setAutomationDiagnostic({
      type: "error",
      message:
        `No-show automation: server request failed → ${message}`,
    });

    setErrorMessage(
      `Appointment marked as No Show, but automation failed: ${message}`
    );

    return;
  }

  const responseText =
    await response.text();

  let responseData: any = null;

  try {
    responseData =
      responseText
        ? JSON.parse(responseText)
        : null;
  } catch {
    responseData = null;
  }

  console.log(
    "NO-SHOW SERVER AUTOMATION — RESPONSE",
    {
      status:
        response.status,
      statusText:
        response.statusText,
      body:
        responseData ||
        responseText,
    }
  );

  if (!response.ok) {
    const serverError =
      responseData?.error ||
      responseText ||
      `HTTP ${response.status}`;

    const details =
      responseData?.details
        ? ` ${responseData.details}`
        : "";

    setAutomationDiagnostic({
      type: "error",
      message:
        `No-show automation failed → ${serverError}${details}`,
    });

    setErrorMessage(
      `Appointment marked as No Show, but automation failed: ${serverError}${details}`
    );

    return;
  }

  const eventId =
    responseData?.event_id ||
    "unknown";

  const n8nStatus =
    responseData?.n8n_status;

  setAutomationDiagnostic({
    type: "success",
    message:
      `No-show automation SUCCESS — event ${eventId} was created and sent to n8n${
        n8nStatus
          ? ` (HTTP ${n8nStatus})`
          : ""
      }.`,
  });

  console.log(
    "NO-SHOW SERVER AUTOMATION — FULL SUCCESS",
    {
      event_id:
        eventId,

      appointment_id:
        selectedAppointment.id,

      organization_id:
        selectedAppointment.organization_id,

      n8n_status:
        n8nStatus,

      n8n_response:
        responseData?.n8n_response,
    }
  );
}

  async function deleteAppointment() {
    if (!selectedAppointment) {
      return;
    }

    const confirmed =
      window.confirm(
        "Delete this appointment?"
      );

    if (!confirmed) {
      return;
    }

    setUpdating(true);
    setErrorMessage("");
    setAutomationDiagnostic(null);

    const {
      error,
    } = await supabase
      .from("appointments")
      .delete()
      .eq(
        "id",
        selectedAppointment.id
      );

    if (error) {
      console.error(
        "Delete appointment error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to delete appointment."
      );

      setUpdating(false);
      return;
    }

    setAppointments(
      (current) =>
        current.filter(
          (appointment) =>
            appointment.id !==
            selectedAppointment.id
        )
    );

    setSelectedAppointment(null);
    setUpdating(false);
  }

  function changeMonth(
    amount: number
  ) {
    if (!currentDate) {
      return;
    }

    setCurrentDate(
      new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() +
          amount,
        1
      )
    );
  }

  function goToToday() {
    setCurrentDate(
      new Date()
    );
  }

  function handleCalendarAppointmentClick(
    appointment: Appointment
  ) {
    setSelectedAppointment(
      appointment
    );

    setErrorMessage("");
    setAutomationDiagnostic(null);
  }

  if (!mounted || !currentDate) {
    return (
      <div className="min-h-[720px] rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="animate-pulse space-y-6">
          <div className="h-10 w-64 rounded-xl bg-slate-100" />
          <div className="h-[620px] rounded-2xl bg-slate-50" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-600">
            Calendar
          </p>

          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
            Appointments
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Schedule, manage, and track every customer appointment.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={goToToday}
            className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            Today
          </button>

          <div className="flex h-11 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() =>
                setView("month")
              }
              className={`px-4 text-sm font-bold transition ${
                view === "month"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Month
            </button>

            <button
              type="button"
              onClick={() =>
                setView("list")
              }
              className={`px-4 text-sm font-bold transition ${
                view === "list"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              List
            </button>
          </div>

          <button
            type="button"
            onClick={() =>
              openCreateModal()
            }
            className="h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
          >
            + New Appointment
          </button>
        </div>
      </div>

      {/* Error */}
      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {errorMessage}
        </div>
      )}

      {/* Main calendar */}
      {view === "month" ? (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {/* Calendar toolbar */}
          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-6">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                {new Intl.DateTimeFormat(
                  "en-US",
                  {
                    month: "long",
                    year: "numeric",
                  }
                ).format(currentDate)}
              </h2>

              <p className="mt-1 text-xs font-medium text-slate-400">
                {monthAppointments.length} appointment
                {monthAppointments.length === 1
                  ? ""
                  : "s"} this month
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  changeMonth(-1)
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg font-bold text-slate-600 transition hover:bg-slate-50"
              >
                ‹
              </button>

              <button
                type="button"
                onClick={() =>
                  changeMonth(1)
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg font-bold text-slate-600 transition hover:bg-slate-50"
              >
                ›
              </button>
            </div>
          </div>

          {/* Week labels */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70">
            {[
              "Sun",
              "Mon",
              "Tue",
              "Wed",
              "Thu",
              "Fri",
              "Sat",
            ].map((day) => (
              <div
                key={day}
                className="border-r border-slate-200 px-2 py-3 text-center text-[11px] font-black uppercase tracking-wider text-slate-400 last:border-r-0"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map(
              (day, index) => {
                const dayAppointments =
                  appointments
                    .filter(
                      (appointment) =>
                        isSameDay(
                          new Date(
                            appointment.start_at
                          ),
                          day
                        )
                    )
                    .sort(
                      (a, b) =>
                        new Date(
                          a.start_at
                        ).getTime() -
                        new Date(
                          b.start_at
                        ).getTime()
                    );

                const isCurrentMonth =
                  day.getMonth() ===
                    currentDate.getMonth() &&
                  day.getFullYear() ===
                    currentDate.getFullYear();

                const isToday =
                  isSameDay(
                    day,
                    new Date()
                  );

                return (
                  <div
                    key={`${day.toISOString()}-${index}`}
                    className={`min-h-[125px] border-b border-r border-slate-200 p-2 transition hover:bg-slate-50/70 ${
                      !isCurrentMonth
                        ? "bg-slate-50/40"
                        : "bg-white"
                    }`}
                    onDoubleClick={() =>
                      openCreateModal(day)
                    }
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                          isToday
                            ? "bg-blue-600 text-white"
                            : isCurrentMonth
                            ? "text-slate-700"
                            : "text-slate-300"
                        }`}
                      >
                        {day.getDate()}
                      </span>

                      {dayAppointments.length >
                        0 && (
                        <span className="text-[10px] font-bold text-slate-400">
                          {dayAppointments.length}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      {dayAppointments
                        .slice(0, 3)
                        .map(
                          (
                            appointment
                          ) => (
                            <button
                              key={
                                appointment.id
                              }
                              type="button"
                              onClick={() =>
                                handleCalendarAppointmentClick(
                                  appointment
                                )
                              }
                              className="block w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50/40"
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-black text-blue-600">
                                  {formatTime(
                                    appointment.start_at
                                  )}
                                </span>

                                <span className="truncate text-[10px] font-bold text-slate-700">
                                  {getCustomerName(
                                    appointment
                                  )}
                                </span>
                              </div>
                            </button>
                          )
                        )}

                      {dayAppointments.length >
                        3 && (
                        <button
                          type="button"
                          onClick={() => {
                            setView("list");
                          }}
                          className="w-full px-2 py-1 text-left text-[10px] font-bold text-blue-600"
                        >
                          +
                          {dayAppointments.length -
                            3}{" "}
                          more
                        </button>
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-5 lg:px-6">
            <h2 className="text-xl font-black text-slate-950">
              All Appointments
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Manage upcoming and previous appointments.
            </p>
          </div>

          {sortedAppointments.length ===
          0 ? (
            <div className="px-6 py-20 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                📅
              </div>

              <h3 className="mt-4 text-lg font-black text-slate-950">
                No appointments yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                Create your first appointment to start managing your schedule.
              </p>

              <button
                type="button"
                onClick={() =>
                  openCreateModal()
                }
                className="mt-5 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
              >
                Create Appointment
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {sortedAppointments.map(
                (appointment) => (
                  <button
                    key={appointment.id}
                    type="button"
                    onClick={() =>
                      handleCalendarAppointmentClick(
                        appointment
                      )
                    }
                    className="flex w-full flex-col gap-4 px-5 py-5 text-left transition hover:bg-slate-50/70 lg:flex-row lg:items-center lg:justify-between lg:px-6"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${statusStyles[appointment.status]}`}
                        >
                          {
                            statusLabels[
                              appointment.status
                            ]
                          }
                        </span>

                        <span className="text-xs font-bold text-slate-400">
                          {formatDateTime(
                            appointment.start_at
                          )}
                        </span>
                      </div>

                      <h3 className="mt-2 truncate text-base font-black text-slate-950">
                        {getCustomerName(
                          appointment
                        )}
                      </h3>

                      <p className="mt-1 truncate text-sm font-medium text-slate-500">
                        {appointment.title}
                      </p>
                    </div>

                    <div className="shrink-0 text-sm font-bold text-blue-600">
                      View appointment →
                    </div>
                  </button>
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* Selected appointment panel */}
      {selectedAppointment && (
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 lg:flex-row lg:items-start lg:justify-between lg:px-6">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${statusStyles[selectedAppointment.status]}`}
                >
                  {
                    statusLabels[
                      selectedAppointment.status
                    ]
                  }
                </span>

                <span className="text-xs font-bold text-slate-400">
                  {formatDateTime(
                    selectedAppointment.start_at
                  )}
                </span>
              </div>

              <h2 className="mt-2 text-2xl font-black text-slate-950">
                {getCustomerName(
                  selectedAppointment
                )}
              </h2>

              <p className="mt-1 text-sm font-medium text-slate-500">
                {selectedAppointment.title}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setSelectedAppointment(null)
              }
              className="self-start rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-50"
            >
              Close
            </button>
          </div>

          <div className="grid gap-6 px-5 py-6 lg:grid-cols-[1fr_360px] lg:px-6">
            {/* Details */}
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Customer
                  </p>

                  <p className="mt-2 text-sm font-black text-slate-900">
                    {getCustomerName(
                      selectedAppointment
                    )}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Appointment
                  </p>

                  <p className="mt-2 text-sm font-black text-slate-900">
                    {selectedAppointment.title}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Type
                  </p>

                  <p className="mt-2 text-sm font-black text-slate-900">
                    {selectedAppointment.appointment_type ||
                      "General appointment"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Time
                  </p>

                  <p className="mt-2 text-sm font-black text-slate-900">
                    {formatDateTime(
                      selectedAppointment.start_at
                    )}
                  </p>
                </div>
              </div>

              {selectedAppointment.notes && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Notes
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {selectedAppointment.notes}
                  </p>
                </div>
              )}

              {/* Status actions */}
              <div>
                <p className="mb-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Appointment Status
                </p>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={updating}
                    onClick={() =>
                      handleStatusChange(
                        "scheduled"
                      )
                    }
                    className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    Scheduled
                  </button>

                  <button
                    type="button"
                    disabled={updating}
                    onClick={() =>
                      handleStatusChange(
                        "confirmed"
                      )
                    }
                    className="h-11 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-bold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
                  >
                    Confirmed
                  </button>

                  <button
                    type="button"
                    disabled={updating}
                    onClick={() =>
                      handleStatusChange(
                        "completed"
                      )
                    }
                    className="h-11 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                  >
                    Completed
                  </button>

                  <button
                    type="button"
                    disabled={updating}
                    onClick={() =>
                      handleStatusChange(
                        "no_show"
                      )
                    }
                    className="h-11 rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-bold text-amber-700 transition hover:bg-amber-100 disabled:opacity-60"
                  >
                    No Show
                  </button>

                  <button
                    type="button"
                    disabled={updating}
                    onClick={() =>
                      handleStatusChange(
                        "cancelled"
                      )
                    }
                    className="h-11 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                  >
                    Cancelled
                  </button>
                </div>
              </div>

              {/* Diagnostic */}
              {automationDiagnostic && (
                <div
                  className={`rounded-2xl border px-4 py-4 ${
                    automationDiagnostic.type ===
                    "success"
                      ? "border-emerald-200 bg-emerald-50"
                      : automationDiagnostic.type ===
                        "error"
                      ? "border-rose-200 bg-rose-50"
                      : "border-amber-200 bg-amber-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                        automationDiagnostic.type ===
                        "success"
                          ? "bg-emerald-100 text-emerald-700"
                          : automationDiagnostic.type ===
                            "error"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {automationDiagnostic.type ===
                      "success"
                        ? "✓"
                        : automationDiagnostic.type ===
                          "error"
                        ? "!"
                        : "…"}
                    </div>

                    <div className="min-w-0">
                      <p
                        className={`text-[10px] font-black uppercase tracking-wider ${
                          automationDiagnostic.type ===
                          "success"
                            ? "text-emerald-700"
                            : automationDiagnostic.type ===
                              "error"
                            ? "text-rose-700"
                            : "text-amber-700"
                        }`}
                      >
                        Automation Diagnostic
                      </p>

                      <p
                        className={`mt-1 break-words text-sm font-semibold leading-6 ${
                          automationDiagnostic.type ===
                          "success"
                            ? "text-emerald-800"
                            : automationDiagnostic.type ===
                              "error"
                            ? "text-rose-800"
                            : "text-amber-800"
                        }`}
                      >
                        {
                          automationDiagnostic.message
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Customer / actions */}
            <div className="space-y-4">
              {(() => {
                const lead =
                  getLead(
                    selectedAppointment.lead_id
                  );

                if (!lead) {
                  return (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Customer
                      </p>

                      <p className="mt-2 text-sm font-bold text-slate-500">
                        No linked lead.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Customer Contact
                    </p>

                    <p className="mt-2 text-base font-black text-slate-950">
                      {getCustomerName(
                        selectedAppointment
                      )}
                    </p>

                    {lead.phone && (
                      <p className="mt-2 text-sm font-medium text-slate-600">
                        {lead.phone}
                      </p>
                    )}

                    {lead.email && (
                      <p className="mt-1 break-all text-sm font-medium text-slate-600">
                        {lead.email}
                      </p>
                    )}

                    {lead.service_interest && (
                      <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-500">
                        Interested in:{" "}
                        <span className="text-slate-800">
                          {
                            lead.service_interest
                          }
                        </span>
                      </p>
                    )}
                  </div>
                );
              })()}

              <button
                type="button"
                disabled={updating}
                onClick={
                  deleteAppointment
                }
                className="h-11 w-full rounded-xl border border-rose-200 bg-white text-sm font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
              >
                Delete Appointment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  New Appointment
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Create an appointment for a customer.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowCreateModal(false)
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={
                createAppointment
              }
              className="space-y-5 p-6"
            >
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Customer
                </label>

                <select
                  value={form.lead_id}
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        lead_id:
                          event.target
                            .value,
                      })
                    )
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                >
                  <option value="">
                    Select customer
                  </option>

                  {leads.map((lead) => (
                    <option
                      key={lead.id}
                      value={lead.id}
                    >
                      {[
                        lead.first_name,
                        lead.last_name,
                      ]
                        .filter(Boolean)
                        .join(" ") ||
                        "Unnamed customer"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Title
                </label>

                <input
                  value={form.title}
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        title:
                          event.target
                            .value,
                      })
                    )
                  }
                  placeholder="Estimate appointment"
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Appointment Type
                </label>

                <input
                  value={
                    form.appointment_type
                  }
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        appointment_type:
                          event.target
                            .value,
                      })
                    )
                  }
                  placeholder="Estimate, consultation, service call..."
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Start
                  </label>

                  <input
                    type="datetime-local"
                    required
                    value={
                      form.start_at
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          start_at:
                            event.target
                              .value,
                        })
                      )
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                    End
                  </label>

                  <input
                    type="datetime-local"
                    value={
                      form.end_at
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          end_at:
                            event.target
                              .value,
                        })
                      )
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Assigned To
                </label>

                <select
                  value={
                    form.assigned_to
                  }
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        assigned_to:
                          event.target
                            .value,
                      })
                    )
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                >
                  <option value="">
                    Unassigned
                  </option>

                  {teamMembers.map(
                    (member) => (
                      <option
                        key={
                          member.user_id
                        }
                        value={
                          member.user_id
                        }
                      >
                        {member.user_id ===
                        currentUserId
                          ? "You"
                          : member.user_id}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Notes
                </label>

                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        notes:
                          event.target
                            .value,
                      })
                    )
                  }
                  rows={4}
                  placeholder="Appointment notes..."
                  className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                <button
                  type="button"
                  onClick={() =>
                    setShowCreateModal(
                      false
                    )
                  }
                  className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creating}
                  className="h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {creating
                    ? "Creating..."
                    : "Create Appointment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}