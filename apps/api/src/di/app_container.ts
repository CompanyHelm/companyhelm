import { Container, type ServiceIdentifier } from "inversify";
import type { ConfigLoader } from "../config/loader.ts";

/**
 * Owns the small Inversify container used to share runtime services like config.
 */
export class AppContainer {
  private static readonly configKey = Symbol.for("app.config");
  private readonly container = new Container({
    autobind: true,
  });

  bindConfig<TConfig>(config: ConfigLoader<TConfig>): void {
    if (this.container.isBound(AppContainer.configKey)) {
      this.container.unbindSync(AppContainer.configKey);
    }

    this.container.bind<ConfigLoader<TConfig>>(AppContainer.configKey).toConstantValue(config);
  }

  getConfig<TConfig>(): ConfigLoader<TConfig> {
    return this.container.get<ConfigLoader<TConfig>>(AppContainer.configKey);
  }

  get<TResolved>(serviceIdentifier: ServiceIdentifier<TResolved>): TResolved {
    return this.container.get<TResolved>(serviceIdentifier);
  }
}
