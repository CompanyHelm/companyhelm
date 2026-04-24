import { useTheme } from "@/components/theme_provider";
import { cn } from "@/lib/utils";

const openAiIconAsset = {
  dark: "/logos/providers/openai-dark.svg",
  light: "/logos/providers/openai-light.svg",
};

const providerIconAssets: Record<string, string | typeof openAiIconAsset> = {
  anthropic: "/logos/providers/anthropic.svg",
  gemini: "/logos/providers/gemini.svg",
  "google-gemini-cli": "/logos/providers/gemini.svg",
  openai: openAiIconAsset,
  "openai-codex": openAiIconAsset,
  "openai-compatible": openAiIconAsset,
  openrouter: "/logos/providers/openrouter.svg",
};

const providerFallbackMarks: Record<string, string> = {
  companyhelm: "CH",
  nvidia: "NV",
};

interface ModelProviderIconProps {
  className?: string;
  imageClassName?: string;
  label: string;
  providerId: string;
}

/**
 * Keeps provider branding consistent anywhere the UI names a model provider while still falling
 * back to a compact text mark for vendors without a local logo asset.
 */
export function ModelProviderIcon(props: ModelProviderIconProps) {
  const theme = useTheme();
  const asset = providerIconAssets[props.providerId];
  const assetPath = typeof asset === "string"
    ? asset
    : asset?.[theme.theme === "light" ? "light" : "dark"];
  const fallbackMark = providerFallbackMarks[props.providerId] ?? props.label.slice(0, 2).toUpperCase();

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded bg-muted text-[0.65rem] font-semibold tracking-tight text-muted-foreground",
        props.className,
      )}
    >
      {assetPath ? (
        <img
          alt=""
          className={cn("size-4 object-contain", props.imageClassName)}
          src={assetPath}
        />
      ) : fallbackMark}
    </span>
  );
}
