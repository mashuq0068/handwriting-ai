import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface MembersListProps {
  workspaceId: string;
}

interface MemberWithProfile {
  user_id: string;
  role: string;
  display_name: string | null;
  avatar_url: string | null;
}

export function MembersList({ workspaceId }: MembersListProps) {
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["workspace-members", workspaceId],
    enabled: !!workspaceId,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_members")
        .select("user_id, role, profiles!inner(display_name, avatar_url)")
        .eq("workspace_id", workspaceId);

      if (error) throw error;

      return (data ?? []).map((m: any) => ({
        user_id: m.user_id,
        role: m.role,
        display_name: m.profiles?.display_name ?? null,
        avatar_url: m.profiles?.avatar_url ?? null,
      })) as MemberWithProfile[];
    },
  });

  if (isLoading) return <p className="text-xs text-muted-foreground px-2">Loading...</p>;

  return (
    <div className="space-y-1">
      {members.map((m) => (
        <div key={m.user_id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted">
          <Avatar className="h-6 w-6">
            <AvatarImage src={m.avatar_url ?? undefined} />
            <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
              {(m.display_name ?? "U")[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="font-body text-xs text-foreground truncate flex-1">
            {m.display_name ?? "User"}
          </span>
          <Badge variant="outline" className="text-[10px] h-5 px-1.5 capitalize border-border text-muted-foreground">
            {m.role}
          </Badge>
        </div>
      ))}
    </div>
  );
}
