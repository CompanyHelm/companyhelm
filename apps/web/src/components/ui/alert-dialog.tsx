import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { cva } from "class-variance-authority";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
const AlertDialogPortal = AlertDialogPrimitive.Portal;
const AlertDialogTitle = AlertDialogPrimitive.Title;
const AlertDialogDescription = AlertDialogPrimitive.Description;
const AlertDialogAction = AlertDialogPrimitive.Action;
const AlertDialogCancel = AlertDialogPrimitive.Cancel;

const alertDialogOverlayStyles = cva(
  "fixed inset-0 z-50 bg-background/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
);

const alertDialogContentStyles = cva(
  "fixed left-1/2 top-1/2 z-50 w-full max-w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border/60 bg-background p-6 shadow-lg outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
);

const alertDialogHeaderStyles = cva("flex flex-col gap-2 text-left");
const alertDialogFooterStyles = cva("mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end");

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(function AlertDialogOverlay({ className, ...props }, ref) {
  return (
    <AlertDialogPrimitive.Overlay
      ref={ref}
      className={cn(alertDialogOverlayStyles(), className)}
      {...props}
    />
  );
});

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(function AlertDialogContent({ className, onKeyDownCapture, ...props }, ref) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        ref={ref}
        className={cn(alertDialogContentStyles(), className)}
        // Keep dialog keyboard interactions from bubbling back into parent cards or rows.
        onKeyDownCapture={(event) => {
          onKeyDownCapture?.(event);
          event.stopPropagation();
        }}
        {...props}
      />
    </AlertDialogPortal>
  );
});

function AlertDialogHeader(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={alertDialogHeaderStyles()} {...props} />;
}

function AlertDialogFooter(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={alertDialogFooterStyles()} {...props} />;
}

const AlertDialogCloseButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(function AlertDialogCloseButton(props, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition hover:border-border hover:text-foreground"
      {...props}
    >
      <XIcon className="h-4 w-4" />
    </button>
  );
});

function AlertDialogPrimaryAction(props: React.ComponentPropsWithoutRef<typeof AlertDialogAction>) {
  return <AlertDialogAction asChild {...props} />;
}

function AlertDialogCancelAction(props: React.ComponentPropsWithoutRef<typeof AlertDialogCancel>) {
  return <AlertDialogCancel asChild {...props} />;
}

const alertDialogPrimaryButtonStyles = cva("");
const alertDialogCancelButtonStyles = cva("");

const AlertDialogActionButton = React.forwardRef<
  React.ElementRef<typeof Button>,
  React.ComponentPropsWithoutRef<typeof Button>
>(function AlertDialogActionButton({ className, ...props }, ref) {
  return (
    <Button
      ref={ref}
      className={cn(alertDialogPrimaryButtonStyles(), className)}
      {...props}
    />
  );
});

const AlertDialogCancelButton = React.forwardRef<
  React.ElementRef<typeof Button>,
  React.ComponentPropsWithoutRef<typeof Button>
>(function AlertDialogCancelButton({ className, ...props }, ref) {
  return (
    <Button
      ref={ref}
      className={cn(alertDialogCancelButtonStyles(), className)}
      {...props}
    />
  );
});

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogCloseButton,
  AlertDialogPrimaryAction,
  AlertDialogCancelAction,
  AlertDialogActionButton,
  AlertDialogCancelButton,
};
