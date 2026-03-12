import type { RuntimePorts } from "./RuntimeState.js";

export class PortAllocator {
  public constructor(
    private readonly apiHttpPort = 4000,
    private readonly uiPort = 4173,
    private readonly runnerGrpcPort = 50051,
    private readonly agentCliGrpcPort = 50052
  ) {}

  public allocate(): RuntimePorts {
    return {
      apiHttp: this.apiHttpPort,
      ui: this.uiPort,
      runnerGrpc: this.runnerGrpcPort,
      agentCliGrpc: this.agentCliGrpcPort
    };
  }
}
