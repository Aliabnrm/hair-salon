import type { Pool, PoolClient } from 'pg';
import { notFound } from '../../../../common/domain/capability-error.js';
import type { PublicProfile } from '../../domain/publication.types.js';
// One statement means state and every nested public field share the same PostgreSQL snapshot.
export const publicProfileSql = `jsonb_build_object(
 'id',b.id,'name',b.name,'description',b.description,'audience',b.audience,'city',b.city,'district',b.district,
 'public_address',b.public_address,'public_phone',b.public_phone,'timezone',b.timezone,
 'services',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'category_id',(SELECT c.id FROM app.service_categories c WHERE c.id=s.category_id AND c.active),'price_irr',s.price_irr,'duration_minutes',s.duration_minutes) ORDER BY s.created_at,s.id) FROM app.services s WHERE s.business_id=b.id AND s.active),'[]'::jsonb),
 'staff',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',st.id,'display_name',st.display_name,
 'service_ids',COALESCE((SELECT jsonb_agg(ss.service_id ORDER BY ss.service_id) FROM app.staff_services ss JOIN app.services s ON s.business_id=ss.business_id AND s.id=ss.service_id AND s.active WHERE ss.business_id=b.id AND ss.staff_id=st.id),'[]'::jsonb),
 'hours',COALESCE((SELECT jsonb_agg(jsonb_build_object('weekday',h.weekday,'start_local',to_char(make_interval(mins=>h.start_minute),'HH24:MI'),'end_local',CASE WHEN h.end_minute=1440 THEN '24:00' ELSE to_char(make_interval(mins=>h.end_minute),'HH24:MI') END) ORDER BY h.weekday,h.start_minute) FROM app.staff_hours h WHERE h.business_id=b.id AND h.staff_id=st.id),'[]'::jsonb)) ORDER BY st.created_at,st.id) FROM app.staff_profiles st WHERE st.business_id=b.id AND st.active AND st.public_visible),'[]'::jsonb),
 'hours',COALESCE((SELECT jsonb_agg(jsonb_build_object('weekday',h.weekday,'start_local',to_char(make_interval(mins=>h.start_minute),'HH24:MI'),'end_local',CASE WHEN h.end_minute=1440 THEN '24:00' ELSE to_char(make_interval(mins=>h.end_minute),'HH24:MI') END) ORDER BY h.weekday,h.start_minute) FROM app.business_hours h WHERE h.business_id=b.id),'[]'::jsonb),
 'exceptions',COALESCE((SELECT jsonb_agg(jsonb_build_object('local_date',e.local_date,'staff_id',e.staff_id,'closed',e.closed,'intervals',COALESCE((SELECT jsonb_agg(jsonb_build_object('start_local',to_char(make_interval(mins=>i.start_minute),'HH24:MI'),'end_local',CASE WHEN i.end_minute=1440 THEN '24:00' ELSE to_char(make_interval(mins=>i.end_minute),'HH24:MI') END) ORDER BY i.start_minute) FROM app.exception_intervals i WHERE i.business_id=b.id AND i.exception_id=e.id),'[]'::jsonb)) ORDER BY e.local_date,e.id) FROM app.schedule_exceptions e WHERE e.business_id=b.id AND e.deleted_at IS NULL AND e.local_date BETWEEN (now() AT TIME ZONE 'Asia/Tehran')::date AND (now() AT TIME ZONE 'Asia/Tehran')::date+92 AND (e.staff_id IS NULL OR EXISTS(SELECT 1 FROM app.staff_profiles st WHERE st.business_id=b.id AND st.id=e.staff_id AND st.active AND st.public_visible))),'[]'::jsonb))`;
export async function readProfile(
  db: Pool | PoolClient,
  business: string,
  publicOnly = false,
): Promise<PublicProfile> {
  const r = await db.query<{ profile: PublicProfile }>(
    `SELECT ${publicProfileSql} AS profile FROM app.businesses b WHERE b.id=$1 ${publicOnly ? "AND b.state='published'" : ''}`,
    [business],
  );
  return r.rows[0]?.profile ?? notFound();
}
