import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export interface CommentWithProfile {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export function useComments(itemId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["comments", itemId],
    enabled: !!itemId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("id, content, created_at, user_id, profiles!inner(display_name, avatar_url)")
        .eq("roadmap_item_id", itemId!)
        .order("created_at", { ascending: true });

      if (error) throw error;

      return (data ?? []).map((c: any) => ({
        id: c.id,
        content: c.content,
        created_at: c.created_at,
        user_id: c.user_id,
        display_name: c.profiles?.display_name ?? null,
        avatar_url: c.profiles?.avatar_url ?? null,
      })) as CommentWithProfile[];
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!itemId) return;

    const channel = supabase
      .channel(`comments-${itemId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `roadmap_item_id=eq.${itemId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["comments", itemId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [itemId, queryClient]);

  return query;
}

export function useCreateComment(itemId: string | null) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (content: string) => {
      if (!itemId || !user) throw new Error("Missing item or user");
      const { data, error } = await supabase
        .from("comments")
        .insert({ roadmap_item_id: itemId, user_id: user.id, content })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", itemId] });
    },
  });
}

export function useDeleteComment(itemId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase.from("comments").delete().eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", itemId] });
    },
  });
}
