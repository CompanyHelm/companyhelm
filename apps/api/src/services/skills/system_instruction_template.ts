import { readFileSync } from "node:fs";

/**
 * Loads product-owned system skill instruction copy from the templates directory so long-form
 * agent guidance can be edited as Markdown instead of being embedded in the registry code.
 */
export class SystemInstructionTemplate {
  read(fileName: string): string {
    return readFileSync(
      new URL(`../../templates/system_skills/${fileName}`, import.meta.url),
      "utf8",
    ).trim();
  }
}
