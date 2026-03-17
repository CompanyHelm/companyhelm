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

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const MAX_FETCH_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 250;
const METADATA_FETCH_CONCURRENCY = 6;

class PublicRegistryRequestError extends Error {
  public readonly status: number;
  public readonly retryAfterMs?: number;

  public constructor(url: string, status: number, retryAfterMs?: number) {
    super(`Public registry returned ${status} for ${url}.`);
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
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
    const candidateTags = uniqueTags.slice(0, limit);
    const createdAtByDigest = new Map<string, Promise<string | undefined>>();
    const tagsWithMetadata = await this.mapWithConcurrency(
      candidateTags,
      METADATA_FETCH_CONCURRENCY,
      async ({ tag, position }) => ({
      tag,
      position,
      createdAt: await this.fetchCreatedAt(repositoryPath, token, tag, createdAtByDigest)
      })
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

  private async fetchCreatedAt(
    repositoryPath: string,
    token: string,
    tag: string,
    createdAtByDigest: Map<string, Promise<string | undefined>>
  ): Promise<string | undefined> {
    try {
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

      const existingCreatedAt = createdAtByDigest.get(configDigest);
      if (existingCreatedAt) {
        return await existingCreatedAt;
      }

      const createdAtPromise = this.fetchJson<PublicRegistryBlobConfigResponse>(
        `https://public.ecr.aws/v2/${repositoryPath}/blobs/${configDigest}`,
        {
          Authorization: `Bearer ${token}`
        }
      )
        .then((config) => config.created)
        .catch((error: unknown) => {
          createdAtByDigest.delete(configDigest);
          throw error;
        });
      createdAtByDigest.set(configDigest, createdAtPromise);
      return await createdAtPromise;
    } catch (error) {
      if (error instanceof PublicRegistryRequestError) {
        return undefined;
      }

      throw error;
    }
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
    for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt += 1) {
      const response = await fetch(url, { headers });
      if (response.ok) {
        return (await response.json()) as T;
      }

      const retryAfterMs = this.parseRetryAfterMs(response);
      if (attempt < MAX_FETCH_ATTEMPTS && RETRYABLE_STATUS_CODES.has(response.status)) {
        await this.sleep(retryAfterMs ?? DEFAULT_RETRY_DELAY_MS * attempt);
        continue;
      }

      throw new PublicRegistryRequestError(url, response.status, retryAfterMs);
    }

    throw new PublicRegistryRequestError(url, 500);
  }

  private parseRetryAfterMs(response: Response): number | undefined {
    const retryAfter = response.headers.get("retry-after");
    if (!retryAfter) {
      return undefined;
    }

    const retryAfterSeconds = Number.parseInt(retryAfter, 10);
    if (Number.isFinite(retryAfterSeconds)) {
      return Math.max(retryAfterSeconds, 0) * 1000;
    }

    const retryAt = Date.parse(retryAfter);
    if (Number.isNaN(retryAt)) {
      return undefined;
    }

    return Math.max(retryAt - Date.now(), 0);
  }

  private async sleep(delayMs: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  private async mapWithConcurrency<T, TResult>(
    items: readonly T[],
    concurrency: number,
    mapper: (item: T, index: number) => Promise<TResult>
  ): Promise<TResult[]> {
    if (items.length === 0) {
      return [];
    }

    const results = new Array<TResult>(items.length);
    let nextIndex = 0;
    const workerCount = Math.min(concurrency, items.length);

    await Promise.all(
      Array.from({ length: workerCount }, async () => {
        while (nextIndex < items.length) {
          const currentIndex = nextIndex;
          nextIndex += 1;
          results[currentIndex] = await mapper(items[currentIndex], currentIndex);
        }
      })
    );

    return results;
  }
}
