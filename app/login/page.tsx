"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-950">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Left branding panel */}
        <section className="relative hidden overflow-hidden border-r border-white/10 bg-slate-950 p-12 lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-lg font-bold text-white shadow-lg shadow-blue-500/20">
                T
              </div>

              <span className="text-xl font-semibold tracking-tight text-white">
                Trackpr
              </span>
            </div>
          </div>

          <div className="max-w-lg">
            <div className="mb-6 inline-flex items-center rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
              Built for contractors
            </div>

            <h1 className="text-5xl font-semibold leading-tight tracking-tight text-white">
              Turn every lead into your next opportunity.
            </h1>

            <p className="mt-6 text-lg leading-8 text-slate-400">
              Track leads, manage opportunities, follow up faster, and keep
              your entire sales pipeline organized in one place.
            </p>

            <div className="mt-10 space-y-5">
              <Feature text="Never lose track of a new lead" />
              <Feature text="Keep every conversation organized" />
              <Feature text="Know exactly what needs attention next" />
            </div>
          </div>

          <p className="text-sm text-slate-500">
            © 2026 Trackpr. Built for growing contractors.
          </p>

          <div className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-40 left-20 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
        </section>

        {/* Login panel */}
        <section className="flex min-h-screen items-center justify-center bg-white px-6 py-12">
          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <div className="mb-12 flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white">
                T
              </div>

              <span className="text-xl font-semibold tracking-tight text-slate-950">
                Trackpr
              </span>
            </div>

            <div>
              <p className="text-sm font-medium text-blue-600">
                Welcome back
              </p>

              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                Sign in to your workspace
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Enter your details below to access your Trackpr account.
              </p>
            </div>

            <form onSubmit={handleLogin} className="mt-10 space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Email address
                </label>

                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-slate-700"
                  >
                    Password
                  </label>

                  <button
                    type="button"
                    className="text-sm font-medium text-blue-600 transition hover:text-blue-700"
                  >
                    Forgot password?
                  </button>
                </div>

                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-950/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign in to Trackpr"}
              </button>
            </form>

            <div className="my-8 flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs text-slate-400">SECURE ACCESS</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <p className="text-center text-sm text-slate-500">
              Don&apos;t have an account yet?{" "}
              <button
                type="button"
                onClick={() => router.push("/signup")}
                className="font-medium text-blue-600 transition hover:text-blue-700"
              >
                Create an account
              </button>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-slate-300">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-xs font-semibold text-blue-400">
        ✓
      </div>

      {text}
    </div>
  );
}