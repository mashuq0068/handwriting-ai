import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import AuthLayout from "@/components/auth/AuthLayout";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <AuthLayout>
      <div className="text-center space-y-2">
        <h1 className="font-display text-2xl font-semibold text-foreground">Reset password</h1>
        <p className="font-body text-sm text-muted-foreground">
          {sent ? "Check your email for a reset link." : "Enter your email to receive a reset link."}
        </p>
      </div>

      {!sent && (
        <form onSubmit={handleReset} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="font-display text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="font-body"
            />
          </div>
          <Button type="submit" className="w-full font-display" disabled={loading}>
            {loading ? "Sending..." : "Send reset link"}
          </Button>
        </form>
      )}

      <p className="text-center font-body text-sm text-muted-foreground">
        <Link to="/login" className="text-primary hover:underline">Back to sign in</Link>
      </p>
    </AuthLayout>
  );
}
