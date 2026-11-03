import { apiRequest } from '../../../lib/api/http-client';
import * as decode from '../model/catalog-decoders';
export const categories = async (signal: AbortSignal) =>
  decode.page(await apiRequest('/api/v1/catalog/categories', { signal }), decode.category).items;
export const locations = async (signal: AbortSignal) =>
  decode.page(await apiRequest('/api/v1/catalog/locations', { signal }), decode.location).items;
export const salons = async (query: string, signal: AbortSignal) =>
  decode.page(
    await apiRequest('/api/v1/catalog/salons' + (query ? '?' + query : ''), { signal }),
    decode.summary,
  );
export const publicProfile = async (id: string, signal: AbortSignal) =>
  decode.profile(await apiRequest(`/api/v1/catalog/salons/${id}`, { signal }));
