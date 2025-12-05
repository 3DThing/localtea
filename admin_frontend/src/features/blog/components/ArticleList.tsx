'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  Group,
  Text,
  ActionIcon,
  Badge,
  Button,
  Paper,
  Pagination,
  Avatar,
  Flex,
  Tooltip,
  Box,
  TextInput,
  SegmentedControl,
  Skeleton,
} from '@mantine/core';
import {
  IconPencil,
  IconTrash,
  IconPlus,
  IconEye,
  IconHeart,
  IconMessage,
  IconSearch,
  IconSend,
  IconSendOff,
} from '@tabler/icons-react';
import { useDebouncedValue } from '@mantine/hooks';
import { useArticles, useDeleteArticle, usePublishArticle, useUnpublishArticle } from '../hooks';
import { Article } from '../types';
import dayjs from 'dayjs';

const PAGE_SIZE = 20;

export function ArticleList() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 300);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data, isLoading } = useArticles({
    skip: (page - 1) * PAGE_SIZE,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    is_published: statusFilter === 'all' ? undefined : statusFilter === 'published',
  });

  const deleteArticle = useDeleteArticle();
  const publishArticle = usePublishArticle();
  const unpublishArticle = useUnpublishArticle();

  const handleDelete = async (article: Article, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Вы уверены, что хотите удалить статью "${article.title}"?`)) return;
    deleteArticle.mutate(article.id);
  };

  const handleEdit = (article: Article) => {
    router.push(`/dashboard/blog/${article.id}`);
  };

  const handleCreate = () => {
    router.push('/dashboard/blog/new');
  };

  const handlePublish = (article: Article, e: React.MouseEvent) => {
    e.stopPropagation();
    if (article.is_published) {
      unpublishArticle.mutate(article.id);
    } else {
      publishArticle.mutate(article.id);
    }
  };

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  const rows = data?.items.map((article) => (
    <Table.Tr
      key={article.id}
      style={{ cursor: 'pointer' }}
      onClick={() => handleEdit(article)}
    >
      <Table.Td>
        <Avatar
          src={article.preview_image}
          size="md"
          radius="md"
          color="teal"
        >
          {article.title[0]}
        </Avatar>
      </Table.Td>
      <Table.Td>
        <Box>
          <Text size="sm" fw={500} lineClamp={1}>
            {article.title}
          </Text>
          <Text size="xs" c="dimmed" lineClamp={1}>
            /{article.slug}
          </Text>
        </Box>
      </Table.Td>
      <Table.Td>
        <Text size="xs" c="dimmed">
          {article.author?.email || '—'}
        </Text>
      </Table.Td>
      <Table.Td>
        <Badge
          color={article.is_published ? 'green' : 'gray'}
          variant="light"
          size="sm"
        >
          {article.is_published ? 'Опубликовано' : 'Черновик'}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Group gap="xs">
          <Tooltip label="Просмотры">
            <Group gap={4}>
              <IconEye size={14} color="gray" />
              <Text size="xs" c="dimmed">{article.views_count}</Text>
            </Group>
          </Tooltip>
          <Tooltip label="Лайки">
            <Group gap={4}>
              <IconHeart size={14} color="gray" />
              <Text size="xs" c="dimmed">{article.likes_count}</Text>
            </Group>
          </Tooltip>
          <Tooltip label="Комментарии">
            <Group gap={4}>
              <IconMessage size={14} color="gray" />
              <Text size="xs" c="dimmed">{article.comments_count}</Text>
            </Group>
          </Tooltip>
        </Group>
      </Table.Td>
      <Table.Td>
        <Text size="xs" c="dimmed">
          {dayjs(article.created_at).format('DD.MM.YYYY HH:mm')}
        </Text>
      </Table.Td>
      <Table.Td>
        <Group gap={4} justify="flex-end" wrap="nowrap">
          <Tooltip label={article.is_published ? 'Снять с публикации' : 'Опубликовать'}>
            <ActionIcon
              variant="subtle"
              color={article.is_published ? 'orange' : 'green'}
              size="sm"
              onClick={(e) => handlePublish(article, e)}
              loading={publishArticle.isPending || unpublishArticle.isPending}
            >
              {article.is_published ? <IconSendOff size={16} /> : <IconSend size={16} />}
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Редактировать">
            <ActionIcon
              variant="subtle"
              color="teal"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(article);
              }}
            >
              <IconPencil size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Удалить">
            <ActionIcon
              variant="subtle"
              color="red"
              size="sm"
              onClick={(e) => handleDelete(article, e)}
              loading={deleteArticle.isPending}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Paper shadow="xs" radius="md" withBorder>
      <Flex p="md" gap="md" justify="space-between" align="center" wrap="wrap">
        <Group gap="md">
          <TextInput
            placeholder="Поиск по заголовку..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="sm"
            w={250}
          />
          <SegmentedControl
            size="xs"
            value={statusFilter}
            onChange={setStatusFilter}
            data={[
              { label: 'Все', value: 'all' },
              { label: 'Опубликовано', value: 'published' },
              { label: 'Черновики', value: 'draft' },
            ]}
          />
        </Group>
        <Button
          size="sm"
          leftSection={<IconPlus size={16} />}
          onClick={handleCreate}
        >
          Новая статья
        </Button>
      </Flex>

      <Table.ScrollContainer minWidth={800}>
        <Table striped highlightOnHover verticalSpacing="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={60}>Фото</Table.Th>
              <Table.Th>Заголовок</Table.Th>
              <Table.Th>Автор</Table.Th>
              <Table.Th w={120}>Статус</Table.Th>
              <Table.Th w={160}>Статистика</Table.Th>
              <Table.Th w={130}>Создано</Table.Th>
              <Table.Th w={100}></Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <Table.Tr key={i}>
                  <Table.Td><Skeleton height={38} width={38} radius="md" /></Table.Td>
                  <Table.Td><Skeleton height={16} width="80%" /></Table.Td>
                  <Table.Td><Skeleton height={16} width="60%" /></Table.Td>
                  <Table.Td><Skeleton height={20} width={80} /></Table.Td>
                  <Table.Td><Skeleton height={16} width="100%" /></Table.Td>
                  <Table.Td><Skeleton height={16} width="80%" /></Table.Td>
                  <Table.Td><Skeleton height={20} width={60} /></Table.Td>
                </Table.Tr>
              ))
            ) : rows?.length ? (
              rows
            ) : (
              <Table.Tr>
                <Table.Td colSpan={7}>
                  <Text ta="center" py="xl" c="dimmed">
                    Статьи не найдены
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      {totalPages > 1 && (
        <Flex justify="center" p="md">
          <Pagination
            total={totalPages}
            value={page}
            onChange={setPage}
            size="sm"
          />
        </Flex>
      )}
    </Paper>
  );
}
