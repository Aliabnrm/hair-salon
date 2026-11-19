CREATE TABLE "app"."schedule_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"staff_id" uuid NOT NULL,
	"staff_name" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"reason" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"released_at" timestamp with time zone,
	"release_reason" text,
	"created_by" uuid NOT NULL,
	"released_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "block_tenant_id" UNIQUE("business_id","staff_id","id"),
	CONSTRAINT "block_valid" CHECK ("app"."schedule_blocks"."ends_at">"app"."schedule_blocks"."starts_at" AND "app"."schedule_blocks"."ends_at"<="app"."schedule_blocks"."starts_at"+interval '24 hours' AND char_length(trim("app"."schedule_blocks"."reason")) BETWEEN 3 AND 300 AND "app"."schedule_blocks"."version">0),
	CONSTRAINT "block_release" CHECK (("app"."schedule_blocks"."released_at" IS NULL AND "app"."schedule_blocks"."release_reason" IS NULL AND "app"."schedule_blocks"."released_by" IS NULL AND "app"."schedule_blocks"."version"=1) OR ("app"."schedule_blocks"."released_at" IS NOT NULL AND "app"."schedule_blocks"."release_reason" IS NOT NULL AND char_length(trim("app"."schedule_blocks"."release_reason")) BETWEEN 3 AND 300 AND "app"."schedule_blocks"."released_by" IS NOT NULL AND "app"."schedule_blocks"."version"=2))
);
--> statement-breakpoint
ALTER TABLE "app"."appointments" DROP CONSTRAINT "appointment_state";--> statement-breakpoint
ALTER TABLE "app"."appointments" DROP CONSTRAINT "appointment_cancellation";--> statement-breakpoint
ALTER TABLE "app"."booking_events" DROP CONSTRAINT "booking_event_action";--> statement-breakpoint
ALTER TABLE "app"."booking_writes" ALTER COLUMN "appointment_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE app.schedule_allocations DROP CONSTRAINT schedule_allocations_pkey;
--> statement-breakpoint
ALTER TABLE "app"."schedule_allocations" ALTER COLUMN "appointment_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."booking_writes" ADD COLUMN "block_id" uuid;--> statement-breakpoint
ALTER TABLE "app"."schedule_allocations" ADD COLUMN "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."schedule_allocations" ADD COLUMN "block_id" uuid;--> statement-breakpoint
ALTER TABLE "app"."schedule_blocks" ADD CONSTRAINT "schedule_blocks_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "app"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."schedule_blocks" ADD CONSTRAINT "schedule_blocks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."schedule_blocks" ADD CONSTRAINT "schedule_blocks_released_by_users_id_fk" FOREIGN KEY ("released_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."schedule_blocks" ADD CONSTRAINT "schedule_blocks_business_id_staff_id_staff_profiles_business_id_id_fk" FOREIGN KEY ("business_id","staff_id") REFERENCES "app"."staff_profiles"("business_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "blocks_agenda_idx" ON "app"."schedule_blocks" USING btree ("business_id","starts_at","id");--> statement-breakpoint
ALTER TABLE "app"."booking_writes" ADD CONSTRAINT "booking_writes_block_id_schedule_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "app"."schedule_blocks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."schedule_allocations" ADD CONSTRAINT "schedule_allocations_business_id_staff_id_block_id_schedule_blocks_business_id_staff_id_id_fk" FOREIGN KEY ("business_id","staff_id","block_id") REFERENCES "app"."schedule_blocks"("business_id","staff_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."schedule_allocations" ADD CONSTRAINT "schedule_allocations_appointment_id_unique" UNIQUE("appointment_id");--> statement-breakpoint
ALTER TABLE "app"."schedule_allocations" ADD CONSTRAINT "schedule_allocations_block_id_unique" UNIQUE("block_id");--> statement-breakpoint
ALTER TABLE "app"."appointments" ADD CONSTRAINT "appointment_state" CHECK ("app"."appointments"."status" IN ('confirmed','cancelled','completed','no_show') AND "app"."appointments"."source" IN ('online','manual') AND "app"."appointments"."version">0 AND "app"."appointments"."ends_at">"app"."appointments"."starts_at");--> statement-breakpoint
ALTER TABLE "app"."appointments" ADD CONSTRAINT "appointment_cancellation" CHECK (("app"."appointments"."status"='cancelled' AND "app"."appointments"."cancelled_at" IS NOT NULL AND char_length(trim("app"."appointments"."cancellation_reason")) BETWEEN 3 AND 300) OR ("app"."appointments"."status"<>'cancelled' AND "app"."appointments"."cancelled_at" IS NULL AND "app"."appointments"."cancellation_reason" IS NULL));--> statement-breakpoint
ALTER TABLE "app"."booking_events" ADD CONSTRAINT "booking_event_action" CHECK ("app"."booking_events"."action" IN ('created','cancelled','rescheduled','outcome','corrected'));--> statement-breakpoint
ALTER TABLE "app"."booking_writes" ADD CONSTRAINT "booking_write_source" CHECK (("app"."booking_writes"."appointment_id" IS NOT NULL)::integer+("app"."booking_writes"."block_id" IS NOT NULL)::integer=1);--> statement-breakpoint
ALTER TABLE "app"."schedule_allocations" ADD CONSTRAINT "allocation_source" CHECK (("app"."schedule_allocations"."appointment_id" IS NOT NULL)::integer+("app"."schedule_allocations"."block_id" IS NOT NULL)::integer=1);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.check_booking_ledger() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid; a app.appointments%ROWTYPE; n integer; e app.booking_events%ROWTYPE;
BEGIN
 IF TG_TABLE_NAME='appointments' THEN target:=COALESCE(NEW.id,OLD.id);
 ELSE target:=COALESCE(NEW.appointment_id,OLD.appointment_id); END IF;
 IF target IS NULL THEN RETURN NULL; END IF;
 SELECT * INTO a FROM app.appointments WHERE id=target;
 IF NOT FOUND THEN RAISE EXCEPTION 'appointment history required' USING ERRCODE='23514'; END IF;
 SELECT count(*) INTO n FROM app.schedule_allocations l WHERE l.appointment_id=a.id
 AND l.business_id=a.business_id AND l.staff_id=a.staff_id
 AND l.occupied_start=a.starts_at-make_interval(mins=>(a.snapshot->>'buffer_before_minutes')::integer)
 AND l.occupied_end=a.ends_at+make_interval(mins=>(a.snapshot->>'buffer_after_minutes')::integer)
 AND ((a.status<>'cancelled' AND l.released_at IS NULL) OR (a.status='cancelled' AND l.released_at=a.cancelled_at));
 SELECT * INTO e FROM app.booking_events WHERE appointment_id=a.id AND version=a.version;
 IF n<>1 OR e.appointment_id IS NULL OR
    (a.status='cancelled' AND e.action<>'cancelled') OR
    (a.status IN ('completed','no_show') AND (e.action NOT IN ('outcome','corrected') OR e.details->>'status_after' IS DISTINCT FROM a.status)) OR
    (a.status='confirmed' AND e.action<>'corrected' AND ((a.version=1 AND e.action<>'created') OR (a.version>1 AND (e.action<>'rescheduled' OR NOT app.booking_moment_matches(e.details->'after',a))))) OR
    (e.action IN ('outcome','corrected') AND e.details->>'status_after' IS DISTINCT FROM a.status) OR
    EXISTS(SELECT 1 FROM app.booking_events WHERE appointment_id=a.id AND version>a.version)
 THEN RAISE EXCEPTION 'booking ledger mismatch' USING ERRCODE='23514'; END IF;
 RETURN NULL;
END $$;
CREATE OR REPLACE FUNCTION app.freeze_booking_history() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE e app.booking_events%ROWTYPE;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'booking history immutable' USING ERRCODE='23514'; END IF;
 IF TG_TABLE_NAME='appointments' THEN
  SELECT * INTO e FROM app.booking_events WHERE appointment_id=OLD.id AND version=NEW.version;
  IF e.action IN ('outcome','corrected') THEN
   IF OLD.status='cancelled' OR NEW.status NOT IN ('confirmed','completed','no_show') OR OLD.status=NEW.status OR NEW.version<>OLD.version+1
    OR (to_jsonb(NEW)-ARRAY['status','version']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','version'])
    OR e.details->>'status_before' IS DISTINCT FROM OLD.status OR e.details->>'status_after' IS DISTINCT FROM NEW.status
    OR (OLD.status='confirmed' AND (e.action<>'outcome' OR NEW.status='confirmed'))
    OR (OLD.status<>'confirmed' AND (e.action<>'corrected' OR COALESCE(char_length(trim(e.reason)),0) NOT BETWEEN 3 AND 300))
    OR NOT EXISTS(SELECT 1 FROM app.business_memberships m WHERE m.business_id=OLD.business_id AND m.user_id=e.actor_id AND m.active AND m.role='owner')
   THEN RAISE EXCEPTION 'booking outcome mismatch' USING ERRCODE='23514'; END IF;
   RETURN NEW;
  END IF;
  IF OLD.status<>'confirmed' OR NEW.version<>OLD.version+1
  THEN RAISE EXCEPTION 'invalid booking transition' USING ERRCODE='23514'; END IF;
  IF NEW.status='cancelled' THEN
   IF (to_jsonb(NEW)-ARRAY['status','version','cancelled_at','cancellation_reason']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','version','cancelled_at','cancellation_reason'])
   THEN RAISE EXCEPTION 'booking snapshot immutable' USING ERRCODE='23514'; END IF;
  ELSIF NEW.status='confirmed' THEN
   SELECT * INTO e FROM app.booking_events WHERE appointment_id=OLD.id AND version=NEW.version;
   IF (to_jsonb(NEW)-ARRAY['starts_at','ends_at','staff_id','snapshot','version']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['starts_at','ends_at','staff_id','snapshot','version'])
    OR (NEW.snapshot-'staff_name') IS DISTINCT FROM (OLD.snapshot-'staff_name')
    OR (NEW.starts_at,NEW.staff_id) IS NOT DISTINCT FROM (OLD.starts_at,OLD.staff_id)
    OR e.appointment_id IS NULL OR e.action<>'rescheduled' OR e.actor_id IS DISTINCT FROM OLD.booking_user_id
    OR NOT app.booking_moment_matches(e.details->'before',OLD) OR NOT app.booking_moment_matches(e.details->'after',NEW)
   THEN RAISE EXCEPTION 'booking reschedule mismatch' USING ERRCODE='23514'; END IF;
  ELSE RAISE EXCEPTION 'invalid booking transition' USING ERRCODE='23514'; END IF;
 ELSIF TG_TABLE_NAME='schedule_allocations' THEN
  IF OLD.block_id IS NOT NULL THEN
   IF (to_jsonb(NEW)-'released_at'-'occupied_range') IS DISTINCT FROM (to_jsonb(OLD)-'released_at'-'occupied_range') OR OLD.released_at IS NOT NULL OR NEW.released_at IS NULL
   THEN RAISE EXCEPTION 'block allocation immutable' USING ERRCODE='23514'; END IF;
   RETURN NEW;
  END IF;
  IF (to_jsonb(NEW)-ARRAY['staff_id','occupied_start','occupied_end','released_at','occupied_range']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['staff_id','occupied_start','occupied_end','released_at','occupied_range']) OR OLD.released_at IS NOT NULL
  THEN RAISE EXCEPTION 'allocation immutable' USING ERRCODE='23514'; END IF;
  IF NEW.released_at IS NOT NULL THEN
   IF (NEW.staff_id,NEW.occupied_start,NEW.occupied_end) IS DISTINCT FROM (OLD.staff_id,OLD.occupied_start,OLD.occupied_end)
   THEN RAISE EXCEPTION 'allocation release mismatch' USING ERRCODE='23514'; END IF;
  ELSIF NOT EXISTS(SELECT 1 FROM app.appointments a JOIN app.booking_events h ON h.appointment_id=a.id AND h.version=a.version
    WHERE a.id=NEW.appointment_id AND a.status='confirmed' AND h.action='rescheduled' AND a.staff_id=NEW.staff_id
    AND (h.details->'before'->>'staff_id')::uuid=OLD.staff_id
    AND (h.details->'before'->>'starts_at')::timestamptz-make_interval(mins=>(a.snapshot->>'buffer_before_minutes')::integer)=OLD.occupied_start
    AND (h.details->'before'->>'ends_at')::timestamptz+make_interval(mins=>(a.snapshot->>'buffer_after_minutes')::integer)=OLD.occupied_end)
  THEN RAISE EXCEPTION 'allocation reschedule mismatch' USING ERRCODE='23514'; END IF;
 ELSE RAISE EXCEPTION 'booking event immutable' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;

--> statement-breakpoint
CREATE FUNCTION app.check_block_ledger() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid; b app.schedule_blocks%ROWTYPE; n integer;
BEGIN
 IF TG_TABLE_NAME='schedule_blocks' THEN target:=COALESCE(NEW.id,OLD.id); ELSE target:=COALESCE(NEW.block_id,OLD.block_id); END IF;
 IF target IS NULL THEN RETURN NULL; END IF;
 SELECT * INTO b FROM app.schedule_blocks WHERE id=target;
 IF NOT FOUND THEN RAISE EXCEPTION 'block required' USING ERRCODE='23514'; END IF;
 SELECT count(*) INTO n FROM app.schedule_allocations l WHERE l.block_id=b.id AND l.business_id=b.business_id AND l.staff_id=b.staff_id
 AND l.occupied_start=b.starts_at AND l.occupied_end=b.ends_at AND l.released_at IS NOT DISTINCT FROM b.released_at;
 IF n<>1 THEN RAISE EXCEPTION 'block ledger mismatch' USING ERRCODE='23514'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER block_ledger AFTER INSERT OR UPDATE OR DELETE ON app.schedule_blocks DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION app.check_block_ledger();
CREATE CONSTRAINT TRIGGER block_allocation_ledger AFTER INSERT OR UPDATE OR DELETE ON app.schedule_allocations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION app.check_block_ledger();
CREATE FUNCTION app.freeze_block() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'block history immutable' USING ERRCODE='23514'; END IF;
 IF OLD.released_at IS NOT NULL OR NEW.released_at IS NULL OR NEW.version<>OLD.version+1
 OR (to_jsonb(NEW)-ARRAY['version','released_at','release_reason','released_by']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['version','released_at','release_reason','released_by'])
 THEN RAISE EXCEPTION 'block history immutable' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER freeze_block BEFORE UPDATE OR DELETE ON app.schedule_blocks FOR EACH ROW EXECUTE FUNCTION app.freeze_block();
