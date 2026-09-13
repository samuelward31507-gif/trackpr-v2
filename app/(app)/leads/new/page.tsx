"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function NewLeadPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [source, setSource] = useState("");
  const [serviceInterest, setServiceInterest] = useState("");
  const [notes, setNotes] = useState("");

  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setLoading(true);
    setErrorMessage("");

    /*
     * Get authenticated user
     */
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage(
        "You must be signed in to create a lead."
      );
      setLoading(false);
      return;
    }

    /*
     * Get user's organization
     */
    const {
      data: membership,
      error: membershipError,
    } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError || !membership) {
      setErrorMessage(
        "We couldn't find your workspace. Please refresh and try again."
      );
      setLoading(false);
      return;
    }

    const organizationId =
      membership.organization_id;

    /*
     * Create lead
     */
    const {
      data: newLead,
      error: leadError,
    } = await supabase
      .from("leads")
      .insert({
        organization_id: organizationId,
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        source: source || null,
        service_interest:
          serviceInterest.trim() || null,
        notes: notes.trim() || null,
        status: "new",
      })
      .select()
      .single();

    if (leadError || !newLead) {
      console.error(
        "Error creating lead:",
        leadError
      );

      setErrorMessage(
        leadError?.message ||
          "Unable to create the lead."
      );

      setLoading(false);
      return;
    }

    /*
     * Create the Contact automatically.
     */
    const {
      data: newContact,
      error: contactError,
    } = await supabase
      .from("contacts")
      .insert({
        organization_id: organizationId,
        lead_id: newLead.id,
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        company_name: null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        status: "active",
        notes: notes.trim() || null,
      })
      .select()
      .single();

    if (contactError || !newContact) {
      console.error(
        "Lead was created, but Contact creation failed:",
        contactError
      );

      /*
       * Clean up the lead.
       */
      await supabase
        .from("leads")
        .delete()
        .eq("id", newLead.id)
        .eq(
          "organization_id",
          organizationId
        );

      setErrorMessage(
        contactError?.message ||
          "The lead was created, but we couldn't create its contact. Please try again."
      );

      setLoading(false);
      return;
    }

    /*
     * Link Contact back to Lead.
     */
    const { error: linkError } =
      await supabase
        .from("leads")
        .update({
          contact_id: newContact.id,
        })
        .eq("id", newLead.id)
        .eq(
          "organization_id",
          organizationId
        );

    if (linkError) {
      console.error(
        "Lead and Contact were created, but linking failed:",
        linkError
      );

      /*
       * Clean up both records.
       */
      await supabase
        .from("contacts")
        .delete()
        .eq("id", newContact.id)
        .eq(
          "organization_id",
          organizationId
        );

      await supabase
        .from("leads")
        .delete()
        .eq("id", newLead.id)
        .eq(
          "organization_id",
          organizationId
        );

      setErrorMessage(
        linkError.message ||
          "The lead and contact were created, but they couldn't be linked."
      );

      setLoading(false);
      return;
    }

    /*
     * Create the initial CRM activity.
     */
    const { error: activityError } =
      await supabase
        .from("lead_activities")
        .insert({
          organization_id: organizationId,
          lead_id: newLead.id,
          user_id: user.id,
          activity_type: "lead_created",
          title: "Lead created",
          description:
            "Lead was added to Trackpr.",
        });

    if (activityError) {
      console.error(
        "Lead and Contact were created, but activity could not be recorded:",
        activityError
      );
    }

    /*
     * Create the automation event.
     */
    const {
      data: automationEvent,
      error: automationEventError,
    } = await supabase
      .from("automation_events")
      .insert({
        organization_id: organizationId,
        event_type: "lead_created",
        lead_id: newLead.id,
        contact_id: newContact.id,

        payload: {
          lead_id: newLead.id,
          contact_id: newContact.id,
          organization_id: organizationId,

          first_name:
            firstName.trim() || null,
          last_name:
            lastName.trim() || null,

          email:
            email.trim() || null,

          phone:
            phone.trim() || null,

          source:
            source || null,

          service_interest:
            serviceInterest.trim() || null,

          status: "new",
        },

        status: "pending",
      })
      .select()
      .single();

    if (
      automationEventError ||
      !automationEvent
    ) {
      /*
       * Do not fail the CRM lead creation if
       * the automation event cannot be created.
       */
      console.error(
        "Lead was created, but automation event could not be recorded:",
        automationEventError
      );
    } else {
      /*
       * Send the event to the Trackpr
       * automation engine.
       */
      try {
        const deliveryResponse = await fetch(
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
                organizationId,
            }),
          }
        );

        const deliveryText =
          await deliveryResponse.text();

        let deliveryData: unknown = null;

        try {
          deliveryData = deliveryText
            ? JSON.parse(deliveryText)
            : null;
        } catch {
          deliveryData = deliveryText;
        }

        if (!deliveryResponse.ok) {
          console.error(
            "Automation event was created, but could not be delivered to n8n:",
            deliveryData
          );

          console.error(
            "Automation delivery HTTP status:",
            deliveryResponse.status
          );
        } else {
          console.log(
            "Automation event delivered successfully:",
            deliveryData
          );
        }
      } catch (deliveryError) {
        console.error(
          "Automation event delivery request failed:",
          deliveryError
        );
      }
    }

    /*
     * Return to Leads.
     */
    router.push("/leads");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/leads"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-950"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Leads
      </Link>

      <div className="mt-8">
        <p className="text-sm font-medium text-blue-600">
          CRM
        </p>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          Add Lead
        </h1>

        <p className="mt-3 text-sm text-slate-500">
          Add a potential customer to your Trackpr workspace.
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

          <section>
            <h2 className="text-base font-semibold text-slate-950">
              Lead Information
            </h2>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <SelectField
                label="Lead source"
                value={source}
                onChange={setSource}
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
                onChange={
                  setServiceInterest
                }
                placeholder="Roof replacement"
              />
            </div>
          </section>

          <div className="border-t border-slate-100" />

          <section>
            <h2 className="text-base font-semibold text-slate-950">
              Notes
            </h2>

            <textarea
              value={notes}
              onChange={(e) =>
                setNotes(e.target.value)
              }
              placeholder="Add any notes about this lead..."
              rows={5}
              className="mt-5 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            />
          </section>
        </div>

        <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-100 pt-6">
          <Link
            href="/leads"
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}

            {loading
              ? "Creating Lead..."
              : "Create Lead"}
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
        onChange={(e) =>
          onChange(e.target.value)
        }
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">
        {label}
      </span>

      <select
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
      >
        <option value="">
          Select source
        </option>

        {options.map((option) => (
          <option
            key={option}
            value={option}
          >
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}