import { Injectable } from '@nestjs/common';
import { PublicationStore } from './ports/publication-store.js';
import { object, bool, text, uuid, integer } from '../domain/validation.js';
import { invalid } from '../../../common/domain/capability-error.js';
import type { WriteCommand } from '../domain/management.types.js';
@Injectable()
export class PublicationService {
  constructor(private readonly store: PublicationStore) {}
  get(actor: string, business: string) {
    return this.store.get(actor, business);
  }
  preview(actor: string, business: string) {
    return this.store.preview(actor, business);
  }
  access(actor: string) {
    return this.store.access(actor);
  }
  queue(actor: string, query: { limit: number; cursor?: string }) {
    return this.store.queue(actor, query);
  }
  review(actor: string, business: string) {
    return this.store.review(actor, business);
  }
  request(command: WriteCommand, value: unknown) {
    const p = object(value, ['consent']);
    return this.store.request(command, bool(p.consent, 'consent'));
  }
  withdraw(command: WriteCommand, value: unknown) {
    object(value, []);
    return this.store.withdraw(command);
  }
  decide(command: WriteCommand, value: unknown) {
    const p = object(value, ['decision', 'request_id', 'reason', 'content_revision']);
    if (p.decision !== 'approve' && p.decision !== 'reject' && p.decision !== 'suspend')
      invalid('decision');
    return this.store.decide(
      command,
      p.decision,
      p.request_id === null ? null : uuid(p.request_id, 'request_id'),
      p.reason == null ? null : text(p.reason, 'reason', 2, 600),
      integer(p.content_revision, 'content_revision', 1, 2147483647),
    );
  }
}
