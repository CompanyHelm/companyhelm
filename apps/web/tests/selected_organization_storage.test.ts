import assert from "node:assert/strict";
import test from "node:test";
import { SelectedOrganizationStorage } from "../src/pages/root/selected_organization_storage";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

test("SelectedOrganizationStorage persists the selected company id", () => {
  const storage = new MemoryStorage();

  SelectedOrganizationStorage.writeOrganizationId("org_2", storage);

  assert.equal(SelectedOrganizationStorage.readOrganizationId(storage), "org_2");
});

test("SelectedOrganizationStorage ignores empty stored company ids", () => {
  const storage = new MemoryStorage();

  storage.setItem(SelectedOrganizationStorage.STORAGE_KEY, "");

  assert.equal(SelectedOrganizationStorage.readOrganizationId(storage), null);
});

test("SelectedOrganizationStorage tolerates unavailable browser storage", () => {
  const storage = {
    getItem() {
      throw new Error("storage unavailable");
    },
  };

  assert.equal(SelectedOrganizationStorage.readOrganizationId(storage), null);
});
