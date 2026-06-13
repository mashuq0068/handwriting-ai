import { type ReactNode } from "react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Chrome wrapper for pages that are reachable from BOTH the public site and the
 * signed-in app (Handwriting, AI Assistant):
 *  - signed in  → persistent dashboard sidebar
 *  - signed out → marketing navbar + footer
 */
export function PageShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="font-display text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (user) {
    return (
      <DashboardLayout>
        <div className="flex min-h-screen flex-col">{children}</div>
      </DashboardLayout>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}
