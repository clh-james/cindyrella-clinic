import { LoginForm } from "@/components/admin/LoginForm";
import Image from "next/image";

export const metadata = { title: "Staff login — Cindyrella Medical Group" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center px-4 sm:px-6 py-8">
      <div className="bg-white rounded-3xl border border-line p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="Cindyrella Logo" width={44} height={44} className="rounded-full shrink-0" />
          <div>
            <span className="font-serif text-lg font-bold text-ink block leading-tight">Cindyrella Staff</span>
            <span className="text-[10px] uppercase font-semibold text-royal tracking-widest">Portal Login</span>
          </div>
        </div>
        <h1 className="mt-6 font-serif text-2xl sm:text-3xl font-bold text-ink">Sign in</h1>
        <p className="mt-1.5 text-xs sm:text-sm text-ink-soft">
          For clinic staff only. Ask an admin for an account if you don&apos;t have one.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
