export function validateLoginSearch(search: Record<string, unknown>) {
  const fallback = { redirect: '/clients' };
  if (typeof search.redirect !== 'string' || !search.redirect.startsWith('/')) return fallback;

  try {
    const baseUrl = 'https://helpix.invalid';
    const url = new URL(search.redirect, baseUrl);
    if (url.origin !== baseUrl || !/^\/(clients|articles)(\/|$)/.test(url.pathname))
      return fallback;
    return { redirect: `${url.pathname}${url.search}${url.hash}` };
  } catch {
    return fallback;
  }
}
