import { CalendarDaysIcon, ClockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { WorkflowSchedule, type WorkflowScheduleMode } from "./workflow_schedule";

const scheduleModes: Array<{ label: string; value: WorkflowScheduleMode }> = [
  { label: "Hourly", value: "hourly" },
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Custom", value: "advanced" },
];

interface WorkflowScheduleBuilderProps {
  cronPattern: string;
  timezone: string;
  onCronPatternChange(cronPattern: string): void;
  onTimezoneChange(timezone: string): void;
}

function formatTimeInput(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseIntegerInput(value: string, fallback: number): number {
  const parsedValue = Number.parseInt(value, 10);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function parseTimeInput(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{2}):(\d{2})$/u.exec(value);
  if (!match) {
    return null;
  }

  return {
    hour: Number.parseInt(match[1], 10),
    minute: Number.parseInt(match[2], 10),
  };
}

/**
 * Lets operators edit the common scheduling cases in business language while preserving cron as the
 * API boundary. Expressions outside the supported shapes stay available through custom mode.
 */
export function WorkflowScheduleBuilder(props: WorkflowScheduleBuilderProps) {
  const draft = WorkflowSchedule.fromCronPattern(props.cronPattern);
  const weekdays = WorkflowSchedule.getWeekdays();

  function saveDraft(patch: Partial<typeof draft>): void {
    const nextDraft = {
      ...draft,
      ...patch,
    };
    props.onCronPatternChange(WorkflowSchedule.toCronPattern(nextDraft));
  }

  return (
    <div className="grid gap-4 rounded-lg border border-border/60 bg-muted/10 p-3">
      <div className="grid gap-2">
        <label className="text-sm font-medium text-foreground" htmlFor="workflow-trigger-schedule-mode">
          Schedule
        </label>
        <div
          aria-label="Schedule frequency"
          className="grid grid-cols-2 gap-1 rounded-md border border-border/60 bg-background/40 p-1 sm:grid-cols-5"
          id="workflow-trigger-schedule-mode"
          role="radiogroup"
        >
          {scheduleModes.map((mode) => (
            <button
              aria-checked={draft.mode === mode.value}
              className={cn(
                "h-8 rounded-sm px-2 text-xs font-medium text-muted-foreground outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
                draft.mode === mode.value && "bg-primary text-primary-foreground shadow-sm",
                draft.mode !== mode.value && "hover:bg-muted hover:text-foreground",
              )}
              key={mode.value}
              onClick={() => {
                const nextDraft = WorkflowSchedule.setDraftMode(draft, mode.value);
                props.onCronPatternChange(WorkflowSchedule.toCronPattern(nextDraft));
              }}
              role="radio"
              type="button"
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {draft.mode === "advanced" ? (
        <div className="grid gap-2">
          <label className="text-sm font-medium text-foreground" htmlFor="workflow-trigger-cron">
            Cron expression
          </label>
          <div className="flex items-center gap-2">
            <ClockIcon className="size-4 text-muted-foreground" />
            <Input
              id="workflow-trigger-cron"
              onChange={(event) => {
                props.onCronPatternChange(event.target.value);
              }}
              placeholder="0 9 * * 1-5"
              value={props.cronPattern}
            />
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {draft.mode === "hourly" ? (
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="workflow-trigger-minute">
                Minute
              </label>
              <Input
                id="workflow-trigger-minute"
                max={59}
                min={0}
                onChange={(event) => {
                  saveDraft({ minute: parseIntegerInput(event.target.value, draft.minute) });
                }}
                type="number"
                value={draft.minute}
              />
            </div>
          ) : (
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="workflow-trigger-time">
                Time
              </label>
              <Input
                id="workflow-trigger-time"
                onChange={(event) => {
                  const time = parseTimeInput(event.target.value);
                  if (time) {
                    saveDraft(time);
                  }
                }}
                type="time"
                value={formatTimeInput(draft.hour, draft.minute)}
              />
            </div>
          )}

          {draft.mode === "monthly" ? (
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="workflow-trigger-month-day">
                Day of month
              </label>
              <Input
                id="workflow-trigger-month-day"
                max={31}
                min={1}
                onChange={(event) => {
                  saveDraft({ dayOfMonth: parseIntegerInput(event.target.value, draft.dayOfMonth) });
                }}
                type="number"
                value={draft.dayOfMonth}
              />
            </div>
          ) : null}
        </div>
      )}

      {draft.mode === "weekly" ? (
        <div className="grid gap-2">
          <span className="text-sm font-medium text-foreground">Days</span>
          <div className="grid grid-cols-4 gap-1 sm:grid-cols-7">
            {weekdays.map((weekday) => {
              const isSelected = draft.weekdays.includes(weekday.value);

              return (
                <Button
                  aria-pressed={isSelected}
                  key={weekday.value}
                  onClick={() => {
                    if (isSelected && draft.weekdays.length === 1) {
                      return;
                    }

                    const nextWeekdays = isSelected
                      ? draft.weekdays.filter((currentWeekday) => currentWeekday !== weekday.value)
                      : [...draft.weekdays, weekday.value];
                    saveDraft({ weekdays: nextWeekdays });
                  }}
                  title={weekday.label}
                  type="button"
                  variant={isSelected ? "secondary" : "outline"}
                >
                  {weekday.shortLabel}
                </Button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="grid gap-2">
        <label className="text-sm font-medium text-foreground" htmlFor="workflow-trigger-timezone">
          Timezone
        </label>
        <Input
          id="workflow-trigger-timezone"
          list="workflow-trigger-timezone-options"
          onChange={(event) => {
            props.onTimezoneChange(event.target.value);
          }}
          placeholder="America/Los_Angeles"
          value={props.timezone}
        />
        <datalist id="workflow-trigger-timezone-options">
          {WorkflowSchedule.getTimezones().map((timezone) => (
            <option key={timezone} value={timezone} />
          ))}
        </datalist>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-border/60 bg-background/40 px-3 py-2 text-sm text-muted-foreground">
        <CalendarDaysIcon className="mt-0.5 size-4 shrink-0" />
        <span>{WorkflowSchedule.formatSummary(props.cronPattern, props.timezone)}</span>
      </div>
    </div>
  );
}
