"use client";

import { useMemo, useState } from "react";
import {
  Bot,
  Brain,
  Check,
  ChevronDown,
  Clock3,
  Edit3,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Pause,
  Phone,
  Play,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";

type Agent = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  status: "draft" | "active" | "paused";
  purpose: string | null;
  system_prompt: string | null;
  tone:
    | "professional"
    | "friendly"
    | "casual"
    | "direct"
    | "empathetic"
    | null;
  business_knowledge: string | null;
  services: string | null;
  qualification_questions: string | null;
  operating_hours: string | null;
  escalation_rules: string | null;
  channels: string[];
  model: string | null;
  temperature: number | null;
  total_conversations: number;
  total_messages: number;
  last_active_at: string | null;
  created_at: string;
  updated_at: string;
};

type Props = {
  organizationId: string;
  initialAgents: Agent[];
};

type AgentForm = {
  name: string;
  description: string;
  purpose: string;
  system_prompt: string;
  tone:
    | "professional"
    | "friendly"
    | "casual"
    | "direct"
    | "empathetic";
  business_knowledge: string;
  services: string;
  qualification_questions: string;
  operating_hours: string;
  escalation_rules: string;
  channels: string[];
  model: string;
  temperature: number;
};

const EMPTY_FORM: AgentForm = {
  name: "",
  description: "",
  purpose: "",
  system_prompt: "",
  tone: "professional",
  business_knowledge: "",
  services: "",
  qualification_questions: "",
  operating_hours: "",
  escalation_rules: "",
  channels: ["sms"],
  model: "default",
  temperature: 0.3,
};

export default function AIAgentsClient({
  organizationId,
  initialAgents,
}: Props) {
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [showMenu, setShowMenu] = useState<string | null>(null);

  const [form, setForm] = useState<AgentForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const filteredAgents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return agents.filter((agent) => {
      const matchesSearch =
        !query ||
        agent.name.toLowerCase().includes(query) ||
        agent.description?.toLowerCase().includes(query) ||
        agent.purpose?.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" || agent.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [agents, search, statusFilter]);

  const activeCount = agents.filter((a) => a.status === "active").length;
  const pausedCount = agents.filter((a) => a.status === "paused").length;
  const draftCount = agents.filter((a) => a.status === "draft").length;

  const totalConversations = agents.reduce(
    (sum, agent) => sum + (agent.total_conversations || 0),
    0
  );

  const totalMessages = agents.reduce(
    (sum, agent) => sum + (agent.total_messages || 0),
    0
  );

  function openCreate() {
    setEditingAgent(null);
    setForm({
      ...EMPTY_FORM,
      channels: ["sms"],
    });
    setShowMenu(null);
    setShowModal(true);
  }

  function openEdit(agent: Agent) {
    setEditingAgent(agent);

    setForm({
      name: agent.name ?? "",
      description: agent.description ?? "",
      purpose: agent.purpose ?? "",
      system_prompt: agent.system_prompt ?? "",
      tone: agent.tone ?? "professional",
      business_knowledge: agent.business_knowledge ?? "",
      services: agent.services ?? "",
      qualification_questions: agent.qualification_questions ?? "",
      operating_hours: agent.operating_hours ?? "",
      escalation_rules: agent.escalation_rules ?? "",
      channels: agent.channels?.length ? agent.channels : ["sms"],
      model: agent.model ?? "default",
      temperature: agent.temperature ?? 0.3,
    });

    setShowMenu(null);
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    setEditingAgent(null);
  }

  function updateForm<K extends keyof AgentForm>(
    key: K,
    value: AgentForm[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function toggleChannel(channel: string) {
    setForm((prev) => {
      const exists = prev.channels.includes(channel);

      if (exists) {
        const next = prev.channels.filter((item) => item !== channel);

        return {
          ...prev,
          channels: next.length ? next : [channel],
        };
      }

      return {
        ...prev,
        channels: [...prev.channels, channel],
      };
    });
  }

  async function saveAgent() {
    if (!form.name.trim()) {
      alert("Agent name is required.");
      return;
    }

    setSaving(true);

    try {
      if (editingAgent) {
        const response = await fetch("/api/ai-agents", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: editingAgent.id,
            ...form,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to update agent.");
        }

        setAgents((current) =>
          current.map((agent) =>
            agent.id === editingAgent.id ? result.agent : agent
          )
        );
      } else {
        const response = await fetch("/api/ai-agents", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            organization_id: organizationId,
            ...form,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to create agent.");
        }

        setAgents((current) => [result.agent, ...current]);
      }

      setShowModal(false);
      setEditingAgent(null);
    } catch (error: unknown) {
      alert(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(agent: Agent) {
    const nextStatus =
      agent.status === "active" ? "paused" : "active";

    try {
      const response = await fetch("/api/ai-agents", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: agent.id,
          status: nextStatus,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update status.");
      }

      setAgents((current) =>
        current.map((item) =>
          item.id === agent.id ? result.agent : item
        )
      );

      setShowMenu(null);
    } catch (error: unknown) {
      alert(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    }
  }

  async function deleteAgent(agent: Agent) {
    const confirmed = window.confirm(
      `Delete "${agent.name}"?\n\nThis cannot be undone.`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `/api/ai-agents?id=${encodeURIComponent(agent.id)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete agent.");
      }

      setAgents((current) =>
        current.filter((item) => item.id !== agent.id)
      );

      setShowMenu(null);
    } catch (error: unknown) {
      alert(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    }
  }

  function statusLabel(status: Agent["status"]) {
    if (status === "active") return "Active";
    if (status === "paused") return "Paused";
    return "Draft";
  }

  function statusClass(status: Agent["status"]) {
    if (status === "active") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    if (status === "paused") {
      return "border-amber-200 bg-amber-50 text-amber-700";
    }

    return "border-slate-200 bg-slate-100 text-slate-600";
  }

  function formatDate(date: string | null) {
    if (!date) return "Never";

    return new Date(date).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatNumber(value: number) {
    return value.toLocaleString();
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-slate-900">
      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        {/* HEADER */}
        <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-violet-700">
              <Sparkles size={14} />
              AI Automation
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              AI Agents
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              Build intelligent agents that qualify leads, answer
              customer questions, and hand important conversations
              to your team.
            </p>
          </div>

          <button
            onClick={openCreate}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.99]"
          >
            <Plus size={18} />
            Create AI Agent
          </button>
        </div>

        {/* METRICS */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={<Bot size={19} />}
            label="Total Agents"
            value={agents.length}
            helper={
              agents.length === 1
                ? "1 configured agent"
                : `${agents.length} configured agents`
            }
          />

          <MetricCard
            icon={<Play size={19} />}
            label="Active Agents"
            value={activeCount}
            helper={
              activeCount
                ? `${activeCount} currently active`
                : "No active agents"
            }
            iconClass="bg-emerald-50 text-emerald-600"
          />

          <MetricCard
            icon={<Pause size={19} />}
            label="Paused / Draft"
            value={pausedCount + draftCount}
            helper={`${pausedCount} paused · ${draftCount} draft`}
            iconClass="bg-amber-50 text-amber-600"
          />

          <MetricCard
            icon={<MessageSquare size={19} />}
            label="Conversations"
            value={totalConversations}
            helper={`${formatNumber(totalMessages)} messages`}
            iconClass="bg-violet-50 text-violet-600"
          />
        </div>

        {/* TOOLBAR */}
        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-md">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search agents..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-9 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 sm:w-auto"
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="draft">Draft</option>
                </select>

                <ChevronDown
                  size={15}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>

              <div className="hidden h-6 w-px bg-slate-200 sm:block" />

              <p className="text-xs font-medium text-slate-400">
                {filteredAgents.length}{" "}
                {filteredAgents.length === 1 ? "agent" : "agents"} shown
              </p>
            </div>
          </div>
        </div>

        {/* AGENTS */}
        {filteredAgents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
              {agents.length === 0 ? (
                <Brain size={28} />
              ) : (
                <Search size={27} />
              )}
            </div>

            <h2 className="text-xl font-bold text-slate-950">
              {agents.length === 0
                ? "Create your first AI agent"
                : "No agents found"}
            </h2>

            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
              {agents.length === 0
                ? "Create an agent that can qualify inbound leads, answer common questions, collect important information, and route high-value conversations to your team."
                : "Try a different search term or change the status filter to find the agent you're looking for."}
            </p>

            {agents.length === 0 && (
              <button
                onClick={openCreate}
                className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <Plus size={17} />
                Create AI Agent
              </button>
            )}

            {agents.length > 0 && (search || statusFilter !== "all") && (
              <button
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
                className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {filteredAgents.map((agent) => (
              <div
                key={agent.id}
                className="group relative overflow-visible rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-[1px] hover:border-slate-300 hover:shadow-md sm:p-6"
              >
                {/* CARD HEADER */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
                      <Bot size={23} />

                      {agent.status === "active" && (
                        <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-base font-bold text-slate-950">
                          {agent.name}
                        </h2>

                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${statusClass(
                            agent.status
                          )}`}
                        >
                          {statusLabel(agent.status)}
                        </span>
                      </div>

                      <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">
                        {agent.description ||
                          agent.purpose ||
                          "No description provided."}
                      </p>
                    </div>
                  </div>

                  {/* MENU */}
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      aria-label={`Actions for ${agent.name}`}
                      onClick={() =>
                        setShowMenu(
                          showMenu === agent.id ? null : agent.id
                        )
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    >
                      <MoreHorizontal size={19} />
                    </button>

                    {showMenu === agent.id && (
                      <div className="absolute right-0 top-10 z-30 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                        <MenuButton
                          icon={<Edit3 size={15} />}
                          label="Edit agent"
                          onClick={() => openEdit(agent)}
                        />

                        <MenuButton
                          icon={
                            agent.status === "active" ? (
                              <Pause size={15} />
                            ) : (
                              <Play size={15} />
                            )
                          }
                          label={
                            agent.status === "active"
                              ? "Pause agent"
                              : "Activate agent"
                          }
                          onClick={() => toggleStatus(agent)}
                        />

                        <div className="my-1 border-t border-slate-100" />

                        <MenuButton
                          danger
                          icon={<Trash2 size={15} />}
                          label="Delete agent"
                          onClick={() => deleteAgent(agent)}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* STATS */}
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <InfoStat
                    label="Conversations"
                    value={agent.total_conversations || 0}
                  />

                  <InfoStat
                    label="Messages"
                    value={agent.total_messages || 0}
                  />

                  <InfoStat
                    label="Tone"
                    value={agent.tone || "Professional"}
                    capitalize
                  />

                  <InfoStat
                    label="Last active"
                    value={formatDate(agent.last_active_at)}
                  />
                </div>

                {/* CONFIG SUMMARY */}
                <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                        Primary purpose
                      </p>

                      <p className="mt-1 line-clamp-1 text-sm font-medium text-slate-700">
                        {agent.purpose ||
                          agent.description ||
                          "Not configured"}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      {(agent.channels || []).map((channel) => (
                        <ChannelBadge
                          key={channel}
                          channel={channel}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* FOOTER */}
                <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Clock3 size={14} />

                    <span>
                      Updated {formatDate(agent.updated_at)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => openEdit(agent)}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <Settings2 size={14} />
                    Configure
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl">
            {/* MODAL HEADER */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <Bot size={19} />
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-lg font-bold text-slate-950">
                    {editingAgent
                      ? "Configure AI Agent"
                      : "Create AI Agent"}
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Define how your agent behaves, communicates, and
                    handles leads.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={19} />
              </button>
            </div>

            {/* MODAL BODY */}
            <div className="overflow-y-auto bg-[#fafbfc] px-5 py-6 sm:px-6">
              <div className="mx-auto max-w-4xl space-y-6">
                {/* BASIC */}
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <SectionTitle
                    icon={<Settings2 size={16} />}
                    title="Basic information"
                    description="Give your agent a clear identity and purpose."
                  />

                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Agent name" required>
                      <input
                        value={form.name}
                        onChange={(e) =>
                          updateForm("name", e.target.value)
                        }
                        placeholder="e.g. Lead Qualification Agent"
                        className="input"
                      />
                    </Field>

                    <Field label="Tone">
                      <select
                        value={form.tone}
                        onChange={(e) =>
                          updateForm(
                            "tone",
                            e.target.value as AgentForm["tone"]
                          )
                        }
                        className="input"
                      >
                        <option value="professional">
                          Professional
                        </option>
                        <option value="friendly">Friendly</option>
                        <option value="casual">Casual</option>
                        <option value="direct">Direct</option>
                        <option value="empathetic">
                          Empathetic
                        </option>
                      </select>
                    </Field>

                    <Field label="Description" full>
                      <input
                        value={form.description}
                        onChange={(e) =>
                          updateForm("description", e.target.value)
                        }
                        placeholder="What does this agent do?"
                        className="input"
                      />
                    </Field>

                    <Field label="Primary purpose" full>
                      <textarea
                        value={form.purpose}
                        onChange={(e) =>
                          updateForm("purpose", e.target.value)
                        }
                        placeholder="Example: Qualify inbound contractor leads and determine whether they need an estimate."
                        className="textarea"
                        rows={3}
                      />
                    </Field>
                  </div>
                </section>

                {/* KNOWLEDGE */}
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <SectionTitle
                    icon={<Brain size={16} />}
                    title="Business knowledge"
                    description="Give the agent the information it needs to answer accurately."
                  />

                  <div className="mt-5 space-y-4">
                    <Field label="Services">
                      <textarea
                        value={form.services}
                        onChange={(e) =>
                          updateForm("services", e.target.value)
                        }
                        placeholder="List the services this agent should know about..."
                        className="textarea"
                        rows={4}
                      />
                    </Field>

                    <Field label="Business knowledge">
                      <textarea
                        value={form.business_knowledge}
                        onChange={(e) =>
                          updateForm(
                            "business_knowledge",
                            e.target.value
                          )
                        }
                        placeholder="Company information, service areas, pricing guidance, policies, FAQs, financing information, etc."
                        className="textarea"
                        rows={5}
                      />
                    </Field>

                    <Field label="Operating hours">
                      <textarea
                        value={form.operating_hours}
                        onChange={(e) =>
                          updateForm(
                            "operating_hours",
                            e.target.value
                          )
                        }
                        placeholder="Example: Mon-Fri 8am-6pm, Sat 9am-2pm, Sun closed."
                        className="textarea"
                        rows={3}
                      />
                    </Field>
                  </div>
                </section>

                {/* QUALIFICATION */}
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <SectionTitle
                    icon={<Users size={16} />}
                    title="Lead qualification"
                    description="Control what information the agent collects before handing off a lead."
                  />

                  <div className="mt-5 space-y-4">
                    <Field label="Qualification questions">
                      <textarea
                        value={form.qualification_questions}
                        onChange={(e) =>
                          updateForm(
                            "qualification_questions",
                            e.target.value
                          )
                        }
                        placeholder={`Example:
1. What service do you need?
2. What is the property address?
3. When are you looking to have the work completed?
4. Is this an emergency?`}
                        className="textarea"
                        rows={6}
                      />
                    </Field>

                    <Field label="Escalation / human handoff rules">
                      <textarea
                        value={form.escalation_rules}
                        onChange={(e) =>
                          updateForm(
                            "escalation_rules",
                            e.target.value
                          )
                        }
                        placeholder="When should the agent stop and notify a human? Example: emergency calls, angry customers, pricing disputes, high-value opportunities."
                        className="textarea"
                        rows={5}
                      />
                    </Field>
                  </div>
                </section>

                {/* BEHAVIOR */}
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <SectionTitle
                    icon={<Sparkles size={16} />}
                    title="Agent behavior"
                    description="Define the instructions and model settings that control responses."
                  />

                  <div className="mt-5 space-y-4">
                    <Field label="System instructions">
                      <textarea
                        value={form.system_prompt}
                        onChange={(e) =>
                          updateForm(
                            "system_prompt",
                            e.target.value
                          )
                        }
                        placeholder="Give the agent additional instructions about how it should behave, what it should never do, and how it should communicate."
                        className="textarea"
                        rows={8}
                      />
                    </Field>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label="Model">
                        <select
                          value={form.model}
                          onChange={(e) =>
                            updateForm("model", e.target.value)
                          }
                          className="input"
                        >
                          <option value="default">Default</option>
                          <option value="fast">Fast</option>
                          <option value="balanced">
                            Balanced
                          </option>
                          <option value="advanced">
                            Advanced
                          </option>
                        </select>
                      </Field>

                      <Field label="Temperature">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-500">
                              Response creativity
                            </span>

                            <span className="rounded-lg bg-white px-2 py-1 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-200">
                              {Number(form.temperature).toFixed(1)}
                            </span>
                          </div>

                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={form.temperature}
                            onChange={(e) =>
                              updateForm(
                                "temperature",
                                Number(e.target.value)
                              )
                            }
                            className="w-full accent-slate-900"
                          />

                          <div className="mt-1 flex justify-between text-[10px] font-medium text-slate-400">
                            <span>Consistent</span>
                            <span>Creative</span>
                          </div>
                        </div>
                      </Field>
                    </div>
                  </div>
                </section>

                {/* CHANNELS */}
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <SectionTitle
                    icon={<MessageSquare size={16} />}
                    title="Channels"
                    description="Choose where this agent can operate."
                  />

                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <ChannelButton
                      icon={<MessageSquare size={17} />}
                      label="SMS"
                      description="Text conversations"
                      selected={form.channels.includes("sms")}
                      onClick={() => toggleChannel("sms")}
                    />

                    <ChannelButton
                      icon={<Mail size={17} />}
                      label="Email"
                      description="Email conversations"
                      selected={form.channels.includes("email")}
                      onClick={() => toggleChannel("email")}
                    />

                    <ChannelButton
                      icon={<Phone size={17} />}
                      label="Phone"
                      description="Voice conversations"
                      selected={form.channels.includes("phone")}
                      onClick={() => toggleChannel("phone")}
                    />
                  </div>
                </section>
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Clock3 size={14} />
                <span>
                  Agent configuration can be connected to workflows.
                </span>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={saveAgent}
                  disabled={saving}
                  className="inline-flex h-10 min-w-[135px] items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      {editingAgent
                        ? "Save Changes"
                        : "Create Agent"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .input {
          width: 100%;
          height: 42px;
          border-radius: 12px;
          border: 1px solid rgb(226 232 240);
          background: white;
          padding: 0 12px;
          font-size: 14px;
          color: rgb(15 23 42);
          outline: none;
          transition:
            border-color 0.15s ease,
            box-shadow 0.15s ease,
            background 0.15s ease;
        }

        .input::placeholder {
          color: rgb(148 163 184);
        }

        .input:focus {
          border-color: rgb(148 163 184);
          background: white;
          box-shadow: 0 0 0 3px rgb(241 245 249);
        }

        .textarea {
          width: 100%;
          border-radius: 12px;
          border: 1px solid rgb(226 232 240);
          background: white;
          padding: 11px 12px;
          font-size: 14px;
          line-height: 1.5;
          color: rgb(15 23 42);
          outline: none;
          resize: vertical;
          transition:
            border-color 0.15s ease,
            box-shadow 0.15s ease,
            background 0.15s ease;
        }

        .textarea::placeholder {
          color: rgb(148 163 184);
        }

        .textarea:focus {
          border-color: rgb(148 163 184);
          background: white;
          box-shadow: 0 0 0 3px rgb(241 245 249);
        }

        input[type="range"] {
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  helper,
  iconClass = "bg-slate-100 text-slate-700",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  helper: string;
  iconClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div
        className={`mb-4 flex h-9 w-9 items-center justify-center rounded-xl ${iconClass}`}
      >
        {icon}
      </div>

      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
        {value.toLocaleString()}
      </p>

      <p className="mt-1 text-xs text-slate-400">{helper}</p>
    </div>
  );
}

function InfoStat({
  label,
  value,
  capitalize = false,
}: {
  label: string;
  value: string | number;
  capitalize?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
        {label}
      </p>

      <p
        className={`mt-1 truncate text-sm font-semibold text-slate-800 ${
          capitalize ? "capitalize" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function SectionTitle({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        {icon}
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-900">
          {title}
        </h3>

        <p className="mt-0.5 text-xs leading-5 text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  full,
  children,
}: {
  label: string;
  required?: boolean;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="mb-1.5 block text-xs font-bold text-slate-600">
        {label}

        {required && (
          <span className="ml-1 text-rose-500">*</span>
        )}
      </label>

      {children}
    </div>
  );
}

function ChannelButton({
  icon,
  label,
  description,
  selected,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition ${
        selected
          ? "border-violet-300 bg-violet-50 ring-1 ring-violet-200"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${
              selected
                ? "bg-white text-violet-600 shadow-sm"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {icon}
          </div>

          <span
            className={`text-sm font-bold ${
              selected ? "text-violet-700" : "text-slate-800"
            }`}
          >
            {label}
          </span>
        </div>

        {selected && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-white">
            <Check size={12} />
          </div>
        )}
      </div>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </button>
  );
}

function ChannelBadge({ channel }: { channel: string }) {
  const normalized = channel.toLowerCase();

  let icon: React.ReactNode = <MessageSquare size={12} />;

  if (normalized === "email") {
    icon = <Mail size={12} />;
  }

  if (normalized === "phone") {
    icon = <Phone size={12} />;
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
      {icon}
      {channel}
    </span>
  );
}

function MenuButton({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-semibold transition ${
        danger
          ? "text-rose-600 hover:bg-rose-50"
          : "text-slate-700 hover:bg-slate-100"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}