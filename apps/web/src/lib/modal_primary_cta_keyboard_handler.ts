/**
 * Coordinates the shared modal keyboard behavior so plain Enter can trigger an explicitly marked
 * primary call-to-action without stealing Enter from controls that already depend on it.
 */
export class ModalPrimaryCtaKeyboardHandler {
  private static readonly buttonLikeSelector = "button, [role='button'], a, [role='link']";
  private static readonly contentEditableSelector = "[contenteditable]:not([contenteditable='false'])";
  private static readonly primaryCtaSelector = "[data-primary-cta]:not([disabled]):not([aria-disabled='true'])";
  private static readonly skipSelector = "[data-skip-enter-primary-cta]";
  private static readonly textAreaSelector = "textarea";

  public static trigger(event: {
    altKey: boolean;
    ctrlKey: boolean;
    currentTarget: {
      querySelector(selector: string): unknown;
    };
    defaultPrevented: boolean;
    isComposing?: boolean;
    key: string;
    metaKey: boolean;
    preventDefault(): void;
    shiftKey: boolean;
    target: unknown;
  }): boolean {
    if (!this.shouldTrigger(event)) {
      return false;
    }

    const primaryAction = this.findPrimaryAction(event.currentTarget);
    if (!primaryAction) {
      return false;
    }

    event.preventDefault();
    primaryAction.click();

    return true;
  }

  public static shouldTrigger(event: {
    altKey: boolean;
    ctrlKey: boolean;
    defaultPrevented: boolean;
    isComposing?: boolean;
    key: string;
    metaKey: boolean;
    shiftKey: boolean;
    target: unknown;
  }): boolean {
    if (event.defaultPrevented || event.isComposing) {
      return false;
    }

    if (event.key !== "Enter") {
      return false;
    }

    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return false;
    }

    const keyboardTarget = this.asKeyboardTarget(event.target);
    if (!keyboardTarget) {
      return true;
    }

    if (keyboardTarget.isContentEditable) {
      return false;
    }

    if (this.hasClosestMatch(keyboardTarget, this.textAreaSelector)) {
      return false;
    }

    if (this.hasClosestMatch(keyboardTarget, this.contentEditableSelector)) {
      return false;
    }

    if (this.hasClosestMatch(keyboardTarget, this.skipSelector)) {
      return false;
    }

    if (this.hasClosestMatch(keyboardTarget, this.buttonLikeSelector)) {
      return false;
    }

    return true;
  }

  private static asKeyboardTarget(target: unknown): {
    closest?(selector: string): unknown;
    isContentEditable?: boolean;
  } | null {
    if (!target || typeof target !== "object") {
      return null;
    }

    return target as {
      closest?(selector: string): unknown;
      isContentEditable?: boolean;
    };
  }

  private static findPrimaryAction(container: {
    querySelector(selector: string): unknown;
  }): { click(): void } | null {
    const primaryAction = container.querySelector(this.primaryCtaSelector);
    if (!primaryAction || typeof primaryAction !== "object") {
      return null;
    }

    return "click" in primaryAction && typeof primaryAction.click === "function"
      ? (primaryAction as { click(): void })
      : null;
  }

  private static hasClosestMatch(
    target: {
      closest?(selector: string): unknown;
    },
    selector: string,
  ): boolean {
    return typeof target.closest === "function" ? target.closest(selector) !== null : false;
  }
}
