import { useMemo } from 'react';
import { useResourceMutation } from './use-resource-mutation';
import { blockIntentResolver } from '../api/salon-operations.api';
import { useSession } from '../../identity';
export function useBlockMutation(
  business: string,
  scope: string,
  operation: 'block-create' | 'block-release',
) {
  const session = useSession(),
    resolve = useMemo(() => blockIntentResolver(business), [business]);
  return useResourceMutation(`${session.user?.id}:${business}:${scope}`, operation, resolve);
}
