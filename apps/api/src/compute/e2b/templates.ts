import { Template, defaultBuildLogger } from 'e2b';

class E2BTemplateBuild {
    constructor(
        public readonly name: string,
        public readonly templateId: string,
        public readonly template: Template,
        public readonly cpuCount: number,
        public readonly memoryMB: number,
    ) {
        this.templateId = templateId;
        this.template = template;
        this.cpuCount = cpuCount;
        this.memoryMB = memoryMB;
    }

    async build(): Promise<E2BTemplateBuild> {
        return await Template.build(this.template, this.templateId, {
            cpuCount: this.cpuCount,
            memoryMB: this.memoryMB,
            onBuildLogs: defaultBuildLogger(),
            });
    }
}

class E2BTemplatesManager {
    builds(): E2BTemplateBuild[] {
        return [
            new E2BTemplateBuild("small", "small", Template().fromBaseImage().aptInstall("gh").runCmd("curl -fsSL https://get.docker.com | sudo sh"), 1, 1024),
        ];
    }
}