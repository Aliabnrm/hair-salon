import { Injectable } from '@nestjs/common';
import { invalid } from '../../../../common/domain/capability-error.js';
import { DatabaseProvider } from '../../../../database/database.provider.js';
import { PublicCatalogStore } from '../../application/ports/publication-store.js';
import type { CatalogQuery, SalonSummary } from '../../domain/publication.types.js';
import { catalogCursor, catalogScope } from '../../domain/catalog-query.js';
import { readProfile } from './public-profile-query.js';
export const publicSalonsSql = `SELECT b.id,b.name,b.audience,b.city,b.district,to_char(b.created_at AT TIME ZONE 'UTC','YYYY-MM-DD HH24:MI:SS.US')||'+00' AS cursor_time,
   (SELECT min(s.price_irr)::float8 FROM app.services s WHERE s.business_id=b.id AND s.active AND ($3::text IS NULL OR s.category_id=$3)) AS min_price_irr
   FROM app.businesses b WHERE b.state='published' AND ($1::text IS NULL OR strpos(b.search_text,$1)>0 OR EXISTS(SELECT 1 FROM app.services s WHERE s.business_id=b.id AND s.active AND strpos(app.normalize_search(s.name),$1)>0))
   AND ($2::text IS NULL OR b.audience=$2) AND ($3::text IS NULL OR EXISTS(SELECT 1 FROM app.services s WHERE s.business_id=b.id AND s.active AND s.category_id=$3))
   AND ($4::text IS NULL OR app.normalize_search(b.city)=$4) AND ($5::text IS NULL OR app.normalize_search(b.district)=$5)
   AND ($6::timestamptz IS NULL OR (b.created_at,b.id)>($6::timestamptz,$7::uuid)) ORDER BY b.created_at,b.id LIMIT $8`;
@Injectable()
export class PostgresPublicCatalogStore extends PublicCatalogStore {
  constructor(private readonly database: DatabaseProvider) {
    super();
  }
  async categories() {
    return (
      await this.database.pool.query<{ id: string; label: string }>(
        'SELECT id,label FROM app.service_categories WHERE active ORDER BY sort_order,id',
      )
    ).rows;
  }
  async locations() {
    return (
      await this.database.pool.query<{ city: string; districts: string[] }>(
        `WITH locations AS (SELECT app.normalize_search(city) AS city_key,min(city) AS city,app.normalize_search(district) AS district_key,min(district) AS district FROM app.businesses WHERE state='published' GROUP BY app.normalize_search(city),app.normalize_search(district)) SELECT min(city) AS city,COALESCE(array_agg(district ORDER BY district) FILTER(WHERE district IS NOT NULL),'{}') AS districts FROM locations GROUP BY city_key ORDER BY min(city)`,
      )
    ).rows;
  }
  async list(q: CatalogQuery) {
    if (q.category && !(await this.categories()).some((c) => c.id === q.category))
      invalid('category');
    const [at, id] = catalogCursor(q);
    // strpos treats wildcard input literally, with bound parameters throughout.
    const r = await this.database.pool.query<SalonSummary & { cursor_time: string }>(
      publicSalonsSql,
      [
        q.q ?? null,
        q.audience ?? null,
        q.category ?? null,
        q.city ?? null,
        q.district ?? null,
        at,
        id,
        q.limit + 1,
      ],
    );
    const selected = r.rows.slice(0, q.limit),
      last = selected.at(-1);
    return {
      items: selected.map(({ cursor_time, ...row }) => {
        void cursor_time;
        return row;
      }),
      next_cursor:
        r.rows.length > q.limit && last
          ? Buffer.from(JSON.stringify([catalogScope(q), last.cursor_time, last.id])).toString(
              'base64url',
            )
          : null,
    };
  }
  profile(business: string) {
    return readProfile(this.database.pool, business, true);
  }
}
