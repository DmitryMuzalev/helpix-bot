import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/shared/ui/tooltip';
import { AuthSessionSync } from './AuthSessionSync';
import { queryClient } from './query-client';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthSessionSync />
      <TooltipProvider>{children}</TooltipProvider>
    </QueryClientProvider>
  );
}
