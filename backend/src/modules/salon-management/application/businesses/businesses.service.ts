import { Injectable } from '@nestjs/common';
import { invalid } from '../../../../common/domain/capability-error.js';
import { BusinessStore } from '../ports/management-stores.js';
import { businessFields, businessInput } from '../../domain/business-policy.js';
import { object } from '../../domain/validation.js';
import type { PageQuery, WriteCommand } from '../../domain/management.types.js';
@Injectable()
export class BusinessesService {
  constructor(private readonly store: BusinessStore) {}
  list(actor: string, query: PageQuery) {
    return this.store.list(actor, query);
  }
  get(actor: string, business: string) {
    return this.store.get(actor, business);
  }
  create(command: WriteCommand, input: unknown) {
    return this.store.create(command, businessInput(input));
  }
  async update(command: WriteCommand, input: unknown) {
    const patch = object(input, businessFields);
    if (!Object.keys(patch).length) invalid('body');
    if (!command.businessId) invalid('business_id');
    const old = await this.store.get(command.actorId, command.businessId);
    const merged = Object.fromEntries(
      businessFields.map((k) => [k, k in patch ? patch[k] : old[k]]),
    );
    return this.store.update(command, businessInput(merged));
  }
}
