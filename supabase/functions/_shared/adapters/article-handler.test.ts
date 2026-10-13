import type { ArticleRepository } from '../application/articles.ts';
import type { Article } from '../domain/article.ts';
import articlesFunction from '../../articles/index.ts';
import { handleArticlesRequest } from './article-handler.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const ARTICLE: Article = {
  id: 1,
  title: 'Help',
  content: 'Instructions',
  created_at: '2026-10-13T12:00:00Z',
  updated_at: '2026-10-13T12:00:00Z',
};

function createRepository(): ArticleRepository {
  const rows = new Map<number, Article>();
  return {
    async loadPage(from, to) {
      return [...rows.values()].slice(from, to + 1).map((row) => ({
        id: row.id,
        title: row.title,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
    },
    async findById(id) {
      return rows.get(id) ?? null;
    },
    async create(input) {
      const article = { ...ARTICLE, ...input };
      rows.set(article.id, article);
      return article;
    },
    async update(id, input) {
      const current = rows.get(id);
      if (!current) return null;
      const article = { ...current, ...input, updated_at: '2026-10-13T13:00:00Z' };
      rows.set(id, article);
      return article;
    },
    async remove(id) {
      return rows.delete(id);
    },
  };
}

function request(method: string, query = '', body?: unknown): Request {
  return new Request(`https://example.supabase.co/functions/v1/articles${query}`, {
    method,
    ...(body === undefined
      ? {}
      : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  });
}

Deno.test('creates, lists, reads, edits and deletes an article through HTTP', async () => {
  const repository = createRepository();
  const content = '\n  indented instructions\n\n';
  const created = await handleArticlesRequest(
    request('POST', '', { title: '  Help  ', content }),
    repository,
  );
  const article = await created.json();
  assert(created.status === 201 && article.id === 1, 'Article was not created');
  assert(article.title === 'Help' && article.content === content, 'Text formatting was lost');

  const list = await handleArticlesRequest(request('GET'), repository);
  const items = await list.json();
  assert(list.status === 200 && items.length === 1, 'Article is missing from the list');
  assert(items[0].title === 'Help' && !('content' in items[0]), 'Unexpected list fields');

  const detail = await handleArticlesRequest(request('GET', '?id=1'), repository);
  assert(detail.status === 200 && (await detail.json()).content === content, 'Missing body');

  const edited = await handleArticlesRequest(
    request('PUT', '?id=1', { title: 'New heading', content: 'New instructions' }),
    repository,
  );
  const updated = await edited.json();
  assert(edited.status === 200 && updated.content === 'New instructions', 'Edit was not saved');
  assert(updated.created_at === article.created_at, 'Creation timestamp was changed');
  assert(updated.updated_at !== article.updated_at, 'Updated timestamp was lost');

  const deleted = await handleArticlesRequest(request('DELETE', '?id=1'), repository);
  assert(deleted.status === 204 && (await deleted.text()) === '', 'Unexpected delete response');
  const missing = await handleArticlesRequest(request('GET', '?id=1'), repository);
  assert(missing.status === 404, 'Deleted article is still accessible');
  const empty = await handleArticlesRequest(request('GET'), repository);
  assert((await empty.json()).length === 0, 'Deleted article is still listed');
});

Deno.test('rejects invalid JSON, fields and IDs before accessing storage', async () => {
  let hasAccessedStorage = false;
  const fail = async () => {
    hasAccessedStorage = true;
    throw new Error('Unexpected storage access');
  };
  const repository: ArticleRepository = {
    loadPage: fail,
    findById: fail,
    create: fail,
    update: fail,
    remove: fail,
  };
  const input = { title: 'Heading', content: 'Body' };
  const invalidBodies = [
    null,
    [],
    'text',
    {},
    { title: 'Heading' },
    { content: 'Body' },
    { ...input, title: 1 },
    { ...input, content: false },
    { ...input, title: ' \n\t' },
    { ...input, content: ' \n\t' },
    { ...input, id: 123 },
    { ...input, created_at: ARTICLE.created_at },
    { ...input, updated_at: ARTICLE.updated_at },
  ];
  const requests = invalidBodies.flatMap((body) => [
    request('POST', '', body),
    request('PUT', '?id=1', body),
  ]);
  for (const id of ['', '0', '-1', '1.5', '1e2', 'abc', '9007199254740992', '1&id=2']) {
    requests.push(
      request('GET', `?id=${id}`),
      request('PUT', `?id=${id}`, input),
      request('DELETE', `?id=${id}`),
    );
  }
  requests.push(
    request('POST', '?id=1', input),
    request('PUT', '', input),
    request('DELETE'),
    request('POST'),
    new Request('https://example.supabase.co/functions/v1/articles', {
      method: 'POST',
      body: '{broken-json',
    }),
  );
  for (const req of requests) {
    const response = await handleArticlesRequest(req, repository);
    assert(response.status === 400, `Accepted invalid input: ${req.method} ${req.url}`);
    assert(typeof (await response.json()).error === 'string', 'Missing validation message');
  }
  assert(!hasAccessedStorage, 'Invalid request accessed storage');
});

Deno.test('returns 404 for missing articles on read, update and delete', async () => {
  const repository = createRepository();
  for (const req of [
    request('GET', '?id=999'),
    request('PUT', '?id=999', { title: 'Heading', content: 'Body' }),
    request('DELETE', '?id=999'),
  ]) {
    const response = await handleArticlesRequest(req, repository);
    assert(response.status === 404, 'Missing article was not reported');
    assert((await response.json()).error === 'Article not found', 'Unexpected error message');
  }
});

Deno.test('loads all articles even when more than one database page is needed', async () => {
  const rows = Array.from({ length: 501 }, (_, index) => ({ ...ARTICLE, id: index + 1 }));
  const ranges: string[] = [];
  const repository = createRepository();
  repository.loadPage = async (from, to) => {
    ranges.push(`${from}-${to}`);
    return rows.slice(from, to + 1);
  };
  const response = await handleArticlesRequest(request('GET'), repository);
  assert((await response.json()).length === 501, 'List was truncated');
  assert(ranges.join(',') === '0-499,500-999', 'Incorrect pagination');
});

Deno.test('rejects unsupported methods with an Allow header', async () => {
  const response = await handleArticlesRequest(request('PATCH'), createRepository());
  assert(response.status === 405, 'Unexpected method was accepted');
  assert(response.headers.get('Allow') === 'GET, POST, PUT, DELETE', 'Missing Allow header');
});

Deno.test('the Edge Function answers browser preflight for reads and mutations', async () => {
  const response = await articlesFunction.fetch(
    new Request('https://example.supabase.co/functions/v1/articles', { method: 'OPTIONS' }),
  );
  assert(response.status === 204, 'Preflight failed');
  const methods = response.headers.get('Access-Control-Allow-Methods') ?? '';
  for (const method of ['GET', 'POST', 'PUT', 'DELETE']) {
    assert(methods.includes(method), `CORS does not allow ${method}`);
  }
  const headers = response.headers.get('Access-Control-Allow-Headers') ?? '';
  assert(headers.includes('content-type') && headers.includes('apikey'), 'Missing CORS headers');
});
