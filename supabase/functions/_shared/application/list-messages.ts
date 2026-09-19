export async function listMessages<T>(
  loadPage: (from: number, to: number) => Promise<T[]>,
): Promise<T[]> {
  const pageSize = 500;
  const messages: T[] = [];

  for (let from = 0; ; from += pageSize) {
    const page = await loadPage(from, from + pageSize - 1);
    messages.push(...page);

    if (page.length < pageSize) return messages;
  }
}
