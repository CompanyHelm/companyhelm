import { Link } from "@tanstack/react-router";
import { Fragment } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type AdminBreadcrumbItem = {
  label: string;
  to: string;
};

const ADMIN_PAGE_LABELS = new Map<string, string>([
  ["companies", "Companies"],
  ["llm-credentials", "LLM Credentials"],
  ["models", "Models"],
  ["users", "Users"],
]);

/**
 * Builds admin breadcrumbs directly from the URL so every platform-admin page gets the same
 * clickable hierarchy even when the page itself is loaded through a nested route.
 */
class AdminBreadcrumbBuilder {
  build(pathname: string): AdminBreadcrumbItem[] {
    const segments = pathname.split("/").filter((segment) => segment.length > 0);
    if (segments[0] !== "admin") {
      return [];
    }

    const crumbs: AdminBreadcrumbItem[] = [{
      label: "Admin",
      to: "/admin",
    }];
    let href = "/admin";
    for (const segment of segments.slice(1)) {
      href = `${href}/${segment}`;
      crumbs.push({
        label: this.formatSegmentLabel(segment),
        to: href,
      });
    }

    return crumbs;
  }

  private formatSegmentLabel(segment: string): string {
    const pageLabel = ADMIN_PAGE_LABELS.get(segment);
    if (pageLabel) {
      return pageLabel;
    }

    const decodedSegment = decodeURIComponent(segment);
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decodedSegment)) {
      return decodedSegment;
    }

    return decodedSegment
      .split("-")
      .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
      .join(" ");
  }
}

const adminBreadcrumbBuilder = new AdminBreadcrumbBuilder();

export function AdminBreadcrumbs(props: {
  pathname: string;
}) {
  const crumbs = adminBreadcrumbBuilder.build(props.pathname);
  if (crumbs.length === 0) {
    return null;
  }

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList>
        {crumbs.map((crumb, index) => (
          <Fragment key={crumb.to}>
            {index > 0 ? <BreadcrumbSeparator /> : null}
            <BreadcrumbItem>
              <Link
                className="font-medium text-muted-foreground transition hover:text-foreground"
                to={crumb.to}
              >
                {crumb.label}
              </Link>
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
