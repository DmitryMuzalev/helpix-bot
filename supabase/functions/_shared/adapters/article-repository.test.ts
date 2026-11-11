import { createClient } from '@supabase/supabase-js';
import { createArticleRepository } from './article-repository.ts';
import { handleArticlesRequest } from './article-handler.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function createRepository(fetch: typeof globalThis.fetch) {
  const db = createClient('https://example.supabase.co', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch },
  });
  return createArticleRepository(db);
}

Deno.test(
  'queries article summaries in stable order and retrieves full content separately',
  async () => {
    let hasLoadedPage = false;
    const repository = createRepository(async (input, init) => {
      const url = new URL(String(input));
      assert(url.pathname === '/rest/v1/articles' && init?.method === 'GET', 'Unexpected query');
      if (!url.searchParams.has('id')) {
        hasLoadedPage = true;
        assert(
          url.searchParams.get('select') === 'id,title,status,created_at,updated_at',
          'Loaded content',
        );
        assert(url.searchParams.get('order') === 'created_at.desc,id.desc', 'Unstable ordering');
        assert(url.searchParams.get('offset') === '500', 'Incorrect page offset');
        assert(url.searchParams.get('limit') === '500', 'Incorrect page size');
        return Response.json([]);
      }
      assert(url.searchParams.get('id') === 'eq.42', 'Incorrect article filter');
      assert(url.searchParams.get('select')?.includes('content'), 'Content was omitted');
      assert(url.searchParams.get('select')?.includes('status'), 'Status was omitted');
      return Response.json([{ id: 42, title: 'Heading', content: 'Body', status: 'draft' }]);
    });
    await repository.loadPage(500, 999);
    const article = await repository.findById(42);
    assert(
      hasLoadedPage && article?.content === 'Body' && article.status === 'draft',
      'Article was not loaded',
    );
  },
);

Deno.test(
  'inserts and updates only editable fields and filters update and delete by ID',
  async () => {
    const input = { title: 'Heading', content: 'Body', status: 'draft' as const };
    const methods: string[] = [];
    const repository = createRepository(async (request, init) => {
      const url = new URL(String(request));
      const method = init?.method ?? '';
      methods.push(method);
      assert(url.pathname === '/rest/v1/articles', 'Unexpected table');
      if (method === 'POST') {
        assert(!url.searchParams.has('id'), 'Create unexpectedly filters an existing article');
      } else {
        assert(url.searchParams.get('id') === 'eq.42', 'Mutation may affect other articles');
      }
      if (method !== 'DELETE') {
        assert(init?.body === JSON.stringify(input), 'Unexpected mutation fields');
        assert(url.searchParams.get('select')?.includes('updated_at'), 'Timestamp was omitted');
      } else {
        assert(url.searchParams.get('select') === 'id', 'Deleted ID is missing');
      }
      return Response.json({ id: 42, ...input }, { status: method === 'POST' ? 201 : 200 });
    });
    assert((await repository.create(input)).id === 42, 'Create lost the ID');
    assert((await repository.update(42, input))?.content === 'Body', 'Update lost content');
    assert(await repository.remove(42), 'Delete was not confirmed');
    assert(methods.join(',') === 'POST,PATCH,DELETE', 'Unexpected mutation methods');
  },
);

Deno.test('changes only the publication status of the selected article', async () => {
  const statuses: string[] = [];
  const repository = createRepository(async (request, init) => {
    const url = new URL(String(request));
    assert(url.pathname === '/rest/v1/articles' && init?.method === 'PATCH', 'Unexpected mutation');
    assert(url.searchParams.get('id') === 'eq.42', 'Status change may affect other articles');
    assert(url.searchParams.get('select')?.includes('status'), 'Status was omitted');
    const body = JSON.parse(String(init.body));
    assert(Object.keys(body).join(',') === 'status', 'Status change may overwrite article content');
    statuses.push(body.status);
    return Response.json({ id: 42, title: 'Heading', content: 'Body', status: body.status });
  });

  assert(
    (await repository.setStatus(42, 'published'))?.status === 'published',
    'Publication failed',
  );
  assert((await repository.setStatus(42, 'draft'))?.status === 'draft', 'Unpublication failed');
  assert(statuses.join(',') === 'published,draft', 'Unexpected publication statuses');
});

Deno.test('treats zero affected rows as missing articles', async () => {
  const repository = createRepository(async () => Response.json([]));
  assert((await repository.findById(42)) === null, 'Missing read returned an article');
  assert(
    (await repository.update(42, { title: 'Heading', content: 'Body', status: 'draft' })) === null,
    'Missing update returned an article',
  );
  assert(
    (await repository.setStatus(42, 'published')) === null,
    'Missing status change returned an article',
  );
  assert(!(await repository.remove(42)), 'Missing delete reported success');
});

Deno.test('returns 500 for database failures without exposing database details', async () => {
  const repository = createRepository(async () =>
    Response.json({ code: '42501', message: 'private database details' }, { status: 403 }),
  );
  for (const [method, query] of [
    ['GET', ''],
    ['GET', '?id=42'],
    ['POST', ''],
    ['PUT', '?id=42'],
    ['PATCH', '?id=42'],
    ['DELETE', '?id=42'],
  ]) {
    const hasBody = method === 'POST' || method === 'PUT' || method === 'PATCH';
    const body =
      method === 'PATCH' ? { status: 'published' } : { title: 'Heading', content: 'Body' };
    const req = new Request(`https://example.supabase.co/functions/v1/articles${query}`, {
      method,
      ...(hasBody ? { body: JSON.stringify(body) } : {}),
    });
    const response = await handleArticlesRequest(req, repository);
    assert(response.status === 500, `${method} swallowed a database failure`);
    assert(!(await response.text()).includes('private'), 'Database details leaked');
  }
});
