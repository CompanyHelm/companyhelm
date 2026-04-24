import {
  Type,
  type TObjectOptions,
  type TObject,
  type TProperties,
} from "typebox";

/**
 * Builds strict TypeBox object schemas for agent tools. Tool-call payloads should reject unknown
 * fields at execution time so the persisted raw arguments can stay verbatim without the API
 * silently accepting unsupported inputs.
 */
export class AgentToolParameterSchema {
  static object<T extends TProperties>(properties: T, options?: TObjectOptions): TObject<T> {
    return Type.Object(properties, {
      ...options,
      additionalProperties: false,
    });
  }
}
