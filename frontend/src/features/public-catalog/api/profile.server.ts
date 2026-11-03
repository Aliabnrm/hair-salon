import { notFound } from 'next/navigation';
import { validateBackendOrigin } from '../../../lib/config/environment.server';
import { record } from '../../../lib/api/response-values';
import { profile } from '../model/catalog-decoders';
export async function loadPublicProfile(id: string) {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id))
    notFound();
  const origin = validateBackendOrigin(process.env.BACKEND_ORIGIN);
  const response = await fetch(`${origin}/api/v1/catalog/salons/${id}`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error('Public salon could not be loaded.');
  return profile(record(await response.json()).data);
}
