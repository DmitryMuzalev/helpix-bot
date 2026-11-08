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
        'flex flex-col items-center px-5 text-center [overflow-wrap:anywhere]',
        isCompact ? 'py-8' : 'm-auto max-w-md py-10',
      )}
      role={onRetry ? 'alert' : undefined}
    >
      <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <h2 className="text-base font-medium">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
      {onRetry && (
        <Button className="mt-4" variant="outline" onClick={onRetry}>
          Попробовать снова
        </Button>
      )}
    </div>
  );
}
