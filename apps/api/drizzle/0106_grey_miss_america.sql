ALTER TABLE "workflow_definitions" ADD COLUMN "instructions_template" text;--> statement-breakpoint
ALTER TABLE "workflow_step_definitions" ADD COLUMN "instructions_template" text;--> statement-breakpoint
ALTER TABLE "workflow_definitions" DROP COLUMN "instructions";--> statement-breakpoint
ALTER TABLE "workflow_step_definitions" DROP COLUMN "instructions";