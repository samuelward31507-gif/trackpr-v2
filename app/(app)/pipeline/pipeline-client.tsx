"use client";

import Link from "next/link";
import {
  CalendarClock,
  ChevronRight,
  CircleDollarSign,
  Plus,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PipelineLead } from "./page";

type PipelineStage =
  | "new"
  | "contacted"
  | "qualified"
  | "won"
  | "lost";

type PipelineClientProps = {
  initialLeads: PipelineLead[];
};

const pipelineStages: {
  id: PipelineStage;
  label: string;
  description: string;
}[] = [
  {
    id: "new",
    label: "New",
    description: "Recently added leads",
  },
  {
    id: "contacted",
    label: "Contacted",
    description: "Initial contact made",
  },
  {
    id: "qualified",
    label: "Qualified",
    description: "Strong opportunities",
  },
  {
    id: "won",
    label: "Won",
    description: "Successfully converted",
  },
  {
    id: "lost",
    label: "Lost",
    description: "No longer active",
  },
];

function getLeadName(lead: PipelineLead) {
  return (
    [lead.first_name, lead.last_name]
      .filter(Boolean)
      .join(" ") || "Unnamed Lead"
  );
}

function getInitials(lead: PipelineLead) {
  return getLeadName(lead)
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

function formatFollowUp(date: string | null) {
  if (!date) {
    return "No follow-up";
  }

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getStageAccent(stage: PipelineStage) {
  switch (stage) {
    case "new":
      return "bg-blue-500";

    case "contacted":
      return "bg-violet-500";

    case "qualified":
      return "bg-emerald-500";

    case "won":
      return "bg-green-500";

    case "lost":
      return "bg-red-500";
  }
}

function getStageBadge(stage: PipelineStage) {
  switch (stage) {
    case "new":
      return "bg-blue-50 text-blue-700";

    case "contacted":
      return "bg-violet-50 text-violet-700";

    case "qualified":
      return "bg-emerald-50 text-emerald-700";

    case "won":
      return "bg-green-50 text-green-700";

    case "lost":
      return "bg-red-50 text-red-700";
  }
}

export default function PipelineClient({
  initialLeads,
}: PipelineClientProps) {
  const [leads, setLeads] =
    useState<PipelineLead[]>(initialLeads);

  const [updatingLeadId, setUpdatingLeadId] =
    useState<string | null>(null);

  const [draggedLead, setDraggedLead] =
    useState<PipelineLead | null>(null);

  const [dragOverStage, setDragOverStage] =
    useState<PipelineStage | null>(null);

  const supabase = createClient();

  const stats = useMemo(() => {
    const activeLeads = leads.filter(
      (lead) =>
        lead.status !== "won" &&
        lead.status !== "lost" &&
        lead.status !== "unqualified"
    );

    const wonLeads = leads.filter(
      (lead) => lead.status === "won"
    );

    const overdueFollowUps = leads.filter((lead) => {
      if (!lead.next_follow_up_at) return false;

      return (
        new Date(lead.next_follow_up_at) <
        new Date()
      );
    });

    return {
      total: leads.length,
      active: activeLeads.length,
      won: wonLeads.length,
      overdue: overdueFollowUps.length,
    };
  }, [leads]);

  async function moveLead(
    lead: PipelineLead,
    newStatus: PipelineStage
  ) {
    if (lead.status === newStatus) return;

    const previousStatus = lead.status;

    setUpdatingLeadId(lead.id);

    setLeads((currentLeads) =>
      currentLeads.map((currentLead) =>
        currentLead.id === lead.id
          ? {
              ...currentLead,
              status: newStatus,
            }
          : currentLead
      )
    );

    /*
     * Update the lead status.
     */
    const { error: updateError } =
      await supabase
        .from("leads")
        .update({
          status: newStatus,
        })
        .eq("id", lead.id);

    if (updateError) {
      console.error(
        "Error updating lead status:",
        updateError
      );

      setLeads((currentLeads) =>
        currentLeads.map((currentLead) =>
          currentLead.id === lead.id
            ? {
                ...currentLead,
                status: previousStatus,
              }
            : currentLead
        )
      );

      setUpdatingLeadId(null);

      alert(
        "We couldn't update this lead. Please try again."
      );

      return;
    }

    /*
     * Record status-change activity.
     */
    const { error: activityError } =
      await supabase
        .from("lead_activities")
        .insert({
          lead_id: lead.id,
          activity_type:
            "status_changed",
          title: `Lead moved to ${
            newStatus
              .charAt(0)
              .toUpperCase() +
            newStatus.slice(1)
          }`,
          description: `Status changed from ${
            previousStatus
              .charAt(0)
              .toUpperCase() +
            previousStatus.slice(1)
          } to ${
            newStatus
              .charAt(0)
              .toUpperCase() +
            newStatus.slice(1)
          } from the pipeline.`,
        });

    if (activityError) {
      console.error(
        "Error creating lead activity:",
        activityError
      );
    }

    /*
     * LOST LEAD REACTIVATION AUTOMATION
     *
     * Only trigger when a lead actually
     * moves INTO the Lost stage.
     */
    if (
      previousStatus !== "lost" &&
      newStatus === "lost"
    ) {
      try {
        console.log(
          "LOST LEAD REACTIVATION STARTED FROM PIPELINE",
          {
            leadId: lead.id,
            organizationId:
              lead.organization_id,
          }
        );

        const response =
          await fetch(
            "/api/automation/lost-lead",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                lead_id:
                  lead.id,

                organization_id:
                  lead.organization_id,
              }),
            }
          );

        const responseText =
          await response.text();

        let responseData: any =
          null;

        try {
          responseData =
            responseText
              ? JSON.parse(
                  responseText
                )
              : null;
        } catch {
          responseData =
            responseText;
        }

        console.log(
          "LOST LEAD REACTIVATION RESPONSE FROM PIPELINE",
          {
            status:
              response.status,

            data:
              responseData,
          }
        );

        if (!response.ok) {
          console.error(
            "Lost lead reactivation failed from pipeline:",
            responseData
          );
        } else {
          console.log(
            "Lost lead reactivation started successfully from pipeline:",
            responseData
          );
        }
      } catch (automationError) {
        /*
         * Do not undo the CRM status change
         * if the automation request fails.
         */
        console.error(
          "Lost lead reactivation request failed from pipeline:",
          automationError
        );
      }
    }

    setUpdatingLeadId(null);
  }

  function handleDragStart(
    lead: PipelineLead
  ) {
    setDraggedLead(lead);
  }

  function handleDragEnd() {
    setDraggedLead(null);
    setDragOverStage(null);
  }

  function handleDragOver(
    event: React.DragEvent<HTMLDivElement>,
    stage: PipelineStage
  ) {
    event.preventDefault();
    setDragOverStage(stage);
  }

  async function handleDrop(
    event: React.DragEvent<HTMLDivElement>,
    stage: PipelineStage
  ) {
    event.preventDefault();

    if (!draggedLead) return;

    await moveLead(
      draggedLead,
      stage
    );

    setDraggedLead(null);
    setDragOverStage(null);
  }

  return (
    <div className="mx-auto max-w-[1600px]">
      <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <p className="text-sm font-semibold text-blue-600">
            SALES
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Pipeline
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            Track opportunities through your sales process and keep
            your team focused on the next best action.
          </p>
        </div>

        <Link
          href="/leads/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          Add Lead
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total leads"
          value={stats.total}
          description="All opportunities in your CRM"
          icon={
            <Users className="h-4 w-4 text-slate-400" />
          }
        />

        <StatCard
          label="Active pipeline"
          value={stats.active}
          description="Opportunities currently in progress"
          icon={
            <CircleDollarSign className="h-4 w-4 text-slate-400" />
          }
        />

        <StatCard
          label="Won"
          value={stats.won}
          description="Successfully converted opportunities"
          valueClassName="text-green-600"
          icon={
            <ChevronRight className="h-4 w-4 text-slate-400" />
          }
        />

        <StatCard
          label="Follow-ups overdue"
          value={stats.overdue}
          description="Opportunities requiring attention"
          attention={
            stats.overdue > 0
          }
          icon={
            <CalendarClock
              className={`h-4 w-4 ${
                stats.overdue > 0
                  ? "text-red-500"
                  : "text-slate-400"
              }`}
            />
          }
        />
      </div>

      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Opportunity Pipeline
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Move opportunities through your sales process.
            </p>
          </div>

          <p className="text-sm text-slate-400">
            {stats.active} active
          </p>
        </div>

        <div className="overflow-x-auto pb-4">
          <div className="grid min-w-[1350px] grid-cols-5 gap-4">
            {pipelineStages.map(
              (stage) => {
                const stageLeads =
                  leads.filter(
                    (lead) =>
                      lead.status ===
                      stage.id
                  );

                return (
                  <div
                    key={stage.id}
                    onDragOver={(event) =>
                      handleDragOver(
                        event,
                        stage.id
                      )
                    }
                    onDragLeave={() => {
                      setDragOverStage(
                        null
                      );
                    }}
                    onDrop={(event) =>
                      handleDrop(
                        event,
                        stage.id
                      )
                    }
                    className={`flex min-h-[600px] flex-col rounded-2xl border transition ${
                      dragOverStage ===
                      stage.id
                        ? "border-blue-400 bg-blue-50"
                        : "border-slate-200 bg-slate-50/70"
                    }`}
                  >
                    <div className="border-b border-slate-200 bg-white px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-2.5 w-2.5 rounded-full ${getStageAccent(
                              stage.id
                            )}`}
                          />

                          <h3 className="text-sm font-semibold text-slate-900">
                            {stage.label}
                          </h3>
                        </div>

                        <span
                          className={`inline-flex min-w-6 items-center justify-center rounded-md px-1.5 py-0.5 text-xs font-semibold ${getStageBadge(
                            stage.id
                          )}`}
                        >
                          {
                            stageLeads.length
                          }
                        </span>
                      </div>

                      <p className="mt-2 text-xs text-slate-400">
                        {
                          stage.description
                        }
                      </p>
                    </div>

                    <div className="flex-1 space-y-3 p-3">
                      {stageLeads.length ===
                      0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-white/60 px-4 py-8 text-center">
                          <p className="text-xs text-slate-400">
                            No leads in this stage
                          </p>
                        </div>
                      ) : (
                        stageLeads.map(
                          (lead) => {
                            const contact =
                              lead.email ||
                              lead.phone ||
                              "No contact information";

                            return (
                              <div
                                key={
                                  lead.id
                                }
                                draggable
                                onDragStart={() =>
                                  handleDragStart(
                                    lead
                                  )
                                }
                                onDragEnd={
                                  handleDragEnd
                                }
                                className={`cursor-grab rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md active:cursor-grabbing ${
                                  draggedLead?.id ===
                                  lead.id
                                    ? "opacity-50"
                                    : ""
                                }`}
                              >
                                <Link
                                  href={`/leads/${lead.id}`}
                                  className="group block"
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-xs font-bold text-white">
                                      {getInitials(
                                        lead
                                      )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-blue-600">
                                        {getLeadName(
                                          lead
                                        )}
                                      </p>

                                      <p className="mt-1 truncate text-xs text-slate-400">
                                        {
                                          contact
                                        }
                                      </p>
                                    </div>
                                  </div>

                                  <div className="mt-4">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                      Service
                                    </p>

                                    <p className="mt-1 truncate text-sm font-medium text-slate-600">
                                      {lead.service_interest ||
                                        "Not specified"}
                                    </p>
                                  </div>

                                  <div className="mt-3">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                      Source
                                    </p>

                                    <p className="mt-1 truncate text-sm text-slate-600">
                                      {lead.source ||
                                        "Not specified"}
                                    </p>
                                  </div>

                                  <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
                                    <CalendarClock className="h-3.5 w-3.5 text-slate-400" />

                                    <p className="text-xs font-medium text-slate-500">
                                      {formatFollowUp(
                                        lead.next_follow_up_at
                                      )}
                                    </p>
                                  </div>
                                </Link>
                              </div>
                            );
                          }
                        )
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      </div>

      {leads.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Users className="mx-auto h-7 w-7 text-slate-400" />

          <h2 className="mt-4 text-lg font-semibold text-slate-950">
            Your pipeline is ready
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Add your first lead to start tracking opportunities
            through your sales process.
          </p>

          <Link
            href="/leads/new"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Add your first lead
          </Link>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  description,
  icon,
  attention = false,
  valueClassName = "text-slate-950",
}: {
  label: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  attention?: boolean;
  valueClassName?: string;
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
            : valueClassName
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