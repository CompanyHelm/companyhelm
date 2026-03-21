import { Container } from "inversify";
import type { ConfigLoader } from "../config/loader.ts";

/**
 * Owns the small Inversify container used to share runtime services like config.
 */
export class AppContainer {
  private static readonly configKey = Symbol.for("app.config");
  private readonly container = new Container();

  bindConfig<TConfig>(config: ConfigLoader<TConfig>): void {
    if (this.container.isBound(AppContainer.configKey)) {
      this.container.unbindSync(AppContainer.configKey);
    }

    this.container.bind<ConfigLoader<TConfig>>(AppContainer.configKey).toConstantValue(config);
  }

  getConfig<TConfig>(): ConfigLoader<TConfig> {
    return this.container.get<ConfigLoader<TConfig>>(AppContainer.configKey);
  }
}
