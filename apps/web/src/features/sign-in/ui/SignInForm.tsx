import { useState, type FormEvent } from 'react';
import { LoaderCircle, LogIn } from 'lucide-react';
import { getAuthErrorMessage } from '@/entities/session';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { useSignIn } from '../model/useSignIn';

export function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const login = useSignIn();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (login.isPending) return;
    login.reset();
    const nextErrors = {
      email: !email.trim()
        ? 'Введите email.'
        : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
          ? undefined
          : 'Введите корректный email.',
      password: password ? undefined : 'Введите пароль.',
    };
    setErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) return;
    login.mutate({ email: email.trim(), password });
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-5" aria-busy={login.isPending}>
      <div className="space-y-2">
        <label htmlFor="login-email" className="text-sm font-semibold">
          Email
        </label>
        <Input
          id="login-email"
          name="email"
          type="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@company.ru"
          required
          disabled={login.isPending}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'login-email-error' : undefined}
          className="h-11"
        />
        {errors.email && (
          <p id="login-email-error" role="alert" className="text-sm text-destructive">
            {errors.email}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <label htmlFor="login-password" className="text-sm font-semibold">
          Пароль
        </label>
        <Input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          disabled={login.isPending}
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? 'login-password-error' : undefined}
          className="h-11"
        />
        {errors.password && (
          <p id="login-password-error" role="alert" className="text-sm text-destructive">
            {errors.password}
          </p>
        )}
      </div>
      {login.isError && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {getAuthErrorMessage(login.error, 'Не удалось войти. Попробуйте снова.')}
        </p>
      )}
      <Button type="submit" disabled={login.isPending} className="h-11 w-full">
        {login.isPending ? (
          <LoaderCircle className="animate-spin" aria-hidden="true" />
        ) : (
          <LogIn aria-hidden="true" />
        )}
        {login.isPending ? 'Входим…' : 'Войти'}
      </Button>
    </form>
  );
}
