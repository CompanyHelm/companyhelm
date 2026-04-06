import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentEnvironmentPromptScope } from "../../environment/prompt_scope.ts";
import { AgentTerminalResultFormatter } from "./result_formatter.ts";

/**
 * Applies Codex-style structured patches inside the leased environment. The patch parsing and file
 * mutation happen inside the environment itself so edits always target the on-disk workspace that
 * the agent is exploring, rather than the API host filesystem.
 */
export class AgentApplyPatchTool {
  private static readonly parameters = AgentToolParameterSchema.object({
    keepSession: Type.Optional(Type.Boolean({
      description: "Whether to preserve a newly created shell session if the patch command finishes before this call returns. If the command is still running when yield_time_ms elapses, the session stays alive regardless.",
    })),
    patch: Type.String({
      description: [
        "Structured patch text to apply inside the environment workspace.",
        "The patch must start with *** Begin Patch and end with *** End Patch.",
        "Supported operations are *** Add File:, *** Update File:, optional *** Move to:, and *** Delete File:.",
      ].join(" "),
    }),
    sessionId: Type.Optional(Type.String({
      description: "Existing environment session id to reuse so relative paths resolve from the active shell.",
    })),
    workingDirectory: Type.Optional(Type.String({
      description: "Optional working directory to use when applying the patch.",
    })),
    yield_time_ms: Type.Optional(Type.Number({
      description: "How long to wait for the patch command to finish before returning control, in milliseconds.",
    })),
  });

  private static readonly script = String.raw`
const fs = require("node:fs");
const path = require("node:path");

class CompanyHelmApplyPatchProgram {
  constructor() {
    this.patchText = Buffer.from(process.env.COMPANYHELM_APPLY_PATCH_BASE64 || "", "base64").toString("utf8");
    if (this.patchText.length === 0) {
      throw new Error("patch is required.");
    }
  }

  run() {
    const operations = this.parsePatch();
    if (operations.length === 0) {
      process.stdout.write("No changes applied.");
      return;
    }

    const summaries = [];
    for (const operation of operations) {
      summaries.push(this.applyOperation(operation));
    }

    process.stdout.write(summaries.join("\n"));
  }

  parsePatch() {
    const lines = this.patchText.replace(/\r\n/g, "\n").split("\n");
    let index = 0;
    const readLine = () => {
      if (index >= lines.length) {
        throw new Error("Unexpected end of patch.");
      }

      const line = lines[index] ?? "";
      index += 1;
      return line;
    };
    const peekLine = () => {
      return index < lines.length ? lines[index] ?? null : null;
    };
    const isBoundary = (line) => {
      return line === "*** End Patch"
        || line.startsWith("*** Add File: ")
        || line.startsWith("*** Update File: ")
        || line.startsWith("*** Delete File: ");
    };

    if (readLine() !== "*** Begin Patch") {
      throw new Error("Patch must start with *** Begin Patch.");
    }

    const operations = [];
    while (true) {
      const line = peekLine();
      if (line === null) {
        throw new Error("Patch is missing *** End Patch.");
      }

      if (line === "*** End Patch") {
        readLine();
        const trailingLines = lines.slice(index).filter((value) => value.length > 0);
        if (trailingLines.length > 0) {
          throw new Error("Patch contains trailing content after *** End Patch.");
        }

        return operations;
      }

      if (line.startsWith("*** Add File: ")) {
        const filePath = readLine().slice("*** Add File: ".length);
        const contentLines = [];
        while (true) {
          const contentLine = peekLine();
          if (contentLine === null || isBoundary(contentLine)) {
            break;
          }
          if (!contentLine.startsWith("+")) {
            throw new Error("Add file lines must start with + for " + filePath + ".");
          }
          contentLines.push(readLine().slice(1));
        }
        operations.push({
          contentLines,
          path: filePath,
          type: "add",
        });
        continue;
      }

      if (line.startsWith("*** Delete File: ")) {
        operations.push({
          path: readLine().slice("*** Delete File: ".length),
          type: "delete",
        });
        continue;
      }

      if (line.startsWith("*** Update File: ")) {
        const filePath = readLine().slice("*** Update File: ".length);
        let moveTo = null;
        if ((peekLine() ?? "").startsWith("*** Move to: ")) {
          moveTo = readLine().slice("*** Move to: ".length);
        }

        const hunks = [];
        let currentHunk = null;
        while (true) {
          const patchLine = peekLine();
          if (patchLine === null || isBoundary(patchLine)) {
            break;
          }

          const lineText = readLine();
          if (lineText === "*** End of File") {
            if (!currentHunk) {
              currentHunk = {
                endOfFile: true,
                lines: [],
              };
            } else {
              currentHunk.endOfFile = true;
            }
            continue;
          }

          if (lineText.startsWith("@@")) {
            if (currentHunk) {
              hunks.push(currentHunk);
            }
            currentHunk = {
              endOfFile: false,
              lines: [],
            };
            continue;
          }

          const prefix = lineText[0] ?? "";
          if (prefix !== " " && prefix !== "+" && prefix !== "-") {
            throw new Error("Unexpected update line for " + filePath + ": " + lineText);
          }

          if (!currentHunk) {
            currentHunk = {
              endOfFile: false,
              lines: [],
            };
          }

          currentHunk.lines.push({
            kind: prefix,
            text: lineText.slice(1),
          });
        }

        if (currentHunk) {
          hunks.push(currentHunk);
        }

        operations.push({
          hunks,
          moveTo,
          path: filePath,
          type: "update",
        });
        continue;
      }

      throw new Error("Unexpected patch header: " + line);
    }
  }

  applyOperation(operation) {
    switch (operation.type) {
      case "add":
        return this.addFile(operation);
      case "delete":
        return this.deleteFile(operation);
      case "update":
        return this.updateFile(operation);
      default:
        throw new Error("Unsupported operation type: " + operation.type);
    }
  }

  addFile(operation) {
    const absolutePath = this.resolvePath(operation.path);
    if (fs.existsSync(absolutePath)) {
      throw new Error("File already exists: " + operation.path);
    }

    fs.mkdirSync(path.dirname(absolutePath), {
      recursive: true,
    });
    fs.writeFileSync(absolutePath, this.serializeLines(operation.contentLines, true));
    return "A " + operation.path;
  }

  deleteFile(operation) {
    const absolutePath = this.resolvePath(operation.path);
    if (!fs.existsSync(absolutePath)) {
      throw new Error("File not found: " + operation.path);
    }

    const stats = fs.statSync(absolutePath);
    if (!stats.isFile()) {
      throw new Error("Delete File only supports files: " + operation.path);
    }

    fs.unlinkSync(absolutePath);
    return "D " + operation.path;
  }

  updateFile(operation) {
    const sourcePath = this.resolvePath(operation.path);
    if (!fs.existsSync(sourcePath)) {
      throw new Error("File not found: " + operation.path);
    }

    const stats = fs.statSync(sourcePath);
    if (!stats.isFile()) {
      throw new Error("Update File only supports files: " + operation.path);
    }

    const fileState = this.readFileState(sourcePath);
    let searchCursor = 0;
    for (const hunk of operation.hunks) {
      const oldLines = hunk.lines
        .filter((line) => line.kind !== "+")
        .map((line) => line.text);
      const newLines = hunk.lines
        .filter((line) => line.kind !== "-")
        .map((line) => line.text);
      const matchIndex = this.findMatchIndex(fileState.lines, oldLines, searchCursor, hunk.endOfFile);
      if (matchIndex < 0) {
        throw new Error("Failed to locate update hunk in " + operation.path + ".");
      }

      fileState.lines.splice(matchIndex, oldLines.length, ...newLines);
      searchCursor = matchIndex + newLines.length;
    }

    const destinationPath = operation.moveTo ? this.resolvePath(operation.moveTo) : sourcePath;
    if (
      operation.moveTo
      && destinationPath !== sourcePath
      && fs.existsSync(destinationPath)
    ) {
      throw new Error("Destination file already exists: " + operation.moveTo);
    }

    fs.mkdirSync(path.dirname(destinationPath), {
      recursive: true,
    });
    fs.writeFileSync(destinationPath, this.serializeLines(fileState.lines, fileState.hasTrailingNewline));
    if (destinationPath !== sourcePath) {
      fs.unlinkSync(sourcePath);
      return "R " + operation.path + " -> " + operation.moveTo;
    }

    return "M " + operation.path;
  }

  readFileState(filePath) {
    const rawText = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
    const hasTrailingNewline = rawText.endsWith("\n");
    const lines = rawText.length === 0
      ? []
      : rawText.split("\n");
    if (hasTrailingNewline) {
      lines.pop();
    }

    return {
      hasTrailingNewline,
      lines,
    };
  }

  serializeLines(lines, hasTrailingNewline) {
    const body = lines.join("\n");
    if (!hasTrailingNewline) {
      return body;
    }

    return lines.length === 0 ? "\n" : body + "\n";
  }

  findMatchIndex(lines, needle, searchCursor, endOfFile) {
    const exactMatchAt = (index) => {
      if (index < 0 || index + needle.length > lines.length) {
        return false;
      }

      for (let offset = 0; offset < needle.length; offset += 1) {
        if ((lines[index + offset] ?? null) !== (needle[offset] ?? null)) {
          return false;
        }
      }

      return !endOfFile || index + needle.length === lines.length;
    };

    if (needle.length === 0) {
      return endOfFile ? lines.length : Math.min(searchCursor, lines.length);
    }

    for (let index = Math.max(0, searchCursor); index <= lines.length - needle.length; index += 1) {
      if (exactMatchAt(index)) {
        return index;
      }
    }

    for (let index = 0; index < Math.max(0, searchCursor); index += 1) {
      if (exactMatchAt(index)) {
        return index;
      }
    }

    return -1;
  }

  resolvePath(filePath) {
    if (!filePath || filePath.trim().length === 0) {
      throw new Error("Patch file path cannot be empty.");
    }

    return path.resolve(process.cwd(), filePath);
  }
}

try {
  new CompanyHelmApplyPatchProgram().run();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(message + "\n");
  process.exit(1);
}
`;

  private readonly promptScope: AgentEnvironmentPromptScope;

  constructor(promptScope: AgentEnvironmentPromptScope) {
    this.promptScope = promptScope;
  }

  createDefinition(): ToolDefinition<typeof AgentApplyPatchTool.parameters> {
    return {
      description: "Apply a structured patch inside the leased environment workspace and return a concise file-level summary.",
      execute: async (_toolCallId, params) => {
        const environment = await this.promptScope.getEnvironment();
        const result = await environment.executeCommand({
          command: AgentApplyPatchTool.buildCommand(),
          environment: {
            COMPANYHELM_APPLY_PATCH_BASE64: Buffer.from(params.patch, "utf8").toString("base64"),
          },
          keepSession: params.keepSession,
          sessionId: params.sessionId,
          workingDirectory: params.workingDirectory,
          yield_time_ms: params.yield_time_ms,
        });
        return {
          content: [{
            text: AgentTerminalResultFormatter.formatCommandResult(result),
            type: "text",
          }],
          details: {
            command: "apply_patch",
            completed: result.completed,
            cwd: params.workingDirectory ?? null,
            exitCode: result.exitCode,
            sessionId: result.sessionId,
            type: "terminal",
          },
        };
      },
      label: "apply_patch",
      name: "apply_patch",
      parameters: AgentApplyPatchTool.parameters,
      promptGuidelines: [
        "Use apply_patch for precise file edits after you have already inspected the relevant files.",
        "Provide the full structured patch in the patch field, starting with *** Begin Patch and ending with *** End Patch.",
        "Reuse sessionId when relative paths should resolve from an existing shell state.",
        "If the patch command is still running when the tool returns after yield_time_ms, the session remains open regardless of keepSession.",
        "Set keepSession to true only when a newly created shell session should remain open after the patch finishes.",
      ],
      promptSnippet: "Apply a structured patch in the environment",
    };
  }

  private static buildCommand(): string {
    return [
      "script_file=\"$(mktemp /tmp/companyhelm-apply-patch.XXXXXX.js)\"",
      "cat > \"$script_file\" <<'__COMPANYHELM_APPLY_PATCH_SCRIPT__'",
      AgentApplyPatchTool.script,
      "__COMPANYHELM_APPLY_PATCH_SCRIPT__",
      "if command -v node >/dev/null 2>&1; then",
      "  node \"$script_file\"",
      "  status=$?",
      "elif command -v nodejs >/dev/null 2>&1; then",
      "  nodejs \"$script_file\"",
      "  status=$?",
      "else",
      "  printf '%s\\n' 'apply_patch requires node or nodejs in the environment.' >&2",
      "  status=127",
      "fi",
      "rm -f \"$script_file\"",
      "exit \"$status\"",
    ].join("\n");
  }
}
