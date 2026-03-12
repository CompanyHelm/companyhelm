import fs from "node:fs";

import { PortAllocator } from "./PortAllocator.js";
import { RuntimePaths } from "./RuntimePaths.js";
import type { RuntimeState } from "./RuntimeState.js";
import { createPemKeyPair, randomCompanyId, randomSecret } from "./Secrets.js";

export class RuntimeStateStore {
  private readonly runtimePaths: RuntimePaths;

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
        username: "admin",
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

    return JSON.parse(fs.readFileSync(this.runtimePaths.stateFilePath(), "utf8")) as RuntimeState;
  }

  private save(state: RuntimeState): void {
    fs.writeFileSync(this.runtimePaths.stateFilePath(), `${JSON.stringify(state, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600
    });
  }
}
