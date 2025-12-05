// Типы для модуля блога

export interface ArticleAuthor {
  id: number;
  username?: string;
  email: string;
}

export interface Article {
  id: number;
  title: string;
  slug: string;
  content: string;
  preview_image?: string;
  is_published: boolean;
  created_at: string;
  author_id?: number;
  author?: ArticleAuthor;
  views_count: number;
  likes_count: number;
  comments_count: number;
}

export interface ArticleListResponse {
  items: Article[];
  total: number;
}

export interface ArticleCreate {
  title: string;
  slug: string;
  content: string;
  preview_image?: string;
  is_published?: boolean;
}

export interface ArticleUpdate {
  title?: string;
  slug?: string;
  content?: string;
  preview_image?: string;
  is_published?: boolean;
}
