import { Link, useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsOwner } from "@/lib/use-auth";
import { LayoutDashboard, MapPin, BarChart3, Users, LogOut, HardHat } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/sites", label: "Sites", icon: MapPin },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/team", label: "Team", icon: Users, ownerOnly: true },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const isOwner = useIsOwner(user?.id);
  const loc = useLocation();
  const navigate = useNavigate();
  const router = useRouter();

  async function signOut() {
    await supabase.auth.signOut();
    router.invalidate();
    navigate({ to: "/auth" });
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="px-6 py-6 flex items-center gap-3 border-b border-sidebar-border">
          <div className="size-10 rounded-xl bg-gradient-accent flex items-center justify-center">
            <HardHat className="size-5 text-accent-foreground" />
          </div>
          <div>
            <div className="font-display font-bold text-base leading-tight">SiteKhata</div>
            <div className="text-[11px] text-sidebar-foreground/60 uppercase tracking-wider">Contractor Cash Book</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map((item) => {
            if (item.ownerOnly && !isOwner) return null;
            const active = loc.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="px-3 py-2 text-xs text-sidebar-foreground/60">
            <div className="truncate text-sidebar-foreground">{user?.email}</div>
            <div className="mt-0.5 inline-flex items-center gap-1.5">
              <span className={cn("size-1.5 rounded-full", isOwner ? "bg-accent" : "bg-success")} />
              {isOwner ? "Owner" : "Supervisor"}
            </div>
          </div>
          <Button onClick={signOut} variant="ghost" className="w-full justify-start text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground">
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 bg-sidebar text-sidebar-foreground border-b border-sidebar-border px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-gradient-accent flex items-center justify-center">
            <HardHat className="size-4 text-accent-foreground" />
          </div>
          <div className="font-display font-bold">SiteKhata</div>
        </div>
        <Button onClick={signOut} variant="ghost" size="sm" className="text-sidebar-foreground"><LogOut className="size-4" /></Button>
      </div>

      <main className="flex-1 min-w-0 pt-14 md:pt-0 pb-20 md:pb-0">
        {children}
        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-sidebar text-sidebar-foreground border-t border-sidebar-border grid grid-cols-4">
          {nav.filter(n => !n.ownerOnly || isOwner).slice(0,4).map(item => {
            const Icon = item.icon;
            const active = loc.pathname.startsWith(item.to);
            return (
              <Link key={item.to} to={item.to} className={cn("flex flex-col items-center justify-center py-2.5 text-[11px] gap-1", active ? "text-accent" : "text-sidebar-foreground/70")}>
                <Icon className="size-5" />{item.label}
              </Link>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
