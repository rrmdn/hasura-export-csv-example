CREATE TABLE "public"."responses" ("id" serial NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "responses" jsonb NOT NULL DEFAULT jsonb_build_object(), "respondent_email" text NOT NULL, PRIMARY KEY ("id") );COMMENT ON TABLE "public"."responses" IS E'Form responses';