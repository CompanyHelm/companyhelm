CREATE TYPE "public"."auth_provider" AS ENUM('companyhelm', 'supabase');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "auth_provider" "auth_provider" DEFAULT 'companyhelm' NOT NULL;