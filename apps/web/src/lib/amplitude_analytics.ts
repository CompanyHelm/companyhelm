import * as amplitude from "@amplitude/unified";

type RouteLocation = {
  hash: string;
  href: string;
  pathname: string;
  searchStr: string;
};

type RouterResolvedEvent = {
  hrefChanged: boolean;
  toLocation: RouteLocation;
};

type AnalyticsRouter = {
  subscribe(eventType: "onResolved", listener: (event: RouterResolvedEvent) => void): () => void;
};

type AmplitudeWindowState = {
  initialized: boolean;
  lastTrackedHref: string | null;
};

type EnvironmentActionProperties = {
  action: "delete" | "open_desktop" | "start" | "stop";
  environmentId: string;
  force?: boolean;
  provider: string;
  status: string;
};

declare global {
  interface Window {
    __COMPANYHELM_AMPLITUDE__?: AmplitudeWindowState;
  }
}

/**
 * Owns the browser-only Amplitude lifecycle so the web app initializes analytics and replay once,
 * then reuses the same tracking helpers across routed pages and shared interaction surfaces.
 */
export class AmplitudeAnalytics {
  private static readonly apiKey = "1895118e01cb83012517aa3955e4d606";

  static initialize(router: AnalyticsRouter): void {
    if (typeof window === "undefined") {
      return;
    }

    const state = AmplitudeAnalytics.getWindowState();
    if (state.initialized) {
      return;
    }

    state.initialized = true;
    void amplitude.initAll(AmplitudeAnalytics.apiKey, {
      analytics: {
        autocapture: true,
      },
      sessionReplay: {
        sampleRate: 1,
      },
    });

    AmplitudeAnalytics.trackPageView({
      hash: window.location.hash,
      href: `${window.location.pathname}${window.location.search}${window.location.hash}`,
      pathname: window.location.pathname,
      searchStr: window.location.search,
    });

    router.subscribe("onResolved", (event) => {
      if (!event.hrefChanged) {
        return;
      }

      AmplitudeAnalytics.trackPageView(event.toLocation);
    });
  }

  static trackEnvironmentAction(properties: EnvironmentActionProperties): void {
    if (typeof window === "undefined") {
      return;
    }

    amplitude.track("environment_action_clicked", {
      ...properties,
      pathname: window.location.pathname,
    });
  }

  private static getWindowState(): AmplitudeWindowState {
    if (!window.__COMPANYHELM_AMPLITUDE__) {
      window.__COMPANYHELM_AMPLITUDE__ = {
        initialized: false,
        lastTrackedHref: null,
      };
    }

    return window.__COMPANYHELM_AMPLITUDE__;
  }

  private static trackPageView(location: RouteLocation): void {
    const state = AmplitudeAnalytics.getWindowState();
    if (state.lastTrackedHref === location.href) {
      return;
    }

    state.lastTrackedHref = location.href;
    amplitude.track("page_viewed", {
      hash: location.hash,
      href: location.href,
      pathname: location.pathname,
      search: location.searchStr,
    });
  }
}
