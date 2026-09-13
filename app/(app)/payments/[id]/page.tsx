import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PaymentDetailClient from "./payment-detail-client";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PaymentDetailPage({
  params,
}: PageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    notFound();
  }

  const { data: payment, error: paymentError } =
    await supabase
      .from("payments")
      .select(`
        id,
        organization_id,
        job_id,
        lead_id,
        amount,
        payment_date,
        payment_method,
        status,
        reference,
        notes,
        created_at,
        updated_at,
        jobs (
          id,
          title,
          amount,
          status,
          payment_status,
          lead_id
        ),
        leads (
          id,
          first_name,
          last_name,
          email,
          phone
        )
      `)
      .eq("id", id)
      .eq("organization_id", membership.organization_id)
      .maybeSingle();

  if (paymentError) {
    console.error("Error loading payment:", paymentError);
    notFound();
  }

  if (!payment) {
    notFound();
  }

  const normalizedPayment = {
    ...payment,
    jobs: Array.isArray(payment.jobs)
      ? payment.jobs[0] ?? null
      : payment.jobs ?? null,
    leads: Array.isArray(payment.leads)
      ? payment.leads[0] ?? null
      : payment.leads ?? null,
  };

  return (
    <PaymentDetailClient
      payment={normalizedPayment as any}
    />
  );
}