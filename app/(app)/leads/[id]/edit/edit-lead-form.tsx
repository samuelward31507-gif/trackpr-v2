"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Lead = {
  id: string;
  organization_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  source: string | null;
  service_interest: string | null;
  next_follow_up_at: string | null;
  notes: string | null;
};

export default function EditLeadForm({
  lead,
}: {
  lead: Lead;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [firstName, setFirstName] = useState(lead.first_name ?? "");
  const [lastName, setLastName] = useState(lead.last_name ?? "");
  const [email, setEmail] = useState(lead.email ?? "");
  const [phone, setPhone] = useState(lead.phone ?? "");
  const [status, setStatus] = useState(lead.status ?? "new");
  const [source, setSource] = useState(lead.source ?? "");
  const [serviceInterest, setServiceInterest] = useState(
    lead.service_interest ?? ""
  );

  const [nextFollowUp, setNextFollowUp] = useState(
    lead.next_follow_up_at
      ? new Date(lead.next_follow_up_at).toISOString().slice(0, 16)
      : ""
  );

  const [notes, setNotes] = useState(lead.notes ?? "");

  async function handleSubmit(
  e: React.FormEvent<HTMLFormElement>
) {
  e.preventDefault();

  setLoading(true);
  setErrorMessage("");

  const previousStatus = lead.status;
  const previousNotes = lead.notes ?? "";
  const previousFollowUp = lead.next_follow_up_at
    ? new Date(lead.next_follow_up_at).getTime()
    : null;

  const newFollowUp = nextFollowUp
    ? new Date(nextFollowUp).getTime()
    : null;

  const { error } = await supabase
    .from("leads")
    .update({
      first_name: firstName || null,
      last_name: lastName || null,
      email: email || null,
      phone: phone || null,
      status,
      source: source || null,
      service_interest: serviceInterest || null,
      next_follow_up_at: nextFollowUp
        ? new Date(nextFollowUp).toISOString()
        : null,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", lead.id);

  if (error) {
    console.error("Error updating lead:", error);
    setErrorMessage(error.message);
    setLoading(false);
    return;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const activities = [];

    if (previousStatus !== status) {
      activities.push({
        organization_id: lead.organization_id,
        lead_id: lead.id,
        user_id: user.id,
        activity_type: "status_changed",
        title: "Status changed",
        description: `${
          previousStatus.charAt(0).toUpperCase() +
          previousStatus.slice(1)
        } → ${
          status.charAt(0).toUpperCase() +
          status.slice(1)
        }`,
        metadata: {
          previous_status: previousStatus,
          new_status: status,
        },
      });
    }

    if (previousNotes !== notes) {
      activities.push({
        organization_id: lead.organization_id,
        lead_id: lead.id,
        user_id: user.id,
        activity_type: "note_added",
        title: previousNotes
          ? "Notes updated"
          : "Note added",
        description: notes
          ? "Lead notes were updated."
          : "Lead notes were cleared.",
      });
    }

    if (previousFollowUp !== newFollowUp) {
      activities.push({
        organization_id: lead.organization_id,
        lead_id: lead.id,
        user_id: user.id,
        activity_type: "follow_up_scheduled",
        title: newFollowUp
          ? "Follow-up scheduled"
          : "Follow-up cleared",
        description: newFollowUp
          ? new Date(nextFollowUp).toLocaleString()
          : "The scheduled follow-up was removed.",
      });
    }

    if (activities.length > 0) {
      const { error: activityError } = await supabase
        .from("lead_activities")
        .insert(activities);

      if (activityError) {
        console.error(
          "Lead was updated, but activities could not be recorded:",
          activityError
        );
      }
    }
  }

  router.push(`/leads/${lead.id}`);
  router.refresh();
}

  return (
    <div className="mx-auto max-w-3xl">
      {/* Back */}
      <Link
        href={`/leads/${lead.id}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-950"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Lead
      </Link>

      {/* Header */}
      <div className="mt-8">
        <p className="text-sm font-medium text-blue-600">
          CRM
        </p>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          Edit Lead
        </h1>

        <p className="mt-3 text-sm text-slate-500">
          Update this lead&apos;s information and follow-up details.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        {errorMessage && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="space-y-8">

          {/* Contact Information */}
          <section>
            <h2 className="text-base font-semibold text-slate-950">
              Contact Information
            </h2>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Field
                label="First name"
                value={firstName}
                onChange={setFirstName}
                placeholder="John"
              />

              <Field
                label="Last name"
                value={lastName}
                onChange={setLastName}
                placeholder="Smith"
              />

              <Field
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="john@example.com"
              />

              <Field
                label="Phone"
                type="tel"
                value={phone}
                onChange={setPhone}
                placeholder="(555) 123-4567"
              />
            </div>
          </section>

          <div className="border-t border-slate-100" />

          {/* Lead Management */}
          <section>
            <h2 className="text-base font-semibold text-slate-950">
              Lead Management
            </h2>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <SelectField
                label="Status"
                value={status}
                onChange={setStatus}
                options={[
                  "new",
                  "contacted",
                  "qualified",
                  "unqualified",
                  "won",
                  "lost",
                ]}
              />

              <SelectField
                label="Lead source"
                value={source}
                onChange={setSource}
                placeholder="Select source"
                options={[
                  "Website",
                  "Google Ads",
                  "Facebook",
                  "Instagram",
                  "Referral",
                  "Phone Call",
                  "Manual",
                  "Other",
                ]}
              />

              <Field
                label="Service interest"
                value={serviceInterest}
                onChange={setServiceInterest}
                placeholder="Roof replacement"
              />

              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Next follow-up
                </span>

                <input
                  type="datetime-local"
                  value={nextFollowUp}
                  onChange={(e) => setNextFollowUp(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                />
              </label>
            </div>
          </section>

          <div className="border-t border-slate-100" />

          {/* Notes */}
          <section>
            <h2 className="text-base font-semibold text-slate-950">
              Notes
            </h2>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this lead..."
              rows={6}
              className="mt-5 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            />
          </section>
        </div>

        {/* Actions */}
        <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-100 pt-6">
          <Link
            href={`/leads/${lead.id}`}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}

            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
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
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = "Select an option",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">
        {label}
      </span>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
      >
        <option value="">{placeholder}</option>

        {options.map((option) => (
          <option key={option} value={option}>
            {option.charAt(0).toUpperCase() + option.slice(1)}
          </option>
        ))}
      </select>
    </label>
  );
}