import { cn } from "@/lib/utils";

type PageTabsItem<T extends string> = {
  key: T;
  label: string;
};

interface PageTabsProps<T extends string> {
  className?: string;
  items: ReadonlyArray<PageTabsItem<T>>;
  onSelect: (key: T) => void;
  selectedKey: T;
}

export function PageTabs<T extends string>(props: PageTabsProps<T>) {
  return (
    <div className={cn("border-b border-border/60", props.className)}>
      <div className="modern-scrollbar flex items-center gap-6 overflow-x-auto">
        {props.items.map((item) => {
          const isSelected = props.selectedKey === item.key;

          return (
            <button
              key={item.key}
              className={cn(
                "-mb-px shrink-0 border-b-2 px-0 py-3 text-sm font-medium transition",
                isSelected
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:border-border/80 hover:text-foreground",
              )}
              onClick={() => {
                props.onSelect(item.key);
              }}
              type="button"
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
