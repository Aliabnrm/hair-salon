import type { Pool, PoolClient } from 'pg';
import { notFound } from '../../../../common/domain/capability-error.js';
import type { AvailabilityQuery } from '../../domain/availability/availability.types.js';
import type { ScheduleInventory } from '../../domain/availability/schedule-inventory.types.js';
export const availabilitySnapshotSql = `
WITH eligible AS (
 SELECT st.id,st.display_name FROM app.staff_profiles st
 JOIN app.staff_services ss ON ss.business_id=st.business_id AND ss.staff_id=st.id
 WHERE st.business_id=$1 AND ss.service_id=$2 AND st.active AND ($6::text<>'public' OR st.public_visible)
 AND ($3::uuid IS NULL OR st.id=$3)
)
SELECT jsonb_build_object(
 'business_id',b.id,'timezone',b.timezone,'business_name',b.name,'business_address',b.public_address,'business_phone',b.public_phone,
 'service',jsonb_build_object('id',s.id,'name',s.name,'price_irr',s.price_irr,
   'version',s.version,'duration_minutes',s.duration_minutes,'buffer_before_minutes',s.buffer_before_minutes,'buffer_after_minutes',s.buffer_after_minutes),
 'hours',COALESCE((SELECT jsonb_agg(jsonb_build_object('weekday',h.weekday,'start_local',to_char(make_interval(mins=>h.start_minute),'HH24:MI'),
   'end_local',CASE WHEN h.end_minute=1440 THEN '24:00' ELSE to_char(make_interval(mins=>h.end_minute),'HH24:MI') END)) FROM app.business_hours h WHERE h.business_id=b.id),'[]'::jsonb),
 'staff',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',st.id,'name',st.display_name,'hours',COALESCE((
   SELECT jsonb_agg(jsonb_build_object('weekday',h.weekday,'start_local',to_char(make_interval(mins=>h.start_minute),'HH24:MI'),
   'end_local',CASE WHEN h.end_minute=1440 THEN '24:00' ELSE to_char(make_interval(mins=>h.end_minute),'HH24:MI') END))
   FROM app.staff_hours h WHERE h.business_id=b.id AND h.staff_id=st.id),'[]'::jsonb)) ORDER BY st.id) FROM eligible st),'[]'::jsonb),
 'exceptions',COALESCE((SELECT jsonb_agg(jsonb_build_object('local_date',e.local_date,'staff_id',e.staff_id,'closed',e.closed,
   'intervals',COALESCE((SELECT jsonb_agg(jsonb_build_object('start_local',to_char(make_interval(mins=>i.start_minute),'HH24:MI'),
   'end_local',CASE WHEN i.end_minute=1440 THEN '24:00' ELSE to_char(make_interval(mins=>i.end_minute),'HH24:MI') END))
   FROM app.exception_intervals i WHERE i.business_id=b.id AND i.exception_id=e.id),'[]'::jsonb)))
   FROM app.schedule_exceptions e WHERE e.business_id=b.id AND e.deleted_at IS NULL
   AND e.local_date BETWEEN $4::date AND $5::date AND (e.staff_id IS NULL OR e.staff_id IN (SELECT id FROM eligible))),'[]'::jsonb)
,
 'busy',COALESCE((SELECT jsonb_agg(jsonb_build_object('staff_id',a.staff_id,'start',a.occupied_start,'end',a.occupied_end))
 FROM app.schedule_allocations a WHERE a.business_id=b.id AND a.released_at IS NULL
 AND a.occupied_start < (($5::date+1)::timestamp AT TIME ZONE 'Asia/Tehran')
 AND a.occupied_end > ($4::date::timestamp AT TIME ZONE 'Asia/Tehran')),'[]'::jsonb)
) AS snapshot
FROM app.businesses b JOIN app.services s ON s.business_id=b.id AND s.id=$2 AND ($6::text='existing' OR s.active)
LEFT JOIN app.service_categories c ON c.id=s.category_id AND ($6::text='existing' OR c.active)
WHERE ($6::text='existing' OR c.active) AND b.id=$1 AND ($6::text<>'public' OR b.state='published') AND ($3::uuid IS NULL OR EXISTS(SELECT 1 FROM eligible))`;

export async function readSchedule(
  db: Pool | PoolClient,
  business: string,
  query: AvailabilityQuery,
  mode: 'public' | 'manual' | 'existing' = 'public',
): Promise<ScheduleInventory> {
  const r = await db.query<{ snapshot: ScheduleInventory }>(availabilitySnapshotSql, [
    business,
    query.service_id,
    query.staff_id === 'any' ? null : query.staff_id,
    query.from,
    query.to,
    mode,
  ]);
  return r.rows[0]?.snapshot ?? notFound();
}
