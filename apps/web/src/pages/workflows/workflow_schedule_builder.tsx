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
];

interface WorkflowScheduleBuilderProps {
  cronPattern: string;
  timezone: string;
  onCronPatternChange(cronPattern: string): void;
}

function formatMinute(value: number): string {
  return String(value).padStart(2, "0");
}

function parseIntegerInput(value: string, fallback: number): number {
  const parsedValue = Number.parseInt(value, 10);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function toDisplayHour(hour: number): number {
  const displayHour = hour % 12;
  return displayHour === 0 ? 12 : displayHour;
}

function toPeriod(hour: number): "AM" | "PM" {
  return hour < 12 ? "AM" : "PM";
}

function toCronHour(displayHour: number, period: "AM" | "PM"): number {
  const boundedHour = Math.min(Math.max(Math.trunc(displayHour), 1), 12);
  if (period === "AM") {
    return boundedHour === 12 ? 0 : boundedHour;
  }

  return boundedHour === 12 ? 12 : boundedHour + 12;
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

  function saveTime(displayHour: number, minute: number, period: "AM" | "PM"): void {
    saveDraft({
      hour: toCronHour(displayHour, period),
      minute,
    });
  }

  return (
    <div className="grid gap-4 rounded-lg border border-border/60 bg-muted/10 p-3">
      <div className="grid gap-2">
        <label className="text-sm font-medium text-foreground" htmlFor="workflow-trigger-schedule-mode">
          Schedule
        </label>
        <div
          aria-label="Schedule frequency"
          className="grid grid-cols-2 gap-1 rounded-md border border-border/60 bg-background/40 p-1 sm:grid-cols-4"
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
        <div className="flex items-start gap-2 rounded-md border border-border/60 bg-background/40 px-3 py-2 text-sm text-muted-foreground">
          <ClockIcon className="mt-0.5 size-4 shrink-0" />
          <span>Choose a frequency above to replace this saved custom schedule.</span>
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
              <span className="text-sm font-medium text-foreground">
                Time
              </span>
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
                <div className="grid gap-1">
                  <label className="sr-only" htmlFor="workflow-trigger-hour">
                    Hour
                  </label>
                  <Input
                    aria-label="Hour"
                    id="workflow-trigger-hour"
                    max={12}
                    min={1}
                    onChange={(event) => {
                      saveTime(parseIntegerInput(event.target.value, toDisplayHour(draft.hour)), draft.minute, toPeriod(draft.hour));
                    }}
                    type="number"
                    value={toDisplayHour(draft.hour)}
                  />
                </div>
                <div className="grid gap-1">
                  <label className="sr-only" htmlFor="workflow-trigger-minute-at-time">
                    Minute
                  </label>
                  <Input
                    aria-label="Minute"
                    id="workflow-trigger-minute-at-time"
                    max={59}
                    min={0}
                    onChange={(event) => {
                      saveTime(toDisplayHour(draft.hour), parseIntegerInput(event.target.value, draft.minute), toPeriod(draft.hour));
                    }}
                    type="number"
                    value={formatMinute(draft.minute)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-1 rounded-md border border-border/60 bg-background/40 p-0.5">
                  {(["AM", "PM"] as const).map((period) => (
                    <button
                      aria-pressed={toPeriod(draft.hour) === period}
                      className={cn(
                        "h-6 rounded-sm px-2 text-xs font-medium text-muted-foreground outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
                        toPeriod(draft.hour) === period && "bg-primary text-primary-foreground shadow-sm",
                        toPeriod(draft.hour) !== period && "hover:bg-muted hover:text-foreground",
                      )}
                      key={period}
                      onClick={() => {
                        saveTime(toDisplayHour(draft.hour), draft.minute, period);
                      }}
                      type="button"
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>
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
                  variant={isSelected ? "default" : "outline"}
                >
                  {weekday.shortLabel}
                </Button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="flex items-start gap-2 rounded-md border border-border/60 bg-background/40 px-3 py-2 text-sm text-muted-foreground">
        <CalendarDaysIcon className="mt-0.5 size-4 shrink-0" />
        <span>{WorkflowSchedule.formatSummary(props.cronPattern, props.timezone)}</span>
      </div>
    </div>
  );
}
