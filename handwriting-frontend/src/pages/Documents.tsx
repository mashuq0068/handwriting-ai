import { useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Plus, Trash2, Search, ChevronLeft, ChevronRight, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import { documentsApi } from "@/lib/api";
import { DashboardLayout, timeAgo } from "@/components/layout/DashboardLayout";

const PAGE_SIZE = 8;

export default function Documents() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["documents", "list", page, search],
    queryFn: () => documentsApi.list({ page, limit: PAGE_SIZE, q: search || undefined }),
    placeholderData: keepPreviousData,
  });

  const documents = data?.documents ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document deleted");
    },
    onError: () => toast.error("Could not delete document"),
  });

  const onSearch = (value: string) => {
    setSearch(value);
    setPage(1); // reset to first page on a new search
  };

  return (
    <DashboardLayout>
      {/* Topbar */}
      <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-10">
        <div className="px-6 py-3 flex items-center gap-4">
          <div className="md:hidden flex items-center gap-2 font-display font-bold">
            <span className="h-8 w-8 rounded-lg bg-primary text-primary-foreground grid place-items-center"><PenLine className="h-4 w-4" /></span>
          </div>
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
            <Input placeholder="Search documents…" className="pl-9" value={search} onChange={(e) => onSearch(e.target.value)} />
          </div>
          <Link to="/editor">
            <Button><Plus className="h-4 w-4 mr-1.5" /> New document</Button>
          </Link>
        </div>
      </header>

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">My documents</h1>
            <p className="text-muted-foreground mt-1">
              {total} document{total === 1 ? "" : "s"}{search ? ` matching “${search}”` : ""}.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : documents.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <p className="font-semibold">{search ? "No matches" : "No documents yet"}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {search ? "Try a different search." : "Create your first handwritten document."}
              </p>
              {!search && (
                <Link to="/editor"><Button className="mt-4"><Plus className="h-4 w-4 mr-1.5" /> New document</Button></Link>
              )}
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

        {/* Pagination (server-driven) */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isFetching}
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => Math.abs(p - page) <= 2 || p === 1 || p === totalPages)
                .map((p, idx, arr) => (
                  <span key={p} className="flex items-center">
                    {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-muted-foreground">…</span>}
                    <Button
                      variant={p === page ? "default" : "outline"}
                      size="sm"
                      className="w-9"
                      onClick={() => setPage(p)}
                      disabled={isFetching}
                    >
                      {p}
                    </Button>
                  </span>
                ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isFetching}
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
