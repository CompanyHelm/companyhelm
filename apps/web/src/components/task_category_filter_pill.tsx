import { cn } from "@/lib/utils";

interface TaskCategoryFilterPillProps {
  count: number;
  isSelected: boolean;
  label: string;
  onClick(): void;
}

export function TaskCategoryFilterPill(props: TaskCategoryFilterPillProps) {
  return (
    <button
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1 rounded-full border px-3 text-xs/relaxed font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
        props.isSelected
          ? "border-border/70 bg-muted text-foreground hover:bg-muted/90"
          : "border-border/40 bg-background/40 text-muted-foreground hover:bg-muted/30 hover:text-foreground",
      )}
      onClick={props.onClick}
      type="button"
    >
      <span>{props.label}</span>
      <span className="tabular-nums text-inherit opacity-80">
        {props.count}
      </span>
    </button>
  );
}
