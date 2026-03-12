export interface RunnerStartInput {
  grpcTarget: string;
  secret: string;
}

export interface RunnerStartCommand {
  command: string;
  args: string[];
}

export class RunnerSupervisor {
  public constructor(private readonly configPath: string) {}

  public buildStartArgs(input: RunnerStartInput): RunnerStartCommand {
    return {
      command: "companyhelm-runner",
      args: [
        "--config-path",
        this.configPath,
        "runner",
        "start",
        "--grpc-target",
        input.grpcTarget,
        "--secret",
        input.secret
      ]
    };
  }
}
