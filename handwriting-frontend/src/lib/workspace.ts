import { supabase } from "@/integrations/supabase/client";

/**
 * Ensures the current user has at least one workspace.
 * If not, creates a default one. Returns the workspace id.
 */
export async function ensureWorkspace(userId: string): Promise<string> {
  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1);

  if (memberships && memberships.length > 0) {
    return memberships[0].workspace_id;
  }

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .insert({ name: "My Workspace", owner_id: userId })
    .select("id")
    .single();

  if (error) throw error;
  return workspace.id;
}

/**
 * Ensures a workspace has at least one roadmap.
 * If not, creates a default one. Returns the roadmap id.
 */
export async function ensureRoadmap(workspaceId: string, userId: string): Promise<string> {
  const { data: roadmaps } = await supabase
    .from("roadmaps")
    .select("id")
    .eq("workspace_id", workspaceId)
    .limit(1);

  if (roadmaps && roadmaps.length > 0) {
    return roadmaps[0].id;
  }

  const { data: roadmap, error } = await supabase
    .from("roadmaps")
    .insert({
      workspace_id: workspaceId,
      title: "My First Roadmap",
      created_by: userId,
      template_type: "blank",
    })
    .select("id")
    .single();

  if (error) throw error;
  return roadmap.id;
}

/**
 * Seeds the workspace with two demo roadmaps if only the default one exists.
 */
export async function seedDemoRoadmaps(workspaceId: string, userId: string): Promise<void> {
  const { data: roadmaps } = await supabase
    .from("roadmaps")
    .select("id")
    .eq("workspace_id", workspaceId);

  // Only seed if there's exactly 1 roadmap (the default)
  if (!roadmaps || roadmaps.length !== 1) return;

  // Delete the default "My First Roadmap" — we'll replace it
  await supabase.from("roadmaps").delete().eq("id", roadmaps[0].id);

  // --- Software Development Roadmap ---
  const { data: devRoadmap } = await supabase
    .from("roadmaps")
    .insert({
      workspace_id: workspaceId,
      title: "Software Development",
      created_by: userId,
      template_type: "blank",
    })
    .select("id")
    .single();

  if (devRoadmap) {
    const devItems = [
      { title: "Discovery & Requirements", status: "completed" as const, priority: "high" as const, sort_order: 0, description: "Gather stakeholder requirements and define project scope" },
      { title: "Architecture Design", status: "completed" as const, priority: "high" as const, sort_order: 1, description: "Design system architecture and tech stack decisions" },
      { title: "Database Schema", status: "completed" as const, priority: "high" as const, sort_order: 2, description: "Design and implement database models and migrations" },
      { title: "Backend API Development", status: "in_progress" as const, priority: "high" as const, sort_order: 3, description: "Build RESTful API endpoints and business logic" },
      { title: "Authentication System", status: "in_progress" as const, priority: "high" as const, sort_order: 4, description: "Implement user auth, roles, and permissions" },
      { title: "Frontend UI Components", status: "in_progress" as const, priority: "medium" as const, sort_order: 5, description: "Build reusable component library and page layouts" },
      { title: "Integration Testing", status: "planned" as const, priority: "medium" as const, sort_order: 6, description: "Write integration and end-to-end test suites" },
      { title: "CI/CD Pipeline", status: "planned" as const, priority: "medium" as const, sort_order: 7, description: "Set up automated build, test, and deployment pipeline" },
      { title: "Performance Optimization", status: "planned" as const, priority: "low" as const, sort_order: 8, description: "Profile and optimize load times, queries, and caching" },
      { title: "Launch & Deployment", status: "planned" as const, priority: "high" as const, sort_order: 9, description: "Production deployment, monitoring, and go-live checklist" },
    ];

    await supabase.from("roadmap_items").insert(
      devItems.map((item, i) => ({
        ...item,
        roadmap_id: devRoadmap.id,
        position_x: 20,
        position_y: i * 70,
        width: 200,
        height: 56,
      }))
    );
  }

  // --- Marketing Campaign Release Roadmap ---
  const { data: mktRoadmap } = await supabase
    .from("roadmaps")
    .insert({
      workspace_id: workspaceId,
      title: "Marketing Campaign Release",
      created_by: userId,
      template_type: "blank",
    })
    .select("id")
    .single();

  if (mktRoadmap) {
    const mktItems = [
      { title: "Market Research & Analysis", status: "completed" as const, priority: "high" as const, sort_order: 0, description: "Competitive analysis and target audience research" },
      { title: "Brand Strategy & Messaging", status: "completed" as const, priority: "high" as const, sort_order: 1, description: "Define brand voice, key messages, and value propositions" },
      { title: "Content Calendar Planning", status: "completed" as const, priority: "medium" as const, sort_order: 2, description: "Plan content schedule across all channels" },
      { title: "Social Media Campaign", status: "in_progress" as const, priority: "high" as const, sort_order: 3, description: "Create and schedule social media content and ads" },
      { title: "Email Marketing Sequences", status: "in_progress" as const, priority: "medium" as const, sort_order: 4, description: "Design drip campaigns and newsletter sequences" },
      { title: "Landing Page Design", status: "in_progress" as const, priority: "high" as const, sort_order: 5, description: "Design and build campaign landing pages with A/B tests" },
      { title: "PR & Media Outreach", status: "planned" as const, priority: "medium" as const, sort_order: 6, description: "Press releases and media relationship building" },
      { title: "Influencer Partnerships", status: "planned" as const, priority: "low" as const, sort_order: 7, description: "Identify and negotiate influencer collaborations" },
      { title: "Analytics & Tracking Setup", status: "planned" as const, priority: "medium" as const, sort_order: 8, description: "Configure conversion tracking and attribution models" },
      { title: "Launch Event Coordination", status: "planned" as const, priority: "high" as const, sort_order: 9, description: "Plan and execute the campaign launch event" },
    ];

    await supabase.from("roadmap_items").insert(
      mktItems.map((item, i) => ({
        ...item,
        roadmap_id: mktRoadmap.id,
        position_x: 20,
        position_y: i * 70,
        width: 200,
        height: 56,
      }))
    );
  }
}
