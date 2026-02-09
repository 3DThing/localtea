'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Image,
  Title,
  Text,
  Group,
  Stack,
  Button,
  Card,
  Divider,
  ActionIcon,
  Skeleton,
  Textarea,
  Avatar,
  Menu,
  Modal,
  TextInput,
} from '@mantine/core';
import {
  IconHeart,
  IconEye,
  IconMessage,
  IconArrowLeft,
  IconShare,
  IconCalendar,
  IconTrash,
  IconFlag,
} from '@tabler/icons-react';
import { IconDotsVertical } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { notifications } from '@mantine/notifications';
import { blogApi, interactionsApi } from '@/lib/api';
import { useAuthStore } from '@/store';

export default function ArticleDetailClient() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const slug = params.slug as string;

  const [comment, setComment] = useState('');
  const [reportModalOpened, { open: openReportModal, close: closeReportModal }] = useDisclosure(false);
  const [reportingCommentId, setReportingCommentId] = useState<number | null>(null);
  const [reportReason, setReportReason] = useState('');
  const { user } = useAuthStore();

  const { data: articleResponse, isLoading } = useQuery({
    queryKey: ['article', slug],
    queryFn: () => blogApi.getArticle(slug),
  });

  const article = articleResponse?.data;

  const { data: commentsData, refetch: refetchComments } = useQuery({
    queryKey: ['comments', 'article', article?.id],
    queryFn: () => interactionsApi.getComments({ article_id: article?.id }),
    enabled: !!article?.id,
  });
  const comments = commentsData?.data || [];

  // Register view
  useEffect(() => {
    if (article?.id) {
      interactionsApi.registerView({ article_id: article.id }).catch(() => {});
    }
  }, [article?.id]);

  const likeMutation = useMutation({
    mutationFn: () => interactionsApi.toggleLike({ article_id: article.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['article', slug] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) => interactionsApi.createComment({
      content,
      article_id: article.id,
    }),
    onSuccess: () => {
      setComment('');
      refetchComments();
      notifications.show({
        title: 'Комментарий добавлен',
        message: 'Ваш комментарий успешно опубликован',
        color: 'green',
      });
    },
    onError: () => {
      notifications.show({
        title: 'Ошибка',
        message: 'Войдите в аккаунт, чтобы оставить комментарий',
        color: 'red',
      });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: number) => interactionsApi.deleteComment(commentId),
    onSuccess: () => {
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ['article', slug] });
      notifications.show({
        title: 'Комментарий удалён',
        message: 'Ваш комментарий успешно удалён',
        color: 'green',
      });
    },
    onError: () => {
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось удалить комментарий',
        color: 'red',
      });
    },
  });

  const reportCommentMutation = useMutation({
    mutationFn: ({ commentId, reason }: { commentId: number; reason: string }) =>
      interactionsApi.reportComment(commentId, { reason }),
    onSuccess: () => {
      closeReportModal();
      setReportReason('');
      setReportingCommentId(null);
      notifications.show({
        title: 'Жалоба отправлена',
        message: 'Спасибо! Мы рассмотрим вашу жалобу',
        color: 'green',
      });
    },
    onError: () => {
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось отправить жалобу',
        color: 'red',
      });
    },
  });

  const handleOpenReport = (commentId: number) => {
    setReportingCommentId(commentId);
    openReportModal();
  };

  const handleSubmitReport = () => {
    if (reportingCommentId && reportReason.trim()) {
      reportCommentMutation.mutate({ commentId: reportingCommentId, reason: reportReason });
    }
  };

  if (isLoading) {
    return (
      <Container size="md" py="xl">
        <Skeleton height={400} radius="lg" mb="xl" />
        <Skeleton height={40} width="60%" mb="md" />
        <Skeleton height={20} width="40%" mb="xl" />
        <Skeleton height={200} />
      </Container>
    );
  }

  if (!article) {
    return (
      <Container size="md" py="xl" ta="center">
        <Title order={2} mb="md">Статья не найдена</Title>
        <Button component="a" href="/blog">Вернуться в блог</Button>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      {/* Back Button */}
      <Button
        variant="subtle"
        color="gray"
        leftSection={<IconArrowLeft size={16} />}
        mb="xl"
        onClick={() => router.back()}
      >
        Назад к статьям
      </Button>

      {/* Hero Image */}
      <Card
        p={0}
        radius="lg"
        mb="xl"
        style={{
          overflow: 'hidden',
          border: '1px solid rgba(117, 61, 218, 0.2)',
        }}
      >
        <Image
          src={article.preview_image || 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=1200'}
          alt={article.title}
          h={400}
          style={{ objectFit: 'cover' }}
        />
      </Card>

      {/* Title & Meta */}
      <Stack gap="md" mb="xl">
        <Title order={1} style={{ lineHeight: 1.3 }}>
          {article.title}
        </Title>

        <Group gap="lg">
          <Group gap={4}>
            <IconCalendar size={16} style={{ opacity: 0.5 }} />
            <Text size="sm" c="dimmed">
              {new Date(article.created_at).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </Group>
          <Group gap={4}>
            <IconEye size={16} style={{ opacity: 0.5 }} />
            <Text size="sm" c="dimmed">{article.views_count}</Text>
          </Group>
          <Group gap={4}>
            <IconHeart
              size={16}
              style={{
                opacity: 0.5,
                cursor: 'pointer',
                color: article.is_liked ? '#ff6b6b' : undefined,
              }}
              onClick={() => likeMutation.mutate()}
            />
            <Text size="sm" c="dimmed">{article.likes_count}</Text>
          </Group>
          <Group gap={4}>
            <IconMessage size={16} style={{ opacity: 0.5 }} />
            <Text size="sm" c="dimmed">{article.comments_count}</Text>
          </Group>
        </Group>
      </Stack>

      {/* Content */}
      <Box
        mb={60}
        style={{
          lineHeight: 2,
          fontSize: '1.1rem',
        }}
        dangerouslySetInnerHTML={{ __html: article.content }}
      />

      {/* Actions */}
      <Card
        p="lg"
        radius="lg"
        mb={60}
        style={{
          background: 'rgba(26, 27, 30, 0.8)',
          border: '1px solid rgba(117, 61, 218, 0.2)',
        }}
      >
        <Group justify="space-between">
          <Group gap="md">
            <Button
              variant={article.is_liked ? 'filled' : 'light'}
              color={article.is_liked ? 'red' : 'gray'}
              leftSection={<IconHeart size={18} fill={article.is_liked ? '#fff' : 'none'} />}
              onClick={() => likeMutation.mutate()}
            >
              {article.is_liked ? 'Понравилось' : 'Нравится'}
            </Button>
            <Button
              variant="light"
              color="gray"
              leftSection={<IconShare size={18} />}
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                notifications.show({
                  message: 'Ссылка скопирована',
                  color: 'green',
                });
              }}
            >
              Поделиться
            </Button>
          </Group>
          <Text size="sm" c="dimmed">
            {article.views_count} просмотров
          </Text>
        </Group>
      </Card>

      {/* Comments Section */}
      <Box>
        <Title order={3} mb="xl">
          Комментарии ({article.comments_count})
        </Title>

        {/* Comment Form */}
        <Card
          p="lg"
          radius="md"
          mb="xl"
          style={{
            background: 'rgba(26, 27, 30, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          <Stack gap="md">
            <Text fw={600}>Оставить комментарий</Text>
            <Textarea
              placeholder={user ? 'Напишите ваш комментарий...' : 'Войдите, чтобы оставить комментарий'}
              value={comment}
              onChange={(e) => setComment(e.currentTarget.value)}
              minRows={3}
              disabled={!user}
            />
            <Group justify="flex-end">
              <Button
                variant="gradient"
                gradient={{ from: 'violet', to: 'grape' }}
                onClick={() => commentMutation.mutate(comment)}
                loading={commentMutation.isPending}
                disabled={!user || !comment.trim()}
              >
                Опубликовать
              </Button>
            </Group>
          </Stack>
        </Card>

        {/* Comments List */}
        {comments.length > 0 ? (
          <Stack gap="md">
            {comments.map((c: any) => (
              <Card
                key={c.id}
                p="lg"
                radius="md"
                style={{
                  background: 'rgba(26, 27, 30, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.03)',
                }}
              >
                <Group gap="md" mb="sm" justify="space-between">
                  <Group gap="md">
                    <Avatar 
                      radius="xl" 
                      size="md"
                      src={c.user?.avatar_url}
                    >
                      {c.user?.username?.charAt(0).toUpperCase() || 'U'}
                    </Avatar>
                    <Box>
                      <Text fw={600} size="sm">{c.user?.username || 'Пользователь'}</Text>
                      <Text size="xs" c="dimmed">
                        {new Date(c.created_at).toLocaleDateString('ru-RU')}
                      </Text>
                    </Box>
                  </Group>
                  {user && (
                    <Menu shadow="md" width={200}>
                      <Menu.Target>
                        <ActionIcon variant="subtle" color="gray">
                          <IconDotsVertical size={16} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        {c.user_id === user.id ? (
                          <Menu.Item
                            color="red"
                            leftSection={<IconTrash size={14} />}
                            onClick={() => deleteCommentMutation.mutate(c.id)}
                          >
                            Удалить
                          </Menu.Item>
                        ) : (
                          <Menu.Item
                            color="orange"
                            leftSection={<IconFlag size={14} />}
                            onClick={() => handleOpenReport(c.id)}
                          >
                            Пожаловаться
                          </Menu.Item>
                        )}
                      </Menu.Dropdown>
                    </Menu>
                  )}
                </Group>
                <Text style={{ lineHeight: 1.8 }}>{c.content}</Text>
              </Card>
            ))}
          </Stack>
        ) : (
          <Text c="dimmed" ta="center" py="xl">
            Пока нет комментариев. Будьте первым!
          </Text>
        )}
      </Box>

      {/* Report Modal */}
      <Modal
        opened={reportModalOpened}
        onClose={closeReportModal}
        title="Пожаловаться на комментарий"
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Опишите причину жалобы. Мы рассмотрим её в ближайшее время.
          </Text>
          <Textarea
            placeholder="Укажите причину жалобы..."
            value={reportReason}
            onChange={(e) => setReportReason(e.currentTarget.value)}
            minRows={3}
          />
          <Group justify="flex-end" gap="sm">
            <Button variant="subtle" onClick={closeReportModal}>
              Отмена
            </Button>
            <Button
              color="orange"
              onClick={handleSubmitReport}
              loading={reportCommentMutation.isPending}
              disabled={!reportReason.trim()}
            >
              Отправить жалобу
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
