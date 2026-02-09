'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Table, ScrollArea, Group, Text, ActionIcon, Badge, Button, Paper, Title, Pagination, Image, Avatar, LoadingOverlay, Flex, Tooltip, Box } from '@mantine/core';
import { IconPencil, IconTrash, IconPlus, IconPhoto, IconPackage } from '@tabler/icons-react';
import { CatalogService, Product, Category } from '@/lib/api';
import { notifications } from '@mantine/notifications';

export function ProductList() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const skip = (page - 1) * pageSize;
      const data = await CatalogService.readProductsApiV1CatalogProductsGet(skip, pageSize);
      setProducts(data.items);
      setTotal(data.total);

      const totalPages = Math.max(1, Math.ceil(data.total / pageSize));
      if (page > totalPages) {
        setPage(totalPages);
      }
    } catch (error) {
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось загрузить товары',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await CatalogService.readCategoriesApiV1CatalogCategoriesGet();
      setCategories(data);
    } catch (error) {
      console.error('Failed to fetch categories', error);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [page]);

  const handleDelete = async (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Вы уверены, что хотите удалить товар "${product.title}"?`)) return;
    try {
      await CatalogService.deleteProductApiV1CatalogProductsIdDelete(product.id);
      notifications.show({
        title: 'Успешно',
        message: 'Товар удален',
        color: 'green',
      });
      fetchProducts();
    } catch (error) {
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось удалить товар',
        color: 'red',
      });
    }
  };

  const handleEdit = (product: Product) => {
    router.push(`/dashboard/catalog/products/${product.id}`);
  };

  const handleCreate = () => {
    router.push('/dashboard/catalog/products/new');
  };

  const getCategoryName = (id: number) => {
    const cat = categories.find(c => c.id === id);
    return cat ? cat.name : id;
  };

  const getMainImage = (product: Product) => {
    if (!product.images || product.images.length === 0) return null;
    const mainImage = product.images.find(img => img.is_main) || product.images[0];
    return mainImage?.url;
  };

  const getPriceRange = (product: Product) => {
    if (!product.skus || product.skus.length === 0) return '-';
    const prices = product.skus.map(sku => sku.price_cents);
    const min = Math.min(...prices) / 100;
    const max = Math.max(...prices) / 100;
    if (min === max) return `${min.toFixed(0)} ₽`;
    return `${min.toFixed(0)} - ${max.toFixed(0)} ₽`;
  };

  const rows = products.map((product) => (
    <Table.Tr key={product.id} style={{ cursor: 'pointer' }} onClick={() => handleEdit(product)}>
      <Table.Td>
        {getMainImage(product) ? (
          <Image src={getMainImage(product)} alt={product.title} w={40} h={40} radius="sm" fit="cover" />
        ) : (
          <Avatar radius="sm" size={40} color="gray">
            <IconPhoto size={20} />
          </Avatar>
        )}
      </Table.Td>
      <Table.Td>
        <Text fw={500} size="sm">{product.title}</Text>
        <Text size="xs" c="dimmed">{product.slug}</Text>
      </Table.Td>
      <Table.Td>
        <Badge variant="light" color="gray" size="sm">{getCategoryName(product.category_id)}</Badge>
      </Table.Td>
      <Table.Td>
        <Text fw={500} size="sm">{getPriceRange(product)}</Text>
        <Text size="xs" c="dimmed">{product.skus?.length || 0} SKU</Text>
      </Table.Td>
      <Table.Td>
        <Badge color={product.is_active ? 'green' : 'gray'} size="sm">
          {product.is_active ? 'Активен' : 'Черновик'}
        </Badge>
      </Table.Td>
      <Table.Td onClick={(e) => e.stopPropagation()}>
        <Group gap={4} justify="flex-end">
          <Tooltip label="Редактировать">
            <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => handleEdit(product)}>
              <IconPencil size={14} stroke={1.5} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Удалить">
            <ActionIcon variant="subtle" color="red" size="sm" onClick={(e) => handleDelete(product, e)}>
              <IconTrash size={14} stroke={1.5} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Paper withBorder p="sm" radius="md" pos="relative">
      <LoadingOverlay visible={loading} zIndex={10} overlayProps={{ radius: 'sm', blur: 2 }} />
      
      <Flex justify="space-between" align="center" mb="sm" wrap="wrap" gap="sm">
        <Group gap="sm">
          <IconPackage size={20} style={{ color: 'var(--mantine-color-blue-6)' }} />
          <Title order={4}>Товары</Title>
          <Badge variant="light" color="blue" size="sm">{total}</Badge>
        </Group>
        <Button leftSection={<IconPlus size={14} />} onClick={handleCreate} size="xs">
          Добавить
        </Button>
      </Flex>

      <ScrollArea>
        <Table verticalSpacing="xs" striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={50}>Фото</Table.Th>
              <Table.Th>Название</Table.Th>
              <Table.Th>Категория</Table.Th>
              <Table.Th>Цена</Table.Th>
              <Table.Th>Статус</Table.Th>
              <Table.Th w={80} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.length > 0 ? rows : !loading ? (
              <Table.Tr>
                <Table.Td colSpan={6}>
                  <Box py="lg" ta="center">
                    <IconPackage size={40} style={{ color: 'var(--mantine-color-dimmed)', opacity: 0.5 }} />
                    <Text c="dimmed" size="sm" mt="xs">Товары не найдены</Text>
                  </Box>
                </Table.Td>
              </Table.Tr>
            ) : null}
          </Table.Tbody>
        </Table>
      </ScrollArea>

      {Math.ceil(total / pageSize) > 1 && (
        <Group justify="center" mt="sm">
          <Pagination total={Math.ceil(total / pageSize)} value={page} onChange={setPage} size="sm" />
        </Group>
      )}
    </Paper>
  );
}
