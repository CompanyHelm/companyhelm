import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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

function resolveParsedEnvFileState(fileContents: string): {
  errorMessage: string | null;
  parsedEnvFile: ParsedEnvFile | null;
} {
  const nextParsedEnvFile = envFileParser.parseFileContents(fileContents);

  if (nextParsedEnvFile.secretDrafts.length === 0 && nextParsedEnvFile.rejectedEntries.length === 0) {
    return {
      errorMessage: "No environment variables were found in this file.",
      parsedEnvFile: nextParsedEnvFile,
    };
  }

  if (nextParsedEnvFile.secretDrafts.length === 0) {
    return {
      errorMessage: "No importable environment variables were found in this file.",
      parsedEnvFile: nextParsedEnvFile,
    };
  }

  return {
    errorMessage: null,
    parsedEnvFile: nextParsedEnvFile,
  };
}

/**
 * Handles browser-side `.env` imports by parsing pasted file contents, previewing the resolved
 * keys, and letting users decide whether matching environment variables should overwrite secrets.
 */
export function ImportSecretsDialog(props: ImportSecretsDialogProps) {
  const [localErrorMessage, setLocalErrorMessage] = useState<string | null>(null);
  const [parsedEnvFile, setParsedEnvFile] = useState<ParsedEnvFile | null>(null);
  const [pastedFileContents, setPastedFileContents] = useState("");
  const [shouldOverwriteExistingSecrets, setShouldOverwriteExistingSecrets] = useState(true);
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
      setLocalErrorMessage(null);
      setParsedEnvFile(null);
      setPastedFileContents("");
      setShouldOverwriteExistingSecrets(true);
    }
  }, [props.isOpen]);

  useEffect(() => {
    if (!props.isOpen) {
      return;
    }

    if (pastedFileContents.trim().length === 0) {
      setLocalErrorMessage(null);
      setParsedEnvFile(null);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      try {
        const nextState = resolveParsedEnvFileState(pastedFileContents);
        setLocalErrorMessage(nextState.errorMessage);
        setParsedEnvFile(nextState.parsedEnvFile);
      } catch (error) {
        setLocalErrorMessage(error instanceof Error ? error.message : "Failed to parse the pasted contents.");
        setParsedEnvFile(null);
      }
    }, 500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [pastedFileContents, props.isOpen]);

  return (
    <Dialog
      disablePointerDismissal
      onOpenChange={props.onOpenChange}
      open={props.isOpen}
    >
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import secrets from a .env file</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
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
            data-primary-cta=""
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
