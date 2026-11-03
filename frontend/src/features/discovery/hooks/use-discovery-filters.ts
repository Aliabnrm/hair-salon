import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRemote } from '../../../lib/hooks/use-remote';
import * as api from '../../public-catalog/api/catalog.api';
export function useDiscoveryFilters() {
  const router = useRouter(),
    params = useSearchParams(),
    query = params.toString();
  const urlQuery = params.get('q') ?? '';
  const [search, setSearch] = useState(urlQuery);
  const [edit, setEdit] = useState(false);
  useEffect(() => {
    setSearch(urlQuery);
    setEdit(false);
  }, [urlQuery]);
  function update(patch: Record<string, string | null>) {
    const next = new URLSearchParams(query);
    next.delete('cursor');
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const value = next.toString();
    router.push(value ? '/?' + value : '/', { scroll: false });
  }
  useEffect(() => {
    if (!edit) return;
    const timer = setTimeout(() => {
      const next = new URLSearchParams(query);
      next.delete('cursor');
      if (search.trim()) next.set('q', search.trim());
      else next.delete('q');
      const value = next.toString();
      if (value !== query) router.push(value ? '/?' + value : '/', { scroll: false });
      setEdit(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [search, edit, query, router]);
  const results = useRemote(query, (s) => api.salons(query, s));
  const categories = useRemote('categories', api.categories);
  const locations = useRemote('locations', api.locations);
  return {
    params,
    query,
    search,
    setSearch: (value: string) => {
      setSearch(value);
      setEdit(true);
    },
    update,
    results,
    categories,
    locations,
    next: () => {
      const c = results.data?.next_cursor;
      if (c) {
        const p = new URLSearchParams(query);
        p.set('cursor', c);
        router.push('/?' + p.toString(), { scroll: false });
      }
    },
    reset: () => {
      setSearch('');
      setEdit(false);
      router.push('/', { scroll: false });
    },
  };
}
