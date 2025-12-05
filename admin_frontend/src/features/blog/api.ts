import { api } from '@/lib/axios';
import { Article, ArticleListResponse, ArticleCreate, ArticleUpdate } from './types';

const BASE_URL = '/blog';

export const BlogService = {
  /**
   * Получить список статей
   */
  async getArticles(params?: {
    skip?: number;
    limit?: number;
    search?: string;
    is_published?: boolean;
  }): Promise<ArticleListResponse> {
    const { data } = await api.get<ArticleListResponse>(BASE_URL + '/', { params });
    return data;
  },

  /**
   * Получить статью по ID
   */
  async getArticle(id: number): Promise<Article> {
    const { data } = await api.get<Article>(`${BASE_URL}/${id}`);
    return data;
  },

  /**
   * Создать новую статью
   */
  async createArticle(article: ArticleCreate): Promise<Article> {
    const { data } = await api.post<Article>(BASE_URL + '/', article);
    return data;
  },

  /**
   * Обновить статью
   */
  async updateArticle(id: number, article: ArticleUpdate): Promise<Article> {
    const { data } = await api.patch<Article>(`${BASE_URL}/${id}`, article);
    return data;
  },

  /**
   * Удалить статью
   */
  async deleteArticle(id: number): Promise<void> {
    await api.delete(`${BASE_URL}/${id}`);
  },

  /**
   * Опубликовать статью
   */
  async publishArticle(id: number): Promise<Article> {
    const { data } = await api.post<Article>(`${BASE_URL}/${id}/publish`);
    return data;
  },

  /**
   * Снять статью с публикации
   */
  async unpublishArticle(id: number): Promise<Article> {
    const { data } = await api.post<Article>(`${BASE_URL}/${id}/unpublish`);
    return data;
  },

  /**
   * Загрузить изображение для статьи
   */
  async uploadImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    
    // Не указываем Content-Type - axios сам установит multipart/form-data с boundary
    const { data } = await api.post<{ url: string }>(BASE_URL + '/upload-image', formData);
    return data.url;
  },
};
