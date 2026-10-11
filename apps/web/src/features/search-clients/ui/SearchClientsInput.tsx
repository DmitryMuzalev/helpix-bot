import type { ChangeEvent } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';

interface SearchClientsInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchClientsInput({ value, onChange }: SearchClientsInputProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value);
  const handleClear = () => onChange('');

  return (
    <div className="relative">
      <Search className="absolute top-3 left-3 size-4 text-muted-foreground" aria-hidden="true" />
      <Input
        aria-label="Поиск клиентов"
        placeholder="Найти клиента…"
        value={value}
        onChange={handleChange}
        className="h-10 rounded-xl bg-background/60 pr-9 pl-9 text-sm shadow-none"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-1 right-1 size-8"
          aria-label="Очистить поиск"
          onClick={handleClear}
        >
          <X className="size-3.5" />
        </Button>
      )}
    </div>
  );
}
