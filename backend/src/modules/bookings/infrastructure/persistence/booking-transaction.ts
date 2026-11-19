import { Injectable } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { DatabaseProvider } from '../../../../database/database.provider.js';
import { CapabilityError, conflict, notFound } from '../../../../common/domain/capability-error.js';
import type { BookingCommand } from '../../domain/booking.types.js';
export async function requireOwner(tx: Pick<PoolClient, 'query'>, actor: string, business: string) {
  const r = await tx.query(
    "SELECT 1 FROM app.business_memberships WHERE business_id=$1 AND user_id=$2 AND active AND role='owner'",
    [business, actor],
  );
  if (!r.rowCount) notFound();
}
@Injectable()
export class BookingTransaction {
  constructor(private readonly database: DatabaseProvider) {}
  async run(
    command: BookingCommand,
    business: string,
    action: (tx: PoolClient) => Promise<string>,
    customerAppointment?: string,
  ): Promise<string> {
    const tx = await this.database.pool.connect();
    try {
      await tx.query('BEGIN');
      await tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [
        JSON.stringify(['booking', command.actor, command.operation, command.key]),
      ]);
      const authorize = async () => {
        if (command.operation === 'customer-cancel' || command.operation === 'reschedule') {
          const r = await tx.query(
            "SELECT 1 FROM app.appointments WHERE id=$1 AND business_id=$2 AND booking_user_id=$3 AND source='online'",
            [customerAppointment, business, command.actor],
          );
          if (!r.rowCount) notFound();
        } else if (command.operation !== 'online') await requireOwner(tx, command.actor, business);
      };
      await authorize();
      const b = await tx.query('SELECT id FROM app.businesses WHERE id=$1 FOR UPDATE', [business]);
      if (!b.rowCount) notFound();
      await authorize();
      const old = await tx.query<{ fingerprint: string; appointment_id: string }>(
        'SELECT fingerprint,COALESCE(appointment_id,block_id) AS appointment_id FROM app.booking_writes WHERE actor_id=$1 AND operation=$2 AND key=$3',
        [command.actor, command.operation, command.key],
      );
      const previous = old.rows[0];
      if (previous) {
        if (previous.fingerprint !== command.fingerprint)
          conflict('IDEMPOTENCY_CONFLICT', 'این کلید برای اطلاعات دیگری استفاده شده است.');
        await tx.query('COMMIT');
        return previous.appointment_id;
      }
      const id = await action(tx);
      await tx.query(
        `INSERT INTO app.booking_writes(actor_id,operation,key,fingerprint,${command.operation.startsWith('block-') ? 'block_id' : 'appointment_id'}) VALUES($1,$2,$3,$4,$5)`,
        [command.actor, command.operation, command.key, command.fingerprint, id],
      );
      await tx.query('COMMIT');
      return id;
    } catch (error) {
      await tx.query('ROLLBACK');
      if (error instanceof Error && 'code' in error) {
        if (error.code === '23P01')
          conflict('SLOT_UNAVAILABLE', 'این زمان دیگر آزاد نیست؛ زمان دیگری انتخاب کنید.');
        if (error.code === '40P01' || error.code === '40001')
          conflict('WRITE_CONFLICT', 'تغییر هم‌زمان رخ داد؛ با همان کلید دوباره تلاش کنید.');
        if (error.code === '23503' || error.code === '23514')
          throw new CapabilityError(422, 'VALIDATION_FAILED', 'اطلاعات نوبت معتبر نیست.');
      }
      throw error;
    } finally {
      tx.release();
    }
  }
}
