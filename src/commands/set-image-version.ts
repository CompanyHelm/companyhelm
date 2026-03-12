import { createInterface } from "node:readline/promises";
import type { Readable, Writable } from "node:stream";

import type { Command } from "commander";

import { LocalConfigStore } from "../core/runtime/LocalConfigStore.js";
import {
  MANAGED_IMAGE_SERVICES,
  requireManagedImageService,
  type ManagedImageService
} from "../core/runtime/ManagedImages.js";
import { PublicImageTagRegistry } from "../core/runtime/PublicImageTagRegistry.js";

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

function requireInteractiveTerminal(input: Readable): void {
  if (!("isTTY" in input) || !input.isTTY) {
    throw new Error("set-image-version requires a TTY so you can choose an image interactively.");
  }
}

async function promptForSelection(
  message: string,
  options: string[],
  input: Readable,
  output: Writable,
  defaultIndex?: number
): Promise<string> {
  requireInteractiveTerminal(input);
  if (options.length === 0) {
    throw new Error("No selectable options were provided.");
  }

  const rl = createInterface({ input, output });

  try {
    output.write(`${message}\n`);
    options.forEach((option, index) => {
      const currentSuffix = index === defaultIndex ? " [current]" : "";
      output.write(`${index + 1}. ${option}${currentSuffix}\n`);
    });

    const promptSuffix = defaultIndex === undefined ? "" : ` [${defaultIndex + 1}]`;
    const answer = (await rl.question(`Select an option${promptSuffix}: `)).trim();
    if (!answer && defaultIndex !== undefined) {
      return options[defaultIndex];
    }

    const selectedIndex = Number.parseInt(answer, 10);
    if (!Number.isInteger(selectedIndex) || selectedIndex < 1 || selectedIndex > options.length) {
      throw new Error(`Invalid selection: ${answer || "(empty)"}`);
    }

    return options[selectedIndex - 1];
  } finally {
    rl.close();
  }
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

  output.write("CompanyHelm image selection\n");
  const selectedService = options.service
    ? requireManagedImageService(options.service)
    : await promptForSelection("Which image do you want to pin?", [...MANAGED_IMAGE_SERVICES], input, output).then(
        (value) => requireManagedImageService(value)
      );

  const currentImage = configStore.load().images[selectedService];
  output.write(`Current configured image for ${selectedService}: ${currentImage ?? "default (latest)"}\n`);

  const tags = await registry.listAvailableTags(selectedService, options.limit);
  if (tags.length === 0) {
    throw new Error(`No image tags found for ${selectedService}.`);
  }

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
  output.write(`Updated ${result.configPath} to ${result.image}\n`);
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
