import {
  ArticleNotFound,
  type Article,
  type ArticleDraftInput,
  type ArticleStatus,
  type ArticleSummary,
  hasArticleContentChanged,
  validateArticleId,
  validateArticleInput,
  validateArticleStatusInput,
} from '../domain/article.ts';
import { listAllPages } from './list-all-pages.ts';

export interface ArticleRepository {
  loadPage: (from: number, to: number) => Promise<ArticleSummary[]>;
  findById: (id: number) => Promise<Article | null>;
  create: (input: ArticleDraftInput) => Promise<Article>;
  update: (id: number, input: ArticleDraftInput) => Promise<Article | null>;
  setStatus: (id: number, status: ArticleStatus) => Promise<Article | null>;
  remove: (id: number) => Promise<boolean>;
}

export function listArticles(repository: ArticleRepository): Promise<ArticleSummary[]> {
  return listAllPages(repository.loadPage);
}

export async function getArticle(
  id: string | null,
  repository: ArticleRepository,
): Promise<Article> {
  const article = await repository.findById(validateArticleId(id));
  if (!article) throw new ArticleNotFound();
  return article;
}

export function createArticle(input: unknown, repository: ArticleRepository): Promise<Article> {
  return repository.create({ ...validateArticleInput(input), status: 'draft' });
}

export async function updateArticle(
  id: string | null,
  input: unknown,
  repository: ArticleRepository,
): Promise<Article> {
  const articleId = validateArticleId(id);
  const fields = validateArticleInput(input);
  const current = await repository.findById(articleId);
  if (!current) throw new ArticleNotFound();
  if (!hasArticleContentChanged(current, fields)) return current;

  const article = await repository.update(articleId, { ...fields, status: 'draft' });
  if (!article) throw new ArticleNotFound();
  return article;
}

export async function changeArticleStatus(
  id: string | null,
  input: unknown,
  repository: ArticleRepository,
): Promise<Article> {
  const articleId = validateArticleId(id);
  const status = validateArticleStatusInput(input);
  const article = await repository.setStatus(articleId, status);
  if (!article) throw new ArticleNotFound();
  return article;
}

export async function deleteArticle(
  id: string | null,
  repository: ArticleRepository,
): Promise<void> {
  const isDeleted = await repository.remove(validateArticleId(id));
  if (!isDeleted) throw new ArticleNotFound();
}
