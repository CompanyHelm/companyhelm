import { Template, type TemplateClass } from "e2b";
import { E2bTemplateBuild } from "./template_build.ts";

/**
 * Defines the set of CompanyHelm E2B templates that can be published from this repository.
 */
export class E2bTemplatesManager {
  private static readonly DEFAULT_NODE_MAJOR_VERSION = "25";
  private static readonly NVM_INSTALL_VERSION = "v0.40.3";
  private static readonly NVM_DIRECTORY = "/usr/local/nvm";

  builds(): E2bTemplateBuild[] {
    const desktopTemplate = this.installCommonRuntimeTools(
      // The medium template must inherit the desktop image so computer-use sandboxes can expose a
      // browser VNC stream without needing a second provisioning path.
      Template().fromTemplate("desktop"),
    );
    const baseTemplate = this.installCommonRuntimeTools(Template().fromBaseImage());

    return [
      new E2bTemplateBuild({
        cpuCount: 8,
        memoryMB: 8192,
        computerUse: true,
        template: desktopTemplate,
        templateId: "large",
      }),
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

  /**
   * Applies the shared CLI/runtime dependencies that every CompanyHelm sandbox expects. Node is
   * installed through nvm, but the default binaries are also linked into /usr/local/bin because
   * the PTY bootstrap starts a plain sh process rather than an nvm-aware login shell.
   */
  private installCommonRuntimeTools(template: TemplateClass): TemplateClass {
    return template
      .aptInstall("gh")
      .aptInstall("ripgrep")
      .aptInstall("tmux")
      .runCmd("curl -fsSL https://get.docker.com | sudo sh")
      .runCmd(this.buildNvmInstallCommand());
  }

  private buildNvmInstallCommand(): string {
    return `bash -lc '
set -euo pipefail
export NVM_DIR="${E2bTemplatesManager.NVM_DIRECTORY}"
sudo mkdir -p "$NVM_DIR"
sudo chown "$(id -u):$(id -g)" "$NVM_DIR"
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/${E2bTemplatesManager.NVM_INSTALL_VERSION}/install.sh | PROFILE=/dev/null NVM_DIR="$NVM_DIR" bash
. "$NVM_DIR/nvm.sh"
nvm install ${E2bTemplatesManager.DEFAULT_NODE_MAJOR_VERSION}
nvm alias default ${E2bTemplatesManager.DEFAULT_NODE_MAJOR_VERSION}
DEFAULT_NODE_VERSION="$(nvm version default)"
sudo ln -sf "$NVM_DIR/versions/node/$DEFAULT_NODE_VERSION/bin/node" /usr/local/bin/node
sudo ln -sf "$NVM_DIR/versions/node/$DEFAULT_NODE_VERSION/bin/npm" /usr/local/bin/npm
sudo ln -sf "$NVM_DIR/versions/node/$DEFAULT_NODE_VERSION/bin/npx" /usr/local/bin/npx
printf "%s\\n" "export NVM_DIR=\\"${E2bTemplatesManager.NVM_DIRECTORY}\\"" "[ -s \\"\\$NVM_DIR/nvm.sh\\" ] && . \\"\\$NVM_DIR/nvm.sh\\"" | sudo tee /etc/profile.d/companyhelm-nvm.sh >/dev/null
'`;
  }
}
