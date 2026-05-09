ALTER TABLE "mcp_servers"
ADD COLUMN IF NOT EXISTS "last_validation_status" text DEFAULT 'unknown' NOT NULL;

ALTER TABLE "mcp_servers"
ADD COLUMN IF NOT EXISTS "last_validation_error" text;

ALTER TABLE "mcp_servers"
ADD COLUMN IF NOT EXISTS "last_validation_tool_count" integer;

ALTER TABLE "mcp_servers"
ADD COLUMN IF NOT EXISTS "last_validated_at" timestamp with time zone;
