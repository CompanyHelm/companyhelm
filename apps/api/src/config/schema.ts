import { z } from "zod";

/* eslint-disable @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unsafe-declaration-merging */

const NonEmptyStringSchema = z.string().trim().min(1);
const PositiveIntegerSchema = z.number().int().positive();

const DatabaseRoleSchema = z.object({
  username: NonEmptyStringSchema,
  password: NonEmptyStringSchema,
});

const ClerkAuthSchema = z.object({
  provider: z.literal("clerk"),
  clerk: z.object({
    secret_key: NonEmptyStringSchema,
    publishable_key: NonEmptyStringSchema,
    jwks_url: NonEmptyStringSchema,
    authorized_parties: z.array(NonEmptyStringSchema).min(1),
  }),
});

export const ConfigDocument = z.object({
  host: NonEmptyStringSchema,
  port: PositiveIntegerSchema,
  cors: z.object({
    origin: z.union([
      NonEmptyStringSchema,
      z.array(NonEmptyStringSchema).min(1),
    ]),
    credentials: z.boolean(),
    methods: z.array(NonEmptyStringSchema).min(1),
    allowed_headers: z.array(NonEmptyStringSchema).min(1),
  }),
  graphql: z.object({
    endpoint: NonEmptyStringSchema,
    graphiql: z.boolean(),
  }),
  publicUrl: NonEmptyStringSchema,
  database: z.object({
    name: NonEmptyStringSchema,
    host: NonEmptyStringSchema,
    port: PositiveIntegerSchema,
    roles: z.object({
      app_runtime: DatabaseRoleSchema,
      admin: DatabaseRoleSchema,
    }),
  }),
  redis: z.object({
    host: NonEmptyStringSchema,
    port: PositiveIntegerSchema,
    username: z.string(),
    password: z.string(),
  }),
  workers: z.object({
    session_process: z.object({
      concurrency: PositiveIntegerSchema,
    }),
  }),
  web_search: z.object({
    exa: z.object({
      api_key: NonEmptyStringSchema,
    }),
  }),
  companyhelm: z.object({
    e2b: z.object({
      api_key: NonEmptyStringSchema,
      template_prefix: NonEmptyStringSchema,
    }),
  }),
  github: z.object({
    app_client_id: NonEmptyStringSchema,
    app_private_key_pem: NonEmptyStringSchema,
    app_link: NonEmptyStringSchema,
  }),
  auth: z.discriminatedUnion("provider", [
    ClerkAuthSchema,
  ]),
  security: z.object({
    encryption: z.object({
      key: NonEmptyStringSchema,
      key_id: NonEmptyStringSchema,
    }),
  }),
  log: z.object({
    level: z.enum(["debug", "info", "warn", "error"]),
    json: z.boolean().default(false),
  }),
});

type ConfigShape = z.infer<typeof ConfigDocument>;

export interface Config extends ConfigShape {}

export class Config {
  constructor(value: ConfigShape) {
    Object.assign(this, value);
  }
}
