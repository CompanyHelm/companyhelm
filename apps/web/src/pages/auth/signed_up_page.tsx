import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2Icon } from "lucide-react";
import { useAuth } from "@/components/auth/auth_provider";

/**
 * Keeps the hosted sign-up callback route focused on returning authenticated users into the app
 * after Clerk has finished loading the current session.
 */
export function SignedUpPage() {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.isLoaded) {
      return;
    }

    if (!auth.isSignedIn) {
      void navigate({
        replace: true,
        to: "/sign-up",
      });
      return;
    }

    void navigate({
      replace: true,
      to: "/",
    });
  }, [auth.isLoaded, auth.isSignedIn, navigate]);

  if (!auth.isLoaded) {
    return null;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <div className="flex w-full max-w-lg items-center gap-3 rounded-2xl border border-border/60 bg-card/80 px-5 py-4 text-sm text-muted-foreground shadow-sm">
        <Loader2Icon className="size-4 animate-spin text-foreground" />
        <span>Finishing sign up…</span>
      </div>
    </main>
  );
}
