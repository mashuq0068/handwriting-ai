import { useMemo } from "react";
import { CheckCircle2 } from "lucide-react";

interface ProgressBarProps {
  total: number;
  completed: number;
}

export function ProgressBar({ total, completed }: ProgressBarProps) {
  const percentage = useMemo(() => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  }, [total, completed]);

  if (total === 0) return null;

  return (
    <div className="flex items-center gap-2 px-2">
      <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
      <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="font-display text-[10px] text-muted-foreground whitespace-nowrap">
        {completed}/{total}
      </span>
    </div>
  );
}
