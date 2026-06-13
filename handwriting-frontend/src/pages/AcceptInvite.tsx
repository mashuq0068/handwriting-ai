import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "error" | "success" | "login_required">("loading");

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setStatus("login_required");
      return;
    }

    if (!token) {
      setStatus("error");
      return;
    }

    const acceptInvite = async () => {
      try {
        // Find the invitation
        const { data: invitation, error: fetchErr } = await supabase
          .from("workspace_invitations")
          .select("*")
          .eq("token", token)
          .eq("status", "pending")
          .single();

        if (fetchErr || !invitation) {
          setStatus("error");
          toast.error("Invitation not found or already used");
          return;
        }

        // Check email matches
        if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
          setStatus("error");
          toast.error("This invitation was sent to a different email address");
          return;
        }

        // Add to workspace_members
        const { error: memberErr } = await supabase
          .from("workspace_members")
          .insert({
            workspace_id: invitation.workspace_id,
            user_id: user.id,
            role: invitation.role,
          });

        if (memberErr && memberErr.code !== "23505") {
          throw memberErr;
        }

        // Mark invitation accepted
        await supabase
          .from("workspace_invitations")
          .update({ status: "accepted" })
          .eq("id", invitation.id);

        setStatus("success");
        toast.success("You've joined the workspace!");
        setTimeout(() => navigate("/"), 1500);
      } catch {
        setStatus("error");
        toast.error("Failed to accept invitation");
      }
    };

    acceptInvite();
  }, [user, authLoading, token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3 p-8">
        {status === "loading" && (
          <p className="font-display text-sm text-muted-foreground">Accepting invitation...</p>
        )}
        {status === "login_required" && (
          <>
            <p className="font-display text-sm text-foreground">Please log in to accept this invitation.</p>
            <a href="/login" className="font-display text-sm text-primary underline">Go to Login</a>
          </>
        )}
        {status === "error" && (
          <>
            <p className="font-display text-sm text-destructive">Unable to accept invitation.</p>
            <a href="/" className="font-display text-sm text-primary underline">Go to Dashboard</a>
          </>
        )}
        {status === "success" && (
          <p className="font-display text-sm text-foreground">Welcome! Redirecting...</p>
        )}
      </div>
    </div>
  );
}
