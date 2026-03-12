import * as clack from "@clack/prompts";
import type { Readable, Writable } from "node:stream";

import type { Command } from "commander";

import { LocalConfigStore } from "../core/runtime/LocalConfigStore.js";
import {
  MANAGED_IMAGE_SERVICES,
  requireManagedImageService,
  type ManagedImageService
} from "../core/runtime/ManagedImages.js";
import { PublicImageTagRegistry } from "../core/runtime/PublicImageTagRegistry.js";
import { requireInteractiveTerminal, unwrapPromptResult } from "./interactive.js";

export interface SetImageVersionOptions {
  service?: string;
  limit: number;
}

export interface InteractiveImageSelector {
  listAvailableTags(service: ManagedImageService, limit: number): Promise<string[]>;
  buildImageReference(service: ManagedImageService, tag: string): string;
}

export interface ImageConfigStore {
  load(): { images: Partial<Record<ManagedImageService, string>> };
  setImage(service: ManagedImageService, image: string): { configPath: string; image: string };
}

function parsePositiveInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`Expected a positive integer, received: ${value}`);
  }

  return parsed;
}

async function promptForSelection(
  message: string,
  options: string[],
  input: Readable,
  output: Writable,
  defaultIndex?: number
): Promise<string> {
  requireInteractiveTerminal(input, output, "set-image-version requires a TTY so you can choose an image interactively.");
  if (options.length === 0) {
    throw new Error("No selectable options were provided.");
  }

  const selected = await clack.select({
    message,
    options: options.map((option, index) => ({
      value: option,
      label: option,
      hint: index === defaultIndex ? "current" : undefined
    })),
    initialValue: defaultIndex === undefined ? undefined : options[defaultIndex],
    input,
    output
  });

  return unwrapPromptResult(selected, "Image selection cancelled.", output);
}

async function loadAvailableTags(
  registry: InteractiveImageSelector,
  service: ManagedImageService,
  limit: number,
  output: Writable
): Promise<string[]> {
  const spinner = clack.spinner({ output });
  spinner.start(`Loading the latest ${limit} image tags for ${service}`);

  let tags: string[];
  try {
    tags = await registry.listAvailableTags(service, limit);
  } catch (error) {
    spinner.stop("Unable to load image tags");
    throw error;
  }

  if (tags.length === 0) {
    spinner.stop("No image tags found");
    throw new Error(`No image tags found for ${service}.`);
  }

  spinner.stop(`Loaded ${tags.length} image tag${tags.length === 1 ? "" : "s"}`);
  return tags;
}

export async function runSetImageVersion(
  options: SetImageVersionOptions,
  dependencies: {
    input?: Readable;
    output?: Writable;
    registry?: InteractiveImageSelector;
    configStore?: ImageConfigStore;
  } = {}
): Promise<void> {
  const input = dependencies.input ?? process.stdin;
  const output = dependencies.output ?? process.stdout;
  const registry = dependencies.registry ?? new PublicImageTagRegistry();
  const configStore = dependencies.configStore ?? new LocalConfigStore();

  clack.intro("CompanyHelm image selection", { output });
  const selectedService = options.service
    ? requireManagedImageService(options.service)
    : await promptForSelection("Which image do you want to pin?", [...MANAGED_IMAGE_SERVICES], input, output).then(
        (value) => requireManagedImageService(value)
      );

  const currentImage = configStore.load().images[selectedService];
  clack.log.info(`Current configured image for ${selectedService}: ${currentImage ?? "default (latest)"}`, { output });

  const tags = await loadAvailableTags(registry, selectedService, options.limit, output);

  const currentTag = currentImage ? currentImage.slice(currentImage.lastIndexOf(":") + 1) : undefined;
  const defaultIndex = currentTag ? tags.indexOf(currentTag) : -1;
  const selectedTag = await promptForSelection(
    `Choose the ${selectedService} image tag`,
    tags,
    input,
    output,
    defaultIndex >= 0 ? defaultIndex : undefined
  );

  const result = configStore.setImage(selectedService, registry.buildImageReference(selectedService, selectedTag));
  clack.outro(`Updated ${result.configPath} to ${result.image}`, { output });
}

export function registerSetImageVersionCommand(program: Command): void {
  program
    .command("set-image-version")
    .description("Interactively choose an API or frontend image tag and store it in local config.yaml.")
    .option("-s, --service <service>", "Prefill the service to update (api or frontend)")
    .option("-l, --limit <count>", "How many image tags to show", parsePositiveInteger, 20)
    .action(async (options: SetImageVersionOptions) => {
      await runSetImageVersion(options);
    });
}
