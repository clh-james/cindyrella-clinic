import { ManageBookingFlow } from "@/components/ManageBookingFlow";

export const metadata = { title: "Manage your booking — Cindyrella Medical Group" };

export default function ManagePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-serif text-4xl font-semibold text-ink sm:text-5xl">
        Manage your booking
      </h1>
      <p className="mt-4 max-w-md text-ink-soft">
        Enter your reference number and the email you booked with to
        reschedule or cancel.
      </p>
      <ManageBookingFlow />
    </main>
  );
}
