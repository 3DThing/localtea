'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { BlogService } from './api';
import { ArticleCreate, ArticleUpdate } from './types';

const QUERY_KEY = 'blog';

/**
 * Хук для получения списка статей
 */
export function useArticles(params?: {
  skip?: number;
  limit?: number;
  search?: string;
  is_published?: boolean;
}) {
  return useQuery({
    queryKey: [QUERY_KEY, 'list', params],
    queryFn: () => BlogService.getArticles(params),
  });
}

/**
 * Хук для получения одной статьи
 */
export function useArticle(id: number | null) {
  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: () => BlogService.getArticle(id!),
    enabled: id !== null && id !== undefined,
  });
}

/**
 * Хук для создания статьи
 */
export function useCreateArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ArticleCreate) => BlogService.createArticle(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      notifications.show({
        title: 'Успешно',
        message: 'Статья создана',
        color: 'green',
      });
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      notifications.show({
        title: 'Ошибка',
        message: error.response?.data?.detail || 'Не удалось создать статью',
        color: 'red',
      });
    },
  });
}

/**
 * Хук для обновления статьи
 */
export function useUpdateArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ArticleUpdate }) =>
      BlogService.updateArticle(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', id] });
      notifications.show({
        title: 'Успешно',
        message: 'Статья обновлена',
        color: 'green',
      });
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      notifications.show({
        title: 'Ошибка',
        message: error.response?.data?.detail || 'Не удалось обновить статью',
        color: 'red',
      });
    },
  });
}

/**
 * Хук для удаления статьи
 */
export function useDeleteArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => BlogService.deleteArticle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      notifications.show({
        title: 'Успешно',
        message: 'Статья удалена',
        color: 'green',
      });
    },
    onError: () => {
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось удалить статью',
        color: 'red',
      });
    },
  });
}

/**
 * Хук для публикации статьи
 */
export function usePublishArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => BlogService.publishArticle(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', id] });
      notifications.show({
        title: 'Успешно',
        message: 'Статья опубликована',
        color: 'green',
      });
    },
    onError: () => {
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось опубликовать статью',
        color: 'red',
      });
    },
  });
}

/**
 * Хук для снятия статьи с публикации
 */
export function useUnpublishArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => BlogService.unpublishArticle(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', id] });
      notifications.show({
        title: 'Успешно',
        message: 'Статья снята с публикации',
        color: 'green',
      });
    },
    onError: () => {
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось снять статью с публикации',
        color: 'red',
      });
    },
  });
}

/**
 * Хук для загрузки изображения
 */
export function useUploadBlogImage() {
  return useMutation({
    mutationFn: (file: File) => BlogService.uploadImage(file),
    onError: () => {
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось загрузить изображение',
        color: 'red',
      });
    },
  });
}
