CREATE TABLE "app"."mfa_enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"cipher" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "mfa_enrollments_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "app"."mfa_factors" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"cipher" text NOT NULL,
	"last_step" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."reauthentication_grants" (
	"hash" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "app"."mfa_recovery_codes" (
	"hash" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"consumed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "app"."business_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"weekday" integer NOT NULL,
	"start_minute" integer NOT NULL,
	"end_minute" integer NOT NULL,
	CONSTRAINT "business_hours_range" CHECK ("app"."business_hours"."weekday" BETWEEN 0 AND 6 AND "app"."business_hours"."start_minute">=0 AND "app"."business_hours"."end_minute"<=1440 AND "app"."business_hours"."start_minute"<"app"."business_hours"."end_minute")
);
--> statement-breakpoint
CREATE TABLE "app"."business_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'owner' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "membership_business_user" UNIQUE("business_id","user_id"),
	CONSTRAINT "membership_owner" CHECK ("app"."business_memberships"."role"='owner')
);
--> statement-breakpoint
CREATE TABLE "app"."businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"audience" text NOT NULL,
	"city" text NOT NULL,
	"district" text,
	"public_address" text,
	"public_phone" text,
	"state" text DEFAULT 'draft' NOT NULL,
	"timezone" text DEFAULT 'Asia/Tehran' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"hours_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_state" CHECK ("app"."businesses"."state" = 'draft'),
	CONSTRAINT "business_timezone" CHECK ("app"."businesses"."timezone" = 'Asia/Tehran'),
	CONSTRAINT "business_audience" CHECK ("app"."businesses"."audience" IN ('men','women')),
	CONSTRAINT "business_name" CHECK (char_length(trim("app"."businesses"."name")) BETWEEN 2 AND 120),
	CONSTRAINT "business_city" CHECK (char_length(trim("app"."businesses"."city")) BETWEEN 2 AND 80),
	CONSTRAINT "business_versions" CHECK ("app"."businesses"."version">0 AND "app"."businesses"."hours_version">0)
);
--> statement-breakpoint
CREATE TABLE "app"."exception_intervals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"exception_id" uuid NOT NULL,
	"start_minute" integer NOT NULL,
	"end_minute" integer NOT NULL,
	CONSTRAINT "exception_interval_range" CHECK ("app"."exception_intervals"."start_minute">=0 AND "app"."exception_intervals"."end_minute"<=1440 AND "app"."exception_intervals"."start_minute"<"app"."exception_intervals"."end_minute")
);
--> statement-breakpoint
CREATE TABLE "app"."management_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"action" text NOT NULL,
	"target_id" uuid,
	"request_id" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."management_writes" (
	"actor_id" uuid NOT NULL,
	"operation" text NOT NULL,
	"key" text NOT NULL,
	"fingerprint" text NOT NULL,
	"response" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cache_expires_at" timestamp with time zone DEFAULT now()+interval '7 days' NOT NULL,
	CONSTRAINT "management_writes_actor_id_operation_key_pk" PRIMARY KEY("actor_id","operation","key")
);
--> statement-breakpoint
CREATE TABLE "app"."schedule_exceptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"staff_id" uuid,
	"local_date" date NOT NULL,
	"closed" boolean NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exception_tenant_id" UNIQUE("business_id","id"),
	CONSTRAINT "exception_version" CHECK ("app"."schedule_exceptions"."version">0)
);
--> statement-breakpoint
CREATE TABLE "app"."services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"price_irr" bigint NOT NULL,
	"duration_minutes" integer NOT NULL,
	"buffer_before_minutes" integer NOT NULL,
	"buffer_after_minutes" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "services_tenant_id" UNIQUE("business_id","id"),
	CONSTRAINT "service_price" CHECK ("app"."services"."price_irr" BETWEEN 0 AND 10000000000 AND "app"."services"."price_irr"%10=0),
	CONSTRAINT "service_duration" CHECK ("app"."services"."duration_minutes" BETWEEN 1 AND 720 AND "app"."services"."buffer_before_minutes" BETWEEN 0 AND 240 AND "app"."services"."buffer_after_minutes" BETWEEN 0 AND 240 AND "app"."services"."duration_minutes"+"app"."services"."buffer_before_minutes"+"app"."services"."buffer_after_minutes"<=1440),
	CONSTRAINT "service_name" CHECK (char_length(trim("app"."services"."name")) BETWEEN 2 AND 120),
	CONSTRAINT "service_version" CHECK ("app"."services"."version">0)
);
--> statement-breakpoint
CREATE TABLE "app"."staff_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"staff_id" uuid NOT NULL,
	"weekday" integer NOT NULL,
	"start_minute" integer NOT NULL,
	"end_minute" integer NOT NULL,
	CONSTRAINT "staff_hours_range" CHECK ("app"."staff_hours"."weekday" BETWEEN 0 AND 6 AND "app"."staff_hours"."start_minute">=0 AND "app"."staff_hours"."end_minute"<=1440 AND "app"."staff_hours"."start_minute"<"app"."staff_hours"."end_minute")
);
--> statement-breakpoint
CREATE TABLE "app"."staff_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"hours_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_tenant_id" UNIQUE("business_id","id"),
	CONSTRAINT "staff_name" CHECK (char_length(trim("app"."staff_profiles"."display_name")) BETWEEN 2 AND 80),
	CONSTRAINT "staff_versions" CHECK ("app"."staff_profiles"."version">0 AND "app"."staff_profiles"."hours_version">0)
);
--> statement-breakpoint
CREATE TABLE "app"."staff_services" (
	"business_id" uuid NOT NULL,
	"staff_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	CONSTRAINT "staff_services_business_id_staff_id_service_id_pk" PRIMARY KEY("business_id","staff_id","service_id")
);
--> statement-breakpoint
ALTER TABLE "app"."sessions" ADD COLUMN "mfa_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."sessions" ADD COLUMN "mfa_last_active_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."mfa_enrollments" ADD CONSTRAINT "mfa_enrollments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."mfa_enrollments" ADD CONSTRAINT "mfa_enrollments_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "app"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."mfa_factors" ADD CONSTRAINT "mfa_factors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."reauthentication_grants" ADD CONSTRAINT "reauthentication_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."reauthentication_grants" ADD CONSTRAINT "reauthentication_grants_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "app"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."mfa_recovery_codes" ADD CONSTRAINT "mfa_recovery_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."business_hours" ADD CONSTRAINT "business_hours_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "app"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."business_memberships" ADD CONSTRAINT "business_memberships_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "app"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."business_memberships" ADD CONSTRAINT "business_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."exception_intervals" ADD CONSTRAINT "exception_intervals_business_id_exception_id_schedule_exceptions_business_id_id_fk" FOREIGN KEY ("business_id","exception_id") REFERENCES "app"."schedule_exceptions"("business_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."management_audit" ADD CONSTRAINT "management_audit_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."management_audit" ADD CONSTRAINT "management_audit_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "app"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."management_writes" ADD CONSTRAINT "management_writes_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."schedule_exceptions" ADD CONSTRAINT "schedule_exceptions_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "app"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."schedule_exceptions" ADD CONSTRAINT "schedule_exceptions_business_id_staff_id_staff_profiles_business_id_id_fk" FOREIGN KEY ("business_id","staff_id") REFERENCES "app"."staff_profiles"("business_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."services" ADD CONSTRAINT "services_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "app"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."staff_hours" ADD CONSTRAINT "staff_hours_business_id_staff_id_staff_profiles_business_id_id_fk" FOREIGN KEY ("business_id","staff_id") REFERENCES "app"."staff_profiles"("business_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."staff_profiles" ADD CONSTRAINT "staff_profiles_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "app"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."staff_services" ADD CONSTRAINT "staff_services_business_id_staff_id_staff_profiles_business_id_id_fk" FOREIGN KEY ("business_id","staff_id") REFERENCES "app"."staff_profiles"("business_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."staff_services" ADD CONSTRAINT "staff_services_business_id_service_id_services_business_id_id_fk" FOREIGN KEY ("business_id","service_id") REFERENCES "app"."services"("business_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reauthentication_expiry_idx" ON "app"."reauthentication_grants" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "membership_user_idx" ON "app"."business_memberships" USING btree ("user_id","active");--> statement-breakpoint
CREATE INDEX "management_audit_business_idx" ON "app"."management_audit" USING btree ("business_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "salon_exception_day" ON "app"."schedule_exceptions" USING btree ("business_id","local_date") WHERE "app"."schedule_exceptions"."staff_id" IS NULL AND "app"."schedule_exceptions"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "staff_exception_day" ON "app"."schedule_exceptions" USING btree ("business_id","staff_id","local_date") WHERE "app"."schedule_exceptions"."staff_id" IS NOT NULL AND "app"."schedule_exceptions"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "exception_dates_idx" ON "app"."schedule_exceptions" USING btree ("business_id","local_date");--> statement-breakpoint
CREATE INDEX "services_list_idx" ON "app"."services" USING btree ("business_id","active","created_at","id");--> statement-breakpoint
CREATE INDEX "staff_list_idx" ON "app"."staff_profiles" USING btree ("business_id","active","created_at","id");
--> statement-breakpoint
ALTER TABLE app.business_hours ADD CONSTRAINT business_hours_no_overlap EXCLUDE USING gist
 (business_id WITH =, weekday WITH =, int4range(start_minute,end_minute,'[)') WITH &&);
--> statement-breakpoint
ALTER TABLE app.staff_hours ADD CONSTRAINT staff_hours_no_overlap EXCLUDE USING gist
 (business_id WITH =, staff_id WITH =, weekday WITH =, int4range(start_minute,end_minute,'[)') WITH &&);
--> statement-breakpoint
ALTER TABLE app.exception_intervals ADD CONSTRAINT exception_intervals_no_overlap EXCLUDE USING gist
 (business_id WITH =, exception_id WITH =, int4range(start_minute,end_minute,'[)') WITH &&);
--> statement-breakpoint
CREATE FUNCTION app.check_exception_intervals() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid; is_closed boolean; removed timestamptz; interval_count integer;
BEGIN
 IF TG_TABLE_NAME='schedule_exceptions' THEN target:=NEW.id;
 ELSE target:=COALESCE(NEW.exception_id,OLD.exception_id); END IF;
 SELECT closed,deleted_at INTO is_closed,removed FROM app.schedule_exceptions WHERE id=target FOR UPDATE;
 IF NOT FOUND OR removed IS NOT NULL THEN RETURN NULL; END IF;
 SELECT count(*) INTO interval_count FROM app.exception_intervals WHERE exception_id=target;
 IF (is_closed AND interval_count<>0) OR (NOT is_closed AND (interval_count<1 OR interval_count>4)) THEN
  RAISE EXCEPTION 'Invalid exception intervals' USING ERRCODE='23514';
 END IF;
 RETURN NULL;
END $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER exception_intervals_consistent AFTER INSERT OR UPDATE ON app.schedule_exceptions
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION app.check_exception_intervals();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER exception_children_consistent AFTER INSERT OR UPDATE OR DELETE ON app.exception_intervals
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION app.check_exception_intervals();
--> statement-breakpoint
CREATE FUNCTION app.prevent_management_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Audit is append only' USING ERRCODE='23514'; END $$;
--> statement-breakpoint
CREATE TRIGGER management_audit_immutable BEFORE UPDATE OR DELETE ON app.management_audit
 FOR EACH ROW EXECUTE FUNCTION app.prevent_management_audit_mutation();
