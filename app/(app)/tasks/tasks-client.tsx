"use client";

import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock3,
  ListTodo,
  Plus,
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

function getLeadName(
  leadId: string | null,
  leads: Lead[]
) {
  if (!leadId) return null;

  const lead = leads.find(
    (lead) => lead.id === leadId
  );

  if (!lead) return null;

  const fullName = [
    lead.first_name,
    lead.last_name,
  ]
    .filter(Boolean)
    .join(" ");

  return fullName || "Unnamed lead";
}

export default function TasksClient({
  initialTasks,
  leads,
}: TasksClientProps) {
  const [tasks, setTasks] =
    useState<Task[]>(initialTasks);

  const [updatingTaskId, setUpdatingTaskId] =
    useState<string | null>(null);

  const [isCreatingTask, setIsCreatingTask] =
    useState(false);

  const [showNewTaskForm, setShowNewTaskForm] =
    useState(false);

  const [newTaskTitle, setNewTaskTitle] =
    useState("");

  const [newTaskDescription, setNewTaskDescription] =
    useState("");

  const [newTaskPriority, setNewTaskPriority] =
    useState<"low" | "medium" | "high">("medium");

  const [newTaskDueAt, setNewTaskDueAt] =
    useState("");

  const [newTaskLeadId, setNewTaskLeadId] =
    useState("");

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

      return isSameDay(
        new Date(task.due_at),
        now
      );
    });

    const upcomingTasks = pendingTasks.filter((task) => {
      if (!task.due_at) return false;

      const dueDate = new Date(task.due_at);

      return (
        dueDate > now &&
        !isSameDay(dueDate, now)
      );
    });

    return {
      total: pendingTasks.length,
      today: todayTasks.length,
      upcoming: upcomingTasks.length,
      overdue: overdueTasks.length,
    };
  }, [tasks]);

  async function toggleTask(task: Task) {
    setUpdatingTaskId(task.id);

    const isCurrentlyCompleted =
      task.status === "completed";

    const newStatus = isCurrentlyCompleted
      ? "pending"
      : "completed";

    const completedAt = isCurrentlyCompleted
      ? null
      : new Date().toISOString();

    // Update UI immediately
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

      // Revert UI if Supabase fails
      setTasks((currentTasks) =>
        currentTasks.map((currentTask) =>
          currentTask.id === task.id
            ? task
            : currentTask
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

      alert(
        "You must be signed in to create a task."
      );

      setIsCreatingTask(false);
      return;
    }

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        user_id: user.id,
        lead_id: newTaskLeadId || null,
        title: newTaskTitle.trim(),
        description:
          newTaskDescription.trim() || null,
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
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-blue-600">
            OPERATIONS
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Tasks
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Stay focused on the work that moves your business forward.
          </p>
        </div>

        <button
          onClick={() => setShowNewTaskForm(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          type="button"
        >
          <Plus className="h-4 w-4" />
          New Task
        </button>
      </div>

      {/* New Task Form */}
      {showNewTaskForm && (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Create Task
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Add something important to your task list.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowNewTaskForm(false)
              }
              className="text-sm font-medium text-slate-500 hover:text-slate-900"
            >
              Cancel
            </button>
          </div>

          <form
            onSubmit={createTask}
            className="mt-6 grid gap-5"
          >
            {/* Task Title */}
            <div>
              <label className="text-sm font-medium text-slate-700">
                Task title
              </label>

              <input
                value={newTaskTitle}
                onChange={(event) =>
                  setNewTaskTitle(event.target.value)
                }
                placeholder="Call new lead"
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-950"
                autoFocus
              />
            </div>

            {/* Related Lead */}
            <div>
              <label className="text-sm font-medium text-slate-700">
                Related lead
              </label>

              <select
                value={newTaskLeadId}
                onChange={(event) =>
                  setNewTaskLeadId(
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-950"
              >
                <option value="">
                  No lead selected
                </option>

                {leads.map((lead) => {
                  const leadName =
                    [
                      lead.first_name,
                      lead.last_name,
                    ]
                      .filter(Boolean)
                      .join(" ") ||
                    "Unnamed lead";

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
              <label className="text-sm font-medium text-slate-700">
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
                className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-950"
              />
            </div>

            {/* Priority + Due Date */}
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">
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
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-950"
                >
                  <option value="low">
                    Low
                  </option>

                  <option value="medium">
                    Medium
                  </option>

                  <option value="high">
                    High
                  </option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Due date
                </label>

                <input
                  type="datetime-local"
                  value={newTaskDueAt}
                  onChange={(event) =>
                    setNewTaskDueAt(
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-950"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={() =>
                  setShowNewTaskForm(false)
                }
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isCreatingTask}
                className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreatingTask
                  ? "Creating..."
                  : "Create Task"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TaskStat
          label="Open tasks"
          value={stats.total}
          description="Tasks currently remaining"
          icon={
            <ListTodo className="h-4 w-4 text-slate-400" />
          }
        />

        <TaskStat
          label="Due today"
          value={stats.today}
          description="Tasks requiring attention today"
          icon={
            <Clock3 className="h-4 w-4 text-blue-500" />
          }
        />

        <TaskStat
          label="Upcoming"
          value={stats.upcoming}
          description="Tasks scheduled ahead"
          icon={
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          }
        />

        <TaskStat
          label="Overdue"
          value={stats.overdue}
          description="Tasks needing immediate attention"
          attention={stats.overdue > 0}
          icon={
            <AlertCircle className="h-4 w-4 text-red-500" />
          }
        />
      </div>

      {/* Task List */}
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-lg font-semibold text-slate-950">
            Your Tasks
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Complete the highest-priority work first.
          </p>
        </div>

        {tasks.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <ListTodo className="mx-auto h-8 w-8 text-slate-300" />

            <h3 className="mt-4 text-sm font-semibold text-slate-900">
              No tasks yet
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Create your first task to start organizing your work.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {tasks.map((task) => {
              const isCompleted =
                task.status === "completed";

              const isOverdue =
                !isCompleted &&
                !!task.due_at &&
                new Date(task.due_at) <
                  new Date();

              const leadName = getLeadName(
                task.lead_id,
                leads
              );

              return (
                <div
                  key={task.id}
                  className={`flex items-center gap-4 px-6 py-5 transition hover:bg-slate-50 ${
                    isCompleted
                      ? "opacity-60"
                      : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      toggleTask(task)
                    }
                    disabled={
                      updatingTaskId === task.id
                    }
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
                      isCompleted
                        ? "border-green-500 bg-green-500 text-white"
                        : "border-slate-300 hover:border-slate-950"
                    } disabled:cursor-not-allowed`}
                  >
                    {isCompleted && (
                      <Check className="h-4 w-4" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`font-medium ${
                        isCompleted
                          ? "text-slate-400 line-through"
                          : "text-slate-900"
                      }`}
                    >
                      {task.title}
                    </p>

                    {task.description && (
                      <p className="mt-1 text-sm text-slate-500">
                        {task.description}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                          task.priority ===
                          "high"
                            ? "bg-red-50 text-red-600"
                            : task.priority ===
                              "medium"
                            ? "bg-amber-50 text-amber-600"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {task.priority}
                      </span>

                      {leadName && (
                        <span className="rounded-md bg-blue-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-600">
                          {leadName}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p
                      className={`text-sm font-medium ${
                        isOverdue
                          ? "text-red-600"
                          : "text-slate-500"
                      }`}
                    >
                      {formatDueDate(
                        task.due_at
                      )}
                    </p>

                    {isCompleted && (
                      <p className="mt-1 text-xs text-green-600">
                        Completed
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function TaskStat({
  label,
  value,
  description,
  icon,
  attention = false,
}: {
  label: string;
  value: number;
  description: string;
  icon: React.ReactNode;
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
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">
          {label}
        </p>

        {icon}
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

      <p className="mt-2 text-xs text-slate-400">
        {description}
      </p>
    </div>
  );
}