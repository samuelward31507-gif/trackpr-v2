"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Contact,
  FileText,
  Home,
  KanbanSquare,
  LayoutDashboard,
  ListChecks,
  Menu,
  MessageSquare,
  Settings,
  Sparkles,
  Target,
  Workflow,
  X,
  BriefcaseBusiness,
  CreditCard,
  Star,
  BarChart3,
  LogOut,
  UserRound,
  Building2,
  Check,
  CalendarCheck2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AppShellProps = {
  children: React.ReactNode;
  organizationName: string;
  userEmail: string;
};

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    label: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "CRM",
    items: [
      {
        label: "Leads",
        href: "/leads",
        icon: Target,
      },
      {
        label: "Pipeline",
        href: "/pipeline",
        icon: KanbanSquare,
      },
      {
        label: "Follow-ups",
        href: "/follow-ups",
        icon: ListChecks,
      },
      {
        label: "Contacts",
        href: "/contacts",
        icon: Contact,
      },
      {
        label: "Conversations",
        href: "/conversations",
        icon: MessageSquare,
      },
      {
        label: "Tasks",
        href: "/tasks",
        icon: ClipboardList,
      },
      {
        label: "Calendar",
        href: "/calendar",
        icon: CalendarDays,
      },
      {
        label: "Appointments",
        href: "/appointments",
        icon: CalendarCheck2,
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        label: "Estimates",
        href: "/estimates",
        icon: FileText,
      },
      {
        label: "Jobs",
        href: "/jobs",
        icon: BriefcaseBusiness,
      },
      {
        label: "Payments",
        href: "/payments",
        icon: CreditCard,
      },
      {
        label: "Reviews",
        href: "/reviews",
        icon: Star,
      },
    ],
  },
  {
    label: "Automation",
    items: [
      {
        label: "Workflows",
        href: "/workflows",
        icon: Workflow,
      },
      {
        label: "AI Agents",
        href: "/ai-agents",
        icon: Sparkles,
      },
    ],
  },
  {
    label: "Analytics",
    items: [
      {
        label: "Reporting",
        href: "/reporting",
        icon: BarChart3,
      },
    ],
  },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function TrackprLogo({
  compact = false,
}: {
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-slate-950 shadow-sm ring-1 ring-slate-800">
        <div className="relative flex h-full w-full items-center justify-center">
          <div className="absolute left-[7px] top-[9px] h-[5px] w-[25px] rounded-sm bg-[#258BFF]" />
          <div className="absolute left-[14px] top-[14px] h-[5px] w-[18px] rotate-[42deg] rounded-sm bg-[#258BFF]" />
          <div className="absolute left-[11px] top-[19px] h-[5px] w-[17px] rotate-[132deg] rounded-sm bg-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-950 shadow-sm ring-1 ring-slate-800">
        <div className="relative flex h-full w-full items-center justify-center">
          <div className="absolute left-[7px] top-[9px] h-[5px] w-[25px] rounded-sm bg-[#258BFF]" />
          <div className="absolute left-[14px] top-[14px] h-[5px] w-[18px] rotate-[42deg] rounded-sm bg-[#258BFF]" />
          <div className="absolute left-[11px] top-[19px] h-[5px] w-[17px] rotate-[132deg] rounded-sm bg-white" />
        </div>
      </div>

      <div className="leading-none">
        <div className="text-[20px] font-bold tracking-[-0.045em] text-white">
          Track<span className="text-[#258BFF]">pr</span>
        </div>

        <div className="mt-1 text-[8px] font-semibold tracking-[0.16em] text-slate-400">
          MORE LEADS. MORE JOBS.
        </div>
      </div>
    </div>
  );
}

function UserAvatar({ email }: { email: string }) {
  const initial = email?.charAt(0)?.toUpperCase() || "U";

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-950 text-sm font-semibold text-white shadow-sm ring-1 ring-slate-700">
      {initial}
    </div>
  );
}

function SidebarUserMenu({
  userEmail,
  organizationName,
  onSignOut,
}: {
  userEmail: string;
  organizationName: string;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClick(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);

    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      {open && (
        <div className="absolute bottom-[calc(100%+10px)] left-0 right-0 z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl shadow-slate-950/10">
          <div className="border-b border-slate-100 px-3 py-3">
            <p className="text-xs font-semibold text-slate-900">
              Signed in as
            </p>

            <p className="mt-1 truncate text-[11px] text-slate-500">
              {userEmail}
            </p>
          </div>

          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <UserRound className="h-4 w-4 text-slate-400" />
            Account settings
          </Link>

          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <Building2 className="h-4 w-4 text-slate-400" />
            Workspace settings
          </Link>

          <div className="my-1 border-t border-slate-100" />

          <button
            type="button"
            onClick={onSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`group flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
          open
            ? "border-slate-700 bg-slate-900"
            : "border-slate-800 bg-slate-900/70 hover:border-slate-700 hover:bg-slate-900"
        }`}
        aria-expanded={open}
        aria-label="Open account menu"
      >
        <UserAvatar email={userEmail} />

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-white">
            Account
          </p>

          <p className="truncate text-[11px] text-slate-500">
            {userEmail}
          </p>
        </div>

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${
            open ? "rotate-180 text-slate-300" : ""
          }`}
        />
      </button>
    </div>
  );
}

function TopBarUserMenu({
  userEmail,
  onSignOut,
}: {
  userEmail: string;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClick(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);

    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="rounded-full outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#258BFF]/40"
        aria-label="Open account menu"
        aria-expanded={open}
      >
        <UserAvatar email={userEmail} />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl shadow-slate-950/10">
          <div className="flex items-center gap-3 px-3 py-3">
            <UserAvatar email={userEmail} />

            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">
                Account
              </p>

              <p className="truncate text-[11px] text-slate-500">
                {userEmail}
              </p>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-1">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <Settings className="h-4 w-4 text-slate-400" />
              Settings
            </Link>

            <button
              type="button"
              onClick={onSignOut}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AppShell({
  children,
  organizationName,
  userEmail,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [mobileOpen]);

  async function handleSignOut() {
    if (signingOut) return;

    setSigningOut(true);

    const supabase = createClient();

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }

    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      {/* =========================================================
          DESKTOP SIDEBAR
      ========================================================= */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[268px] border-r border-slate-800/80 bg-slate-950 lg:flex lg:flex-col">
        {/* Logo */}
        <div className="flex h-[76px] items-center border-b border-slate-800/80 px-5">
          <Link
            href="/dashboard"
            className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#258BFF]/50"
          >
            <TrackprLogo />
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-800">
          {/* Workspace */}
          <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#258BFF]/10 text-[#258BFF] ring-1 ring-[#258BFF]/10">
                <Home className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Workspace
                </p>

                <p className="mt-1 truncate text-sm font-semibold text-white">
                  {organizationName}
                </p>
              </div>

              <ChevronDown className="h-4 w-4 shrink-0 text-slate-600" />
            </div>
          </div>

          <nav className="space-y-7">
            {navSections.map((section) => (
              <div key={section.label}>
                <div className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.19em] text-slate-600">
                  {section.label}
                </div>

                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = isActivePath(pathname, item.href);
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-150 ${
                          active
                            ? "bg-[#258BFF]/10 text-white shadow-sm ring-1 ring-[#258BFF]/15"
                            : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                        }`}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[#258BFF]" />
                        )}

                        <Icon
                          className={`h-[17px] w-[17px] shrink-0 transition-colors ${
                            active
                              ? "text-[#258BFF]"
                              : "text-slate-600 group-hover:text-slate-300"
                          }`}
                        />

                        <span className="flex-1">{item.label}</span>

                        {active ? (
                          <Check className="h-3.5 w-3.5 text-[#258BFF]/70" />
                        ) : (
                          <ChevronRight className="h-3 w-3 text-transparent transition group-hover:text-slate-700" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom */}
        <div className="border-t border-slate-800/80 p-3">
          <Link
            href="/settings"
            className={`mb-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition ${
              isActivePath(pathname, "/settings")
                ? "bg-[#258BFF]/10 text-white ring-1 ring-[#258BFF]/15"
                : "text-slate-400 hover:bg-slate-900 hover:text-white"
            }`}
          >
            <Settings
              className={`h-[17px] w-[17px] ${
                isActivePath(pathname, "/settings")
                  ? "text-[#258BFF]"
                  : "text-slate-600"
              }`}
            />

            Settings
          </Link>

          <SidebarUserMenu
            userEmail={userEmail}
            organizationName={organizationName}
            onSignOut={handleSignOut}
          />
        </div>
      </aside>

      {/* =========================================================
          MOBILE OVERLAY
      ========================================================= */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* =========================================================
          MOBILE SIDEBAR
      ========================================================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[292px] flex-col bg-slate-950 shadow-2xl transition-transform duration-200 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-[76px] items-center justify-between border-b border-slate-800/80 px-5">
          <Link
            href="/dashboard"
            onClick={() => setMobileOpen(false)}
          >
            <TrackprLogo />
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-900 hover:text-white"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-5">
          <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#258BFF]/10 text-[#258BFF]">
                <Home className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Workspace
                </p>

                <p className="mt-1 truncate text-sm font-semibold text-white">
                  {organizationName}
                </p>
              </div>
            </div>
          </div>

          <nav className="space-y-7">
            {navSections.map((section) => (
              <div key={section.label}>
                <div className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.19em] text-slate-600">
                  {section.label}
                </div>

                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = isActivePath(pathname, item.href);
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition ${
                          active
                            ? "bg-[#258BFF]/10 text-white ring-1 ring-[#258BFF]/15"
                            : "text-slate-400 hover:bg-slate-900 hover:text-white"
                        }`}
                      >
                        <Icon
                          className={`h-[17px] w-[17px] shrink-0 ${
                            active
                              ? "text-[#258BFF]"
                              : "text-slate-600"
                          }`}
                        />

                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        <div className="border-t border-slate-800/80 p-3">
          <Link
            href="/settings"
            onClick={() => setMobileOpen(false)}
            className={`mb-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition ${
              isActivePath(pathname, "/settings")
                ? "bg-[#258BFF]/10 text-white"
                : "text-slate-400 hover:bg-slate-900 hover:text-white"
            }`}
          >
            <Settings
              className={`h-[17px] w-[17px] ${
                isActivePath(pathname, "/settings")
                  ? "text-[#258BFF]"
                  : "text-slate-600"
              }`}
            />

            Settings
          </Link>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-slate-400 transition hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogOut className="h-[17px] w-[17px]" />
            {signingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </aside>

      {/* =========================================================
          MAIN AREA
      ========================================================= */}
      <div className="lg:pl-[268px]">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
          <div className="flex h-[76px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            {/* Left */}
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="hidden sm:block lg:hidden">
                <TrackprLogo compact />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {organizationName}
                </p>

                <div className="mt-0.5 hidden items-center gap-1.5 sm:flex">
                  <span className="text-xs text-slate-500">
                    Contractor workspace
                  </span>

                  <span className="h-1 w-1 rounded-full bg-slate-300" />

                  <span className="text-xs font-medium text-emerald-600">
                    Active
                  </span>
                </div>
              </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/leads/new"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 hover:shadow-md sm:px-4"
              >
                <Target className="h-4 w-4 text-[#258BFF]" />

                <span className="hidden sm:inline">
                  Add Lead
                </span>

                <span className="sm:hidden">
                  Add
                </span>
              </Link>

              <button
                type="button"
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                aria-label="Notifications"
              >
                <Bell className="h-[18px] w-[18px]" />

                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#258BFF] ring-2 ring-white" />
              </button>

              <div className="hidden sm:block">
                <TopBarUserMenu
                  userEmail={userEmail}
                  onSignOut={handleSignOut}
                />
              </div>
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-76px)]">
          {children}
        </main>
      </div>
    </div>
  );
}