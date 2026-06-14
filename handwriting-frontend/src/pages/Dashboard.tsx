import { Link, useNavigate } from "react-router-dom";
import { FileText, Upload, Plus, Trash2, Sparkles, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { documentsApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout, timeAgo } from "@/components/layout/DashboardLayout";

const RECENT_LIMIT = 5;

// The handwriting library stays static — training lives on its own page.
const HANDS = [
  { name: "Casual", trained: false },
  { name: "Neat Notes", trained: false },
  { name: "My handwriting", trained: true },
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["documents", "recent"],
    queryFn: () => documentsApi.list({ page: 1, limit: RECENT_LIMIT }),
  });
  const documents = data?.documents ?? [];
  const total = data?.total ?? 0;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document deleted");
    },
    onError: () => toast.error("Could not delete document"),
  });

  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <DashboardLayout>
      {/* Topbar */}
      <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-10">
        <div className="px-6 py-3 flex items-center gap-4">
          <div className="md:hidden flex items-center gap-2 font-display font-bold">
            <span className="h-8 w-8 rounded-lg bg-primary text-primary-foreground grid place-items-center"><PenLine className="h-4 w-4" /></span>
            Quillify
          </div>
          <div className="flex-1" />
          <Link to="/editor">
            <Button><Plus className="h-4 w-4 mr-1.5" /> New document</Button>
          </Link>
          <span className="h-9 w-9 rounded-full bg-gradient-to-br from-amber-300 to-rose-400 grid place-items-center text-sm font-bold text-white">
            {(user?.name || user?.email || "?").charAt(0).toUpperCase()}
          </span>
        </div>
      </header>

      <div className="p-6 max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Welcome back, {firstName} <span className="font-hand text-4xl ink-text ml-1">👋</span></h1>
          <p className="text-muted-foreground mt-1">Let's hand-write something today.</p>
        </div>

        {/* Quick actions */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: FileText, title: "Paste text", body: "Convert typed text", to: "/editor" },
            { icon: Upload, title: "Upload PDF", body: "Drop a file to convert", to: "/editor" },
            { icon: PenLine, title: "Train hand (Manual)", body: "Write your letters", to: "/handwriting/manual" },
            { icon: Sparkles, title: "Train hand (AI)", body: "From a photo", to: "/handwriting/ai" },
          ].map((q) => (
            <Link key={q.title} to={q.to} className="group rounded-2xl border border-border bg-card p-5 hover:shadow-md hover:-translate-y-0.5 transition">
              <span className="h-10 w-10 rounded-lg bg-accent/15 text-accent grid place-items-center mb-3"><q.icon className="h-5 w-5" /></span>
              <p className="font-display font-bold">{q.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{q.body}</p>
            </Link>
          ))}
        </div>

        {/* Recent documents (latest 5) */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold">Recent documents</h2>
            {total > RECENT_LIMIT && (
              <Link to="/documents"><Button variant="ghost" size="sm">View all ({total})</Button></Link>
            )}
          </div>
          <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
            ) : documents.length === 0 ? (
              <div className="p-10 text-center">
                <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                <p className="font-semibold">No documents yet</p>
                <p className="text-sm text-muted-foreground mt-1">Create your first handwritten document.</p>
                <Link to="/editor"><Button className="mt-4"><Plus className="h-4 w-4 mr-1.5" /> New document</Button></Link>
              </div>
            ) : (
              documents.map((r) => (
                <div key={r.id} className="flex items-center gap-4 p-4 hover:bg-secondary/30">
                  <span className="h-10 w-10 rounded-lg bg-secondary grid place-items-center text-muted-foreground"><FileText className="h-4 w-4" /></span>
                  <Link to={`/editor?id=${r.id}`} className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {(r.fontName || r.language)} • {r.pageCount} {r.pageCount === 1 ? "page" : "pages"} • {timeAgo(r.updatedAt)}
                    </p>
                  </Link>
                  <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(r.id)} disabled={deleteMutation.isPending} title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Link to={`/editor?id=${r.id}`}><Button size="sm" variant="outline">Open</Button></Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Handwriting library (static) */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold">Your handwriting</h2>
            <Link to="/handwriting/manual"><Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" /> Add new</Button></Link>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {HANDS.map((h) => (
              <div key={h.name} className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="paper-ruled p-5 h-28">
                  <p className="font-hand ink-text text-xl">Sample handwriting line.</p>
                </div>
                <div className="p-4 border-t border-border flex items-center justify-between">
                  <p className="font-semibold text-sm">{h.name}</p>
                  {h.trained && <span className="text-[10px] px-2 py-0.5 rounded bg-accent/20 text-accent font-semibold">Trained</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
