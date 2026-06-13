import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PenLine, Menu } from "lucide-react";
import { useState } from "react";

const LINKS = [
  { to: "/how-it-works", label: "How it works" },
  { to: "/templates", label: "Templates" },
  { to: "/assistant", label: "AI Assistant" },
  { to: "/pricing", label: "Pricing" },
];

export default function Navbar({ transparent = false }: { transparent?: boolean }) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  return (
    <header className={`w-full ${transparent ? "absolute top-0 left-0 right-0 z-30" : "border-b border-border bg-background/80 backdrop-blur sticky top-0 z-30"}`}>
      <div className="mx-auto max-w-6xl px-5 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="h-9 w-9 rounded-lg bg-primary text-primary-foreground grid place-items-center">
            <PenLine className="h-4 w-4" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">Quillify</span>
        </Link>
        <nav className="hidden md:flex items-center gap-7">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`text-sm transition-colors ${
                pathname === l.to ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-2">
          <Link to="/login">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link to="/register">
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              Get started
            </Button>
          </Link>
        </div>
        <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
          <Menu className="h-6 w-6" />
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-border bg-background px-5 py-3 space-y-2">
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to} className="block py-2 text-sm" onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          <div className="flex gap-2 pt-2">
            <Link to="/login" className="flex-1"><Button variant="outline" size="sm" className="w-full">Sign in</Button></Link>
            <Link to="/register" className="flex-1"><Button size="sm" className="w-full">Get started</Button></Link>
          </div>
        </div>
      )}
    </header>
  );
}
