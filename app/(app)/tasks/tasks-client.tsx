"use client";

import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock3,
  ListTodo,
  Plus,
  X,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Lead, Task } from "./page";

type TasksClientProps = {
  initialTasks: Task[];
  leads: Lead[];
};

function isSameDay(date1: Date, date2: Date) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function formatDueDate(date: string | null) {
  if (!date) return "No due date";

  const dueDate = new Date(date);
  const today = new Date();

  if (isSameDay(dueDate, today)) {
    return dueDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return dueDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatCompletedDate(date: string | null) {
  if (!date) return null;

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getLeadName(leadId: string | null, leads: Lead[]) {
  if (!leadId) return null;

  const lead = leads.find((lead) => lead.id === leadId);

  if (!lead) return null;

  const fullName = [lead.first_name, lead.last_name]
    .filter(Boolean)
    .join(" ");

  return fullName || "Unnamed lead";
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "?";

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getPriorityStyles(priority: Task["priority"]) {
  if (priority === "high") {
    return {
      badge: "border-red-200 bg-red-50 text-red-700",
      dot: "bg-red-500",
      label: "High priority",
    };
  }

  if (priority === "medium") {
    return {
      badge: "border-amber-200 bg-amber-50 text-amber-700",
      dot: "bg-amber-500",
      label: "Medium priority",
    };
  }

  return {
    badge: "border-slate-200 bg-slate-50 text-slate-600",
    dot: "bg-slate-400",
    label: "Low priority",
  };
}

export default function TasksClient({
  initialTasks,
  leads,
}: TasksClientProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  const [updatingTaskId, setUpdatingTaskId] =
    useState<string | null>(null);

  const [isCreatingTask, setIsCreatingTask] = useState(false);

  const [showNewTaskForm, setShowNewTaskForm] = useState(false);

  const [newTaskTitle, setNewTaskTitle] = useState("");

  const [newTaskDescription, setNewTaskDescription] =
    useState("");

  const [newTaskPriority, setNewTaskPriority] =
    useState<"low" | "medium" | "high">("medium");

  const [newTaskDueAt, setNewTaskDueAt] = useState("");

  const [newTaskLeadId, setNewTaskLeadId] = useState("");

  const supabase = createClient();

  const stats = useMemo(() => {
    const now = new Date();

    const pendingTasks = tasks.filter(
      (task) => task.status === "pending"
    );

    const overdueTasks = pendingTasks.filter((task) => {
      if (!task.due_at) return false;

      return new Date(task.due_at) < now;
    });

    const todayTasks = pendingTasks.filter((task) => {
      if (!task.due_at) return false;

      return isSameDay(new Date(task.due_at), now);
    });

    const upcomingTasks = pendingTasks.filter((task) => {
      if (!task.due_at) return false;

      const dueDate = new Date(task.due_at);

      return dueDate > now && !isSameDay(dueDate, now);
    });

    const completedTasks = tasks.filter(
      (task) => task.status === "completed"
    );

    return {
      total: pendingTasks.length,
      today: todayTasks.length,
      upcoming: upcomingTasks.length,
      overdue: overdueTasks.length,
      completed: completedTasks.length,
    };
  }, [tasks]);

  async function toggleTask(task: Task) {
    setUpdatingTaskId(task.id);

    const isCurrentlyCompleted = task.status === "completed";

    const newStatus = isCurrentlyCompleted
      ? "pending"
      : "completed";

    const completedAt = isCurrentlyCompleted
      ? null
      : new Date().toISOString();

    setTasks((currentTasks) =>
      currentTasks.map((currentTask) =>
        currentTask.id === task.id
          ? {
              ...currentTask,
              status: newStatus,
              completed_at: completedAt,
            }
          : currentTask
      )
    );

    const { error } = await supabase
      .from("tasks")
      .update({
        status: newStatus,
        completed_at: completedAt,
      })
      .eq("id", task.id);

    if (error) {
      console.error(
        "Error updating task:",
        JSON.stringify(error, null, 2)
      );

      setTasks((currentTasks) =>
        currentTasks.map((currentTask) =>
          currentTask.id === task.id ? task : currentTask
        )
      );

      alert(
        "We couldn't update this task. Please try again."
      );
    }

    setUpdatingTaskId(null);
  }

  async function createTask(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!newTaskTitle.trim()) {
      return;
    }

    setIsCreatingTask(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(
        "Error getting authenticated user:",
        userError
      );

      alert("You must be signed in to create a task.");

      setIsCreatingTask(false);
      return;
    }

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        user_id: user.id,
        lead_id: newTaskLeadId || null,
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim() || null,
        priority: newTaskPriority,
        due_at: newTaskDueAt
          ? new Date(newTaskDueAt).toISOString()
          : null,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error(
        "Error creating task:",
        JSON.stringify(error, null, 2)
      );

      alert(
        `We couldn't create this task: ${
          error.message || "Unknown error"
        }`
      );

      setIsCreatingTask(false);
      return;
    }

    if (data) {
      setTasks((currentTasks) => [
        data as Task,
        ...currentTasks,
      ]);
    }

    setNewTaskTitle("");
    setNewTaskDescription("");
    setNewTaskPriority("medium");
    setNewTaskDueAt("");
    setNewTaskLeadId("");

    setShowNewTaskForm(false);
    setIsCreatingTask(false);
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="absolute inset-x-0 top-0 h-1 bg-slate-950" />

        <div className="flex flex-col justify-between gap-6 p-6 sm:p-8 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-600">
                Operations
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Tasks
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
              Keep the work that matters moving forward and
              make sure nothing slips through the cracks.
            </p>
          </div>

          <button
            onClick={() => setShowNewTaskForm(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 active:translate-y-0"
            type="button"
          >
            <Plus className="h-4 w-4" />
            New Task
          </button>
        </div>
      </section>

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TaskStat
          label="Open tasks"
          value={stats.total}
          description="Currently remaining"
          icon={
            <ListTodo className="h-4 w-4 text-slate-400" />
          }
        />

        <TaskStat
          label="Due today"
          value={stats.today}
          description="Needs attention today"
          icon={
            <Clock3 className="h-4 w-4 text-blue-500" />
          }
          accent="blue"
        />

        <TaskStat
          label="Upcoming"
          value={stats.upcoming}
          description="Scheduled ahead"
          icon={
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          }
          accent="green"
        />

        <TaskStat
          label="Overdue"
          value={stats.overdue}
          description={
            stats.overdue > 0
              ? "Needs immediate attention"
              : "Nothing currently overdue"
          }
          attention={stats.overdue > 0}
          icon={
            <AlertCircle className="h-4 w-4 text-red-500" />
          }
        />
      </div>

      {/* New Task Form */}
      {showNewTaskForm && (
        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/70 px-6 py-5 sm:px-7">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
                  <Plus className="h-4 w-4" />
                </div>

                <div>
                  <h2 className="text-base font-semibold text-slate-950">
                    Create task
                  </h2>

                  <p className="mt-0.5 text-sm text-slate-500">
                    Add work that needs to get done.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowNewTaskForm(false)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-900"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={createTask} className="p-6 sm:p-7">
            <div className="grid gap-5">
              {/* Title */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Task title
                </label>

                <input
                  value={newTaskTitle}
                  onChange={(event) =>
                    setNewTaskTitle(event.target.value)
                  }
                  placeholder="Call new lead"
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-4 focus:ring-slate-100"
                  autoFocus
                />
              </div>

              {/* Lead */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Related lead
                </label>

                <select
                  value={newTaskLeadId}
                  onChange={(event) =>
                    setNewTaskLeadId(event.target.value)
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-100"
                >
                  <option value="">
                    No lead selected
                  </option>

                  {leads.map((lead) => {
                    const leadName =
                      [lead.first_name, lead.last_name]
                        .filter(Boolean)
                        .join(" ") || "Unnamed lead";

                    return (
                      <option
                        key={lead.id}
                        value={lead.id}
                      >
                        {leadName}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Description
                </label>

                <textarea
                  value={newTaskDescription}
                  onChange={(event) =>
                    setNewTaskDescription(
                      event.target.value
                    )
                  }
                  placeholder="Optional details..."
                  rows={3}
                  className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-4 focus:ring-slate-100"
                />
              </div>

              {/* Priority + Due */}
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Priority
                  </label>

                  <select
                    value={newTaskPriority}
                    onChange={(event) =>
                      setNewTaskPriority(
                        event.target.value as
                          | "low"
                          | "medium"
                          | "high"
                      )
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-100"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Due date
                  </label>

                  <input
                    type="datetime-local"
                    value={newTaskDueAt}
                    onChange={(event) =>
                      setNewTaskDueAt(event.target.value)
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-100"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowNewTaskForm(false)}
                className="h-11 rounded-xl px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  isCreatingTask || !newTaskTitle.trim()
                }
                className="h-11 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreatingTask
                  ? "Creating..."
                  : "Create Task"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Task List */}
      <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                Your Tasks
              </h2>

              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                {tasks.length}
              </span>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Complete the highest-impact work first.
            </p>
          </div>

          {stats.overdue > 0 && (
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
              <AlertCircle className="h-3.5 w-3.5" />
              {stats.overdue} overdue
            </div>
          )}
        </div>

        {tasks.length === 0 ? (
          <div className="px-6 py-20 text-center sm:px-10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
              <ListTodo className="h-6 w-6 text-slate-300" />
            </div>

            <h3 className="mt-5 text-sm font-semibold text-slate-950">
              No tasks yet
            </h3>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
              Create your first task and start keeping
              important work organized.
            </p>

            <button
              type="button"
              onClick={() => setShowNewTaskForm(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Create your first task
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {tasks.map((task) => {
              const isCompleted = task.status === "completed";

              const isOverdue =
                !isCompleted &&
                !!task.due_at &&
                new Date(task.due_at) < new Date();

              const isDueToday =
                !isCompleted &&
                !!task.due_at &&
                isSameDay(
                  new Date(task.due_at),
                  new Date()
                );

              const leadName = getLeadName(
                task.lead_id,
                leads
              );

              const priorityStyles =
                getPriorityStyles(task.priority);

              return (
                <div
                  key={task.id}
                  className={`group relative flex gap-4 px-5 py-5 transition duration-200 hover:bg-slate-50 sm:px-7 ${
                    isCompleted ? "bg-slate-50/40" : ""
                  }`}
                >
                  {/* Priority indicator */}
                  <div
                    className={`absolute bottom-0 left-0 top-0 w-0.5 transition ${
                      isCompleted
                        ? "bg-emerald-400"
                        : priorityStyles.dot
                    }`}
                  />

                  {/* Completion */}
                  <button
                    type="button"
                    onClick={() => toggleTask(task)}
                    disabled={updatingTaskId === task.id}
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition ${
                      isCompleted
                        ? "border-emerald-500 bg-emerald-500 text-white shadow-sm"
                        : "border-slate-300 bg-white text-transparent hover:border-slate-950 hover:bg-slate-50"
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                    aria-label={
                      isCompleted
                        ? "Mark task as pending"
                        : "Complete task"
                    }
                  >
                    {isCompleted && (
                      <Check className="h-4 w-4" />
                    )}
                  </button>

                  {/* Main content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p
                          className={`text-sm font-semibold sm:text-[15px] ${
                            isCompleted
                              ? "text-slate-400 line-through"
                              : "text-slate-950"
                          }`}
                        >
                          {task.title}
                        </p>

                        {task.description && (
                          <p
                            className={`mt-1.5 max-w-3xl text-sm leading-5 ${
                              isCompleted
                                ? "text-slate-400"
                                : "text-slate-500"
                            }`}
                          >
                            {task.description}
                          </p>
                        )}
                      </div>

                      {/* Due date */}
                      <div className="shrink-0 sm:pl-4">
                        <div
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                            isCompleted
                              ? "bg-emerald-50 text-emerald-700"
                              : isOverdue
                              ? "bg-red-50 text-red-700"
                              : isDueToday
                              ? "bg-blue-50 text-blue-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : isOverdue ? (
                            <AlertCircle className="h-3.5 w-3.5" />
                          ) : (
                            <Clock3 className="h-3.5 w-3.5" />
                          )}

                          {isCompleted
                            ? "Completed"
                            : isOverdue
                            ? `Overdue · ${formatDueDate(
                                task.due_at
                              )}`
                            : isDueToday
                            ? `Today · ${formatDueDate(
                                task.due_at
                              )}`
                            : formatDueDate(task.due_at)}
                        </div>

                        {isCompleted &&
                          task.completed_at && (
                            <p className="mt-1 text-right text-[11px] text-slate-400">
                              {formatCompletedDate(
                                task.completed_at
                              )}
                            </p>
                          )}
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${priorityStyles.badge}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${priorityStyles.dot}`}
                        />

                        {task.priority}
                      </span>

                      {leadName && (
                        <span className="inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-blue-700">
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[8px] font-bold text-white">
                            {getInitials(leadName)}
                          </span>

                          {leadName}
                        </span>
                      )}

                      {!task.due_at && !isCompleted && (
                        <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          No due date
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Bottom operational summary */}
      {tasks.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
              Completion
            </p>

            <div className="mt-3 flex items-end justify-between gap-4">
              <p className="text-2xl font-semibold tracking-tight text-slate-950">
                {tasks.length > 0
                  ? Math.round(
                      (stats.completed / tasks.length) * 100
                    )
                  : 0}
                %
              </p>

              <p className="text-xs text-slate-400">
                {stats.completed} of {tasks.length}
              </p>
            </div>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{
                  width: `${
                    tasks.length > 0
                      ? Math.min(
                          100,
                          (stats.completed /
                            tasks.length) *
                            100
                        )
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
              Today
            </p>

            <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
              {stats.today}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              {stats.today === 1
                ? "task requires attention"
                : "tasks require attention"}
            </p>
          </div>

          <div
            className={`rounded-2xl border p-5 shadow-sm ${
              stats.overdue > 0
                ? "border-red-200 bg-red-50/40"
                : "border-slate-200 bg-white"
            }`}
          >
            <p
              className={`text-xs font-bold uppercase tracking-[0.12em] ${
                stats.overdue > 0
                  ? "text-red-500"
                  : "text-slate-400"
              }`}
            >
              Attention
            </p>

            <p
              className={`mt-3 text-2xl font-semibold tracking-tight ${
                stats.overdue > 0
                  ? "text-red-700"
                  : "text-slate-950"
              }`}
            >
              {stats.overdue}
            </p>

            <p
              className={`mt-1 text-xs ${
                stats.overdue > 0
                  ? "text-red-600"
                  : "text-slate-400"
              }`}
            >
              {stats.overdue > 0
                ? "overdue tasks need action"
                : "everything is on schedule"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskStat({
  label,
  value,
  description,
  icon,
  attention = false,
  accent = "slate",
}: {
  label: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  attention?: boolean;
  accent?: "slate" | "blue" | "green";
}) {
  const accentStyles = {
    slate: "bg-slate-100",
    blue: "bg-blue-50",
    green: "bg-emerald-50",
  };

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        attention
          ? "border-red-200"
          : "border-slate-200"
      }`}
    >
      <div
        className={`absolute inset-x-0 top-0 h-0.5 ${
          attention
            ? "bg-red-500"
            : accent === "blue"
            ? "bg-blue-500"
            : accent === "green"
            ? "bg-emerald-500"
            : "bg-slate-300"
        }`}
      />

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">
          {label}
        </p>

        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
            attention
              ? "bg-red-50"
              : accentStyles[accent]
          }`}
        >
          {icon}
        </div>
      </div>

      <p
        className={`mt-4 text-3xl font-semibold tracking-tight ${
          attention
            ? "text-red-600"
            : "text-slate-950"
        }`}
      >
        {value}
      </p>

      <p className="mt-1.5 text-xs leading-5 text-slate-400">
        {description}
      </p>
    </div>
  );
}