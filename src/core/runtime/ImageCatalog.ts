import { defaultManagedImageReference } from "./ManagedImages.js";
import { ImageConfigStore } from "./ImageConfigStore.js";

export interface RuntimeImages {
  api: string;
  frontend: string;
  postgres: string;
}

export class ImageCatalog {
  public constructor(private readonly configStore = new ImageConfigStore()) {}

  public resolve(): RuntimeImages {
    const configuredImages = this.configStore.load().images;

    return {
      api: process.env.COMPANYHELM_API_IMAGE || configuredImages.api || defaultManagedImageReference("api"),
      frontend:
        process.env.COMPANYHELM_WEB_IMAGE || configuredImages.frontend || defaultManagedImageReference("frontend"),
      postgres: process.env.COMPANYHELM_POSTGRES_IMAGE || "postgres:16-alpine"
    };
  }
}
