import { Injectable } from '@nestjs/common';
import { managementLimits } from '../../domain/management-limits.js';
import type { PoolClient } from 'pg';
import { conflict, invalid, notFound } from '../../../../common/domain/capability-error.js';
import { TeamStore } from '../../application/ports/management-stores.js';
import type { Staff, StaffInput, PageQuery, WriteCommand } from '../../domain/management.types.js';
import { BusinessWriteTransaction } from './business-write-transaction.js';
import { cursor, page, scope } from './management-pagination.js';
const projection = `s.public_visible,s.id,s.display_name,s.active,s.version,COALESCE((SELECT jsonb_agg(ss.service_id ORDER BY ss.service_id) FROM app.staff_services ss WHERE ss.business_id=s.business_id AND ss.staff_id=s.id),'[]'::jsonb) AS service_ids`;
@Injectable()
export class PostgresTeamStore extends TeamStore {
  constructor(private readonly write: BusinessWriteTransaction) {
    super();
  }
  async list(actor: string, business: string, query: PageQuery) {
    await this.write.owner(actor, business);
    const s = scope(query, business, 'staff'),
      [at, id] = cursor(query, s);
    const r = await this.write.database.pool.query<Staff & { cursor_time: string }>(
      `SELECT ${projection},s.created_at::text AS cursor_time FROM app.staff_profiles s WHERE business_id=$1 AND ($2::boolean IS NULL OR active=$2) AND ($3::timestamptz IS NULL OR (created_at,id)>($3::timestamptz,$4::uuid)) ORDER BY created_at,id LIMIT $5`,
      [business, query.active ?? null, at, id, query.limit + 1],
    );
    return page(r.rows, query, s);
  }
  async get(actor: string, business: string, id: string) {
    await this.write.owner(actor, business);
    const r = await this.write.database.pool.query<Staff>(
      `SELECT ${projection} FROM app.staff_profiles s WHERE business_id=$1 AND id=$2`,
      [business, id],
    );
    return r.rows[0] ?? notFound();
  }
  private async assign(
    tx: PoolClient,
    business: string,
    staff: string,
    ids: string[],
  ): Promise<void> {
    const valid = await tx.query<{ count: number }>(
      `SELECT count(*)::integer AS count FROM app.services s WHERE s.business_id=$1 AND s.id=ANY($3::uuid[]) AND (s.active OR EXISTS(SELECT 1 FROM app.staff_services ss WHERE ss.business_id=$1 AND ss.staff_id=$2 AND ss.service_id=s.id))`,
      [business, staff, ids],
    );
    if (valid.rows[0]?.count !== ids.length)
      invalid('service_ids', 'خدمات باید از همین سالن و برای تخصیص تازه فعال باشند.');
    await tx.query('DELETE FROM app.staff_services WHERE business_id=$1 AND staff_id=$2', [
      business,
      staff,
    ]);
    await tx.query(
      'INSERT INTO app.staff_services(business_id,staff_id,service_id) SELECT $1,$2,unnest($3::uuid[])',
      [business, staff, ids],
    );
  }
  async create(command: WriteCommand, input: StaffInput) {
    return this.write.run(command, async (tx) => {
      const business = command.businessId;
      if (!business) throw new Error('Missing tenant');
      const c = await tx.query<{ count: number }>(
        'SELECT count(*)::integer AS count FROM app.staff_profiles WHERE business_id=$1',
        [business],
      );
      if ((c.rows[0]?.count ?? 0) >= managementLimits.staffPerBusiness)
        conflict('STAFF_LIMIT', 'حداکثر پنجاه متخصص مجاز است.');
      const r = await tx.query<{ id: string }>(
        'INSERT INTO app.staff_profiles(business_id,display_name,public_visible) VALUES($1,$2,$3) RETURNING id',
        [business, input.display_name, input.public_visible ?? false],
      );
      const row = r.rows[0] ?? notFound();
      await this.assign(tx, business, row.id, input.service_ids);
      return { id: row.id, ...input, active: true, version: 1 };
    });
  }
  async update(command: WriteCommand, id: string, input: StaffInput, active: boolean) {
    return this.write.run(command, async (tx) => {
      const business = command.businessId;
      if (!business) throw new Error('Missing tenant');
      const old = await tx.query<{ version: number }>(
        'SELECT version FROM app.staff_profiles WHERE business_id=$1 AND id=$2 FOR UPDATE',
        [business, id],
      );
      const row = old.rows[0] ?? notFound();
      this.write.version(row.version, command.version);
      await this.assign(tx, business, id, input.service_ids);
      const r = await tx.query<Staff>(
        `UPDATE app.staff_profiles AS s SET display_name=$3,active=$4,public_visible=$5,version=version+1,updated_at=now() WHERE business_id=$1 AND id=$2 RETURNING ${projection}`,
        [business, id, input.display_name, active, input.public_visible ?? false],
      );
      return r.rows[0] ?? notFound();
    });
  }
}
