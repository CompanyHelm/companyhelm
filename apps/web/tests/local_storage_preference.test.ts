import assert from "node:assert/strict";
import { test } from "node:test";
import { LocalStoragePreference } from "../src/lib/local_storage_preference";

/**
 * Provides the localStorage subset needed by preference tests without depending on a browser
 * runtime, keeping parser behavior deterministic under Node's test runner.
 */
class MemoryStorage implements Pick<Storage, "getItem" | "setItem"> {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

test("LocalStoragePreference reads boolean values from explicit true and false strings", () => {
  const storage = new MemoryStorage();

  storage.setItem("preference", "false");
  assert.equal(LocalStoragePreference.readBoolean("preference", true, storage), false);

  storage.setItem("preference", "true");
  assert.equal(LocalStoragePreference.readBoolean("preference", false, storage), true);
});

test("LocalStoragePreference falls back to the default for missing or malformed booleans", () => {
  const storage = new MemoryStorage();

  assert.equal(LocalStoragePreference.readBoolean("missing", true, storage), true);

  storage.setItem("preference", "yes");
  assert.equal(LocalStoragePreference.readBoolean("preference", false, storage), false);
});

test("LocalStoragePreference writes booleans as stable strings", () => {
  const storage = new MemoryStorage();

  LocalStoragePreference.writeBoolean("preference", true, storage);
  assert.equal(storage.getItem("preference"), "true");

  LocalStoragePreference.writeBoolean("preference", false, storage);
  assert.equal(storage.getItem("preference"), "false");
});

test("LocalStoragePreference reads boolean records and drops malformed entries", () => {
  const storage = new MemoryStorage();

  storage.setItem("record", JSON.stringify({
    agent1: true,
    agent2: false,
    agent3: "true",
  }));

  assert.deepEqual(LocalStoragePreference.readBooleanRecord("record", storage), {
    agent1: true,
    agent2: false,
  });
});

test("LocalStoragePreference writes boolean records as JSON", () => {
  const storage = new MemoryStorage();

  LocalStoragePreference.writeBooleanRecord("record", {
    agent1: true,
    agent2: false,
  }, storage);

  assert.deepEqual(JSON.parse(storage.getItem("record") ?? "{}"), {
    agent1: true,
    agent2: false,
  });
});
