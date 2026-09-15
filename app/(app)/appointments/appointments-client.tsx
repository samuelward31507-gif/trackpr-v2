"use client";

import { FormEvent, useMemo, useState } from "react";
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
  appointment_type: string;
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

type Props = {
  initialAppointments: Appointment[];
  leads: Lead[];
  teamMembers: TeamMember[];
  currentUserId: string;
  organizationId: string;
};

const appointmentTypes = [
  { value: "service", label: "Service Call" },
  { value: "estimate", label: "Estimate" },
  { value: "consultation", label: "Consultation" },
  { value: "installation", label: "Installation" },
  { value: "inspection", label: "Inspection" },
  { value: "follow_up", label: "Follow-Up" },
  { value: "other", label: "Other" },
];

const statusOptions: {
  value: AppointmentStatus;
  label: string;
}[] = [
  { value: "scheduled", label: "Scheduled" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "no_show", label: "No Show" },
  { value: "cancelled", label: "Cancelled" },
];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function getDateParts(date: Date) {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

function getTimeParts(date: Date) {
  return {
    hour: date.getHours(),
    minute: date.getMinutes(),
  };
}

function createDateFromParts(
  date: string,
  time: string
): Date | null {
  if (!date || !time) return null;

  const [year, month, day] = date
    .split("-")
    .map(Number);

  const [hour, minute] = time
    .split(":")
    .map(Number);

  if (
    !year ||
    !month ||
    !day ||
    Number.isNaN(hour) ||
    Number.isNaN(minute)
  ) {
    return null;
  }

  const result = new Date(
    year,
    month - 1,
    day,
    hour,
    minute,
    0,
    0
  );

  if (
    result.getFullYear() !== year ||
    result.getMonth() !== month - 1 ||
    result.getDate() !== day
  ) {
    return null;
  }

  return result;
}

function formatTimeOption(time: string) {
  if (!time) return "";

  const [hourString, minuteString] =
    time.split(":");

  let hour = Number(hourString);

  if (Number.isNaN(hour)) return time;

  const minute = minuteString || "00";
  const suffix = hour >= 12 ? "PM" : "AM";

  if (hour === 0) hour = 12;
  if (hour > 12) hour -= 12;

  return `${hour}:${minute} ${suffix}`;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString(
    [],
    {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }
  );
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString(
    [],
    {
      hour: "numeric",
      minute: "2-digit",
    }
  );
}

function getLeadName(lead?: Lead | null) {
  if (!lead) return "No lead linked";

  const name = [
    lead.first_name,
    lead.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || "Unnamed lead";
}

function getStartOfWeek(date: Date) {
  const result = new Date(date);
  const day = result.getDay();

  result.setDate(result.getDate() - day);
  result.setHours(0, 0, 0, 0);

  return result;
}

function getStatusClasses(
  status: AppointmentStatus
) {
  switch (status) {
    case "confirmed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "completed":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "no_show":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "cancelled":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function getAppointmentBlockClasses(
  status: AppointmentStatus
) {
  switch (status) {
    case "confirmed":
      return "border-emerald-300 bg-emerald-100 text-emerald-900";

    case "completed":
      return "border-blue-300 bg-blue-100 text-blue-900";

    case "no_show":
      return "border-amber-300 bg-amber-100 text-amber-900";

    case "cancelled":
      return "border-red-300 bg-red-100 text-red-900 opacity-60";

    default:
      return "border-slate-300 bg-white text-slate-900";
  }
}

function DateSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const now = new Date();
  const currentYear = now.getFullYear();

  const parts = value
    ? value.split("-").map(Number)
    : [
        currentYear,
        now.getMonth() + 1,
        now.getDate(),
      ];

  const year = parts[0];
  const month = parts[1];
  const day = parts[2];

  const years = Array.from(
    { length: 11 },
    (_, index) => currentYear - 2 + index
  );

  const daysInMonth = new Date(
    year,
    month,
    0
  ).getDate();

  function updateDate(
    nextYear: number,
    nextMonth: number,
    nextDay: number
  ) {
    const safeDay = Math.min(
      nextDay || 1,
      new Date(
        nextYear,
        nextMonth,
        0
      ).getDate()
    );

    onChange(
      `${nextYear}-${pad(nextMonth)}-${pad(
        safeDay
      )}`
    );
  }

  return (
    <div className="grid grid-cols-[1fr_1fr_1.15fr] gap-2">
      <select
        value={month}
        onChange={(event) =>
          updateDate(
            year,
            Number(event.target.value),
            day
          )
        }
        className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-slate-400"
      >
        {Array.from(
          { length: 12 },
          (_, index) => {
            const monthNumber = index + 1;

            return (
              <option
                key={monthNumber}
                value={monthNumber}
              >
                {new Date(
                  2000,
                  index,
                  1
                ).toLocaleDateString([], {
                  month: "short",
                })}
              </option>
            );
          }
        )}
      </select>

      <select
        value={day}
        onChange={(event) =>
          updateDate(
            year,
            month,
            Number(event.target.value)
          )
        }
        className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-slate-400"
      >
        {Array.from(
          { length: daysInMonth },
          (_, index) => {
            const dayNumber = index + 1;

            return (
              <option
                key={dayNumber}
                value={dayNumber}
              >
                {dayNumber}
              </option>
            );
          }
        )}
      </select>

      <select
        value={year}
        onChange={(event) =>
          updateDate(
            Number(event.target.value),
            month,
            day
          )
        }
        className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-slate-400"
      >
        {years.map((yearOption) => (
          <option
            key={yearOption}
            value={yearOption}
          >
            {yearOption}
          </option>
        ))}
      </select>
    </div>
  );
}

function TimeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const options: string[] = [];

  for (let hour = 7; hour <= 22; hour++) {
    for (
      let minute = 0;
      minute < 60;
      minute += 15
    ) {
      if (hour === 22 && minute > 0) {
        continue;
      }

      options.push(
        `${pad(hour)}:${pad(minute)}`
      );
    }
  }

  return (
    <select
      value={value}
      onChange={(event) =>
        onChange(event.target.value)
      }
      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-slate-400"
    >
      <option value="">Select time</option>

      {options.map((time) => (
        <option key={time} value={time}>
          {formatTimeOption(time)}
        </option>
      ))}
    </select>
  );
}

function AppointmentFormFields({
  title,
  setTitle,
  leadId,
  setLeadId,
  appointmentType,
  setAppointmentType,
  status,
  setStatus,
  assignedTo,
  setAssignedTo,
  currentUserId,
  teamMembers,
  leads,
  startDate,
  setStartDate,
  startTime,
  setStartTime,
  endDate,
  setEndDate,
  endTime,
  setEndTime,
  notes,
  setNotes,
  errorMessage,
}: {
  title: string;
  setTitle: (value: string) => void;
  leadId: string;
  setLeadId: (value: string) => void;
  appointmentType: string;
  setAppointmentType: (value: string) => void;
  status: AppointmentStatus;
  setStatus: (value: AppointmentStatus) => void;
  assignedTo: string;
  setAssignedTo: (value: string) => void;
  currentUserId: string;
  teamMembers: TeamMember[];
  leads: Lead[];
  startDate: string;
  setStartDate: (value: string) => void;
  startTime: string;
  setStartTime: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  endTime: string;
  setEndTime: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
  errorMessage: string;
}) {
  return (
    <>
      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
          Appointment Title
        </label>

        <input
          value={title}
          onChange={(event) =>
            setTitle(event.target.value)
          }
          placeholder="e.g. Kitchen electrical estimate"
          className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm font-medium outline-none placeholder:text-slate-400 focus:border-slate-400"
        />
      </div>

      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
          Lead
        </label>

        <select
          value={leadId}
          onChange={(event) =>
            setLeadId(event.target.value)
          }
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium outline-none focus:border-slate-400"
        >
          <option value="">
            No lead linked
          </option>

          {leads.map((lead) => (
            <option
              key={lead.id}
              value={lead.id}
            >
              {getLeadName(lead)}
              {lead.service_interest
                ? ` — ${lead.service_interest}`
                : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
            Appointment Type
          </label>

          <select
            value={appointmentType}
            onChange={(event) =>
              setAppointmentType(
                event.target.value
              )
            }
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium outline-none focus:border-slate-400"
          >
            {appointmentTypes.map(
              (type) => (
                <option
                  key={type.value}
                  value={type.value}
                >
                  {type.label}
                </option>
              )
            )}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
            Status
          </label>

          <select
            value={status}
            onChange={(event) =>
              setStatus(
                event.target.value as AppointmentStatus
              )
            }
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium outline-none focus:border-slate-400"
          >
            {statusOptions.map(
              (option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              )
            )}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
          Assigned To
        </label>

        <select
          value={assignedTo}
          onChange={(event) =>
            setAssignedTo(event.target.value)
          }
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium outline-none focus:border-slate-400"
        >
          {teamMembers.map((member) => (
            <option
              key={member.user_id}
              value={member.user_id}
            >
              {member.user_id === currentUserId
                ? "Me"
                : `Team member ${member.user_id.slice(
                    0,
                    8
                  )}`}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Start
          </label>

          {startDate && startTime && (
            <span className="text-xs font-medium text-slate-400">
              {formatTimeOption(startTime)}
            </span>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
          <DateSelect
            value={startDate}
            onChange={setStartDate}
          />

          <TimeSelect
            value={startTime}
            onChange={setStartTime}
          />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            End
          </label>

          {endDate && endTime && (
            <span className="text-xs font-medium text-slate-400">
              {formatTimeOption(endTime)}
            </span>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
          <DateSelect
            value={endDate}
            onChange={setEndDate}
          />

          <TimeSelect
            value={endTime}
            onChange={setEndTime}
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
          Notes
        </label>

        <textarea
          value={notes}
          onChange={(event) =>
            setNotes(event.target.value)
          }
          rows={4}
          placeholder="Add any details your team should know..."
          className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none placeholder:text-slate-400 focus:border-slate-400"
        />
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      )}
    </>
  );
}

export default function AppointmentsClient({
  initialAppointments,
  leads,
  teamMembers,
  currentUserId,
  organizationId,
}: Props) {
  const supabase = createClient();

  const [appointments, setAppointments] =
    useState<Appointment[]>(
      initialAppointments
    );

  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);

  const [showCreateModal, setShowCreateModal] =
    useState(false);

  const [showEditModal, setShowEditModal] =
    useState(false);

  const [view, setView] = useState<
    "week" | "day"
  >("week");

  const [currentDate, setCurrentDate] =
    useState(new Date());

  const [saving, setSaving] =
    useState(false);

  const [updating, setUpdating] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [title, setTitle] = useState("");
  const [leadId, setLeadId] = useState("");
  const [appointmentType, setAppointmentType] =
    useState("service");

  const [status, setStatus] =
    useState<AppointmentStatus>("scheduled");

  const [assignedTo, setAssignedTo] =
    useState(currentUserId);

  const [startDate, setStartDate] =
    useState("");

  const [startTime, setStartTime] =
    useState("");

  const [endDate, setEndDate] =
    useState("");

  const [endTime, setEndTime] =
    useState("");

  const [notes, setNotes] = useState("");

  const today = new Date();

  const weekStart = useMemo(
    () => getStartOfWeek(currentDate),
    [currentDate]
  );

  const days = useMemo(() => {
    if (view === "day") {
      return [new Date(currentDate)];
    }

    return Array.from(
      { length: 7 },
      (_, index) => {
        const date = new Date(weekStart);

        date.setDate(
          date.getDate() + index
        );

        return date;
      }
    );
  }, [currentDate, view, weekStart]);

  const dayAppointments = useMemo(() => {
    return appointments.filter(
      (appointment) => {
        const appointmentDate = new Date(
          appointment.start_at
        );

        if (view === "day") {
          return (
            appointmentDate.getFullYear() ===
              currentDate.getFullYear() &&
            appointmentDate.getMonth() ===
              currentDate.getMonth() &&
            appointmentDate.getDate() ===
              currentDate.getDate()
          );
        }

        const weekEnd = new Date(
          weekStart
        );

        weekEnd.setDate(
          weekEnd.getDate() + 7
        );

        return (
          appointmentDate >= weekStart &&
          appointmentDate < weekEnd
        );
      }
    );
  }, [
    appointments,
    currentDate,
    view,
    weekStart,
  ]);

  function resetForm() {
    const now = new Date();

    now.setMinutes(
      Math.ceil(
        now.getMinutes() / 15
      ) * 15
    );

    now.setSeconds(0);
    now.setMilliseconds(0);

    const end = new Date(now);
    end.setMinutes(
      end.getMinutes() + 60
    );

    const startDateParts =
      getDateParts(now);

    const startTimeParts =
      getTimeParts(now);

    const endDateParts =
      getDateParts(end);

    const endTimeParts =
      getTimeParts(end);

    setTitle("");
    setLeadId("");
    setAppointmentType("service");
    setStatus("scheduled");
    setAssignedTo(currentUserId);

    setStartDate(
      `${startDateParts.year}-${pad(
        startDateParts.month
      )}-${pad(startDateParts.day)}`
    );

    setStartTime(
      `${pad(startTimeParts.hour)}:${pad(
        startTimeParts.minute
      )}`
    );

    setEndDate(
      `${endDateParts.year}-${pad(
        endDateParts.month
      )}-${pad(endDateParts.day)}`
    );

    setEndTime(
      `${pad(endTimeParts.hour)}:${pad(
        endTimeParts.minute
      )}`
    );

    setNotes("");
    setErrorMessage("");
  }

  function loadAppointmentIntoForm(
    appointment: Appointment
  ) {
    const start = new Date(
      appointment.start_at
    );

    const end = appointment.end_at
      ? new Date(appointment.end_at)
      : new Date(
          start.getTime() +
            60 * 60 * 1000
        );

    const startDateParts =
      getDateParts(start);

    const startTimeParts =
      getTimeParts(start);

    const endDateParts =
      getDateParts(end);

    const endTimeParts =
      getTimeParts(end);

    setTitle(appointment.title);
    setLeadId(
      appointment.lead_id || ""
    );

    setAppointmentType(
      appointment.appointment_type
    );

    setStatus(appointment.status);

    setAssignedTo(
      appointment.assigned_to ||
        currentUserId
    );

    setStartDate(
      `${startDateParts.year}-${pad(
        startDateParts.month
      )}-${pad(startDateParts.day)}`
    );

    setStartTime(
      `${pad(startTimeParts.hour)}:${pad(
        startTimeParts.minute
      )}`
    );

    setEndDate(
      `${endDateParts.year}-${pad(
        endDateParts.month
      )}-${pad(endDateParts.day)}`
    );

    setEndTime(
      `${pad(endTimeParts.hour)}:${pad(
        endTimeParts.minute
      )}`
    );

    setNotes(
      appointment.notes || ""
    );

    setErrorMessage("");
  }

  function openCreateModal() {
    resetForm();
    setShowCreateModal(true);
  }

  function openEditModal() {
    if (!selectedAppointment) return;

    loadAppointmentIntoForm(
      selectedAppointment
    );

    setErrorMessage("");
    setShowEditModal(true);
  }

  function moveCalendar(
    direction: number
  ) {
    const next = new Date(
      currentDate
    );

    if (view === "day") {
      next.setDate(
        next.getDate() + direction
      );
    } else {
      next.setDate(
        next.getDate() +
          direction * 7
      );
    }

    setCurrentDate(next);
  }

  function goToday() {
    setCurrentDate(new Date());
  }

  function isSameDay(
    date1: Date,
    date2: Date
  ) {
    return (
      date1.getFullYear() ===
        date2.getFullYear() &&
      date1.getMonth() ===
        date2.getMonth() &&
      date1.getDate() ===
        date2.getDate()
    );
  }

  function getAppointmentsForDay(
    date: Date
  ) {
    return dayAppointments.filter(
      (appointment) =>
        isSameDay(
          new Date(
            appointment.start_at
          ),
          date
        )
    );
  }

  function getAppointmentPosition(
    appointment: Appointment
  ) {
    const start = new Date(
      appointment.start_at
    );

    const startMinutes =
      start.getHours() * 60 +
      start.getMinutes();

    const top =
      ((startMinutes - 7 * 60) /
        15) *
      20;

    let duration = 60;

    if (appointment.end_at) {
      const end = new Date(
        appointment.end_at
      );

      duration = Math.max(
        15,
        (end.getTime() -
          start.getTime()) /
          60000
      );
    }

    const height =
      (duration / 15) * 20;

    return {
      top,
      height,
    };
  }

  async function handleCreateAppointment(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setErrorMessage("");

    if (!title.trim()) {
      setErrorMessage(
        "Please enter an appointment title."
      );
      return;
    }

    const start =
      createDateFromParts(
        startDate,
        startTime
      );

    const end =
      createDateFromParts(
        endDate,
        endTime
      );

    if (!start) {
      setErrorMessage(
        "Please choose a valid start date and time."
      );
      return;
    }

    if (!end) {
      setErrorMessage(
        "Please choose a valid end date and time."
      );
      return;
    }

    if (end <= start) {
      setErrorMessage(
        "The end time must be after the start time."
      );
      return;
    }

    const hasConflict =
      appointments.some(
        (appointment) => {
          if (
            appointment.status ===
              "cancelled" ||
            !appointment.start_at
          ) {
            return false;
          }

          const existingStart =
            new Date(
              appointment.start_at
            );

          const existingEnd =
            appointment.end_at
              ? new Date(
                  appointment.end_at
                )
              : new Date(
                  existingStart.getTime() +
                    60 * 60 * 1000
                );

          return (
            start < existingEnd &&
            end > existingStart
          );
        }
      );

    if (hasConflict) {
      const confirmed =
        window.confirm(
          "This appointment overlaps another appointment. Create it anyway?"
        );

      if (!confirmed) return;
    }

    setSaving(true);

    const { data, error } =
      await supabase
        .from("appointments")
        .insert({
          organization_id:
            organizationId,
          lead_id:
            leadId || null,
          assigned_to:
            assignedTo || null,
          title: title.trim(),
          appointment_type:
            appointmentType,
          status,
          start_at:
            start.toISOString(),
          end_at:
            end.toISOString(),
          notes:
            notes.trim() || null,
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

      setSaving(false);
      return;
    }

    if (data) {
      setAppointments(
        (current) =>
          [...current, data].sort(
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

    setSaving(false);
    setShowCreateModal(false);
  }

  async function updateAppointment(
    updates: Partial<Appointment>
  ) {
    if (!selectedAppointment) {
      return false;
    }

    setUpdating(true);
    setErrorMessage("");

    const { data, error } =
      await supabase
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
    return;
  }

  const appointmentBeforeUpdate =
    selectedAppointment;

  const updated =
    await updateAppointment({
      status: nextStatus,
    });

  if (!updated) {
    return;
  }

  // Only trigger automation when an appointment
  // is specifically marked as a no-show.
  if (nextStatus !== "no_show") {
    return;
  }

  const lead =
    appointmentBeforeUpdate.lead_id
      ? leads.find(
          (item) =>
            item.id ===
            appointmentBeforeUpdate.lead_id
        ) || null
      : null;

  const customerName = [
    lead?.first_name,
    lead?.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const {
    data: automationEvent,
    error,
  } = await supabase
    .from("automation_events")
    .insert({
      organization_id:
        appointmentBeforeUpdate.organization_id,

      event_type:
        "appointment_no_show",

      lead_id:
        appointmentBeforeUpdate.lead_id,

      contact_id: null,

      appointment_id:
        appointmentBeforeUpdate.id,

      estimate_id: null,

      job_id: null,

      payment_id: null,

      review_id: null,

      payload: {
        appointment: {
          appointment_id:
            appointmentBeforeUpdate.id,

          organization_id:
            appointmentBeforeUpdate.organization_id,

          lead_id:
            appointmentBeforeUpdate.lead_id,

          title:
            appointmentBeforeUpdate.title,

          appointment_type:
            appointmentBeforeUpdate.appointment_type,

          status: "no_show",

          start_at:
            appointmentBeforeUpdate.start_at,

          end_at:
            appointmentBeforeUpdate.end_at,

          notes:
            appointmentBeforeUpdate.notes,
        },

        lead: {
          lead_id:
            lead?.id ||
            appointmentBeforeUpdate.lead_id ||
            null,

          customer_name:
            customerName || "there",

          customer_phone:
            lead?.phone || "",

          customer_email:
            lead?.email || "",

          service_interest:
            lead?.service_interest || "",
        },
      },

      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    console.error(
      "Create no-show automation event error:",
      error
    );

    setErrorMessage(
      `Appointment marked as no-show, but automation event failed: ${error.message}`
    );

    return;
  }

  const dispatchResponse =
    await fetch(
      "/api/automation/events",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          event_id:
            automationEvent.id,

          organization_id:
            appointmentBeforeUpdate.organization_id,
        }),
      }
    );

  if (!dispatchResponse.ok) {
    const dispatchText =
      await dispatchResponse.text();

    console.error(
      "No-show automation dispatch failed:",
      dispatchText
    );

    setErrorMessage(
      `Appointment marked as no-show, but automation dispatch failed: ${dispatchText}`
    );

    return;
  }

  console.log(
    "No-show automation dispatched successfully:",
    automationEvent.id
  );
}

  async function handleEditAppointment(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!selectedAppointment) {
      return;
    }

    setErrorMessage("");

    if (!title.trim()) {
      setErrorMessage(
        "Please enter an appointment title."
      );
      return;
    }

    const start =
      createDateFromParts(
        startDate,
        startTime
      );

    const end =
      createDateFromParts(
        endDate,
        endTime
      );

    if (!start || !end) {
      setErrorMessage(
        "Please choose valid dates and times."
      );
      return;
    }

    if (end <= start) {
      setErrorMessage(
        "The end time must be after the start time."
      );
      return;
    }

    const hasConflict =
      appointments.some(
        (appointment) => {
          if (
            appointment.id ===
              selectedAppointment.id ||
            appointment.status ===
              "cancelled"
          ) {
            return false;
          }

          const existingStart =
            new Date(
              appointment.start_at
            );

          const existingEnd =
            appointment.end_at
              ? new Date(
                  appointment.end_at
                )
              : new Date(
                  existingStart.getTime() +
                    60 * 60 * 1000
                );

          return (
            start < existingEnd &&
            end > existingStart
          );
        }
      );

    if (hasConflict) {
      const confirmed =
        window.confirm(
          "This appointment overlaps another appointment. Save it anyway?"
        );

      if (!confirmed) return;
    }

    setUpdating(true);

    const { data, error } =
      await supabase
        .from("appointments")
        .update({
          lead_id:
            leadId || null,
          assigned_to:
            assignedTo || null,
          title: title.trim(),
          appointment_type:
            appointmentType,
          status,
          start_at:
            start.toISOString(),
          end_at:
            end.toISOString(),
          notes:
            notes.trim() || null,
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
        "Edit appointment error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to save appointment."
      );

      setUpdating(false);
      return;
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
    setShowEditModal(false);
  }

  const selectedLead =
    selectedAppointment?.lead_id
      ? leads.find(
          (lead) =>
            lead.id ===
            selectedAppointment.lead_id
        ) || null
      : null;

  const calendarStartHour = 7;
  const calendarEndHour = 23;
  const rowHeight = 80;

  const timeRows = Array.from(
    {
      length:
        calendarEndHour -
        calendarStartHour,
    },
    (_, index) =>
      calendarStartHour + index
  );

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-slate-900">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />

              <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                Schedule
              </span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Appointments
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage estimates, service calls,
              consultations, and your team&apos;s
              schedule.
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
          >
            <span className="text-lg leading-none">
              +
            </span>

            New Appointment
          </button>
        </div>

        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={goToday}
                className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Today
              </button>

              <button
                onClick={() =>
                  moveCalendar(-1)
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
              >
                ←
              </button>

              <button
                onClick={() =>
                  moveCalendar(1)
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
              >
                →
              </button>

              <div className="ml-1 text-sm font-bold text-slate-900">
                {view === "day"
                  ? currentDate.toLocaleDateString(
                      [],
                      {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      }
                    )
                  : `${formatShortDate(
                      days[0]
                    )} – ${formatShortDate(
                      days[days.length - 1]
                    )}`}
              </div>
            </div>

            <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                onClick={() =>
                  setView("week")
                }
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  view === "week"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500"
                }`}
              >
                Week
              </button>

              <button
                onClick={() =>
                  setView("day")
                }
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  view === "day"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500"
                }`}
              >
                Day
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <div className="min-w-[850px]">
              <div
                className="grid border-b border-slate-200"
                style={{
                  gridTemplateColumns: `72px repeat(${days.length}, minmax(0, 1fr))`,
                }}
              >
                <div className="border-r border-slate-200 bg-slate-50" />

                {days.map((day) => {
                  const isToday =
                    isSameDay(
                      day,
                      today
                    );

                  return (
                    <div
                      key={day.toISOString()}
                      className={`border-r border-slate-200 px-3 py-4 text-center last:border-r-0 ${
                        isToday
                          ? "bg-slate-50"
                          : ""
                      }`}
                    >
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {day.toLocaleDateString(
                          [],
                          {
                            weekday: "short",
                          }
                        )}
                      </div>

                      <div
                        className={`mt-1 text-xl font-bold ${
                          isToday
                            ? "text-emerald-600"
                            : "text-slate-900"
                        }`}
                      >
                        {day.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="relative">
                <div
                  className="grid"
                  style={{
                    gridTemplateColumns: `72px repeat(${days.length}, minmax(0, 1fr))`,
                  }}
                >
                  <div className="border-r border-slate-200 bg-slate-50">
                    {timeRows.map(
                      (hour) => (
                        <div
                          key={hour}
                          className="relative border-b border-slate-100"
                          style={{
                            height:
                              rowHeight,
                          }}
                        >
                          <span className="absolute -top-2 right-3 text-[11px] font-medium text-slate-400">
                            {new Date(
                              2000,
                              0,
                              1,
                              hour
                            ).toLocaleTimeString(
                              [],
                              {
                                hour: "numeric",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                        </div>
                      )
                    )}
                  </div>

                  {days.map((day) => {
                    const appointmentsForDay =
                      getAppointmentsForDay(
                        day
                      );

                    return (
                      <div
                        key={day.toISOString()}
                        className="relative border-r border-slate-100 last:border-r-0"
                      >
                        {timeRows.map(
                          (hour) => (
                            <div
                              key={hour}
                              className="border-b border-slate-100"
                              style={{
                                height:
                                  rowHeight,
                              }}
                            />
                          )
                        )}

                        {appointmentsForDay.map(
                          (
                            appointment
                          ) => {
                            const position =
                              getAppointmentPosition(
                                appointment
                              );

                            const lead =
                              appointment.lead_id
                                ? leads.find(
                                    (
                                      item
                                    ) =>
                                      item.id ===
                                      appointment.lead_id
                                  )
                                : null;

                            return (
                              <button
                                key={
                                  appointment.id
                                }
                                onClick={() =>
                                  setSelectedAppointment(
                                    appointment
                                  )
                                }
                                className={`absolute left-1 right-1 overflow-hidden rounded-xl border p-2 text-left shadow-sm transition hover:z-10 hover:shadow-md ${getAppointmentBlockClasses(
                                  appointment.status
                                )}`}
                                style={{
                                  top: position.top,
                                  height:
                                    Math.max(
                                      52,
                                      position.height
                                    ),
                                }}
                              >
                                <div className="truncate text-xs font-bold">
                                  {
                                    appointment.title
                                  }
                                </div>

                                <div className="mt-0.5 truncate text-[11px] font-medium opacity-70">
                                  {formatTime(
                                    appointment.start_at
                                  )}

                                  {appointment.end_at
                                    ? ` – ${formatTime(
                                        appointment.end_at
                                      )}`
                                    : ""}
                                </div>

                                {lead && (
                                  <div className="mt-1 truncate text-[11px] font-semibold opacity-70">
                                    {getLeadName(
                                      lead
                                    )}
                                  </div>
                                )}
                              </button>
                            );
                          }
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {appointments.length ===
          0 && (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
              📅
            </div>

            <h3 className="mt-3 text-sm font-bold text-slate-900">
              No appointments yet
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Create your first appointment
              to start building your schedule.
            </p>

            <button
              onClick={openCreateModal}
              className="mt-4 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white"
            >
              Create Appointment
            </button>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  New Appointment
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Add an appointment to your
                  schedule.
                </p>
              </div>

              <button
                onClick={() =>
                  setShowCreateModal(false)
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleCreateAppointment}
              className="space-y-6 p-6"
            >
              <AppointmentFormFields
                title={title}
                setTitle={setTitle}
                leadId={leadId}
                setLeadId={setLeadId}
                appointmentType={
                  appointmentType
                }
                setAppointmentType={
                  setAppointmentType
                }
                status={status}
                setStatus={setStatus}
                assignedTo={assignedTo}
                setAssignedTo={setAssignedTo}
                currentUserId={currentUserId}
                teamMembers={teamMembers}
                leads={leads}
                startDate={startDate}
                setStartDate={setStartDate}
                startTime={startTime}
                setStartTime={setStartTime}
                endDate={endDate}
                setEndDate={setEndDate}
                endTime={endTime}
                setEndTime={setEndTime}
                notes={notes}
                setNotes={setNotes}
                errorMessage={errorMessage}
              />

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setShowCreateModal(false)
                  }
                  className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="h-11 rounded-xl bg-slate-950 px-6 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {saving
                    ? "Creating..."
                    : "Create Appointment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Edit Appointment
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Update the appointment details.
                </p>
              </div>

              <button
                onClick={() =>
                  setShowEditModal(false)
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleEditAppointment}
              className="space-y-6 p-6"
            >
              <AppointmentFormFields
                title={title}
                setTitle={setTitle}
                leadId={leadId}
                setLeadId={setLeadId}
                appointmentType={
                  appointmentType
                }
                setAppointmentType={
                  setAppointmentType
                }
                status={status}
                setStatus={setStatus}
                assignedTo={assignedTo}
                setAssignedTo={setAssignedTo}
                currentUserId={currentUserId}
                teamMembers={teamMembers}
                leads={leads}
                startDate={startDate}
                setStartDate={setStartDate}
                startTime={startTime}
                setStartTime={setStartTime}
                endDate={endDate}
                setEndDate={setEndDate}
                endTime={endTime}
                setEndTime={setEndTime}
                notes={notes}
                setNotes={setNotes}
                errorMessage={errorMessage}
              />

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setShowEditModal(false)
                  }
                  className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={updating}
                  className="h-11 rounded-xl bg-slate-950 px-6 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {updating
                    ? "Saving..."
                    : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedAppointment && (
        <div className="fixed inset-0 z-40">
          <button
            aria-label="Close appointment details"
            onClick={() =>
              setSelectedAppointment(null)
            }
            className="absolute inset-0 bg-slate-950/30 backdrop-blur-[2px]"
          />

          <aside className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Appointment
                </div>

                <h2 className="mt-1 text-xl font-bold text-slate-950">
                  {
                    selectedAppointment.title
                  }
                </h2>
              </div>

              <button
                onClick={() =>
                  setSelectedAppointment(null)
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100"
              >
                ×
              </button>
            </div>

            <div className="space-y-6 p-6">
              <div className="flex flex-wrap gap-2">
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold capitalize ${getStatusClasses(
                    selectedAppointment.status
                  )}`}
                >
                  {selectedAppointment.status.replace(
                    "_",
                    " "
                  )}
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Date & Time
                </div>

                <div className="mt-2 text-sm font-bold text-slate-900">
                  {formatDate(
                    selectedAppointment.start_at
                  )}
                </div>

                <div className="mt-1 text-sm text-slate-500">
                  {formatTime(
                    selectedAppointment.start_at
                  )}

                  {selectedAppointment.end_at
                    ? ` – ${formatTime(
                        selectedAppointment.end_at
                      )}`
                    : ""}
                </div>
              </div>

              {selectedLead && (
                <div>
                  <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                    Lead
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="font-bold text-slate-900">
                      {getLeadName(
                        selectedLead
                      )}
                    </div>

                    {selectedLead.service_interest && (
                      <div className="mt-1 text-sm text-slate-500">
                        {
                          selectedLead.service_interest
                        }
                      </div>
                    )}

                    {selectedLead.phone && (
                      <div className="mt-3 text-sm text-slate-600">
                        {selectedLead.phone}
                      </div>
                    )}

                    {selectedLead.email && (
                      <div className="mt-1 break-all text-sm text-slate-600">
                        {selectedLead.email}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Appointment Type
                </div>

                <div className="text-sm font-semibold capitalize text-slate-800">
                  {selectedAppointment.appointment_type.replace(
                    "_",
                    " "
                  )}
                </div>
              </div>

              {selectedAppointment.notes && (
                <div>
                  <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                    Notes
                  </div>

                  <div className="whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                    {
                      selectedAppointment.notes
                    }
                  </div>
                </div>
              )}

              <div className="space-y-3 border-t border-slate-200 pt-5">
                <button
                  type="button"
                  onClick={openEditModal}
                  className="h-11 w-full rounded-xl bg-slate-950 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  Edit / Reschedule
                </button>

                <div className="grid grid-cols-2 gap-3">
                  {selectedAppointment.status !==
                    "completed" && (
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() =>
                        handleStatusChange(
                          "completed"
                        )
                      }
                      className="h-11 rounded-xl border border-emerald-200 bg-emerald-50 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                    >
                      {updating
                        ? "Updating..."
                        : "Complete"}
                    </button>
                  )}

                  {selectedAppointment.status !==
                    "no_show" && (
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() =>
                        handleStatusChange(
                          "no_show"
                        )
                      }
                      className="h-11 rounded-xl border border-amber-200 bg-amber-50 text-sm font-bold text-amber-700 transition hover:bg-amber-100 disabled:opacity-60"
                    >
                      No Show
                    </button>
                  )}
                </div>

                {selectedAppointment.status !==
                  "cancelled" && (
                  <button
                    type="button"
                    disabled={updating}
                    onClick={() =>
                      handleStatusChange(
                        "cancelled"
                      )
                    }
                    className="h-11 w-full rounded-xl border border-red-200 bg-red-50 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                  >
                    Cancel Appointment
                  </button>
                )}

                {errorMessage && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {errorMessage}
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}