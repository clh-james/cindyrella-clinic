"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useState, useEffect } from "react";
import { signOut } from "@/app/admin/actions";
import { LayoutDashboard, CalendarClock, Settings, Users, BriefcaseMedical, Contact, Image as ImageIcon, Tag, Package, Calculator, Shield, Menu, X, Bell } from "lucide-react";
import { Can } from "@/components/rbac/Can";

const links = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, permission: "dashboard.view" },
  { href: "/admin/pos", label: "POS", icon: Calculator, permission: "pos.view" },
  { href: "/admin/appointments", label: "Appointments", icon: CalendarClock, permission: "appointments.view" },
  { href: "/admin/customers", label: "Customers", icon: Contact, permission: "customers.view" },
  { href: "/admin/services", label: "Services", icon: BriefcaseMedical, permission: "services.view" },
  { href: "/admin/inventory", label: "Inventory", icon: Package, permission: "inventory.view" },
  { href: "/admin/promos", label: "Promos", icon: Tag, permission: "promos.view" },
  { href: "/admin/gallery", label: "Gallery", icon: ImageIcon, permission: "gallery.view" },
  { href: "/admin/staff", label: "Staff", icon: Users, permission: "staff.view" },
  { href: "/admin/roles", label: "Roles", icon: Shield, permission: "users.assign_role" },
  { href: "/admin/settings", label: "Settings", icon: Settings, permission: "settings.view" },
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
  const [isOpen, setIsOpen] = useState(false);

  // Close sidebar on navigation on mobile
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen w-full flex-col md:grid md:grid-cols-[220px_1fr] bg-paper">
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-line bg-pale px-4 shadow-sm sm:gap-x-6 sm:px-6 md:hidden">
        <button type="button" className="-m-2.5 p-2.5 text-ink-soft hover:text-ink" onClick={() => setIsOpen(true)}>
          <span className="sr-only">Open sidebar</span>
          <Menu className="h-6 w-6" aria-hidden="true" />
        </button>
        <div className="flex flex-1 items-center gap-2.5 font-semibold text-ink">
          <Image src="/logo.png" alt="Cindyrella Logo" width={32} height={32} className="rounded-full" />
          Cindyrella
        </div>
        <div className="flex items-center gap-4">
          <button type="button" className="-m-2.5 p-2.5 text-ink-soft hover:text-ink">
            <span className="sr-only">View notifications</span>
            <Bell className="h-6 w-6" aria-hidden="true" />
          </button>
          <div className="h-8 w-8 rounded-full bg-royal/10 text-royal flex items-center justify-center font-medium text-sm">
            {fullName.charAt(0)}
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setIsOpen(false)} />
          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-pale pt-5 pb-4">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setIsOpen(false)}
              >
                <span className="sr-only">Close sidebar</span>
                <X className="h-6 w-6 text-white" aria-hidden="true" />
              </button>
            </div>
            <div className="flex shrink-0 items-center px-6 gap-2.5">
              <Image src="/logo.png" alt="Cindyrella Logo" width={40} height={40} className="rounded-full" />
              <span className="font-semibold text-ink text-lg">Cindyrella</span>
            </div>
            <div className="mt-8 flex flex-1 flex-col overflow-y-auto">
              <nav className="flex-1 px-4 space-y-1">
                {links.map(({ href, label, icon: Icon, permission }) => {
                  const active = pathname === href;
                  return (
                    <Can key={href} permission={permission}>
                      <Link
                        href={href}
                        className={`group flex items-center gap-x-3 rounded-md p-2 text-sm font-medium ${
                          active ? "bg-royal text-white" : "text-ink-soft hover:bg-white hover:text-ink"
                        }`}
                      >
                        <Icon className={`h-5 w-5 shrink-0 ${active ? "text-white" : "text-ink-soft group-hover:text-ink"}`} aria-hidden="true" />
                        {label}
                      </Link>
                    </Can>
                  );
                })}
              </nav>
            </div>
            <div className="mt-auto border-t border-line px-6 pt-4 pb-2">
              <p className="text-sm font-medium text-ink">{fullName}</p>
              <p className="text-xs capitalize text-ink-soft">{role}</p>
              <form action={signOut}>
                <button className="mt-3 text-xs font-medium text-royal hover:text-royal-deep">
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:border-r md:border-line md:bg-pale md:px-6 md:py-6">
        <Link href="/admin" className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="Cindyrella Logo" width={40} height={40} className="rounded-full" />
        </Link>

        <nav className="mt-8 flex flex-col gap-1 overflow-y-auto">
          {links.map(({ href, label, icon: Icon, permission }) => {
            const active = pathname === href;
            return (
              <Can key={href} permission={permission}>
                <Link
                  href={href}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    active ? "bg-royal text-white" : "text-ink-soft hover:bg-white hover:text-ink"
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              </Can>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-line pt-4">
          <p className="text-sm font-medium text-ink">{fullName}</p>
          <p className="text-xs capitalize text-ink-soft">{role}</p>
          <form action={signOut}>
            <button className="mt-3 text-xs font-medium text-royal hover:text-royal-deep">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 w-full flex flex-col min-w-0">
        <div className="flex-1 px-4 py-6 sm:px-6 md:px-10 md:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
