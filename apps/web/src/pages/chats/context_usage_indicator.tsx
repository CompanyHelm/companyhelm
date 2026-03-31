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
  if (!Number.isFinite(props.currentContextTokens) || !Number.isFinite(props.maxContextTokens) || props.maxContextTokens === null || props.maxContextTokens <= 0) {
    return null;
  }

  const usageRatio = Math.min(Math.max(props.currentContextTokens / props.maxContextTokens, 0), 1);
  const usagePercent = Math.round(usageRatio * 100);
  const indicatorColor = ChatsContextUsageIndicatorPresenter.resolveIndicatorColor(usageRatio, props.isCompacting);
  const indicatorStyle = {
    background: `conic-gradient(${indicatorColor} ${usageRatio * 360}deg, rgba(255, 255, 255, 0.12) ${usageRatio * 360}deg 360deg)`,
  } satisfies CSSProperties;

  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={`Context usage ${usagePercent}%`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/60 text-muted-foreground transition hover:border-border hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/40"
        type="button"
      >
        <span
          aria-hidden="true"
          className="relative block size-3.5 rounded-full"
          style={indicatorStyle}
        >
          <span className="absolute inset-[3px] rounded-full bg-background/90" />
        </span>
      </TooltipTrigger>
      <TooltipContent className="grid gap-1.5">
        <div className="text-xs font-medium text-background">
          {props.isCompacting ? "Compacting context" : `Context ${usagePercent}% used`}
        </div>
        <div className="text-xs text-background/80">
          {ChatsContextUsageIndicatorPresenter.formatTokenCount(props.currentContextTokens)}
          {" / "}
          {ChatsContextUsageIndicatorPresenter.formatTokenCount(props.maxContextTokens)}
          {" tokens"}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

class ChatsContextUsageIndicatorPresenter {
  static formatTokenCount(value: number): string {
    if (value >= 1_000_000) {
      return ChatsContextUsageIndicatorPresenter.formatScaledValue(value / 1_000_000, "M");
    }

    if (value >= 1_000) {
      return ChatsContextUsageIndicatorPresenter.formatScaledValue(value / 1_000, "k");
    }

    return String(Math.round(value));
  }

  static resolveIndicatorColor(usageRatio: number, isCompacting: boolean): string {
    if (isCompacting) {
      return "rgb(245 158 11)";
    }

    if (usageRatio >= 0.9) {
      return "rgb(244 63 94)";
    }

    if (usageRatio >= 0.8) {
      return "rgb(245 158 11)";
    }

    return "rgb(59 130 246)";
  }

  private static formatScaledValue(value: number, suffix: string): string {
    const roundedValue = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
    const formattedValue = Number.isInteger(roundedValue)
      ? String(roundedValue)
      : roundedValue.toFixed(1).replace(/\.0$/, "");

    return `${formattedValue}${suffix}`;
  }
}
