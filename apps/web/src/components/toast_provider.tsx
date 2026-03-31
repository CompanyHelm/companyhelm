import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { BadgeCheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Toast = {
  id: number;
  message: string;
};

interface ToastContextValue {
  showSavedToast(message?: string): void;
}

interface ToastProviderProps {
  children: ReactNode;
}

const TOAST_DURATION_MILLISECONDS = 2200;
const ToastProviderContext = createContext<ToastContextValue | undefined>(undefined);

/**
 * Provides a tiny app-level toast surface for transient success confirmations without adding an
 * external dependency just for one interaction pattern.
 */
export function ToastProvider(props: ToastProviderProps) {
  const [activeToast, setActiveToast] = useState<Toast | null>(null);

  useEffect(() => {
    if (!activeToast) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setActiveToast((currentToast) => currentToast?.id === activeToast.id ? null : currentToast);
    }, TOAST_DURATION_MILLISECONDS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeToast]);

  const contextValue = useMemo<ToastContextValue>(() => ({
    showSavedToast(message = "Saved") {
      setActiveToast({
        id: Date.now(),
        message,
      });
    },
  }), []);

  return (
    <ToastProviderContext.Provider value={contextValue}>
      {props.children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex justify-center px-4">
        <div
          className={cn(
            "flex min-h-11 items-center gap-2 rounded-full border border-[var(--success)]/30 bg-[var(--success-bg)] px-4 py-2 text-sm font-medium text-[var(--success)] shadow-lg transition-all duration-200",
            activeToast
              ? "translate-y-0 opacity-100"
              : "translate-y-2 opacity-0",
          )}
        >
          <BadgeCheckIcon className="size-4 shrink-0" />
          <span>{activeToast?.message ?? ""}</span>
        </div>
      </div>
    </ToastProviderContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastProviderContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider.");
  }

  return context;
}
