'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Table, ScrollArea, Group, Text, ActionIcon, Badge, Button, Paper, Title, LoadingOverlay, Image, Avatar, TextInput, Tooltip, Flex, Box } from '@mantine/core';
import { IconPencil, IconTrash, IconPlus, IconSearch, IconFolder } from '@tabler/icons-react';
import { CatalogService, Category } from '@/lib/api';
import { notifications } from '@mantine/notifications';
import { useDebouncedValue } from '@mantine/hooks';

export function CategoryList() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 300);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await CatalogService.readCategoriesApiV1CatalogCategoriesGet();
      setCategories(data);
    } catch (error) {
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось загрузить категории',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreateClick = () => {
    router.push('/dashboard/catalog/categories/new');
  };

  const handleEditClick = (category: Category) => {
    router.push(`/dashboard/catalog/categories/${category.id}`);
  };

  const handleDeleteClick = async (category: Category, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Вы уверены, что хотите удалить категорию "${category.name}"?`)) return;
    try {
      await CatalogService.deleteCategoryApiV1CatalogCategoriesIdDelete(category.id);
      notifications.show({
        title: 'Успешно',
        message: 'Категория удалена',
        color: 'green',
      });
      fetchCategories();
    } catch (error) {
      const message = (error as { body?: { detail?: string } }).body?.detail || 'Не удалось удалить категорию';
      notifications.show({
        title: 'Ошибка',
        message: message,
        color: 'red',
      });
    }
  };

  const getParentName = (parentId: number | null | undefined) => {
    if (!parentId) return null;
    const parent = categories.find(c => c.id === parentId);
    return parent ? parent.name : null;
  };

  const getChildCount = (categoryId: number) => {
    return categories.filter(c => c.parent_id === categoryId).length;
  };

  const filteredCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    cat.slug.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  const rows = filteredCategories.map((category) => (
    <Table.Tr key={category.id} style={{ cursor: 'pointer' }} onClick={() => handleEditClick(category)}>
      <Table.Td>
        {category.image ? (
          <Image src={category.image} alt={category.name} w={40} h={40} radius="sm" fit="cover" />
        ) : (
          <Avatar radius="sm" size={40} color="teal">
            <IconFolder size={20} />
          </Avatar>
        )}
      </Table.Td>
      <Table.Td>
        <Text fw={500} size="sm">{category.name}</Text>
        <Text size="xs" c="dimmed">{category.slug}</Text>
      </Table.Td>
      <Table.Td>
        {getParentName(category.parent_id) ? (
          <Badge variant="light" color="gray" size="sm">{getParentName(category.parent_id)}</Badge>
        ) : (
          <Text size="xs" c="dimmed">Корневая</Text>
        )}
      </Table.Td>
      <Table.Td>
        {getChildCount(category.id) > 0 && (
          <Tooltip label="Подкатегорий">
            <Badge variant="dot" color="blue" size="sm">{getChildCount(category.id)}</Badge>
          </Tooltip>
        )}
      </Table.Td>
      <Table.Td>
        <Badge color={category.is_active ? 'green' : 'gray'} size="sm">
          {category.is_active ? 'Активна' : 'Черновик'}
        </Badge>
      </Table.Td>
      <Table.Td onClick={(e) => e.stopPropagation()}>
        <Group gap={4} justify="flex-end">
          <Tooltip label="Редактировать">
            <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => handleEditClick(category)}>
              <IconPencil size={14} stroke={1.5} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Удалить">
            <ActionIcon variant="subtle" color="red" size="sm" onClick={(e) => handleDeleteClick(category, e)}>
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
          <IconFolder size={20} style={{ color: 'var(--mantine-color-teal-6)' }} />
          <Title order={4}>Категории</Title>
          <Badge variant="light" color="teal" size="sm">{categories.length}</Badge>
        </Group>
        <Group gap="xs">
          <TextInput
            placeholder="Поиск..."
            leftSection={<IconSearch size={14} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="xs"
            style={{ width: 180 }}
          />
          <Button leftSection={<IconPlus size={14} />} onClick={handleCreateClick} size="xs">
            Добавить
          </Button>
        </Group>
      </Flex>

      <ScrollArea>
        <Table verticalSpacing="xs" striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={50}>Фото</Table.Th>
              <Table.Th>Название</Table.Th>
              <Table.Th>Родитель</Table.Th>
              <Table.Th w={80}>Дочерние</Table.Th>
              <Table.Th>Статус</Table.Th>
              <Table.Th w={80} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.length > 0 ? rows : (
              <Table.Tr>
                <Table.Td colSpan={6}>
                  <Box py="lg" ta="center">
                    <IconFolder size={40} style={{ color: 'var(--mantine-color-dimmed)', opacity: 0.5 }} />
                    <Text c="dimmed" size="sm" mt="xs">
                      {search ? 'Категории не найдены' : 'Нет категорий'}
                    </Text>
                  </Box>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Paper>
  );
}
