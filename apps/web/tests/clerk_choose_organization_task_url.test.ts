import assert from "node:assert/strict";
import test from "node:test";
import { ClerkChooseOrganizationTaskUrl } from "../src/lib/clerk_choose_organization_task_url";

test("ClerkChooseOrganizationTaskUrl builds the Clerk task URL for the current origin", () => {
  assert.equal(
    ClerkChooseOrganizationTaskUrl.build("http://localhost:5173"),
    "http://localhost:5173/sign-in#/tasks/choose-organization?sign_in_force_redirect_url=http%3A%2F%2Flocalhost%3A5173%2F",
  );
});

test("ClerkChooseOrganizationTaskUrl tolerates an origin with a trailing slash", () => {
  assert.equal(
    ClerkChooseOrganizationTaskUrl.build("http://localhost:5173/"),
    "http://localhost:5173/sign-in#/tasks/choose-organization?sign_in_force_redirect_url=http%3A%2F%2Flocalhost%3A5173%2F",
  );
});
