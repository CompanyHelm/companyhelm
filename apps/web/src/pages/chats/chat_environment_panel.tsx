import { ChevronRightIcon, Loader2Icon, XIcon } from "lucide-react";
import { EditableField } from "@/components/editable_field";
import { EnvironmentActions } from "@/components/environment_actions";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { ChatComposerModelOption } from "./chat_composer_model_picker";
import type { AgentRecord, SessionEnvironmentInfoRecord, SessionRecord } from "./chats_page_data";
import { formatComputeProviderLabel } from "./chats_page_helpers";

export function ChatEnvironmentPanel({
  isMobile,
  isOpen,
  onOpenChange,
  selectedAgent,
  selectedSession,
  sessionEnvironmentInfo,
  sessionEnvironmentErrorMessage,
  isLoadingSessionEnvironment,
  actingSessionEnvironmentId,
  deletingSessionEnvironmentId,
  removingSessionSkillId,
  shouldUseCompactComposerSettings,
  composerModelOptions,
  selectedComposerModelOption,
  composerModelOptionId,
  composerReasoningLevel,
  onComposerModelOptionChange,
  onComposerReasoningLevelChange,
  selectedSessionTitle,
  onUpdateSessionTitle,
  onManageEnvironments,
  onDeleteEnvironment,
  onOpenEnvironmentDesktop,
  onRemoveActiveSkill,
  onStartEnvironment,
  onStopEnvironment,
}: {
  isMobile: boolean;
  isOpen: boolean;
  onOpenChange: (nextOpen: boolean) => void;
  selectedAgent: AgentRecord | null;
  selectedSession: SessionRecord | null;
  sessionEnvironmentInfo: SessionEnvironmentInfoRecord | null;
  sessionEnvironmentErrorMessage: string | null;
  isLoadingSessionEnvironment: boolean;
  actingSessionEnvironmentId: string | null;
  deletingSessionEnvironmentId: string | null;
  removingSessionSkillId: string | null;
  shouldUseCompactComposerSettings: boolean;
  composerModelOptions: ReadonlyArray<ChatComposerModelOption>;
  selectedComposerModelOption: ChatComposerModelOption | null;
  composerModelOptionId: string;
  composerReasoningLevel: string;
  onComposerModelOptionChange: (modelOptionId: string) => void;
  onComposerReasoningLevelChange: (reasoningLevel: string) => void;
  selectedSessionTitle: string;
  onUpdateSessionTitle: (title: string) => Promise<void>;
  onManageEnvironments: () => void;
  onDeleteEnvironment: (environmentId: string, force: boolean) => Promise<void>;
  onOpenEnvironmentDesktop: (environmentId: string) => Promise<void>;
  onRemoveActiveSkill: (skillId: string) => Promise<void>;
  onStartEnvironment: (environmentId: string) => Promise<void>;
  onStopEnvironment: (environmentId: string) => Promise<void>;
}) {
  if (!selectedAgent) {
    return null;
  }

  const currentSessionEnvironment = sessionEnvironmentInfo?.currentEnvironment ?? null;
  const agentDefaultComputeProviderDefinition = sessionEnvironmentInfo?.agentDefaultComputeProviderDefinition ?? null;
  const environmentModelOptions = composerModelOptions.map((modelOption) => ({
    label: `${modelOption.providerLabel} ${modelOption.name}`,
    value: modelOption.id,
  }));
  const environmentReasoningOptions = (selectedComposerModelOption?.reasoningLevels ?? []).map((reasoningOption) => ({
    label: reasoningOption,
    value: reasoningOption,
  }));
  const selectedComposerModelDisplayValue = selectedComposerModelOption
    ? `${selectedComposerModelOption.providerLabel} • ${selectedComposerModelOption.name}`
    : null;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        className={isMobile
          ? "h-auto max-h-[80vh] border-t border-border bg-background"
          : "w-full max-w-md border-l border-border bg-background"}
        side={isMobile ? "bottom" : "right"}
      >
        <SheetHeader className="border-b border-border/60 px-6 py-5">
          <SheetTitle>Chat settings</SheetTitle>
          <SheetDescription>
            Adjust the active chat configuration and review the reusable environment attached to this session.
          </SheetDescription>
        </SheetHeader>

        <div className="no-scrollbar flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-5">
          {sessionEnvironmentErrorMessage ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {sessionEnvironmentErrorMessage}
            </div>
          ) : null}

          {shouldUseCompactComposerSettings ? (
            <section className="grid gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Model
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Mobile keeps the composer compact, so model and reasoning controls live here instead.
                </p>
              </div>

              <EditableField
                displayValue={selectedComposerModelDisplayValue}
                emptyValueLabel="Select model"
                fieldType="select"
                label="Model"
                onSave={async (nextModelOptionId) => {
                  onComposerModelOptionChange(nextModelOptionId);
                }}
                options={environmentModelOptions}
                value={composerModelOptionId}
              />

              {environmentReasoningOptions.length > 0 ? (
                <EditableField
                  emptyValueLabel="Select reasoning"
                  fieldType="select"
                  label="Reasoning level"
                  onSave={async (nextReasoningLevel) => {
                    onComposerReasoningLevelChange(nextReasoningLevel);
                  }}
                  options={environmentReasoningOptions}
                  value={composerReasoningLevel}
                />
              ) : null}
            </section>
          ) : null}

          {selectedSession ? (
            <section className="grid gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Active skills
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  These session-scoped skills are re-injected into the prompt and materialized into the leased environment when needed.
                </p>
              </div>

              {sessionEnvironmentInfo?.activeSkills.length ? (
                <div className="grid gap-2 rounded-xl border border-border/60 bg-card/50 p-3">
                  {sessionEnvironmentInfo.activeSkills.map((skill) => {
                    const isRemovingSkill = removingSessionSkillId === skill.id;

                    return (
                      <div
                        key={skill.id}
                        className="flex items-start justify-between gap-3 rounded-lg border border-border/50 bg-background/70 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{skill.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{skill.description}</p>
                        </div>
                        <Button
                          aria-label={`Remove ${skill.name} from active skills`}
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                          disabled={isRemovingSkill}
                          onClick={() => {
                            void onRemoveActiveSkill(skill.id);
                          }}
                          size="icon-sm"
                          type="button"
                          variant="ghost"
                        >
                          {isRemovingSkill ? <Loader2Icon className="size-4 animate-spin" /> : <XIcon className="size-4" />}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-sm text-muted-foreground">
                  No session-specific skills are active right now.
                </div>
              )}
            </section>
          ) : null}

          {selectedSession ? (
            <section className="grid gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Title
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  The custom title overrides the inferred chat label everywhere in the chats experience.
                </p>
              </div>

              <EditableField
                displayValue={selectedSessionTitle}
                emptyValueLabel="Untitled chat"
                fieldType="text"
                label="Title"
                onSave={async (nextTitle) => {
                  await onUpdateSessionTitle(nextTitle);
                }}
                value={selectedSession.userSetTitle ?? selectedSessionTitle}
              />
            </section>
          ) : null}

          {selectedSession ? (
            <section className="grid gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Current environment
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  This is the reusable environment CompanyHelm would attach to the current session right now.
                </p>
              </div>

              {isLoadingSessionEnvironment ? (
                <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                  <Loader2Icon className="size-4 animate-spin" />
                  Loading environment…
                </div>
              ) : currentSessionEnvironment ? (
                <div className="grid gap-3 rounded-xl border border-border/60 bg-card/50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {currentSessionEnvironment.displayName ?? currentSessionEnvironment.providerEnvironmentId}
                      </p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {currentSessionEnvironment.providerDefinitionName ?? "Unnamed definition"} • {formatComputeProviderLabel({
                          name: currentSessionEnvironment.providerDefinitionName,
                          provider: currentSessionEnvironment.provider,
                        })}
                      </p>
                    </div>
                    <Button
                      className="shrink-0"
                      onClick={onManageEnvironments}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      Manage
                      <ChevronRightIcon className="size-4" />
                    </Button>
                  </div>
                  <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                    <p>Status: {currentSessionEnvironment.status}</p>
                    <p>Platform: {currentSessionEnvironment.platform}</p>
                    <p>CPU: {currentSessionEnvironment.cpuCount}</p>
                    <p>Memory: {currentSessionEnvironment.memoryGb} GB</p>
                    <p>Disk: {currentSessionEnvironment.diskSpaceGb} GB</p>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-3">
                    <p className="text-[11px] text-muted-foreground">
                      Desktop, lifecycle, and cleanup controls for this environment.
                    </p>
                    <EnvironmentActions
                      actingEnvironmentId={actingSessionEnvironmentId}
                      deletingEnvironmentId={deletingSessionEnvironmentId}
                      environment={currentSessionEnvironment}
                      onDelete={onDeleteEnvironment}
                      onOpenDesktop={onOpenEnvironmentDesktop}
                      onStart={onStartEnvironment}
                      onStop={onStopEnvironment}
                      size="icon-sm"
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-sm text-muted-foreground">
                  No reusable environment is currently attached to this session.
                </div>
              )}
            </section>
          ) : null}

          {selectedSession ? (
            <section className="grid gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Agent default
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  This provider definition is used only if CompanyHelm needs to provision a fresh environment.
                </p>
              </div>

              {agentDefaultComputeProviderDefinition ? (
                <div className="rounded-xl border border-border/60 bg-card/50 p-4">
                  <p className="text-sm font-medium text-foreground">{agentDefaultComputeProviderDefinition.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatComputeProviderLabel(agentDefaultComputeProviderDefinition)}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-sm text-muted-foreground">
                  No default compute provider is configured for this agent.
                </div>
              )}
            </section>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
