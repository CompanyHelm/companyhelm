type PaddleEnvironment = "sandbox" | "production";

type PaddleApi = {
  Checkout: {
    open(input: {
      customData: Record<string, string>;
      items: Array<{
        priceId: string;
        quantity: number;
      }>;
    }): void;
  };
  Environment?: {
    set(environment: "sandbox"): void;
  };
  Initialize(input: { token: string }): void;
};

type PaddleWindow = Window & {
  Paddle?: PaddleApi;
};

type PaddleCheckoutInput = {
  clientToken: string;
  companyId: string;
  environment: PaddleEnvironment;
  planKey: string;
  priceId: string;
};

/**
 * Loads and initializes Paddle.js exactly once for the billing settings page. Keeping the browser
 * global behind this class prevents checkout setup details from leaking into React components.
 */
export class PaddleCheckout {
  private static readonly paddleScriptUrl = "https://cdn.paddle.com/paddle/v2/paddle.js";
  private static initializedClientToken: string | null = null;
  private static loadPromise: Promise<PaddleApi> | null = null;

  static async open(input: PaddleCheckoutInput): Promise<void> {
    const paddle = await PaddleCheckout.load(input);
    paddle.Checkout.open({
      customData: {
        companyId: input.companyId,
        intendedPlan: input.planKey,
      },
      items: [
        {
          priceId: input.priceId,
          quantity: 1,
        },
      ],
    });
  }

  private static async load(input: PaddleCheckoutInput): Promise<PaddleApi> {
    if (!PaddleCheckout.loadPromise) {
      PaddleCheckout.loadPromise = PaddleCheckout.loadScript();
    }

    const paddle = await PaddleCheckout.loadPromise;
    if (PaddleCheckout.initializedClientToken === input.clientToken) {
      return paddle;
    }

    if (input.environment === "sandbox") {
      paddle.Environment?.set("sandbox");
    }
    paddle.Initialize({ token: input.clientToken });
    PaddleCheckout.initializedClientToken = input.clientToken;
    return paddle;
  }

  private static async loadScript(): Promise<PaddleApi> {
    const paddleWindow = window as PaddleWindow;
    if (paddleWindow.Paddle) {
      return paddleWindow.Paddle;
    }

    await new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        `script[src="${PaddleCheckout.paddleScriptUrl}"]`,
      );
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(), { once: true });
        existingScript.addEventListener("error", () => reject(new Error("Failed to load Paddle.js.")), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.async = true;
      script.src = PaddleCheckout.paddleScriptUrl;
      script.addEventListener("load", () => resolve(), { once: true });
      script.addEventListener("error", () => reject(new Error("Failed to load Paddle.js.")), { once: true });
      document.head.appendChild(script);
    });

    if (!paddleWindow.Paddle) {
      throw new Error("Paddle.js loaded without exposing Paddle.");
    }

    return paddleWindow.Paddle;
  }
}
