import { useEffect, useRef, useState } from "react";
import { UploadIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { EnvFileParser, type ParsedEnvFile, type ParsedEnvSecretDraft } from "./env_file_parser";

export type ImportSecretsDialogExistingSecret = {
  envVarName: string;
  id: string;
  name: string;
};

interface ImportSecretsDialogProps {
  errorMessage: string | null;
  existingSecrets: ImportSecretsDialogExistingSecret[];
  isOpen: boolean;
  isSaving: boolean;
  onImport(input: {
    secretDrafts: ParsedEnvSecretDraft[];
    shouldOverwriteExistingSecrets: boolean;
  }): Promise<void>;
  onOpenChange(open: boolean): void;
}

const envFileParser = new EnvFileParser();

/**
 * Handles browser-side `.env` imports so users can drag/drop or pick a file, preview the parsed
 * keys, and decide whether matching environment variables should overwrite existing secrets.
 */
export function ImportSecretsDialog(props: ImportSecretsDialogProps) {
  const [isDragActive, setDragActive] = useState(false);
  const [localErrorMessage, setLocalErrorMessage] = useState<string | null>(null);
  const [parsedEnvFile, setParsedEnvFile] = useState<ParsedEnvFile | null>(null);
  const [pastedFileContents, setPastedFileContents] = useState("");
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [shouldOverwriteExistingSecrets, setShouldOverwriteExistingSecrets] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const existingSecretsByEnvVarName = new Map(
    props.existingSecrets.map((secret) => [secret.envVarName.toLowerCase(), secret]),
  );
  const previewRows = parsedEnvFile?.secretDrafts.map((secretDraft) => {
    const existingSecret = existingSecretsByEnvVarName.get(secretDraft.envVarName.toLowerCase()) ?? null;

    return {
      existingSecret,
      secretDraft,
    };
  }) ?? [];
  const conflictingPreviewRows = previewRows.filter((previewRow) => previewRow.existingSecret !== null);
  const actionableSecretCount = parsedEnvFile === null
    ? 0
    : parsedEnvFile.secretDrafts.length - (shouldOverwriteExistingSecrets ? 0 : conflictingPreviewRows.length);

  useEffect(() => {
    if (!props.isOpen) {
      setDragActive(false);
      setLocalErrorMessage(null);
      setParsedEnvFile(null);
      setPastedFileContents("");
      setSelectedFileName(null);
      setShouldOverwriteExistingSecrets(true);
    }
  }, [props.isOpen]);

  const loadFileContents = (fileContents: string, sourceLabel: string) => {
    setLocalErrorMessage(null);
    setSelectedFileName(sourceLabel);

    try {
      const nextParsedEnvFile = envFileParser.parseFileContents(fileContents);
      setParsedEnvFile(nextParsedEnvFile);

      if (nextParsedEnvFile.secretDrafts.length === 0 && nextParsedEnvFile.rejectedEntries.length === 0) {
        setLocalErrorMessage("No environment variables were found in this file.");
        return;
      }

      if (nextParsedEnvFile.secretDrafts.length === 0) {
        setLocalErrorMessage("No importable environment variables were found in this file.");
      }
    } catch (error) {
      setParsedEnvFile(null);
      setLocalErrorMessage(error instanceof Error ? error.message : "Failed to read the selected file.");
    }
  };

  const loadSelectedFile = async (file: File) => {
    const fileContents = await file.text();
    loadFileContents(fileContents, file.name);
  };

  return (
    <Dialog
      disablePointerDismissal
      onOpenChange={props.onOpenChange}
      open={props.isOpen}
    >
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import secrets from a .env file</DialogTitle>
          <DialogDescription>
            Choose a file from disk or drop one into this modal. Parsing stays in the browser, then
            matching environment variables can be overwritten or skipped.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <input
            ref={fileInputRef}
            accept=".env,text/plain"
            className="hidden"
            onChange={async (event) => {
              const selectedFile = event.target.files?.[0];
              event.target.value = "";

              if (!selectedFile) {
                return;
              }

              await loadSelectedFile(selectedFile);
            }}
            type="file"
          />

          <div
            className={cn(
              "grid gap-3 rounded-xl border border-dashed px-4 py-5 transition-colors",
              isDragActive ? "border-primary bg-primary/5" : "border-border/60 bg-muted/15",
            )}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={(event) => {
              const relatedTarget = event.relatedTarget;
              if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) {
                return;
              }

              setDragActive(false);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDrop={async (event) => {
              event.preventDefault();
              setDragActive(false);

              const droppedFile = event.dataTransfer.files?.[0];
              if (!droppedFile) {
                return;
              }

              await loadSelectedFile(droppedFile);
            }}
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/80">
                <UploadIcon className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {selectedFileName ?? "Drop a .env file here"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Drag and drop a file into this panel, or pick one directly from disk.
                </p>
                <p className="text-xs text-muted-foreground">
                  macOS hides dotfiles in the picker by default. Use drag and drop, press Cmd+Shift+. in
                  the picker, or paste the file contents below.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => {
                  fileInputRef.current?.click();
                }}
                type="button"
                variant="outline"
              >
                Choose file
              </Button>
              {selectedFileName ? (
                <span className="text-xs text-muted-foreground">Loaded {selectedFileName}</span>
              ) : null}
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-medium text-foreground" htmlFor="secret-env-paste">
                Paste .env contents
              </label>
              <Button
                disabled={!pastedFileContents.trim()}
                onClick={() => {
                  loadFileContents(pastedFileContents, "Pasted contents");
                }}
                type="button"
                variant="outline"
              >
                Parse pasted text
              </Button>
            </div>
            <textarea
              id="secret-env-paste"
              onChange={(event) => {
                setPastedFileContents(event.target.value);
              }}
              placeholder={`OPENAI_API_KEY=sk-...\nPRIVATE_KEY="-----BEGIN KEY-----\n...\n-----END KEY-----"`}
              value={pastedFileContents}
              className={cn(
                "min-h-32 w-full rounded-md border border-input bg-input/20 px-3 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
              )}
            />
          </div>

          {parsedEnvFile ? (
            <div className="grid gap-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{parsedEnvFile.secretDrafts.length} parsed</Badge>
                <Badge variant="positive">
                  {previewRows.length - conflictingPreviewRows.length} new
                </Badge>
                <Badge variant="warning">{conflictingPreviewRows.length} existing</Badge>
                {parsedEnvFile.rejectedEntries.length > 0 ? (
                  <Badge variant="destructive">{parsedEnvFile.rejectedEntries.length} rejected</Badge>
                ) : null}
              </div>

              {conflictingPreviewRows.length > 0 ? (
                <label className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-3">
                  <input
                    checked={shouldOverwriteExistingSecrets}
                    className="mt-0.5 size-4 rounded border border-input bg-background"
                    onChange={(event) => {
                      setShouldOverwriteExistingSecrets(event.target.checked);
                    }}
                    type="checkbox"
                  />
                  <div className="grid gap-1">
                    <span className="text-xs font-medium text-foreground">
                      Overwrite matching secrets
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Checked by default. Matching env vars keep their current name and description,
                      but the stored secret value is replaced. Uncheck to skip those entries instead.
                    </span>
                  </div>
                </label>
              ) : null}

              <div className="grid gap-2">
                <p className="text-xs font-medium text-foreground">Preview</p>
                <div className="max-h-64 overflow-y-auto rounded-xl border border-border/60">
                  <div className="grid divide-y divide-border/50">
                    {previewRows.map((previewRow) => (
                      <div
                        className="flex items-start justify-between gap-3 px-3 py-3"
                        key={previewRow.secretDraft.envVarName}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {previewRow.secretDraft.envVarName}
                          </p>
                          {previewRow.secretDraft.sourceEnvVarName !== previewRow.secretDraft.envVarName ? (
                            <p className="text-xs text-muted-foreground">
                              Imported from {previewRow.secretDraft.sourceEnvVarName}
                            </p>
                          ) : null}
                          {previewRow.existingSecret ? (
                            <p className="text-xs text-muted-foreground">
                              Matches existing secret {previewRow.existingSecret.name}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              New secret will be created.
                            </p>
                          )}
                        </div>
                        <Badge
                          variant={previewRow.existingSecret === null
                            ? "positive"
                            : shouldOverwriteExistingSecrets
                              ? "warning"
                              : "outline"}
                        >
                          {previewRow.existingSecret === null
                            ? "Create"
                            : shouldOverwriteExistingSecrets
                              ? "Overwrite"
                              : "Skip"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {parsedEnvFile.rejectedEntries.length > 0 ? (
                <div className="grid gap-2">
                  <p className="text-xs font-medium text-foreground">Rejected entries</p>
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-3">
                    <div className="grid gap-2">
                      {parsedEnvFile.rejectedEntries.map((rejectedEntry) => (
                        <div
                          className="flex items-start justify-between gap-3 text-xs"
                          key={rejectedEntry.sourceEnvVarName}
                        >
                          <span className="font-medium text-foreground">
                            {rejectedEntry.sourceEnvVarName}
                          </span>
                          <span className="text-right text-muted-foreground">
                            {rejectedEntry.reason}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {localErrorMessage || props.errorMessage ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {localErrorMessage || props.errorMessage}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            onClick={() => {
              props.onOpenChange(false);
            }}
            type="button"
            variant="ghost"
          >
            Cancel
          </Button>
          <Button
            disabled={props.isSaving || actionableSecretCount === 0}
            onClick={async () => {
              if (!parsedEnvFile) {
                return;
              }

              setLocalErrorMessage(null);

              try {
                await props.onImport({
                  secretDrafts: parsedEnvFile.secretDrafts,
                  shouldOverwriteExistingSecrets,
                });
              } catch (error) {
                setLocalErrorMessage(error instanceof Error ? error.message : "Failed to import secrets.");
              }
            }}
            type="button"
          >
            Import {actionableSecretCount} secret{actionableSecretCount === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
