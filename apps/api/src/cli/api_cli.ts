import { Command } from "commander";

type ApiCliDocument = {
  configPath: string;
};

/**
 * Parses the API process command line and enforces required runtime arguments.
 */
export class ApiCli {
  parse(argv: string[]): ApiCliDocument {
    const program = new Command()
      .name("@companyhelm/api")
      .allowExcessArguments(false)
      .configureOutput({
        writeErr() {},
        writeOut() {},
      })
      .requiredOption("--config-path <path>", "Path to the API config file.")
      .exitOverride();

    program.parse(argv, {
      from: "node",
    });

    const options = program.opts<{ configPath: string }>();
    return {
      configPath: String(options.configPath || "").trim(),
    };
  }
}
