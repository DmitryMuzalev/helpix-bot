import { queryOptions } from '@tanstack/react-query';
import { getClients } from '../api/get-clients';

export const clientsQuery = queryOptions({
  queryKey: ['clients'],
  queryFn: ({ signal }) => getClients(signal),
  staleTime: 15_000,
});
