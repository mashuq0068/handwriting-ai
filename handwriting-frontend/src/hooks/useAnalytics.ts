import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { RoadmapItemRow, RoadmapRow } from "@/hooks/useRoadmap";

export function useAnalyticsData(workspaceId: string | undefined) {
  const roadmapsQuery = useQuery({
    queryKey: ["analytics-roadmaps", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roadmaps")
        .select("*")
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      return data as RoadmapRow[];
    },
    enabled: !!workspaceId,
  });

  const itemsQuery = useQuery({
    queryKey: ["analytics-items", workspaceId],
    queryFn: async () => {
      if (!roadmapsQuery.data) return [];
      const roadmapIds = roadmapsQuery.data.map((r) => r.id);
      if (roadmapIds.length === 0) return [];
      const { data, error } = await supabase
        .from("roadmap_items")
        .select("*")
        .in("roadmap_id", roadmapIds);
      if (error) throw error;
      return data as RoadmapItemRow[];
    },
    enabled: !!roadmapsQuery.data && roadmapsQuery.data.length > 0,
  });

  return {
    roadmaps: roadmapsQuery.data ?? [],
    items: itemsQuery.data ?? [],
    isLoading: roadmapsQuery.isLoading || itemsQuery.isLoading,
  };
}
