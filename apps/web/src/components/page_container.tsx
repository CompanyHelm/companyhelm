import type { ReactNode } from "react";
import { ApplicationHeader } from "@/components/layout/application_header";
import { ApplicationSidebar } from "@/components/layout/application_sidebar";

interface PageContainerProps {
  children: ReactNode;
}

export function PageContainer(props: PageContainerProps) {
  return (
    <div className="app-shell">
      <ApplicationSidebar />
      <div className="app-shell__main">
        <ApplicationHeader />
        <div className="app-shell__content">{props.children}</div>
      </div>
    </div>
  );
}
