type GoogleAdsConfiguration = {
  id?: string;
  signUpConversionLabel?: string;
};

type GoogleAdsTrackingOptions = {
  timeoutMs?: number;
};

type GoogleAdsWindowState = {
  initialized: boolean;
  signUpConversionPromise: Promise<void> | null;
  signUpConversionResolved: boolean;
};

declare global {
  interface Window {
    __COMPANYHELM_GOOGLE_ADS__?: GoogleAdsWindowState;
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Owns the browser-side Google Ads lifecycle so the app can queue the shared base tag once and
 * await the post-sign-up conversion callback without blocking users longer than the timeout.
 */
export class GoogleAdsAnalytics {
  /**
   * Proposed sign-up conversion label placeholder. Replace this with the real Google Ads
   * conversion label from the account before expecting production conversions to register.
   */
  private static readonly signUpConversionLabel = "signup_complete";

  static initialize(configuration: GoogleAdsConfiguration): void {
    if (typeof window === "undefined" || typeof configuration.id !== "string" || configuration.id.length === 0) {
      return;
    }

    const state = GoogleAdsAnalytics.getWindowState();
    if (state.initialized) {
      return;
    }

    state.initialized = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || ((...args: unknown[]) => {
      window.dataLayer?.push(args);
    });

    window.gtag("js", new Date());
    window.gtag("config", configuration.id);

    if (typeof document === "undefined") {
      return;
    }

    const scriptSource = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(configuration.id)}`;
    if (document.querySelector(`script[src="${scriptSource}"]`)) {
      return;
    }

    const scriptElement = document.createElement("script");
    scriptElement.async = true;
    scriptElement.src = scriptSource;
    document.head.appendChild(scriptElement);
  }

  static trackSignUpConversion(
    configuration: GoogleAdsConfiguration,
    options: GoogleAdsTrackingOptions = {},
  ): Promise<void> {
    if (
      typeof window === "undefined"
      || typeof configuration.id !== "string"
      || configuration.id.length === 0
      || typeof window.gtag !== "function"
    ) {
      return Promise.resolve();
    }

    const state = GoogleAdsAnalytics.getWindowState();
    if (state.signUpConversionPromise) {
      return state.signUpConversionPromise;
    }

    if (state.signUpConversionResolved) {
      return Promise.resolve();
    }

    const timeoutMs = options.timeoutMs ?? 1000;
    state.signUpConversionPromise = new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) {
          return;
        }

        settled = true;
        state.signUpConversionPromise = null;
        state.signUpConversionResolved = true;
        resolve();
      };

      try {
        window.gtag?.("event", "conversion", {
          send_to: `${configuration.id}/${GoogleAdsAnalytics.signUpConversionLabel}`,
          event_callback: finish,
          event_timeout: timeoutMs,
        });
      } catch {
        finish();
        return;
      }

      globalThis.setTimeout(finish, timeoutMs);
    });

    return state.signUpConversionPromise;
  }

  private static getWindowState(): GoogleAdsWindowState {
    if (!window.__COMPANYHELM_GOOGLE_ADS__) {
      window.__COMPANYHELM_GOOGLE_ADS__ = {
        initialized: false,
        signUpConversionPromise: null,
        signUpConversionResolved: false,
      };
    }

    return window.__COMPANYHELM_GOOGLE_ADS__;
  }

  static getSignUpConversionLabel(): string {
    return GoogleAdsAnalytics.signUpConversionLabel;
  }
}
