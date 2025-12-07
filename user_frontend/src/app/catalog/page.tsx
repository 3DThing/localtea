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
  Button,
  Select,
  TextInput,
  Card,
  Image,
  Skeleton,
  Pagination,
  Badge,
} from '@mantine/core';
import { IconSearch, IconFilter, IconArrowRight } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
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
    // only load products when a category is selected
    enabled: !!categoryId,
  });

  const categories = categoriesData?.data || [];
  const products = productsData?.data?.items || [];
  const totalPages = productsData?.data?.pages || 1;

  // Show categories section if no category selected
  const showCategories = !categoryId;

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
              ? categories.find((c: any) => c.id.toString() === categoryId)?.name || 'Товары'
              : 'Наши коллекции'
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
              placeholder="Категория"
              data={[
                { value: '', label: 'Все категории' },
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

      {/* Categories Section */}
      {showCategories && (
        <Box mb={60}>
          <Text size="lg" fw={600} mb="lg">Выберите категорию</Text>
          <SimpleGrid cols={{ base: 1, sm: 1, md: 1 }} spacing="xl" style={{ justifyItems: 'center' }}>
            {categoriesLoading ? (
              Array(3).fill(0).map((_, i) => (
                <Skeleton key={i} height={420} radius="lg" style={{ width: '100%', maxWidth: 900 }} />
              ))
            ) : categories.length > 0 ? (
              categories.map((category: any) => (
                <Box
                  key={category.id}
                  className="banner-card"
                  h={420}
                  onClick={() => setCategoryId(category.id.toString())}
                  style={{ cursor: 'pointer', maxWidth: 900, margin: '0 auto', width: '100%' }}
                >
                  <Image
                    src={category.image || 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=1400'}
                    alt={category.name}
                    h="100%"
                    style={{ objectFit: 'cover' }}
                  />
                  <Box
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: 28,
                      zIndex: 2,
                    }}
                  >
                    <Text size="xl" fw={700} c="white" mb="xs">{category.name}</Text>
                    <Text size="sm" c="gray.4" lineClamp={2}>{category.description}</Text>
                    <Button
                      variant="white"
                      size="sm"
                      mt="md"
                      rightSection={<IconArrowRight size={14} />}
                      style={{ borderRadius: 10, padding: '10px 14px' }}
                    >
                      Открыть
                    </Button>
                  </Box>
                </Box>
              ))
            ) : (
              <Box style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 60 }}>
                <Text c="dimmed" size="lg">Категории скоро появятся</Text>
              </Box>
            )}
          </SimpleGrid>
        </Box>
      )}

      {/* Products Grid */}
      <Box>
        {categoryId && (
          <Group mb="lg">
            <Button
              variant="subtle"
              color="gray"
              size="sm"
              onClick={() => setCategoryId(null)}
            >
              ← Все категории
            </Button>
          </Group>
        )}

        {/* Render products grid only when a category is selected */}
        {categoryId ? (
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
                  {search ? 'Ничего не найдено по вашему запросу' : 'Товары в этой категории скоро появятся'}
                </Text>
              </Box>
            )}
          </SimpleGrid>
        ) : null}

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
