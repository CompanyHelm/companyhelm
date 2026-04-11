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
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 transition",
        "[font-family:var(--sidebar-font-family)] [font-size:var(--sidebar-font-size)] [font-weight:var(--sidebar-font-weight)] [line-height:var(--sidebar-font-line-height)]",
        props.isSelected
          ? "border-border/70 bg-muted text-foreground hover:bg-muted/90"
          : "border-border/40 bg-background/40 text-muted-foreground hover:bg-muted/30 hover:text-foreground",
      )}
      onClick={props.onClick}
      type="button"
    >
      <span>{props.label}</span>
      <span
        className="tabular-nums text-muted-foreground/80"
        style={{
          fontFamily: "var(--sidebar-font-family)",
          fontSize: "var(--sidebar-font-size)",
          fontWeight: "var(--sidebar-font-weight)",
          lineHeight: "var(--sidebar-font-line-height)",
        }}
      >
        {props.count}
      </span>
    </button>
  );
}
