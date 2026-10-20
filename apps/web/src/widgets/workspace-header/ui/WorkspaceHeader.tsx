import { Link } from '@tanstack/react-router';
import { BookOpen, MessageSquare } from 'lucide-react';
import { useAuth } from '@/entities/session';
import { SignOutButton } from '@/features/sign-out';

const navLinkClass =
  'flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring sm:px-3 sm:text-sm';

export function WorkspaceHeader() {
  const { user } = useAuth();
  return (
    <header className="flex h-18 shrink-0 items-center justify-between gap-3 border-b px-4 md:px-8">
      <div className="flex min-w-0 items-center gap-3 sm:gap-6">
        <Link
          to="/clients"
          aria-label="Helpix — к списку клиентов"
          className="flex shrink-0 items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-ring"
        >
          <img src="/favicon.svg" alt="" className="size-8 shrink-0" aria-hidden="true" />
          <span className="hidden text-xl font-extrabold tracking-[-0.06em] sm:block">
            helpix<span className="text-primary">.</span>
          </span>
        </Link>
        <nav aria-label="Разделы" className="flex items-center gap-1">
          <Link
            to="/clients"
            className={navLinkClass}
            activeProps={{ className: 'bg-accent text-foreground' }}
          >
            <MessageSquare className="hidden size-4 sm:block" aria-hidden="true" />
            Сообщения
          </Link>
          <Link
            to="/articles"
            className={navLinkClass}
            activeProps={{ className: 'bg-accent text-foreground' }}
          >
            <BookOpen className="hidden size-4 sm:block" aria-hidden="true" />
            База знаний
          </Link>
        </nav>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <span
          className="hidden max-w-48 truncate text-xs text-muted-foreground lg:block"
          title={user?.email}
        >
          {user?.email}
        </span>
        <SignOutButton />
      </div>
    </header>
  );
}
