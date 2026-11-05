import type { Pool, PoolClient } from 'pg';
import { notFound } from '../../../../common/domain/capability-error.js';
import type { Publication, PublicProfile } from '../../domain/publication.types.js';
import { readiness } from '../../domain/publication-policy.js';
import { publicProfileSql } from './public-profile-query.js';
export async function readPublication(
  db: Pool | PoolClient,
  business: string,
): Promise<Publication> {
  const r = await db.query<{
    state: Publication['state'];
    version: number;
    content_revision: number;
    request_id: string | null;
    profile: PublicProfile;
    service_minutes: Record<string, number>;
    owner_active: boolean;
    history: Publication['history'];
  }>(
    `SELECT b.state,b.publication_version AS version,b.content_revision,b.current_request_id AS request_id,${publicProfileSql} AS profile,
   COALESCE((SELECT jsonb_object_agg(s.id,s.duration_minutes+s.buffer_before_minutes+s.buffer_after_minutes) FROM app.services s WHERE s.business_id=b.id AND s.active),'{}'::jsonb) AS service_minutes,
   EXISTS(SELECT 1 FROM app.business_memberships m WHERE m.business_id=b.id AND m.active AND m.role='owner') AS owner_active,
   COALESCE((SELECT jsonb_agg(jsonb_build_object('id',h.id,'action',h.action,'revision',h.revision,'request_id',h.request_id,'reason',h.reason,'created_at',h.created_at::text) ORDER BY h.publication_version DESC) FROM (SELECT id,action,revision,request_id,reason,created_at,publication_version FROM app.publication_events WHERE business_id=b.id ORDER BY publication_version DESC LIMIT 50) h),'[]'::jsonb) AS history FROM app.businesses b WHERE b.id=$1`,
    [business],
  );
  const row = r.rows[0] ?? notFound();
  return {
    state: row.state,
    version: row.version,
    content_revision: row.content_revision,
    request_id: row.request_id,
    issues: readiness(row.profile, row.owner_active, row.service_minutes),
    history: row.history,
  };
}
