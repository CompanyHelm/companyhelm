CREATE UNIQUE INDEX "workflow_runs_running_session_id_uidx" ON "workflow_runs" USING btree ("session_id") WHERE "workflow_runs"."status" = 'running';
