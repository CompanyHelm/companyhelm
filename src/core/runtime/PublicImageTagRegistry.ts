import {
  buildManagedImageReference,
  getManagedImageDefinition,
  type ManagedImageService
} from "./ManagedImages.js";

interface PublicRegistryTokenResponse {
  token?: string;
}

interface PublicRegistryTagsResponse {
  tags?: string[];
  errors?: Array<{ message?: string }>;
}

export class PublicImageTagRegistry {
  public async listAvailableTags(service: ManagedImageService, limit = 20): Promise<string[]> {
    if (!Number.isInteger(limit) || limit < 1) {
      throw new Error("Image tag limit must be a positive integer.");
    }

    const { repositoryPath } = getManagedImageDefinition(service);
    const token = await this.fetchToken(repositoryPath);
    const response = await fetch(`https://public.ecr.aws/v2/${repositoryPath}/tags/list`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Public registry returned ${response.status} for ${service} tags.`);
    }

    const payload = (await response.json()) as PublicRegistryTagsResponse;
    if (payload.errors?.length) {
      throw new Error(payload.errors[0]?.message || `Unable to load ${service} image tags.`);
    }

    return [...new Set(payload.tags ?? [])].slice(0, limit);
  }

  public buildImageReference(service: ManagedImageService, tag: string): string {
    return buildManagedImageReference(service, tag);
  }

  private async fetchToken(repositoryPath: string): Promise<string> {
    const scope = `repository:${repositoryPath}:pull`;
    const response = await fetch(
      `https://public.ecr.aws/token/?service=public.ecr.aws&scope=${encodeURIComponent(scope)}`
    );

    if (!response.ok) {
      throw new Error(`Public registry token request returned ${response.status}.`);
    }

    const payload = (await response.json()) as PublicRegistryTokenResponse;
    if (!payload.token) {
      throw new Error("Public registry token response did not include a token.");
    }

    return payload.token;
  }
}
