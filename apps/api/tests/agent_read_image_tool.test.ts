import assert from "node:assert/strict";
import { PhotonImage } from "@silvia-odwyer/photon-node";
import { test, vi } from "vitest";
import { AgentTerminalToolProvider } from "../src/services/agent/session/pi-mono/tools/terminal/provider.ts";
import { AgentReadImageTool } from "../src/services/agent/session/pi-mono/tools/terminal/read_image.ts";
import {
  AgentReadImageToolService,
  type AgentReadImageToolConfig,
} from "../src/services/agent/session/pi-mono/tools/terminal/read_image_service.ts";

const DEFAULT_READ_IMAGE_CONFIG: AgentReadImageToolConfig = {
  defaultResolutionHeight: 1280,
  defaultResolutionWidth: 1280,
  maxReturnBytes: 4 * 1024 * 1024,
  maxSourceBytes: 25 * 1024 * 1024,
};

function createPng(width: number, height: number): Buffer {
  const pixels = new Uint8Array(width * height * 4);
  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = 255;
    pixels[index + 1] = Math.floor((index / 4) % 255);
    pixels[index + 2] = 64;
    pixels[index + 3] = 255;
  }

  const image = new PhotonImage(pixels, width, height);
  try {
    return Buffer.from(image.get_bytes());
  } finally {
    image.free();
  }
}

function readImageSize(data: Buffer): { height: number; width: number } {
  const image = PhotonImage.new_from_byteslice(new Uint8Array(data));
  try {
    return {
      height: image.get_height(),
      width: image.get_width(),
    };
  } finally {
    image.free();
  }
}

test("AgentReadImageToolService returns full images with magic-byte MIME metadata", async () => {
  const imageData = createPng(4, 3);
  const service = new AgentReadImageToolService(DEFAULT_READ_IMAGE_CONFIG);

  const result = await service.prepareImage({
    data: imageData,
    detail: "full",
    path: "/tmp/image-without-extension",
    sourceByteSize: imageData.byteLength,
  });

  assert.equal(result.inputMimeType, "image/png");
  assert.equal(result.outputMimeType, "image/png");
  assert.equal(result.originalWidth, 4);
  assert.equal(result.originalHeight, 3);
  assert.equal(result.outputWidth, 4);
  assert.equal(result.outputHeight, 3);
  assert.equal(result.outputByteSize, imageData.byteLength);
  assert.equal(result.resized, false);
  assert.equal(Buffer.from(result.base64Image, "base64").equals(imageData), true);
});

test("AgentReadImageToolService resizes large image views while preserving the original bytes on disk", async () => {
  const imageData = createPng(200, 100);
  const service = new AgentReadImageToolService(DEFAULT_READ_IMAGE_CONFIG);

  const result = await service.prepareImage({
    data: imageData,
    detail: "resized",
    path: "/tmp/mockup.png",
    resolutionHeight: 50,
    resolutionWidth: 50,
    sourceByteSize: imageData.byteLength,
  });

  const outputData = Buffer.from(result.base64Image, "base64");
  const outputSize = readImageSize(outputData);

  assert.equal(result.inputMimeType, "image/png");
  assert.equal(result.outputMimeType, "image/jpeg");
  assert.equal(result.originalWidth, 200);
  assert.equal(result.originalHeight, 100);
  assert.equal(result.outputWidth, 50);
  assert.equal(result.outputHeight, 25);
  assert.deepEqual(outputSize, {
    height: 25,
    width: 50,
  });
  assert.equal(result.originalByteSize, imageData.byteLength);
  assert.equal(result.outputByteSize, outputData.byteLength);
  assert.equal(result.resized, true);
});

test("AgentReadImageToolService enforces the configured full-output byte limit", async () => {
  const imageData = createPng(20, 20);
  const service = new AgentReadImageToolService({
    ...DEFAULT_READ_IMAGE_CONFIG,
    maxReturnBytes: imageData.byteLength - 1,
  });

  await assert.rejects(
    () => service.prepareImage({
      data: imageData,
      detail: "full",
      path: "/tmp/too-large.png",
      sourceByteSize: imageData.byteLength,
    }),
    /max_return_bytes/,
  );
});

test("AgentReadImageTool reads an environment file and returns text metadata plus image content", async () => {
  const imageData = createPng(5, 4);
  const executeBashCommand = vi.fn(async () => {
    return {
      exitCode: 0,
      output: JSON.stringify({
        base64: imageData.toString("base64"),
        byteSize: imageData.byteLength,
      }),
    };
  });
  const tool = new AgentReadImageTool({
    async getEnvironment() {
      return {
        executeBashCommand,
      };
    },
  } as never, new AgentReadImageToolService(DEFAULT_READ_IMAGE_CONFIG));

  const result = await tool.createDefinition().execute("tool-call-1", {
    path: "/var/tmp/screenshot",
  });

  assert.equal(executeBashCommand.mock.calls.length, 1);
  assert.match(executeBashCommand.mock.calls[0]?.[0].command, /\/var\/tmp\/screenshot/u);
  assert.equal(executeBashCommand.mock.calls[0]?.[0].timeoutSeconds, 30);
  assert.deepEqual(result.content[0], {
    text: [
      "path: /var/tmp/screenshot",
      "detail: resized",
      "inputMimeType: image/png",
      "outputMimeType: image/png",
      "originalSize: 5x4",
      "outputSize: 5x4",
      `originalByteSize: ${imageData.byteLength}`,
      `outputByteSize: ${imageData.byteLength}`,
      "resized: false",
      "requestedResolution: 1280x1280",
      "maxReturnBytes: 4194304",
    ].join("\n"),
    type: "text",
  });
  assert.deepEqual(result.content[1], {
    data: imageData.toString("base64"),
    mimeType: "image/png",
    type: "image",
  });
  assert.deepEqual(result.details, {
    detail: "resized",
    inputMimeType: "image/png",
    maxReturnBytes: 4194304,
    maxSourceBytes: 26214400,
    originalByteSize: imageData.byteLength,
    originalHeight: 4,
    originalWidth: 5,
    outputByteSize: imageData.byteLength,
    outputHeight: 4,
    outputMimeType: "image/png",
    outputWidth: 5,
    path: "/var/tmp/screenshot",
    requestedResolutionHeight: 1280,
    requestedResolutionWidth: 1280,
    resized: false,
    type: "read_image",
  });
});

test("AgentTerminalToolProvider contributes read_image with the environment terminal tools", () => {
  const provider = new AgentTerminalToolProvider(
    {} as never,
    {
      warn() {
        return undefined;
      },
    } as never,
    new AgentReadImageToolService(DEFAULT_READ_IMAGE_CONFIG),
  );

  assert.deepEqual(
    provider.createToolDefinitions().map((tool) => tool.name),
    [
      "pty_list",
      "pty_exec",
      "bash_exec",
      "apply_patch",
      "pty_send_input",
      "pty_read_output",
      "pty_resize",
      "pty_kill",
      "read_image",
    ],
  );
});
