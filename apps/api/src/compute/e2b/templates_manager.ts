import { Template } from "e2b";
import { E2bTemplateBuild } from "./template_build.ts";

/**
 * Defines the set of CompanyHelm E2B templates that can be published from this repository.
 */
export class E2bTemplatesManager {
  builds(): E2bTemplateBuild[] {
    // The medium template must inherit the desktop image so computer-use sandboxes can expose a
    // browser VNC stream without needing a second provisioning path.
    const desktopTemplate = Template()
      .fromTemplate("desktop")
      .aptInstall("gh")
      .aptInstall("ripgrep")
      .aptInstall("tmux")
      .runCmd("curl -fsSL https://get.docker.com | sudo sh");
    const baseTemplate = Template()
      .fromBaseImage()
      .aptInstall("gh")
      .aptInstall("ripgrep")
      .aptInstall("tmux")
      .runCmd("curl -fsSL https://get.docker.com | sudo sh");

    return [
      new E2bTemplateBuild({
        cpuCount: 2,
        memoryMB: 4096,
        computerUse: true,
        template: desktopTemplate,
        templateId: "medium",
      }),
      new E2bTemplateBuild({
        cpuCount: 1,
        memoryMB: 2048,
        computerUse: false,
        template: baseTemplate,
        templateId: "small",
      }),
    ];
  }

  findBuild(templateId: string): E2bTemplateBuild | undefined {
    return this.builds().find((build) => build.matchesTemplateId(templateId));
  }
}
