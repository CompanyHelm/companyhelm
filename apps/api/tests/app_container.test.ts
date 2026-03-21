import assert from "node:assert/strict";
import test from "node:test";
import { AppContainer } from "../src/di/app_container.ts";

test("AppContainer returns the bound config instance", () => {
  const config = {
    getDocument() {
      return {
        host: "127.0.0.1",
      };
    },
  };
  const container = new AppContainer();

  container.bindConfig(config as never);

  assert.equal(container.getConfig<typeof config>(), config);
});
