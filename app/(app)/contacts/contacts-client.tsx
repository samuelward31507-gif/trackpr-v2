"use client";

import {
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  Archive,
  Building2,
  ChevronRight,
  Edit3,
  Mail,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";

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

type Props = {
  organizationId: string;
  initialContacts: Contact[];
};

const statusOptions = [
  { value: "all", label: "All contacts" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "archived", label: "Archived" },
];

function getContactName(contact: Contact) {
  const name = [contact.first_name, contact.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || "Unnamed Contact";
}

function getInitials(contact: Contact) {
  const first = contact.first_name?.charAt(0) ?? "";
  const last = contact.last_name?.charAt(0) ?? "";

  const initials = `${first}${last}`.toUpperCase();

  if (initials) return initials;

  if (contact.company_name) {
    return contact.company_name.slice(0, 2).toUpperCase();
  }

  return "??";
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export default function ContactsClient({
  organizationId,
  initialContacts,
}: Props) {
  const [contacts, setContacts] =
    useState<Contact[]>(initialContacts);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showCreate, setShowCreate] = useState(false);
  const [editingContact, setEditingContact] =
    useState<Contact | null>(null);

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    company_name: "",
    phone: "",
    email: "",
    status: "active",
    notes: "",
  });

  const filteredContacts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return contacts.filter((contact) => {
      const matchesStatus =
        statusFilter === "all" ||
        contact.status === statusFilter;

      if (!matchesStatus) return false;

      if (!query) return true;

      const searchable = [
        contact.first_name,
        contact.last_name,
        contact.company_name,
        contact.phone,
        contact.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [contacts, search, statusFilter]);

  const activeCount = contacts.filter(
    (contact) => contact.status === "active"
  ).length;

  const inactiveCount = contacts.filter(
    (contact) => contact.status === "inactive"
  ).length;

  const archivedCount = contacts.filter(
    (contact) => contact.status === "archived"
  ).length;

  function resetForm() {
    setForm({
      first_name: "",
      last_name: "",
      company_name: "",
      phone: "",
      email: "",
      status: "active",
      notes: "",
    });
  }

  function openCreate() {
    setError("");
    resetForm();
    setEditingContact(null);
    setOpenMenu(null);
    setShowCreate(true);
  }

  function openEdit(contact: Contact) {
    setError("");
    setEditingContact(contact);
    setShowCreate(false);
    setOpenMenu(null);

    setForm({
      first_name: contact.first_name ?? "",
      last_name: contact.last_name ?? "",
      company_name: contact.company_name ?? "",
      phone: contact.phone ?? "",
      email: contact.email ?? "",
      status: contact.status,
      notes: contact.notes ?? "",
    });
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      const payload = {
        organization_id: organizationId,
        first_name: form.first_name.trim() || null,
        last_name: form.last_name.trim() || null,
        company_name: form.company_name.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        status: form.status,
        notes: form.notes.trim() || null,
      };

      if (editingContact) {
        const response = await fetch("/api/contacts", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: editingContact.id,
            ...payload,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result?.error || "Unable to update contact."
          );
        }

        setContacts((current) =>
          current.map((contact) =>
            contact.id === editingContact.id
              ? result.contact
              : contact
          )
        );
      } else {
        const response = await fetch("/api/contacts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result?.error || "Unable to create contact."
          );
        }

        setContacts((current) => [
          result.contact,
          ...current,
        ]);
      }

      setShowCreate(false);
      setEditingContact(null);
      resetForm();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(contact: Contact) {
    const name = getContactName(contact);

    const confirmed = window.confirm(
      `Delete ${name}? This cannot be undone.`
    );

    if (!confirmed) return;

    setDeleting(contact.id);
    setError("");
    setOpenMenu(null);

    try {
      const response = await fetch("/api/contacts", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: contact.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error || "Unable to delete contact."
        );
      }

      setContacts((current) =>
        current.filter(
          (item) => item.id !== contact.id
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setDeleting(null);
    }
  }

  function closeModal() {
    if (saving) return;

    setShowCreate(false);
    setEditingContact(null);
    setError("");
    resetForm();
  }

  const hasFilters =
    search.trim().length > 0 || statusFilter !== "all";

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">

        {/* Header */}
        <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              <Users size={15} />
              Customer management
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              Contacts
            </h1>

            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
              Keep customer information organized and accessible
              across your entire business.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.99]"
          >
            <Plus size={17} />
            Add contact
          </button>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard
            label="Total contacts"
            value={contacts.length}
            icon={<Users size={17} />}
          />

          <StatCard
            label="Active"
            value={activeCount}
            icon={<UserRound size={17} />}
            accent="emerald"
          />

          <StatCard
            label="Inactive"
            value={inactiveCount}
            icon={<Archive size={17} />}
            accent="amber"
          />

          <StatCard
            label="Archived"
            value={archivedCount}
            icon={<Archive size={17} />}
            accent="slate"
          />
        </div>

        {/* Toolbar */}
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search name, company, phone, or email..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
              />

              {search && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center text-slate-400 transition hover:text-slate-700"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setStatusFilter(option.value)
                  }
                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    statusFilter === option.value
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {hasFilters && (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5">
              <p className="text-xs text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-700">
                  {filteredContacts.length}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-700">
                  {contacts.length}
                </span>{" "}
                contacts
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
                className="text-xs font-semibold text-slate-600 transition hover:text-slate-950"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              className="shrink-0 text-red-400 hover:text-red-700"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Desktop */}
        <div className="hidden overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
          <div className="overflow-x-auto rounded-2xl">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    Contact
                  </th>

                  <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    Company
                  </th>

                  <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    Contact info
                  </th>

                  <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    Status
                  </th>

                  <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    Added
                  </th>

                  <th className="w-14 px-3 py-3.5" />
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredContacts.map((contact) => (
                  <tr
                    key={contact.id}
                    className="group transition-colors hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-4">
                      <Link
                        href={`/contacts/${contact.id}`}
                        className="flex items-center gap-3"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                          {getInitials(contact)}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-semibold text-slate-900">
                              {getContactName(contact)}
                            </span>

                            <ChevronRight
                              size={13}
                              className="shrink-0 text-slate-300 opacity-0 transition group-hover:opacity-100"
                            />
                          </div>

                          {contact.email && (
                            <div className="mt-0.5 max-w-[230px] truncate text-xs text-slate-400">
                              {contact.email}
                            </div>
                          )}
                        </div>
                      </Link>
                    </td>

                    <td className="px-5 py-4">
                      {contact.company_name ? (
                        <div className="flex max-w-[190px] items-center gap-2">
                          <Building2
                            size={15}
                            className="shrink-0 text-slate-400"
                          />

                          <span className="truncate text-sm text-slate-600">
                            {contact.company_name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-300">
                          —
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="space-y-1.5">
                        {contact.phone && (
                          <a
                            href={`tel:${contact.phone}`}
                            onClick={(event) =>
                              event.stopPropagation()
                            }
                            className="flex items-center gap-2 text-xs text-slate-600 transition hover:text-slate-950"
                          >
                            <Phone
                              size={13}
                              className="text-slate-400"
                            />
                            {contact.phone}
                          </a>
                        )}

                        {contact.email && (
                          <a
                            href={`mailto:${contact.email}`}
                            onClick={(event) =>
                              event.stopPropagation()
                            }
                            className="flex max-w-[240px] items-center gap-2 text-xs text-slate-600 transition hover:text-slate-950"
                          >
                            <Mail
                              size={13}
                              className="shrink-0 text-slate-400"
                            />
                            <span className="truncate">
                              {contact.email}
                            </span>
                          </a>
                        )}

                        {!contact.phone &&
                          !contact.email && (
                            <span className="text-xs text-slate-300">
                              No contact info
                            </span>
                          )}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={contact.status} />
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-500">
                      {formatDate(contact.created_at)}
                    </td>

                    <td className="relative px-3 py-4">
                      <button
                        type="button"
                        aria-label={`Actions for ${getContactName(
                          contact
                        )}`}
                        onClick={() =>
                          setOpenMenu(
                            openMenu === contact.id
                              ? null
                              : contact.id
                          )
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100 focus:opacity-100"
                      >
                        <MoreHorizontal size={17} />
                      </button>

                      {openMenu === contact.id && (
                        <ContactMenu
                          contact={contact}
                          deleting={
                            deleting === contact.id
                          }
                          onEdit={() =>
                            openEdit(contact)
                          }
                          onDelete={() =>
                            handleDelete(contact)
                          }
                          onClose={() =>
                            setOpenMenu(null)
                          }
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredContacts.length === 0 && (
            <EmptyState
              search={search}
              hasFilters={hasFilters}
              onAdd={openCreate}
              onClear={() => {
                setSearch("");
                setStatusFilter("all");
              }}
            />
          )}
        </div>

        {/* Mobile */}
        <div className="space-y-3 md:hidden">
          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/contacts/${contact.id}`}
                    className="flex min-w-0 items-center gap-3"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                      {getInitials(contact)}
                    </div>

                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-950">
                        {getContactName(contact)}
                      </div>

                      {contact.company_name && (
                        <div className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-slate-500">
                          <Building2
                            size={12}
                            className="shrink-0"
                          />
                          {contact.company_name}
                        </div>
                      )}
                    </div>
                  </Link>

                  <button
                    type="button"
                    aria-label={`Actions for ${getContactName(
                      contact
                    )}`}
                    onClick={() =>
                      setOpenMenu(
                        openMenu === contact.id
                          ? null
                          : contact.id
                      )
                    }
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <MoreHorizontal size={17} />
                  </button>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3">
                  <div className="grid gap-2">
                    {contact.phone && (
                      <a
                        href={`tel:${contact.phone}`}
                        className="flex items-center gap-2 text-xs text-slate-600"
                      >
                        <Phone
                          size={13}
                          className="text-slate-400"
                        />
                        {contact.phone}
                      </a>
                    )}

                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        className="flex min-w-0 items-center gap-2 text-xs text-slate-600"
                      >
                        <Mail
                          size={13}
                          className="shrink-0 text-slate-400"
                        />

                        <span className="truncate">
                          {contact.email}
                        </span>
                      </a>
                    )}

                    {!contact.phone &&
                      !contact.email && (
                        <span className="text-xs text-slate-300">
                          No contact information
                        </span>
                      )}
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <StatusBadge
                      status={contact.status}
                    />

                    <span className="text-[11px] text-slate-400">
                      Added{" "}
                      {formatDate(contact.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              {openMenu === contact.id && (
                <div className="flex gap-2 border-t border-slate-100 bg-slate-50/70 p-3">
                  <button
                    type="button"
                    onClick={() => openEdit(contact)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
                  >
                    <Edit3 size={14} />
                    Edit
                  </button>

                  <button
                    type="button"
                    disabled={deleting === contact.id}
                    onClick={() => handleDelete(contact)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-600 ring-1 ring-red-100 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    {deleting === contact.id
                      ? "Deleting..."
                      : "Delete"}
                  </button>
                </div>
              )}
            </div>
          ))}

          {filteredContacts.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <EmptyState
                search={search}
                hasFilters={hasFilters}
                onAdd={openCreate}
                onClear={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit modal */}
      {(showCreate || editingContact) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {/* Modal header */}
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    {editingContact ? (
                      <Edit3 size={15} />
                    ) : (
                      <UserRound size={15} />
                    )}
                  </div>

                  <h2 className="text-base font-semibold text-slate-950">
                    {editingContact
                      ? "Edit contact"
                      : "Add contact"}
                  </h2>
                </div>

                <p className="text-xs text-slate-500">
                  {editingContact
                    ? "Update this customer's information."
                    : "Create a customer record for your business."}
                </p>
              </div>

              <button
                type="button"
                aria-label="Close"
                onClick={closeModal}
                disabled={saving}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X size={17} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="max-h-[80vh] overflow-y-auto"
            >
              <div className="space-y-5 p-5 sm:p-6">
                {/* Name */}
                <div>
                  <SectionLabel label="Customer" />

                  <div className="mt-2 grid gap-4 sm:grid-cols-2">
                    <Field
                      label="First name"
                      value={form.first_name}
                      onChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          first_name: value,
                        }))
                      }
                      placeholder="John"
                      autoComplete="given-name"
                    />

                    <Field
                      label="Last name"
                      value={form.last_name}
                      onChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          last_name: value,
                        }))
                      }
                      placeholder="Smith"
                      autoComplete="family-name"
                    />
                  </div>
                </div>

                {/* Business */}
                <div>
                  <SectionLabel label="Business" />

                  <div className="mt-2">
                    <Field
                      label="Company"
                      value={form.company_name}
                      onChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          company_name: value,
                        }))
                      }
                      placeholder="Smith Electric"
                      autoComplete="organization"
                    />
                  </div>
                </div>

                {/* Contact */}
                <div>
                  <SectionLabel label="Contact information" />

                  <div className="mt-2 grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Phone"
                      value={form.phone}
                      onChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          phone: value,
                        }))
                      }
                      placeholder="(555) 555-5555"
                      type="tel"
                      autoComplete="tel"
                    />

                    <Field
                      label="Email"
                      value={form.email}
                      onChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          email: value,
                        }))
                      }
                      placeholder="john@example.com"
                      type="email"
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Status */}
                <div>
                  <SectionLabel label="Relationship" />

                  <div className="mt-2">
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Status
                    </label>

                    <select
                      value={form.status}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          status: event.target.value,
                        }))
                      }
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
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
                </div>

                {/* Notes */}
                <div>
                  <SectionLabel label="Internal notes" />

                  <div className="mt-2">
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Notes
                    </label>

                    <textarea
                      value={form.notes}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          notes: event.target.value,
                        }))
                      }
                      placeholder="Add useful customer notes..."
                      rows={4}
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex min-w-[120px] items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingContact
                      ? "Save changes"
                      : "Create contact"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent = "slate",
}: {
  label: string;
  value: number;
  icon: ReactNode;
  accent?: "slate" | "emerald" | "amber";
}) {
  const styles = {
    slate: "bg-slate-100 text-slate-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div
        className={`mb-4 flex h-8 w-8 items-center justify-center rounded-lg ${styles[accent]}`}
      >
        {icon}
      </div>

      <div className="text-2xl font-semibold tracking-tight text-slate-950">
        {value}
      </div>

      <div className="mt-1 text-xs font-medium text-slate-500">
        {label}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config =
    status === "active"
      ? {
          label: "Active",
          className:
            "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
          dot: "bg-emerald-500",
        }
      : status === "inactive"
        ? {
            label: "Inactive",
            className:
              "bg-amber-50 text-amber-700 ring-amber-600/10",
            dot: "bg-amber-500",
          }
        : {
            label: "Archived",
            className:
              "bg-slate-100 text-slate-500 ring-slate-500/10",
            dot: "bg-slate-400",
          };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${config.className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${config.dot}`}
      />
      {config.label}
    </span>
  );
}

function ContactMenu({
  contact,
  deleting,
  onEdit,
  onDelete,
  onClose,
}: {
  contact: Contact;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute right-3 top-12 z-40 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-950/10">
      <Link
        href={`/contacts/${contact.id}`}
        onClick={onClose}
        className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        <ChevronRight size={14} />
        View contact
      </Link>

      <button
        type="button"
        onClick={onEdit}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        <Edit3 size={14} />
        Edit contact
      </button>

      <div className="my-1 border-t border-slate-100" />

      <button
        type="button"
        disabled={deleting}
        onClick={onDelete}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
      >
        <Trash2 size={14} />
        {deleting ? "Deleting..." : "Delete"}
      </button>
    </div>
  );
}

function EmptyState({
  search,
  hasFilters,
  onAdd,
  onClear,
}: {
  search: string;
  hasFilters: boolean;
  onAdd: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 ring-1 ring-slate-200">
        <Users size={23} />
      </div>

      <h3 className="text-sm font-semibold text-slate-900">
        {hasFilters
          ? "No contacts match your filters"
          : "No contacts yet"}
      </h3>

      <p className="mt-1.5 max-w-sm text-xs leading-5 text-slate-500">
        {hasFilters
          ? search
            ? "Try a different name, company, phone number, email, or clear your filters."
            : "Try changing the status filter or clear your filters."
          : "Add your first contact to start building your customer database."}
      </p>

      {hasFilters ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          Clear filters
        </button>
      ) : (
        <button
          type="button"
          onClick={onAdd}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          <Plus size={15} />
          Add contact
        </button>
      )}
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
      {label}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
      />
    </div>
  );
}