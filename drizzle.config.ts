import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./apps/api/src/db/schema.ts",
  out: "./apps/api/drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/companyhelm"
  }
});
