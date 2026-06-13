import { useState } from "react";
import { Route, Plus, ChevronDown, LogOut, Users, Trash2, BarChart3 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { InviteDialog } from "@/components/workspace/InviteDialog";
import { MembersList } from "@/components/workspace/MembersList";
import type { RoadmapRow } from "@/hooks/useRoadmap";

interface AppSidebarProps {
  roadmaps: RoadmapRow[];
  activeRoadmapId: string | null;
  onSelectRoadmap: (id: string) => void;
  onCreateRoadmap: () => void;
  onDeleteRoadmap?: (id: string) => void;
  workspaceId: string | null;
}

export function AppSidebar({ roadmaps, activeRoadmapId, onSelectRoadmap, onCreateRoadmap, onDeleteRoadmap, workspaceId }: AppSidebarProps) {
  const { state, isMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const { signOut, user } = useAuth();
  const [deleteTarget, setDeleteTarget] = useState<RoadmapRow | null>(null);
  const navigate = useNavigate();

  return (
    <>
      <Sidebar collapsible="icon" className="border-r-0">
        <SidebarHeader className="p-4">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <Route className="h-5 w-5 text-foreground" />
              <span className="font-display text-sm font-semibold tracking-tight text-foreground">
                Roadmapper
              </span>
            </div>
          )}
          {collapsed && <Route className="h-5 w-5 text-foreground mx-auto" />}
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="w-full">
                <SidebarGroupLabel className="text-[10px] uppercase tracking-widest font-display text-sidebar-foreground/50 flex items-center justify-between cursor-pointer">
                  Roadmaps
                  {!collapsed && <ChevronDown className="h-3 w-3" />}
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {roadmaps.map((roadmap) => (
                      <SidebarMenuItem key={roadmap.id}>
                        <SidebarMenuButton
                          className={`text-sidebar-foreground hover:bg-muted group rounded-lg ${
                            roadmap.id === activeRoadmapId ? "bg-secondary font-medium" : ""
                          }`}
                          isActive={roadmap.id === activeRoadmapId}
                          onClick={() => onSelectRoadmap(roadmap.id)}
                          tooltip={collapsed ? roadmap.title : undefined}
                        >
                          {collapsed ? (
                            <span className="font-display text-[10px] font-semibold uppercase w-full text-center truncate">
                              {roadmap.title.slice(0, 2)}
                            </span>
                          ) : (
                            <>
                              <span className="font-body text-sm truncate flex-1">{roadmap.title}</span>
                              {onDeleteRoadmap && roadmaps.length > 1 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteTarget(roadmap);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/20"
                                >
                                  <Trash2 className="h-3 w-3 text-sidebar-foreground/50 hover:text-destructive" />
                                </button>
                              )}
                            </>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        className="text-foreground hover:bg-muted font-display text-sm font-medium"
                        onClick={onCreateRoadmap}
                        tooltip={collapsed ? "New roadmap" : undefined}
                      >
                        <Plus className="h-4 w-4" />
                        {!collapsed && <span>New roadmap</span>}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>

          {/* Analytics Link */}
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    className="text-sidebar-foreground hover:bg-muted"
                    onClick={() => navigate("/app/analytics")}
                  >
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    {!collapsed && <span className="font-display text-sm">Analytics</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-2 space-y-0">
          {/* Team section */}
          {workspaceId && !collapsed && (
            <Collapsible>
              <CollapsibleTrigger className="w-full">
                <div className="text-[10px] uppercase tracking-widest font-display text-muted-foreground flex items-center justify-between cursor-pointer px-2 py-1.5">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3 w-3" />
                    Team
                  </span>
                  <ChevronDown className="h-3 w-3" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="py-1 px-1">
                  <MembersList workspaceId={workspaceId} />
                  <div className="mt-1.5">
                    <InviteDialog workspaceId={workspaceId} />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
          {workspaceId && collapsed && (
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton className="text-muted-foreground hover:bg-muted" tooltip="Team">
                  <Users className="h-4 w-4" />
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          )}

          <Separator className="my-1.5" />

          {/* Account section */}
          {!collapsed && user && (
            <p className="px-2 py-1 font-body text-xs text-muted-foreground truncate">
              {user.email}
            </p>
          )}
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => signOut()}
              >
                <LogOut className="h-4 w-4" />
                {!collapsed && <span className="font-body text-sm">Sign Out</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Delete Roadmap</AlertDialogTitle>
            <AlertDialogDescription className="font-body">
              Are you sure you want to delete "<strong>{deleteTarget?.title}</strong>"? This will permanently remove the roadmap and all its items. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-display">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="font-display bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget && onDeleteRoadmap) {
                  onDeleteRoadmap(deleteTarget.id);
                }
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
