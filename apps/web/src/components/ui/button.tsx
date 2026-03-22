import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "default" | "outline" | "ghost" | "secondary";
type ButtonSize = "default" | "sm" | "icon";

export interface ButtonProps extends PropsWithChildren, ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button(props: ButtonProps) {
  const {
    children,
    className,
    size = "default",
    type = "button",
    variant = "default",
    ...buttonProps
  } = props;

  return (
    <button
      {...buttonProps}
      className={cn("ui-button", `ui-button--${variant}`, `ui-button--${size}`, className)}
      type={type}
    >
      {children}
    </button>
  );
}
