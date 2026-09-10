import { createClient } from "@/lib/supabase/server";
import { BookingForm } from "./BookingForm";

export default async function BookingPage() {
  const supabase = await createClient();
  const { data: treatments } = await supabase
    .from("treatments")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return (
    <main className="min-h-screen bg-pale pb-32 pt-24 md:pt-32">
      <div className="mx-auto max-w-3xl px-6">
        <h1 className="font-serif text-3xl font-semibold text-ink sm:text-4xl text-center mb-2">
          Book Your Session
        </h1>
        <p className="text-center text-ink-soft mb-12">
          Select a treatment, pick a time, and we'll take care of the rest.
        </p>

        <BookingForm treatments={treatments || []} />
      </div>
    </main>
  );
}
