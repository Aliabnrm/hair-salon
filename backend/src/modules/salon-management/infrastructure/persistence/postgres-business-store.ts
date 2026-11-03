import { Injectable } from '@nestjs/common';
import { managementLimits } from '../../domain/management-limits.js';
import { conflict, notFound } from '../../../../common/domain/capability-error.js';
import { BusinessStore } from '../../application/ports/management-stores.js';
import type {
  Business,
  BusinessInput,
  PageQuery,
  WriteCommand,
} from '../../domain/management.types.js';
import { BusinessWriteTransaction } from './business-write-transaction.js';
import { cursor, page, scope } from './management-pagination.js';
const projection = `b.description,b.id,b.name,b.audience,b.city,b.district,b.public_address,b.public_phone,b.state,b.timezone,b.version,b.created_at::text AS created_at`;
@Injectable()
export class PostgresBusinessStore extends BusinessStore {
  constructor(private readonly write: BusinessWriteTransaction) {
    super();
  }
  async list(actor: string, query: PageQuery) {
    const s = scope(query, actor, 'businesses'),
      [at, id] = cursor(query, s);
    const r = await this.write.database.pool.query<Business & { cursor_time: string }>(
      `SELECT ${projection},b.created_at::text AS cursor_time FROM app.businesses b JOIN app.business_memberships m ON m.business_id=b.id WHERE m.user_id=$1 AND m.active AND m.role='owner' AND ($2::timestamptz IS NULL OR (b.created_at,b.id)>($2::timestamptz,$3::uuid)) ORDER BY b.created_at,b.id LIMIT $4`,
      [actor, at, id, query.limit + 1],
    );
    return page(r.rows, query, s);
  }
  async get(actor: string, business: string) {
    await this.write.owner(actor, business);
    const r = await this.write.database.pool.query<Business>(
      `SELECT ${projection} FROM app.businesses b WHERE b.id=$1`,
      [business],
    );
    return r.rows[0] ?? notFound();
  }
  async create(command: WriteCommand, input: BusinessInput) {
    return this.write.run(command, async (tx) => {
      const count = await tx.query<{ count: number }>(
        'SELECT count(*)::integer AS count FROM app.business_memberships WHERE user_id=$1 AND active',
        [command.actorId],
      );
      if ((count.rows[0]?.count ?? 0) >= managementLimits.businessesPerOwner)
        conflict('BUSINESS_LIMIT', 'حداکثر سه سالن می‌توانید ایجاد کنید.');
      const r = await tx.query<Business>(
        `INSERT INTO app.businesses AS b(name,audience,city,district,public_address,public_phone,description) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING ${projection}`,
        [
          input.name,
          input.audience,
          input.city,
          input.district,
          input.public_address,
          input.public_phone,
          input.description ?? null,
        ],
      );
      const row = r.rows[0];
      if (!row) throw new Error('Missing business');
      await tx.query('INSERT INTO app.business_memberships(business_id,user_id) VALUES($1,$2)', [
        row.id,
        command.actorId,
      ]);
      return row;
    });
  }
  async update(command: WriteCommand, input: BusinessInput) {
    return this.write.run(command, async (tx) => {
      const r = await tx.query<{ version: number }>(
        'SELECT version FROM app.businesses WHERE id=$1',
        [command.businessId],
      );
      this.write.version(r.rows[0]?.version ?? 0, command.version);
      const result = await tx.query<Business>(
        `UPDATE app.businesses AS b SET name=$2,audience=$3,city=$4,district=$5,public_address=$6,public_phone=$7,description=$8,version=version+1,updated_at=now() WHERE id=$1 RETURNING ${projection}`,
        [
          command.businessId,
          input.name,
          input.audience,
          input.city,
          input.district,
          input.public_address,
          input.public_phone,
          input.description ?? null,
        ],
      );
      return result.rows[0] ?? notFound();
    });
  }
}
