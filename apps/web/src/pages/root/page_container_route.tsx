import { Outlet } from "@tanstack/react-router";
import { PageContainer } from "../../components/page_container";

export function PageContainerRoute() {
  return (
    <PageContainer>
      <Outlet />
    </PageContainer>
  );
}
