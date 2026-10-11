import { useState } from 'react';
import { clientName, type Client } from '@/entities/client';

export function useClientSearch(clients: readonly Client[]) {
  const [search, setSearch] = useState('');
  const normalized = search.trim().replace(/^@/, '').toLocaleLowerCase('ru');
  const filtered = clients.filter((client) =>
    [clientName(client), client.username ?? '', String(client.id)]
      .join(' ')
      .toLocaleLowerCase('ru')
      .includes(normalized),
  );

  return { search, setSearch, filtered, isSearching: Boolean(normalized) };
}
