import { Avatar, AvatarFallback } from '@/shared/ui/avatar';
import type { Client } from '../model/types';
import { clientInitials } from '../lib/display';
import { cn } from '@/shared/lib/class-names';

export function ClientAvatar({ client, className }: { client: Client; className?: string }) {
  return (
    <Avatar className={cn('size-9 rounded-lg', className)}>
      <AvatarFallback className="rounded-lg bg-muted text-xs font-medium text-foreground">
        {clientInitials(client)}
      </AvatarFallback>
    </Avatar>
  );
}
