import { Template } from "e2b";
import { E2bTemplateBuild } from "./template_build.ts";

/**
 * Defines the set of CompanyHelm E2B templates that can be published from this repository.
 */
export class E2bTemplatesManager {
  builds(): E2bTemplateBuild[] {
    return [
      new E2bTemplateBuild({
        cpuCount: 2,
        memoryMB: 4096,
        computerUse: true,
        template: Template()
          .fromBaseImage()
          .aptInstall("gh")
          .runCmd("curl -fsSL https://get.docker.com | sudo sh"),
        templateId: "small",
      }),
    ];
  }
}
