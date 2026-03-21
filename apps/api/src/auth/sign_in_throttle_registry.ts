/**
 * Tracks sign-in attempt windows in memory so callers get a single class-based throttle interface.
 */
export class SignInThrottleRegistry {
  private static readonly SIGN_IN_WINDOW_MS = 5 * 60 * 1000;
  private static readonly SIGN_IN_BLOCK_MS = 10 * 60 * 1000;
  private static readonly MAX_SIGN_IN_ATTEMPTS_PER_WINDOW = 5;
  private static readonly signInAttemptsByEmail = new Map<string, {
    windowStartedAtMs: number;
    attemptCount: number;
    blockedUntilMs: number;
  }>();

  static isSignInThrottled(rawEmail: string): boolean {
    const email = SignInThrottleRegistry.normalizeEmailKey(rawEmail);
    if (!email) {
      return false;
    }
    const window = SignInThrottleRegistry.getSignInWindow(email);
    return window.blockedUntilMs > SignInThrottleRegistry.nowMs();
  }

  static recordFailedSignInAttempt(rawEmail: string): void {
    const email = SignInThrottleRegistry.normalizeEmailKey(rawEmail);
    if (!email) {
      return;
    }
    const now = SignInThrottleRegistry.nowMs();
    const window = SignInThrottleRegistry.getSignInWindow(email);
    window.attemptCount += 1;
    if (window.attemptCount >= SignInThrottleRegistry.MAX_SIGN_IN_ATTEMPTS_PER_WINDOW) {
      window.blockedUntilMs = now + SignInThrottleRegistry.SIGN_IN_BLOCK_MS;
    }
  }

  static clearSignInThrottle(rawEmail: string): void {
    const email = SignInThrottleRegistry.normalizeEmailKey(rawEmail);
    if (!email) {
      return;
    }
    SignInThrottleRegistry.signInAttemptsByEmail.delete(email);
  }

  static resetForTests(): void {
    SignInThrottleRegistry.signInAttemptsByEmail.clear();
  }

  private static normalizeEmailKey(rawEmail: string): string {
    return String(rawEmail || "").trim().toLowerCase();
  }

  private static nowMs(): number {
    return Date.now();
  }

  private static getSignInWindow(email: string) {
    const now = SignInThrottleRegistry.nowMs();
    const existingWindow = SignInThrottleRegistry.signInAttemptsByEmail.get(email);
    if (!existingWindow) {
      const createdWindow = {
        windowStartedAtMs: now,
        attemptCount: 0,
        blockedUntilMs: 0,
      };
      SignInThrottleRegistry.signInAttemptsByEmail.set(email, createdWindow);
      return createdWindow;
    }

    if (existingWindow.blockedUntilMs > 0 && existingWindow.blockedUntilMs <= now) {
      existingWindow.blockedUntilMs = 0;
      existingWindow.windowStartedAtMs = now;
      existingWindow.attemptCount = 0;
    }

    if (now - existingWindow.windowStartedAtMs >= SignInThrottleRegistry.SIGN_IN_WINDOW_MS) {
      existingWindow.windowStartedAtMs = now;
      existingWindow.attemptCount = 0;
    }

    return existingWindow;
  }
}
