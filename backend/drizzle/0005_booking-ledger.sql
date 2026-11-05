CREATE TABLE "app"."appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"staff_id" uuid NOT NULL,
	"booking_user_id" uuid,
	"created_by" uuid NOT NULL,
	"code" text NOT NULL,
	"source" text NOT NULL,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"snapshot" jsonb NOT NULL,
	"cancellation_reason" text,
	"cancelled_at" timestamp with time zone,
	"notice_override_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointments_code_unique" UNIQUE("code"),
	CONSTRAINT "appointment_tenant_id" UNIQUE("business_id","staff_id","id"),
	CONSTRAINT "appointment_state" CHECK ("app"."appointments"."status" IN ('confirmed','cancelled') AND "app"."appointments"."source" IN ('online','manual') AND "app"."appointments"."version">0 AND "app"."appointments"."ends_at">"app"."appointments"."starts_at"),
	CONSTRAINT "appointment_customer" CHECK (("app"."appointments"."source"='online' AND "app"."appointments"."booking_user_id"="app"."appointments"."created_by") OR ("app"."appointments"."source"='manual' AND "app"."appointments"."booking_user_id" IS NULL)),
	CONSTRAINT "appointment_cancellation" CHECK (("app"."appointments"."status"='cancelled' AND "app"."appointments"."cancelled_at" IS NOT NULL AND char_length(trim("app"."appointments"."cancellation_reason")) BETWEEN 3 AND 300) OR ("app"."appointments"."status"='confirmed' AND "app"."appointments"."cancelled_at" IS NULL AND "app"."appointments"."cancellation_reason" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "app"."booking_events" (
	"appointment_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" text NOT NULL,
	"reason" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_events_appointment_id_version_pk" PRIMARY KEY("appointment_id","version"),
	CONSTRAINT "booking_event_action" CHECK ("app"."booking_events"."action" IN ('created','cancelled'))
);
--> statement-breakpoint
CREATE TABLE "app"."booking_writes" (
	"actor_id" uuid NOT NULL,
	"operation" text NOT NULL,
	"key" text NOT NULL,
	"fingerprint" text NOT NULL,
	"appointment_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_writes_actor_id_operation_key_pk" PRIMARY KEY("actor_id","operation","key")
);
--> statement-breakpoint
CREATE TABLE "app"."schedule_allocations" (
	"appointment_id" uuid PRIMARY KEY NOT NULL,
	"business_id" uuid NOT NULL,
	"staff_id" uuid NOT NULL,
	"occupied_start" timestamp with time zone NOT NULL,
	"occupied_end" timestamp with time zone NOT NULL,
	"released_at" timestamp with time zone,
	CONSTRAINT "allocation_range" CHECK ("app"."schedule_allocations"."occupied_start"<"app"."schedule_allocations"."occupied_end")
);
--> statement-breakpoint
ALTER TABLE "app"."appointments" ADD CONSTRAINT "appointments_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "app"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."appointments" ADD CONSTRAINT "appointments_booking_user_id_users_id_fk" FOREIGN KEY ("booking_user_id") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."appointments" ADD CONSTRAINT "appointments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."appointments" ADD CONSTRAINT "appointments_business_id_service_id_services_business_id_id_fk" FOREIGN KEY ("business_id","service_id") REFERENCES "app"."services"("business_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."appointments" ADD CONSTRAINT "appointments_business_id_staff_id_staff_profiles_business_id_id_fk" FOREIGN KEY ("business_id","staff_id") REFERENCES "app"."staff_profiles"("business_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."booking_events" ADD CONSTRAINT "booking_events_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "app"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."booking_events" ADD CONSTRAINT "booking_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."booking_writes" ADD CONSTRAINT "booking_writes_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."booking_writes" ADD CONSTRAINT "booking_writes_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "app"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."schedule_allocations" ADD CONSTRAINT "schedule_allocations_business_id_staff_id_appointment_id_appointments_business_id_staff_id_id_fk" FOREIGN KEY ("business_id","staff_id","appointment_id") REFERENCES "app"."appointments"("business_id","staff_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointments_agenda_idx" ON "app"."appointments" USING btree ("business_id","starts_at","id");--> statement-breakpoint
CREATE INDEX "appointments_customer_idx" ON "app"."appointments" USING btree ("booking_user_id","starts_at","id");--> statement-breakpoint
CREATE INDEX "appointments_active_idx" ON "app"."appointments" USING btree ("business_id","staff_id","starts_at") WHERE "app"."appointments"."status"='confirmed';
--> statement-breakpoint
ALTER TABLE app.schedule_allocations ADD COLUMN occupied_range tstzrange GENERATED ALWAYS AS (tstzrange(occupied_start,occupied_end,'[)')) STORED;
ALTER TABLE app.schedule_allocations ADD CONSTRAINT allocation_no_overlap EXCLUDE USING gist (business_id WITH =,staff_id WITH =,occupied_range WITH &&) WHERE (released_at IS NULL);
ALTER TABLE app.appointments ADD CONSTRAINT appointment_snapshot_valid CHECK (COALESCE(
 jsonb_typeof(snapshot)='object' AND jsonb_typeof(snapshot->'customer_name')='string' AND char_length(trim(snapshot->>'customer_name')) BETWEEN 2 AND 120
 AND snapshot->>'timezone'='Asia/Tehran'
 AND (snapshot->>'price_irr')::bigint BETWEEN 0 AND 10000000000 AND (snapshot->>'price_irr')::bigint%10=0
 AND (snapshot->>'duration_minutes')::integer BETWEEN 1 AND 720
 AND (snapshot->>'buffer_before_minutes')::integer BETWEEN 0 AND 240 AND (snapshot->>'buffer_after_minutes')::integer BETWEEN 0 AND 240
 AND ends_at=starts_at+make_interval(mins=>(snapshot->>'duration_minutes')::integer)
 AND ((source='online' AND booking_user_id IS NOT NULL AND (snapshot->>'customer_mobile') ~ '^09[0-9]{9}$') OR (source='manual' AND (snapshot->>'customer_mobile' IS NULL OR (snapshot->>'customer_mobile') ~ '^09[0-9]{9}$'))),false));
--> statement-breakpoint
CREATE FUNCTION app.check_booking_ledger() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid; a app.appointments%ROWTYPE; n integer;
BEGIN
 IF TG_TABLE_NAME='appointments' THEN target:=COALESCE(NEW.id,OLD.id);
 ELSE target:=COALESCE(NEW.appointment_id,OLD.appointment_id); END IF;
 SELECT * INTO a FROM app.appointments WHERE id=target;
 IF NOT FOUND THEN RAISE EXCEPTION 'appointment history required' USING ERRCODE='23514'; END IF;
 SELECT count(*) INTO n FROM app.schedule_allocations l WHERE l.appointment_id=a.id
 AND l.business_id=a.business_id AND l.staff_id=a.staff_id
 AND l.occupied_start=a.starts_at-make_interval(mins=>(a.snapshot->>'buffer_before_minutes')::integer)
 AND l.occupied_end=a.ends_at+make_interval(mins=>(a.snapshot->>'buffer_after_minutes')::integer)
 AND ((a.status='confirmed' AND l.released_at IS NULL) OR (a.status='cancelled' AND l.released_at=a.cancelled_at));
 IF n<>1 OR NOT EXISTS (SELECT 1 FROM app.booking_events e WHERE e.appointment_id=a.id AND e.version=a.version AND e.action=CASE a.status WHEN 'confirmed' THEN 'created' ELSE 'cancelled' END)
 THEN RAISE EXCEPTION 'booking ledger mismatch' USING ERRCODE='23514'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER appointment_ledger AFTER INSERT OR UPDATE OR DELETE ON app.appointments DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION app.check_booking_ledger();
CREATE CONSTRAINT TRIGGER allocation_ledger AFTER INSERT OR UPDATE OR DELETE ON app.schedule_allocations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION app.check_booking_ledger();
CREATE CONSTRAINT TRIGGER event_ledger AFTER INSERT OR UPDATE OR DELETE ON app.booking_events DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION app.check_booking_ledger();
--> statement-breakpoint
CREATE FUNCTION app.freeze_booking_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'booking history immutable' USING ERRCODE='23514'; END IF;
 IF TG_TABLE_NAME='appointments' THEN
  IF (to_jsonb(NEW)-ARRAY['status','version','cancelled_at','cancellation_reason']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','version','cancelled_at','cancellation_reason'])
    OR OLD.status<>'confirmed' OR NEW.status<>'cancelled' OR NEW.version<>OLD.version+1
  THEN RAISE EXCEPTION 'booking snapshot immutable' USING ERRCODE='23514'; END IF;
 ELSIF TG_TABLE_NAME='schedule_allocations' THEN
  IF (to_jsonb(NEW)-'released_at'-'occupied_range') IS DISTINCT FROM (to_jsonb(OLD)-'released_at'-'occupied_range') OR OLD.released_at IS NOT NULL OR NEW.released_at IS NULL
  THEN RAISE EXCEPTION 'allocation immutable' USING ERRCODE='23514'; END IF;
 ELSE RAISE EXCEPTION 'booking event immutable' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER freeze_appointment BEFORE UPDATE OR DELETE ON app.appointments FOR EACH ROW EXECUTE FUNCTION app.freeze_booking_history();
CREATE TRIGGER freeze_allocation BEFORE UPDATE OR DELETE ON app.schedule_allocations FOR EACH ROW EXECUTE FUNCTION app.freeze_booking_history();
CREATE TRIGGER freeze_booking_event BEFORE UPDATE OR DELETE ON app.booking_events FOR EACH ROW EXECUTE FUNCTION app.freeze_booking_history();
CREATE TRIGGER freeze_booking_write BEFORE UPDATE OR DELETE ON app.booking_writes FOR EACH ROW EXECUTE FUNCTION app.freeze_booking_history();
