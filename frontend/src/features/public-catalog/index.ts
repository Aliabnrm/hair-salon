export { PublicProfile } from './components/public-profile';
export { categories, locations, salons, publicProfile } from './api/catalog.api';
export { profile as decodeProfile, nullable, page as decodePage } from './model/catalog-decoders';
export { formatPrice } from './model/format-price';
export type {
  Category,
  Location,
  SalonSummary,
  PublicProfile as PublicProfileData,
} from './model/catalog.types';
