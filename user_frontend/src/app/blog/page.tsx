'use client';

import { useState } from 'react';
import {
  Container,
  Title,
  Text,
  Stack,
  Box,
  TextInput,
  Skeleton,
  Group,
  Button,
} from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { blogApi } from '@/lib/api';
import { ArticleCard } from '@/components/blog/ArticleCard';

export default function BlogPage() {
  const [search, setSearch] = useState('');
  const [skip, setSkip] = useState(0);
  const limit = 10;

  const { data: articlesData, isLoading } = useQuery({
    queryKey: ['articles', skip, search],
    queryFn: () => blogApi.getArticles({ skip, limit, search: search || undefined }),
  });

  const articles = articlesData?.data || [];
  const hasMore = articles.length === limit;

  return (
    <Container size="xl" py="xl">
      {/* Header */}
      <Stack gap="xl" mb="xl">
        <Box>
          <Text size="sm" c="orange" fw={600} tt="uppercase" style={{ letterSpacing: "2px" }} mb="xs">
            Блог
          </Text>
          <Title order={1}>Новости и статьи</Title>
          <Text c="dimmed" mt="sm" maw={600}>
            Узнайте больше о мире чая, истории сортов, способах заваривания и культуре чаепития
          </Text>
        </Box>

        {/* Search */}
        <TextInput
          placeholder="Поиск статей..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => {
            setSearch(e.currentTarget.value);
            setSkip(0);
          }}
          style={{ maxWidth: 400 }}
        />
      </Stack>

      {/* Articles List */}
      <Stack gap="lg">
        {isLoading ? (
          Array(5).fill(0).map((_, i) => (
            <Skeleton key={i} height={200} radius="lg" />
          ))
        ) : articles.length > 0 ? (
          articles.map((article: any) => (
            <ArticleCard key={article.id} article={article} />
          ))
        ) : (
          <Box ta="center" py={60}>
            <Text c="dimmed" size="lg">
              {search ? 'Ничего не найдено по вашему запросу' : 'Статьи скоро появятся'}
            </Text>
          </Box>
        )}
      </Stack>

      {/* Load More */}
      {hasMore && (
        <Group justify="center" mt="xl">
          <Button
            variant="subtle"
            color="violet"
            onClick={() => setSkip(skip + limit)}
          >
            Загрузить ещё
          </Button>
        </Group>
      )}
    </Container>
  );
}
