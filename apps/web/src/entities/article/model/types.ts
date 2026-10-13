export interface ArticleSummary {
  id: number;
  title: string;
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
