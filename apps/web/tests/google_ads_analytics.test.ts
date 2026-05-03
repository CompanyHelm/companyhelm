import assert from "node:assert/strict";
import { test } from "node:test";
import { GoogleAdsAnalytics } from "../src/lib/google_ads_analytics";

test("initializes the Google Ads base tag once and queues the config call", () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const appendedScripts: Array<{ async: boolean; src: string }> = [];

  try {
    globalThis.window = {} as Window;
    globalThis.document = {
      createElement: () => ({
        async: false,
        src: "",
      }),
      head: {
        appendChild: (element: { async: boolean; src: string }) => {
          appendedScripts.push(element);
        },
      },
      querySelector: () => null,
    } as unknown as Document;

    GoogleAdsAnalytics.initialize({
      id: "AW-18135921456",
    });

    assert.equal(window.dataLayer?.length, 2);
    assert.equal(window.dataLayer?.[0]?.[0], "js");
    assert.ok(window.dataLayer?.[0]?.[1] instanceof Date);
    assert.deepEqual(window.dataLayer?.[1], ["config", "AW-18135921456"]);
    assert.equal(appendedScripts.length, 1);
    assert.equal(appendedScripts[0].async, true);
    assert.equal(appendedScripts[0].src, "https://www.googletagmanager.com/gtag/js?id=AW-18135921456");
  } finally {
    if (originalWindow) {
      globalThis.window = originalWindow;
    } else {
      delete (globalThis as typeof globalThis & { window?: unknown }).window;
    }

    if (originalDocument) {
      globalThis.document = originalDocument;
    } else {
      delete (globalThis as typeof globalThis & { document?: unknown }).document;
    }
  }
});

test("resolves the sign-up conversion promise when gtag invokes the event callback", async () => {
  const originalWindow = globalThis.window;

  try {
    let sentEvent: string | null = null;
    let sentPayload: Record<string, unknown> | null = null;
    globalThis.window = {
      gtag: (_command: unknown, eventName: unknown, payload: Record<string, unknown>) => {
        sentEvent = String(eventName);
        sentPayload = payload;
        const eventCallback = payload.event_callback;
        if (typeof eventCallback === "function") {
          eventCallback();
        }
      },
    } as Window;

    await GoogleAdsAnalytics.trackSignUpConversion({
      id: "AW-18135921456",
      signUpConversionLabel: "3UlcCOKBzqYcELDm8MdD",
    }, {
      timeoutMs: 5,
    });

    assert.equal(sentEvent, "conversion");
    assert.equal(sentPayload?.send_to, "AW-18135921456/3UlcCOKBzqYcELDm8MdD");
    assert.equal(sentPayload?.event_timeout, 5);
  } finally {
    if (originalWindow) {
      globalThis.window = originalWindow;
    } else {
      delete (globalThis as typeof globalThis & { window?: unknown }).window;
    }
  }
});

test("resolves the sign-up conversion promise after the timeout when Google never calls back", async () => {
  const originalSetTimeout = globalThis.setTimeout;
  const originalWindow = globalThis.window;

  try {
    let scheduledDelay: number | null = null;
    globalThis.window = {
      gtag: () => undefined,
    } as Window;
    globalThis.setTimeout = ((callback: () => void, delay?: number) => {
      scheduledDelay = delay ?? null;
      callback();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout;

    await GoogleAdsAnalytics.trackSignUpConversion({
      id: "AW-18135921456",
      signUpConversionLabel: "3UlcCOKBzqYcELDm8MdD",
    }, {
      timeoutMs: 10,
    });

    assert.equal(scheduledDelay, 10);
  } finally {
    globalThis.setTimeout = originalSetTimeout;

    if (originalWindow) {
      globalThis.window = originalWindow;
    } else {
      delete (globalThis as typeof globalThis & { window?: unknown }).window;
    }
  }
});

test("resolves the sign-up conversion promise when gtag throws so the redirect path can continue", async () => {
  const originalWindow = globalThis.window;

  try {
    globalThis.window = {
      gtag: () => {
        throw new Error("gtag is unavailable");
      },
    } as Window;

    await assert.doesNotReject(async () => {
      await GoogleAdsAnalytics.trackSignUpConversion({
        id: "AW-18135921456",
        signUpConversionLabel: "3UlcCOKBzqYcELDm8MdD",
      }, {
        timeoutMs: 10,
      });
    });
  } finally {
    if (originalWindow) {
      globalThis.window = originalWindow;
    } else {
      delete (globalThis as typeof globalThis & { window?: unknown }).window;
    }
  }
});
