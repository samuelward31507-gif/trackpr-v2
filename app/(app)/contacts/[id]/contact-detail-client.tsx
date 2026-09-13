"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  DollarSign,
  Edit3,
  FileText,
  Mail,
  MessageSquare,
  Phone,
  Receipt,
  UserRound,
  Wrench,
  X,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Contact = {
  id: string;
  organization_id: string;
  lead_id: string | null;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type Lead = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  created_at: string;
} | null;

type Appointment = {
  id: string;
  lead_id: string | null;
  title: string | null;
  appointment_type: string | null;
  status: string | null;
  start_at: string;
  end_at: string;
  notes: string | null;
  created_at: string;
};

type Estimate = {
  id: string;
  lead_id: string | null;
  title: string | null;
  amount: number | null;
  status: string | null;
  estimate_date: string | null;
  expiration_date: string | null;
  notes: string | null;
  created_at: string;
};

type Job = {
  id: string;
  lead_id: string | null;
  estimate_id: string | null;
  title: string | null;
  amount: number | null;
  status: string | null;
  payment_status: string | null;
  start_date: string | null;
  due_date: string | null;
  completed_date: string | null;
  notes: string | null;
  created_at: string;
};

type Payment = {
  id: string;
  job_id: string | null;
  lead_id: string | null;
  amount: number | null;
  payment_date: string | null;
  payment_method: string | null;
  status: string | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
};

type Conversation = {
  id: string;
  lead_id: string | null;
  channel: string;
  status: string;
  subject: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
};

type Message = {
  id: string;
  conversation_id: string;
  lead_id: string | null;
  direction: string;
  channel: string;
  body: string;
  sender_name: string | null;
  sender_phone: string | null;
  sender_email: string | null;
  is_read: boolean;
  sent_at: string;
  created_at: string;
};

type Props = {
  organizationId: string;
  contact: Contact;
  lead: Lead;
  appointments: Appointment[];
  estimates: Estimate[];
  jobs: Job[];
  payments: Payment[];
  conversations: Conversation[];
  messages: Message[];
};

type EditForm = {
  first_name: string;
  last_name: string;
  company_name: string;
  phone: string;
  email: string;
  status: string;
  notes: string;
};

function contactName(contact: Contact) {
  return (
    [contact.first_name, contact.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() || "Unnamed Contact"
  );
}

function initials(contact: Contact) {
  const first = contact.first_name?.[0] ?? "";
  const last = contact.last_name?.[0] ?? "";

  const value = `${first}${last}`.toUpperCase();

  if (value) return value;

  if (contact.company_name) {
    return contact.company_name.slice(0, 2).toUpperCase();
  }

  return "??";
}

function money(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value ?? 0));
}

function date(value: string | null | undefined) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function dateTime(value: string | null | undefined) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function label(value: string | null | undefined) {
  if (!value) return "—";

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusClass(status: string | null | undefined) {
  const value = status?.toLowerCase();

  if (
    value === "completed" ||
    value === "won" ||
    value === "paid" ||
    value === "accepted" ||
    value === "active"
  ) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (
    value === "pending" ||
    value === "scheduled" ||
    value === "sent" ||
    value === "open"
  ) {
    return "bg-blue-50 text-blue-700";
  }

  if (
    value === "cancelled" ||
    value === "canceled" ||
    value === "lost" ||
    value === "failed"
  ) {
    return "bg-red-50 text-red-700";
  }

  return "bg-slate-100 text-slate-600";
}

export default function ContactDetailClient({
  organizationId,
  contact,
  lead,
  appointments,
  estimates,
  jobs,
  payments,
  conversations,
  messages,
}: Props) {
  const [creatingConversation, setCreatingConversation] =
    useState(false);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<EditForm>({
    first_name: contact.first_name ?? "",
    last_name: contact.last_name ?? "",
    company_name: contact.company_name ?? "",
    phone: contact.phone ?? "",
    email: contact.email ?? "",
    status: contact.status ?? "active",
    notes: contact.notes ?? "",
  });

  const totalEstimated = estimates.reduce(
    (sum, estimate) => sum + Number(estimate.amount ?? 0),
    0
  );

  const totalJobValue = jobs.reduce(
    (sum, job) => sum + Number(job.amount ?? 0),
    0
  );

  const totalPaid = payments
    .filter(
      (payment) =>
        !payment.status ||
        payment.status.toLowerCase() === "paid"
    )
    .reduce(
      (sum, payment) => sum + Number(payment.amount ?? 0),
      0
    );

  const latestConversation =
    conversations.length > 0 ? conversations[0] : null;

  const conversationMessages = latestConversation
    ? messages.filter(
        (message) =>
          message.conversation_id === latestConversation.id
      )
    : [];

  function openEdit() {
    setForm({
      first_name: contact.first_name ?? "",
      last_name: contact.last_name ?? "",
      company_name: contact.company_name ?? "",
      phone: contact.phone ?? "",
      email: contact.email ?? "",
      status: contact.status ?? "active",
      notes: contact.notes ?? "",
    });

    setEditing(true);
  }

  function closeEdit() {
    if (saving) return;
    setEditing(false);
  }

  function updateField(
    field: keyof EditForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function saveContact() {
    if (saving) return;

    setSaving(true);

    try {
      const response = await fetch("/api/contacts", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: contact.id,
          organization_id: organizationId,
          first_name: form.first_name.trim() || null,
          last_name: form.last_name.trim() || null,
          company_name: form.company_name.trim() || null,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          status: form.status,
          notes: form.notes.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Unable to update contact."
        );
      }

      /*
       * The server page owns the contact data, so refresh the
       * current route after the successful update. This ensures
       * the header, contact information, notes, and all related
       * sections immediately reflect the saved values.
       */
      setEditing(false);
      window.location.reload();
    } catch (error) {
      console.error("Error updating contact:", error);

      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to update contact."
      );
    } finally {
      setSaving(false);
    }
  }

  async function createConversation() {
    if (creatingConversation) return;

    setCreatingConversation(true);

    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("conversations")
        .insert({
          organization_id: organizationId,
          lead_id: contact.lead_id,
          channel: "sms",
          status: "open",
          subject: `Conversation with ${contactName(contact)}`,
          unread_count: 0,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Error creating conversation:", error);
        alert(error.message);
        return;
      }

      if (!data?.id) {
        alert(
          "Conversation was created, but no conversation ID was returned."
        );
        return;
      }

      window.location.href = `/conversations?conversation=${data.id}`;
    } catch (error) {
      console.error("Unexpected conversation error:", error);
      alert("Something went wrong creating the conversation.");
    } finally {
      setCreatingConversation(false);
    }
  }

  return (
    <>
      <div className="min-h-full bg-slate-50">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
          {/* Back */}
          <Link
            href="/contacts"
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back to contacts
          </Link>

          {/* Header */}
          <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="p-5 sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-lg font-bold text-slate-600">
                    {initials(contact)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="truncate text-2xl font-semibold tracking-tight text-slate-950">
                        {contactName(contact)}
                      </h1>

                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClass(
                          contact.status
                        )}`}
                      >
                        {label(contact.status)}
                      </span>
                    </div>

                    {contact.company_name && (
                      <p className="mt-1 text-sm text-slate-500">
                        {contact.company_name}
                      </p>
                    )}

                    <p className="mt-1 text-xs text-slate-400">
                      Customer since {date(contact.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={createConversation}
                    disabled={creatingConversation}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <MessageSquare size={15} />
                    {creatingConversation
                      ? "Creating..."
                      : "New Conversation"}
                  </button>

                  {contact.phone && (
                    <a
                      href={`tel:${contact.phone}`}
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <Phone size={15} />
                      Call
                    </a>
                  )}

                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <Mail size={15} />
                      Email
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={openEdit}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Edit3 size={15} />
                    Edit
                  </button>
                </div>
              </div>
            </div>

            {/* Contact info strip */}
            <div className="grid border-t border-slate-200 sm:grid-cols-3">
              <InfoItem
                icon={<Phone size={15} />}
                label="Phone"
                value={contact.phone || "No phone"}
              />

              <InfoItem
                icon={<Mail size={15} />}
                label="Email"
                value={contact.email || "No email"}
              />

              <InfoItem
                icon={<UserRound size={15} />}
                label="Lead status"
                value={
                  lead
                    ? label(lead.status)
                    : "No linked lead"
                }
              />
            </div>
          </div>

          {/* KPI cards */}
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Metric
              icon={<CalendarDays size={16} />}
              label="Appointments"
              value={appointments.length}
            />

            <Metric
              icon={<FileText size={16} />}
              label="Estimates"
              value={estimates.length}
              secondary={money(totalEstimated)}
            />

            <Metric
              icon={<Wrench size={16} />}
              label="Jobs"
              value={jobs.length}
              secondary={money(totalJobValue)}
            />

            <Metric
              icon={<DollarSign size={16} />}
              label="Paid"
              value={money(totalPaid)}
            />

            <Metric
              icon={<MessageSquare size={16} />}
              label="Conversations"
              value={conversations.length}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            {/* Main */}
            <div className="space-y-6">
              {/* Appointments */}
              <SectionCard
                icon={<CalendarDays size={17} />}
                title="Appointments"
                count={appointments.length}
                href="/calendar"
              >
                {appointments.length === 0 ? (
                  <EmptySection text="No appointments for this contact." />
                ) : (
                  <div className="divide-y divide-slate-100">
                    {appointments.slice(0, 5).map((appointment) => (
                      <div
                        key={appointment.id}
                        className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 gap-3">
                          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                            <CalendarDays size={16} />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {appointment.title ||
                                "Appointment"}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {dateTime(
                                appointment.start_at
                              )}
                              {" · "}
                              {label(
                                appointment.appointment_type
                              )}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClass(
                            appointment.status
                          )}`}
                        >
                          {label(appointment.status)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              {/* Estimates */}
              <SectionCard
                icon={<FileText size={17} />}
                title="Estimates"
                count={estimates.length}
              >
                {estimates.length === 0 ? (
                  <EmptySection text="No estimates for this contact." />
                ) : (
                  <div className="divide-y divide-slate-100">
                    {estimates.slice(0, 5).map((estimate) => (
                      <Link
                        key={estimate.id}
                        href={`/estimates/${estimate.id}`}
                        className="flex flex-col gap-3 px-5 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                            <FileText size={16} />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {estimate.title ||
                                "Estimate"}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {estimate.estimate_date
                                ? date(
                                    estimate.estimate_date
                                  )
                                : date(
                                    estimate.created_at
                                  )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-slate-900">
                            {money(estimate.amount)}
                          </span>

                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClass(
                              estimate.status
                            )}`}
                          >
                            {label(estimate.status)}
                          </span>

                          <ArrowUpRight
                            size={15}
                            className="text-slate-400"
                          />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </SectionCard>

              {/* Jobs */}
              <SectionCard
                icon={<Wrench size={17} />}
                title="Jobs"
                count={jobs.length}
              >
                {jobs.length === 0 ? (
                  <EmptySection text="No jobs for this contact." />
                ) : (
                  <div className="divide-y divide-slate-100">
                    {jobs.slice(0, 5).map((job) => (
                      <Link
                        key={job.id}
                        href={`/jobs/${job.id}`}
                        className="flex flex-col gap-3 px-5 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                            <Wrench size={16} />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {job.title || "Job"}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {job.start_date
                                ? `Starts ${date(
                                    job.start_date
                                  )}`
                                : `Created ${date(
                                    job.created_at
                                  )}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-slate-900">
                            {money(job.amount)}
                          </span>

                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClass(
                              job.status
                            )}`}
                          >
                            {label(job.status)}
                          </span>

                          <ArrowUpRight
                            size={15}
                            className="text-slate-400"
                          />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </SectionCard>

              {/* Payments */}
              <SectionCard
                icon={<Receipt size={17} />}
                title="Payments"
                count={payments.length}
              >
                {payments.length === 0 ? (
                  <EmptySection text="No payments recorded for this contact." />
                ) : (
                  <div className="divide-y divide-slate-100">
                    {payments.slice(0, 5).map((payment) => (
                      <Link
                        key={payment.id}
                        href={`/payments/${payment.id}`}
                        className="flex flex-col gap-3 px-5 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                            <DollarSign size={16} />
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {money(payment.amount)}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {payment.payment_date
                                ? date(
                                    payment.payment_date
                                  )
                                : date(
                                    payment.created_at
                                  )}
                              {payment.payment_method
                                ? ` · ${label(
                                    payment.payment_method
                                  )}`
                                : ""}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClass(
                            payment.status
                          )}`}
                        >
                          {label(payment.status)}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </SectionCard>

              {/* Conversations */}
              <SectionCard
                icon={<MessageSquare size={17} />}
                title="Conversations"
                count={conversations.length}
                href="/conversations"
              >
                {conversations.length === 0 ? (
                  <EmptySection text="No conversations for this contact." />
                ) : (
                  <div className="divide-y divide-slate-100">
                    {conversations.slice(0, 5).map((conversation) => (
                      <Link
                        key={conversation.id}
                        href={`/conversations?conversation=${conversation.id}`}
                        className="block px-5 py-4 transition hover:bg-slate-50"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-slate-900">
                                {conversation.subject ||
                                  label(
                                    conversation.channel
                                  )}
                              </span>

                              {conversation.unread_count >
                                0 && (
                                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                                  {
                                    conversation.unread_count
                                  }{" "}
                                  new
                                </span>
                              )}
                            </div>

                            <p className="mt-1 truncate text-xs text-slate-500">
                              {conversation.last_message_preview ||
                                "No messages yet"}
                            </p>
                          </div>

                          <span className="shrink-0 text-[11px] text-slate-400">
                            {dateTime(
                              conversation.last_message_at
                            )}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Notes */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-4">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Customer notes
                  </h2>
                </div>

                <div className="p-5">
                  {contact.notes ? (
                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {contact.notes}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-400">
                      No notes have been added.
                    </p>
                  )}
                </div>
              </div>

              {/* Lead */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-900">
                      Lead
                    </h2>

                    {lead && (
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClass(
                          lead.status
                        )}`}
                      >
                        {label(lead.status)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5">
                  {lead ? (
                    <>
                      <p className="text-sm font-semibold text-slate-900">
                        {[lead.first_name, lead.last_name]
                          .filter(Boolean)
                          .join(" ") || "Lead"}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Created {date(lead.created_at)}
                      </p>

                      <Link
                        href={`/leads/${lead.id}`}
                        className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-950"
                      >
                        View lead
                        <ArrowUpRight size={13} />
                      </Link>
                    </>
                  ) : (
                    <p className="text-sm text-slate-400">
                      This contact does not have a linked lead.
                    </p>
                  )}
                </div>
              </div>

              {/* Latest conversation */}
              {latestConversation && (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 px-5 py-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-slate-900">
                        Latest conversation
                      </h2>

                      <MessageSquare
                        size={16}
                        className="text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="p-5">
                    {conversationMessages.length > 0 ? (
                      <div className="space-y-3">
                        {conversationMessages
                          .slice(-4)
                          .map((message) => (
                            <div
                              key={message.id}
                              className={`rounded-xl px-3 py-2.5 text-xs leading-5 ${
                                message.direction ===
                                "outbound"
                                  ? "ml-5 bg-slate-950 text-white"
                                  : "mr-5 bg-slate-100 text-slate-700"
                              }`}
                            >
                              {message.body}
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400">
                        No messages yet.
                      </p>
                    )}

                    <Link
                      href={`/conversations?conversation=${latestConversation.id}`}
                      className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-950"
                    >
                      Open conversation
                      <ArrowUpRight size={13} />
                    </Link>
                  </div>
                </div>
              )}

              {/* Customer timeline */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-4">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Customer overview
                  </h2>
                </div>

                <div className="space-y-4 p-5">
                  <TimelineItem
                    icon={<UserRound size={14} />}
                    title="Contact created"
                    value={date(contact.created_at)}
                  />

                  {lead && (
                    <TimelineItem
                      icon={<UserRound size={14} />}
                      title="Lead created"
                      value={date(lead.created_at)}
                    />
                  )}

                  {appointments.length > 0 && (
                    <TimelineItem
                      icon={<CalendarDays size={14} />}
                      title="Appointments"
                      value={`${appointments.length} total`}
                    />
                  )}

                  {estimates.length > 0 && (
                    <TimelineItem
                      icon={<FileText size={14} />}
                      title="Estimates"
                      value={`${estimates.length} total`}
                    />
                  )}

                  {jobs.length > 0 && (
                    <TimelineItem
                      icon={<CheckCircle2 size={14} />}
                      title="Jobs"
                      value={`${jobs.length} total`}
                    />
                  )}

                  {payments.length > 0 && (
                    <TimelineItem
                      icon={<DollarSign size={14} />}
                      title="Payments"
                      value={`${payments.length} recorded`}
                    />
                  )}

                  {conversations.length > 0 && (
                    <TimelineItem
                      icon={<MessageSquare size={14} />}
                      title="Conversations"
                      value={`${conversations.length} total`}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Contact Modal */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeEdit();
            }
          }}
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Edit contact
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Update this customer's contact information.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEdit}
                disabled={saving}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close edit contact modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal body */}
            <div className="max-h-[75vh] overflow-y-auto p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="First name"
                  value={form.first_name}
                  onChange={(value) =>
                    updateField("first_name", value)
                  }
                  placeholder="John"
                />

                <Field
                  label="Last name"
                  value={form.last_name}
                  onChange={(value) =>
                    updateField("last_name", value)
                  }
                  placeholder="Smith"
                />

                <Field
                  label="Company"
                  value={form.company_name}
                  onChange={(value) =>
                    updateField("company_name", value)
                  }
                  placeholder="Smith Electric"
                />

                <Field
                  label="Phone"
                  value={form.phone}
                  onChange={(value) =>
                    updateField("phone", value)
                  }
                  placeholder="(555) 555-5555"
                  type="tel"
                />

                <Field
                  label="Email"
                  value={form.email}
                  onChange={(value) =>
                    updateField("email", value)
                  }
                  placeholder="john@example.com"
                  type="email"
                />

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Status
                  </label>

                  <select
                    value={form.status}
                    onChange={(event) =>
                      updateField(
                        "status",
                        event.target.value
                      )
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  >
                    <option value="active">
                      Active
                    </option>

                    <option value="inactive">
                      Inactive
                    </option>

                    <option value="archived">
                      Archived
                    </option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Notes
                  </label>

                  <textarea
                    value={form.notes}
                    onChange={(event) =>
                      updateField(
                        "notes",
                        event.target.value
                      )
                    }
                    rows={5}
                    placeholder="Add notes about this customer..."
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={closeEdit}
                disabled={saving}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveContact}
                disabled={saving}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving && <Loader2 size={15} className="animate-spin" />}
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({
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
      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
      />
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 border-slate-200 px-5 py-4 sm:border-r last:border-r-0">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>

        <p className="mt-0.5 truncate text-xs font-medium text-slate-700">
          {value}
        </p>
      </div>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  secondary,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  secondary?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        {icon}
      </div>

      <p className="text-xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>

      <div className="mt-0.5 flex items-center gap-2">
        <p className="text-xs font-medium text-slate-500">
          {label}
        </p>

        {secondary && (
          <span className="text-[11px] font-medium text-slate-400">
            {secondary}
          </span>
        )}
      </div>
    </div>
  );
}

function SectionCard({
  icon,
  title,
  count,
  href,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            {icon}
          </div>

          <h2 className="text-sm font-semibold text-slate-900">
            {title}
          </h2>

          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
            {count}
          </span>
        </div>

        {href && (
          <Link
            href={href}
            className="text-xs font-semibold text-slate-500 transition hover:text-slate-900"
          >
            View all
          </Link>
        )}
      </div>

      {children}
    </div>
  );
}

function EmptySection({ text }: { text: string }) {
  return (
    <div className="px-5 py-10 text-center">
      <p className="text-sm text-slate-400">
        {text}
      </p>
    </div>
  );
}

function TimelineItem({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-700">
          {title}
        </p>

        <p className="mt-0.5 text-[11px] text-slate-400">
          {value}
        </p>
      </div>
    </div>
  );
}