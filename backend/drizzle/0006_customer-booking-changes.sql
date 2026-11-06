ALTER TABLE "app"."booking_events" DROP CONSTRAINT "booking_event_action";--> statement-breakpoint
ALTER TABLE "app"."booking_events" ADD COLUMN "details" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."booking_events" ADD CONSTRAINT "booking_event_action" CHECK ("app"."booking_events"."action" IN ('created','cancelled','rescheduled'));
--> statement-breakpoint
-- A staff change updates both rows in one transaction. Exclusion remains immediate.
ALTER TABLE app.schedule_allocations ALTER CONSTRAINT schedule_allocations_business_id_staff_id_appointment_id_appointments_business_id_staff_id_id_fk DEFERRABLE INITIALLY DEFERRED;
CREATE FUNCTION app.booking_moment_matches(moment jsonb, a app.appointments) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
 SELECT COALESCE(jsonb_typeof(moment)='object'
 AND (moment->>'starts_at')::timestamptz=a.starts_at AND (moment->>'ends_at')::timestamptz=a.ends_at
 AND (moment->>'staff_id')::uuid=a.staff_id AND moment->>'staff_name'=a.snapshot->>'staff_name',false)
$$;
CREATE OR REPLACE FUNCTION app.check_booking_ledger() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid; a app.appointments%ROWTYPE; n integer; e app.booking_events%ROWTYPE;
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
 SELECT * INTO e FROM app.booking_events WHERE appointment_id=a.id AND version=a.version;
 IF n<>1 OR e.appointment_id IS NULL OR
    (a.status='cancelled' AND e.action<>'cancelled') OR
    (a.status='confirmed' AND ((a.version=1 AND e.action<>'created') OR (a.version>1 AND (e.action<>'rescheduled' OR NOT app.booking_moment_matches(e.details->'after',a))))) OR
    EXISTS(SELECT 1 FROM app.booking_events WHERE appointment_id=a.id AND version>a.version)
 THEN RAISE EXCEPTION 'booking ledger mismatch' USING ERRCODE='23514'; END IF;
 RETURN NULL;
END $$;
CREATE OR REPLACE FUNCTION app.freeze_booking_history() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE e app.booking_events%ROWTYPE;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'booking history immutable' USING ERRCODE='23514'; END IF;
 IF TG_TABLE_NAME='appointments' THEN
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
