"use client";

import {
  Archive,
  ArrowLeft,
  Check,
  CheckCheck,
  ChevronRight,
  Circle,
  Edit3,
  Inbox,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Send,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

type Lead = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  status: string | null;
  created_at: string;
};

type Conversation = {
  id: string;
  organization_id: string;
  lead_id: string | null;
  channel: string;
  status: string;
  subject: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
  lead: Lead | null;
};

type Message = {
  id: string;
  organization_id: string;
  conversation_id: string;
  lead_id: string | null;
  direction: "inbound" | "outbound";
  channel: string;
  body: string;
  sender_name: string | null;
  sender_phone: string | null;
  sender_email: string | null;
  is_read: boolean;
  external_message_id: string | null;
  sent_at: string;
  created_at: string;
};

type Props = {
  conversations: Conversation[];
  messages: Message[];
  organizationId: string;
};

function getLeadName(lead: Lead | null) {
  if (!lead) return "Unknown Contact";

  const name = [lead.first_name, lead.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || "Unknown Contact";
}

function getInitials(lead: Lead | null) {
  const name = getLeadName(lead);

  if (name === "Unknown Contact") return "?";

  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatConversationTime(value: string | null) {
  if (!value) return "";

  const date = new Date(value);
  const now = new Date();

  const sameDay =
    date.toDateString() === now.toDateString();

  if (sameDay) {
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  const difference =
    now.getTime() - date.getTime();

  const days = Math.floor(
    difference / (1000 * 60 * 60 * 24)
  );

  if (days < 7) {
    return date.toLocaleDateString([], {
      weekday: "short",
    });
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatMessageDate(value: string) {
  const date = new Date(value);
  const now = new Date();

  if (date.toDateString() === now.toDateString()) {
    return "Today";
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (
    date.toDateString() ===
    yesterday.toDateString()
  ) {
    return "Yesterday";
  }

  return date.toLocaleDateString([], {
    month: "long",
    day: "numeric",
    year:
      date.getFullYear() !== now.getFullYear()
        ? "numeric"
        : undefined,
  });
}

function channelLabel(channel: string) {
  switch (channel) {
    case "sms":
      return "SMS";
    case "email":
      return "Email";
    case "phone":
      return "Phone";
    default:
      return "Other";
  }
}

function ChannelIcon({
  channel,
  size = 16,
}: {
  channel: string;
  size?: number;
}) {
  if (channel === "email") {
    return <Mail size={size} />;
  }

  if (channel === "phone") {
    return <Phone size={size} />;
  }

  return <MessageSquare size={size} />;
}

function statusLabel(status: string) {
  switch (status) {
    case "open":
      return "Open";
    case "closed":
      return "Closed";
    case "archived":
      return "Archived";
    default:
      return status;
  }
}

function statusClasses(status: string) {
  switch (status) {
    case "open":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "archived":
      return "bg-red-50 text-red-700 ring-red-200";
    default:
      return "bg-slate-100 text-slate-500 ring-slate-200";
  }
}

function sameMessageDay(
  first: string,
  second: string
) {
  return (
    new Date(first).toDateString() ===
    new Date(second).toDateString()
  );
}

export default function ConversationsClient({
  conversations: initialConversations,
  messages: initialMessages,
  organizationId,
}: Props) {
  const supabase = createClient();

  const [conversations, setConversations] =
    useState<Conversation[]>(
      initialConversations
    );

  const [messages, setMessages] =
    useState<Message[]>(initialMessages);

  const [
    selectedConversationId,
    setSelectedConversationId,
  ] = useState<string | null>(
    initialConversations[0]?.id ?? null
  );

  const [search, setSearch] = useState("");

  const [filter, setFilter] = useState<
    "all" | "open" | "closed" | "unread"
  >("all");

  const [messageText, setMessageText] =
    useState("");

  const [sending, setSending] =
    useState(false);

  const [mobileView, setMobileView] =
    useState<"list" | "conversation">(
      "list"
    );

  const [editingConversation, setEditingConversation] =
    useState(false);

  const [editSubject, setEditSubject] =
    useState("");

  const [editChannel, setEditChannel] =
    useState("sms");

  const [editStatus, setEditStatus] =
    useState("open");

  const [savingConversation, setSavingConversation] =
    useState(false);

  const [creatingConversation, setCreatingConversation] =
    useState(false);

  const selectedConversation = useMemo(
    () =>
      conversations.find(
        (conversation) =>
          conversation.id ===
          selectedConversationId
      ) ?? null,
    [
      conversations,
      selectedConversationId,
    ]
  );

  const selectedMessages = useMemo(
    () =>
      messages
        .filter(
          (message) =>
            message.conversation_id ===
            selectedConversationId
        )
        .sort(
          (a, b) =>
            new Date(a.sent_at).getTime() -
            new Date(b.sent_at).getTime()
        ),
    [messages, selectedConversationId]
  );

  const filteredConversations = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase();

    return conversations
      .filter((conversation) => {
        const leadName = getLeadName(
          conversation.lead
        ).toLowerCase();

        const phone =
          conversation.lead?.phone?.toLowerCase() ??
          "";

        const email =
          conversation.lead?.email?.toLowerCase() ??
          "";

        const preview =
          conversation.last_message_preview?.toLowerCase() ??
          "";

        const subject =
          conversation.subject?.toLowerCase() ??
          "";

        const matchesSearch =
          !normalizedSearch ||
          leadName.includes(
            normalizedSearch
          ) ||
          phone.includes(
            normalizedSearch
          ) ||
          email.includes(
            normalizedSearch
          ) ||
          preview.includes(
            normalizedSearch
          ) ||
          subject.includes(
            normalizedSearch
          );

        const matchesFilter =
          filter === "all" ||
          (filter === "unread" &&
            conversation.unread_count > 0) ||
          conversation.status === filter;

        return (
          matchesSearch &&
          matchesFilter
        );
      })
      .sort((a, b) => {
        const aTime = a.last_message_at
          ? new Date(
              a.last_message_at
            ).getTime()
          : new Date(
              a.created_at
            ).getTime();

        const bTime = b.last_message_at
          ? new Date(
              b.last_message_at
            ).getTime()
          : new Date(
              b.created_at
            ).getTime();

        return bTime - aTime;
      });
  }, [
    conversations,
    search,
    filter,
  ]);

  const unreadTotal = useMemo(
    () =>
      conversations.reduce(
        (total, conversation) =>
          total +
          Number(
            conversation.unread_count || 0
          ),
        0
      ),
    [conversations]
  );

  const openTotal = useMemo(
    () =>
      conversations.filter(
        (conversation) =>
          conversation.status === "open"
      ).length,
    [conversations]
  );

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const conversationId =
      params.get("conversation");

    if (!conversationId) return;

    const conversation =
      conversations.find(
        (item) =>
          item.id === conversationId
      );

    if (!conversation) return;

    void selectConversation(
      conversation
    );
  }, [conversations]);

  async function selectConversation(
    conversation: Conversation
  ) {
    setSelectedConversationId(
      conversation.id
    );

    setMobileView("conversation");

    if (conversation.unread_count > 0) {
      const { error } =
        await supabase
          .from("conversations")
          .update({
            unread_count: 0,
          })
          .eq(
            "id",
            conversation.id
          );

      if (!error) {
        setConversations(
          (current) =>
            current.map((item) =>
              item.id ===
              conversation.id
                ? {
                    ...item,
                    unread_count: 0,
                  }
                : item
            )
        );
      }
    }

    const unreadMessageIds =
      messages
        .filter(
          (message) =>
            message.conversation_id ===
              conversation.id &&
            message.direction ===
              "inbound" &&
            !message.is_read
        )
        .map(
          (message) => message.id
        );

    if (
      unreadMessageIds.length > 0
    ) {
      const { error } =
        await supabase
          .from("messages")
          .update({
            is_read: true,
          })
          .in(
            "id",
            unreadMessageIds
          );

      if (!error) {
        setMessages(
          (current) =>
            current.map((message) =>
              unreadMessageIds.includes(
                message.id
              )
                ? {
                    ...message,
                    is_read: true,
                  }
                : message
            )
        );
      }
    }
  }

  async function sendMessage(
    event: FormEvent
  ) {
    event.preventDefault();

    const body =
      messageText.trim();

    if (
      !body ||
      !selectedConversation ||
      sending
    ) {
      return;
    }

    setSending(true);

    const now =
      new Date().toISOString();

    const { data, error } =
      await supabase
        .from("messages")
        .insert({
          organization_id:
            organizationId,
          conversation_id:
            selectedConversation.id,
          lead_id:
            selectedConversation.lead_id,
          direction: "outbound",
          channel:
            selectedConversation.channel,
          body,
          sender_name: "You",
          sender_phone: null,
          sender_email: null,
          is_read: true,
          sent_at: now,
        })
        .select()
        .single();

    if (error) {
      console.error(
        "Error sending message:",
        error
      );

      alert(error.message);
      setSending(false);
      return;
    }

    setMessages(
      (current) => [
        ...current,
        data as Message,
      ]
    );

    setConversations(
      (current) =>
        current.map(
          (conversation) =>
            conversation.id ===
            selectedConversation.id
              ? {
                  ...conversation,
                  last_message_at:
                    now,
                  last_message_preview:
                    body,
                  updated_at: now,
                }
              : conversation
        )
    );

    setMessageText("");
    setSending(false);
  }

  async function toggleConversationStatus() {
    if (!selectedConversation) {
      return;
    }

    const nextStatus =
      selectedConversation.status ===
      "open"
        ? "closed"
        : "open";

    const { error } =
      await supabase
        .from("conversations")
        .update({
          status: nextStatus,
        })
        .eq(
          "id",
          selectedConversation.id
        );

    if (error) {
      console.error(
        "Error updating conversation status:",
        error
      );

      alert(error.message);
      return;
    }

    setConversations(
      (current) =>
        current.map(
          (conversation) =>
            conversation.id ===
            selectedConversation.id
              ? {
                  ...conversation,
                  status: nextStatus,
                }
              : conversation
        )
    );

    setEditStatus(nextStatus);
  }

  function openEditConversation() {
    if (!selectedConversation) {
      return;
    }

    setEditSubject(
      selectedConversation.subject ??
        ""
    );

    setEditChannel(
      selectedConversation.channel
    );

    setEditStatus(
      selectedConversation.status
    );

    setEditingConversation(true);
  }

  async function saveConversationEdits(
    event: FormEvent
  ) {
    event.preventDefault();

    if (
      !selectedConversation ||
      savingConversation
    ) {
      return;
    }

    setSavingConversation(true);

    const { data, error } =
      await supabase
        .from("conversations")
        .update({
          subject:
            editSubject.trim() ||
            null,
          channel: editChannel,
          status: editStatus,
        })
        .eq(
          "id",
          selectedConversation.id
        )
        .select()
        .single();

    if (error) {
      console.error(
        "Error updating conversation:",
        error
      );

      alert(error.message);
      setSavingConversation(false);
      return;
    }

    setConversations(
      (current) =>
        current.map(
          (conversation) =>
            conversation.id ===
            selectedConversation.id
              ? {
                  ...conversation,
                  ...(data as Conversation),
                }
              : conversation
        )
    );

    setEditingConversation(false);
    setSavingConversation(false);
  }

  async function createConversation() {
    if (creatingConversation) {
      return;
    }

    setCreatingConversation(true);

    try {
      const { data, error } =
        await supabase
          .from("conversations")
          .insert({
            organization_id:
              organizationId,
            channel: "sms",
            status: "open",
            subject:
              "New Conversation",
            unread_count: 0,
          })
          .select()
          .single();

      if (error) {
        console.error(
          "Error creating conversation:",
          error
        );

        alert(error.message);
        return;
      }

      const conversation = {
        ...(data as Conversation),
        lead: null,
      };

      setConversations(
        (current) => [
          conversation,
          ...current,
        ]
      );

      setSelectedConversationId(
        conversation.id
      );

      setMobileView(
        "conversation"
      );
    } finally {
      setCreatingConversation(
        false
      );
    }
  }

  function renderMessages() {
    if (selectedMessages.length === 0) {
      return (
        <div className="flex h-full min-h-[360px] flex-col items-center justify-center px-6 text-center">
          <div className="relative mb-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
              <MessageSquare
                size={24}
                strokeWidth={1.7}
              />
            </div>

            <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white">
              <Plus size={11} />
            </div>
          </div>

          <p className="text-sm font-semibold text-slate-900">
            No messages yet
          </p>

          <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
            Start the conversation below
            to send your first message.
          </p>
        </div>
      );
    }

    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        {selectedMessages.map(
          (message, index) => {
            const outbound =
              message.direction ===
              "outbound";

            const previous =
              selectedMessages[index - 1];

            const showDate =
              !previous ||
              !sameMessageDay(
                previous.sent_at,
                message.sent_at
              );

            return (
              <div key={message.id}>
                {showDate && (
                  <div className="mb-6 flex items-center gap-3">
                    <div className="h-px flex-1 bg-slate-200" />

                    <div className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold text-slate-400 shadow-sm">
                      {formatMessageDate(
                        message.sent_at
                      )}
                    </div>

                    <div className="h-px flex-1 bg-slate-200" />
                  </div>
                )}

                <div
                  className={`flex ${
                    outbound
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`flex max-w-[88%] flex-col sm:max-w-[72%] ${
                      outbound
                        ? "items-end"
                        : "items-start"
                    }`}
                  >
                    {!outbound &&
                      message.sender_name && (
                        <div className="mb-1.5 flex items-center gap-1.5 px-1">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[8px] font-bold text-slate-600">
                            {getInitials(
                              selectedConversation?.lead ??
                                null
                            )}
                          </div>

                          <p className="text-[10px] font-semibold text-slate-500">
                            {
                              message.sender_name
                            }
                          </p>
                        </div>
                      )}

                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-6 transition ${
                        outbound
                          ? "rounded-br-md bg-slate-900 text-white shadow-md shadow-slate-900/10"
                          : "rounded-bl-md border border-slate-200 bg-white text-slate-800 shadow-sm"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">
                        {message.body}
                      </p>
                    </div>

                    <div
                      className={`mt-1.5 flex items-center gap-1.5 px-1 text-[10px] text-slate-400 ${
                        outbound
                          ? "justify-end"
                          : ""
                      }`}
                    >
                      <span>
                        {formatMessageTime(
                          message.sent_at
                        )}
                      </span>

                      {outbound && (
                        <>
                          <span>•</span>

                          {message.is_read ? (
                            <span className="flex items-center gap-0.5">
                              <CheckCheck
                                size={12}
                              />
                              Read
                            </span>
                          ) : (
                            <span className="flex items-center gap-0.5">
                              <Check
                                size={12}
                              />
                              Sent
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          }
        )}
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-2rem)] min-h-[650px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_40px_rgba(15,23,42,0.06)]">
      {/* TOP HEADER */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
            <MessageSquare
              size={18}
              strokeWidth={1.8}
            />

            {unreadTotal > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-slate-900 px-1 text-[8px] font-bold text-white">
                {unreadTotal > 9
                  ? "9+"
                  : unreadTotal}
              </span>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg font-semibold tracking-tight text-slate-950">
                Conversations
              </h1>

              <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500 md:inline-flex">
                Inbox
              </span>
            </div>

            <div className="mt-0.5 hidden items-center gap-2 text-xs text-slate-500 sm:flex">
              <span>
                {openTotal} open
              </span>

              <span className="text-slate-300">
                •
              </span>

              <span>
                {unreadTotal} unread
              </span>

              <span className="text-slate-300">
                •
              </span>

              <span>
                {conversations.length} total
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={
            createConversation
          }
          disabled={
            creatingConversation
          }
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-3.5 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-slate-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
        >
          <Plus size={16} />

          <span className="hidden sm:inline">
            New Conversation
          </span>

          <span className="sm:hidden">
            New
          </span>
        </button>
      </div>

      {/* MOBILE BACK */}
      {mobileView ===
        "conversation" &&
        selectedConversation && (
          <button
            type="button"
            onClick={() =>
              setMobileView(
                "list"
              )
            }
            className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-slate-50/70 px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 lg:hidden"
          >
            <ArrowLeft size={15} />
            Back to conversations
          </button>
        )}

      <div className="flex min-h-0 flex-1">
        {/* LEFT CONVERSATION LIST */}
        <aside
          className={`w-full shrink-0 border-r border-slate-200 bg-slate-50/60 lg:flex lg:w-[330px] xl:w-[370px] ${
            mobileView === "list"
              ? "flex"
              : "hidden"
          } flex-col`}
        >
          {/* SEARCH */}
          <div className="shrink-0 border-b border-slate-200 bg-white/70 p-4">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search conversations..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    setSearch("")
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* FILTERS */}
            <div className="mt-3 flex gap-1 overflow-x-auto pb-0.5">
              {(
                [
                  ["all", "All"],
                  ["open", "Open"],
                  ["unread", "Unread"],
                  ["closed", "Closed"],
                ] as const
              ).map(
                ([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setFilter(
                        value
                      )
                    }
                    className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      filter === value
                        ? "bg-slate-950 text-white shadow-sm"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                    }`}
                  >
                    {label}

                    {value ===
                      "unread" &&
                      unreadTotal >
                        0 && (
                        <span
                          className={`ml-1.5 ${
                            filter ===
                            value
                              ? "text-slate-300"
                              : "text-slate-400"
                          }`}
                        >
                          {unreadTotal >
                          99
                            ? "99+"
                            : unreadTotal}
                        </span>
                      )}
                  </button>
                )
              )}
            </div>
          </div>

          {/* LIST */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {filteredConversations.length ===
            0 ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
                  {search ||
                  filter !==
                    "all" ? (
                    <Search size={21} />
                  ) : (
                    <Inbox size={21} />
                  )}
                </div>

                <h3 className="text-sm font-semibold text-slate-900">
                  {search ||
                  filter !==
                    "all"
                    ? "No matches found"
                    : "No conversations"}
                </h3>

                <p className="mt-1 max-w-[240px] text-xs leading-5 text-slate-500">
                  {search ||
                  filter !==
                    "all"
                    ? "Try adjusting your search or filter."
                    : "Conversations will appear here when customers start messaging."}
                </p>

                {(search ||
                  filter !==
                    "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch(
                        ""
                      );
                      setFilter(
                        "all"
                      );
                    }}
                    className="mt-4 text-xs font-semibold text-slate-700 underline underline-offset-4 transition hover:text-slate-950"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              filteredConversations.map(
                (conversation) => {
                  const isSelected =
                    conversation.id ===
                    selectedConversationId;

                  const isUnread =
                    conversation.unread_count >
                    0;

                  return (
                    <button
                      key={
                        conversation.id
                      }
                      type="button"
                      onClick={() =>
                        void selectConversation(
                          conversation
                        )
                      }
                      className={`group relative flex w-full gap-3 border-b border-slate-200/80 px-4 py-3.5 text-left transition duration-150 ${
                        isSelected
                          ? "bg-white"
                          : "hover:bg-white/80"
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute inset-y-0 left-0 w-[3px] bg-slate-950" />
                      )}

                      <div
                        className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
                          isSelected
                            ? "bg-slate-950 text-white shadow-sm"
                            : isUnread
                              ? "bg-slate-800 text-white"
                              : "bg-slate-200 text-slate-700 group-hover:bg-slate-300"
                        }`}
                      >
                        {getInitials(
                          conversation.lead
                        )}

                        {isUnread && (
                          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-slate-900" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`truncate text-sm ${
                              isUnread
                                ? "font-bold text-slate-950"
                                : "font-semibold text-slate-900"
                            }`}
                          >
                            {getLeadName(
                              conversation.lead
                            )}
                          </p>

                          <span
                            className={`shrink-0 text-[10px] ${
                              isUnread
                                ? "font-semibold text-slate-600"
                                : "text-slate-400"
                            }`}
                          >
                            {formatConversationTime(
                              conversation.last_message_at
                            )}
                          </span>
                        </div>

                        <div className="mt-1 flex items-center gap-1.5">
                          <ChannelIcon
                            channel={
                              conversation.channel
                            }
                            size={11}
                          />

                          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            {channelLabel(
                              conversation.channel
                            )}
                          </span>

                          <Circle
                            size={4}
                            className="fill-slate-300 text-slate-300"
                          />

                          <span
                            className={`text-[10px] font-semibold ${
                              conversation.status ===
                              "open"
                                ? "text-emerald-600"
                                : "text-slate-400"
                            }`}
                          >
                            {statusLabel(
                              conversation.status
                            )}
                          </span>
                        </div>

                        <p
                          className={`mt-1 truncate text-xs ${
                            isUnread
                              ? "font-medium text-slate-700"
                              : "text-slate-500"
                          }`}
                        >
                          {conversation.last_message_preview ||
                            conversation.subject ||
                            "No messages yet"}
                        </p>
                      </div>

                      {isUnread && (
                        <div className="flex shrink-0 items-center">
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-950 px-1.5 text-[10px] font-bold text-white">
                            {conversation.unread_count >
                            99
                              ? "99+"
                              : conversation.unread_count}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                }
              )
            )}
          </div>
        </aside>

        {/* CENTER CONVERSATION */}
        <main
          className={`min-w-0 flex-1 ${
            mobileView ===
            "conversation"
              ? "flex"
              : "hidden lg:flex"
          } flex-col bg-white`}
        >
          {!selectedConversation ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <div className="relative mb-5">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-200">
                  <MessageSquare
                    size={25}
                    strokeWidth={1.6}
                  />
                </div>

                <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-950 text-white">
                  <ChevronRight size={13} />
                </div>
              </div>

              <h2 className="text-base font-semibold text-slate-900">
                Select a conversation
              </h2>

              <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
                Choose a customer
                conversation from the
                left to view the
                message history.
              </p>
            </div>
          ) : (
            <>
              {/* CONVERSATION HEADER */}
              <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      selectedConversation.unread_count >
                      0
                        ? "bg-slate-950 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {getInitials(
                      selectedConversation.lead
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-sm font-bold text-slate-950">
                        {getLeadName(
                          selectedConversation.lead
                        )}
                      </h2>

                      <span
                        className={`hidden rounded-full px-2 py-0.5 text-[9px] font-semibold ring-1 sm:inline-flex ${statusClasses(
                          selectedConversation.status
                        )}`}
                      >
                        {statusLabel(
                          selectedConversation.status
                        )}
                      </span>
                    </div>

                    <div className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-slate-500">
                      <span className="flex shrink-0 items-center gap-1">
                        <ChannelIcon
                          channel={
                            selectedConversation.channel
                          }
                          size={12}
                        />

                        {channelLabel(
                          selectedConversation.channel
                        )}
                      </span>

                      {selectedConversation
                        .lead?.phone && (
                        <>
                          <span className="text-slate-300">
                            •
                          </span>

                          <span className="truncate">
                            {
                              selectedConversation
                                .lead.phone
                            }
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      void toggleConversationStatus()
                    }
                    title={
                      selectedConversation.status ===
                      "open"
                        ? "Close conversation"
                        : "Reopen conversation"
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-800"
                  >
                    {selectedConversation.status ===
                    "open" ? (
                      <Archive
                        size={16}
                      />
                    ) : (
                      <Inbox size={16} />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={
                      openEditConversation
                    }
                    title="Edit conversation"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-800"
                  >
                    <MoreHorizontal
                      size={18}
                    />
                  </button>
                </div>
              </div>

              {/* AI / AUTOMATION FOUNDATION */}
              <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 bg-slate-50/50 px-4 py-2 sm:px-5">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-900 text-white">
                  <Sparkles size={12} />
                </div>

                <p className="text-[10px] font-medium text-slate-500">
                  Trackpr intelligence
                </p>

                <span className="h-1 w-1 rounded-full bg-slate-300" />

                <p className="text-[10px] text-slate-400">
                  Automation-ready conversation
                </p>
              </div>

              {/* SUBJECT */}
              {selectedConversation.subject && (
                <div className="border-b border-slate-100 bg-white px-5 py-2.5">
                  <p className="truncate text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">
                      Subject:
                    </span>{" "}
                    {
                      selectedConversation.subject
                    }
                  </p>
                </div>
              )}

              {/* MESSAGES */}
              <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 px-4 py-5 sm:px-6">
                {renderMessages()}
              </div>

              {/* COMPOSER */}
              <form
                onSubmit={
                  sendMessage
                }
                className="shrink-0 border-t border-slate-200 bg-white p-3 sm:p-4"
              >
                <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-sm transition focus-within:border-slate-300 focus-within:bg-white focus-within:shadow-sm focus-within:ring-2 focus-within:ring-slate-100">
                  <textarea
                    value={messageText}
                    onChange={(
                      event
                    ) =>
                      setMessageText(
                        event.target
                          .value
                      )
                    }
                    onKeyDown={(
                      event
                    ) => {
                      if (
                        event.key ===
                          "Enter" &&
                        !event.shiftKey
                      ) {
                        event.preventDefault();

                        if (
                          messageText.trim()
                        ) {
                          void sendMessage(
                            event as unknown as FormEvent
                          );
                        }
                      }
                    }}
                    placeholder={`Write a ${channelLabel(
                      selectedConversation.channel
                    ).toLowerCase()}...`}
                    rows={1}
                    className="max-h-32 min-h-[40px] flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  />

                  <button
                    type="submit"
                    disabled={
                      !messageText.trim() ||
                      sending
                    }
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm transition hover:bg-slate-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Send
                      size={16}
                    />
                  </button>
                </div>

                <div className="mx-auto mt-2 flex max-w-3xl items-center justify-between px-2">
                  <p className="text-[10px] text-slate-400">
                    Enter to send
                    <span className="mx-1">
                      •
                    </span>
                    Shift + Enter for a new
                    line
                  </p>

                  <p className="hidden text-[10px] text-slate-400 sm:block">
                    Stored in Trackpr
                  </p>
                </div>
              </form>
            </>
          )}
        </main>

        {/* RIGHT CUSTOMER PANEL */}
        <aside className="hidden w-[285px] shrink-0 border-l border-slate-200 bg-slate-50/40 xl:flex xl:flex-col">
          {selectedConversation ? (
            <>
              {/* CONTACT HEADER */}
              <div className="border-b border-slate-200 bg-white px-5 py-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Customer
                </p>

                <div className="mt-3 flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700 ring-4 ring-slate-50">
                    {getInitials(
                      selectedConversation.lead
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-950">
                      {getLeadName(
                        selectedConversation.lead
                      )}
                    </p>

                    {selectedConversation
                      .lead?.status && (
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                        <p className="text-[10px] font-medium capitalize text-slate-500">
                          {
                            selectedConversation
                              .lead
                              .status
                          }
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5">
                <div className="space-y-6">
                  {/* CONTACT DETAILS */}
                  <div>
                    <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      Contact Details
                    </p>

                    <div className="space-y-1">
                      {selectedConversation
                        .lead?.phone && (
                        <a
                          href={`tel:${selectedConversation.lead.phone}`}
                          className="flex items-start gap-2.5 rounded-xl p-2 transition hover:bg-white"
                        >
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                            <Phone
                              size={13}
                            />
                          </div>

                          <div className="min-w-0 pt-0.5">
                            <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
                              Phone
                            </p>

                            <p className="mt-0.5 break-all text-[11px] font-semibold text-slate-700">
                              {
                                selectedConversation
                                  .lead
                                  .phone
                              }
                            </p>
                          </div>
                        </a>
                      )}

                      {selectedConversation
                        .lead?.email && (
                        <a
                          href={`mailto:${selectedConversation.lead.email}`}
                          className="flex items-start gap-2.5 rounded-xl p-2 transition hover:bg-white"
                        >
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                            <Mail
                              size={13}
                            />
                          </div>

                          <div className="min-w-0 pt-0.5">
                            <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
                              Email
                            </p>

                            <p className="mt-0.5 break-all text-[11px] font-semibold text-slate-700">
                              {
                                selectedConversation
                                  .lead
                                  .email
                              }
                            </p>
                          </div>
                        </a>
                      )}

                      {!selectedConversation
                        .lead?.phone &&
                        !selectedConversation
                          .lead?.email && (
                          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-4 text-center">
                            <p className="text-[10px] font-medium text-slate-400">
                              No contact details
                              available.
                            </p>
                          </div>
                        )}
                    </div>
                  </div>

                  {/* CRM */}
                  <div>
                    <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      CRM
                    </p>

                    <div className="space-y-2">
                      {selectedConversation.lead && (
                        <>
                          <a
                            href={`/leads/${selectedConversation.lead.id}`}
                            className="group flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                          >
                            <span className="flex items-center gap-2">
                              <UserRound
                                size={14}
                                className="text-slate-400"
                              />

                              View Lead
                            </span>

                            <ChevronRight
                              size={14}
                              className="text-slate-400 transition group-hover:translate-x-0.5"
                            />
                          </a>

                          <a
                            href={`/leads/${selectedConversation.lead.id}`}
                            className="group flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                          >
                            <span className="flex items-center gap-2">
                              <MessageSquare
                                size={14}
                                className="text-slate-400"
                              />

                              View Activity
                            </span>

                            <ChevronRight
                              size={14}
                              className="text-slate-400 transition group-hover:translate-x-0.5"
                            />
                          </a>
                        </>
                      )}

                      {!selectedConversation.lead && (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-4 text-center">
                          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-300">
                            <UserRound
                              size={16}
                            />
                          </div>

                          <p className="mt-2 text-xs font-semibold text-slate-600">
                            No CRM contact
                          </p>

                          <p className="mt-1 text-[10px] leading-4 text-slate-400">
                            Link this conversation
                            to a lead to see CRM
                            details.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CONVERSATION INFO */}
                  <div>
                    <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      Conversation
                    </p>

                    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">
                          Channel
                        </span>

                        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                          <ChannelIcon
                            channel={
                              selectedConversation.channel
                            }
                            size={12}
                          />

                          {channelLabel(
                            selectedConversation.channel
                          )}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">
                          Status
                        </span>

                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ring-1 ${statusClasses(
                            selectedConversation.status
                          )}`}
                        >
                          {statusLabel(
                            selectedConversation.status
                          )}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">
                          Messages
                        </span>

                        <span className="text-[11px] font-bold text-slate-700">
                          {
                            selectedMessages.length
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* AUTOMATION FOUNDATION */}
                  <div className="rounded-xl border border-slate-200 bg-slate-950 p-3.5 text-white shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10">
                        <Sparkles
                          size={14}
                        />
                      </div>

                      <div>
                        <p className="text-[10px] font-bold">
                          Trackpr Intelligence
                        </p>

                        <p className="text-[9px] text-slate-400">
                          Automation layer ready
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 h-px bg-white/10" />

                    <div className="mt-3 flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                      <span className="text-[9px] font-medium text-slate-300">
                        Conversation available
                        for automation
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center px-6 text-center">
              <div>
                <UserRound
                  size={22}
                  className="mx-auto text-slate-300"
                />

                <p className="mt-2 text-xs text-slate-500">
                  Select a conversation to
                  view customer details.
                </p>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* EDIT CONVERSATION MODAL */}
      {editingConversation &&
        selectedConversation && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
            onMouseDown={(
              event
            ) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                setEditingConversation(
                  false
                );
              }
            }}
          >
            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.2)]">
              {/* MODAL HEADER */}
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-950 text-white">
                      <Edit3
                        size={13}
                      />
                    </div>

                    <h2 className="text-base font-bold text-slate-950">
                      Edit Conversation
                    </h2>
                  </div>

                  <p className="mt-1 pl-9 text-xs text-slate-500">
                    Update conversation
                    details and status.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setEditingConversation(
                      false
                    )
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={16} />
                </button>
              </div>

              {/* FORM */}
              <form
                onSubmit={
                  saveConversationEdits
                }
                className="space-y-5 p-5"
              >
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">
                    Subject
                  </label>

                  <input
                    value={
                      editSubject
                    }
                    onChange={(
                      event
                    ) =>
                      setEditSubject(
                        event.target
                          .value
                      )
                    }
                    placeholder="Conversation subject"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">
                    Channel
                  </label>

                  <select
                    value={
                      editChannel
                    }
                    onChange={(
                      event
                    ) =>
                      setEditChannel(
                        event.target
                          .value
                      )
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  >
                    <option value="sms">
                      SMS
                    </option>

                    <option value="email">
                      Email
                    </option>

                    <option value="phone">
                      Phone
                    </option>

                    <option value="other">
                      Other
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">
                    Status
                  </label>

                  <select
                    value={
                      editStatus
                    }
                    onChange={(
                      event
                    ) =>
                      setEditStatus(
                        event.target
                          .value
                      )
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  >
                    <option value="open">
                      Open
                    </option>

                    <option value="closed">
                      Closed
                    </option>

                    <option value="archived">
                      Archived
                    </option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingConversation(
                        false
                      )
                    }
                    className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      savingConversation
                    }
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Check size={15} />

                    {savingConversation
                      ? "Saving..."
                      : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
}