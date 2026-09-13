"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bell,
  Building2,
  Check,
  ChevronDown,
  Globe,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Organization = {
  id: string;
  name: string | null;
  industry: string | null;
  phone: string | null;
  website: string | null;
};

type Settings = {
  id: string;
  organization_id: string;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  timezone: string;
  notifications_enabled: boolean;
  email_notifications: boolean;
  appointment_reminders: boolean;
  lead_notifications: boolean;
  payment_notifications: boolean;
  review_notifications: boolean;
  default_lead_status: string | null;
  default_estimate_status: string | null;
  default_job_status: string | null;
  ai_enabled: boolean;
  ai_auto_reply: boolean;
  ai_human_handoff: boolean;
};

type FormState = {
  email: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  timezone: string;

  notifications_enabled: boolean;
  email_notifications: boolean;
  appointment_reminders: boolean;
  lead_notifications: boolean;
  payment_notifications: boolean;
  review_notifications: boolean;

  default_lead_status: string;
  default_estimate_status: string;
  default_job_status: string;

  ai_enabled: boolean;
  ai_auto_reply: boolean;
  ai_human_handoff: boolean;
};

type Props = {
  userEmail: string;
  role: string;
  organization: Organization;
  settings: Settings | null;
};

const DEFAULT_SETTINGS: FormState = {
  email: "",
  address: "",
  city: "",
  state: "",
  zip_code: "",
  timezone: "America/Denver",

  notifications_enabled: true,
  email_notifications: true,
  appointment_reminders: true,
  lead_notifications: true,
  payment_notifications: true,
  review_notifications: true,

  default_lead_status: "",
  default_estimate_status: "",
  default_job_status: "",

  ai_enabled: true,
  ai_auto_reply: false,
  ai_human_handoff: true,
};

const LEAD_STATUS_OPTIONS = [
  { label: "New", value: "new" },
  { label: "Contacted", value: "contacted" },
  { label: "Qualified", value: "qualified" },
  { label: "Unqualified", value: "unqualified" },
  { label: "Won", value: "won" },
  { label: "Lost", value: "lost" },
];

const ESTIMATE_STATUS_OPTIONS = [
  { label: "Draft", value: "draft" },
  { label: "Sent", value: "sent" },
  { label: "Accepted", value: "accepted" },
  { label: "Declined", value: "declined" },
  { label: "Expired", value: "expired" },
];

const JOB_STATUS_OPTIONS = [
  { label: "Scheduled", value: "scheduled" },
  { label: "In Progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

function buildFormState(settings: Settings | null): FormState {
  if (!settings) {
    return { ...DEFAULT_SETTINGS };
  }

  return {
    email: settings.email ?? "",
    address: settings.address ?? "",
    city: settings.city ?? "",
    state: settings.state ?? "",
    zip_code: settings.zip_code ?? "",
    timezone: settings.timezone || "America/Denver",

    notifications_enabled: settings.notifications_enabled,
    email_notifications: settings.email_notifications,
    appointment_reminders: settings.appointment_reminders,
    lead_notifications: settings.lead_notifications,
    payment_notifications: settings.payment_notifications,
    review_notifications: settings.review_notifications,

    default_lead_status: settings.default_lead_status ?? "",
    default_estimate_status: settings.default_estimate_status ?? "",
    default_job_status: settings.default_job_status ?? "",

    ai_enabled: settings.ai_enabled,
    ai_auto_reply: settings.ai_auto_reply,
    ai_human_handoff: settings.ai_human_handoff,
  };
}

function normalizeBusinessValue(value: string | null) {
  return value ?? "";
}

export default function SettingsClient({
  userEmail,
  role,
  organization,
  settings,
}: Props) {
  const supabase = createClient();

  const [businessName, setBusinessName] = useState(
    normalizeBusinessValue(organization.name)
  );

  const [industry, setIndustry] = useState(
    normalizeBusinessValue(organization.industry)
  );

  const [phone, setPhone] = useState(
    normalizeBusinessValue(organization.phone)
  );

  const [website, setWebsite] = useState(
    normalizeBusinessValue(organization.website)
  );

  const [form, setForm] = useState<FormState>(
    buildFormState(settings)
  );

  const [savingBusiness, setSavingBusiness] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const [businessMessage, setBusinessMessage] = useState("");
  const [settingsMessage, setSettingsMessage] = useState("");

  const [businessError, setBusinessError] = useState("");
  const [settingsError, setSettingsError] = useState("");

  useEffect(() => {
    setBusinessName(normalizeBusinessValue(organization.name));
    setIndustry(normalizeBusinessValue(organization.industry));
    setPhone(normalizeBusinessValue(organization.phone));
    setWebsite(normalizeBusinessValue(organization.website));
    setForm(buildFormState(settings));
  }, [organization, settings]);

  const businessChanged = useMemo(() => {
    return (
      businessName.trim() !==
        normalizeBusinessValue(organization.name).trim() ||
      industry.trim() !==
        normalizeBusinessValue(organization.industry).trim() ||
      phone.trim() !==
        normalizeBusinessValue(organization.phone).trim() ||
      website.trim() !==
        normalizeBusinessValue(organization.website).trim()
    );
  }, [
    businessName,
    industry,
    phone,
    website,
    organization,
  ]);

  const initialSettings = useMemo(
    () => buildFormState(settings),
    [settings]
  );

  const settingsChanged = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(initialSettings);
  }, [form, initialSettings]);

  function updateForm<K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    setSettingsMessage("");
    setSettingsError("");
  }

  async function saveBusiness() {
    if (!businessName.trim()) {
      setBusinessError("Business name is required.");
      setBusinessMessage("");
      return;
    }

    setSavingBusiness(true);
    setBusinessMessage("");
    setBusinessError("");

    const { error } = await supabase
      .from("organizations")
      .update({
        name: businessName.trim(),
        industry: industry.trim() || null,
        phone: phone.trim() || null,
        website: website.trim() || null,
      })
      .eq("id", organization.id);

    if (error) {
      console.error(error);

      setBusinessError(
        error.message ||
          "Unable to save business information."
      );

      setSavingBusiness(false);
      return;
    }

    setBusinessMessage(
      "Business information saved successfully."
    );

    setSavingBusiness(false);
  }

  async function saveSettings() {
    setSavingSettings(true);
    setSettingsMessage("");
    setSettingsError("");

    const payload = {
      organization_id: organization.id,

      email: form.email.trim() || null,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      zip_code: form.zip_code.trim() || null,
      timezone: form.timezone,

      notifications_enabled:
        form.notifications_enabled,

      email_notifications:
        form.email_notifications,

      appointment_reminders:
        form.appointment_reminders,

      lead_notifications:
        form.lead_notifications,

      payment_notifications:
        form.payment_notifications,

      review_notifications:
        form.review_notifications,

      default_lead_status:
        form.default_lead_status || null,

      default_estimate_status:
        form.default_estimate_status || null,

      default_job_status:
        form.default_job_status || null,

      ai_enabled: form.ai_enabled,

      ai_auto_reply:
        form.ai_auto_reply,

      ai_human_handoff:
        form.ai_human_handoff,
    };

    const { error } = await supabase
      .from("organization_settings")
      .upsert(payload, {
        onConflict: "organization_id",
      });

    if (error) {
      console.error(error);

      setSettingsError(
        error.message || "Unable to save settings."
      );

      setSavingSettings(false);
      return;
    }

    setSettingsMessage(
      "Settings saved successfully."
    );

    setSavingSettings(false);
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-slate-900">
      <div className="mx-auto max-w-[1250px] px-4 py-6 sm:px-6 lg:px-8">

        {/* HEADER */}

        <div className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-violet-600">
            <Zap size={13} />
            System configuration
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                Settings
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Configure your business profile, notifications,
                workflow defaults, and AI behavior.
              </p>
            </div>

            <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm sm:flex">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Check size={14} />
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Workspace
                </p>

                <p className="text-xs font-semibold text-slate-700">
                  {businessName || "Your organization"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ACCOUNT */}

        <Section
          icon={<User size={18} />}
          title="Account"
          description="Your Trackpr account information."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <InfoBox
              label="Email"
              value={userEmail || "Not available"}
              icon={<Mail size={16} />}
            />

            <InfoBox
              label="Role"
              value={formatValue(role)}
              icon={<ShieldCheck size={16} />}
            />
          </div>
        </Section>

        {/* BUSINESS */}

        <Section
          icon={<Building2 size={18} />}
          title="Business information"
          description="The information Trackpr uses to represent your company."
        >
          <div className="mb-6 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm ring-1 ring-slate-200/70">
                <Building2 size={17} />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900">
                  Company profile
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Keep this information accurate so customer-facing
                  records and future automation features have the
                  correct business context.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Input
              label="Business name"
              value={businessName}
              onChange={(value) => {
                setBusinessName(value);
                setBusinessMessage("");
                setBusinessError("");
              }}
              placeholder="Your company name"
              required
            />

            <Input
              label="Industry"
              value={industry}
              onChange={(value) => {
                setIndustry(value);
                setBusinessMessage("");
                setBusinessError("");
              }}
              placeholder="Electrical, HVAC, Roofing..."
            />

            <Input
              label="Business phone"
              value={phone}
              onChange={(value) => {
                setPhone(value);
                setBusinessMessage("");
                setBusinessError("");
              }}
              placeholder="(555) 555-5555"
              icon={<Phone size={15} />}
              type="tel"
            />

            <Input
              label="Website"
              value={website}
              onChange={(value) => {
                setWebsite(value);
                setBusinessMessage("");
                setBusinessError("");
              }}
              placeholder="https://yourcompany.com"
              icon={<Globe size={15} />}
              type="url"
            />
          </div>

          <SaveArea
            message={businessMessage}
            error={businessError}
            saving={savingBusiness}
            changed={businessChanged}
            onSave={saveBusiness}
            label="Save business"
          />
        </Section>

        {/* LOCATION */}

        <Section
          icon={<MapPin size={18} />}
          title="Business location"
          description="Used for business context, scheduling, and local operations."
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Input
              label="Business email"
              value={form.email}
              onChange={(value) =>
                updateForm("email", value)
              }
              placeholder="office@yourcompany.com"
              icon={<Mail size={15} />}
              type="email"
            />

            <Input
              label="Street address"
              value={form.address}
              onChange={(value) =>
                updateForm("address", value)
              }
              placeholder="123 Main Street"
            />

            <Input
              label="City"
              value={form.city}
              onChange={(value) =>
                updateForm("city", value)
              }
              placeholder="Colorado Springs"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="State"
                value={form.state}
                onChange={(value) =>
                  updateForm("state", value)
                }
                placeholder="CO"
              />

              <Input
                label="ZIP code"
                value={form.zip_code}
                onChange={(value) =>
                  updateForm("zip_code", value)
                }
                placeholder="80903"
                inputMode="numeric"
              />
            </div>

            <Select
              label="Time zone"
              value={form.timezone}
              onChange={(value) =>
                updateForm("timezone", value)
              }
              options={[
                {
                  label: "Mountain Time",
                  value: "America/Denver",
                },
                {
                  label: "Central Time",
                  value: "America/Chicago",
                },
                {
                  label: "Eastern Time",
                  value: "America/New_York",
                },
                {
                  label: "Pacific Time",
                  value: "America/Los_Angeles",
                },
                {
                  label: "Arizona",
                  value: "America/Phoenix",
                },
              ]}
            />
          </div>

          <ChangeHint changed={settingsChanged} />
        </Section>

        {/* NOTIFICATIONS */}

        <Section
          icon={<Bell size={18} />}
          title="Notifications"
          description="Choose which Trackpr events should generate notifications."
        >
          <div className="mb-5 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm ring-1 ring-slate-200/70">
                <Bell size={16} />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Notification center
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Turn notifications off globally or fine-tune
                  individual event types below.
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <ToggleRow
              title="Notifications"
              description="Enable Trackpr notifications globally."
              checked={form.notifications_enabled}
              onChange={(value) =>
                updateForm(
                  "notifications_enabled",
                  value
                )
              }
              accent
            />

            <ToggleRow
              title="Email notifications"
              description="Receive supported Trackpr notifications by email."
              checked={form.email_notifications}
              disabled={!form.notifications_enabled}
              onChange={(value) =>
                updateForm(
                  "email_notifications",
                  value
                )
              }
            />

            <ToggleRow
              title="Lead notifications"
              description="Get notified when important lead activity occurs."
              checked={form.lead_notifications}
              disabled={!form.notifications_enabled}
              onChange={(value) =>
                updateForm(
                  "lead_notifications",
                  value
                )
              }
            />

            <ToggleRow
              title="Appointment reminders"
              description="Receive reminders around scheduled appointments."
              checked={form.appointment_reminders}
              disabled={!form.notifications_enabled}
              onChange={(value) =>
                updateForm(
                  "appointment_reminders",
                  value
                )
              }
            />

            <ToggleRow
              title="Payment notifications"
              description="Get notified when payment activity occurs."
              checked={form.payment_notifications}
              disabled={!form.notifications_enabled}
              onChange={(value) =>
                updateForm(
                  "payment_notifications",
                  value
                )
              }
            />

            <ToggleRow
              title="Review notifications"
              description="Get notified when new customer reviews arrive."
              checked={form.review_notifications}
              disabled={!form.notifications_enabled}
              onChange={(value) =>
                updateForm(
                  "review_notifications",
                  value
                )
              }
            />
          </div>

          <ChangeHint changed={settingsChanged} />
        </Section>

        {/* DEFAULTS */}

        <Section
          icon={<Check size={18} />}
          title="Workflow defaults"
          description="Optional defaults used when new records are created."
        >
          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatusSelect
              label="Default lead status"
              value={form.default_lead_status}
              onChange={(value) =>
                updateForm(
                  "default_lead_status",
                  value
                )
              }
              placeholder="No default"
              options={LEAD_STATUS_OPTIONS}
            />

            <StatusSelect
              label="Default estimate status"
              value={form.default_estimate_status}
              onChange={(value) =>
                updateForm(
                  "default_estimate_status",
                  value
                )
              }
              placeholder="No default"
              options={ESTIMATE_STATUS_OPTIONS}
            />

            <StatusSelect
              label="Default job status"
              value={form.default_job_status}
              onChange={(value) =>
                updateForm(
                  "default_job_status",
                  value
                )
              }
              placeholder="No default"
              options={JOB_STATUS_OPTIONS}
            />
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs leading-5 text-slate-500">
              Defaults only apply when a new record is created.
              They do not change existing leads, estimates, or jobs.
            </p>
          </div>

          <ChangeHint changed={settingsChanged} />
        </Section>

        {/* AI */}

        <Section
          icon={<Sparkles size={18} />}
          title="AI & automation"
          description="Control how AI features behave inside your organization."
        >
          <div className="mb-5 rounded-2xl border border-violet-100 bg-violet-50/70 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm ring-1 ring-violet-100">
                <Sparkles size={18} />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-violet-950">
                    AI workspace controls
                  </p>

                  <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-600 ring-1 ring-violet-100">
                    AI
                  </span>
                </div>

                <p className="mt-1 text-xs leading-5 text-violet-700">
                  These controls determine whether AI features are
                  allowed to operate within this organization.
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <ToggleRow
              title="AI features"
              description="Allow AI-powered features to operate within Trackpr."
              checked={form.ai_enabled}
              onChange={(value) =>
                updateForm("ai_enabled", value)
              }
              accent
            />

            <ToggleRow
              title="AI auto-reply"
              description="Allow configured AI agents to automatically respond when connected to a supported channel."
              checked={form.ai_auto_reply}
              disabled={!form.ai_enabled}
              onChange={(value) =>
                updateForm(
                  "ai_auto_reply",
                  value
                )
              }
            />

            <ToggleRow
              title="Human handoff"
              description="Allow AI conversations to be escalated to a human when configured rules require it."
              checked={form.ai_human_handoff}
              disabled={!form.ai_enabled}
              onChange={(value) =>
                updateForm(
                  "ai_human_handoff",
                  value
                )
              }
            />
          </div>

          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm ring-1 ring-slate-200">
              <ShieldCheck size={15} />
            </div>

            <div>
              <p className="text-xs font-bold text-slate-800">
                AI execution is provider-dependent
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                These settings control Trackpr behavior.
                Actual message, phone, and automation execution
                becomes active when your AI and automation
                providers are connected.
              </p>
            </div>
          </div>

          <ChangeHint changed={settingsChanged} />
        </Section>

        {/* GLOBAL SAVE BAR */}

        <div className="sticky bottom-4 z-20 mt-7">
          <div className="rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl shadow-slate-900/10 backdrop-blur sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                {settingsMessage ? (
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50">
                      <Check size={15} />
                    </span>

                    <span>{settingsMessage}</span>
                  </div>
                ) : settingsError ? (
                  <div className="flex items-center gap-2 text-sm font-semibold text-red-600">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-50">
                      <AlertCircle size={15} />
                    </span>

                    <span className="truncate">
                      {settingsError}
                    </span>
                  </div>
                ) : settingsChanged ? (
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />

                    <p className="text-xs font-semibold text-slate-700">
                      You have unsaved changes
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    Your organization settings are up to date.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={saveSettings}
                disabled={savingSettings || !settingsChanged}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
              >
                {savingSettings ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={15} />
                    Save settings
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-6 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          {icon}
        </div>

        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-950">
            {title}
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </p>
        </div>
      </div>

      {children}
    </section>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  icon,
  type = "text",
  inputMode,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
        {label}

        {required && (
          <span className="text-red-500">*</span>
        )}
      </span>

      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </span>
        )}

        <input
          type={type}
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          placeholder={placeholder}
          inputMode={inputMode}
          className={`h-11 w-full rounded-xl border border-slate-200 bg-white text-sm text-slate-900 outline-none transition placeholder:text-slate-300 hover:border-slate-300 focus:border-slate-400 focus:ring-4 focus:ring-slate-100 ${
            icon ? "pl-9 pr-3" : "px-3"
          }`}
        />
      </div>
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: {
    label: string;
    value: string;
  }[];
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold text-slate-600">
        {label}
      </span>

      <div className="relative">
        <select
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-9 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
        >
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>

        <ChevronDown
          size={15}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
      </div>
    </label>
  );
}

function StatusSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: {
    label: string;
    value: string;
  }[];
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold text-slate-600">
        {label}
      </span>

      <div className="relative">
        <select
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-9 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
        >
          <option value="">{placeholder}</option>

          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>

        <ChevronDown
          size={15}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
      </div>
    </label>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
  disabled = false,
  accent = false,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-5 border-b border-slate-100 px-4 py-4 last:border-b-0 sm:px-5 ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-800">
            {title}
          </p>

          {accent && checked && (
            <span className="hidden rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-600 sm:inline-flex">
              Active
            </span>
          )}
        </div>

        <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
          {description}
        </p>
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
        aria-label={`${title}: ${
          checked ? "enabled" : "disabled"
        }`}
        className={`relative h-6 w-11 shrink-0 rounded-full transition focus:outline-none focus:ring-4 focus:ring-slate-100 ${
          checked
            ? "bg-slate-950"
            : "bg-slate-200"
        } ${
          disabled
            ? "cursor-not-allowed"
            : "cursor-pointer"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

function InfoBox({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}

        <span className="text-[10px] font-bold uppercase tracking-[0.12em]">
          {label}
        </span>
      </div>

      <p className="mt-2 truncate text-sm font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function SaveArea({
  message,
  error,
  saving,
  changed,
  onSave,
  label,
}: {
  message: string;
  error: string;
  saving: boolean;
  changed: boolean;
  onSave: () => void;
  label: string;
}) {
  return (
    <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-h-7">
        {message ? (
          <p className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50">
              <Check size={13} />
            </span>

            {message}
          </p>
        ) : error ? (
          <p className="flex items-center gap-2 text-xs font-semibold text-red-600">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-50">
              <AlertCircle size={13} />
            </span>

            <span className="max-w-xl">
              {error}
            </span>
          </p>
        ) : changed ? (
          <p className="flex items-center gap-2 text-xs font-semibold text-amber-600">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Unsaved changes
          </p>
        ) : (
          <p className="text-xs text-slate-400">
            Business information is up to date.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={saving || !changed}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
      >
        {saving ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Saving...
          </>
        ) : (
          <>
            <Save size={15} />
            {label}
          </>
        )}
      </button>
    </div>
  );
}

function ChangeHint({
  changed,
}: {
  changed: boolean;
}) {
  if (!changed) {
    return (
      <div className="mt-5 flex items-center gap-2 text-[11px] text-slate-400">
        <Check size={13} className="text-emerald-500" />
        No unsaved changes
      </div>
    );
  }

  return (
    <div className="mt-5 flex items-center gap-2 text-[11px] font-semibold text-amber-600">
      <span className="h-2 w-2 rounded-full bg-amber-500" />
      Unsaved changes — use the Save settings button below.
    </div>
  );
}

function formatValue(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) =>
      char.toUpperCase()
    );
}