export type ArticleStatus = 'draft' | 'published';

export interface ArticleSummary {
  id: number;
  title: string;
  status: ArticleStatus;
  created_at: string;
  updated_at: string;
}

export interface Article extends ArticleSummary {
  content: string;
}

export interface ArticleInput {
  title: string;
  content: string;
}

export interface ArticleDraftInput extends ArticleInput {
  status: 'draft';
}

export class InvalidArticleInput extends Error {}

export class ArticleNotFound extends Error {
  constructor() {
    super('Article not found');
  }
}

export function validateArticleId(value: string | null): number {
  if (value === null || !/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) {
    throw new InvalidArticleInput('id must be a positive safe integer');
  }
  return Number(value);
}

export function validateArticleInput(value: unknown): ArticleInput {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new InvalidArticleInput('Body must be an object with title and content');
  }
  if (Object.keys(value).some((key) => key !== 'title' && key !== 'content')) {
    throw new InvalidArticleInput('Only title and content may be provided');
  }
  if (!('title' in value) || typeof value.title !== 'string' || !value.title.trim()) {
    throw new InvalidArticleInput('title must be a non-empty string');
  }
  if (!('content' in value) || typeof value.content !== 'string' || !value.content.trim()) {
    throw new InvalidArticleInput('content must be a non-empty string');
  }
  // Trim the heading, but preserve indentation and line breaks in the article body.
  return { title: value.title.trim(), content: value.content };
}

export function validateArticleStatusInput(value: unknown): ArticleStatus {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new InvalidArticleInput('Body must be an object with status');
  }
  if (Object.keys(value).some((key) => key !== 'status')) {
    throw new InvalidArticleInput('Only status may be provided');
  }
  if (!('status' in value) || (value.status !== 'draft' && value.status !== 'published')) {
    throw new InvalidArticleInput('status must be draft or published');
  }
  return value.status;
}

export function hasArticleContentChanged(article: Article, input: ArticleInput): boolean {
  return article.title !== input.title || article.content !== input.content;
}
