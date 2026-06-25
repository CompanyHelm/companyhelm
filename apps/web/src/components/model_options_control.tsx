import { ChevronDownIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ModelOptionValue = string | number | boolean | null;

export type ModelOptionChoice = {
  name: string;
  value: ModelOptionValue;
  description?: string | null;
};

export type ModelOptionDefinition = {
  key: string;
  name: string;
  description: string;
  type: "select" | "number" | "text" | "boolean";
  category: string;
  defaultValue?: ModelOptionValue;
  options?: readonly ModelOptionChoice[] | null;
};

export type ModelOptionValues = Record<string, ModelOptionValue>;

export function normalizeModelOptionDefinitions(rawDefinitions: unknown): ModelOptionDefinition[] {
  if (!Array.isArray(rawDefinitions)) {
    return [];
  }

  return rawDefinitions.filter((definition): definition is ModelOptionDefinition => {
    return typeof definition === "object"
      && definition !== null
      && typeof (definition as { key?: unknown }).key === "string"
      && typeof (definition as { name?: unknown }).name === "string"
      && typeof (definition as { type?: unknown }).type === "string";
  });
}

export function normalizeModelOptionValues(rawValues: unknown): ModelOptionValues {
  if (!rawValues || typeof rawValues !== "object" || Array.isArray(rawValues)) {
    return {};
  }

  return rawValues as ModelOptionValues;
}

export function ModelOptionsControl(props: {
  className?: string;
  compact?: boolean;
  definitions: readonly ModelOptionDefinition[];
  onChange(values: ModelOptionValues): void;
  values: ModelOptionValues;
}) {
  const selectDefinitions = props.definitions.filter((definition) => {
    return definition.type === "select" && (definition.options?.length ?? 0) > 0;
  });
  if (selectDefinitions.length === 0) {
    return null;
  }

  return (
    <div className={props.className ?? (props.compact ? "flex flex-wrap items-center gap-1.5" : "grid gap-3")}>
      {selectDefinitions.map((definition) => {
        const selectedValue = Object.prototype.hasOwnProperty.call(props.values, definition.key)
          ? props.values[definition.key]
          : definition.defaultValue ?? null;
        const encodedSelectedValue = encodeModelOptionValue(selectedValue);
        const triggerClassName = props.compact
          ? "h-7 w-auto rounded-full border-0 bg-background/60 px-2.5 text-xs text-muted-foreground shadow-none focus-visible:ring-1 focus-visible:ring-ring/30"
          : undefined;

        return (
          <div key={definition.key} className={props.compact ? "" : "grid gap-2"}>
            {!props.compact ? (
              <label className="text-xs font-medium text-foreground" htmlFor={`model-option-${definition.key}`}>
                {definition.name}
              </label>
            ) : null}
            <Select
              items={(definition.options ?? []).map((option) => ({
                label: option.name,
                value: encodeModelOptionValue(option.value),
              }))}
              onValueChange={(encodedValue) => {
                props.onChange({
                  ...props.values,
                  [definition.key]: decodeModelOptionValue(encodedValue ?? "null"),
                });
              }}
              value={encodedSelectedValue}
            >
              <SelectTrigger
                className={triggerClassName}
                icon={props.compact ? <ChevronDownIcon className="size-3.5" /> : undefined}
                id={`model-option-${definition.key}`}
              >
                <SelectValue placeholder={definition.name} />
              </SelectTrigger>
              <SelectContent>
                {(definition.options ?? []).map((option) => (
                  <SelectItem key={encodeModelOptionValue(option.value)} value={encodeModelOptionValue(option.value)}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!props.compact ? (
              <p className="text-xs text-muted-foreground">{definition.description}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function encodeModelOptionValue(value: ModelOptionValue | undefined): string {
  return JSON.stringify(value ?? null);
}

function decodeModelOptionValue(value: string): ModelOptionValue {
  const parsedValue = JSON.parse(value) as unknown;
  if (
    typeof parsedValue === "string"
    || typeof parsedValue === "number"
    || typeof parsedValue === "boolean"
    || parsedValue === null
  ) {
    return parsedValue;
  }

  return null;
}
