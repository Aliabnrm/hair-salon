import { Injectable } from '@nestjs/common';
import { invalid } from '../../../../common/domain/capability-error.js';
import { ScheduleStore } from '../ports/management-stores.js';
import { exceptionInput, weekly } from '../../domain/schedule-policy.js';
import { object } from '../../domain/validation.js';
import type { PageQuery, WriteCommand } from '../../domain/management.types.js';
@Injectable()
export class SchedulingService {
  constructor(private readonly store: ScheduleStore) {}
  hours(actor: string, business: string, staff: string | null) {
    return this.store.hours(actor, business, staff);
  }
  replace(command: WriteCommand, staff: string | null, value: unknown) {
    return this.store.replaceHours(command, staff, weekly(value));
  }
  exceptions(actor: string, business: string, query: PageQuery) {
    return this.store.exceptions(actor, business, query);
  }
  create(command: WriteCommand, value: unknown) {
    return this.store.createException(command, exceptionInput(value));
  }
  async update(command: WriteCommand, id: string, value: unknown) {
    const p = object(value, ['closed', 'intervals']);
    if (!command.businessId) invalid('business_id');
    const old = await this.store.exception(command.actorId, command.businessId, id);
    return this.store.updateException(
      command,
      id,
      exceptionInput({
        local_date: old.local_date,
        staff_id: old.staff_id,
        closed: p.closed,
        intervals: p.intervals,
      }),
      false,
    );
  }
  remove(command: WriteCommand, id: string) {
    return this.store.updateException(command, id, null, true);
  }
}
