"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  Activity,
  ArrowDown,
  Bot,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  GitBranch,
  Mail,
  MessageSquare,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Trash2,
  UserPlus,
  Webhook,
  X,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Workflow = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type WorkflowStep = {
  id: string;
  workflow_id: string;
  organization_id: string;
  step_order: number;
  step_type: string;
  name: string;
  configuration: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type Props = {
  organizationId: string;
  initialWorkflows: Workflow[];
  initialSteps: WorkflowStep[];
};

type StepType =
  | "send_sms"
  | "send_email"
  | "wait"
  | "condition"
  | "assign"
  | "create_task"
  | "ai_agent"
  | "webhook"
  | "notify";

const TRIGGERS = [
  {
    value: "lead_created",
    label: "Lead Created",
    description: "Runs automatically when a new lead enters Trackpr.",
    icon: UserPlus,
  },
  {
    value: "lead_status_changed",
    label: "Lead Status Changed",
    description: "Runs when a lead's status changes.",
    icon: RefreshCw,
  },
  {
    value: "appointment_booked",
    label: "Appointment Booked",
    description: "Runs when an appointment is created.",
    icon: Clock3,
  },
  {
    value: "estimate_sent",
    label: "Estimate Sent",
    description: "Runs when an estimate is sent to a customer.",
    icon: Mail,
  },
  {
    value: "estimate_accepted",
    label: "Estimate Accepted",
    description: "Runs when a customer accepts an estimate.",
    icon: Check,
  },
  {
    value: "job_created",
    label: "Job Created",
    description: "Runs when a new job is created.",
    icon: Zap,
  },
  {
    value: "payment_received",
    label: "Payment Received",
    description: "Runs when a payment is recorded.",
    icon: Activity,
  },
  {
    value: "review_received",
    label: "Review Received",
    description: "Runs when a new review is received.",
    icon: MessageSquare,
  },
  {
    value: "manual",
    label: "Manual",
    description: "Only runs when manually triggered.",
    icon: Play,
  },
];

const STEP_TYPES: {
  value: StepType;
  label: string;
  description: string;
}[] = [
  {
    value: "send_sms",
    label: "Send SMS",
    description: "Send a text message to the lead.",
  },
  {
    value: "send_email",
    label: "Send Email",
    description: "Send an email to the lead.",
  },
  {
    value: "wait",
    label: "Wait",
    description: "Pause the workflow before continuing.",
  },
  {
    value: "condition",
    label: "Condition",
    description: "Branch based on lead or workflow data.",
  },
  {
    value: "assign",
    label: "Assign",
    description: "Assign the lead to a team member.",
  },
  {
    value: "create_task",
    label: "Create Task",
    description: "Create a task for your team.",
  },
  {
    value: "ai_agent",
    label: "AI Agent",
    description: "Hand the conversation to an AI agent.",
  },
  {
    value: "webhook",
    label: "Webhook",
    description: "Send workflow data to an external system.",
  },
  {
    value: "notify",
    label: "Notify Team",
    description: "Send an internal notification.",
  },
];

function triggerLabel(value: string) {
  return TRIGGERS.find((trigger) => trigger.value === value)?.label ?? value;
}

function triggerDescription(value: string) {
  return (
    TRIGGERS.find((trigger) => trigger.value === value)?.description ??
    "Starts this workflow automatically."
  );
}

function triggerIcon(value: string) {
  return (
    TRIGGERS.find((trigger) => trigger.value === value)?.icon ?? Zap
  );
}

function stepTypeLabel(value: string) {
  return STEP_TYPES.find((step) => step.value === value)?.label ?? value;
}

function statusLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function iconForStep(type: string) {
  switch (type) {
    case "send_sms":
      return MessageSquare;
    case "send_email":
      return Mail;
    case "wait":
      return Clock3;
    case "condition":
      return GitBranch;
    case "assign":
      return UserPlus;
    case "create_task":
      return Check;
    case "ai_agent":
      return Bot;
    case "webhook":
      return Webhook;
    case "notify":
      return Activity;
    default:
      return Zap;
  }
}

function stepConfiguration(stepType: StepType): Record<string, unknown> {
  switch (stepType) {
    case "send_sms":
      return {
        message: "",
      };

    case "send_email":
      return {
        subject: "",
        message: "",
      };

    case "wait":
      return {
        amount: 1,
        unit: "hours",
      };

    case "condition":
      return {
        field: "lead.status",
        operator: "equals",
        value: "",
      };

    case "assign":
      return {
        assignee_id: "",
      };

    case "create_task":
      return {
        title: "",
        priority: "medium",
      };

    case "ai_agent":
      return {
        agent_id: "",
      };

    case "webhook":
      return {
        url: "",
        method: "POST",
      };

    case "notify":
      return {
        message: "",
      };

    default:
      return {};
  }
}

function statusClasses(status: string) {
  switch (status) {
    case "active":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200";

    case "paused":
      return "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200";

    case "error":
      return "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200";

    default:
      return "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200";
  }
}

function stepAccentClasses(type: string) {
  switch (type) {
    case "send_sms":
      return "bg-blue-50 text-blue-600 ring-blue-100";

    case "send_email":
      return "bg-violet-50 text-violet-600 ring-violet-100";

    case "wait":
      return "bg-amber-50 text-amber-600 ring-amber-100";

    case "condition":
      return "bg-purple-50 text-purple-600 ring-purple-100";

    case "ai_agent":
      return "bg-indigo-50 text-indigo-600 ring-indigo-100";

    case "webhook":
      return "bg-cyan-50 text-cyan-600 ring-cyan-100";

    case "create_task":
      return "bg-emerald-50 text-emerald-600 ring-emerald-100";

    case "assign":
      return "bg-orange-50 text-orange-600 ring-orange-100";

    case "notify":
      return "bg-slate-100 text-slate-600 ring-slate-200";

    default:
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
      >
        {children}
      </select>
    </div>
  );
}

export default function WorkflowClient({
  organizationId,
  initialWorkflows,
  initialSteps,
}: Props) {
  const supabase = createClient();

  const [workflows, setWorkflows] = useState<Workflow[]>(initialWorkflows);
  const [steps, setSteps] = useState<WorkflowStep[]>(initialSteps);

  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(
    initialWorkflows[0]?.id ?? null
  );

  const [search, setSearch] = useState("");

  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
  const [isStepModalOpen, setIsStepModalOpen] = useState(false);

  const [editingWorkflow, setEditingWorkflow] =
    useState<Workflow | null>(null);

  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);

  const [workflowName, setWorkflowName] = useState("");
  const [workflowDescription, setWorkflowDescription] = useState("");
  const [workflowTrigger, setWorkflowTrigger] = useState("lead_created");

  const [stepType, setStepType] = useState<StepType>("send_sms");
  const [stepName, setStepName] = useState("");

  const [stepConfig, setStepConfig] = useState<Record<string, unknown>>(
    stepConfiguration("send_sms")
  );

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const filteredWorkflows = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return workflows;

    return workflows.filter(
      (workflow) =>
        workflow.name.toLowerCase().includes(query) ||
        (workflow.description ?? "").toLowerCase().includes(query) ||
        triggerLabel(workflow.trigger_type).toLowerCase().includes(query)
    );
  }, [workflows, search]);

  const selectedWorkflow = useMemo(
    () =>
      workflows.find((workflow) => workflow.id === selectedWorkflowId) ?? null,
    [workflows, selectedWorkflowId]
  );

  const selectedSteps = useMemo(() => {
    if (!selectedWorkflowId) return [];

    return steps
      .filter((step) => step.workflow_id === selectedWorkflowId)
      .sort((a, b) => a.step_order - b.step_order);
  }, [steps, selectedWorkflowId]);

  const activeCount = workflows.filter(
    (workflow) => workflow.status === "active"
  ).length;

  const draftCount = workflows.filter(
    (workflow) => workflow.status === "draft"
  ).length;

  const pausedCount = workflows.filter(
    (workflow) => workflow.status === "paused"
  ).length;

  function openCreateWorkflow() {
    setEditingWorkflow(null);
    setWorkflowName("");
    setWorkflowDescription("");
    setWorkflowTrigger("lead_created");
    setError("");
    setIsWorkflowModalOpen(true);
  }

  function openEditWorkflow(workflow: Workflow) {
    setEditingWorkflow(workflow);
    setWorkflowName(workflow.name);
    setWorkflowDescription(workflow.description ?? "");
    setWorkflowTrigger(workflow.trigger_type);
    setError("");
    setIsWorkflowModalOpen(true);
  }

  function closeWorkflowModal() {
    if (saving) return;

    setIsWorkflowModalOpen(false);
    setEditingWorkflow(null);
    setError("");
  }

  async function saveWorkflow(event: FormEvent) {
    event.preventDefault();

    if (!workflowName.trim()) {
      setError("Please enter a workflow name.");
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      organization_id: organizationId,
      name: workflowName.trim(),
      description: workflowDescription.trim() || null,
      trigger_type: workflowTrigger,
    };

    if (editingWorkflow) {
      const { data, error: updateError } = await supabase
        .from("workflows")
        .update(payload)
        .eq("id", editingWorkflow.id)
        .select(
          "id, organization_id, name, description, trigger_type, status, created_at, updated_at"
        )
        .single();

      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }

      setWorkflows((current) =>
        current.map((workflow) =>
          workflow.id === editingWorkflow.id ? data : workflow
        )
      );
    } else {
      const { data, error: insertError } = await supabase
        .from("workflows")
        .insert({
          ...payload,
          status: "draft",
        })
        .select(
          "id, organization_id, name, description, trigger_type, status, created_at, updated_at"
        )
        .single();

      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }

      setWorkflows((current) => [data, ...current]);
      setSelectedWorkflowId(data.id);
    }

    setSaving(false);
    setIsWorkflowModalOpen(false);
    setEditingWorkflow(null);
  }

  async function toggleWorkflow(workflow: Workflow) {
    const nextStatus =
      workflow.status === "active" ? "paused" : "active";

    const { data, error: updateError } = await supabase
      .from("workflows")
      .update({
        status: nextStatus,
      })
      .eq("id", workflow.id)
      .select(
        "id, organization_id, name, description, trigger_type, status, created_at, updated_at"
      )
      .single();

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setWorkflows((current) =>
      current.map((item) => (item.id === workflow.id ? data : item))
    );
  }

  async function duplicateWorkflow(workflow: Workflow) {
    setSaving(true);
    setError("");

    const { data: newWorkflow, error: workflowError } = await supabase
      .from("workflows")
      .insert({
        organization_id: organizationId,
        name: `${workflow.name} Copy`,
        description: workflow.description,
        trigger_type: workflow.trigger_type,
        status: "draft",
      })
      .select(
        "id, organization_id, name, description, trigger_type, status, created_at, updated_at"
      )
      .single();

    if (workflowError) {
      setError(workflowError.message);
      setSaving(false);
      return;
    }

    const originalSteps = steps
      .filter((step) => step.workflow_id === workflow.id)
      .sort((a, b) => a.step_order - b.step_order);

    if (originalSteps.length > 0) {
      const { data: copiedSteps, error: stepsError } = await supabase
        .from("workflow_steps")
        .insert(
          originalSteps.map((step, index) => ({
            workflow_id: newWorkflow.id,
            organization_id: organizationId,
            step_order: index,
            step_type: step.step_type,
            name: step.name,
            configuration: step.configuration,
          }))
        )
        .select(
          "id, workflow_id, organization_id, step_order, step_type, name, configuration, created_at, updated_at"
        );

      if (stepsError) {
        setError(stepsError.message);
        setSaving(false);
        return;
      }

      setSteps((current) => [...current, ...(copiedSteps ?? [])]);
    }

    setWorkflows((current) => [newWorkflow, ...current]);
    setSelectedWorkflowId(newWorkflow.id);
    setSaving(false);
  }

  async function deleteWorkflow(workflow: Workflow) {
    const confirmed = window.confirm(
      `Delete "${workflow.name}"? This will also delete its workflow steps and run history.`
    );

    if (!confirmed) return;

    setDeleting(true);
    setError("");

    const { error: deleteError } = await supabase
      .from("workflows")
      .delete()
      .eq("id", workflow.id);

    if (deleteError) {
      setError(deleteError.message);
      setDeleting(false);
      return;
    }

    setWorkflows((current) =>
      current.filter((item) => item.id !== workflow.id)
    );

    setSteps((current) =>
      current.filter((step) => step.workflow_id !== workflow.id)
    );

    if (selectedWorkflowId === workflow.id) {
      const remaining = workflows.filter(
        (item) => item.id !== workflow.id
      );

      setSelectedWorkflowId(remaining[0]?.id ?? null);
    }

    setDeleting(false);
  }

  function openCreateStep() {
    if (!selectedWorkflow) return;

    setEditingStep(null);
    setStepType("send_sms");
    setStepName("");
    setStepConfig(stepConfiguration("send_sms"));
    setError("");
    setIsStepModalOpen(true);
  }

  function openEditStep(step: WorkflowStep) {
    setEditingStep(step);
    setStepType(step.step_type as StepType);
    setStepName(step.name);
    setStepConfig(step.configuration ?? {});
    setError("");
    setIsStepModalOpen(true);
  }

  function closeStepModal() {
    if (saving) return;

    setIsStepModalOpen(false);
    setEditingStep(null);
    setError("");
  }

  async function saveStep(event: FormEvent) {
    event.preventDefault();

    if (!selectedWorkflow) {
      setError("Select a workflow first.");
      return;
    }

    if (!stepName.trim()) {
      setError("Please enter a step name.");
      return;
    }

    setSaving(true);
    setError("");

    if (editingStep) {
      const { data, error: updateError } = await supabase
        .from("workflow_steps")
        .update({
          step_type: stepType,
          name: stepName.trim(),
          configuration: stepConfig,
        })
        .eq("id", editingStep.id)
        .select(
          "id, workflow_id, organization_id, step_order, step_type, name, configuration, created_at, updated_at"
        )
        .single();

      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }

      setSteps((current) =>
        current.map((step) =>
          step.id === editingStep.id ? data : step
        )
      );
    } else {
      const nextOrder =
        selectedSteps.length > 0
          ? Math.max(
              ...selectedSteps.map((step) => step.step_order)
            ) + 1
          : 0;

      const { data, error: insertError } = await supabase
        .from("workflow_steps")
        .insert({
          workflow_id: selectedWorkflow.id,
          organization_id: organizationId,
          step_order: nextOrder,
          step_type: stepType,
          name: stepName.trim(),
          configuration: stepConfig,
        })
        .select(
          "id, workflow_id, organization_id, step_order, step_type, name, configuration, created_at, updated_at"
        )
        .single();

      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }

      setSteps((current) => [...current, data]);
    }

    setSaving(false);
    setIsStepModalOpen(false);
    setEditingStep(null);
  }

  async function deleteStep(step: WorkflowStep) {
    const confirmed = window.confirm(
      `Delete "${step.name}" from this workflow?`
    );

    if (!confirmed) return;

    setError("");

    const { error: deleteError } = await supabase
      .from("workflow_steps")
      .delete()
      .eq("id", step.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    const remaining = selectedSteps
      .filter((item) => item.id !== step.id)
      .map((item, index) => ({
        ...item,
        step_order: index,
      }));

    setSteps((current) => [
      ...current.filter(
        (item) => item.workflow_id !== selectedWorkflow?.id
      ),
      ...remaining,
    ]);

    if (remaining.length > 0) {
      await Promise.all(
        remaining.map((item) =>
          supabase
            .from("workflow_steps")
            .update({
              step_order: item.step_order,
            })
            .eq("id", item.id)
        )
      );
    }
  }

  async function moveStep(
    step: WorkflowStep,
    direction: -1 | 1
  ) {
    const currentIndex = selectedSteps.findIndex(
      (item) => item.id === step.id
    );

    const targetIndex = currentIndex + direction;

    if (
      currentIndex < 0 ||
      targetIndex < 0 ||
      targetIndex >= selectedSteps.length
    ) {
      return;
    }

    const reordered = [...selectedSteps];

    [reordered[currentIndex], reordered[targetIndex]] = [
      reordered[targetIndex],
      reordered[currentIndex],
    ];

    const updatedSteps = reordered.map((item, index) => ({
      ...item,
      step_order: index,
    }));

    setSteps((current) => [
      ...current.filter(
        (item) => item.workflow_id !== selectedWorkflow?.id
      ),
      ...updatedSteps,
    ]);

    const results = await Promise.all(
      updatedSteps.map((item) =>
        supabase
          .from("workflow_steps")
          .update({
            step_order: item.step_order,
          })
          .eq("id", item.id)
      )
    );

    const failed = results.find((result) => result.error);

    if (failed?.error) {
      setError(failed.error.message);
    }
  }

  function updateStepConfig(key: string, value: unknown) {
    setStepConfig((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function renderStepConfiguration() {
    switch (stepType) {
      case "send_sms":
        return (
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Message
            </label>

            <textarea
              rows={5}
              value={String(stepConfig.message ?? "")}
              onChange={(event) =>
                updateStepConfig("message", event.target.value)
              }
              placeholder="Hi {{first_name}}, just checking in about your estimate..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            />

            <p className="mt-2 text-xs leading-5 text-slate-400">
              Variables such as{" "}
              <span className="font-mono text-slate-500">
                {"{{first_name}}"}
              </span>{" "}
              can be used when supported by the automation engine.
            </p>
          </div>
        );

      case "send_email":
        return (
          <div className="grid gap-4">
            <InputField
              label="Subject"
              value={String(stepConfig.subject ?? "")}
              onChange={(value) => updateStepConfig("subject", value)}
              placeholder="Following up on your estimate"
            />

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Email Message
              </label>

              <textarea
                rows={6}
                value={String(stepConfig.message ?? "")}
                onChange={(event) =>
                  updateStepConfig("message", event.target.value)
                }
                placeholder="Write your email..."
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>
          </div>
        );

      case "wait":
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            <InputField
              label="Amount"
              type="number"
              value={String(stepConfig.amount ?? 1)}
              onChange={(value) =>
                updateStepConfig(
                  "amount",
                  Number(value)
                )
              }
            />

            <SelectField
              label="Unit"
              value={String(stepConfig.unit ?? "hours")}
              onChange={(value) =>
                updateStepConfig("unit", value)
              }
            >
              <option value="minutes">Minutes</option>
              <option value="hours">Hours</option>
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
            </SelectField>
          </div>
        );

      case "condition":
        return (
          <div className="grid gap-4 sm:grid-cols-3">
            <SelectField
              label="Field"
              value={String(stepConfig.field ?? "lead.status")}
              onChange={(value) =>
                updateStepConfig("field", value)
              }
            >
              <option value="lead.status">Lead Status</option>
              <option value="lead.source">Lead Source</option>
              <option value="lead.email">Lead Email</option>
              <option value="lead.phone">Lead Phone</option>
              <option value="appointment.status">
                Appointment Status
              </option>
            </SelectField>

            <SelectField
              label="Operator"
              value={String(stepConfig.operator ?? "equals")}
              onChange={(value) =>
                updateStepConfig("operator", value)
              }
            >
              <option value="equals">Equals</option>
              <option value="not_equals">
                Does not equal
              </option>
              <option value="contains">Contains</option>
              <option value="exists">Exists</option>
              <option value="not_exists">
                Does not exist
              </option>
            </SelectField>

            <InputField
              label="Value"
              value={String(stepConfig.value ?? "")}
              onChange={(value) =>
                updateStepConfig("value", value)
              }
              placeholder="new"
            />
          </div>
        );

      case "create_task":
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            <InputField
              label="Task Title"
              value={String(stepConfig.title ?? "")}
              onChange={(value) =>
                updateStepConfig("title", value)
              }
              placeholder="Follow up with lead"
            />

            <SelectField
              label="Priority"
              value={String(stepConfig.priority ?? "medium")}
              onChange={(value) =>
                updateStepConfig("priority", value)
              }
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </SelectField>
          </div>
        );

      case "webhook":
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            <InputField
              label="Webhook URL"
              type="url"
              value={String(stepConfig.url ?? "")}
              onChange={(value) =>
                updateStepConfig("url", value)
              }
              placeholder="https://..."
            />

            <SelectField
              label="Method"
              value={String(stepConfig.method ?? "POST")}
              onChange={(value) =>
                updateStepConfig("method", value)
              }
            >
              <option value="POST">POST</option>
              <option value="GET">GET</option>
            </SelectField>
          </div>
        );

      case "notify":
        return (
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Notification
            </label>

            <textarea
              rows={4}
              value={String(stepConfig.message ?? "")}
              onChange={(event) =>
                updateStepConfig("message", event.target.value)
              }
              placeholder="A high-value lead needs attention."
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            />
          </div>
        );

      case "assign":
        return (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
            <div className="flex items-start gap-3">
              <UserPlus
                size={18}
                className="mt-0.5 shrink-0 text-amber-700"
              />

              <div>
                <p className="text-sm font-semibold text-amber-900">
                  Team assignment
                </p>

                <p className="mt-1 text-xs leading-5 text-amber-700">
                  Assignment will connect to your organization
                  team members when team management is enabled.
                </p>
              </div>
            </div>
          </div>
        );

      case "ai_agent":
        return (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-4">
            <div className="flex items-start gap-3">
              <Bot
                size={18}
                className="mt-0.5 shrink-0 text-indigo-700"
              />

              <div>
                <p className="text-sm font-semibold text-indigo-900">
                  AI Agent step
                </p>

                <p className="mt-1 text-xs leading-5 text-indigo-700">
                  This step is ready for connection to the AI
                  Agents execution layer.
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
                <Zap size={21} />
              </div>

              <div>
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Automation
                  </span>
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Workflows
                </h1>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                  Build automated processes that keep leads,
                  customers, and your team moving.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={openCreateWorkflow}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.99]"
          >
            <Plus size={18} />
            New Workflow
          </button>
        </div>

        {/* Metrics */}
        <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Total Workflows
              </span>

              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <Zap size={16} />
              </div>
            </div>

            <div className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
              {workflows.length}
            </div>

            <p className="mt-1 text-xs text-slate-400">
              Automation processes configured
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Active
              </span>

              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Play size={15} />
              </div>
            </div>

            <div className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
              {activeCount}
            </div>

            <p className="mt-1 text-xs text-slate-400">
              Currently enabled
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Drafts
              </span>

              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <Pencil size={15} />
              </div>
            </div>

            <div className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
              {draftCount}
            </div>

            <p className="mt-1 text-xs text-slate-400">
              Workflows being configured
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Total Steps
              </span>

              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Activity size={15} />
              </div>
            </div>

            <div className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
              {steps.length}
            </div>

            <p className="mt-1 text-xs text-slate-400">
              Actions across workflows
            </p>
          </div>
        </div>

        {/* Small status summary */}
        {pausedCount > 0 && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-amber-600 shadow-sm">
              <Clock3 size={15} />
            </div>

            <div>
              <p className="text-xs font-bold text-amber-900">
                {pausedCount} workflow
                {pausedCount === 1 ? "" : "s"} paused
              </p>

              <p className="mt-0.5 text-xs text-amber-700">
                Paused workflows will not process new automation events.
              </p>
            </div>
          </div>
        )}

        {/* Main workspace */}
        <div className="grid min-h-[700px] gap-5 xl:grid-cols-[350px_minmax(0,1fr)]">

          {/* Workflow list */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Workflow Library
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-400">
                    {workflows.length} configured
                    {draftCount > 0
                      ? ` · ${draftCount} draft${
                          draftCount === 1 ? "" : "s"
                        }`
                      : ""}
                  </p>
                </div>

                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <GitBranch size={15} />
                </div>
              </div>

              <div className="relative">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search workflows..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100"
                />
              </div>
            </div>

            <div className="max-h-[700px] overflow-y-auto">
              {filteredWorkflows.length === 0 ? (
                <div className="flex min-h-[420px] items-center justify-center p-8 text-center">
                  <div>
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                      <Zap size={23} />
                    </div>

                    <p className="mt-4 text-sm font-bold text-slate-800">
                      {search
                        ? "No matching workflows"
                        : "No workflows yet"}
                    </p>

                    <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-slate-400">
                      {search
                        ? "Try a different search term."
                        : "Create your first workflow to automate a repetitive process."}
                    </p>

                    {!search && (
                      <button
                        onClick={openCreateWorkflow}
                        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                      >
                        <Plus size={15} />
                        Create Workflow
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-2">
                  {filteredWorkflows.map((workflow) => {
                    const workflowStepCount = steps.filter(
                      (step) => step.workflow_id === workflow.id
                    ).length;

                    const selected =
                      workflow.id === selectedWorkflowId;

                    const TriggerIcon = triggerIcon(
                      workflow.trigger_type
                    );

                    return (
                      <button
                        key={workflow.id}
                        onClick={() =>
                          setSelectedWorkflowId(workflow.id)
                        }
                        className={`group mb-1 w-full rounded-xl p-3.5 text-left transition ${
                          selected
                            ? "bg-slate-900 shadow-sm"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                              selected
                                ? "bg-white/10 text-white"
                                : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                            }`}
                          >
                            <TriggerIcon size={17} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`min-w-0 flex-1 truncate text-sm font-semibold ${
                                  selected
                                    ? "text-white"
                                    : "text-slate-900"
                                }`}
                              >
                                {workflow.name}
                              </span>

                              <ChevronRight
                                size={15}
                                className={`shrink-0 ${
                                  selected
                                    ? "text-slate-400"
                                    : "text-slate-300 group-hover:text-slate-500"
                                }`}
                              />
                            </div>

                            <div
                              className={`mt-1 truncate text-xs ${
                                selected
                                  ? "text-slate-300"
                                  : "text-slate-500"
                              }`}
                            >
                              {triggerLabel(workflow.trigger_type)}
                            </div>

                            <div className="mt-2.5 flex items-center gap-2">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                  selected
                                    ? workflow.status === "active"
                                      ? "bg-emerald-400/15 text-emerald-300"
                                      : workflow.status === "paused"
                                      ? "bg-amber-400/15 text-amber-300"
                                      : "bg-white/10 text-slate-300"
                                    : statusClasses(workflow.status)
                                }`}
                              >
                                {statusLabel(workflow.status)}
                              </span>

                              <span
                                className={`text-[11px] ${
                                  selected
                                    ? "text-slate-400"
                                    : "text-slate-400"
                                }`}
                              >
                                {workflowStepCount}{" "}
                                {workflowStepCount === 1
                                  ? "step"
                                  : "steps"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Builder */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {!selectedWorkflow ? (
              <div className="flex min-h-[700px] items-center justify-center p-8 text-center">
                <div>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <GitBranch size={27} />
                  </div>

                  <h2 className="mt-5 text-lg font-bold text-slate-900">
                    Select a workflow
                  </h2>

                  <p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-slate-500">
                    Choose a workflow from the library or create a
                    new one to start building your automation.
                  </p>

                  <button
                    onClick={openCreateWorkflow}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                  >
                    <Plus size={17} />
                    New Workflow
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Builder header */}
                <div className="border-b border-slate-200 bg-white px-5 py-5 md:px-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h2 className="text-xl font-bold tracking-tight text-slate-900">
                          {selectedWorkflow.name}
                        </h2>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusClasses(
                            selectedWorkflow.status
                          )}`}
                        >
                          {statusLabel(selectedWorkflow.status)}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                        <span>
                          Trigger:{" "}
                          <span className="font-semibold text-slate-600">
                            {triggerLabel(
                              selectedWorkflow.trigger_type
                            )}
                          </span>
                        </span>

                        <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:block" />

                        <span>
                          {selectedSteps.length}{" "}
                          {selectedSteps.length === 1
                            ? "action"
                            : "actions"}
                        </span>
                      </div>

                      {selectedWorkflow.description ? (
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                          {selectedWorkflow.description}
                        </p>
                      ) : (
                        <p className="mt-2 text-sm text-slate-400">
                          No workflow description added.
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          toggleWorkflow(selectedWorkflow)
                        }
                        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                          selectedWorkflow.status === "active"
                            ? "border-amber-200 bg-white text-amber-700 hover:bg-amber-50"
                            : "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
                        }`}
                      >
                        {selectedWorkflow.status === "active" ? (
                          <>
                            <X size={14} />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play size={14} />
                            Activate
                          </>
                        )}
                      </button>

                      <button
                        onClick={() =>
                          duplicateWorkflow(selectedWorkflow)
                        }
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        <Copy size={14} />
                        Duplicate
                      </button>

                      <button
                        onClick={() =>
                          openEditWorkflow(selectedWorkflow)
                        }
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                      >
                        <Pencil size={14} />
                        Edit
                      </button>

                      <button
                        onClick={() =>
                          deleteWorkflow(selectedWorkflow)
                        }
                        disabled={deleting}
                        className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                        {deleting ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Builder */}
                <div className="min-h-[625px] bg-slate-50/80 px-4 py-6 md:px-8 md:py-9">
                  <div className="mx-auto max-w-2xl">

                    {/* Trigger */}
                    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="absolute inset-y-0 left-0 w-1 bg-slate-900" />

                      <div className="p-5 md:p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
                            <Zap size={21} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Trigger
                              </span>

                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                                Step 0
                              </span>
                            </div>

                            <div className="mt-1 text-base font-bold text-slate-900">
                              {triggerLabel(
                                selectedWorkflow.trigger_type
                              )}
                            </div>

                            <p className="mt-1 text-xs leading-5 text-slate-500">
                              {triggerDescription(
                                selectedWorkflow.trigger_type
                              )}
                            </p>
                          </div>

                          <button
                            onClick={() =>
                              openEditWorkflow(selectedWorkflow)
                            }
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            title="Edit trigger"
                          >
                            <Settings2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Connector */}
                    <div className="flex justify-center py-1">
                      <div className="relative h-9 w-px bg-slate-200">
                        <ArrowDown
                          size={14}
                          className="absolute left-1/2 top-5 -translate-x-1/2 text-slate-300"
                        />
                      </div>
                    </div>

                    {/* Steps */}
                    {selectedSteps.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                          <Plus size={21} />
                        </div>

                        <h3 className="mt-4 text-sm font-bold text-slate-800">
                          Your workflow is ready
                        </h3>

                        <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-400">
                          Add your first action to tell Trackpr what
                          should happen after this trigger fires.
                        </p>

                        <button
                          onClick={openCreateStep}
                          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                        >
                          <Plus size={15} />
                          Add First Action
                        </button>
                      </div>
                    ) : (
                      selectedSteps.map((step, index) => {
                        const Icon = iconForStep(step.step_type);

                        return (
                          <div key={step.id}>
                            <div className="group relative rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md">
                              <div className="p-5 md:p-6">
                                <div className="flex items-start gap-4">
                                  <div
                                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${stepAccentClasses(
                                      step.step_type
                                    )}`}
                                  >
                                    <Icon size={19} />
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        Step {index + 1}
                                      </span>

                                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                        {stepTypeLabel(
                                          step.step_type
                                        )}
                                      </span>
                                    </div>

                                    <div className="mt-2 text-base font-bold text-slate-900">
                                      {step.name}
                                    </div>

                                    {step.step_type === "wait" && (
                                      <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700">
                                        <Clock3 size={13} />
                                        Wait{" "}
                                        {String(
                                          step.configuration?.amount ?? 1
                                        )}{" "}
                                        {String(
                                          step.configuration?.unit ?? "hours"
                                        )}
                                      </div>
                                    )}

                                    {step.step_type === "condition" && (
                                      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
                                        <span className="font-semibold text-slate-700">
                                          {String(
                                            step.configuration?.field ??
                                              "lead.status"
                                          )}
                                        </span>{" "}
                                        {String(
                                          step.configuration?.operator ??
                                            "equals"
                                        )}{" "}
                                        <span className="font-semibold text-slate-700">
                                          {String(
                                            step.configuration?.value ?? ""
                                          ) || "—"}
                                        </span>
                                      </div>
                                    )}

                                    {step.step_type === "send_sms" &&
                                      String(
                                        step.configuration?.message ?? ""
                                      ).trim() && (
                                        <div className="mt-3 line-clamp-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-500">
                                          {String(
                                            step.configuration?.message
                                          )}
                                        </div>
                                      )}

                                    {step.step_type === "send_email" &&
                                      String(
                                        step.configuration?.subject ?? ""
                                      ).trim() && (
                                        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
                                          <span className="font-semibold text-slate-700">
                                            Subject:
                                          </span>{" "}
                                          {String(
                                            step.configuration?.subject
                                          )}
                                        </div>
                                      )}

                                    {step.step_type === "webhook" &&
                                      String(
                                        step.configuration?.url ?? ""
                                      ).trim() && (
                                        <div className="mt-3 truncate rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-[11px] text-slate-500">
                                          {String(
                                            step.configuration?.method ??
                                              "POST"
                                          )}{" "}
                                          ·{" "}
                                          {String(
                                            step.configuration?.url
                                          )}
                                        </div>
                                      )}

                                    {step.step_type === "create_task" &&
                                      String(
                                        step.configuration?.title ?? ""
                                      ).trim() && (
                                        <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700">
                                          <Check size={13} />
                                          {String(
                                            step.configuration?.title
                                          )}
                                        </div>
                                      )}
                                  </div>

                                  <div className="flex shrink-0 items-center gap-0.5 opacity-70 transition group-hover:opacity-100">
                                    <button
                                      onClick={() =>
                                        moveStep(step, -1)
                                      }
                                      disabled={index === 0}
                                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-20"
                                      title="Move up"
                                    >
                                      ↑
                                    </button>

                                    <button
                                      onClick={() =>
                                        moveStep(step, 1)
                                      }
                                      disabled={
                                        index ===
                                        selectedSteps.length - 1
                                      }
                                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-20"
                                      title="Move down"
                                    >
                                      ↓
                                    </button>

                                    <button
                                      onClick={() =>
                                        openEditStep(step)
                                      }
                                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                      title="Edit step"
                                    >
                                      <Pencil size={14} />
                                    </button>

                                    <button
                                      onClick={() =>
                                        deleteStep(step)
                                      }
                                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                                      title="Delete step"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {index <
                              selectedSteps.length - 1 && (
                              <div className="flex justify-center py-1">
                                <div className="relative h-9 w-px bg-slate-200">
                                  <ArrowDown
                                    size={14}
                                    className="absolute left-1/2 top-5 -translate-x-1/2 text-slate-300"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}

                    {/* Add step */}
                    <div className="mt-3">
                      <button
                        onClick={openCreateStep}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-white px-5 py-4.5 text-sm font-semibold text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
                      >
                        <Plus size={18} />
                        Add Workflow Step
                      </button>
                    </div>

                    {/* End */}
                    <div className="mt-5 flex justify-center">
                      <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-500 shadow-sm">
                        <Check size={13} />
                        Workflow Complete
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>

        {error && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100">
              <X size={12} />
            </div>

            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Workflow modal */}
      {isWorkflowModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeWorkflowModal();
            }
          }}
        >
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
                    <Zap size={15} />
                  </div>

                  <h2 className="text-lg font-bold text-slate-900">
                    {editingWorkflow
                      ? "Edit Workflow"
                      : "Create Workflow"}
                  </h2>
                </div>

                <p className="mt-1 pl-10 text-xs text-slate-500">
                  Define when this automation should start.
                </p>
              </div>

              <button
                onClick={closeWorkflowModal}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={saveWorkflow} className="space-y-6 p-5">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <InputField
                label="Workflow Name"
                value={workflowName}
                onChange={setWorkflowName}
                placeholder="New Lead Follow-Up"
              />

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Description
                </label>

                <textarea
                  value={workflowDescription}
                  onChange={(event) =>
                    setWorkflowDescription(event.target.value)
                  }
                  rows={3}
                  placeholder="Automatically follow up with new leads..."
                  className="w-full resize-none rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>

              <div>
                <div className="mb-3">
                  <label className="block text-sm font-semibold text-slate-700">
                    Trigger
                  </label>

                  <p className="mt-0.5 text-xs text-slate-400">
                    The event that starts this workflow.
                  </p>
                </div>

                <div className="grid gap-2">
                  {TRIGGERS.map((trigger) => {
                    const Icon = trigger.icon;
                    const selected =
                      workflowTrigger === trigger.value;

                    return (
                      <button
                        key={trigger.value}
                        type="button"
                        onClick={() =>
                          setWorkflowTrigger(trigger.value)
                        }
                        className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                          selected
                            ? "border-slate-900 bg-slate-50 shadow-sm"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                            selected
                              ? "bg-slate-900 text-white"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          <Icon size={16} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-slate-800">
                            {trigger.label}
                          </div>

                          <div className="mt-0.5 text-xs leading-4 text-slate-500">
                            {trigger.description}
                          </div>
                        </div>

                        {selected && (
                          <Check
                            size={17}
                            className="shrink-0 text-slate-900"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                <button
                  type="button"
                  onClick={closeWorkflowModal}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingWorkflow
                    ? "Save Changes"
                    : "Create Workflow"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Step modal */}
      {isStepModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeStepModal();
            }
          }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
                    {(() => {
                      const Icon = iconForStep(stepType);
                      return <Icon size={15} />;
                    })()}
                  </div>

                  <h2 className="text-lg font-bold text-slate-900">
                    {editingStep
                      ? "Edit Workflow Step"
                      : "Add Workflow Step"}
                  </h2>
                </div>

                <p className="mt-1 pl-10 text-xs text-slate-500">
                  Define what happens when the workflow reaches this step.
                </p>
              </div>

              <button
                onClick={closeStepModal}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={saveStep} className="space-y-6 p-5">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <InputField
                label="Step Name"
                value={stepName}
                onChange={setStepName}
                placeholder="Send initial SMS"
              />

              <div>
                <div className="mb-3">
                  <label className="block text-sm font-semibold text-slate-700">
                    Action
                  </label>

                  <p className="mt-0.5 text-xs text-slate-400">
                    Choose what this step should do.
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {STEP_TYPES.map((type) => {
                    const Icon = iconForStep(type.value);
                    const selected = stepType === type.value;

                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => {
                          setStepType(type.value);
                          setStepConfig(
                            stepConfiguration(type.value)
                          );
                        }}
                        className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                          selected
                            ? "border-slate-900 bg-slate-50 shadow-sm"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                            selected
                              ? "bg-slate-900 text-white"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          <Icon size={16} />
                        </div>

                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-800">
                            {type.label}
                          </div>

                          <div className="mt-0.5 text-xs leading-4 text-slate-500">
                            {type.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm ring-1 ring-slate-200">
                    <Settings2 size={15} />
                  </div>

                  <div>
                    <span className="text-sm font-bold text-slate-800">
                      Configuration
                    </span>

                    <p className="text-xs text-slate-400">
                      Configure this action.
                    </p>
                  </div>
                </div>

                {renderStepConfiguration()}
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                <button
                  type="button"
                  onClick={closeStepModal}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingStep
                    ? "Save Step"
                    : "Add Step"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}