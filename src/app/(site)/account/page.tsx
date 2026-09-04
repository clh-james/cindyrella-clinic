import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { signOut } from "../login/actions";
import { Sparkles, CalendarClock } from "lucide-react";
import { AppointmentQRCode } from "./QRCode";

export const metadata = { title: "My Account — Cindyrella" };

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch customer profile
  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("auth_id", user.id)
    .single();

  if (!customer) {
    // Edge case if profile isn't created
    redirect("/login");
  }

  // Fetch customer appointments
  const { data: appointments } = await supabase
    .from("appointments")
    .select("*, treatments(name), branches(name)")
    .eq("customer_id", customer.id)
    .order("appointment_date", { ascending: false });

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 md:py-20">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-ink">
            Welcome, {customer.first_name}
          </h1>
          <p className="mt-2 text-ink-soft">Manage your bookings and view your loyalty points.</p>
        </div>
        
        <form action={signOut}>
          <button type="submit" className="text-sm font-medium text-royal hover:underline">
            Sign out
          </button>
        </form>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {/* Loyalty Points Card */}
        <div className="rounded-2xl border border-line bg-gradient-to-br from-royal to-royal-deep p-6 text-white shadow-sm md:col-span-1 flex flex-col justify-between h-48">
          <div>
            <Sparkles className="h-6 w-6 text-white/80" />
            <h2 className="mt-4 font-serif text-lg font-medium text-white/90">Loyalty Points</h2>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold">{customer.loyalty_points || 0}</span>
            <span className="mb-1 text-sm text-white/80">pts</span>
          </div>
        </div>

        {/* Appointments List */}
        <div className="rounded-2xl border border-line bg-white p-6 shadow-sm md:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <CalendarClock className="h-5 w-5 text-royal" />
            <h2 className="font-serif text-xl font-medium text-ink">My Bookings</h2>
          </div>

          <ul className="space-y-4">
            {(appointments ?? []).map((a) => {
              const treatment = a.treatments as unknown as { name: string } | null;
              const branch = a.branches as unknown as { name: string } | null;
              const isUpcoming = a.status === 'pending' || a.status === 'confirmed';
              return (
                <li key={a.id} className="flex flex-col gap-4 rounded-xl border border-line p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-ink">{treatment?.name}</p>
                    <p className="text-sm text-ink-soft mb-2">
                      {branch?.name} · {new Date(a.appointment_date).toLocaleDateString()} at {a.appointment_time}
                    </p>
                    <span className="inline-flex rounded-full bg-pale px-3 py-1 text-xs font-medium text-ink-soft capitalize border border-line">
                      {a.status.replace("_", " ")}
                    </span>
                  </div>
                  
                  {isUpcoming && (
                    <div className="sm:ml-auto">
                      <AppointmentQRCode referenceNumber={a.reference_number} />
                    </div>
                  )}
                </li>
              );
            })}
            
            {(appointments ?? []).length === 0 && (
              <p className="text-sm text-ink-soft py-4 text-center">
                You haven&apos;t booked any sessions yet.
              </p>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
