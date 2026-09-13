"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock3,
  Mail,
  MessageSquare,
  Phone,
  Play,
  Plus,
  RefreshCw,
  Settings2,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Trash2,
  UserPlus,
  X,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type AutomationStatus =
  | "active"
  | "inactive"
  | "error";

type LastRunStatus =
  | "success"
  | "failed"
  | null;

type Automation = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  action_type: string;
  status: AutomationStatus;
  last_run_at: string | null;
  last_run_status: LastRunStatus;
  run_count: number;
  created_at: string;
  updated_at: string;
};

type Props = {
  automations: Automation[];
};

type Template = {
  name: string;
  description: string;
  trigger_type: string;
  action_type: string;
  icon: "lead" | "phone" | "estimate" | "appointment" | "payment" | "review" | "refresh";
};

const templates: Template[] = [
  {
    name: "New Lead Follow-Up",
    description:
      "Respond quickly when a new lead enters the CRM.",
    trigger_type: "Lead Created",
    action_type:
      "Instant Response → Follow-Up",
    icon: "lead",
  },
  {
    name: "Missed Call Recovery",
    description:
      "Automatically follow up when a call is missed.",
    trigger_type: "Missed Call",
    action_type:
      "SMS → Owner Notification",
    icon: "phone",
  },
  {
    name: "Estimate Follow-Up",
    description:
      "Follow up with customers who have not responded to an estimate.",
    trigger_type: "Estimate Sent",
    action_type:
      "Follow-Up → Reminder",
    icon: "estimate",
  },
  {
    name: "Appointment Reminder",
    description:
      "Keep customers informed before scheduled appointments.",
    trigger_type: "Appointment Upcoming",
    action_type:
      "Reminder → Confirmation",
    icon: "appointment",
  },
  {
    name: "Payment Reminder",
    description:
      "Remind customers about outstanding balances.",
    trigger_type: "Payment Outstanding",
    action_type:
      "Reminder → Follow-Up",
    icon: "payment",
  },
  {
    name: "Review Request",
    description:
      "Ask happy customers for a review after a completed job.",
    trigger_type: "Job Completed",
    action_type:
      "Review Request → Reminder",
    icon: "review",
  },
  {
    name: "Lead Reactivation",
    description:
      "Reconnect with older leads that never became customers.",
    trigger_type: "Lead Inactive",
    action_type:
      "Reactivation Message → Follow-Up",
    icon: "refresh",
  },
];

function getTemplateIcon(
  icon: Template["icon"]
) {
  switch (icon) {
    case "lead":
      return <UserPlus className="h-5 w-5" />;

    case "phone":
      return <Phone className="h-5 w-5" />;

    case "estimate":
      return <Mail className="h-5 w-5" />;

    case "appointment":
      return <Clock3 className="h-5 w-5" />;

    case "payment":
      return <MessageSquare className="h-5 w-5" />;

    case "review":
      return <Sparkles className="h-5 w-5" />;

    case "refresh":
      return <RefreshCw className="h-5 w-5" />;
  }
}

function formatDate(
  value: string | null | undefined
) {
  if (!value) return "Never";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getStatusLabel(
  status: AutomationStatus
) {
  switch (status) {
    case "active":
      return "Active";

    case "error":
      return "Error";

    default:
      return "Off";
  }
}

function getStatusClasses(
  status: AutomationStatus
) {
  switch (status) {
    case "active":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";

    case "error":
      return "bg-red-50 text-red-700 ring-red-200";

    default:
      return "bg-slate-100 text-slate-500 ring-slate-200";
  }
}

export default function AutomationsClient({
  automations: initialAutomations,
}: Props) {
  const supabase = createClient();

  const [automations, setAutomations] =
    useState<Automation[]>(
      initialAutomations
    );

  const [showTemplates, setShowTemplates] =
    useState(false);

  const [showCreateModal, setShowCreateModal] =
    useState(false);

  const [editingAutomation, setEditingAutomation] =
    useState<Automation | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] =
    useState("");
  const [triggerType, setTriggerType] =
    useState("Lead Created");
  const [actionType, setActionType] =
    useState("Instant Response → Follow-Up");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const metrics = useMemo(() => {
    const active = automations.filter(
      (automation) =>
        automation.status === "active"
    ).length;

    const errors = automations.filter(
      (automation) =>
        automation.status === "error"
    ).length;

    const runs = automations.reduce(
      (sum, automation) =>
        sum + Number(automation.run_count || 0),
      0
    );

    return {
      total: automations.length,
      active,
      errors,
      runs,
    };
  }, [automations]);

  function resetForm() {
    setName("");
    setDescription("");
    setTriggerType("Lead Created");
    setActionType(
      "Instant Response → Follow-Up"
    );
    setError("");
  }

  function openCreate() {
    resetForm();
    setEditingAutomation(null);
    setShowCreateModal(true);
  }

  function openEdit(
    automation: Automation
  ) {
    setEditingAutomation(automation);
    setName(automation.name);
    setDescription(
      automation.description ?? ""
    );
    setTriggerType(
      automation.trigger_type
    );
    setActionType(
      automation.action_type
    );
    setError("");
    setShowCreateModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowCreateModal(false);
    setEditingAutomation(null);
    resetForm();
  }

  async function saveAutomation() {
    try {
      setSaving(true);
      setError("");

      if (!name.trim()) {
        throw new Error(
          "Please enter an automation name."
        );
      }

      if (editingAutomation) {
        const { data, error } =
          await supabase
            .from("automations")
            .update({
              name: name.trim(),
              description:
                description.trim() || null,
              trigger_type: triggerType,
              action_type: actionType,
              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              editingAutomation.id
            )
            .select(
              `
                id,
                organization_id,
                name,
                description,
                trigger_type,
                action_type,
                status,
                last_run_at,
                last_run_status,
                run_count,
                created_at,
                updated_at
              `
            )
            .single();

        if (error) throw error;

        setAutomations((current) =>
          current.map((item) =>
            item.id ===
            editingAutomation.id
              ? (data as Automation)
              : item
          )
        );
      } else {
        const {
          data: {
            user,
          },
        } =
          await supabase.auth.getUser();

        if (!user) {
          throw new Error(
            "You must be signed in."
          );
        }

        const { data: membership } =
          await supabase
            .from(
              "organization_members"
            )
            .select(
              "organization_id"
            )
            .eq(
              "user_id",
              user.id
            )
            .maybeSingle();

        if (!membership) {
          throw new Error(
            "No organization was found for your account."
          );
        }

        const { data, error } =
          await supabase
            .from("automations")
            .insert({
              organization_id:
                membership.organization_id,
              name: name.trim(),
              description:
                description.trim() || null,
              trigger_type:
                triggerType,
              action_type:
                actionType,
              status: "inactive",
            })
            .select(
              `
                id,
                organization_id,
                name,
                description,
                trigger_type,
                action_type,
                status,
                last_run_at,
                last_run_status,
                run_count,
                created_at,
                updated_at
              `
            )
            .single();

        if (error) throw error;

        setAutomations((current) => [
          data as Automation,
          ...current,
        ]);
      }

      closeModal();
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message ||
          "Something went wrong while saving the automation."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleAutomation(
    automation: Automation
  ) {
    try {
      setError("");

      const newStatus =
        automation.status === "active"
          ? "inactive"
          : "active";

      const { data, error } =
        await supabase
          .from("automations")
          .update({
            status: newStatus,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            automation.id
          )
          .select(
            `
              id,
              organization_id,
              name,
              description,
              trigger_type,
              action_type,
              status,
              last_run_at,
              last_run_status,
              run_count,
              created_at,
              updated_at
            `
          )
          .single();

      if (error) throw error;

      setAutomations((current) =>
        current.map((item) =>
          item.id === automation.id
            ? (data as Automation)
            : item
        )
      );
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message ||
          "Unable to update automation."
      );
    }
  }

  async function deleteAutomation(
    automation: Automation
  ) {
    const confirmed =
      window.confirm(
        `Delete "${automation.name}"? This cannot be undone.`
      );

    if (!confirmed) return;

    try {
      setError("");

      const { error } =
        await supabase
          .from("automations")
          .delete()
          .eq(
            "id",
            automation.id
          );

      if (error) throw error;

      setAutomations((current) =>
        current.filter(
          (item) =>
            item.id !== automation.id
        )
      );
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message ||
          "Unable to delete automation."
      );
    }
  }

  function useTemplate(
    template: Template
  ) {
    setName(template.name);
    setDescription(
      template.description
    );
    setTriggerType(
      template.trigger_type
    );
    setActionType(
      template.action_type
    );
    setShowTemplates(false);
    setShowCreateModal(true);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
              <Zap className="h-4 w-4" />
              Workflow Engine
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Automations
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Automate the repetitive work behind your
              contracting business.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                setShowTemplates(
                  (current) => !current
                )
              }
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <Sparkles className="h-4 w-4" />
              Templates
            </button>

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              New Automation
            </button>
          </div>
        </div>

        {/* Error */}
        {error && !showCreateModal && (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              className="rounded-md p-1 hover:bg-red-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Metrics */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total Automations"
            value={metrics.total.toString()}
            description="Configured workflows"
            icon={
              <Zap className="h-5 w-5" />
            }
          />

          <MetricCard
            label="Active"
            value={metrics.active.toString()}
            description="Currently enabled"
            icon={
              <CheckCircle2 className="h-5 w-5" />
            }
          />

          <MetricCard
            label="Total Runs"
            value={metrics.runs.toLocaleString()}
            description="Automation executions"
            icon={
              <Play className="h-5 w-5" />
            }
          />

          <MetricCard
            label="Needs Attention"
            value={metrics.errors.toString()}
            description="Automations reporting errors"
            icon={
              <AlertCircle className="h-5 w-5" />
            }
          />
        </div>

        {/* Template Panel */}
        {showTemplates && (
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="font-semibold text-slate-950">
                  Automation Templates
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Start with a proven contractor workflow
                  and customize it.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowTemplates(false)
                }
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-px bg-slate-100 sm:grid-cols-2 xl:grid-cols-3">
              {templates.map(
                (template) => (
                  <button
                    key={template.name}
                    type="button"
                    onClick={() =>
                      useTemplate(
                        template
                      )
                    }
                    className="group bg-white p-5 text-left transition hover:bg-slate-50"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition group-hover:bg-slate-200">
                        {getTemplateIcon(
                          template.icon
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-950">
                          {template.name}
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {
                            template.description
                          }
                        </p>

                        <div className="mt-3 flex items-center gap-2 text-[11px] font-medium text-slate-400">
                          <span>
                            {
                              template.trigger_type
                            }
                          </span>

                          <ArrowRight className="h-3 w-3" />

                          <span>
                            {
                              template.action_type
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                )
              )}
            </div>
          </section>
        )}

        {/* Automations */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <h2 className="font-semibold text-slate-950">
                Your Automations
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {automations.length}{" "}
                {automations.length === 1
                  ? "workflow"
                  : "workflows"}{" "}
                configured
              </p>
            </div>

            <div className="hidden items-center gap-2 text-xs font-medium text-slate-400 sm:flex">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              Active
            </div>
          </div>

          {automations.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Bot className="h-7 w-7" />
              </div>

              <h3 className="mt-5 text-base font-semibold text-slate-950">
                No automations yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Start with a template or create a custom
                automation for your business.
              </p>

              <button
                type="button"
                onClick={() =>
                  setShowTemplates(true)
                }
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <Sparkles className="h-4 w-4" />
                Browse Templates
              </button>
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70">
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Automation
                      </th>

                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Trigger
                      </th>

                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Actions
                      </th>

                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Status
                      </th>

                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Last Run
                      </th>

                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Controls
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {automations.map(
                      (automation) => (
                        <tr
                          key={
                            automation.id
                          }
                          className="transition hover:bg-slate-50/70"
                        >
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                                <Zap className="h-5 w-5" />
                              </div>

                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-950">
                                  {
                                    automation.name
                                  }
                                </p>

                                <p className="mt-1 max-w-xs truncate text-xs text-slate-400">
                                  {
                                    automation.description ||
                                    "No description"
                                  }
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-5">
                            <span className="text-sm font-medium text-slate-700">
                              {
                                automation.trigger_type
                              }
                            </span>
                          </td>

                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <ArrowRight className="h-4 w-4 text-slate-300" />

                              {
                                automation.action_type
                              }
                            </div>
                          </td>

                          <td className="px-6 py-5">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusClasses(
                                automation.status
                              )}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  automation.status ===
                                  "active"
                                    ? "bg-emerald-500"
                                    : automation.status ===
                                      "error"
                                    ? "bg-red-500"
                                    : "bg-slate-400"
                                }`}
                              />

                              {getStatusLabel(
                                automation.status
                              )}
                            </span>
                          </td>

                          <td className="px-6 py-5">
                            <div>
                              <p className="text-sm text-slate-600">
                                {formatDate(
                                  automation.last_run_at
                                )}
                              </p>

                              <p className="mt-1 text-xs text-slate-400">
                                {
                                  automation.run_count
                                }{" "}
                                runs
                              </p>
                            </div>
                          </td>

                          <td className="px-6 py-5">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  toggleAutomation(
                                    automation
                                  )
                                }
                                title={
                                  automation.status ===
                                  "active"
                                    ? "Turn off"
                                    : "Turn on"
                                }
                                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                              >
                                {automation.status ===
                                "active" ? (
                                  <ToggleRight className="h-5 w-5 text-emerald-600" />
                                ) : (
                                  <ToggleLeft className="h-5 w-5" />
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  openEdit(
                                    automation
                                  )
                                }
                                title="Edit automation"
                                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                              >
                                <Settings2 className="h-4 w-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  deleteAutomation(
                                    automation
                                  )
                                }
                                title="Delete automation"
                                className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="divide-y divide-slate-100 lg:hidden">
                {automations.map(
                  (automation) => (
                    <div
                      key={
                        automation.id
                      }
                      className="p-5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                          <Zap className="h-5 w-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-950">
                                {
                                  automation.name
                                }
                              </p>

                              <p className="mt-1 text-xs leading-5 text-slate-400">
                                {
                                  automation.description ||
                                  "No description"
                                }
                              </p>
                            </div>

                            <span
                              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusClasses(
                                automation.status
                              )}`}
                            >
                              {
                                getStatusLabel(
                                  automation.status
                                )
                              }
                            </span>
                          </div>

                          <div className="mt-4 rounded-xl bg-slate-50 p-3">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-semibold text-slate-400">
                                Trigger
                              </span>

                              <ArrowRight className="h-3.5 w-3.5 text-slate-300" />

                              <span className="font-medium text-slate-700">
                                {
                                  automation.trigger_type
                                }
                              </span>
                            </div>

                            <div className="mt-2 flex items-center gap-2 text-xs">
                              <span className="font-semibold text-slate-400">
                                Action
                              </span>

                              <ArrowRight className="h-3.5 w-3.5 text-slate-300" />

                              <span className="font-medium text-slate-700">
                                {
                                  automation.action_type
                                }
                              </span>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between">
                            <div>
                              <p className="text-xs text-slate-400">
                                Last run
                              </p>

                              <p className="mt-0.5 text-xs font-medium text-slate-600">
                                {formatDate(
                                  automation.last_run_at
                                )}
                              </p>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  toggleAutomation(
                                    automation
                                  )
                                }
                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                              >
                                {automation.status ===
                                "active" ? (
                                  <ToggleRight className="h-5 w-5 text-emerald-600" />
                                ) : (
                                  <ToggleLeft className="h-5 w-5" />
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  openEdit(
                                    automation
                                  )
                                }
                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                              >
                                <Settings2 className="h-4 w-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  deleteAutomation(
                                    automation
                                  )
                                }
                                className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </>
          )}
        </section>

        {/* Information */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <Bot className="h-5 w-5" />
            </div>

            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-950">
                Automation engine
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Trackpr manages the workflow configuration.
                The execution layer will connect to your
                automation engine so these workflows can
                run automatically.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
              <Settings2 className="h-3.5 w-3.5" />
              Configuration ready
            </div>
          </div>
        </section>
      </div>

      {/* Create / Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  {editingAutomation
                    ? "Edit Automation"
                    : "New Automation"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Define when the workflow starts and what
                  it should do.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mx-6 mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-5 px-6 py-6">
              <Field label="Automation Name" required>
                <input
                  value={name}
                  onChange={(event) =>
                    setName(
                      event.target.value
                    )
                  }
                  placeholder="New Lead Follow-Up"
                  className={inputClass}
                />
              </Field>

              <Field label="Description">
                <textarea
                  value={description}
                  onChange={(event) =>
                    setDescription(
                      event.target.value
                    )
                  }
                  rows={3}
                  placeholder="Describe what this automation does..."
                  className={`${inputClass} resize-y py-3`}
                />
              </Field>

              <Field label="Trigger" required>
                <select
                  value={triggerType}
                  onChange={(event) =>
                    setTriggerType(
                      event.target.value
                    )
                  }
                  className={`${inputClass} appearance-none`}
                >
                  <option>
                    Lead Created
                  </option>
                  <option>
                    Lead Inactive
                  </option>
                  <option>
                    Missed Call
                  </option>
                  <option>
                    Appointment Upcoming
                  </option>
                  <option>
                    Appointment Booked
                  </option>
                  <option>
                    Estimate Sent
                  </option>
                  <option>
                    Estimate Expired
                  </option>
                  <option>
                    Estimate Accepted
                  </option>
                  <option>
                    Job Created
                  </option>
                  <option>
                    Job Completed
                  </option>
                  <option>
                    Payment Outstanding
                  </option>
                  <option>
                    Payment Received
                  </option>
                  <option>
                    Review Received
                  </option>
                </select>
              </Field>

              <Field label="Action" required>
                <select
                  value={actionType}
                  onChange={(event) =>
                    setActionType(
                      event.target.value
                    )
                  }
                  className={`${inputClass} appearance-none`}
                >
                  <option>
                    Instant Response → Follow-Up
                  </option>
                  <option>
                    SMS → Owner Notification
                  </option>
                  <option>
                    Follow-Up → Reminder
                  </option>
                  <option>
                    Reminder → Confirmation
                  </option>
                  <option>
                    Review Request → Reminder
                  </option>
                  <option>
                    Reactivation Message → Follow-Up
                  </option>
                  <option>
                    AI Response
                  </option>
                  <option>
                    Internal Notification
                  </option>
                </select>
              </Field>

              {editingAutomation && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
                      <Zap className="h-4 w-4" />
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Current Status
                      </p>

                      <p className="mt-0.5 text-sm font-semibold text-slate-800">
                        {getStatusLabel(
                          editingAutomation.status
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveAutomation}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editingAutomation
                  ? "Save Changes"
                  : "Create Automation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100";

function MetricCard({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            {value}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
          {icon}
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        {description}
      </p>
    </div>
  );
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </span>

      {children}
    </label>
  );
}