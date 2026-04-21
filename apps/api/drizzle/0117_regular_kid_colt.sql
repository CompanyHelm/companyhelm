ALTER TABLE "skills" DROP CONSTRAINT "skills_file_backed_source_check";--> statement-breakpoint
ALTER TABLE "skills" ADD COLUMN "branch_commit_sha" text;--> statement-breakpoint
ALTER TABLE "skills" ADD COLUMN "auto_update" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "skills"
SET
  "branch_commit_sha" = "tracked_commit_sha",
  "auto_update" = true
WHERE "source_type" IN ('public_git', 'github_installation');--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_file_backed_source_check" CHECK ((
      "skills"."source_type" = 'manual'
      AND nullif(trim("skills"."repository"), '') IS NULL
      AND "skills"."github_repository_id" IS NULL
      AND nullif(trim("skills"."skill_directory"), '') IS NULL
      AND nullif(trim("skills"."branch_name"), '') IS NULL
      AND nullif(trim("skills"."branch_commit_sha"), '') IS NULL
      AND nullif(trim("skills"."tracked_commit_sha"), '') IS NULL
      AND "skills"."auto_update" = false
      AND coalesce(cardinality("skills"."file_list"), 0) = 0
    ) OR (
      "skills"."source_type" = 'public_git'
      AND nullif(trim("skills"."repository"), '') IS NOT NULL
      AND "skills"."github_repository_id" IS NULL
      AND nullif(trim("skills"."skill_directory"), '') IS NOT NULL
      AND nullif(trim("skills"."branch_name"), '') IS NOT NULL
      AND nullif(trim("skills"."branch_commit_sha"), '') IS NOT NULL
      AND nullif(trim("skills"."tracked_commit_sha"), '') IS NOT NULL
    ) OR (
      "skills"."source_type" = 'github_installation'
      AND nullif(trim("skills"."repository"), '') IS NULL
      AND "skills"."github_repository_id" IS NOT NULL
      AND nullif(trim("skills"."skill_directory"), '') IS NOT NULL
      AND nullif(trim("skills"."branch_name"), '') IS NOT NULL
      AND nullif(trim("skills"."branch_commit_sha"), '') IS NOT NULL
      AND nullif(trim("skills"."tracked_commit_sha"), '') IS NOT NULL
    ));
