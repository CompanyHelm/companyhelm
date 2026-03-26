ALTER TABLE "agent_sessions" ADD COLUMN "current_model_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD COLUMN "current_reasoning_level" text NOT NULL;