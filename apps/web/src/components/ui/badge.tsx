import type { HTMLAttributes, PropsWithChildren } from "react";
import { cn } from "@/lib/cn";

type BadgeVariant = "neutral" | "positive" | "warning";

export interface BadgeProps extends PropsWithChildren, HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge(props: BadgeProps) {
  const { children, className, variant = "neutral", ...badgeProps } = props;

  return (
    <span {...badgeProps} className={cn("ui-badge", `ui-badge--${variant}`, className)}>
      {children}
    </span>
  );
}
