import assert from "node:assert/strict";
import { test } from "node:test";
import { AmplitudeAnalytics } from "../src/lib/amplitude_analytics";
import type { AmplitudeClientInterface } from "../src/lib/amplitude_client_interface";

class FakeAmplitudeClient implements AmplitudeClientInterface {
  readonly initAllCalls: string[] = [];

  readonly resetCalls: undefined[] = [];

  readonly setUserIdCalls: Array<string | undefined> = [];

  readonly trackCalls: Array<{ eventType: string; eventProperties: Record<string, unknown> }> = [];

  initAll(apiKey: string): void {
    this.initAllCalls.push(apiKey);
  }

  reset(): void {
    this.resetCalls.push(undefined);
  }

  setUserId(userId: string | undefined): void {
    this.setUserIdCalls.push(userId);
  }

  track(eventType: string, eventProperties: Record<string, unknown>): void {
    this.trackCalls.push({ eventType, eventProperties });
  }
}

test("syncs the Clerk user id into Amplitude once the authenticated session is loaded", () => {
  const originalWindow = globalThis.window;
  const fakeClient = new FakeAmplitudeClient();

  try {
    globalThis.window = {
      __COMPANYHELM_AMPLITUDE__: {
        client: fakeClient,
        initialized: true,
        lastSyncedUserId: null,
        lastTrackedHref: null,
      },
    } as Window;

    AmplitudeAnalytics.syncUserSession({
      isLoaded: true,
      isSignedIn: true,
      userId: "user_2z7k18n3f9",
    });

    AmplitudeAnalytics.syncUserSession({
      isLoaded: true,
      isSignedIn: true,
      userId: "user_2z7k18n3f9",
    });

    assert.deepEqual(fakeClient.setUserIdCalls, ["user_2z7k18n3f9"]);
    assert.equal(fakeClient.resetCalls.length, 0);
  } finally {
    if (originalWindow) {
      globalThis.window = originalWindow;
    } else {
      delete (globalThis as typeof globalThis & { window?: unknown }).window;
    }
  }
});

test("clears the Amplitude identity and resets the SDK after logout", () => {
  const originalWindow = globalThis.window;
  const fakeClient = new FakeAmplitudeClient();

  try {
    globalThis.window = {
      __COMPANYHELM_AMPLITUDE__: {
        client: fakeClient,
        initialized: true,
        lastSyncedUserId: "user_2z7k18n3f9",
        lastTrackedHref: null,
      },
    } as Window;

    AmplitudeAnalytics.syncUserSession({
      isLoaded: true,
      isSignedIn: false,
      userId: null,
    });

    assert.deepEqual(fakeClient.setUserIdCalls, [undefined]);
    assert.equal(fakeClient.resetCalls.length, 1);
  } finally {
    if (originalWindow) {
      globalThis.window = originalWindow;
    } else {
      delete (globalThis as typeof globalThis & { window?: unknown }).window;
    }
  }
});

test("ignores unloaded Clerk sessions so anonymous bootstrap traffic is not reset", () => {
  const originalWindow = globalThis.window;
  const fakeClient = new FakeAmplitudeClient();

  try {
    globalThis.window = {
      __COMPANYHELM_AMPLITUDE__: {
        client: fakeClient,
        initialized: true,
        lastSyncedUserId: null,
        lastTrackedHref: null,
      },
    } as Window;

    AmplitudeAnalytics.syncUserSession({
      isLoaded: false,
      isSignedIn: false,
      userId: null,
    });

    assert.equal(fakeClient.setUserIdCalls.length, 0);
    assert.equal(fakeClient.resetCalls.length, 0);
  } finally {
    if (originalWindow) {
      globalThis.window = originalWindow;
    } else {
      delete (globalThis as typeof globalThis & { window?: unknown }).window;
    }
  }
});
