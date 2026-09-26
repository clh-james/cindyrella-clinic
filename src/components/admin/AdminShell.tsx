"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useState, useEffect } from "react";
import { signOut } from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/client";
import { 
  LayoutDashboard, CreditCard, CalendarDays, Users, Sparkles, PackageOpen, Crown, Gift, Boxes, 
  ReceiptText, WalletCards, ClipboardCheck, Banknote, BarChart3, UserRoundCog, ShieldCheck, 
  Images, Megaphone, Bell, ScrollText, Building2, Settings,
  ChevronDown, ChevronRight, Menu, X, ChevronLeft, LogOut, Check
} from "lucide-react";
import { Can, usePermissions } from "@/components/rbac/Can";

// Navigation definition
const NAVIGATION_GROUPS = [
  {
    name: "OVERVIEW",
    items: [
      { name: "Overview", href: "/admin", icon: LayoutDashboard, permission: "dashboard.view" }
    ]
  },
  {
    name: "CORE",
    items: [
      { name: "POS", href: "/admin/pos", icon: CreditCard, permission: "pos.view" },
      { name: "Appointments", href: "/admin/appointments", icon: CalendarDays, permission: "appointments.view", badge: "appointments" },
      { name: "Customers", href: "/admin/customers", icon: Users, permission: "customers.view" },
    ]
  },
  {
    name: "BUSINESS",
    items: [
      { name: "Services", href: "/admin/services", icon: Sparkles, permission: "services.view" },
      { name: "Packages", href: "#", icon: PackageOpen, permission: "packages.view", unimplemented: true },
      { name: "Memberships", href: "#", icon: Crown, permission: "memberships.view", unimplemented: true },
      { name: "Promos", href: "/admin/promos", icon: Gift, permission: "promos.view" },
      { name: "Inventory", href: "/admin/inventory", icon: Boxes, permission: "inventory.view", badge: "inventory" },
    ]
  },
  {
    name: "OPERATIONS",
    items: [
      { name: "Transactions", href: "#", icon: ReceiptText, permission: "transactions.view", unimplemented: true },
      { name: "Cashier / Shifts", href: "#", icon: WalletCards, permission: "cashier.view", unimplemented: true },
      { name: "Approvals", href: "#", icon: ClipboardCheck, permission: "approvals.view", unimplemented: true },
      { name: "Expenses", href: "#", icon: Banknote, permission: "expenses.view", unimplemented: true },
      { name: "Reports", href: "/admin/reports", icon: BarChart3, permission: "reports.view" },
    ]
  },
  {
    name: "PEOPLE",
    items: [
      { name: "Staff", href: "/admin/staff", icon: UserRoundCog, permission: "staff.view" },
      { name: "Roles & Permissions", href: "/admin/roles", icon: ShieldCheck, permission: "users.assign_role" },
    ]
  },
  {
    name: "MARKETING",
    items: [
      { name: "Gallery", href: "/admin/gallery", icon: Images, permission: "gallery.view" },
      { name: "Announcements", href: "#", icon: Megaphone, permission: "announcements.view", unimplemented: true },
    ]
  },
  {
    name: "SYSTEM",
    items: [
      { name: "Notifications", href: "#", icon: Bell, permission: "notifications.view", unimplemented: true },
      { name: "Audit Logs", href: "/admin/audit-logs", icon: ScrollText, permission: "audit_logs.view" },
      { name: "Branches", href: "#", icon: Building2, permission: "branches.view", unimplemented: true },
      { name: "Settings", href: "/admin/settings", icon: Settings, permission: "settings.view" },
    ]
  }
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
  const supabase = createClient();
  
  // State
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  
  // Collapsed sections (store by group name)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  
  // Badges data
  const [badges, setBadges] = useState<Record<string, number>>({ appointments: 0, inventory: 0 });
  
  // Branches
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [isBranchMenuOpen, setIsBranchMenuOpen] = useState(false);

  // Close mobile sidebar on navigate
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Load preferences from localStorage
  useEffect(() => {
    const savedSidebar = localStorage.getItem("cindyrella_sidebar_collapsed");
    if (savedSidebar === "true") setIsDesktopCollapsed(true);
    
    const savedGroups = localStorage.getItem("cindyrella_sidebar_groups");
    if (savedGroups) setCollapsedGroups(JSON.parse(savedGroups));
    
    const savedBranch = localStorage.getItem("cindyrella_selected_branch");
    if (savedBranch) setSelectedBranchId(savedBranch);
  }, []);

  // Fetch branches and badge counts
  useEffect(() => {
    async function fetchData() {
      // Branches
      const { data: branchesData } = await supabase.from("branches").select("*").order("name");
      if (branchesData && branchesData.length > 0) {
        setBranches(branchesData);
        if (!localStorage.getItem("cindyrella_selected_branch")) {
          const defaultBranch = branchesData[0].id;
          setSelectedBranchId(defaultBranch);
          localStorage.setItem("cindyrella_selected_branch", defaultBranch);
        }
      }

      // Badges: Appointments
      const { count: apptCount } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("status", "scheduled");
        
      // Badges: Inventory
      const { count: invCount } = await supabase
        .from("inventory_items")
        .select("*", { count: "exact", head: true })
        .lt("stock", 10);
        
      setBadges({
        appointments: apptCount || 0,
        inventory: invCount || 0,
      });
    }
    fetchData();
  }, [supabase]);

  // Handlers
  const toggleSidebar = () => {
    const newState = !isDesktopCollapsed;
    setIsDesktopCollapsed(newState);
    localStorage.setItem("cindyrella_sidebar_collapsed", String(newState));
  };

  const toggleGroup = (groupName: string) => {
    if (isDesktopCollapsed) {
      // If collapsed, clicking a group expands the sidebar
      toggleSidebar();
      return;
    }
    const newState = { ...collapsedGroups, [groupName]: !collapsedGroups[groupName] };
    setCollapsedGroups(newState);
    localStorage.setItem("cindyrella_sidebar_groups", JSON.stringify(newState));
  };
  
  const selectBranch = (id: string) => {
    setSelectedBranchId(id);
    localStorage.setItem("cindyrella_selected_branch", id);
    setIsBranchMenuOpen(false);
    // Reload page to reflect branch data if app uses this localStorage
    window.location.reload();
  };

  const selectedBranch = branches.find(b => b.id === selectedBranchId) || branches[0];

  const { hasPermission, loading: permissionsLoading } = usePermissions();

  // Render navigation tree
  const renderNav = (isMobile = false) => {
    const collapsed = !isMobile && isDesktopCollapsed;
    
    if (permissionsLoading) {
      return (
        <div className="flex-1 p-4 space-y-4">
          <div className="h-4 w-24 bg-line/50 rounded animate-pulse" />
          <div className="space-y-2">
            <div className="h-10 w-full bg-line/30 rounded-xl animate-pulse" />
            <div className="h-10 w-full bg-line/30 rounded-xl animate-pulse" />
          </div>
        </div>
      );
    }
    
    return (
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-6 scrollbar-hide">
        {NAVIGATION_GROUPS.map((group) => {
          // Check if user has permission for at least one item in this group
          const hasAnyPermissionInGroup = group.items.some(item => hasPermission(item.permission));
          
          if (!hasAnyPermissionInGroup) {
            return null; // Hide the entire group if no permissions
          }

          const isGroupCollapsed = collapsedGroups[group.name];
          
          return (
            <div key={group.name} className="flex flex-col gap-1">
              {/* Group Header */}
              <button 
                onClick={() => toggleGroup(group.name)}
                className={`flex items-center justify-between px-3 py-1.5 text-[10px] font-bold tracking-wider text-ink-soft/70 hover:text-ink transition-colors ${collapsed ? 'justify-center cursor-pointer' : ''}`}
                aria-expanded={!isGroupCollapsed}
              >
                {!collapsed ? (
                  <>
                    <span>{group.name}</span>
                    <ChevronDown size={14} className={`transition-transform duration-200 ${isGroupCollapsed ? '-rotate-90' : ''}`} />
                  </>
                ) : (
                  <div className="h-4 w-4 rounded-full bg-line/50" /> // subtle dot for collapsed groups
                )}
              </button>

              {/* Group Items */}
              <div className={`flex flex-col gap-1 overflow-hidden transition-all duration-300 ${isGroupCollapsed && !collapsed ? 'max-h-0 opacity-0' : 'max-h-[1000px] opacity-100'}`}>
                {group.items.map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;
                  const badgeCount = item.badge ? badges[item.badge] : 0;
                  
                  return (
                    <Can key={item.name} permission={item.permission}>
                      <Link
                        href={item.unimplemented ? "#" : item.href}
                        onClick={(e) => { if (item.unimplemented) e.preventDefault(); }}
                        title={collapsed ? item.name : undefined}
                        className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-royal ${
                          active 
                            ? "bg-royal/10 text-royal font-semibold" 
                            : item.unimplemented
                              ? "text-ink-soft/50 hover:bg-pale cursor-not-allowed"
                              : "text-ink-soft hover:bg-royal/5 hover:text-royal font-medium"
                        } ${collapsed ? 'justify-center' : ''}`}
                      >
                        {active && !collapsed && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-royal rounded-r-full" />
                        )}
                        
                        <Icon size={18} className={`shrink-0 ${active ? "text-royal" : "text-ink-soft group-hover:text-royal transition-colors"} ${item.unimplemented ? "opacity-50" : ""}`} />
                        
                        {!collapsed && (
                          <span className="flex-1 truncate text-sm">{item.name}</span>
                        )}
                        
                        {!collapsed && badgeCount > 0 && (
                          <span className="flex h-5 items-center justify-center rounded-full bg-royal/10 px-2 text-[10px] font-bold text-royal">
                            {badgeCount}
                          </span>
                        )}
                        {!collapsed && item.unimplemented && (
                          <span className="text-[9px] uppercase tracking-wider bg-line/50 text-ink-soft px-1.5 py-0.5 rounded">Soon</span>
                        )}
                        
                        {/* Tooltip for collapsed state */}
                        {collapsed && (
                          <div className="absolute left-full ml-4 px-2.5 py-1.5 bg-ink text-white text-xs font-medium rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 pointer-events-none flex items-center gap-2">
                            {item.name}
                            {badgeCount > 0 && <span className="bg-royal px-1.5 rounded-full text-[10px] text-white">{badgeCount}</span>}
                          </div>
                        )}
                      </Link>
                    </Can>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen w-full bg-paper font-sans">
      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileOpen(false)} />
          <div className="relative flex w-[280px] max-w-[85vw] flex-col bg-white shadow-2xl animate-in slide-in-from-left duration-300">
            {/* Mobile Drawer Header */}
            <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-line bg-pale/50">
              <Link href="/admin" className="flex items-center gap-2.5">
                <Image src="/logo.png" alt="Cindyrella Logo" width={32} height={32} className="rounded-full" />
                <span className="font-bold tracking-tight text-ink">CINDYRELLA</span>
              </Link>
              <button onClick={() => setIsMobileOpen(false)} className="p-2 -mr-2 text-ink-soft hover:text-ink rounded-full hover:bg-pale transition-colors">
                <X size={20} />
              </button>
            </div>
            {/* Mobile Nav */}
            {renderNav(true)}
            {/* Mobile Profile Footer */}
            <div className="border-t border-line p-4 bg-pale/30">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-royal to-royal-deep text-white flex items-center justify-center font-bold text-sm shadow-sm">
                  {fullName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-ink truncate">{fullName}</p>
                  <p className="text-xs text-ink-soft capitalize truncate">{role}</p>
                </div>
                <form action={signOut}>
                  <button title="Log out" className="p-2 text-ink-soft hover:text-red-500 rounded-full hover:bg-red-50 transition-colors">
                    <LogOut size={18} />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside 
        className={`hidden md:flex flex-col border-r border-line bg-white transition-all duration-300 shadow-sm z-30 sticky top-0 h-screen ${
          isDesktopCollapsed ? "w-[80px]" : "w-[260px]"
        }`}
      >
        {/* Desktop Header */}
        <div className="flex h-16 shrink-0 items-center justify-between px-4 border-b border-line bg-pale/30">
          <Link href="/admin" className={`flex items-center gap-2.5 overflow-hidden transition-all duration-300 ${isDesktopCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
            <Image src="/logo.png" alt="Cindyrella Logo" width={32} height={32} className="rounded-full shrink-0" />
            <div className="flex flex-col whitespace-nowrap">
              <span className="font-bold tracking-tight text-ink leading-tight text-sm">CINDYRELLA DRIP</span>
              <span className="text-[9px] uppercase tracking-wider text-ink-soft font-semibold">Aesthetic & Wellness</span>
            </div>
          </Link>
          
          {/* Only show logo in collapsed state */}
          {isDesktopCollapsed && (
            <Link href="/admin" className="flex items-center justify-center w-full">
              <Image src="/logo.png" alt="Cindyrella Logo" width={32} height={32} className="rounded-full shrink-0" />
            </Link>
          )}

          <button 
            onClick={toggleSidebar} 
            className="absolute -right-3 top-5 p-1 bg-white border border-line rounded-full text-ink-soft hover:text-royal hover:shadow-md transition-all z-40 hidden md:flex"
            aria-label={isDesktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isDesktopCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Desktop Branch Switcher */}
        {!isDesktopCollapsed && branches.length > 0 && (
          <div className="px-4 py-3 border-b border-line/50 relative">
            <button 
              onClick={() => setIsBranchMenuOpen(!isBranchMenuOpen)}
              className="w-full flex items-center justify-between bg-pale hover:bg-line/30 rounded-lg px-3 py-2 transition-colors border border-transparent hover:border-line"
            >
              <div className="flex items-center gap-2 truncate">
                <Building2 size={14} className="text-royal shrink-0" />
                <span className="text-xs font-semibold text-ink truncate">{selectedBranch?.name || "Main Branch"}</span>
              </div>
              <ChevronDown size={14} className={`text-ink-soft transition-transform ${isBranchMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Branch Menu Dropdown */}
            {isBranchMenuOpen && (
              <div className="absolute top-full left-4 right-4 mt-1 bg-white border border-line rounded-xl shadow-lg z-50 overflow-hidden py-1 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-3 py-2 text-[10px] font-bold text-ink-soft uppercase tracking-wider bg-pale/50">Switch Branch</div>
                <div className="max-h-[200px] overflow-y-auto">
                  {branches.map(b => (
                    <button
                      key={b.id}
                      onClick={() => selectBranch(b.id)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-pale transition-colors"
                    >
                      <span className={`truncate ${selectedBranchId === b.id ? 'font-bold text-royal' : 'text-ink'}`}>
                        {b.name}
                      </span>
                      {selectedBranchId === b.id && <Check size={14} className="text-royal shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Desktop Nav */}
        {renderNav()}

        {/* Desktop User Profile Footer */}
        <div className="border-t border-line p-4 bg-pale/30">
          <div className={`flex items-center ${isDesktopCollapsed ? 'justify-center' : 'justify-between'} gap-3`}>
            <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-royal to-royal-deep text-white flex items-center justify-center font-bold text-sm shadow-sm relative group cursor-pointer">
              {fullName.charAt(0)}
              {/* Tooltip for collapsed state */}
              {isDesktopCollapsed && (
                <div className="absolute left-full ml-4 px-3 py-2 bg-ink text-white text-xs font-medium rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 pointer-events-none flex flex-col gap-0.5">
                  <span className="font-bold">{fullName}</span>
                  <span className="text-white/70 capitalize">{role}</span>
                </div>
              )}
            </div>
            
            {!isDesktopCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-ink truncate">{fullName}</p>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-royal truncate">{role}</p>
              </div>
            )}
            
            {!isDesktopCollapsed && (
              <form action={signOut}>
                <button title="Log out" className="p-2 text-ink-soft hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                  <LogOut size={16} />
                </button>
              </form>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Mobile Header (Visible only on small screens) */}
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-line bg-white/80 backdrop-blur-md px-4 shadow-sm md:hidden">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileOpen(true)} className="p-2 -ml-2 text-ink-soft hover:text-ink hover:bg-pale rounded-full transition-colors">
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="Cindyrella Logo" width={28} height={28} className="rounded-full" />
              <span className="font-bold text-ink text-lg tracking-tight">CINDYRELLA</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative p-2 text-ink-soft">
              <Bell size={20} />
              {badges.appointments > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 w-full max-w-[1600px] mx-auto pb-24 md:pb-10">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-line pb-safe md:hidden flex items-center justify-between px-2 pt-2 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
        {[
          { name: "Home", href: "/admin", icon: LayoutDashboard },
          { name: "POS", href: "/admin/pos", icon: CreditCard },
          { name: "Appts", href: "/admin/appointments", icon: CalendarDays },
          { name: "Clients", href: "/admin/customers", icon: Users },
        ].map(item => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`flex flex-col items-center justify-center w-1/5 py-1 ${active ? 'text-royal' : 'text-ink-soft hover:text-ink'}`}
            >
              <div className={`p-1.5 rounded-xl mb-1 ${active ? 'bg-royal/10' : ''}`}>
                <Icon size={20} className={active ? 'fill-royal/20' : ''} />
              </div>
              <span className={`text-[9px] font-semibold tracking-wide ${active ? 'text-royal' : ''}`}>{item.name}</span>
            </Link>
          );
        })}
        
        <button 
          onClick={() => setIsMobileOpen(true)}
          className="flex flex-col items-center justify-center w-1/5 py-1 text-ink-soft hover:text-ink"
        >
          <div className="p-1.5 rounded-xl mb-1">
            <Menu size={20} />
          </div>
          <span className="text-[9px] font-semibold tracking-wide">More</span>
        </button>
      </div>
    </div>
  );
}
