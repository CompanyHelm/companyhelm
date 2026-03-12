export class FakeDocker {
  public readonly composeRuns: Array<{ args: string[]; output: string }> = [];

  public enqueue(args: string[], output = ""): void {
    this.composeRuns.push({ args, output });
  }
}
