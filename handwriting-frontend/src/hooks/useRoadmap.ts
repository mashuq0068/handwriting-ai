import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ensureWorkspace, ensureRoadmap, seedDemoRoadmaps } from "@/lib/workspace";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type RoadmapItemRow = Tables<"roadmap_items">;
export type RoadmapRow = Tables<"roadmaps">;

export function useWorkspaceSetup() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["workspace-setup", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const workspaceId = await ensureWorkspace(user.id);
      const roadmapId = await ensureRoadmap(workspaceId, user.id);
      await seedDemoRoadmaps(workspaceId, user.id);
      return { workspaceId, roadmapId };
    },
    enabled: !!user,
    staleTime: Infinity,
  });
}

export function useRoadmaps(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["roadmaps", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roadmaps")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as RoadmapRow[];
    },
    enabled: !!workspaceId,
  });
}

export function useRoadmapItems(roadmapId: string | undefined) {
  return useQuery({
    queryKey: ["roadmap-items", roadmapId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roadmap_items")
        .select("*")
        .eq("roadmap_id", roadmapId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as RoadmapItemRow[];
    },
    enabled: !!roadmapId,
  });
}

export function useCreateRoadmapItem(roadmapId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: Omit<TablesInsert<"roadmap_items">, "roadmap_id">) => {
      const { data, error } = await supabase
        .from("roadmap_items")
        .insert({ ...item, roadmap_id: roadmapId! })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmap-items", roadmapId] });
    },
  });
}

export function useUpdateRoadmapItem(roadmapId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"roadmap_items"> & { id: string }) => {
      const { data, error } = await supabase
        .from("roadmap_items")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmap-items", roadmapId] });
    },
  });
}

export function useDeleteRoadmapItem(roadmapId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("roadmap_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmap-items", roadmapId] });
    },
  });
}

export function useCreateRoadmap(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (title: string) => {
      if (!workspaceId) throw new Error("Workspace not ready");
      const { data, error } = await supabase
        .from("roadmaps")
        .insert({
          workspace_id: workspaceId!,
          title,
          created_by: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmaps", workspaceId] });
    },
  });
}

export function useDeleteRoadmap(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roadmapId: string) => {
      const { error } = await supabase
        .from("roadmaps")
        .delete()
        .eq("id", roadmapId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmaps", workspaceId] });
    },
  });
}
