import { AlertCircle, type LucideIcon } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/class-names';

interface StatePanelProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  onRetry?: () => void;
  isCompact?: boolean;
}

export function StatePanel({
  icon: Icon = AlertCircle,
  title,
  description,
  onRetry,
  isCompact,
}: StatePanelProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center px-6 py-12 text-center',
        !isCompact && 'm-auto max-w-md',
      )}
      role={onRetry ? 'alert' : undefined}
    >
      <div className="mb-5 flex size-14 items-center justify-center rounded-2xl border bg-muted/50 text-muted-foreground">
        <Icon className="size-6" aria-hidden="true" />
      </div>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
      {onRetry && (
        <Button className="mt-5" variant="outline" onClick={onRetry}>
          Попробовать снова
        </Button>
      )}
    </div>
  );
}
