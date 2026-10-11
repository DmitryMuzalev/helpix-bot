import { Link } from '@tanstack/react-router';
import { Button } from '@/shared/ui/button';

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 p-6 text-center">
      <h1 className="text-xl font-bold">Страница не найдена</h1>
      <Button asChild>
        <Link to="/clients">К списку клиентов</Link>
      </Button>
    </div>
  );
}
