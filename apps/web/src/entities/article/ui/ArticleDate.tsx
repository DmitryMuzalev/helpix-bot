const articleDateFormat = new Intl.DateTimeFormat('ru', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function ArticleDate({ value }: { value: string }) {
  return <time dateTime={value}>{articleDateFormat.format(new Date(value))}</time>;
}
