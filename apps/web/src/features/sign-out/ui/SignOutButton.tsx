import { useMutation } from '@tanstack/react-query';
import { LoaderCircle, LogOut } from 'lucide-react';
import { getAuthErrorMessage, signOut } from '@/entities/session';
import { Button } from '@/shared/ui/button';

export function SignOutButton() {
  const logout = useMutation({ mutationFn: signOut, retry: false });

  function handleSignOut() {
    if (!logout.isPending) logout.mutate();
  }

  return (
    <div className="relative shrink-0">
      <Button
        variant="ghost"
        size="sm"
        aria-label="Выйти"
        disabled={logout.isPending}
        onClick={handleSignOut}
      >
        {logout.isPending ? (
          <LoaderCircle className="animate-spin" aria-hidden="true" />
        ) : (
          <LogOut aria-hidden="true" />
        )}
        <span className="hidden sm:inline">{logout.isPending ? 'Выходим…' : 'Выйти'}</span>
      </Button>
      {logout.isError && (
        <p
          role="alert"
          className="absolute top-full right-0 z-50 mt-2 w-72 rounded-xl border border-destructive/30 bg-card p-4 text-sm text-destructive shadow-xl"
        >
          {getAuthErrorMessage(logout.error, 'Не удалось выйти. Попробуйте снова.')}
        </p>
      )}
    </div>
  );
}
