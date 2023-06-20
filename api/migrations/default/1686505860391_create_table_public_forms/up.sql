CREATE TABLE "public"."forms" ("id" serial NOT NULL, "name" text NOT NULL, "fields" jsonb NOT NULL DEFAULT jsonb_build_object(), "created_at" timestamptz NOT NULL DEFAULT now(), PRIMARY KEY ("id") );
