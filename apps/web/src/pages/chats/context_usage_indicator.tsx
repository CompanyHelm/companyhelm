import type { CSSProperties } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ChatsContextUsageIndicatorProps {
  currentContextTokens: number | null;
  isCompacting: boolean;
  maxContextTokens: number | null;
}

/**
 * Renders a compact session context usage signal near the composer controls. The closed state stays
 * minimal, while the hover tooltip exposes the exact token usage and compacting state.
 */
export function ChatsContextUsageIndicator(props: ChatsContextUsageIndicatorProps) {
  if (props.currentContextTokens === null || props.maxContextTokens === null) {
    return null;
  }

  if (!Number.isFinite(props.currentContextTokens) || !Number.isFinite(props.maxContextTokens) || props.maxContextTokens <= 0) {
    return null;
  }

  const currentContextTokens = props.currentContextTokens;
  const maxContextTokens = props.maxContextTokens;
  const usageRatio = Math.min(Math.max(currentContextTokens / maxContextTokens, 0), 1);
  const usagePercent = Math.round(usageRatio * 100);
  const indicatorStyle = ChatsContextUsageIndicatorPresenter.resolveIndicatorStyle(usageRatio);

  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={`Context usage ${usagePercent}%`}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/60 text-muted-foreground transition hover:border-border hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/40"
        type="button"
      >
        <span
          aria-hidden="true"
          className="relative block size-3 rounded-full"
          style={indicatorStyle}
        >
          <span className="absolute inset-[2.5px] rounded-full bg-background/90" />
        </span>
      </TooltipTrigger>
      <TooltipContent className="grid gap-1.5">
        <div className="text-xs font-medium text-background">
          {props.isCompacting ? "Compacting context" : `Context ${usagePercent}% used`}
        </div>
        <div className="text-xs text-background/80">
          {ChatsContextUsageIndicatorPresenter.formatTokenCount(currentContextTokens)}
          {" / "}
          {ChatsContextUsageIndicatorPresenter.formatTokenCount(maxContextTokens)}
          {" tokens"}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Keeps the compact visual treatment for context usage separate from tooltip copy, so capacity
 * changes can update the filled arc without turning the composer control into an alert state.
 */
export class ChatsContextUsageIndicatorPresenter {
  private static readonly INDICATOR_COLOR = "rgb(59 130 246)";

  static formatTokenCount(value: number): string {
    if (value >= 1_000_000) {
      return ChatsContextUsageIndicatorPresenter.formatScaledValue(value / 1_000_000, "M");
    }

    if (value >= 1_000) {
      return ChatsContextUsageIndicatorPresenter.formatScaledValue(value / 1_000, "k");
    }

    return String(Math.round(value));
  }

  static resolveIndicatorStyle(usageRatio: number): CSSProperties {
    const filledDegrees = usageRatio * 360;

    return {
      background: `conic-gradient(${ChatsContextUsageIndicatorPresenter.INDICATOR_COLOR} ${filledDegrees}deg, rgba(255, 255, 255, 0.12) ${filledDegrees}deg 360deg)`,
    };
  }

  private static formatScaledValue(value: number, suffix: string): string {
    const roundedValue = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
    const formattedValue = Number.isInteger(roundedValue)
      ? String(roundedValue)
      : roundedValue.toFixed(1).replace(/\.0$/, "");

    return `${formattedValue}${suffix}`;
  }
}
