interface SignInAttemptWindow {
  windowStartedAtMs: number;
  attemptCount: number;
  blockedUntilMs: number;
}

const SIGN_IN_WINDOW_MS = 5 * 60 * 1000;
const SIGN_IN_BLOCK_MS = 10 * 60 * 1000;
const MAX_SIGN_IN_ATTEMPTS_PER_WINDOW = 5;

const signInAttemptsByEmail = new Map<string, SignInAttemptWindow>();

function normalizeEmailKey(rawEmail: string): string {
  return String(rawEmail || "").trim().toLowerCase();
}

function nowMs(): number {
  return Date.now();
}

function getSignInWindow(email: string): SignInAttemptWindow {
  const now = nowMs();
  const existingWindow = signInAttemptsByEmail.get(email);
  if (!existingWindow) {
    const createdWindow: SignInAttemptWindow = {
      windowStartedAtMs: now,
      attemptCount: 0,
      blockedUntilMs: 0,
    };
    signInAttemptsByEmail.set(email, createdWindow);
    return createdWindow;
  }

  if (existingWindow.blockedUntilMs > 0 && existingWindow.blockedUntilMs <= now) {
    existingWindow.blockedUntilMs = 0;
    existingWindow.windowStartedAtMs = now;
    existingWindow.attemptCount = 0;
  }

  if (now - existingWindow.windowStartedAtMs >= SIGN_IN_WINDOW_MS) {
    existingWindow.windowStartedAtMs = now;
    existingWindow.attemptCount = 0;
  }

  return existingWindow;
}

export function isSignInThrottled(rawEmail: string): boolean {
  const email = normalizeEmailKey(rawEmail);
  if (!email) {
    return false;
  }
  const window = getSignInWindow(email);
  return window.blockedUntilMs > nowMs();
}

export function recordFailedSignInAttempt(rawEmail: string): void {
  const email = normalizeEmailKey(rawEmail);
  if (!email) {
    return;
  }
  const now = nowMs();
  const window = getSignInWindow(email);
  window.attemptCount += 1;
  if (window.attemptCount >= MAX_SIGN_IN_ATTEMPTS_PER_WINDOW) {
    window.blockedUntilMs = now + SIGN_IN_BLOCK_MS;
  }
}

export function clearSignInThrottle(rawEmail: string): void {
  const email = normalizeEmailKey(rawEmail);
  if (!email) {
    return;
  }
  signInAttemptsByEmail.delete(email);
}

export function resetSignInThrottleStateForTests(): void {
  signInAttemptsByEmail.clear();
}
