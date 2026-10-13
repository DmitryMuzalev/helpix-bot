import {
  createArticle,
  deleteArticle,
  getArticle,
  listArticles,
  updateArticle,
  type ArticleRepository,
} from '../application/articles.ts';
import { ArticleNotFound, InvalidArticleInput } from '../domain/article.ts';

const ALLOWED_METHODS = 'GET, POST, PUT, DELETE';

async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new InvalidArticleInput('Body must contain valid JSON');
  }
}

export async function handleArticlesRequest(
  req: Request,
  repository: ArticleRepository,
): Promise<Response> {
  if (!ALLOWED_METHODS.split(', ').includes(req.method)) {
    return Response.json(
      { error: 'Method Not Allowed' },
      { status: 405, headers: { Allow: ALLOWED_METHODS } },
    );
  }

  try {
    const params = new URL(req.url).searchParams;
    if (params.getAll('id').length > 1) {
      throw new InvalidArticleInput('id must be provided only once');
    }
    const id = params.get('id');

    switch (req.method) {
      case 'GET':
        return Response.json(
          params.has('id') ? await getArticle(id, repository) : await listArticles(repository),
        );
      case 'POST':
        if (params.has('id')) {
          throw new InvalidArticleInput('id must not be provided when creating an article');
        }
        return Response.json(await createArticle(await readJson(req), repository), { status: 201 });
      case 'PUT':
        return Response.json(await updateArticle(id, await readJson(req), repository));
      default:
        await deleteArticle(id, repository);
        return new Response(null, { status: 204 });
    }
  } catch (error) {
    if (error instanceof InvalidArticleInput) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof ArticleNotFound) {
      return Response.json({ error: error.message }, { status: 404 });
    }
    console.error('Failed to process articles request');
    return Response.json({ error: 'Unable to process articles request' }, { status: 500 });
  }
}
