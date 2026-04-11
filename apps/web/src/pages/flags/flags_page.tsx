import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFeatureFlags } from "@/contextes/feature_flag_context";

const featureFlagDefinitions = [
  {
    key: "computer_providers" as const,
    description: "Controls whether the Compute Providers page appears in navigation for this browser.",
    label: "Computer providers",
  },
  {
    key: "mcp_servers" as const,
    description: "Controls whether the MCP Servers page appears in navigation for this browser.",
    label: "MCP servers",
  },
  {
    key: "tasks_management" as const,
    description: "Controls whether the Tasks entry appears in the left navigation for this browser.",
    label: "Tasks management",
  },
];

/**
 * Exposes browser-local feature flags without adding them to the main navigation, giving the team
 * a lightweight way to hide unfinished surfaces while still allowing direct opt-in testing.
 */
export function FlagsPage() {
  const { featureFlags, setFeatureFlag } = useFeatureFlags();

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <CardTitle>Feature Flags</CardTitle>
            <CardDescription>
              These overrides are stored in this browser only and default to disabled when no value
              has been saved yet.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          {featureFlagDefinitions.map((featureFlag) => {
            const isEnabled = featureFlags[featureFlag.key];

            return (
              <section
                key={featureFlag.key}
                className="grid gap-4 rounded-xl border border-border/70 bg-background/90 px-4 py-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{featureFlag.label}</p>
                    <p className="mt-1 text-xs/relaxed text-muted-foreground">{featureFlag.description}</p>
                  </div>
                  <div
                    className={`inline-flex w-fit rounded-full border px-3 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.18em] ${
                      isEnabled
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                        : "border-border/70 bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    {isEnabled ? "Enabled" : "Disabled"}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    onClick={() => {
                      setFeatureFlag(featureFlag.key, !isEnabled);
                    }}
                    size="sm"
                    variant={isEnabled ? "outline" : "default"}
                  >
                    {isEnabled ? "Disable" : "Enable"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Storage key: <span className="font-mono">companyhelm-feature-flags</span>
                  </p>
                </div>
              </section>
            );
          })}
        </CardContent>
      </Card>
    </main>
  );
}
