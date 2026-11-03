import { Injectable } from '@nestjs/common';
import { PublicCatalogStore } from './ports/publication-store.js';
import type { CatalogQuery } from '../domain/publication.types.js';
@Injectable()
export class PublicCatalogService {
  constructor(private readonly store: PublicCatalogStore) {}
  categories() {
    return this.store.categories();
  }
  locations() {
    return this.store.locations();
  }
  list(query: CatalogQuery) {
    return this.store.list(query);
  }
  profile(business: string) {
    return this.store.profile(business);
  }
}
