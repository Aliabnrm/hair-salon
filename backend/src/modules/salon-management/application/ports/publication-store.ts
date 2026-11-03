import type { WriteCommand, Page } from '../../domain/management.types.js';
import type {
  Publication,
  PublicProfile,
  Decision,
  CatalogQuery,
  SalonSummary,
} from '../../domain/publication.types.js';
export abstract class PublicationStore {
  abstract get(actor: string, business: string): Promise<Publication>;
  abstract preview(actor: string, business: string): Promise<PublicProfile>;
  abstract request(command: WriteCommand, consent: boolean): Promise<Publication>;
  abstract withdraw(command: WriteCommand): Promise<Publication>;
  abstract access(actor: string): Promise<{ can_review: boolean }>;
  abstract queue(
    actor: string,
    query: { limit: number; cursor?: string },
  ): Promise<Page<{ id: string; name: string; state: string }>>;
  abstract review(
    actor: string,
    business: string,
  ): Promise<{ publication: Publication; profile: PublicProfile }>;
  abstract decide(
    command: WriteCommand,
    decision: Decision,
    requestId: string | null,
    reason: string | null,
    contentRevision: number,
  ): Promise<Publication>;
}
export abstract class PublicCatalogStore {
  abstract categories(): Promise<{ id: string; label: string }[]>;
  abstract locations(): Promise<{ city: string; districts: string[] }[]>;
  abstract list(query: CatalogQuery): Promise<Page<SalonSummary>>;
  abstract profile(business: string): Promise<PublicProfile>;
}
