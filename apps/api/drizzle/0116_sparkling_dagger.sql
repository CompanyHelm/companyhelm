CREATE TYPE "public"."skill_source_type" AS ENUM('manual', 'public_git', 'github_installation');--> statement-breakpoint
ALTER TABLE "skills" RENAME COLUMN "github_branch_name" TO "branch_name";--> statement-breakpoint
ALTER TABLE "skills" RENAME COLUMN "github_tracked_commit_sha" TO "tracked_commit_sha";--> statement-breakpoint
ALTER TABLE "skills" DROP CONSTRAINT "skills_file_backed_source_check";--> statement-breakpoint
ALTER TABLE "skills" ADD COLUMN "source_type" "skill_source_type" DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "skills" ADD COLUMN "github_repository_id" uuid;--> statement-breakpoint
UPDATE "skills"
SET "source_type" = 'public_git'
WHERE nullif(trim("repository"), '') IS NOT NULL;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_github_repository_id_github_repositories_id_fk" FOREIGN KEY ("github_repository_id") REFERENCES "public"."github_repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_file_backed_source_check" CHECK ((
      "skills"."source_type" = 'manual'
      AND nullif(trim("skills"."repository"), '') IS NULL
      AND "skills"."github_repository_id" IS NULL
      AND nullif(trim("skills"."skill_directory"), '') IS NULL
      AND nullif(trim("skills"."branch_name"), '') IS NULL
      AND nullif(trim("skills"."tracked_commit_sha"), '') IS NULL
      AND coalesce(cardinality("skills"."file_list"), 0) = 0
    ) OR (
      "skills"."source_type" = 'public_git'
      AND nullif(trim("skills"."repository"), '') IS NOT NULL
      AND "skills"."github_repository_id" IS NULL
      AND nullif(trim("skills"."skill_directory"), '') IS NOT NULL
      AND nullif(trim("skills"."branch_name"), '') IS NOT NULL
      AND nullif(trim("skills"."tracked_commit_sha"), '') IS NOT NULL
    ) OR (
      "skills"."source_type" = 'github_installation'
      AND nullif(trim("skills"."repository"), '') IS NULL
      AND "skills"."github_repository_id" IS NOT NULL
      AND nullif(trim("skills"."skill_directory"), '') IS NOT NULL
      AND nullif(trim("skills"."branch_name"), '') IS NOT NULL
      AND nullif(trim("skills"."tracked_commit_sha"), '') IS NOT NULL
    ));
