import { createClient } from "@/lib/supabase/server";
import { Droplet } from "@/components/Droplet";
import { Check, Clock } from "lucide-react";
import Link from "next/link";

const peso = (n: number) => `₱${n.toLocaleString("en-PH")}`;

export const metadata = { title: "Booking confirmed — Cindyrella Medical Group" };

export default async function BookingConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;

  if (!ref) {
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="text-ink-soft">No booking reference was provided.</p>
        <Link href="/booking" className="mt-4 inline-block text-royal">Book a session</Link>
      </main>
    );
  }

  const hasSupabaseEnv =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!hasSupabaseEnv) {
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-royal">
          <Check className="text-white" size={26} />
        </div>
        <h1 className="mt-6 font-serif text-3xl font-semibold text-ink">Booking confirmed</h1>
        <p className="mt-6 font-mono text-lg tracking-wide text-royal">{ref}</p>
      </main>
    );
  }

  const supabase = await createClient();
  const { data: appointment } = await supabase
    .from("appointments")
    .select(
      "reference_number, appointment_date, appointment_time, payment_status, treatments(name, session_price), branches(name), customers(email)"
    )
    .eq("reference_number", ref)
    .maybeSingle();

  if (!appointment) {
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="text-ink-soft">We couldn&apos;t find a booking with that reference.</p>
        <Link href="/booking" className="mt-4 inline-block text-royal">Book a session</Link>
      </main>
    );
  }

  const treatment = appointment.treatments as unknown as { name: string; session_price: number } | null;
  const branch = appointment.branches as unknown as { name: string } | null;
  const paid = appointment.payment_status === "paid";

  return (
    <main className="mx-auto max-w-md px-6 py-24 text-center">
      <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${paid ? "bg-royal" : "bg-gold"}`}>
        {paid ? <Check className="text-white" size={26} /> : <Clock className="text-white" size={24} />}
      </div>
      <div className="mt-6 flex items-center justify-center gap-2 text-royal">
        <Droplet className="h-4 w-3.5" />
        <span className="text-sm">Cindyrella Medical Group</span>
      </div>
      <h1 className="mt-3 font-serif text-3xl font-semibold text-ink">
        {paid ? "Payment confirmed" : "Almost there"}
      </h1>
      <p className="mt-2 text-ink-soft">
        {paid
          ? "Your session is fully booked and paid for."
          : "Your slot is held — we're finalizing your payment now. A confirmation email is on its way."}
      </p>
      <p className="mt-6 font-mono text-lg tracking-wide text-royal">{appointment.reference_number}</p>
      <div className="mx-auto mt-8 max-w-sm rounded-xl bg-pale p-5 text-left text-sm text-ink-soft">
        <p><span className="font-medium text-ink">{treatment?.name}</span> · {peso(treatment?.session_price ?? 0)}</p>
        <p className="mt-1">{branch?.name} · {appointment.appointment_date} · {appointment.appointment_time}</p>
      </div>
    </main>
  );
}
