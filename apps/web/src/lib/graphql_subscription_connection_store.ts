export type GraphqlSubscriptionConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting";

type GraphqlSubscriptionConnectionListener = () => void;

/**
 * Tracks the browser subscription transport lifecycle in app-level terms so screens can react to
 * transient reconnects without coupling themselves to websocket protocol details.
 */
export class GraphqlSubscriptionConnectionStore {
  private activeOperationCount = 0;
  private hasConnected = false;
  private listeners = new Set<GraphqlSubscriptionConnectionListener>();
  private activeSocket: unknown = null;
  private status: GraphqlSubscriptionConnectionStatus = "idle";

  getSnapshot(): GraphqlSubscriptionConnectionStatus {
    return this.status;
  }

  subscribe(listener: GraphqlSubscriptionConnectionListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  beginOperation(): void {
    this.activeOperationCount += 1;
    if (this.activeOperationCount === 1) {
      this.setStatus(this.hasConnected ? "reconnecting" : "connecting");
    }
  }

  endOperation(): void {
    this.activeOperationCount = Math.max(0, this.activeOperationCount - 1);
    if (this.activeOperationCount === 0) {
      this.setStatus("idle");
    }
  }

  handleConnecting(isRetry: boolean): void {
    if (this.activeOperationCount === 0) {
      this.setStatus("idle");
      return;
    }

    this.setStatus(isRetry || this.hasConnected ? "reconnecting" : "connecting");
  }

  handleOpened(socket: unknown): void {
    this.activeSocket = socket;
  }

  handleConnected(socket: unknown): void {
    this.activeSocket = socket;
    this.hasConnected = true;
    this.setStatus(this.activeOperationCount > 0 ? "connected" : "idle");
  }

  handleConnectionClosed(event: unknown): void {
    if (!this.isCurrentSocketEvent(event)) {
      return;
    }

    this.activeSocket = null;
    if (this.activeOperationCount === 0) {
      this.setStatus("idle");
      return;
    }

    this.setStatus(this.hasConnected ? "reconnecting" : "connecting");
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private isCurrentSocketEvent(event: unknown): boolean {
    if (!this.activeSocket) {
      return true;
    }

    if (typeof event !== "object" || event === null) {
      return true;
    }

    const eventTarget = (event as { currentTarget?: unknown; target?: unknown }).currentTarget
      ?? (event as { target?: unknown }).target;
    if (!eventTarget) {
      return true;
    }

    return eventTarget === this.activeSocket;
  }

  private setStatus(nextStatus: GraphqlSubscriptionConnectionStatus): void {
    if (this.status === nextStatus) {
      return;
    }

    this.status = nextStatus;
    this.emit();
  }
}
