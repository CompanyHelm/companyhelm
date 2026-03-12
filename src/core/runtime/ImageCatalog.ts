export interface RuntimeImages {
  api: string;
  frontend: string;
  postgres: string;
}

export class ImageCatalog {
  public resolve(): RuntimeImages {
    return {
      api: process.env.COMPANYHELM_API_IMAGE || "companyhelm-api:latest",
      frontend: process.env.COMPANYHELM_WEB_IMAGE || "companyhelm-web:latest",
      postgres: process.env.COMPANYHELM_POSTGRES_IMAGE || "postgres:16-alpine"
    };
  }
}
