"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Bell,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Contact,
  FileCheck2,
  FileText,
  Home,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  ListChecks,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Receipt,
  Settings,
  Sparkles,
  Target,
  Users,
  Workflow,
  X,
  BriefcaseBusiness,
  CreditCard,
  Star,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";

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
        <div className="text-[20px] font-bold tracking-[-0.04em] text-white">
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
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white ring-1 ring-slate-800">
      {initial}
    </div>
  );
}

export default function AppShell({
  children,
  organizationName,
  userEmail,
}: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

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

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] border-r border-slate-200 bg-slate-950 lg:flex lg:flex-col">
        <div className="flex h-[76px] items-center border-b border-slate-800 px-5">
          <Link href="/dashboard" className="block">
            <TrackprLogo />
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-5">
          <div className="mb-5 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#258BFF]/10 text-[#258BFF]">
                <Home className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Workspace
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold text-white">
                  {organizationName}
                </p>
              </div>

              <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
            </div>
          </div>

          <nav className="space-y-6">
            {navSections.map((section) => (
              <div key={section.label}>
                <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  {section.label}
                </div>

                <div className="space-y-1">
                  {section.items.map((item) => {
                    const active = isActivePath(pathname, item.href);
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                          active
                            ? "bg-[#258BFF]/10 text-white shadow-sm ring-1 ring-[#258BFF]/20"
                            : "text-slate-400 hover:bg-slate-900 hover:text-white"
                        }`}
                      >
                        <Icon
                          className={`h-[18px] w-[18px] shrink-0 transition ${
                            active
                              ? "text-[#258BFF]"
                              : "text-slate-500 group-hover:text-slate-300"
                          }`}
                        />

                        <span className="flex-1">{item.label}</span>

                        {active && (
                          <span className="h-1.5 w-1.5 rounded-full bg-[#258BFF]" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        <div className="border-t border-slate-800 p-3">
          <Link
            href="/settings"
            className={`mb-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              isActivePath(pathname, "/settings")
                ? "bg-[#258BFF]/10 text-white"
                : "text-slate-400 hover:bg-slate-900 hover:text-white"
            }`}
          >
            <Settings
              className={`h-[18px] w-[18px] ${
                isActivePath(pathname, "/settings")
                  ? "text-[#258BFF]"
                  : "text-slate-500"
              }`}
            />
            Settings
          </Link>

          <div className="flex items-center gap-3 rounded-xl bg-slate-900/70 px-3 py-3">
            <UserAvatar email={userEmail} />

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">
                Account
              </p>
              <p className="truncate text-[11px] text-slate-500">
                {userEmail}
              </p>
            </div>

            <MoreHorizontal className="h-4 w-4 shrink-0 text-slate-500" />
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[290px] flex-col bg-slate-950 shadow-2xl transition-transform duration-200 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-[76px] items-center justify-between border-b border-slate-800 px-5">
          <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
            <TrackprLogo />
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-900 hover:text-white"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-5">
          <div className="mb-5 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#258BFF]/10 text-[#258BFF]">
                <Home className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Workspace
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold text-white">
                  {organizationName}
                </p>
              </div>
            </div>
          </div>

          <nav className="space-y-6">
            {navSections.map((section) => (
              <div key={section.label}>
                <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  {section.label}
                </div>

                <div className="space-y-1">
                  {section.items.map((item) => {
                    const active = isActivePath(pathname, item.href);
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                          active
                            ? "bg-[#258BFF]/10 text-white"
                            : "text-slate-400 hover:bg-slate-900 hover:text-white"
                        }`}
                      >
                        <Icon
                          className={`h-[18px] w-[18px] ${
                            active
                              ? "text-[#258BFF]"
                              : "text-slate-500"
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

        <div className="border-t border-slate-800 p-3">
          <Link
            href="/settings"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-slate-900 hover:text-white"
          >
            <Settings className="h-[18px] w-[18px] text-slate-500" />
            Settings
          </Link>
        </div>
      </aside>

      {/* Main Area */}
      <div className="lg:pl-[260px]">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
          <div className="flex h-[76px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 lg:hidden"
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
                <p className="hidden text-xs text-slate-500 sm:block">
                  Contractor workspace
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/leads/new"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 sm:px-4"
              >
                <Target className="h-4 w-4 text-[#258BFF]" />
                <span className="hidden sm:inline">Add Lead</span>
                <span className="sm:hidden">Add</span>
              </Link>

              <button
                type="button"
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                aria-label="Notifications"
              >
                <Bell className="h-[18px] w-[18px]" />
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#258BFF]" />
              </button>

              <div className="hidden sm:block">
                <UserAvatar email={userEmail} />
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