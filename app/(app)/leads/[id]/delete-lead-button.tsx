"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";

export default function DeleteLeadButton({
  leadId,
}: {
  leadId: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      "Delete this lead?\n\nThis will permanently remove the lead, its activities, tasks, and estimates. Jobs, payments, reviews, conversations, and the contact record will be preserved."
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Unable to delete the lead."
        );
      }

      router.push("/leads");
      router.refresh();
    } catch (error) {
      console.error("Error deleting lead:", error);

      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to delete the lead."
      );

      setDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-200 bg-white px-3.5 text-sm font-semibold text-red-600 shadow-sm transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {deleting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}

      {deleting ? "Deleting..." : "Delete Lead"}
    </button>
  );
}