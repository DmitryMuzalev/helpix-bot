import { Avatar, AvatarFallback } from '@/shared/ui/avatar';
import type { Client } from '../model/types';
import { clientInitials } from '../lib/display';
import { cn } from '@/shared/lib/class-names';

export function ClientAvatar({ client, className }: { client: Client; className?: string }) {
  const tones = [
    'bg-[#33482d] text-[#b9e7a4]',
    'bg-[#37422e] text-[#d5df9c]',
    'bg-[#2d4541] text-[#a7d8ce]',
    'bg-[#414037] text-[#e0d5b3]',
  ];
  return (
    <Avatar className={cn('size-11 rounded-2xl', className)}>
      <AvatarFallback
        className={cn('rounded-2xl text-sm font-semibold', tones[client.id % tones.length])}
      >
        {clientInitials(client)}
      </AvatarFallback>
    </Avatar>
  );
}
