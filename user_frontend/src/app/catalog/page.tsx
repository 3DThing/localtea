'use client';

import { useState, Suspense } from 'react';
import {
  Container,
  Title,
  Text,
  SimpleGrid,
  Box,
  Group,
  Stack,
  Select,
  TextInput,
  Card,
  Skeleton,
  Pagination,
} from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { catalogApi } from '@/lib/api';
import { ProductCard } from '@/components/catalog/ProductCard';

function CatalogContent() {
  const searchParams = useSearchParams();
  const categoryFromUrl = searchParams.get('category');

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(categoryFromUrl);
  const [sortBy, setSortBy] = useState<string | null>(null);

  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => catalogApi.getCategories(),
  });

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products', page, categoryId, sortBy, search],
    queryFn: () => catalogApi.getProducts({
      page,
      limit: 12,
      category_id: categoryId ? parseInt(categoryId) : undefined,
      sort: sortBy || undefined,
      q: search || undefined,
    }),
  });

  const categories = categoriesData?.data || [];
  const products = productsData?.data?.items || [];
  const totalPages = productsData?.data?.pages || 1;

  return (
    <Container size="xl" py="xl">
      {/* Header */}
      <Stack gap="xl" mb="xl">
        <Box>
          <Text size="sm" c="violet" fw={600} tt="uppercase" style={{ letterSpacing: "2px" }} mb="xs">
            Каталог
          </Text>
          <Title order={1}>
            {categoryId
              ? categories.find((c: any) => c.id.toString() === categoryId)?.name || 'Весь чай'
              : 'Весь чай'
            }
          </Title>
        </Box>

        {/* Filters */}
        <Card
          p="md"
          radius="lg"
          style={{
            background: 'rgba(26, 27, 30, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          <Group gap="md" wrap="wrap">
            <TextInput
              placeholder="Поиск товаров..."
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => {
                setSearch(e.currentTarget.value);
                setPage(1);
              }}
              style={{ flex: 1, minWidth: 200 }}
            />
            <Select
              placeholder="Вселенная"
              data={[
                { value: '', label: 'Все вселенные' },
                ...categories.map((c: any) => ({ value: c.id.toString(), label: c.name })),
              ]}
              value={categoryId || ''}
              onChange={(value) => {
                setCategoryId(value || null);
                setPage(1);
              }}
              clearable
              style={{ minWidth: 180 }}
            />
            <Select
              placeholder="Сортировка"
              data={[
                { value: 'price_asc', label: 'Цена: по возрастанию' },
                { value: 'price_desc', label: 'Цена: по убыванию' },
                { value: 'name', label: 'По названию' },
                { value: 'popular', label: 'По популярности' },
              ]}
              value={sortBy}
              onChange={setSortBy}
              clearable
              style={{ minWidth: 200 }}
            />
          </Group>
        </Card>
      </Stack>

      {/* Products Grid */}
      <Box>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="lg">
          {productsLoading ? (
            Array(8).fill(0).map((_, i) => (
              <Skeleton key={i} height={350} radius="lg" />
            ))
          ) : products && products.length > 0 ? (
            products.map((product: any) => (
              <ProductCard key={product.id} product={product} />
            ))
          ) : (
            <Box style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 60 }}>
              <Text c="dimmed" size="lg">
                {search ? 'Ничего не найдено по вашему запросу' : 'Товары скоро появятся'}
              </Text>
            </Box>
          )}
        </SimpleGrid>

        {/* Pagination */}
        {totalPages > 1 && (
          <Group justify="center" mt="xl">
            <Pagination
              value={page}
              onChange={setPage}
              total={totalPages}
              color="violet"
            />
          </Group>
        )}
      </Box>
    </Container>
  );
}

export default function CatalogPage() {
  return (
    <Suspense fallback={
      <Container size="xl" py="xl">
        <Stack gap="xl">
          <Skeleton height={60} />
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="lg">
            {Array(8).fill(0).map((_, i) => (
              <Skeleton key={i} height={350} radius="lg" />
            ))}
          </SimpleGrid>
        </Stack>
      </Container>
    }>
      <CatalogContent />
    </Suspense>
  );
}
