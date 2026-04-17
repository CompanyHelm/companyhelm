import "@xterm/xterm/css/xterm.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { graphql, useMutation } from "react-relay";
import { FitAddon } from "@xterm/addon-fit";
import { SearchAddon } from "@xterm/addon-search";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { Terminal } from "@xterm/xterm";
import { ArrowDownIcon, ArrowUpIcon, RotateCwIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { environmentTerminalPageCreateEnvironmentTerminalConnectionMutation } from "./__generated__/environmentTerminalPageCreateEnvironmentTerminalConnectionMutation.graphql";

type TerminalConnectionStatus = "connecting" | "connected" | "disconnected" | "failed";

type EnvironmentTerminalServerMessage = {
  data?: string;
  exitCode?: number | null;
  message?: string;
  terminalSessionId?: string;
  type?: string;
};

const environmentTerminalPageCreateEnvironmentTerminalConnectionMutationNode = graphql`
  mutation environmentTerminalPageCreateEnvironmentTerminalConnectionMutation(
    $input: CreateEnvironmentTerminalConnectionInput!
  ) {
    CreateEnvironmentTerminalConnection(input: $input) {
      environmentId
      terminalSessionId
      websocketUrl
      expiresAt
    }
  }
`;

/**
 * Hosts an operator terminal as a dedicated page so xterm can own keyboard focus, browser resize
 * behavior, and long-running shell output without fighting dialog focus traps or chat layout.
 */
export function EnvironmentTerminalPage() {
  const routeParams = useParams({ strict: false }) as {
    environmentId?: string;
  };
  const environmentId = String(routeParams.environmentId || "").trim();
  const terminalElementRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<TerminalConnectionStatus>("connecting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [terminalSessionId, setTerminalSessionId] = useState<string | null>(null);
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  const [commitCreateTerminalConnection] = useMutation<environmentTerminalPageCreateEnvironmentTerminalConnectionMutation>(
    environmentTerminalPageCreateEnvironmentTerminalConnectionMutationNode,
  );

  const sendResize = useCallback(() => {
    const websocket = websocketRef.current;
    const terminal = terminalRef.current;
    if (!websocket || !terminal || websocket.readyState !== WebSocket.OPEN) {
      return;
    }

    websocket.send(JSON.stringify({
      columns: terminal.cols,
      rows: terminal.rows,
      type: "resize",
    }));
  }, []);

  const reconnect = useCallback(() => {
    setConnectionAttempt((currentAttempt) => currentAttempt + 1);
  }, []);

  useEffect(() => {
    const terminalElement = terminalElementRef.current;
    if (!terminalElement || environmentId.length === 0) {
      return undefined;
    }

    setConnectionStatus("connecting");
    setErrorMessage(null);
    setTerminalSessionId(null);

    const terminal = new Terminal({
      allowProposedApi: true,
      cursorBlink: true,
      fontFamily: "\"SFMono-Regular\", \"Cascadia Code\", \"JetBrains Mono\", Menlo, monospace",
      fontSize: 13,
      lineHeight: 1.12,
      scrollback: 10_000,
      theme: {
        background: "#07090d",
        black: "#111827",
        blue: "#7dd3fc",
        brightBlack: "#4b5563",
        brightBlue: "#bae6fd",
        brightCyan: "#a7f3d0",
        brightGreen: "#bef264",
        brightMagenta: "#f0abfc",
        brightRed: "#fca5a5",
        brightWhite: "#ffffff",
        brightYellow: "#fde68a",
        cursor: "#f8fafc",
        cyan: "#5eead4",
        foreground: "#e5eefb",
        green: "#a3e635",
        magenta: "#e879f9",
        red: "#fb7185",
        selectionBackground: "#334155",
        white: "#e5e7eb",
        yellow: "#facc15",
      },
    });
    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon({
      highlightLimit: 1_000,
    });
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(searchAddon);
    terminal.loadAddon(new WebLinksAddon((_event, uri) => {
      window.open(uri, "_blank", "noopener,noreferrer");
    }));
    terminal.open(terminalElement);
    fitAddon.fit();
    terminal.focus();
    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;
    searchAddonRef.current = searchAddon;
    terminal.writeln("Connecting to CompanyHelm environment terminal...");

    const dataDisposable = terminal.onData((data) => {
      const websocket = websocketRef.current;
      if (!websocket || websocket.readyState !== WebSocket.OPEN) {
        return;
      }

      websocket.send(JSON.stringify({
        data,
        type: "input",
      }));
    });
    const resizeDisposable = terminal.onResize(() => {
      sendResize();
    });
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      sendResize();
    });
    resizeObserver.observe(terminalElement);

    let isDisposed = false;
    commitCreateTerminalConnection({
      variables: {
        input: {
          columns: terminal.cols,
          id: environmentId,
          rows: terminal.rows,
        },
      },
      onCompleted: (response, errors) => {
        if (isDisposed) {
          return;
        }

        const nextErrorMessage = errors?.[0]?.message;
        if (nextErrorMessage) {
          setConnectionStatus("failed");
          setErrorMessage(nextErrorMessage);
          terminal.writeln(`\r\nConnection failed: ${nextErrorMessage}`);
          return;
        }

        const connection = response.CreateEnvironmentTerminalConnection;
        setTerminalSessionId(connection.terminalSessionId);
        const websocket = new WebSocket(connection.websocketUrl);
        websocketRef.current = websocket;
        websocket.addEventListener("open", () => {
          setConnectionStatus("connected");
          sendResize();
        });
        websocket.addEventListener("message", (event) => {
          const serverMessage = JSON.parse(String(event.data)) as EnvironmentTerminalServerMessage;
          if (serverMessage.type === "output") {
            terminal.write(String(serverMessage.data ?? ""));
            return;
          }

          if (serverMessage.type === "ready") {
            setTerminalSessionId(String(serverMessage.terminalSessionId || connection.terminalSessionId));
            return;
          }

          if (serverMessage.type === "error") {
            const message = String(serverMessage.message || "Terminal connection failed.");
            setErrorMessage(message);
            terminal.writeln(`\r\n${message}`);
            return;
          }

          if (serverMessage.type === "exit") {
            setConnectionStatus("disconnected");
            const exitCodeLabel = typeof serverMessage.exitCode === "number"
              ? `exit ${serverMessage.exitCode}`
              : "no exit code";
            terminal.writeln(`\r\nTerminal transport closed (${exitCodeLabel}).`);
          }
        });
        websocket.addEventListener("close", () => {
          if (!isDisposed) {
            setConnectionStatus("disconnected");
            terminal.writeln("\r\nTerminal disconnected. Reconnect to attach to the saved tmux session.");
          }
        });
        websocket.addEventListener("error", () => {
          setConnectionStatus("failed");
          setErrorMessage("Terminal websocket failed.");
        });
      },
      onError: (error) => {
        if (isDisposed) {
          return;
        }

        setConnectionStatus("failed");
        setErrorMessage(error.message);
        terminal.writeln(`\r\nConnection failed: ${error.message}`);
      },
    });

    return () => {
      isDisposed = true;
      dataDisposable.dispose();
      resizeDisposable.dispose();
      resizeObserver.disconnect();
      websocketRef.current?.close();
      websocketRef.current = null;
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
      searchAddonRef.current = null;
    };
  }, [commitCreateTerminalConnection, connectionAttempt, environmentId, sendResize]);

  const runSearch = useCallback((nextSearchQuery: string, direction: "next" | "previous") => {
    setSearchQuery(nextSearchQuery);
    const searchAddon = searchAddonRef.current;
    if (!searchAddon) {
      return;
    }

    if (nextSearchQuery.length === 0) {
      searchAddon.clearDecorations();
      return;
    }

    const options = {
      decorations: {
        activeMatchBackground: "#facc15",
        activeMatchBorder: "#fef08a",
        activeMatchColorOverviewRuler: "#facc15",
        matchBackground: "#475569",
        matchBorder: "#64748b",
        matchOverviewRuler: "#64748b",
      },
      incremental: true,
    };
    if (direction === "previous") {
      searchAddon.findPrevious(nextSearchQuery, options);
      return;
    }

    searchAddon.findNext(nextSearchQuery, options);
  }, []);

  const statusLabel = connectionStatus === "connected"
    ? "Connected"
    : connectionStatus === "connecting"
      ? "Connecting"
      : connectionStatus === "failed"
        ? "Failed"
        : "Disconnected";

  return (
    <main className="flex h-svh min-h-0 flex-col bg-[#07090d] text-slate-100">
      <header className="flex min-h-14 items-center justify-between gap-3 border-b border-slate-800/90 bg-slate-950 px-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-100">Environment terminal</p>
          <p className="truncate text-xs text-slate-400">
            {terminalSessionId ?? environmentId}
          </p>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <div className="hidden min-w-48 items-center gap-2 md:flex">
            <SearchIcon className="size-4 text-slate-500" />
            <Input
              className="h-8 border-slate-700 bg-slate-900 text-xs text-slate-100 placeholder:text-slate-500"
              onChange={(event) => {
                runSearch(event.target.value, "next");
              }}
              placeholder="Search terminal"
              value={searchQuery}
            />
            <Button
              aria-label="Previous search result"
              disabled={searchQuery.length === 0}
              onClick={() => {
                runSearch(searchQuery, "previous");
              }}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <ArrowUpIcon className="size-4" />
            </Button>
            <Button
              aria-label="Next search result"
              disabled={searchQuery.length === 0}
              onClick={() => {
                runSearch(searchQuery, "next");
              }}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <ArrowDownIcon className="size-4" />
            </Button>
          </div>
          <span className="rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-300">
            {statusLabel}
          </span>
          <Button
            disabled={connectionStatus === "connecting"}
            onClick={reconnect}
            size="sm"
            type="button"
            variant="outline"
          >
            <RotateCwIcon className="size-4" />
            Reconnect
          </Button>
        </div>
      </header>
      {errorMessage ? (
        <div className="border-b border-rose-500/30 bg-rose-950/70 px-3 py-2 text-xs text-rose-100">
          {errorMessage}
        </div>
      ) : null}
      <div ref={terminalElementRef} className="min-h-0 flex-1 overflow-hidden p-2" />
    </main>
  );
}
