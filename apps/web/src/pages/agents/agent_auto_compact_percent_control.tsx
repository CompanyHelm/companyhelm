import { useId } from "react";
import { AgentAutoCompactPresenter } from "./agent_auto_compact_presenter";

type AgentAutoCompactPercentControlProps = {
  autoCompactPercent: number;
  disabled?: boolean;
  onChange(nextAutoCompactPercent: number): void;
  onCommit?(nextAutoCompactPercent: number): void;
};

/**
 * Renders the shared auto-compaction slider used by the create and edit agent flows.
 */
export function AgentAutoCompactPercentControl(props: AgentAutoCompactPercentControlProps) {
  const inputId = useId();

  function commitValue(nextAutoCompactPercent: number) {
    props.onCommit?.(AgentAutoCompactPresenter.normalizePercent(nextAutoCompactPercent));
  }

  return (
    <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/10 p-4">
      <div className="grid gap-1">
        <label className="text-sm font-medium text-foreground" htmlFor={inputId}>
          Auto compact %
        </label>
        <p className="text-sm text-muted-foreground">
          Start auto-compacting when the session reaches about <span className="font-semibold text-foreground">{props.autoCompactPercent}%</span> of the active model context window.
        </p>
      </div>

      <input
        id={inputId}
        className="h-2 w-full cursor-pointer accent-foreground"
        disabled={props.disabled}
        max={100}
        min={1}
        onBlur={(event) => {
          commitValue(Number(event.currentTarget.value));
        }}
        onChange={(event) => {
          props.onChange(AgentAutoCompactPresenter.normalizePercent(Number(event.currentTarget.value)));
        }}
        onKeyUp={(event) => {
          commitValue(Number(event.currentTarget.value));
        }}
        onPointerUp={(event) => {
          commitValue(Number(event.currentTarget.value));
        }}
        type="range"
        value={props.autoCompactPercent}
      />

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>1%</span>
        <span>{props.autoCompactPercent}%</span>
        <span>100%</span>
      </div>
    </div>
  );
}
