DROP INDEX "workflow_runs_session_id_uidx";--> statement-breakpoint
CREATE INDEX "workflow_runs_session_id_idx" ON "workflow_runs" USING btree ("session_id");