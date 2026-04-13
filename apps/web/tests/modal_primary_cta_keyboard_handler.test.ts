import assert from "node:assert/strict";
import { test } from "node:test";
import { ModalPrimaryCtaKeyboardHandler } from "../src/lib/modal_primary_cta_keyboard_handler";

function createKeyboardTarget(options?: {
  buttonLike?: boolean;
  contentEditable?: boolean;
  skip?: boolean;
  textArea?: boolean;
}) {
  return {
    closest(selector: string) {
      if (selector === "textarea") {
        return options?.textArea ? {} : null;
      }

      if (selector === "[contenteditable]:not([contenteditable='false'])") {
        return options?.contentEditable ? {} : null;
      }

      if (selector === "[data-skip-enter-primary-cta]") {
        return options?.skip ? {} : null;
      }

      if (selector === "button, [role='button'], a, [role='link']") {
        return options?.buttonLike ? {} : null;
      }

      return null;
    },
    isContentEditable: options?.contentEditable ?? false,
  };
}

test("clicks the marked primary action for a plain Enter press", () => {
  let didPreventDefault = false;
  let clickCount = 0;

  const didTrigger = ModalPrimaryCtaKeyboardHandler.trigger({
    altKey: false,
    ctrlKey: false,
    currentTarget: {
      querySelector(selector: string) {
        assert.equal(
          selector,
          "[data-primary-cta]:not([disabled]):not([aria-disabled='true'])",
        );

        return {
          click() {
            clickCount += 1;
          },
        };
      },
    },
    defaultPrevented: false,
    key: "Enter",
    metaKey: false,
    preventDefault() {
      didPreventDefault = true;
    },
    shiftKey: false,
    target: createKeyboardTarget(),
  });

  assert.equal(didTrigger, true);
  assert.equal(didPreventDefault, true);
  assert.equal(clickCount, 1);
});

test("does not trigger when a child control already handled Enter", () => {
  let clickCount = 0;

  const didTrigger = ModalPrimaryCtaKeyboardHandler.trigger({
    altKey: false,
    ctrlKey: false,
    currentTarget: {
      querySelector() {
        return {
          click() {
            clickCount += 1;
          },
        };
      },
    },
    defaultPrevented: true,
    key: "Enter",
    metaKey: false,
    preventDefault() {
      throw new Error("preventDefault should not be called when Enter was already handled.");
    },
    shiftKey: false,
    target: createKeyboardTarget(),
  });

  assert.equal(didTrigger, false);
  assert.equal(clickCount, 0);
});

test("does not trigger from multiline editors", () => {
  const didTrigger = ModalPrimaryCtaKeyboardHandler.trigger({
    altKey: false,
    ctrlKey: false,
    currentTarget: {
      querySelector() {
        throw new Error("multiline inputs should not look up a primary CTA.");
      },
    },
    defaultPrevented: false,
    key: "Enter",
    metaKey: false,
    preventDefault() {
      throw new Error("preventDefault should not be called for multiline editors.");
    },
    shiftKey: false,
    target: createKeyboardTarget({
      textArea: true,
    }),
  });

  assert.equal(didTrigger, false);
});

test("does not trigger from button-like controls such as modal select triggers", () => {
  const didTrigger = ModalPrimaryCtaKeyboardHandler.trigger({
    altKey: false,
    ctrlKey: false,
    currentTarget: {
      querySelector() {
        throw new Error("button-like targets should keep their own Enter behavior.");
      },
    },
    defaultPrevented: false,
    key: "Enter",
    metaKey: false,
    preventDefault() {
      throw new Error("preventDefault should not be called for button-like targets.");
    },
    shiftKey: false,
    target: createKeyboardTarget({
      buttonLike: true,
    }),
  });

  assert.equal(didTrigger, false);
});
