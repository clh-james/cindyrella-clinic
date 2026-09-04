"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Droplet } from "@/components/Droplet";
import { signOut } from "@/app/admin/actions";
import { LayoutDashboard, CalendarClock, Settings, Users, BriefcaseMedical, Contact, Image as ImageIcon, Tag, Package } from "lucide-react";

const links = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/appointments", label: "Appointments", icon: CalendarClock },
  { href: "/admin/customers", label: "Customers", icon: Contact },
  { href: "/admin/services", label: "Services", icon: BriefcaseMedical },
  { href: "/admin/inventory", label: "Inventory", icon: Package },
  { href: "/admin/promos", label: "Promos", icon: Tag },
  { href: "/admin/gallery", label: "Gallery", icon: ImageIcon },
  { href: "/admin/staff", label: "Staff", icon: Users },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminShell({
  fullName,
  role,
  children,
}: {
  fullName: string;
  role: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="grid min-h-screen md:grid-cols-[220px_1fr]">
      <aside className="border-b border-line bg-pale px-6 py-6 md:border-b-0 md:border-r">
        <Link href="/admin" className="flex items-center gap-2.5">
          <Droplet className="h-6 w-5 text-royal" />
          <span className="font-serif text-base font-semibold text-ink">Cindyrella</span>
        </Link>

        <nav className="mt-8 flex gap-1 md:flex-col">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? "bg-royal text-white" : "text-ink-soft hover:bg-white hover:text-ink"
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-10 border-t border-line pt-4">
          <p className="text-sm font-medium text-ink">{fullName}</p>
          <p className="text-xs capitalize text-ink-soft">{role}</p>
          <form action={signOut}>
            <button className="mt-3 text-xs font-medium text-royal hover:text-royal-deep">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="bg-paper px-6 py-8 md:px-10 md:py-10">{children}</div>
    </div>
  );
}
