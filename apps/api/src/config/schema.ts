import { z } from "zod";

const NonEmptyStringSchema = z.string().trim().min(1);
const PositiveIntegerSchema = z.number().int().positive();

const DatabaseRoleSchema = z.object({
  username: NonEmptyStringSchema,
  password: NonEmptyStringSchema,
});

const CompanyhelmAuthSchema = z.object({
  provider: z.literal("companyhelm"),
  companyhelm: z.object({
    jwt_private_key_pem: NonEmptyStringSchema,
    jwt_public_key_pem: NonEmptyStringSchema,
    jwt_issuer: NonEmptyStringSchema,
    jwt_audience: NonEmptyStringSchema,
    jwt_expiration_seconds: PositiveIntegerSchema,
  }),
});

const SupabaseAuthSchema = z.object({
  provider: z.literal("supabase"),
  supabase: z.object({
    url: NonEmptyStringSchema,
    anon_key: NonEmptyStringSchema,
  }),
});

export const Config = z.object({
  host: NonEmptyStringSchema,
  port: PositiveIntegerSchema,
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
  }),
  github: z.object({
    app_client_id: NonEmptyStringSchema,
    app_private_key_pem: NonEmptyStringSchema,
    app_link: NonEmptyStringSchema,
  }),
  auth: z.discriminatedUnion("provider", [
    CompanyhelmAuthSchema,
    SupabaseAuthSchema,
  ]),
  security: z.object({
    encryption: z.object({
      key: NonEmptyStringSchema,
    }),
  }),
  log_level: z.enum(["debug", "info", "warn", "error"]),
  log_pretty: z.boolean(),
});

export type ConfigDocument = z.infer<typeof Config>;
