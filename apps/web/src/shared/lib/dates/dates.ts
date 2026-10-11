export function dateKey(value: string): string {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function dayLabel(value: string): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (dateKey(value) === dateKey(today.toISOString())) return 'Сегодня';
  if (dateKey(value) === dateKey(yesterday.toISOString())) return 'Вчера';
  return new Intl.DateTimeFormat('ru', {
    day: 'numeric',
    month: 'long',
    ...(new Date(value).getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}),
  }).format(new Date(value));
}

export function formatTime(value: string): string {
  return new Intl.DateTimeFormat('ru', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(value),
  );
}
