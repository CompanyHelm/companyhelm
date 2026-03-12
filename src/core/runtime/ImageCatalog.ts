export interface RuntimeImages {
  api: string;
  frontend: string;
  postgres: string;
}

const DEFAULT_API_IMAGE = "public.ecr.aws/x6n0f2k4/companyhelm-api:latest";
const DEFAULT_FRONTEND_IMAGE = "public.ecr.aws/x6n0f2k4/companyhelm-web:latest";

export class ImageCatalog {
  public resolve(): RuntimeImages {
    return {
      api: process.env.COMPANYHELM_API_IMAGE || DEFAULT_API_IMAGE,
      frontend: process.env.COMPANYHELM_WEB_IMAGE || DEFAULT_FRONTEND_IMAGE,
      postgres: process.env.COMPANYHELM_POSTGRES_IMAGE || "postgres:16-alpine"
    };
  }
}
