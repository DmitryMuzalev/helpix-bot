import { Navigate, Outlet, useLocation } from '@tanstack/react-router';
import { LoaderCircle } from 'lucide-react';
import { useAuth } from '@/entities/session';

export function AuthenticatedLayout() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <main
        role="status"
        className="flex min-h-dvh items-center justify-center gap-2 text-sm text-muted-foreground"
      >
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        Проверяем сессию…
      </main>
    );
  }
  if (!user) {
    // The location can change before this layout unmounts during navigation.
    if (location.pathname === '/login') return null;
    return <Navigate to="/login" search={{ redirect: location.href }} replace />;
  }
  return <Outlet />;
}
