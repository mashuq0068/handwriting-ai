import { useWorkspaceSetup, useRoadmaps } from "@/hooks/useRoadmap";
import { useAnalyticsData } from "@/hooks/useAnalytics";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Route, CheckCircle2, Clock, AlertTriangle, Layers } from "lucide-react";
import { useState } from "react";
import SEOHead from "@/components/SEOHead";

// Brand-aligned chart colors using the Emerald design system
const COLORS = {
  completed: "hsl(160, 84%, 18%)",
  in_progress: "hsl(160, 84%, 32%)",
  planned: "hsl(60, 20%, 80%)",
  high: "hsl(160, 50%, 10%)",
  medium: "hsl(160, 84%, 28%)",
  low: "hsl(60, 20%, 80%)",
};

export default function Analytics() {
  const { data: setup, isLoading: setupLoading } = useWorkspaceSetup();
  const workspaceId = setup?.workspaceId;
  const { data: roadmaps = [] } = useRoadmaps(workspaceId);
  const { items, isLoading } = useAnalyticsData(workspaceId);
  const navigate = useNavigate();
  const [activeRoadmapId, setActiveRoadmapId] = useState<string | null>(null);

  const handleSelectRoadmap = (id: string) => {
    setActiveRoadmapId(id);
    navigate("/app");
  };

  if (setupLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="font-display text-sm text-muted-foreground animate-fade-in">Loading analytics…</p>
      </div>
    );
  }

  const totalRoadmaps = roadmaps.length;
  const totalItems = items.length;
  const completedItems = items.filter((i) => i.status === "completed").length;
  const inProgressItems = items.filter((i) => i.status === "in_progress").length;
  const plannedItems = items.filter((i) => i.status === "planned").length;
  const highPriorityItems = items.filter((i) => i.priority === "high").length;

  const statusData = [
    { name: "Completed", value: completedItems, color: COLORS.completed },
    { name: "In Progress", value: inProgressItems, color: COLORS.in_progress },
    { name: "Planned", value: plannedItems, color: COLORS.planned },
  ];

  const priorityData = [
    { name: "High", count: highPriorityItems, fill: COLORS.high },
    { name: "Medium", count: items.filter((i) => i.priority === "medium").length, fill: COLORS.medium },
    { name: "Low", count: items.filter((i) => i.priority === "low").length, fill: COLORS.low },
  ];

  const kpis = [
    { label: "Total Roadmaps", value: totalRoadmaps, icon: Route },
    { label: "Total Items", value: totalItems, icon: Layers },
    { label: "Completed", value: completedItems, icon: CheckCircle2 },
    { label: "In Progress", value: inProgressItems, icon: Clock },
    { label: "High Priority", value: highPriorityItems, icon: AlertTriangle },
  ];

  return (
    <SidebarProvider>
        <SEOHead
          title="Analytics — Roadmapper"
          description="Track roadmap progress with status breakdowns, priority distribution, and key performance metrics."
          url="https://myroadmapcanvas.lovable.app/app/analytics"
        />
        <div className="min-h-screen flex w-full">
        <AppSidebar
          roadmaps={roadmaps}
          activeRoadmapId={activeRoadmapId}
          onSelectRoadmap={handleSelectRoadmap}
          onCreateRoadmap={() => navigate("/app")}
          workspaceId={workspaceId ?? null}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-11 flex items-center border-b bg-background px-3 shrink-0">
            <SidebarTrigger className="h-7 w-7" />
            <span className="font-display text-sm font-medium text-foreground ml-2">Analytics</span>
          </header>

          <div className="flex-1 overflow-auto p-6 md:p-10">
            <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
              <div>
                <h1 className="font-display text-2xl font-bold text-foreground">Analytics</h1>
                <p className="font-body text-sm text-muted-foreground mt-1">
                  Overview of your workspace roadmaps and items
                </p>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {kpis.map((kpi) => (
                  <Card key={kpi.label}>
                    <CardContent className="p-4 flex flex-col items-center gap-2">
                      <kpi.icon className="h-5 w-5 text-primary" />
                      <span className="font-display text-2xl font-bold text-foreground">{kpi.value}</span>
                      <span className="font-body text-xs text-muted-foreground text-center">{kpi.label}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Donut Chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-base">Items by Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: "hsl(60, 20%, 97.5%)",
                            border: "1px solid hsl(60, 15%, 87%)",
                            borderRadius: "8px",
                            fontFamily: "Figtree, sans-serif",
                            fontSize: "13px",
                          }}
                        />
                        <Legend
                          formatter={(value) => (
                            <span className="font-body text-xs text-foreground">{value}</span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Bar Chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-base">Items by Priority</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={priorityData} barSize={40}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(60, 15%, 87%)" vertical={true} horizontal={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontFamily: "Figtree, sans-serif", fontSize: 12, fill: "hsl(0, 0%, 40%)" }}
                          axisLine={{ stroke: "hsl(60, 15%, 87%)" }}
                          tickLine={false}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontFamily: "Figtree, sans-serif", fontSize: 12, fill: "hsl(0, 0%, 40%)" }}
                          axisLine={{ stroke: "hsl(60, 15%, 87%)" }}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(60, 20%, 97.5%)",
                            border: "1px solid hsl(60, 15%, 87%)",
                            borderRadius: "8px",
                            fontFamily: "Figtree, sans-serif",
                            fontSize: "13px",
                          }}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {priorityData.map((entry, index) => (
                            <Cell key={`bar-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
