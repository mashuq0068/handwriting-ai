import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RoadmapItem } from "@/components/canvas/RoadmapCanvas";

interface RoadmapListViewProps {
  items: RoadmapItem[];
  selectedItemIds: Set<string>;
  onSelectItem: (id: string | null, additive?: boolean) => void;
}

type SortField = "title" | "status" | "priority" | "owner" | "startDate" | "endDate";
type SortDir = "asc" | "desc";

const STATUS_LABELS: Record<string, string> = {
  planned: "Planned",
  in_progress: "In Progress",
  completed: "Completed",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const STATUS_COLORS: Record<string, string> = {
  planned: "#9CA3AF",
  in_progress: "#D97706",
  completed: "#16A34A",
};

const PRIORITY_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  low: "outline",
  medium: "secondary",
  high: "destructive",
};

export function RoadmapListView({ items, selectedItemIds, onSelectItem }: RoadmapListViewProps) {
  const [sortField, setSortField] = useState<SortField>("title");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    let result = items;
    if (statusFilter !== "all") result = result.filter((i) => i.status === statusFilter);
    if (priorityFilter !== "all") result = result.filter((i) => i.priority === priorityFilter);
    return result;
  }, [items, statusFilter, priorityFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aVal = a[sortField] ?? "";
      const bVal = b[sortField] ?? "";
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortField, sortDir]);

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="font-display text-xs gap-1 -ml-2 h-7"
      onClick={() => toggleSort(field)}
    >
      {children}
      <ArrowUpDown className="h-3 w-3" />
    </Button>
  );

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Filters */}
      <div className="flex items-center gap-3 p-3 border-b">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-8 font-body text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="planned">Planned</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[130px] h-8 font-body text-xs">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-xs text-muted-foreground ml-auto">
          {sorted.length} item{sorted.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><SortableHeader field="title">Title</SortableHeader></TableHead>
              <TableHead><SortableHeader field="status">Status</SortableHeader></TableHead>
              <TableHead><SortableHeader field="priority">Priority</SortableHeader></TableHead>
              <TableHead><SortableHeader field="owner">Owner</SortableHeader></TableHead>
              <TableHead><SortableHeader field="startDate">Start</SortableHeader></TableHead>
              <TableHead><SortableHeader field="endDate">End</SortableHeader></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((item, idx) => (
              <TableRow
                key={item.id}
                className={`cursor-pointer animate-fade-in ${selectedItemIds.has(item.id) ? "bg-secondary" : ""}`}
                style={{ animationDelay: `${idx * 30}ms`, animationFillMode: "both" }}
                onClick={(e) => onSelectItem(item.id, e.shiftKey)}
              >
                <TableCell className="font-body text-sm font-medium">{item.title}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[item.status] }} />
                    {STATUS_LABELS[item.status]}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={PRIORITY_VARIANT[item.priority]}>
                    {PRIORITY_LABELS[item.priority]}
                  </Badge>
                </TableCell>
                <TableCell className="font-body text-xs text-muted-foreground">{item.owner || "—"}</TableCell>
                <TableCell className="font-body text-xs text-muted-foreground">{item.startDate || "—"}</TableCell>
                <TableCell className="font-body text-xs text-muted-foreground">{item.endDate || "—"}</TableCell>
              </TableRow>
            ))}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                  No items match the current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
