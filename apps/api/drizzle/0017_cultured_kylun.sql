ALTER TABLE "agent_sessions" ADD COLUMN "user_message" text NOT NULL DEFAULT '';
ALTER TABLE "agent_sessions" ALTER COLUMN "user_message" DROP DEFAULT;
