export async function listAllPages<T>(
  loadPage: (from: number, to: number) => Promise<T[]>,
): Promise<T[]> {
  const pageSize = 500;
  const items: T[] = [];

  for (let from = 0; ; from += pageSize) {
    const page = await loadPage(from, from + pageSize - 1);
    items.push(...page);

    if (page.length < pageSize) return items;
  }
}
