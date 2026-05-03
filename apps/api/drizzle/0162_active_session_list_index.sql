CREATE INDEX "agent_sessions_active_company_owner_activity_idx"
ON "agent_sessions" (
  "company_id",
  "owner_user_id",
  (coalesce("last_user_message_at", "created_at")) DESC,
  "created_at" DESC,
  "id" DESC
)
WHERE "status" <> 'archived';
