import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-[#f4f7f9] px-6 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-600 shadow-sm">
        <ShieldAlert size={40} />
      </div>
      <h1 className="font-serif text-3xl font-bold text-ink md:text-4xl">403</h1>
      <h2 className="mt-2 text-xl font-semibold text-ink">Access Restricted</h2>
      <p className="mt-4 max-w-md text-ink-soft leading-relaxed">
        You don&apos;t have permission to access this page. Please contact your administrator if you believe you need access.
      </p>
      <Link 
        href="/admin" 
        className="mt-8 rounded-xl bg-royal px-8 py-3.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-royal-deep hover:shadow-lg"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
