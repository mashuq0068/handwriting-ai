import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PenLine, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function Register() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", pw: "" });
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.pw.length < 8) {
      toast.warning("Password must be at least 8 characters");
      return;
    }
    setBusy(true);
    try {
      await signUp(form.name, form.email, form.pw);
      toast.success("Account created");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create account");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="flex items-center justify-center p-8 order-2 md:order-1">
        <div className="w-full max-w-sm space-y-6">
          <div className="md:hidden flex items-center gap-2">
            <span className="h-9 w-9 rounded-lg bg-primary text-primary-foreground grid place-items-center"><PenLine className="h-4 w-4" /></span>
            <span className="font-display text-lg font-bold">Quillify</span>
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold">Create your account</h1>
            <p className="text-muted-foreground text-sm mt-1">Five free handwritten pages, no card.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Your name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="you@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw">Password</Label>
              <Input id="pw" type="password" value={form.pw} onChange={(e) => setForm({ ...form, pw: e.target.value })} required placeholder="At least 8 characters" />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Creating…" : "Create account"}</Button>
            <p className="text-xs text-muted-foreground text-center">By creating an account, you agree to our Terms and Privacy.</p>
          </form>
          <div className="text-sm text-center text-muted-foreground">
            Already have an account? <Link to="/login" className="text-foreground font-semibold underline-offset-4 hover:underline">Sign in</Link>
          </div>
        </div>
      </div>
      <div className="hidden md:flex relative bg-secondary p-12 flex-col justify-between order-1 md:order-2">
        <Link to="/" className="flex items-center gap-2">
          <span className="h-9 w-9 rounded-lg bg-primary text-primary-foreground grid place-items-center"><PenLine className="h-4 w-4" /></span>
          <span className="font-display text-lg font-bold">Quillify</span>
        </Link>
        <div className="space-y-5">
          <h2 className="font-display text-3xl font-bold">What you get free</h2>
          <ul className="space-y-3">
            {["5 handwritten pages a month", "6 built-in handwriting styles", "PDF export", "AI writing assistant"].map((f) => (
              <li key={f} className="flex gap-2 items-start"><Check className="h-5 w-5 text-accent mt-0.5" /><span>{f}</span></li>
            ))}
          </ul>
          <div className="rounded-xl bg-card p-5 paper-ruled mt-8">
            <p className="font-hand text-2xl ink-text leading-snug">Welcome! Glad you're here. Let's write something today.</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">© Quillify</p>
      </div>
    </div>
  );
}
