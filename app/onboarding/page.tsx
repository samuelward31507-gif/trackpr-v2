"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();

  setLoading(true);

  const { data, error } = await supabase.rpc("create_organization", {
    organization_name: companyName,
    organization_industry: industry || null,
    organization_phone: phone || null,
    organization_website: website || null,
  });

  if (error) {
    console.error("Error creating organization:", error);
    alert(error.message);
    setLoading(false);
    return;
  }

  console.log("Organization created:", data);

  router.push("/dashboard");
  router.refresh();
}

  return (
    <main className="min-h-screen bg-slate-950">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-12">
        <div className="grid w-full overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl lg:grid-cols-[0.9fr_1.1fr]">
          
          {/* Left panel */}
          <section className="relative hidden overflow-hidden bg-slate-950 p-12 lg:flex lg:flex-col lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-lg font-bold text-white shadow-lg shadow-blue-500/20">
                T
              </div>

              <span className="text-xl font-semibold tracking-tight text-white">
                Trackpr
              </span>
            </div>

            <div>
              <div className="mb-6 inline-flex items-center rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
                Let&apos;s set up your workspace
              </div>

              <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white">
                A better way to manage your business starts here.
              </h1>

              <p className="mt-6 text-base leading-7 text-slate-400">
                Tell us a little about your company so we can create your
                Trackpr workspace.
              </p>

              <div className="mt-10 space-y-5">
                <Step
                  number="1"
                  title="Your business"
                  description="Create your company workspace"
                  active
                />
                <Step
                  number="2"
                  title="Your workspace"
                  description="Set up your CRM"
                />
                <Step
                  number="3"
                  title="Start tracking"
                  description="Manage your leads and opportunities"
                />
              </div>
            </div>

            <p className="text-sm text-slate-500">
              © 2026 Trackpr
            </p>

            <div className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-40 left-20 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
          </section>

          {/* Form */}
          <section className="flex items-center justify-center px-6 py-12 sm:px-12">
            <div className="w-full max-w-lg">
              <p className="text-sm font-medium text-blue-600">
                Step 1 of 3
              </p>

              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                Tell us about your business
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                We&apos;ll use this information to create your Trackpr
                workspace.
              </p>

              <form onSubmit={handleSubmit} className="mt-10 space-y-5">
                <div>
                  <label
                    htmlFor="companyName"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Company name
                  </label>

                  <input
                    id="companyName"
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="ABC Roofing"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <div>
                  <label
                    htmlFor="industry"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Industry
                  </label>

                  <select
                    id="industry"
                    required
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  >
                    <option value="">Select your industry</option>
                    <option value="roofing">Roofing</option>
                    <option value="hvac">HVAC</option>
                    <option value="plumbing">Plumbing</option>
                    <option value="electrical">Electrical</option>
                    <option value="landscaping">Landscaping</option>
                    <option value="general_contractor">
                      General Contractor
                    </option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Business phone
                  </label>

                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <div>
                  <label
                    htmlFor="website"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Website <span className="text-slate-400">(optional)</span>
                  </label>

                  <input
                    id="website"
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://yourcompany.com"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Creating workspace..." : "Continue"}
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Step({
  number,
  title,
  description,
  active = false,
}: {
  number: string;
  title: string;
  description: string;
  active?: boolean;
}) {
  return (
    <div className="flex items-center gap-4">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
          active
            ? "bg-blue-500 text-white"
            : "border border-white/10 bg-white/5 text-slate-500"
        }`}
      >
        {number}
      </div>

      <div>
        <p
          className={`text-sm font-medium ${
            active ? "text-white" : "text-slate-400"
          }`}
        >
          {title}
        </p>

        <p className="mt-0.5 text-xs text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}