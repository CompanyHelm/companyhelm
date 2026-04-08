import { Template } from "e2b";
import { E2bTemplateBuild } from "./template_build.ts";

/**
 * Defines the set of CompanyHelm E2B templates that can be published from this repository.
 */
export class E2bTemplatesManager {
  builds(): E2bTemplateBuild[] {
    return [
      new E2bTemplateBuild({
        cpuCount: 1,
        memoryMB: 1024,
        template: Template()
          .fromBaseImage()
          .aptInstall("gh")
          .runCmd("curl -fsSL https://get.docker.com | sudo sh"),
        templateId: "small",
      }),
    ];
  }
}
