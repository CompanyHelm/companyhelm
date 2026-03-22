import type { HTMLAttributes, PropsWithChildren } from "react";
import { cn } from "@/lib/cn";

export interface CardProps extends PropsWithChildren, HTMLAttributes<HTMLElement> {}

export function Card(props: CardProps) {
  const { children, className, ...cardProps } = props;

  return (
    <section {...cardProps} className={cn("ui-card", className)}>
      {children}
    </section>
  );
}

export function CardHeader(props: CardProps) {
  const { children, className, ...cardProps } = props;

  return (
    <header {...cardProps} className={cn("ui-card-header", className)}>
      {children}
    </header>
  );
}

export function CardTitle(props: CardProps) {
  const { children, className, ...cardProps } = props;

  return (
    <div {...cardProps} className={cn("ui-card-title", className)}>
      {children}
    </div>
  );
}

export function CardDescription(props: CardProps) {
  const { children, className, ...cardProps } = props;

  return (
    <p {...cardProps} className={cn("ui-card-description", className)}>
      {children}
    </p>
  );
}

export function CardContent(props: CardProps) {
  const { children, className, ...cardProps } = props;

  return (
    <div {...cardProps} className={cn("ui-card-content", className)}>
      {children}
    </div>
  );
}
