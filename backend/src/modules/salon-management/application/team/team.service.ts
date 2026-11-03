import { Injectable } from '@nestjs/common';
import { invalid } from '../../../../common/domain/capability-error.js';
import { TeamStore } from '../ports/management-stores.js';
import { object, text, ids, bool } from '../../domain/validation.js';
import type { PageQuery, WriteCommand } from '../../domain/management.types.js';
@Injectable()
export class TeamService {
  constructor(private readonly store: TeamStore) {}
  list(actor: string, business: string, query: PageQuery) {
    return this.store.list(actor, business, query);
  }
  get(actor: string, business: string, id: string) {
    return this.store.get(actor, business, id);
  }
  create(command: WriteCommand, input: unknown) {
    const p = object(input, ['display_name', 'service_ids', 'public_visible']);
    return this.store.create(command, {
      display_name: text(p.display_name, 'display_name', 2, 80),
      service_ids: ids(p.service_ids),
      public_visible:
        p.public_visible === undefined ? false : bool(p.public_visible, 'public_visible'),
    });
  }
  async update(command: WriteCommand, id: string, input: unknown) {
    const p = object(input, ['display_name', 'service_ids', 'active', 'public_visible']);
    if (!Object.keys(p).length) invalid('body');
    if (!command.businessId) invalid('business_id');
    const old = await this.store.get(command.actorId, command.businessId, id);
    return this.store.update(
      command,
      id,
      {
        public_visible:
          'public_visible' in p
            ? bool(p.public_visible, 'public_visible')
            : (old.public_visible ?? false),
        display_name:
          'display_name' in p ? text(p.display_name, 'display_name', 2, 80) : old.display_name,
        service_ids: 'service_ids' in p ? ids(p.service_ids) : old.service_ids,
      },
      'active' in p ? bool(p.active, 'active') : old.active,
    );
  }
}
