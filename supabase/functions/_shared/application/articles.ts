import {
  ArticleNotFound,
  type Article,
  type ArticleInput,
  type ArticleSummary,
  validateArticleId,
  validateArticleInput,
} from '../domain/article.ts';
import { listAllPages } from './list-all-pages.ts';

export interface ArticleRepository {
  loadPage: (from: number, to: number) => Promise<ArticleSummary[]>;
  findById: (id: number) => Promise<Article | null>;
  create: (input: ArticleInput) => Promise<Article>;
  update: (id: number, input: ArticleInput) => Promise<Article | null>;
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
  return repository.create(validateArticleInput(input));
}

export async function updateArticle(
  id: string | null,
  input: unknown,
  repository: ArticleRepository,
): Promise<Article> {
  const articleId = validateArticleId(id);
  const article = await repository.update(articleId, validateArticleInput(input));
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
