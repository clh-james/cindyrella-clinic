import { Droplet } from "@/components/Droplet";

export default function SetupRequired() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <Droplet className="h-8 w-6 text-royal" />
      <h1 className="mt-6 font-serif text-2xl font-semibold text-ink">
        Connect Supabase to continue
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        The admin dashboard needs a Supabase project. Follow{" "}
        <code className="rounded bg-pale px-1.5 py-0.5">BACKEND_SETUP.md</code>{" "}
        to run the migrations and add your project keys to{" "}
        <code className="rounded bg-pale px-1.5 py-0.5">.env.local</code>.
      </p>
    </main>
  );
}
