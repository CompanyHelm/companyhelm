UPDATE "message_contents"
SET "structured_content" = jsonb_set(
  COALESCE("structured_content", '{}'::jsonb),
  '{type}',
  to_jsonb("structured_content_type"),
  true
)
WHERE "structured_content_type" IS NOT NULL;

ALTER TABLE "message_contents" DROP COLUMN "structured_content_type";
