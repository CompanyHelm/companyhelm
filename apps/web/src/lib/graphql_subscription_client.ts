import { Observable } from "relay-runtime";

type GetToken = () => Promise<string | null>;

type GraphqlOperationParameters = {
  name: string;
  text: string | null | undefined;
};

type GraphqlOperationObserver = {
  complete: () => void;
  error: (error: Error) => void;
  next: (payload: unknown) => void;
};

type GraphqlTransportMessage = {
  id?: string;
  payload?: unknown;
  type: string;
};

/**
 * Owns the single GraphQL websocket used by Relay subscriptions in the browser. It multiplexes all
 * active subscription operations over one socket and closes the connection again when the page no
 * longer has any active subscription work.
 */
export class GraphqlSubscriptionClient {
  private readonly graphqlUrl: string;
  private readonly getToken: GetToken;
  private activeObservers = new Map<string, GraphqlOperationObserver>();
  private connectPromise: Promise<WebSocket> | null = null;
  private nextOperationId = 0;
  private socket: WebSocket | null = null;

  constructor(graphqlUrl: string, getToken: GetToken) {
    this.graphqlUrl = graphqlUrl;
    this.getToken = getToken;
  }

  subscribe(parameters: GraphqlOperationParameters, variables: unknown) {
    return Observable.create((sink) => {
      let operationId: string | null = null;
      let isDisposed = false;

      void this.ensureConnection().then((socket) => {
        if (isDisposed) {
          return;
        }
        if (!parameters.text) {
          throw new Error("Missing GraphQL operation text.");
        }

        operationId = String(this.nextOperationId + 1);
        this.nextOperationId += 1;
        this.activeObservers.set(operationId, {
          complete: () => sink.complete(),
          error: (error) => sink.error(error),
          next: (payload) => sink.next(payload),
        });

        socket.send(JSON.stringify({
          id: operationId,
          payload: {
            operationName: parameters.name,
            query: parameters.text,
            variables,
          },
          type: "subscribe",
        }));
      }).catch((error: unknown) => {
        sink.error(error instanceof Error ? error : new Error("Subscription connection failed."));
      });

      return () => {
        isDisposed = true;
        if (!operationId) {
          return;
        }

        this.stopOperation(operationId, true);
      };
    });
  }

  private async ensureConnection(): Promise<WebSocket> {
    if (this.socket && this.socket.readyState === WebSocket.OPEN && !this.connectPromise) {
      return this.socket;
    }
    if (this.connectPromise) {
      return this.connectPromise;
    }

    const socket = new WebSocket(this.resolveWebsocketUrl(), "graphql-transport-ws");
    this.socket = socket;
    this.connectPromise = new Promise<WebSocket>((resolve, reject) => {
      let isSettled = false;

      socket.addEventListener("open", () => {
        void this.sendConnectionInit(socket);
      }, { once: true });

      socket.addEventListener("message", (event) => {
        const message = this.parseMessage(event.data);
        if (!message) {
          return;
        }

        if (message.type === "connection_ack") {
          if (!isSettled) {
            isSettled = true;
            this.connectPromise = null;
            resolve(socket);
          }
          return;
        }

        this.handleMessage(message);
      });

      socket.addEventListener("close", () => {
        this.handleSocketClosed(new Error("Subscription connection closed."));
        if (!isSettled) {
          isSettled = true;
          this.connectPromise = null;
          reject(new Error("Subscription connection closed before acknowledgement."));
        }
      }, { once: true });

      socket.addEventListener("error", () => {
        this.handleSocketClosed(new Error("Subscription connection failed."));
        if (!isSettled) {
          isSettled = true;
          this.connectPromise = null;
          reject(new Error("Subscription connection failed."));
        }
      }, { once: true });
    });

    return this.connectPromise;
  }

  private async sendConnectionInit(socket: WebSocket): Promise<void> {
    const token = await this.getToken();
    if (socket.readyState !== WebSocket.OPEN) {
      return;
    }

    socket.send(JSON.stringify({
      payload: {
        headers: token ? { authorization: `Bearer ${token}` } : {},
      },
      type: "connection_init",
    }));
  }

  private handleMessage(message: GraphqlTransportMessage): void {
    if (message.type === "ping") {
      this.socket?.send(JSON.stringify({ type: "pong" }));
      return;
    }

    const operationId = String(message.id || "");
    const observer = this.activeObservers.get(operationId);
    if (!observer) {
      return;
    }

    if (message.type === "next") {
      observer.next(message.payload);
      return;
    }

    if (message.type === "error") {
      observer.error(this.createPayloadError(message.payload));
      this.activeObservers.delete(operationId);
      this.closeSocketIfIdle();
      return;
    }

    if (message.type === "complete") {
      observer.complete();
      this.activeObservers.delete(operationId);
      this.closeSocketIfIdle();
    }
  }

  private stopOperation(operationId: string, notifyServer: boolean): void {
    const observer = this.activeObservers.get(operationId);
    this.activeObservers.delete(operationId);

    if (notifyServer && this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        id: operationId,
        type: "complete",
      }));
    }

    observer?.complete();
    this.closeSocketIfIdle();
  }

  private handleSocketClosed(error: Error): void {
    const observers = [...this.activeObservers.values()];
    this.activeObservers.clear();
    this.socket = null;
    this.connectPromise = null;

    for (const observer of observers) {
      observer.error(error);
    }
  }

  private closeSocketIfIdle(): void {
    if (this.activeObservers.size > 0) {
      return;
    }

    const socket = this.socket;
    this.socket = null;
    this.connectPromise = null;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close(1000, "No active subscriptions");
    }
  }

  private resolveWebsocketUrl(): string {
    const websocketUrl = new URL(this.graphqlUrl);
    websocketUrl.protocol = websocketUrl.protocol === "https:" ? "wss:" : "ws:";
    return websocketUrl.toString();
  }

  private parseMessage(rawMessage: unknown): GraphqlTransportMessage | null {
    if (typeof rawMessage !== "string") {
      return null;
    }

    return JSON.parse(rawMessage) as GraphqlTransportMessage;
  }

  private createPayloadError(payload: unknown): Error {
    if (Array.isArray(payload)) {
      const errorMessage = payload
        .map((entry) => String((entry as { message?: unknown })?.message || "").trim())
        .find((message) => message.length > 0);
      if (errorMessage) {
        return new Error(errorMessage);
      }
    }

    return new Error("Subscription request failed.");
  }
}
