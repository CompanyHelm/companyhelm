import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { CheckIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ChatSelectionDialogItem = {
  description: string;
  id: string;
  searchText: string;
  title: string;
};

interface ChatSelectionDialogProps {
  contentClassName?: string;
  description: string;
  items: readonly ChatSelectionDialogItem[];
  noItemsMessage: string;
  noResultsMessage: string;
  open: boolean;
  searchPlaceholder: string;
  selectedItemId?: string | null;
  title: string;
  onOpenChange(nextOpen: boolean): void;
  onSelect(itemId: string): void;
}

/**
 * Keeps chat pickers on one searchable, keyboard-accessible dialog pattern so agents, models, and
 * future chooser surfaces behave the same across the chats experience.
 */
export function ChatSelectionDialog(props: ChatSelectionDialogProps) {
  const [searchValue, setSearchValue] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listboxId = useId();
  const normalizedSearchValue = searchValue.trim().toLocaleLowerCase();
  const filteredItems = useMemo(() => {
    if (normalizedSearchValue.length === 0) {
      return props.items;
    }

    return props.items.filter((item) => {
      return item.searchText.toLocaleLowerCase().includes(normalizedSearchValue);
    });
  }, [normalizedSearchValue, props.items]);

  useEffect(() => {
    if (props.open) {
      return;
    }

    itemRefs.current = [];
    setSearchValue("");
    setHighlightedIndex(0);
  }, [props.open]);

  useEffect(() => {
    if (!props.open) {
      return;
    }

    const selectedIndex = filteredItems.findIndex((item) => item.id === props.selectedItemId);
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [filteredItems, props.open, props.selectedItemId]);

  useEffect(() => {
    const highlightedItemElement = itemRefs.current[highlightedIndex];
    highlightedItemElement?.scrollIntoView({
      block: "nearest",
    });
  }, [highlightedIndex]);

  const highlightedItemId = filteredItems[highlightedIndex]?.id ?? null;
  const hasItems = props.items.length > 0;

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (filteredItems.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((currentIndex) => {
        return currentIndex >= filteredItems.length - 1 ? 0 : currentIndex + 1;
      });
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((currentIndex) => {
        return currentIndex <= 0 ? filteredItems.length - 1 : currentIndex - 1;
      });
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setHighlightedIndex(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setHighlightedIndex(filteredItems.length - 1);
      return;
    }

    if (event.key === "Enter" && highlightedItemId) {
      event.preventDefault();
      props.onSelect(highlightedItemId);
    }
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className={cn("flex w-[min(96vw,41rem)] max-h-[80vh] flex-col", props.contentClassName)}>
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          <DialogDescription>{props.description}</DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3">
          {hasItems ? (
            <Input
              aria-activedescendant={highlightedItemId ? `${listboxId}-${highlightedItemId}` : undefined}
              aria-controls={listboxId}
              autoFocus
              onChange={(event) => {
                setSearchValue(event.target.value);
              }}
              onKeyDown={handleKeyDown}
              placeholder={props.searchPlaceholder}
              type="search"
              value={searchValue}
            />
          ) : null}

          {!hasItems ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-sm text-muted-foreground">
              {props.noItemsMessage}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-sm text-muted-foreground">
              {props.noResultsMessage}
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <div aria-label={props.title} className="grid gap-2" id={listboxId} role="listbox">
                {filteredItems.map((item, index) => {
                  const isHighlighted = index === highlightedIndex;
                  const isSelected = item.id === props.selectedItemId;

                  return (
                    <button
                      key={item.id}
                      aria-selected={isSelected}
                      className={cn(
                        "flex w-full items-start justify-between gap-3 rounded-xl border px-4 py-3 text-left transition",
                        isHighlighted
                          ? "border-foreground/15 bg-accent/60"
                          : "border-border/60 bg-card/40 hover:bg-accent/40",
                      )}
                      id={`${listboxId}-${item.id}`}
                      onClick={() => {
                        props.onSelect(item.id);
                      }}
                      onFocus={() => {
                        setHighlightedIndex(index);
                      }}
                      onMouseEnter={() => {
                        setHighlightedIndex(index);
                      }}
                      ref={(element) => {
                        itemRefs.current[index] = element;
                      }}
                      role="option"
                      type="button"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                        {item.description.length > 0 ? (
                          <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                        ) : null}
                      </div>
                      {isSelected ? <CheckIcon className="mt-0.5 size-4 shrink-0 text-foreground" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
