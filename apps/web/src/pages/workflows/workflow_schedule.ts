export type WorkflowScheduleMode = "hourly" | "daily" | "weekly" | "monthly" | "advanced";

export type WorkflowScheduleDraft = {
  cronPattern: string;
  dayOfMonth: number;
  hour: number;
  minute: number;
  mode: WorkflowScheduleMode;
  weekdays: string[];
};

export type WorkflowScheduleWeekday = {
  label: string;
  shortLabel: string;
  value: string;
};

const weekdayCatalog: WorkflowScheduleWeekday[] = [
  { label: "Monday", shortLabel: "Mon", value: "1" },
  { label: "Tuesday", shortLabel: "Tue", value: "2" },
  { label: "Wednesday", shortLabel: "Wed", value: "3" },
  { label: "Thursday", shortLabel: "Thu", value: "4" },
  { label: "Friday", shortLabel: "Fri", value: "5" },
  { label: "Saturday", shortLabel: "Sat", value: "6" },
  { label: "Sunday", shortLabel: "Sun", value: "0" },
];

const timezoneCatalog = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Toronto",
  "America/Vancouver",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "UTC",
];

/**
 * Translates between the cron string persisted by the API and the schedule concepts people edit in
 * the workflow UI. Unsupported expressions deliberately remain editable through advanced mode.
 */
export class WorkflowSchedule {
  static getTimezones(): string[] {
    return timezoneCatalog;
  }

  static getWeekdays(): WorkflowScheduleWeekday[] {
    return weekdayCatalog;
  }

  static createDefaultCronPattern(): string {
    return "0 9 * * 1-5";
  }

  static createDefaultDraft(): WorkflowScheduleDraft {
    return {
      cronPattern: this.createDefaultCronPattern(),
      dayOfMonth: 1,
      hour: 9,
      minute: 0,
      mode: "weekly",
      weekdays: ["1", "2", "3", "4", "5"],
    };
  }

  static fromCronPattern(cronPattern: string): WorkflowScheduleDraft {
    const trimmedPattern = cronPattern.trim();
    const fields = trimmedPattern.split(/\s+/u);
    if (fields.length !== 5) {
      return this.createAdvancedDraft(trimmedPattern);
    }

    const [minuteField, hourField, dayOfMonthField, monthField, weekdayField] = fields;
    const minute = this.parseCronNumber(minuteField, 0, 59);
    const hour = this.parseCronNumber(hourField, 0, 23);
    if (minute === null) {
      return this.createAdvancedDraft(trimmedPattern);
    }

    if (hourField === "*" && dayOfMonthField === "*" && monthField === "*" && weekdayField === "*") {
      return {
        ...this.createDefaultDraft(),
        cronPattern: trimmedPattern,
        minute,
        mode: "hourly",
      };
    }

    if (hour === null || monthField !== "*") {
      return this.createAdvancedDraft(trimmedPattern);
    }

    if (dayOfMonthField === "*" && weekdayField === "*") {
      return {
        ...this.createDefaultDraft(),
        cronPattern: trimmedPattern,
        hour,
        minute,
        mode: "daily",
      };
    }

    if (dayOfMonthField === "*" && weekdayField !== "*") {
      const weekdays = this.parseWeekdayField(weekdayField);
      if (!weekdays.length) {
        return this.createAdvancedDraft(trimmedPattern);
      }

      return {
        ...this.createDefaultDraft(),
        cronPattern: trimmedPattern,
        hour,
        minute,
        mode: "weekly",
        weekdays,
      };
    }

    if (weekdayField === "*") {
      const dayOfMonth = this.parseCronNumber(dayOfMonthField, 1, 31);
      if (dayOfMonth === null) {
        return this.createAdvancedDraft(trimmedPattern);
      }

      return {
        ...this.createDefaultDraft(),
        cronPattern: trimmedPattern,
        dayOfMonth,
        hour,
        minute,
        mode: "monthly",
      };
    }

    return this.createAdvancedDraft(trimmedPattern);
  }

  static toCronPattern(draft: WorkflowScheduleDraft): string {
    if (draft.mode === "advanced") {
      return draft.cronPattern.trim();
    }

    const minute = this.clampInteger(draft.minute, 0, 59);
    if (draft.mode === "hourly") {
      return `${minute} * * * *`;
    }

    const hour = this.clampInteger(draft.hour, 0, 23);
    if (draft.mode === "daily") {
      return `${minute} ${hour} * * *`;
    }

    if (draft.mode === "weekly") {
      return `${minute} ${hour} * * ${this.formatWeekdayField(draft.weekdays)}`;
    }

    return `${minute} ${hour} ${this.clampInteger(draft.dayOfMonth, 1, 31)} * *`;
  }

  static formatSummary(cronPattern: string, timezone: string): string {
    const draft = this.fromCronPattern(cronPattern);
    const timezoneLabel = timezone.trim() || "UTC";

    if (draft.mode === "hourly") {
      return `Runs hourly at minute ${this.formatPaddedNumber(draft.minute)} ${timezoneLabel}`;
    }

    if (draft.mode === "daily") {
      return `Runs daily at ${this.formatTime(draft.hour, draft.minute)} ${timezoneLabel}`;
    }

    if (draft.mode === "weekly") {
      return `Runs ${this.formatWeekdaySummary(draft.weekdays)} at ${this.formatTime(draft.hour, draft.minute)} ${timezoneLabel}`;
    }

    if (draft.mode === "monthly") {
      return `Runs monthly on day ${draft.dayOfMonth} at ${this.formatTime(draft.hour, draft.minute)} ${timezoneLabel}`;
    }

    return `Runs on custom cron ${draft.cronPattern || "not set"} ${timezoneLabel}`;
  }

  static setDraftMode(draft: WorkflowScheduleDraft, mode: WorkflowScheduleMode): WorkflowScheduleDraft {
    if (mode === "advanced") {
      return {
        ...draft,
        cronPattern: this.toCronPattern(draft),
        mode,
      };
    }

    const nextDraft = {
      ...this.createDefaultDraft(),
      dayOfMonth: draft.dayOfMonth,
      hour: draft.hour,
      minute: draft.minute,
      mode,
      weekdays: draft.weekdays.length ? draft.weekdays : this.createDefaultDraft().weekdays,
    };

    return {
      ...nextDraft,
      cronPattern: this.toCronPattern(nextDraft),
    };
  }

  private static createAdvancedDraft(cronPattern: string): WorkflowScheduleDraft {
    return {
      ...this.createDefaultDraft(),
      cronPattern,
      mode: "advanced",
    };
  }

  private static clampInteger(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) {
      return min;
    }

    return Math.min(Math.max(Math.trunc(value), min), max);
  }

  private static parseCronNumber(value: string, min: number, max: number): number | null {
    if (!/^\d+$/u.test(value)) {
      return null;
    }

    const parsedValue = Number.parseInt(value, 10);
    if (parsedValue < min || parsedValue > max) {
      return null;
    }

    return parsedValue;
  }

  private static parseWeekdayField(value: string): string[] {
    const weekdays = new Set<string>();
    for (const part of value.split(",")) {
      const rangeParts = part.split("-");
      if (rangeParts.length === 1) {
        if (!this.addWeekdayValue(weekdays, rangeParts[0])) {
          return [];
        }
        continue;
      }

      if (rangeParts.length !== 2) {
        return [];
      }

      const start = this.parseCronNumber(rangeParts[0], 0, 7);
      const end = this.parseCronNumber(rangeParts[1], 0, 7);
      if (start === null || end === null || start > end) {
        return [];
      }

      for (let weekday = start; weekday <= end; weekday += 1) {
        if (!this.addWeekdayValue(weekdays, String(weekday))) {
          return [];
        }
      }
    }

    return weekdayCatalog
      .map((weekday) => weekday.value)
      .filter((weekday) => weekdays.has(weekday));
  }

  private static addWeekdayValue(weekdays: Set<string>, value: string): boolean {
    const normalizedValue = value === "7" ? "0" : value;
    if (!weekdayCatalog.some((weekday) => weekday.value === normalizedValue)) {
      return false;
    }

    weekdays.add(normalizedValue);
    return true;
  }

  private static formatWeekdayField(weekdays: string[]): string {
    const orderedValues = weekdayCatalog
      .map((weekday) => weekday.value)
      .filter((weekday) => weekdays.includes(weekday));

    if (!orderedValues.length) {
      return "1-5";
    }

    const numericValues = orderedValues
      .map((weekday) => Number.parseInt(weekday, 10))
      .sort((left, right) => left - right);
    const ranges: string[] = [];
    let rangeStart = numericValues[0];
    let previousValue = numericValues[0];

    for (const value of numericValues.slice(1)) {
      if (value === previousValue + 1) {
        previousValue = value;
        continue;
      }

      ranges.push(this.formatRange(rangeStart, previousValue));
      rangeStart = value;
      previousValue = value;
    }

    ranges.push(this.formatRange(rangeStart, previousValue));
    return ranges.join(",");
  }

  private static formatRange(start: number, end: number): string {
    return start === end ? String(start) : `${start}-${end}`;
  }

  private static formatWeekdaySummary(weekdays: string[]): string {
    const labels = weekdayCatalog
      .filter((weekday) => weekdays.includes(weekday.value))
      .map((weekday) => weekday.shortLabel);

    if (labels.join(",") === "Mon,Tue,Wed,Thu,Fri") {
      return "every weekday";
    }

    if (labels.length === 7) {
      return "every day";
    }

    return labels.join(", ");
  }

  private static formatTime(hour: number, minute: number): string {
    return `${this.formatPaddedNumber(hour)}:${this.formatPaddedNumber(minute)}`;
  }

  private static formatPaddedNumber(value: number): string {
    return String(value).padStart(2, "0");
  }
}
