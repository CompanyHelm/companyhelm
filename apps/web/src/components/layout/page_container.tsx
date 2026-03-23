import type { ReactNode } from "react";
import { ApplicationHeader } from "@/components/layout/application_header";
import { ApplicationSidebar } from "@/components/layout/application_sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

interface PageContainerProps {
  children: ReactNode;
}

export function PageContainer(props: PageContainerProps) {
  return (
    <SidebarProvider defaultOpen>
      <ApplicationSidebar />
      <SidebarInset className="min-h-svh bg-transparent">
        <ApplicationHeader />
        <div className="flex flex-1 flex-col px-4 pb-6 pt-4 md:px-6 md:pb-8 md:pt-5 lg:px-8">
          {props.children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
