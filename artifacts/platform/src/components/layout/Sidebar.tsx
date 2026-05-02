import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Users, 
  MapPin, 
  Home, 
  GraduationCap, 
  Briefcase, 
  Settings,
  Menu,
  X,
  Plane,
  Bell,
  FileText,
  Layers,
  CreditCard,
  Kanban,
  CalendarDays,
  ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetAlertCount } from "@workspace/api-client-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/relocations", label: "Relocations", icon: Plane },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/team", label: "Team", icon: Users },
  { href: "/neighbourhoods", label: "Neighbourhoods", icon: MapPin },
  { href: "/followups", label: "Follow-ups", icon: ListChecks },
  { href: "/alerts", label: "Alerts", icon: Bell, alertBadge: true },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/templates", label: "Templates", icon: Layers },
  { href: "/profiles", label: "Profiles", icon: Users },
  { href: "/housing", label: "Housing", icon: Home },
  { href: "/schools", label: "Schools", icon: GraduationCap },
  { href: "/vendors", label: "Vendors", icon: Briefcase },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  onSearchOpen?: () => void;
}

export function Sidebar({ onSearchOpen }: SidebarProps) {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const { data: alertCountData } = useGetAlertCount({
    query: { queryKey: ["alerts-count"], refetchInterval: 60_000 }
  });
  const alertCount = alertCountData?.count ?? 0;

  return (
    <>
      {/* Mobile Toggle */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2 font-semibold">
          <MapPin className="h-5 w-5 text-primary" />
          <span>Nairobi Concierge</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} className="text-sidebar-foreground">
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-transform transform md:translate-x-0 flex flex-col",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center gap-3 p-6 font-bold text-lg border-b border-sidebar-border tracking-tight text-sidebar-primary-foreground">
          <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
            <MapPin className="h-5 w-5" />
          </div>
          Nairobi Concierge
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4">
          <div className="text-xs font-medium text-sidebar-accent-foreground uppercase tracking-wider mb-4 px-2">Menu</div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              const showBadge = item.alertBadge && alertCount > 0;
              
              return (
                <Link key={item.href} href={item.href}>
                  <div className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors cursor-pointer text-sm font-medium",
                    isActive 
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" 
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}>
                    <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-sidebar-foreground/60")} />
                    <span className="flex-1">{item.label}</span>
                    {showBadge && (
                      <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none">
                        {alertCount > 99 ? "99+" : alertCount}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold uppercase">
              AM
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">Account Manager</span>
              <span className="text-xs text-sidebar-foreground/60">admin@nairobi.app</span>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
