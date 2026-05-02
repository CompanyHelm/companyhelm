import { faker } from "@faker-js/faker";
import { injectable } from "inversify";

export type AgentNameSuggestion = {
  name: string;
  title: string;
};

/**
 * Suggests human-friendly agent identity defaults while keeping persistence responsible for final
 * uniqueness. The service deliberately only returns a display name and an empty title so product
 * copy can use the title field as an optional role label rather than a permission signal.
 */
@injectable()
export class AgentNameSuggestionService {
  private static readonly MAX_RANDOM_ATTEMPTS = 50;
  private readonly randomFirstName: () => string;

  constructor(randomFirstName: () => string = () => faker.person.firstName()) {
    this.randomFirstName = randomFirstName;
  }

  suggest(existingNames: string[]): AgentNameSuggestion {
    const usedNames = new Set(existingNames.map((name) => this.createComparisonKey(name)));

    for (let attempt = 0; attempt < AgentNameSuggestionService.MAX_RANDOM_ATTEMPTS; attempt += 1) {
      const name = this.randomFirstName().trim();
      if (name.length > 0 && !usedNames.has(this.createComparisonKey(name))) {
        return {
          name,
          title: "",
        };
      }
    }

    return {
      name: this.createFallbackName(usedNames, existingNames.length + 1),
      title: "",
    };
  }

  private createFallbackName(usedNames: Set<string>, initialIndex: number): string {
    let index = initialIndex;
    while (usedNames.has(this.createComparisonKey(`Agent ${index}`))) {
      index += 1;
    }

    return `Agent ${index}`;
  }

  private createComparisonKey(name: string): string {
    return name.trim().toLocaleLowerCase("en-US");
  }
}
