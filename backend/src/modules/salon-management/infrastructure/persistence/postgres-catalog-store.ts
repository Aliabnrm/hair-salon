import { Injectable } from '@nestjs/common';
import { managementLimits } from '../../domain/management-limits.js';
import { conflict, notFound } from '../../../../common/domain/capability-error.js';
import { CatalogStore } from '../../application/ports/management-stores.js';
import type {
  SalonService,
  ServiceInput,
  PageQuery,
  WriteCommand,
} from '../../domain/management.types.js';
import { BusinessWriteTransaction } from './business-write-transaction.js';
import { cursor, page, scope } from './management-pagination.js';
const projection = `category_id,id,name,price_irr::float8 AS price_irr,duration_minutes,buffer_before_minutes,buffer_after_minutes,active,version,'IRR'::text AS currency`;
@Injectable()
export class PostgresCatalogStore extends CatalogStore {
  constructor(private readonly write: BusinessWriteTransaction) {
    super();
  }
  async list(actor: string, business: string, query: PageQuery) {
    await this.write.owner(actor, business);
    const s = scope(query, business, 'services'),
      [at, id] = cursor(query, s);
    const r = await this.write.database.pool.query<SalonService & { cursor_time: string }>(
      `SELECT ${projection},created_at::text AS cursor_time FROM app.services WHERE business_id=$1 AND ($2::boolean IS NULL OR active=$2) AND ($3::timestamptz IS NULL OR (created_at,id)>($3::timestamptz,$4::uuid)) ORDER BY created_at,id LIMIT $5`,
      [business, query.active ?? null, at, id, query.limit + 1],
    );
    return page(r.rows, query, s);
  }
  async get(actor: string, business: string, id: string) {
    await this.write.owner(actor, business);
    const r = await this.write.database.pool.query<SalonService>(
      `SELECT ${projection} FROM app.services WHERE business_id=$1 AND id=$2`,
      [business, id],
    );
    return r.rows[0] ?? notFound();
  }
  async create(command: WriteCommand, input: ServiceInput) {
    return this.write.run(command, async (tx) => {
      const c = await tx.query<{ count: number }>(
        'SELECT count(*)::integer AS count FROM app.services WHERE business_id=$1',
        [command.businessId],
      );
      if ((c.rows[0]?.count ?? 0) >= managementLimits.servicesPerBusiness)
        conflict('SERVICE_LIMIT', 'حداکثر صد خدمت مجاز است.');
      const r = await tx.query<SalonService>(
        `INSERT INTO app.services(business_id,name,price_irr,duration_minutes,buffer_before_minutes,buffer_after_minutes,category_id) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING ${projection}`,
        [
          command.businessId,
          input.name,
          input.price_irr,
          input.duration_minutes,
          input.buffer_before_minutes,
          input.buffer_after_minutes,
          input.category_id ?? null,
        ],
      );
      return r.rows[0] ?? notFound();
    });
  }
  async update(command: WriteCommand, id: string, input: ServiceInput, active: boolean) {
    return this.write.run(command, async (tx) => {
      const old = await tx.query<{ version: number }>(
        'SELECT version FROM app.services WHERE business_id=$1 AND id=$2',
        [command.businessId, id],
      );
      if (!old.rows[0]) notFound();
      this.write.version(old.rows[0].version, command.version);
      const r = await tx.query<SalonService>(
        `UPDATE app.services SET name=$3,price_irr=$4,duration_minutes=$5,buffer_before_minutes=$6,buffer_after_minutes=$7,category_id=$8,active=$9,version=version+1,updated_at=now() WHERE business_id=$1 AND id=$2 RETURNING ${projection}`,
        [
          command.businessId,
          id,
          input.name,
          input.price_irr,
          input.duration_minutes,
          input.buffer_before_minutes,
          input.buffer_after_minutes,
          input.category_id ?? null,
          active,
        ],
      );
      return r.rows[0] ?? notFound();
    });
  }
}
