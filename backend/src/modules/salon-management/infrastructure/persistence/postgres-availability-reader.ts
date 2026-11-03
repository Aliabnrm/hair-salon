import { Injectable } from '@nestjs/common';
import { DatabaseProvider } from '../../../../database/database.provider.js';
import { notFound } from '../../../../common/domain/capability-error.js';
import { AvailabilityReader } from '../../application/ports/availability-reader.js';
import type {
  AvailabilityQuery,
  AvailabilitySnapshot,
} from '../../domain/availability/availability.types.js';

// A single statement: publication, eligibility, buffers and every scope use one MVCC snapshot.
export const availabilitySnapshotSql = `
WITH eligible AS (
 SELECT st.id FROM app.staff_profiles st
 JOIN app.staff_services ss ON ss.business_id=st.business_id AND ss.staff_id=st.id
 WHERE st.business_id=$1 AND ss.service_id=$2 AND st.active AND st.public_visible
 AND ($3::uuid IS NULL OR st.id=$3)
)
SELECT jsonb_build_object(
 'business_id',b.id,'timezone',b.timezone,
 'service',jsonb_build_object('id',s.id,'name',s.name,'price_irr',s.price_irr,
   'duration_minutes',s.duration_minutes,'buffer_before_minutes',s.buffer_before_minutes,'buffer_after_minutes',s.buffer_after_minutes),
 'hours',COALESCE((SELECT jsonb_agg(jsonb_build_object('weekday',h.weekday,'start_local',to_char(make_interval(mins=>h.start_minute),'HH24:MI'),
   'end_local',CASE WHEN h.end_minute=1440 THEN '24:00' ELSE to_char(make_interval(mins=>h.end_minute),'HH24:MI') END)) FROM app.business_hours h WHERE h.business_id=b.id),'[]'::jsonb),
 'staff',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',st.id,'hours',COALESCE((
   SELECT jsonb_agg(jsonb_build_object('weekday',h.weekday,'start_local',to_char(make_interval(mins=>h.start_minute),'HH24:MI'),
   'end_local',CASE WHEN h.end_minute=1440 THEN '24:00' ELSE to_char(make_interval(mins=>h.end_minute),'HH24:MI') END))
   FROM app.staff_hours h WHERE h.business_id=b.id AND h.staff_id=st.id),'[]'::jsonb)) ORDER BY st.id) FROM eligible st),'[]'::jsonb),
 'exceptions',COALESCE((SELECT jsonb_agg(jsonb_build_object('local_date',e.local_date,'staff_id',e.staff_id,'closed',e.closed,
   'intervals',COALESCE((SELECT jsonb_agg(jsonb_build_object('start_local',to_char(make_interval(mins=>i.start_minute),'HH24:MI'),
   'end_local',CASE WHEN i.end_minute=1440 THEN '24:00' ELSE to_char(make_interval(mins=>i.end_minute),'HH24:MI') END))
   FROM app.exception_intervals i WHERE i.business_id=b.id AND i.exception_id=e.id),'[]'::jsonb)))
   FROM app.schedule_exceptions e WHERE e.business_id=b.id AND e.deleted_at IS NULL
   AND e.local_date BETWEEN $4::date AND $5::date AND (e.staff_id IS NULL OR e.staff_id IN (SELECT id FROM eligible))),'[]'::jsonb)
) AS snapshot
FROM app.businesses b JOIN app.services s ON s.business_id=b.id AND s.id=$2 AND s.active
JOIN app.service_categories c ON c.id=s.category_id AND c.active
WHERE b.id=$1 AND b.state='published' AND ($3::uuid IS NULL OR EXISTS(SELECT 1 FROM eligible))`;

@Injectable()
export class PostgresAvailabilityReader extends AvailabilityReader {
  constructor(private readonly database: DatabaseProvider) {
    super();
  }
  async read(business: string, query: AvailabilityQuery): Promise<AvailabilitySnapshot> {
    const result = await this.database.pool.query<{ snapshot: AvailabilitySnapshot }>(
      availabilitySnapshotSql,
      [
        business,
        query.service_id,
        query.staff_id === 'any' ? null : query.staff_id,
        query.from,
        query.to,
      ],
    );
    return result.rows[0]?.snapshot ?? notFound();
  }
}
