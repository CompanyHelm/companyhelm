export const MANAGED_IMAGE_SERVICES = ["api", "frontend"] as const;

export type ManagedImageService = (typeof MANAGED_IMAGE_SERVICES)[number];

export interface ManagedImageDefinition {
  imageUri: string;
  repositoryPath: string;
}

const MANAGED_IMAGE_DEFINITIONS: Record<ManagedImageService, ManagedImageDefinition> = {
  api: {
    imageUri: "public.ecr.aws/x6n0f2k4/companyhelm-api",
    repositoryPath: "x6n0f2k4/companyhelm-api"
  },
  frontend: {
    imageUri: "public.ecr.aws/x6n0f2k4/companyhelm-web",
    repositoryPath: "x6n0f2k4/companyhelm-web"
  }
};

export function requireManagedImageService(value: string): ManagedImageService {
  const normalized = value.trim().toLowerCase();
  if (normalized === "api" || normalized === "frontend") {
    return normalized;
  }

  throw new Error(`Unsupported image service "${value}". Expected one of: api, frontend.`);
}

export function getManagedImageDefinition(service: ManagedImageService): ManagedImageDefinition {
  return MANAGED_IMAGE_DEFINITIONS[service];
}

export function buildManagedImageReference(service: ManagedImageService, tag: string): string {
  return `${MANAGED_IMAGE_DEFINITIONS[service].imageUri}:${tag}`;
}

export function defaultManagedImageReference(service: ManagedImageService): string {
  return buildManagedImageReference(service, "latest");
}
