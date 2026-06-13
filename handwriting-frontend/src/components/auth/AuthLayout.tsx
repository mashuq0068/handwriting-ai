import { Link } from "react-router-dom";
import { Route } from "lucide-react";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[hsl(60,20%,95.5%)] px-4">
      <Link to="/" className="flex items-center justify-center gap-2 mb-6">
        <Route className="h-7 w-7 text-foreground" />
        <span className="font-display text-xl font-bold text-foreground">Roadmapper</span>
      </Link>
      <div className="w-full max-w-sm rounded-xl border border-border/60 bg-white shadow-lg shadow-black/8 p-8 space-y-8">
        {children}
      </div>
    </div>
  );
}
