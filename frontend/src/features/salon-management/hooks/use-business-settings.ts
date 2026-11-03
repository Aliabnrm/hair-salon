import { useEffect, useState } from 'react';
import { HttpFailure } from '../../../lib/api/http-client';
import { useRemote } from '../../../lib/hooks/use-remote';
import * as api from '../api/management.api';
import type { Business } from '../model/management.types';

export function useBusinessSettings(businessId: string) {
  const query = useRemote(businessId, (signal) => api.getBusiness(businessId, signal));
  const [current, setCurrent] = useState<Business | null>(null);
  const [formRevision, setFormRevision] = useState(0);
  useEffect(() => {
    if (query.data) {
      setCurrent(query.data);
      setFormRevision((revision) => revision + 1);
    }
  }, [query.data]);
  const denied = query.error instanceof HttpFailure && [401, 403, 404].includes(query.error.status);
  return {
    ...query,
    // Expose the accepted snapshot with its revision in one render. Rendering
    // query.data first would mount the form, then immediately remount it and
    // discard input entered before this effect updates formRevision.
    data: denied || current?.id !== businessId ? null : current,
    formRevision,
    acceptSaved: setCurrent,
  };
}
