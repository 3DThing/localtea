'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Paper,
  Title,
  TextInput,
  Button,
  Group,
  Tabs,
  Stack,
  Breadcrumbs,
  Anchor,
  Text,
  Switch,
  Box,
  Image,
  ActionIcon,
  Flex,
  Skeleton,
  Badge,
  Divider,
} from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import {
  IconArrowLeft,
  IconDeviceFloppy,
  IconPhoto,
  IconUpload,
  IconX,
  IconTrash,
  IconSend,
  IconSendOff,
  IconEye,
  IconHeart,
  IconMessage,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import dayjs from 'dayjs';

import { useArticle, useCreateArticle, useUpdateArticle, usePublishArticle, useUnpublishArticle } from '@/features/blog/hooks';
import { BlogService } from '@/features/blog/api';
import { ArticleCreate, ArticleUpdate } from '@/features/blog/types';

// Динамический импорт RichTextEditor (он использует browser-only APIs)
const RichTextEditor = dynamic(
  () => import('@/components/shared/RichTextEditor').then((mod) => mod.RichTextEditor),
  { 
    ssr: false,
    loading: () => <Skeleton height={400} />,
  }
);

// Генерация slug из заголовка
function generateSlug(title: string): string {
  const translitMap: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
  };

  return title
    .toLowerCase()
    .split('')
    .map((char) => translitMap[char] || char)
    .join('')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

export default function ArticleEditPage() {
  const router = useRouter();
  const params = useParams();
  const articleId = params.id === 'new' ? null : Number(params.id);
  const isNew = articleId === null;

  const { data: article, isLoading } = useArticle(articleId);
  const createArticle = useCreateArticle();
  const updateArticle = useUpdateArticle();
  const publishArticle = usePublishArticle();
  const unpublishArticle = useUnpublishArticle();

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Заполнение формы при загрузке статьи
  useEffect(() => {
    if (article) {
      setTitle(article.title);
      setSlug(article.slug);
      setContent(article.content);
      setPreviewImage(article.preview_image || null);
      setIsPublished(article.is_published);
    }
  }, [article]);

  // Автогенерация slug при вводе заголовка (только для новых статей)
  useEffect(() => {
    if (isNew && title) {
      setSlug(generateSlug(title));
    }
  }, [title, isNew]);

  const handleSave = async () => {
    if (!title.trim()) {
      notifications.show({
        title: 'Ошибка',
        message: 'Укажите заголовок статьи',
        color: 'red',
      });
      return;
    }

    if (!slug.trim()) {
      notifications.show({
        title: 'Ошибка',
        message: 'Укажите URL (slug) статьи',
        color: 'red',
      });
      return;
    }

    if (!content.trim() || content === '<p></p>') {
      notifications.show({
        title: 'Ошибка',
        message: 'Добавьте содержание статьи',
        color: 'red',
      });
      return;
    }

    if (isNew) {
      const data: ArticleCreate = {
        title,
        slug,
        content,
        preview_image: previewImage || undefined,
        is_published: isPublished,
      };
      createArticle.mutate(data, {
        onSuccess: (newArticle) => {
          router.push(`/dashboard/blog/${newArticle.id}`);
        },
      });
    } else {
      const data: ArticleUpdate = {
        title,
        slug,
        content,
        preview_image: previewImage || undefined,
        is_published: isPublished,
      };
      updateArticle.mutate({ id: articleId!, data });
    }
  };

  const handleImageUpload = useCallback(async (file: File): Promise<string> => {
    // Бэкенд уже возвращает полный URL
    const url = await BlogService.uploadImage(file);
    return url;
  }, []);

  const handlePreviewImageUpload = async (files: File[]) => {
    if (files.length === 0) return;
    
    setUploading(true);
    try {
      const url = await handleImageUpload(files[0]);
      setPreviewImage(url);
    } catch (error) {
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось загрузить изображение',
        color: 'red',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleTogglePublish = () => {
    if (!articleId) return;
    
    if (article?.is_published) {
      unpublishArticle.mutate(articleId, {
        onSuccess: () => setIsPublished(false),
      });
    } else {
      publishArticle.mutate(articleId, {
        onSuccess: () => setIsPublished(true),
      });
    }
  };

  const isPending = createArticle.isPending || updateArticle.isPending;

  if (!isNew && isLoading) {
    return (
      <Stack gap="md">
        <Skeleton height={30} width={300} />
        <Paper p="md" withBorder>
          <Skeleton height={40} mb="md" />
          <Skeleton height={40} mb="md" />
          <Skeleton height={400} />
        </Paper>
      </Stack>
    );
  }

  const breadcrumbItems = [
    { title: 'Блог', href: '/dashboard/blog' },
    { title: isNew ? 'Новая статья' : article?.title || 'Редактирование' },
  ];

  return (
    <Stack gap="md">
      {/* Breadcrumbs и действия */}
      <Flex justify="space-between" align="center" wrap="wrap" gap="sm">
        <Breadcrumbs>
          {breadcrumbItems.map((item, index) =>
            item.href ? (
              <Anchor component={Link} href={item.href} key={index} size="sm">
                {item.title}
              </Anchor>
            ) : (
              <Text size="sm" key={index}>
                {item.title}
              </Text>
            )
          )}
        </Breadcrumbs>
        <Group gap="sm">
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => router.push('/dashboard/blog')}
          >
            Назад
          </Button>
          {!isNew && (
            <Button
              variant="light"
              color={isPublished ? 'orange' : 'green'}
              leftSection={isPublished ? <IconSendOff size={16} /> : <IconSend size={16} />}
              onClick={handleTogglePublish}
              loading={publishArticle.isPending || unpublishArticle.isPending}
            >
              {isPublished ? 'Снять с публикации' : 'Опубликовать'}
            </Button>
          )}
          <Button
            leftSection={<IconDeviceFloppy size={16} />}
            onClick={handleSave}
            loading={isPending}
          >
            {isNew ? 'Создать' : 'Сохранить'}
          </Button>
        </Group>
      </Flex>

      {/* Статистика (для существующих статей) */}
      {!isNew && article && (
        <Group gap="md">
          <Badge color={isPublished ? 'green' : 'gray'} variant="light" size="lg">
            {isPublished ? 'Опубликовано' : 'Черновик'}
          </Badge>
          <Group gap="xs">
            <IconEye size={16} color="gray" />
            <Text size="sm" c="dimmed">{article.views_count} просмотров</Text>
          </Group>
          <Group gap="xs">
            <IconHeart size={16} color="gray" />
            <Text size="sm" c="dimmed">{article.likes_count} лайков</Text>
          </Group>
          <Group gap="xs">
            <IconMessage size={16} color="gray" />
            <Text size="sm" c="dimmed">{article.comments_count} комментариев</Text>
          </Group>
          <Text size="sm" c="dimmed">
            Создано: {dayjs(article.created_at).format('DD.MM.YYYY HH:mm')}
          </Text>
        </Group>
      )}

      {/* Основная форма */}
      <Tabs defaultValue="content">
        <Tabs.List>
          <Tabs.Tab value="content">Содержание</Tabs.Tab>
          <Tabs.Tab value="cover">Обложка</Tabs.Tab>
          <Tabs.Tab value="preview" leftSection={<IconEye size={14} />}>Предпросмотр</Tabs.Tab>
          <Tabs.Tab value="settings">Настройки</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="content" pt="md">
          <Paper p="md" withBorder>
            <Stack gap="md">
              <TextInput
                label="Заголовок"
                placeholder="Введите заголовок статьи"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <TextInput
                label="URL (slug)"
                placeholder="url-stati"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                description="Используется в адресе страницы статьи"
                required
              />
              <Box>
                <Text size="sm" fw={500} mb="xs">
                  Содержание
                </Text>
                <RichTextEditor
                  content={content}
                  onChange={setContent}
                  onImageUpload={handleImageUpload}
                  placeholder="Начните писать статью..."
                />
              </Box>
            </Stack>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="cover" pt="md">
          <Paper p="md" withBorder>
            <Stack gap="md">
              <Text size="sm" fw={500}>Обложка статьи</Text>
              
              {previewImage ? (
                <Box pos="relative" style={{ maxWidth: 400 }}>
                  <Image
                    src={previewImage}
                    alt="Обложка"
                    radius="md"
                    fit="cover"
                    h={200}
                  />
                  <ActionIcon
                    variant="filled"
                    color="red"
                    size="sm"
                    pos="absolute"
                    top={8}
                    right={8}
                    onClick={() => setPreviewImage(null)}
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                </Box>
              ) : (
                <Dropzone
                  onDrop={handlePreviewImageUpload}
                  accept={IMAGE_MIME_TYPE}
                  maxSize={5 * 1024 ** 2}
                  multiple={false}
                  loading={uploading}
                  style={{ maxWidth: 400 }}
                >
                  <Group
                    justify="center"
                    gap="xl"
                    mih={150}
                    style={{ pointerEvents: 'none' }}
                  >
                    <Dropzone.Accept>
                      <IconUpload size={50} stroke={1.5} />
                    </Dropzone.Accept>
                    <Dropzone.Reject>
                      <IconX size={50} stroke={1.5} />
                    </Dropzone.Reject>
                    <Dropzone.Idle>
                      <IconPhoto size={50} stroke={1.5} />
                    </Dropzone.Idle>

                    <Box ta="center">
                      <Text size="sm" fw={500}>
                        Перетащите или кликните
                      </Text>
                      <Text size="xs" c="dimmed">
                        PNG, JPG до 5MB
                      </Text>
                    </Box>
                  </Group>
                </Dropzone>
              )}
            </Stack>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="preview" pt="md">
          <Paper p="xl" withBorder>
            <Stack gap="lg">
              {/* Обложка */}
              {previewImage && (
                <Box style={{ marginLeft: -24, marginRight: -24, marginTop: -24 }}>
                  <Image
                    src={previewImage}
                    alt={title}
                    h={300}
                    fit="cover"
                  />
                </Box>
              )}
              
              {/* Заголовок */}
              <Title order={1} style={{ fontSize: '2.5rem', lineHeight: 1.2 }}>
                {title || 'Заголовок статьи'}
              </Title>
              
              {/* Мета-информация */}
              <Group gap="md">
                <Text size="sm" c="dimmed">
                  {article?.author?.firstname} {article?.author?.lastname}
                </Text>
                <Text size="sm" c="dimmed">•</Text>
                <Text size="sm" c="dimmed">
                  {dayjs().format('DD MMMM YYYY')}
                </Text>
              </Group>
              
              <Divider />
              
              {/* Контент */}
              <Box
                className="article-content"
                dangerouslySetInnerHTML={{ 
                  __html: content || '<p style="color: #868e96;">Содержание статьи появится здесь...</p>' 
                }}
                style={{
                  fontSize: '1.1rem',
                  lineHeight: 1.8,
                }}
              />
            </Stack>
          </Paper>
          
          {/* Стили для контента статьи */}
          <style jsx global>{`
            .article-content h1 { font-size: 2rem; margin: 1.5rem 0 1rem; }
            .article-content h2 { font-size: 1.5rem; margin: 1.5rem 0 1rem; }
            .article-content h3 { font-size: 1.25rem; margin: 1.5rem 0 1rem; }
            .article-content p { margin: 1rem 0; }
            .article-content img { max-width: 100%; height: auto; border-radius: 8px; margin: 1rem 0; }
            .article-content ul, .article-content ol { padding-left: 1.5rem; margin: 1rem 0; }
            .article-content li { margin: 0.5rem 0; }
            .article-content blockquote { 
              border-left: 4px solid #228be6; 
              padding-left: 1rem; 
              margin: 1rem 0;
              color: #495057;
              font-style: italic;
            }
            .article-content code {
              background: #f1f3f5;
              padding: 0.2rem 0.4rem;
              border-radius: 4px;
              font-family: monospace;
            }
            .article-content pre {
              background: #f1f3f5;
              padding: 1rem;
              border-radius: 8px;
              overflow-x: auto;
            }
            .article-content a { color: #228be6; text-decoration: underline; }
            .article-content mark { background: #fff3bf; padding: 0.1rem 0.2rem; }
          `}</style>
        </Tabs.Panel>

        <Tabs.Panel value="settings" pt="md">
          <Paper p="md" withBorder>
            <Stack gap="md">
              <Switch
                label="Опубликовать сразу"
                description="Статья будет доступна для всех пользователей"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.currentTarget.checked)}
              />
            </Stack>
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
