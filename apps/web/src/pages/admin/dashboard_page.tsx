import { Link } from "@tanstack/react-router";
import { ArrowRightIcon, ShieldCheckIcon, UsersIcon } from "lucide-react";
import { PlatformAdminGuard } from "./platform_admin_guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { OrganizationPath } from "@/lib/organization_path";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";

/**
 * Serves as the entry point for CompanyHelm-only administration so platform controls do not bleed
 * into the standard per-company dashboard.
 */
export function AdminDashboardPage() {
  return (
    <PlatformAdminGuard>
      <AdminDashboardPageContent />
    </PlatformAdminGuard>
  );
}

function AdminDashboardPageContent() {
  const organizationSlug = useCurrentOrganizationSlug();

  return (
    <main className="flex flex-1 flex-col gap-6">
      <header className="space-y-2">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border/70 bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground">
          <ShieldCheckIcon className="size-3.5 text-foreground" />
          Platform admin
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Admin dashboard</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Internal CompanyHelm controls live here. Start with the global user directory.
          </p>
        </div>
      </header>

      <div className="grid gap-4 md:max-w-xl">
        <Card className="border border-border/70 bg-card/90 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="size-4" />
              Users
            </CardTitle>
            <CardDescription>
              Review every CompanyHelm user, see platform-admin status, and page through the global directory.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            This view is paginated so the admin area stays usable as the product grows.
          </CardContent>
          <CardFooter>
            <Button asChild size="sm">
              <Link params={{ organizationSlug }} to={OrganizationPath.route("/admin/users")}>
                Open users
                <ArrowRightIcon className="size-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
