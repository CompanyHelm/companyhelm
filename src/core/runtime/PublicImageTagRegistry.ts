import {
  buildManagedImageReference,
  getManagedImageDefinition,
  type ManagedImageService
} from "./ManagedImages.js";

interface PublicRegistryImageTag {
  tag: string;
  createdAt?: string;
}

interface PublicRegistryTokenResponse {
  token?: string;
}

interface PublicRegistryTagsResponse {
  tags?: string[];
  errors?: Array<{ message?: string }>;
}

interface PublicRegistryManifestDescriptor {
  digest?: string;
  platform?: {
    architecture?: string;
    os?: string;
  };
}

interface PublicRegistryImageIndexResponse {
  manifests?: PublicRegistryManifestDescriptor[];
}

interface PublicRegistryImageManifestResponse {
  config?: {
    digest?: string;
  };
}

interface PublicRegistryBlobConfigResponse {
  created?: string;
}

export class PublicImageTagRegistry {
  public async listAvailableTags(service: ManagedImageService, limit = 20): Promise<PublicRegistryImageTag[]> {
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

    const uniqueTags = [...new Set(payload.tags ?? [])].map((tag, position) => ({ tag, position }));
    const tagsWithMetadata = await Promise.all(
      uniqueTags.map(async ({ tag, position }) => ({
        tag,
        position,
        createdAt: await this.fetchCreatedAt(repositoryPath, token, tag)
      }))
    );

    return tagsWithMetadata
      .sort((left, right) => {
        const leftTimestamp = left.createdAt ? Date.parse(left.createdAt) : Number.NEGATIVE_INFINITY;
        const rightTimestamp = right.createdAt ? Date.parse(right.createdAt) : Number.NEGATIVE_INFINITY;

        if (rightTimestamp !== leftTimestamp) {
          return rightTimestamp - leftTimestamp;
        }

        return left.position - right.position;
      })
      .slice(0, limit)
      .map(({ tag, createdAt }) => ({ tag, createdAt }));
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

  private async fetchCreatedAt(repositoryPath: string, token: string, tag: string): Promise<string | undefined> {
    const manifestReference = await this.fetchJson<PublicRegistryImageIndexResponse | PublicRegistryImageManifestResponse>(
      `https://public.ecr.aws/v2/${repositoryPath}/manifests/${encodeURIComponent(tag)}`,
      {
        Authorization: `Bearer ${token}`,
        Accept: [
          "application/vnd.oci.image.index.v1+json",
          "application/vnd.docker.distribution.manifest.list.v2+json",
          "application/vnd.oci.image.manifest.v1+json",
          "application/vnd.docker.distribution.manifest.v2+json"
        ].join(", ")
      }
    );

    const digest = this.selectManifestDigest(manifestReference);
    const manifest = digest
      ? await this.fetchJson<PublicRegistryImageManifestResponse>(
          `https://public.ecr.aws/v2/${repositoryPath}/manifests/${encodeURIComponent(digest)}`,
          {
            Authorization: `Bearer ${token}`,
            Accept: ["application/vnd.oci.image.manifest.v1+json", "application/vnd.docker.distribution.manifest.v2+json"].join(", ")
          }
        )
      : manifestReference;

    const configDigest = "config" in manifest ? manifest.config?.digest : undefined;
    if (!configDigest) {
      return undefined;
    }

    const config = await this.fetchJson<PublicRegistryBlobConfigResponse>(
      `https://public.ecr.aws/v2/${repositoryPath}/blobs/${configDigest}`,
      {
        Authorization: `Bearer ${token}`
      }
    );

    return config.created;
  }

  private selectManifestDigest(
    manifest: PublicRegistryImageIndexResponse | PublicRegistryImageManifestResponse
  ): string | undefined {
    if (!("manifests" in manifest) || !manifest.manifests?.length) {
      return undefined;
    }

    return (
      manifest.manifests.find((entry) => entry.platform?.os === "linux" && entry.platform?.architecture === "amd64")
        ?.digest ?? manifest.manifests[0]?.digest
    );
  }

  private async fetchJson<T>(url: string, headers: Record<string, string>): Promise<T> {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Public registry returned ${response.status} for ${url}.`);
    }

    return (await response.json()) as T;
  }
}
