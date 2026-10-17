import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProviders } from '../../src/app/providers/AppProviders';
import { useAuth } from '../../src/entities/session';
import { getRealtimeClient, getSupabaseClient } from '../../src/shared/api';

function AuthProbe() {
  const { session, user, isLoading, isConfigured } = useAuth();

  return (
    <>
      <output data-testid="auth-state">
        {JSON.stringify({
          userId: user?.id ?? null,
          email: user?.email ?? null,
          expiresAt: session?.expires_at ?? null,
          isLoading,
          isConfigured,
          hasSharedRealtimeClient: getRealtimeClient() === getSupabaseClient()?.realtime,
        })}
      </output>
      <button
        onClick={() =>
          void getSupabaseClient()?.auth.signInWithPassword({
            email: 'operator@example.com',
            password: 'test-password',
          })
        }
      >
        Sign in
      </button>
      <button onClick={() => void getSupabaseClient()?.auth.signOut()}>Sign out</button>
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <AuthProbe />
    </AppProviders>
  </StrictMode>,
);
