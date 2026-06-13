import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PenLine } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();
  const from = (location.state as { from?: string } | null)?.from || "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await signIn(email, pw);
      toast.success("Signed in");
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex relative bg-primary text-primary-foreground p-12 flex-col justify-between paper-ruled" style={{ backgroundColor: "hsl(var(--primary))" }}>
        <Link to="/" className="flex items-center gap-2">
          <span className="h-9 w-9 rounded-lg bg-accent text-accent-foreground grid place-items-center"><PenLine className="h-4 w-4" /></span>
          <span className="font-display text-lg font-bold">Quillify</span>
        </Link>
        <div>
          <p className="font-hand text-5xl leading-tight">"It looks like I sat down for an hour and wrote it. It took 12 seconds."</p>
          <p className="text-sm text-primary-foreground/70 mt-6">— Maya R., Personal plan</p>
        </div>
        <p className="text-xs text-primary-foreground/50">© Quillify</p>
      </div>
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-6">
          <div className="md:hidden flex items-center gap-2">
            <span className="h-9 w-9 rounded-lg bg-primary text-primary-foreground grid place-items-center"><PenLine className="h-4 w-4" /></span>
            <span className="font-display text-lg font-bold">Quillify</span>
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold">Welcome back</h1>
            <p className="text-muted-foreground text-sm mt-1">Sign in to keep writing.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw">Password</Label>
              <Input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} required placeholder="••••••••" />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
          </form>
          <div className="text-sm text-center text-muted-foreground">
            New to Quillify? <Link to="/register" className="text-foreground font-semibold underline-offset-4 hover:underline">Create an account</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
