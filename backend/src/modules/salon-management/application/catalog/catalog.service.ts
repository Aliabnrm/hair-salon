import { Injectable } from '@nestjs/common';
import { invalid } from '../../../../common/domain/capability-error.js';
import { CatalogStore } from '../ports/management-stores.js';
import { serviceFields, serviceInput } from '../../domain/service-policy.js';
import { object, bool } from '../../domain/validation.js';
import type { PageQuery, WriteCommand } from '../../domain/management.types.js';
@Injectable()
export class CatalogService {
  constructor(private readonly store: CatalogStore) {}
  list(actor: string, business: string, query: PageQuery) {
    return this.store.list(actor, business, query);
  }
  get(actor: string, business: string, id: string) {
    return this.store.get(actor, business, id);
  }
  create(command: WriteCommand, input: unknown) {
    if (!object(input, serviceFields).category_id)
      invalid('category_id', 'دسته خدمت را انتخاب کنید.');
    return this.store.create(command, serviceInput(input));
  }
  async update(command: WriteCommand, id: string, input: unknown) {
    const patch = object(input, [...serviceFields, 'active']);
    if (!Object.keys(patch).length) invalid('body');
    if (!command.businessId) invalid('business_id');
    const old = await this.store.get(command.actorId, command.businessId, id);
    const merged = Object.fromEntries(
      serviceFields.map((k) => [k, k in patch ? patch[k] : old[k]]),
    );
    return this.store.update(
      command,
      id,
      serviceInput(merged),
      'active' in patch ? bool(patch.active, 'active') : old.active,
    );
  }
}
