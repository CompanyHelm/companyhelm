import { defaultManagedImageReference } from "./ManagedImages.js";
import { RepoConfigStore } from "./RepoConfigStore.js";

export interface RuntimeImages {
  api: string;
  frontend: string;
  postgres: string;
}

export class ImageCatalog {
  public resolve(): RuntimeImages {
    const configuredImages = new RepoConfigStore().load().images;

    return {
      api: configuredImages.api || process.env.COMPANYHELM_API_IMAGE || defaultManagedImageReference("api"),
      frontend:
        configuredImages.frontend || process.env.COMPANYHELM_WEB_IMAGE || defaultManagedImageReference("frontend"),
      postgres: process.env.COMPANYHELM_POSTGRES_IMAGE || "postgres:16-alpine"
    };
  }
}
