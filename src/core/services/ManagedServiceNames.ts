export const MANAGED_SERVICE_KEYS = ["postgres", "api", "frontend", "runner"] as const;

export type ManagedServiceKey = (typeof MANAGED_SERVICE_KEYS)[number];

export const MANAGED_SERVICE_NAMES: Record<ManagedServiceKey, string> = {
  postgres: "postgres",
  api: "companyhelm-api",
  frontend: "companyhelm-web",
  runner: "companyhelm-runner"
};

const SERVICE_NAME_TO_KEY = new Map(Object.entries(MANAGED_SERVICE_NAMES).map(([key, value]) => [value, key as ManagedServiceKey]));

export const AVAILABLE_MANAGED_SERVICE_NAMES = MANAGED_SERVICE_KEYS.map((key) => MANAGED_SERVICE_NAMES[key]);

export function resolveManagedServiceKey(serviceName: string): ManagedServiceKey | null {
  return SERVICE_NAME_TO_KEY.get(serviceName.trim()) ?? null;
}
