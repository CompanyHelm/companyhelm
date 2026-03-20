CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text,
	"email" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "users_first_name_length_check" CHECK (length("users"."first_name") <= 255),
	CONSTRAINT "users_last_name_length_check" CHECK ("users"."last_name" IS NULL OR length("users"."last_name") <= 255)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uidx" ON "users" USING btree ("email");