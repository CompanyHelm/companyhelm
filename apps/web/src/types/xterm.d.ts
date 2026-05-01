declare module "@xterm/xterm" {
  type TerminalDisposable = {
    dispose(): void;
  };

  type TerminalResizeEvent = {
    cols: number;
    rows: number;
  };

  type TerminalOptions = {
    allowProposedApi?: boolean;
    cursorBlink?: boolean;
    fontFamily?: string;
    fontSize?: number;
    lineHeight?: number;
    scrollback?: number;
    theme?: Record<string, string>;
  };

  export class Terminal {
    readonly cols: number;
    readonly rows: number;

    constructor(options?: TerminalOptions);

    dispose(): void;
    focus(): void;
    loadAddon(addon: { dispose?(): void }): void;
    onData(callback: (data: string) => void): TerminalDisposable;
    onResize(callback: (event: TerminalResizeEvent) => void): TerminalDisposable;
    open(element: HTMLElement): void;
    write(data: string): void;
    writeln(data: string): void;
  }
}
