import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TaskCategoryFilterPillProps {
  count: number;
  isSelected: boolean;
  label: string;
  onClick(): void;
}

export function TaskCategoryFilterPill(props: TaskCategoryFilterPillProps) {
  return (
    <Button
      className={cn(
        "shrink-0 gap-1.5 rounded-full px-3 text-sm",
        props.isSelected
          ? "border-border/70 bg-muted text-foreground hover:bg-muted/90"
          : "border-border/40 bg-background/40 text-muted-foreground hover:bg-muted/30 hover:text-foreground",
      )}
      onClick={props.onClick}
      size="lg"
      type="button"
      variant="outline"
    >
      <span>{props.label}</span>
      <span className="tabular-nums text-inherit opacity-80">
        {props.count}
      </span>
    </Button>
  );
}
