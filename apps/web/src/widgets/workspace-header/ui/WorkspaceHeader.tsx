import { Link } from '@tanstack/react-router';
import { BookOpen, MessageSquare } from 'lucide-react';
import { useAuth } from '@/entities/session';
import { SignOutButton } from '@/features/sign-out';

const navLinkClass =
  'flex h-8 items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-xs font-normal text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring';

export function WorkspaceHeader() {
  const { user } = useAuth();
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border/60 px-3 sm:gap-4 sm:px-5 md:h-15 md:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-6">
        <Link
          to="/clients"
          aria-label="Helpix — к списку клиентов"
          className="flex shrink-0 items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-ring"
        >
          <img src="/favicon.svg" alt="" className="size-8 shrink-0" aria-hidden="true" />
          <span className="hidden text-xl font-medium sm:block">
            helpix<span className="text-primary">.</span>
          </span>
        </Link>
        <nav aria-label="Разделы" className="flex items-center gap-1">
          <Link
            to="/clients"
            className={navLinkClass}
            activeProps={{ className: 'bg-primary text-primary-foreground' }}
          >
            <MessageSquare className="hidden size-4 sm:block" aria-hidden="true" />
            Сообщения
          </Link>
          <Link
            to="/articles"
            className={navLinkClass}
            activeProps={{ className: 'bg-primary text-primary-foreground' }}
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
