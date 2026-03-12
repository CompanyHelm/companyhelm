import type { RuntimePorts } from "./RuntimeState.js";

export class PortAllocator {
  public constructor(private readonly uiPort = 4173) {}

  public allocate(): RuntimePorts {
    return {
      ui: this.uiPort,
      runnerGrpc: this.uiPort + 878,
      agentCliGrpc: this.uiPort + 879
    };
  }
}
