import { useEffect } from 'react';
import { useRouter, useSearch } from '@tanstack/react-router';
import { LoaderCircle } from 'lucide-react';
import { useAuth } from '@/entities/session';
import { SignInForm } from '@/features/sign-in';

export function LoginPage() {
  const { redirect } = useSearch({ from: '/login' });
  const { user, isLoading, isConfigured, error } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.history.replace(redirect);
  }, [user, redirect, router]);

  if (user) return null;

  return (
    <main className="workspace-background flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <img src="/favicon.svg" alt="" className="size-10" aria-hidden="true" />
          <span className="text-3xl font-extrabold tracking-[-0.06em]">
            helpix<span className="text-primary">.</span>
          </span>
        </div>
        <section
          className="rounded-2xl border bg-card/70 p-6 shadow-xl sm:p-8"
          aria-labelledby="login-title"
        >
          <h1 id="login-title" className="text-2xl font-bold tracking-tight">
            Вход в Helpix
          </h1>
          <p className="mt-2 mb-7 text-sm text-muted-foreground">Панель технической поддержки</p>
          {isLoading ? (
            <div role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              Проверяем сессию…
            </div>
          ) : !isConfigured ? (
            <p role="alert" className="text-sm text-destructive">
              Подключение к серверу не настроено. Обратитесь к администратору.
            </p>
          ) : (
            <>
              {error && (
                <p role="alert" className="mb-5 text-sm text-destructive">
                  Не удалось проверить сессию. Попробуйте войти снова.
                </p>
              )}
              <SignInForm />
              <p className="mt-6 border-t pt-5 text-xs leading-5 text-muted-foreground">
                Доступ предоставляется сотрудникам. Для получения аккаунта обратитесь к
                администратору.
              </p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
