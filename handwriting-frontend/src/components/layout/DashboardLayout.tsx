import { type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { PenLine, Sparkles, LogOut, LayoutDashboard, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { documentsApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
  { icon: FolderOpen, label: "My documents", to: "/documents" },
  { icon: Sparkles, label: "Handwriting (AI)", to: "/handwriting/ai", beta: true },
  { icon: PenLine, label: "Handwriting (Manual)", to: "/handwriting/manual", beta: true },
];

/**
 * App shell for the signed-in area. Renders a persistent sidebar that stays
 * visible across all dashboard pages; page content goes in `children`.
 */
export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Lightweight count for the plan box (limit=1, we only need `total`).
  const { data } = useQuery({
    queryKey: ["documents", "count"],
    queryFn: () => documentsApi.list({ page: 1, limit: 1 }),
  });
  const total = data?.total ?? 0;

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:flex w-60 shrink-0 border-r border-border bg-card flex-col sticky top-0 h-screen">
        <div className="p-5 border-b border-border">
          <Link to="/" className="flex items-center gap-2">
            <span className="h-9 w-9 rounded-lg bg-primary text-primary-foreground grid place-items-center"><PenLine className="h-4 w-4" /></span>
            <span className="font-display text-lg font-bold">Quillify</span>
          </Link>
        </div>
        <nav className="p-3 space-y-1 flex-1">
          {NAV.map((i) => {
            const active = location.pathname === i.to;
            return (
              <Link
                key={i.label}
                to={i.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                  active ? "bg-secondary font-semibold" : "text-muted-foreground hover:bg-secondary/60"
                }`}
              >
                <i.icon className="h-4 w-4" />
                <span className="flex-1 truncate">{i.label}</span>
                {i.beta && <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent/20 text-accent font-semibold">beta</span>}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border">
          <div className="px-3 py-3 rounded-lg bg-accent/10 text-sm">
            <p className="font-semibold text-foreground">Free plan</p>
            <p className="text-xs text-muted-foreground mt-0.5">{total} document{total === 1 ? "" : "s"}</p>
            <Link to="/pricing"><Button size="sm" className="w-full mt-2">Upgrade</Button></Link>
          </div>
          <button onClick={handleSignOut} className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary/60 mt-2">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}

// Shared relative-time helper used by dashboard + documents pages.
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const day = 24 * 60 * 60 * 1000;
  if (diff < 60 * 1000) return "Just now";
  if (new Date(then).toDateString() === new Date().toDateString()) return "Today";
  if (diff < 2 * day) return "Yesterday";
  if (diff < 7 * day) return `${Math.floor(diff / day)} days ago`;
  return new Date(then).toLocaleDateString();
}
