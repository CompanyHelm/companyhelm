import fs from "node:fs";

import { PortAllocator } from "./PortAllocator.js";
import { RuntimePaths } from "./RuntimePaths.js";
import type { RuntimeState } from "./RuntimeState.js";
import { createPemKeyPair, randomCompanyId, randomSecret } from "./Secrets.js";

export class RuntimeStateStore {
  private readonly runtimePaths: RuntimePaths;
  private static readonly DEFAULT_USERNAME = "admin@local";

  public constructor(private readonly root: string) {
    this.runtimePaths = new RuntimePaths(root);
  }

  public initialize(): RuntimeState {
    const existingState = this.load();
    if (existingState) {
      return existingState;
    }

    fs.mkdirSync(this.root, { recursive: true });

    const authKeys = createPemKeyPair();
    const state: RuntimeState = {
      version: 1,
      company: {
        id: randomCompanyId(),
        name: "Local CompanyHelm"
      },
      auth: {
        username: RuntimeStateStore.DEFAULT_USERNAME,
        password: randomSecret(),
        jwtPrivateKeyPem: authKeys.privateKeyPem,
        jwtPublicKeyPem: authKeys.publicKeyPem
      },
      runner: {
        name: "local-runner",
        secret: randomSecret()
      },
      ports: new PortAllocator().allocate()
    };

    this.save(state);
    return state;
  }

  public load(): RuntimeState | null {
    if (!fs.existsSync(this.runtimePaths.stateFilePath())) {
      return null;
    }

    const state = JSON.parse(fs.readFileSync(this.runtimePaths.stateFilePath(), "utf8")) as RuntimeState;
    if (state.auth.username !== RuntimeStateStore.DEFAULT_USERNAME && state.auth.username === "admin") {
      state.auth.username = RuntimeStateStore.DEFAULT_USERNAME;
      this.save(state);
    }

    return state;
  }

  private save(state: RuntimeState): void {
    fs.writeFileSync(this.runtimePaths.stateFilePath(), `${JSON.stringify(state, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600
    });
  }
}
