import { Droplet } from "@/components/Droplet";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata = { title: "Staff login — Cindyrella Medical Group" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-6">
      <div className="flex items-center gap-2.5">
        <Droplet className="h-6 w-5 text-royal" />
        <span className="font-serif text-lg font-semibold text-ink">Cindyrella staff</span>
      </div>
      <h1 className="mt-8 font-serif text-3xl font-semibold text-ink">Sign in</h1>
      <p className="mt-2 text-sm text-ink-soft">
        For clinic staff only. Ask an admin for an account if you don&apos;t have one.
      </p>
      <LoginForm />
    </main>
  );
}
