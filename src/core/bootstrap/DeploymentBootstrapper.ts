import fs from "node:fs";
import path from "node:path";

import type { RuntimeState } from "../runtime/RuntimeState.js";
import { SeedSqlRenderer } from "./SeedSqlRenderer.js";

export class DeploymentBootstrapper {
  private readonly renderer = new SeedSqlRenderer();

  public writeSeedSql(root: string, state: RuntimeState, passwordHash: string, passwordSalt: string): string {
    const outputPath = path.join(root, "seed.sql");
    const sql = this.renderer.render({
      companyId: state.company.id,
      companyName: state.company.name,
      username: state.auth.username,
      passwordHash,
      passwordSalt,
      runnerName: state.runner.name,
      runnerSecret: state.runner.secret
    });

    fs.writeFileSync(outputPath, sql, "utf8");
    return outputPath;
  }
}
