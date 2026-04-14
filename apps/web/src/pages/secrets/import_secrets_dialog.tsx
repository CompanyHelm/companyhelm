import { useEffect, useMemo, useState } from "react";
import { FolderPlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { EnvFileParser, type ParsedEnvFile, type ParsedEnvSecretDraft } from "./env_file_parser";

export type ImportSecretsDialogExistingSecret = {
  envVarName: string;
  id: string;
  name: string;
};

export type ImportSecretsDialogGroupOption = {
  id: string;
  name: string;
};

interface ImportSecretsDialogProps {
  errorMessage: string | null;
  existingSecrets: ImportSecretsDialogExistingSecret[];
  groups: ImportSecretsDialogGroupOption[];
  isOpen: boolean;
  isSaving: boolean;
  onCreateGroup(name: string): Promise<ImportSecretsDialogGroupOption>;
  onImport(input: {
    secretDrafts: ParsedEnvSecretDraft[];
    secretGroupId?: string | null;
    shouldOverwriteExistingSecrets: boolean;
  }): Promise<void>;
  onOpenChange(open: boolean): void;
}

const UNGROUPED_SECRET_GROUP_VALUE = "__ungrouped__";
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
 * keys, and letting users assign new imports into an existing or newly created secret group.
 */
export function ImportSecretsDialog(props: ImportSecretsDialogProps) {
  const [draftSecretGroupName, setDraftSecretGroupName] = useState("");
  const [ephemeralSecretGroup, setEphemeralSecretGroup] = useState<ImportSecretsDialogGroupOption | null>(null);
  const [isCreateGroupFormOpen, setCreateGroupFormOpen] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [localErrorMessage, setLocalErrorMessage] = useState<string | null>(null);
  const [parsedEnvFile, setParsedEnvFile] = useState<ParsedEnvFile | null>(null);
  const [pastedFileContents, setPastedFileContents] = useState("");
  const [secretGroupId, setSecretGroupId] = useState(UNGROUPED_SECRET_GROUP_VALUE);
  const [shouldOverwriteExistingSecrets, setShouldOverwriteExistingSecrets] = useState(true);
  const existingSecretsByEnvVarName = useMemo(() => {
    return new Map(props.existingSecrets.map((secret) => [secret.envVarName.toLowerCase(), secret]));
  }, [props.existingSecrets]);
  const groupOptions = useMemo(() => {
    const nextGroups = ephemeralSecretGroup && !props.groups.some((group) => group.id === ephemeralSecretGroup.id)
      ? [...props.groups, ephemeralSecretGroup]
      : props.groups;
    return [...nextGroups].sort((left, right) => left.name.localeCompare(right.name));
  }, [ephemeralSecretGroup, props.groups]);
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
      setCreateGroupFormOpen(false);
      setDraftSecretGroupName("");
      setEphemeralSecretGroup(null);
      setIsCreatingGroup(false);
      setLocalErrorMessage(null);
      setParsedEnvFile(null);
      setPastedFileContents("");
      setSecretGroupId(UNGROUPED_SECRET_GROUP_VALUE);
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

  async function createSecretGroup() {
    setLocalErrorMessage(null);
    setIsCreatingGroup(true);

    try {
      const createdGroup = await props.onCreateGroup(draftSecretGroupName);
      setDraftSecretGroupName("");
      setEphemeralSecretGroup(createdGroup);
      setSecretGroupId(createdGroup.id);
      setCreateGroupFormOpen(false);
    } catch (error) {
      setLocalErrorMessage(error instanceof Error ? error.message : "Failed to create secret group.");
    } finally {
      setIsCreatingGroup(false);
    }
  }

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
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-medium text-foreground" htmlFor="import-secret-group">
                Group for new secrets
              </label>
              <Button
                onClick={() => {
                  setCreateGroupFormOpen((currentValue) => !currentValue);
                  setLocalErrorMessage(null);
                }}
                size="sm"
                type="button"
                variant="ghost"
              >
                <FolderPlusIcon className="size-4" />
                New group
              </Button>
            </div>
            <Select
              items={[
                {
                  label: "Ungrouped",
                  value: UNGROUPED_SECRET_GROUP_VALUE,
                },
                ...groupOptions.map((group) => ({
                  label: group.name,
                  value: group.id,
                })),
              ]}
              onValueChange={(nextValue) => {
                setSecretGroupId(nextValue ?? UNGROUPED_SECRET_GROUP_VALUE);
              }}
              value={secretGroupId}
            >
              <SelectTrigger id="import-secret-group">
                <SelectValue placeholder="Select a group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNGROUPED_SECRET_GROUP_VALUE}>Ungrouped</SelectItem>
                {groupOptions.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              New secrets created by this import will use the selected group. Existing matching secrets keep
              their current metadata.
            </p>

            {isCreateGroupFormOpen ? (
              <div className="grid gap-3 rounded-xl border border-border/60 bg-card/40 p-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
                <div className="grid gap-2">
                  <label className="text-xs font-medium text-foreground" htmlFor="import-secret-new-group">
                    New group name
                  </label>
                  <Input
                    id="import-secret-new-group"
                    onChange={(event) => {
                      setDraftSecretGroupName(event.target.value);
                    }}
                    placeholder="Deployments"
                    value={draftSecretGroupName}
                  />
                </div>
                <Button
                  onClick={() => {
                    setCreateGroupFormOpen(false);
                    setDraftSecretGroupName("");
                    setLocalErrorMessage(null);
                  }}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  disabled={draftSecretGroupName.length === 0 || isCreatingGroup}
                  onClick={() => {
                    void createSecretGroup();
                  }}
                  type="button"
                >
                  {isCreatingGroup ? "Creating..." : "Create group"}
                </Button>
              </div>
            ) : null}
          </div>

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
                      Checked by default. Matching env vars keep their current name, description, and group,
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
                              New secret will be created{secretGroupId === UNGROUPED_SECRET_GROUP_VALUE
                                ? "."
                                : ` in ${groupOptions.find((group) => group.id === secretGroupId)?.name ?? "the selected group"}.`}
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
                  secretGroupId: secretGroupId === UNGROUPED_SECRET_GROUP_VALUE ? null : secretGroupId,
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
