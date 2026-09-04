"use client";

import { useState } from "react";
import { signIn, signUp } from "./actions";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    
    const result = isLogin ? await signIn(formData) : await signUp(formData);
    
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-2xl border border-line bg-paper p-8 shadow-sm">
        <h1 className="font-serif text-3xl font-semibold text-ink text-center">
          {isLogin ? "Welcome back" : "Create an account"}
        </h1>
        <p className="mt-2 text-sm text-ink-soft text-center">
          {isLogin 
            ? "Sign in to view your bookings and loyalty points." 
            : "Join Cindyrella to earn loyalty points on every drip."}
        </p>

        <form action={handleSubmit} className="mt-8 flex flex-col gap-4">
          {!isLogin && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium text-ink">First name</span>
                  <input name="firstName" required className="rounded-lg border border-line px-3.5 py-2.5 text-ink outline-none focus:border-royal" />
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium text-ink">Last name</span>
                  <input name="lastName" required className="rounded-lg border border-line px-3.5 py-2.5 text-ink outline-none focus:border-royal" />
                </label>
              </div>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-ink">Phone number</span>
                <input name="phone" required className="rounded-lg border border-line px-3.5 py-2.5 text-ink outline-none focus:border-royal" />
              </label>
            </>
          )}

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-ink">Email</span>
            <input name="email" type="email" required className="rounded-lg border border-line px-3.5 py-2.5 text-ink outline-none focus:border-royal" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-ink">Password</span>
            <input name="password" type="password" required className="rounded-lg border border-line px-3.5 py-2.5 text-ink outline-none focus:border-royal" />
          </label>

          {error && <p className="text-sm text-red-700">{error}</p>}
          
          <button type="submit" disabled={loading} className="mt-4 rounded-full bg-royal px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-royal-deep disabled:opacity-50">
            {loading ? "Please wait…" : isLogin ? "Sign in" : "Sign up"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-ink-soft">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => setIsLogin(!isLogin)} className="font-medium text-royal hover:underline">
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </div>
      </div>
    </main>
  );
}
