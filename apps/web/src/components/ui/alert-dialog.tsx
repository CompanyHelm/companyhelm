import type React from "react";
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
  "fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border/60 bg-background p-6 shadow-lg outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
);

const alertDialogHeaderStyles = cva("flex flex-col gap-2 text-left");
const alertDialogFooterStyles = cva("mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end");

function AlertDialogOverlay(props: AlertDialogPrimitive.AlertDialogOverlayProps) {
  return (
    <AlertDialogPrimitive.Overlay className={alertDialogOverlayStyles()} {...props} />
  );
}

function AlertDialogContent(props: AlertDialogPrimitive.AlertDialogContentProps) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content className={alertDialogContentStyles()} {...props} />
    </AlertDialogPortal>
  );
}

function AlertDialogHeader(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={alertDialogHeaderStyles()} {...props} />;
}

function AlertDialogFooter(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={alertDialogFooterStyles()} {...props} />;
}

function AlertDialogCloseButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition hover:border-border hover:text-foreground"
      {...props}
    >
      <XIcon className="h-4 w-4" />
    </button>
  );
}

function AlertDialogPrimaryAction(props: React.ComponentPropsWithoutRef<typeof AlertDialogAction>) {
  return <AlertDialogAction asChild {...props} />;
}

function AlertDialogCancelAction(props: React.ComponentPropsWithoutRef<typeof AlertDialogCancel>) {
  return <AlertDialogCancel asChild {...props} />;
}

const alertDialogPrimaryButtonStyles = cva("");
const alertDialogCancelButtonStyles = cva("");

function AlertDialogActionButton(props: React.ComponentPropsWithoutRef<typeof Button>) {
  return <Button className={cn(alertDialogPrimaryButtonStyles(), props.className)} {...props} />;
}

function AlertDialogCancelButton(props: React.ComponentPropsWithoutRef<typeof Button>) {
  return <Button className={cn(alertDialogCancelButtonStyles(), props.className)} {...props} />;
}

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
