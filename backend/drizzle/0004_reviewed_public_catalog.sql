CREATE TABLE "app"."publication_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" text NOT NULL,
	"revision" integer NOT NULL,
	"publication_version" integer DEFAULT 1 NOT NULL,
	"request_id" uuid,
	"reason" text,
	"consent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "publication_event_version" UNIQUE("business_id","publication_version"),
	CONSTRAINT "publication_event_tenant_id" UNIQUE("business_id","id")
);
--> statement-breakpoint
CREATE TABLE "app"."reviewer_permission_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"active" boolean NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."reviewer_permissions" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"active" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."service_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."businesses" DROP CONSTRAINT "business_state";--> statement-breakpoint
ALTER TABLE "app"."businesses" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "app"."businesses" ADD COLUMN "content_revision" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."businesses" ADD COLUMN "publication_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."businesses" ADD COLUMN "current_request_id" uuid;--> statement-breakpoint
ALTER TABLE "app"."businesses" ADD COLUMN "search_text" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."services" ADD COLUMN "category_id" text;--> statement-breakpoint
ALTER TABLE "app"."staff_profiles" ADD COLUMN "public_visible" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."publication_events" ADD CONSTRAINT "publication_events_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "app"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."publication_events" ADD CONSTRAINT "publication_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."reviewer_permission_history" ADD CONSTRAINT "reviewer_permission_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."reviewer_permissions" ADD CONSTRAINT "reviewer_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "publication_events_business_idx" ON "app"."publication_events" USING btree ("business_id","created_at");--> statement-breakpoint
ALTER TABLE "app"."services" ADD CONSTRAINT "services_category_id_service_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "app"."service_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "public_businesses_order_idx" ON "app"."businesses" USING btree ("created_at","id") WHERE "app"."businesses"."state"='published';--> statement-breakpoint
ALTER TABLE "app"."businesses" ADD CONSTRAINT "business_publication_versions" CHECK ("app"."businesses"."content_revision">0 AND "app"."businesses"."publication_version">0);--> statement-breakpoint
ALTER TABLE "app"."businesses" ADD CONSTRAINT "business_description_length" CHECK ("app"."businesses"."description" IS NULL OR char_length("app"."businesses"."description")<=600);--> statement-breakpoint
ALTER TABLE "app"."businesses" ADD CONSTRAINT "publication_request_required" CHECK (("app"."businesses"."state" IN ('pending_review','published')) = ("app"."businesses"."current_request_id" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "app"."businesses" ADD CONSTRAINT "business_state" CHECK ("app"."businesses"."state" IN ('draft','pending_review','published','suspended'));
--> statement-breakpoint
INSERT INTO app.service_categories(id,label,sort_order) VALUES ('haircut','کوتاهی مو',1),('beard','اصلاح ریش',2),('color','رنگ مو',3),('brushing','براشینگ',4),('keratin','کراتین',5),('nails','ناخن',6),('skin','پوست',7);
--> statement-breakpoint
CREATE FUNCTION app.normalize_search(value text) RETURNS text LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $$
 SELECT trim(regexp_replace(regexp_replace(translate(lower(normalize(value,NFC) COLLATE "und-x-icu"),'يىك','ییک'),'[ً-ٰٟـ]','','g'),'[‌[:space:]]+',' ','g'))
$$;
--> statement-breakpoint
CREATE FUNCTION app.update_business_search() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.search_text := app.normalize_search(NEW.name); RETURN NEW; END $$;
--> statement-breakpoint
CREATE TRIGGER business_search BEFORE INSERT OR UPDATE OF name ON app.businesses FOR EACH ROW EXECUTE FUNCTION app.update_business_search();
--> statement-breakpoint
UPDATE app.businesses SET search_text=app.normalize_search(name);
--> statement-breakpoint
ALTER TABLE app.businesses ADD CONSTRAINT business_request_fk FOREIGN KEY(id,current_request_id) REFERENCES app.publication_events(business_id,id);
--> statement-breakpoint
CREATE FUNCTION app.validate_service_category() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.category_id IS NOT NULL AND (TG_OP='INSERT' OR NEW.category_id IS DISTINCT FROM OLD.category_id) AND NOT EXISTS(SELECT 1 FROM app.service_categories WHERE id=NEW.category_id AND active) THEN
  RAISE EXCEPTION 'Invalid service category' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER service_category_valid BEFORE INSERT OR UPDATE OF category_id ON app.services FOR EACH ROW EXECUTE FUNCTION app.validate_service_category();

--> statement-breakpoint
ALTER TABLE app.publication_events ADD CONSTRAINT publication_event_request_fk FOREIGN KEY(business_id,request_id) REFERENCES app.publication_events(business_id,id);
