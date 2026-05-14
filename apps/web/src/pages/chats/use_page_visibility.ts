import { useEffect, useState } from "react";

/**
 * Tracks whether the current browser tab is both visible and focused so chat-adjacent live
 * refreshes can pause while the operator is away and resume with a fresh fetch on return.
 */
export function usePageVisibility(): boolean {
  const [isVisible, setIsVisible] = useState<boolean>(() => {
    if (typeof document === "undefined" || typeof window === "undefined") {
      return true;
    }

    return document.visibilityState === "visible" && document.hasFocus();
  });

  useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") {
      return;
    }

    const updateVisibility = () => {
      setIsVisible(document.visibilityState === "visible" && document.hasFocus());
    };

    window.addEventListener("focus", updateVisibility);
    window.addEventListener("blur", updateVisibility);
    document.addEventListener("visibilitychange", updateVisibility);

    return () => {
      window.removeEventListener("focus", updateVisibility);
      window.removeEventListener("blur", updateVisibility);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  return isVisible;
}
