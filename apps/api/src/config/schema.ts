import { z } from "zod";

const databaseRoleConfigSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const databaseConfigSchema = z.object({
  name: z.string().min(1),
  host: z.string().min(1),
  port: z.coerce.number().int().positive(),
  roles: z.object({
    app_runtime: databaseRoleConfigSchema,
    admin: databaseRoleConfigSchema,
  }),
});

const companyhelmApiAuthConfigSchema = z.object({
  jwt_private_key_pem: z.string().min(1),
  jwt_public_key_pem: z.string().min(1),
  jwt_issuer: z.string().min(1),
  jwt_audience: z.string().min(1),
  jwt_expiration_seconds: z.coerce.number().int().positive(),
});

const supabaseApiAuthConfigSchema = z.object({
  url: z.string().url(),
  anon_key: z.string().min(1),
});

const appConfigBaseSchema = z.object({
  app: z.object({
    host: z.string().min(1),
    port: z.coerce.number().int().positive(),
    graphqlEndpoint: z.string().min(1),
    graphiql: z.boolean(),
    grpc: z.object({
      host: z.string().min(1),
      port: z.coerce.number().int().positive(),
      heartbeat: z.object({
        intervalMs: z.coerce.number().int().positive(),
        jitterMs: z.coerce.number().int().nonnegative(),
      }),
    }),
    workers: z.object({
      agentHeartbeats: z.object({
        intervalSeconds: z.coerce.number().int().positive(),
        jitterSeconds: z.coerce.number().int().nonnegative(),
        batchSize: z.coerce.number().int().positive(),
        leaseSeconds: z.coerce.number().int().positive(),
      }),
      taskWorker: z.object({
        intervalSeconds: z.coerce.number().int().positive(),
        jitterSeconds: z.coerce.number().int().nonnegative(),
        batchSize: z.coerce.number().int().positive(),
        leaseSeconds: z.coerce.number().int().positive(),
      }),
      }),
    }),
  database: databaseConfigSchema,
  github: z.object({
    app_client_id: z.string().min(1),
    app_private_key_pem: z.string().min(1),
    app_link: z.string().url(),
  }),
  authProvider: z.enum(["companyhelm", "supabase"]),
  auth: z.object({
    companyhelm: companyhelmApiAuthConfigSchema.optional(),
    supabase: supabaseApiAuthConfigSchema.optional(),
  }),
  security: z.object({
    encryption: z.object({
      key: z.string().min(1),
    }),
  }),
  log_level: z.enum(["debug", "info", "warn", "error"]),
  log_pretty: z.boolean(),
}).superRefine((config, ctx) => {
  if (config.authProvider === "companyhelm" && !config.auth.companyhelm) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["auth", "companyhelm"],
      message: "CompanyHelm auth provider requires auth.companyhelm configuration.",
    });
  }

  if (config.authProvider === "supabase" && !config.auth.supabase) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["auth", "supabase"],
      message: "Supabase auth provider requires auth.supabase configuration.",
    });
  }
});

export const appConfigSchema = appConfigBaseSchema;

export type AppConfig = z.infer<typeof appConfigSchema>;
export type AppDatabaseConfig = z.infer<typeof databaseConfigSchema>;
export type DatabaseRoleName = keyof AppDatabaseConfig["roles"];
