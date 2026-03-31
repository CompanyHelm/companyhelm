import {
  type ResourceLoader,
  createExtensionRuntime,
} from "@mariozechner/pi-coding-agent";
import { SystemPromptTemplate } from "../../../../templates/system_prompt_template.ts";
import { SystemPromptTemplateContext } from "../../../../templates/system_prompt_template_context.ts";

/**
 * Owns the CompanyHelm PI Mono resource surface. Its scope is replacing the upstream default
 * resource discovery so one session never auto-loads local AGENTS files, skills, themes, prompt
 * templates, or extensions from disk, while also supplying a system prompt that does not imply
 * local filesystem or shell access unless a CompanyHelm tool explicitly provides it.
 */
export class CompanyHelmResourceLoader implements ResourceLoader {
  private readonly appendSystemPrompt: string[] = [];
  private readonly agentsFiles = {
    agentsFiles: [] as Array<{
      content: string;
      path: string;
    }>,
  };
  private readonly extensions = {
    errors: [] as Array<{
      error: string;
      path: string;
    }>,
    extensions: [],
    runtime: createExtensionRuntime(),
  };
  private readonly prompts = {
    diagnostics: [] as Array<{
      error: string;
      path: string;
    }>,
    prompts: [],
  };
  private readonly skills = {
    diagnostics: [] as Array<{
      error: string;
      path: string;
    }>,
    skills: [],
  };
  private readonly systemPrompt: string;
  private readonly themes = {
    diagnostics: [] as Array<{
      error: string;
      path: string;
    }>,
    themes: [],
  };

  constructor(
    systemPromptContext: SystemPromptTemplateContext,
    systemPromptTemplate: SystemPromptTemplate = new SystemPromptTemplate(),
  ) {
    this.systemPrompt = systemPromptTemplate.render(systemPromptContext);
  }

  getExtensions(): ReturnType<ResourceLoader["getExtensions"]> {
    return this.extensions;
  }

  getSkills(): ReturnType<ResourceLoader["getSkills"]> {
    return this.skills;
  }

  getPrompts(): ReturnType<ResourceLoader["getPrompts"]> {
    return this.prompts;
  }

  getThemes(): ReturnType<ResourceLoader["getThemes"]> {
    return this.themes;
  }

  getAgentsFiles(): ReturnType<ResourceLoader["getAgentsFiles"]> {
    return this.agentsFiles;
  }

  getSystemPrompt(): ReturnType<ResourceLoader["getSystemPrompt"]> {
    return this.systemPrompt;
  }

  getAppendSystemPrompt(): ReturnType<ResourceLoader["getAppendSystemPrompt"]> {
    return this.appendSystemPrompt;
  }

  extendResources(paths: Parameters<ResourceLoader["extendResources"]>[0]): void {
    void paths;
    // CompanyHelm intentionally does not permit dynamic local resource discovery in PI Mono.
  }

  async reload(): Promise<void> {
    // No-op by design: all resource sets are static and in-memory.
  }
}
