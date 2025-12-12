'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Tabs, Table, ScrollArea, Group, Text, Badge, Paper, Title, ActionIcon,
  LoadingOverlay, Flex, Box, TextInput, NumberInput, Modal, Button, Stack,
  Pagination, SimpleGrid, Card, Select, Textarea, Drawer, Timeline, Accordion,
  ThemeIcon, Tooltip, Switch, Menu
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { 
  IconPackage, IconSearch, IconPencil, IconAlertTriangle, IconPlus, IconMinus,
  IconTrash, IconCategory, IconBox, IconHistory, IconChartBar, IconRefresh,
  IconTruck, IconArrowBack, IconAdjustments, IconX, IconDownload, IconUpload,
  IconDotsVertical, IconCheck
} from '@tabler/icons-react';
import { 
  WarehouseService, 
  InventoryCategory, 
  InventoryMaterial, 
  ProductStock, 
  InventoryMovement,
  InventoryAnalyticsResponse
} from '@/lib/api/services/WarehouseService';
import { notifications } from '@mantine/notifications';

const MOVEMENT_TYPES = [
  { value: 'incoming', label: 'Поступление', color: 'green', icon: IconDownload },
  { value: 'outgoing', label: 'Расход', color: 'red', icon: IconUpload },
  { value: 'adjustment', label: 'Корректировка', color: 'blue', icon: IconAdjustments },
  { value: 'return', label: 'Возврат', color: 'orange', icon: IconArrowBack },
  { value: 'write_off', label: 'Списание', color: 'gray', icon: IconX },
  { value: 'transfer', label: 'Перемещение', color: 'violet', icon: IconTruck },
];

const getMovementInfo = (type: string) => 
  MOVEMENT_TYPES.find(m => m.value === type) || MOVEMENT_TYPES[2];

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<string | null>('materials');
  
  // Categories state
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoryModalOpened, { open: openCategoryModal, close: closeCategoryModal }] = useDisclosure(false);
  const [editingCategory, setEditingCategory] = useState<InventoryCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', is_active: true, sort_order: 0 });

  // Materials state  
  const [materials, setMaterials] = useState<InventoryMaterial[]>([]);
  const [materialsTotal, setMaterialsTotal] = useState(0);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [materialsPage, setMaterialsPage] = useState(1);
  const [materialsSearch, setMaterialsSearch] = useState('');
  const [materialsCategoryFilter, setMaterialsCategoryFilter] = useState<string | null>(null);
  const [materialModalOpened, { open: openMaterialModal, close: closeMaterialModal }] = useDisclosure(false);
  const [editingMaterial, setEditingMaterial] = useState<InventoryMaterial | null>(null);
  const [materialForm, setMaterialForm] = useState({
    category_id: 0, name: '', sku_code: '', description: '', unit: 'шт', 
    quantity: 0, min_quantity: 0, cost_per_unit_cents: 0, is_active: true
  });

  // Adjust modal
  const [adjustModalOpened, { open: openAdjustModal, close: closeAdjustModal }] = useDisclosure(false);
  const [adjustingMaterial, setAdjustingMaterial] = useState<InventoryMaterial | null>(null);
  const [adjustForm, setAdjustForm] = useState({ quantity: 0, movement_type: 'adjustment', reason: '' });

  // Products state
  const [products, setProducts] = useState<ProductStock[]>([]);
  const [productsTotal, setProductsTotal] = useState(0);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsPage, setProductsPage] = useState(1);
  const [productsSearch, setProductsSearch] = useState('');
  
  // Catalog categories and products for cascading dropdowns
  const [catalogCategories, setCatalogCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [catalogProducts, setCatalogProducts] = useState<Array<{ id: number; title: string; category_id: number | null; skus: Array<{ id: number; sku_code: string; weight: number; price_cents: number }> }>>([]);
  const [productsCategoryFilter, setProductsCategoryFilter] = useState<string | null>(null);
  const [productsProductFilter, setProductsProductFilter] = useState<string | null>(null);
  
  // Product adjust modal
  const [productAdjustModalOpened, { open: openProductAdjustModal, close: closeProductAdjustModal }] = useDisclosure(false);
  const [adjustingProduct, setAdjustingProduct] = useState<ProductStock | null>(null);
  const [productAdjustForm, setProductAdjustForm] = useState({ quantity: 0, movement_type: 'adjustment', reason: '' });

  // Movements drawer
  const [movementsDrawerOpened, { open: openMovementsDrawer, close: closeMovementsDrawer }] = useDisclosure(false);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [movementFilter, setMovementFilter] = useState<{ material_id?: number; sku_id?: number }>({});

  // Analytics state
  const [analytics, setAnalytics] = useState<InventoryAnalyticsResponse | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const pageSize = 20;

  // ==================== Fetch functions ====================
  const fetchCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const response = await WarehouseService.listCategories(0, 500);
      setCategories(response.items || []);
    } catch (error) {
      notifications.show({ title: 'Ошибка', message: 'Не удалось загрузить категории', color: 'red' });
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  const fetchMaterials = useCallback(async () => {
    setMaterialsLoading(true);
    try {
      // Load all materials for accordion view
      const response = await WarehouseService.listMaterials(0, 500);
      setMaterials(response.items || []);
      setMaterialsTotal(response.total || 0);
    } catch (error) {
      notifications.show({ title: 'Ошибка', message: 'Не удалось загрузить материалы', color: 'red' });
    } finally {
      setMaterialsLoading(false);
    }
  }, []);

  const fetchCatalogData = useCallback(async () => {
    try {
      const [cats, prods] = await Promise.all([
        WarehouseService.listCatalogCategories(),
        WarehouseService.listCatalogProducts(0, 500)
      ]);
      setCatalogCategories(cats || []);
      setCatalogProducts(prods || []);
    } catch (error) {
      console.error('Failed to fetch catalog data:', error);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const skip = (productsPage - 1) * pageSize;
      const catId = productsCategoryFilter ? parseInt(productsCategoryFilter) : undefined;
      const response = await WarehouseService.listProductStock(
        skip, pageSize, catId, undefined, productsSearch || undefined
      );
      
      // Filter by product if selected
      let items = response.items || [];
      if (productsProductFilter) {
        const productId = parseInt(productsProductFilter);
        items = items.filter(p => p.product_id === productId);
      }
      
      setProducts(items);
      setProductsTotal(productsProductFilter ? items.length : (response.total || 0));
    } catch (error) {
      notifications.show({ title: 'Ошибка', message: 'Не удалось загрузить товары', color: 'red' });
    } finally {
      setProductsLoading(false);
    }
  }, [productsPage, productsSearch, productsCategoryFilter, productsProductFilter]);

  const fetchMovements = useCallback(async () => {
    setMovementsLoading(true);
    try {
      const response = await WarehouseService.listMovements(
        0, 50, movementFilter.material_id, movementFilter.sku_id
      );
      setMovements(response.items || []);
    } catch (error) {
      notifications.show({ title: 'Ошибка', message: 'Не удалось загрузить историю', color: 'red' });
    } finally {
      setMovementsLoading(false);
    }
  }, [movementFilter]);

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const response = await WarehouseService.getAnalytics();
      setAnalytics(response);
    } catch (error) {
      notifications.show({ title: 'Ошибка', message: 'Не удалось загрузить аналитику', color: 'red' });
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  // Filter products by category for dropdown
  const filteredCatalogProducts = productsCategoryFilter 
    ? catalogProducts.filter(p => p.category_id === parseInt(productsCategoryFilter))
    : catalogProducts;

  // Initial fetch
  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { fetchMaterials(); }, [fetchMaterials]);
  useEffect(() => { fetchCatalogData(); }, [fetchCatalogData]);
  useEffect(() => { 
    if (activeTab === 'products') fetchProducts(); 
  }, [activeTab, fetchProducts]);
  useEffect(() => { 
    if (activeTab === 'analytics') fetchAnalytics(); 
  }, [activeTab, fetchAnalytics]);
  useEffect(() => { 
    if (movementsDrawerOpened) fetchMovements(); 
  }, [movementsDrawerOpened, fetchMovements]);

  // ==================== Handlers ====================
  const handleSaveCategory = async () => {
    try {
      if (editingCategory) {
        await WarehouseService.updateCategory(editingCategory.id, categoryForm);
        notifications.show({ title: 'Успешно', message: 'Категория обновлена', color: 'green' });
      } else {
        await WarehouseService.createCategory(categoryForm);
        notifications.show({ title: 'Успешно', message: 'Категория создана', color: 'green' });
      }
      closeCategoryModal();
      fetchCategories();
      fetchMaterials();
    } catch (error: any) {
      notifications.show({ title: 'Ошибка', message: error?.body?.detail || 'Не удалось сохранить', color: 'red' });
    }
  };

  const handleDeleteCategory = async (cat: InventoryCategory) => {
    if (!confirm(`Удалить категорию "${cat.name}"?`)) return;
    try {
      await WarehouseService.deleteCategory(cat.id);
      notifications.show({ title: 'Успешно', message: 'Категория удалена', color: 'green' });
      fetchCategories();
    } catch (error: any) {
      notifications.show({ title: 'Ошибка', message: error?.body?.detail || 'Не удалось удалить', color: 'red' });
    }
  };

  const handleSaveMaterial = async () => {
    try {
      if (editingMaterial) {
        const { quantity, ...updateData } = materialForm;
        await WarehouseService.updateMaterial(editingMaterial.id, updateData);
        notifications.show({ title: 'Успешно', message: 'Материал обновлен', color: 'green' });
      } else {
        await WarehouseService.createMaterial(materialForm);
        notifications.show({ title: 'Успешно', message: 'Материал создан', color: 'green' });
      }
      closeMaterialModal();
      fetchMaterials();
    } catch (error: any) {
      notifications.show({ title: 'Ошибка', message: error?.body?.detail || 'Не удалось сохранить', color: 'red' });
    }
  };

  const handleDeleteMaterial = async (mat: InventoryMaterial) => {
    if (!confirm(`Удалить материал "${mat.name}"?`)) return;
    try {
      await WarehouseService.deleteMaterial(mat.id);
      notifications.show({ title: 'Успешно', message: 'Материал удален', color: 'green' });
      fetchMaterials();
    } catch (error: any) {
      notifications.show({ title: 'Ошибка', message: error?.body?.detail || 'Не удалось удалить', color: 'red' });
    }
  };

  const handleAdjustMaterial = async () => {
    if (!adjustingMaterial || adjustForm.quantity === 0 || !adjustForm.reason) {
      notifications.show({ title: 'Ошибка', message: 'Заполните все поля', color: 'red' });
      return;
    }
    try {
      await WarehouseService.adjustMaterialStock(adjustingMaterial.id, {
        material_id: adjustingMaterial.id,
        quantity: adjustForm.quantity,
        movement_type: adjustForm.movement_type as any,
        reason: adjustForm.reason
      });
      notifications.show({ 
        title: 'Успешно', 
        message: `Остаток изменен на ${adjustForm.quantity > 0 ? '+' : ''}${adjustForm.quantity}`, 
        color: 'green' 
      });
      closeAdjustModal();
      fetchMaterials();
    } catch (error: any) {
      notifications.show({ title: 'Ошибка', message: error?.body?.detail || 'Не удалось изменить', color: 'red' });
    }
  };

  const handleAdjustProduct = async () => {
    if (!adjustingProduct || productAdjustForm.quantity === 0 || !productAdjustForm.reason) {
      notifications.show({ title: 'Ошибка', message: 'Заполните все поля', color: 'red' });
      return;
    }
    try {
      await WarehouseService.adjustProductStock(adjustingProduct.sku_id, {
        sku_id: adjustingProduct.sku_id,
        quantity: productAdjustForm.quantity,
        movement_type: productAdjustForm.movement_type as any,
        reason: productAdjustForm.reason
      });
      notifications.show({ 
        title: 'Успешно', 
        message: `Остаток изменен на ${productAdjustForm.quantity > 0 ? '+' : ''}${productAdjustForm.quantity}`, 
        color: 'green' 
      });
      closeProductAdjustModal();
      fetchProducts();
    } catch (error: any) {
      notifications.show({ title: 'Ошибка', message: error?.body?.detail || 'Не удалось изменить', color: 'red' });
    }
  };

  const openMaterialHistory = (mat: InventoryMaterial) => {
    setMovementFilter({ material_id: mat.id });
    openMovementsDrawer();
  };

  const openProductHistory = (prod: ProductStock) => {
    setMovementFilter({ sku_id: prod.sku_id });
    openMovementsDrawer();
  };

  const getStockColor = (qty: number, minQty: number = 0) => {
    if (qty <= 0) return 'red';
    if (qty <= minQty) return 'orange';
    return 'green';
  };

  const formatPrice = (cents: number) => (cents / 100).toLocaleString('ru-RU', { 
    style: 'currency', currency: 'RUB', minimumFractionDigits: 0 
  });

  // ==================== Render ====================
  return (
    <Box>
      <Flex justify="space-between" align="center" mb="md">
        <Title order={2}>Склад</Title>
      </Flex>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="materials" leftSection={<IconBox size={16} />}>
            Материалы
          </Tabs.Tab>
          <Tabs.Tab value="categories" leftSection={<IconCategory size={16} />}>
            Категории
          </Tabs.Tab>
          <Tabs.Tab value="products" leftSection={<IconPackage size={16} />}>
            Товары
          </Tabs.Tab>
          <Tabs.Tab value="analytics" leftSection={<IconChartBar size={16} />}>
            Аналитика
          </Tabs.Tab>
        </Tabs.List>

        {/* ==================== Materials Tab ==================== */}
        <Tabs.Panel value="materials" pt="md">
          <Paper withBorder p="md" radius="md" pos="relative">
            <LoadingOverlay visible={materialsLoading || categoriesLoading} />
            
            <Flex justify="space-between" align="center" mb="md" gap="md" wrap="wrap">
              <Group>
                <TextInput
                  placeholder="Поиск..."
                  leftSection={<IconSearch size={16} />}
                  value={materialsSearch}
                  onChange={(e) => { setMaterialsSearch(e.target.value); setMaterialsPage(1); }}
                  style={{ width: 250 }}
                />
              </Group>
              <Group>
                <Button variant="light" leftSection={<IconPlus size={16} />} onClick={() => {
                  setEditingCategory(null);
                  setCategoryForm({ name: '', description: '', is_active: true, sort_order: 0 });
                  openCategoryModal();
                }}>
                  Категория
                </Button>
                <Button leftSection={<IconPlus size={16} />} onClick={() => {
                  setEditingMaterial(null);
                  setMaterialForm({
                    category_id: categories[0]?.id || 0, name: '', sku_code: '', description: '', 
                    unit: 'шт', quantity: 0, min_quantity: 0, cost_per_unit_cents: 0, is_active: true
                  });
                  openMaterialModal();
                }}>
                  Материал
                </Button>
              </Group>
            </Flex>

            {categories.length === 0 ? (
              <Text c="dimmed" ta="center" py="xl">
                Нет категорий. Создайте первую категорию для начала работы.
              </Text>
            ) : (
              <Accordion variant="separated" radius="md">
                {categories.map((cat) => {
                  const categoryMaterials = materials.filter(m => m.category_id === cat.id);
                  const filteredMaterials = materialsSearch 
                    ? categoryMaterials.filter(m => 
                        m.name.toLowerCase().includes(materialsSearch.toLowerCase()) ||
                        (m.sku_code && m.sku_code.toLowerCase().includes(materialsSearch.toLowerCase()))
                      )
                    : categoryMaterials;
                  
                  return (
                    <Accordion.Item key={cat.id} value={String(cat.id)}>
                      <Accordion.Control>
                        <Group justify="space-between" wrap="nowrap" pr="md">
                          <Group>
                            <IconCategory size={20} />
                            <div>
                              <Text fw={500}>{cat.name}</Text>
                              {cat.description && <Text size="xs" c="dimmed">{cat.description}</Text>}
                            </div>
                          </Group>
                          <Group gap="xs">
                            <Badge variant="light" color="blue">{categoryMaterials.length} материалов</Badge>
                            {!cat.is_active && <Badge color="gray">Неактивна</Badge>}
                          </Group>
                        </Group>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <Group justify="flex-end" mb="sm">
                          <ActionIcon variant="subtle" color="blue" onClick={(e) => {
                            e.stopPropagation();
                            setEditingCategory(cat);
                            setCategoryForm({ 
                              name: cat.name, description: cat.description || '', 
                              is_active: cat.is_active, sort_order: cat.sort_order 
                            });
                            openCategoryModal();
                          }}>
                            <IconPencil size={16} />
                          </ActionIcon>
                          <ActionIcon variant="subtle" color="red" onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCategory(cat);
                          }}>
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                        
                        {filteredMaterials.length === 0 ? (
                          <Text c="dimmed" ta="center" py="md">
                            {materialsSearch ? 'Материалы не найдены' : 'В этой категории пока нет материалов'}
                          </Text>
                        ) : (
                          <Table striped highlightOnHover>
                            <Table.Thead>
                              <Table.Tr>
                                <Table.Th>Название</Table.Th>
                                <Table.Th>SKU</Table.Th>
                                <Table.Th>Количество</Table.Th>
                                <Table.Th>Ед. изм.</Table.Th>
                                <Table.Th>Стоимость</Table.Th>
                                <Table.Th>Действия</Table.Th>
                              </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                              {filteredMaterials.map((mat) => (
                                <Table.Tr key={mat.id}>
                                  <Table.Td>
                                    <Text size="sm" fw={500}>{mat.name}</Text>
                                    {mat.description && <Text size="xs" c="dimmed" lineClamp={1}>{mat.description}</Text>}
                                  </Table.Td>
                                  <Table.Td>
                                    <Text size="xs" ff="monospace">{mat.sku_code || '—'}</Text>
                                  </Table.Td>
                                  <Table.Td>
                                    <Badge 
                                      color={getStockColor(mat.quantity, mat.min_quantity)} 
                                      size="lg"
                                      leftSection={mat.is_low_stock ? <IconAlertTriangle size={12} /> : null}
                                    >
                                      {mat.quantity}
                                    </Badge>
                                    {mat.min_quantity > 0 && (
                                      <Text size="xs" c="dimmed">мин: {mat.min_quantity}</Text>
                                    )}
                                  </Table.Td>
                                  <Table.Td>{mat.unit}</Table.Td>
                                  <Table.Td>
                                    <Text size="sm">{formatPrice(mat.cost_per_unit_cents)}</Text>
                                    <Text size="xs" c="dimmed">Всего: {formatPrice(mat.total_value_cents)}</Text>
                                  </Table.Td>
                                  <Table.Td>
                                    <Group gap="xs">
                                      <Tooltip label="Уменьшить">
                                        <ActionIcon 
                                          variant="subtle" 
                                          color="red" 
                                          onClick={() => {
                                            setAdjustingMaterial(mat);
                                            setAdjustForm({ quantity: -1, movement_type: 'outgoing', reason: '' });
                                            openAdjustModal();
                                          }}
                                        >
                                          <IconMinus size={16} />
                                        </ActionIcon>
                                      </Tooltip>
                                      <Tooltip label="Увеличить">
                                        <ActionIcon 
                                          variant="subtle" 
                                          color="green"
                                          onClick={() => {
                                            setAdjustingMaterial(mat);
                                            setAdjustForm({ quantity: 1, movement_type: 'incoming', reason: '' });
                                            openAdjustModal();
                                          }}
                                        >
                                          <IconPlus size={16} />
                                        </ActionIcon>
                                      </Tooltip>
                                      <Tooltip label="История">
                                        <ActionIcon variant="subtle" color="blue" onClick={() => openMaterialHistory(mat)}>
                                          <IconHistory size={16} />
                                        </ActionIcon>
                                      </Tooltip>
                                      <Menu>
                                        <Menu.Target>
                                          <ActionIcon variant="subtle">
                                            <IconDotsVertical size={16} />
                                          </ActionIcon>
                                        </Menu.Target>
                                        <Menu.Dropdown>
                                          <Menu.Item leftSection={<IconPencil size={14} />} onClick={() => {
                                            setEditingMaterial(mat);
                                            setMaterialForm({
                                              category_id: mat.category_id, name: mat.name, sku_code: mat.sku_code || '',
                                              description: mat.description || '', unit: mat.unit, quantity: mat.quantity,
                                              min_quantity: mat.min_quantity, cost_per_unit_cents: mat.cost_per_unit_cents,
                                              is_active: mat.is_active
                                            });
                                            openMaterialModal();
                                          }}>
                                            Редактировать
                                          </Menu.Item>
                                          <Menu.Item leftSection={<IconTrash size={14} />} color="red" onClick={() => handleDeleteMaterial(mat)}>
                                            Удалить
                                          </Menu.Item>
                                        </Menu.Dropdown>
                                      </Menu>
                                    </Group>
                                  </Table.Td>
                                </Table.Tr>
                              ))}
                            </Table.Tbody>
                          </Table>
                        )}
                      </Accordion.Panel>
                    </Accordion.Item>
                  );
                })}
              </Accordion>
            )}
          </Paper>
        </Tabs.Panel>

        {/* ==================== Categories Tab ==================== */}
        <Tabs.Panel value="categories" pt="md">
          <Paper withBorder p="md" radius="md" pos="relative">
            <LoadingOverlay visible={categoriesLoading} />
            
            <Flex justify="space-between" align="center" mb="md">
              <Title order={4}>Категории материалов</Title>
              <Button leftSection={<IconPlus size={16} />} onClick={() => {
                setEditingCategory(null);
                setCategoryForm({ name: '', description: '', is_active: true, sort_order: 0 });
                openCategoryModal();
              }}>
                Добавить категорию
              </Button>
            </Flex>

            <ScrollArea>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Название</Table.Th>
                    <Table.Th>Описание</Table.Th>
                    <Table.Th>Материалов</Table.Th>
                    <Table.Th>Порядок</Table.Th>
                    <Table.Th>Статус</Table.Th>
                    <Table.Th>Действия</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {categories.map((cat) => (
                    <Table.Tr key={cat.id}>
                      <Table.Td><Text fw={500}>{cat.name}</Text></Table.Td>
                      <Table.Td><Text size="sm" c="dimmed" lineClamp={1}>{cat.description || '—'}</Text></Table.Td>
                      <Table.Td><Badge variant="light">{cat.materials_count}</Badge></Table.Td>
                      <Table.Td>{cat.sort_order}</Table.Td>
                      <Table.Td>
                        <Badge color={cat.is_active ? 'green' : 'gray'}>
                          {cat.is_active ? 'Активна' : 'Неактивна'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <ActionIcon variant="subtle" color="blue" onClick={() => {
                            setEditingCategory(cat);
                            setCategoryForm({ 
                              name: cat.name, description: cat.description || '', 
                              is_active: cat.is_active, sort_order: cat.sort_order 
                            });
                            openCategoryModal();
                          }}>
                            <IconPencil size={16} />
                          </ActionIcon>
                          <ActionIcon variant="subtle" color="red" onClick={() => handleDeleteCategory(cat)}>
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Paper>
        </Tabs.Panel>

        {/* ==================== Products Tab ==================== */}
        <Tabs.Panel value="products" pt="md">
          <Paper withBorder p="md" radius="md" pos="relative">
            <LoadingOverlay visible={productsLoading} />
            
            <Flex justify="space-between" align="center" mb="md" gap="md" wrap="wrap">
              <TextInput
                placeholder="Поиск товара..."
                leftSection={<IconSearch size={16} />}
                value={productsSearch}
                onChange={(e) => { setProductsSearch(e.target.value); }}
                style={{ width: 300 }}
              />
              <ActionIcon variant="subtle" onClick={fetchProducts}>
                <IconRefresh size={18} />
              </ActionIcon>
            </Flex>

            {catalogCategories.length === 0 ? (
              <Text c="dimmed" ta="center" py="xl">
                Нет категорий каталога. Создайте товары в разделе Каталог.
              </Text>
            ) : (
              <Accordion variant="separated" radius="md">
                {catalogCategories.map((cat) => {
                  // Get products for this category
                  const categoryProducts = catalogProducts.filter(p => p.category_id === cat.id);
                  // Filter by search
                  const filteredProducts = productsSearch 
                    ? categoryProducts.filter(p => 
                        p.title.toLowerCase().includes(productsSearch.toLowerCase()) ||
                        p.skus.some(s => s.sku_code.toLowerCase().includes(productsSearch.toLowerCase()))
                      )
                    : categoryProducts;
                  
                  // Get stock info for SKUs in this category
                  const categoryStockItems = products.filter(ps => 
                    categoryProducts.some(cp => cp.skus.some(s => s.id === ps.sku_id))
                  );
                  
                  const totalStock = categoryStockItems.reduce((sum, ps) => sum + ps.quantity, 0);
                  
                  if (productsSearch && filteredProducts.length === 0) return null;
                  
                  return (
                    <Accordion.Item key={cat.id} value={`cat-${cat.id}`}>
                      <Accordion.Control>
                        <Group justify="space-between" wrap="nowrap" pr="md">
                          <Group>
                            <IconCategory size={20} />
                            <Text fw={500}>{cat.name}</Text>
                          </Group>
                          <Group gap="xs">
                            <Badge variant="light" color="blue">{categoryProducts.length} товаров</Badge>
                            <Badge variant="light" color="green">Остаток: {totalStock}</Badge>
                          </Group>
                        </Group>
                      </Accordion.Control>
                      <Accordion.Panel>
                        {filteredProducts.length === 0 ? (
                          <Text c="dimmed" ta="center" py="md">
                            В этой категории нет товаров
                          </Text>
                        ) : (
                          <Accordion variant="contained" radius="sm">
                            {filteredProducts.map((product) => {
                              // Get stock for this product's SKUs
                              const productStockItems = products.filter(ps => 
                                product.skus.some(s => s.id === ps.sku_id)
                              );
                              const productTotalStock = productStockItems.reduce((sum, ps) => sum + ps.quantity, 0);
                              
                              return (
                                <Accordion.Item key={product.id} value={`prod-${product.id}`}>
                                  <Accordion.Control>
                                    <Group justify="space-between" wrap="nowrap" pr="md">
                                      <Group>
                                        <IconPackage size={18} />
                                        <Text size="sm" fw={500}>{product.title}</Text>
                                      </Group>
                                      <Group gap="xs">
                                        <Badge variant="light" size="sm">{product.skus.length} SKU</Badge>
                                        <Badge 
                                          variant="light" 
                                          size="sm" 
                                          color={productTotalStock > 0 ? 'green' : 'red'}
                                        >
                                          Остаток: {productTotalStock}
                                        </Badge>
                                      </Group>
                                    </Group>
                                  </Accordion.Control>
                                  <Accordion.Panel>
                                    <Table striped highlightOnHover>
                                      <Table.Thead>
                                        <Table.Tr>
                                          <Table.Th>SKU</Table.Th>
                                          <Table.Th>Вес</Table.Th>
                                          <Table.Th>Цена</Table.Th>
                                          <Table.Th>Наличие</Table.Th>
                                          <Table.Th>Зарезерв.</Table.Th>
                                          <Table.Th>Доступно</Table.Th>
                                          <Table.Th>Действия</Table.Th>
                                        </Table.Tr>
                                      </Table.Thead>
                                      <Table.Tbody>
                                        {product.skus.map((sku) => {
                                          const stockInfo = products.find(ps => ps.sku_id === sku.id);
                                          const quantity = stockInfo?.quantity || 0;
                                          const reserved = stockInfo?.reserved || 0;
                                          const available = quantity - reserved;
                                          const minQty = stockInfo?.min_quantity || 0;
                                          const isLow = quantity <= minQty && minQty > 0;
                                          
                                          return (
                                            <Table.Tr key={sku.id}>
                                              <Table.Td>
                                                <Text size="xs" ff="monospace">{sku.sku_code}</Text>
                                              </Table.Td>
                                              <Table.Td>{sku.weight}г</Table.Td>
                                              <Table.Td>{formatPrice(sku.price_cents)}</Table.Td>
                                              <Table.Td>
                                                <Badge 
                                                  color={getStockColor(quantity, minQty)} 
                                                  size="lg"
                                                  leftSection={isLow ? <IconAlertTriangle size={12} /> : null}
                                                >
                                                  {quantity}
                                                </Badge>
                                              </Table.Td>
                                              <Table.Td>
                                                {reserved > 0 ? (
                                                  <Badge color="yellow">{reserved}</Badge>
                                                ) : '—'}
                                              </Table.Td>
                                              <Table.Td>
                                                <Text fw={500}>{available}</Text>
                                              </Table.Td>
                                              <Table.Td>
                                                <Group gap="xs">
                                                  <Tooltip label="Уменьшить">
                                                    <ActionIcon 
                                                      variant="subtle" 
                                                      color="red" 
                                                      onClick={() => {
                                                        const ps = products.find(p => p.sku_id === sku.id);
                                                        if (ps) {
                                                          setAdjustingProduct(ps);
                                                          setProductAdjustForm({ quantity: -1, movement_type: 'outgoing', reason: '' });
                                                          openProductAdjustModal();
                                                        }
                                                      }}
                                                    >
                                                      <IconMinus size={16} />
                                                    </ActionIcon>
                                                  </Tooltip>
                                                  <Tooltip label="Увеличить">
                                                    <ActionIcon 
                                                      variant="subtle" 
                                                      color="green"
                                                      onClick={() => {
                                                        const ps = products.find(p => p.sku_id === sku.id);
                                                        if (ps) {
                                                          setAdjustingProduct(ps);
                                                          setProductAdjustForm({ quantity: 1, movement_type: 'incoming', reason: '' });
                                                          openProductAdjustModal();
                                                        }
                                                      }}
                                                    >
                                                      <IconPlus size={16} />
                                                    </ActionIcon>
                                                  </Tooltip>
                                                  <Tooltip label="История">
                                                    <ActionIcon 
                                                      variant="subtle" 
                                                      color="blue" 
                                                      onClick={() => {
                                                        const ps = products.find(p => p.sku_id === sku.id);
                                                        if (ps) openProductHistory(ps);
                                                      }}
                                                    >
                                                      <IconHistory size={16} />
                                                    </ActionIcon>
                                                  </Tooltip>
                                                </Group>
                                              </Table.Td>
                                            </Table.Tr>
                                          );
                                        })}
                                      </Table.Tbody>
                                    </Table>
                                  </Accordion.Panel>
                                </Accordion.Item>
                              );
                            })}
                          </Accordion>
                        )}
                      </Accordion.Panel>
                    </Accordion.Item>
                  );
                })}
              </Accordion>
            )}
          </Paper>
        </Tabs.Panel>

        {/* ==================== Analytics Tab ==================== */}
        <Tabs.Panel value="analytics" pt="md">
          <Paper withBorder p="md" radius="md" pos="relative">
            <LoadingOverlay visible={analyticsLoading} />

            {analytics && (
              <>
                {/* Материалы - основные метрики */}
                <Title order={4} mb="md">Материалы</Title>
                <SimpleGrid cols={{ base: 2, sm: 4 }} mb="xl">
                  <Card withBorder p="md">
                    <Text size="xs" c="dimmed" tt="uppercase">Категорий материалов</Text>
                    <Text size="xl" fw={700}>{analytics.summary.total_categories}</Text>
                  </Card>
                  <Card withBorder p="md">
                    <Text size="xs" c="dimmed" tt="uppercase">Материалов</Text>
                    <Text size="xl" fw={700}>{analytics.summary.total_materials}</Text>
                  </Card>
                  <Card withBorder p="md">
                    <Text size="xs" c="dimmed" tt="uppercase">Стоимость материалов</Text>
                    <Text size="xl" fw={700}>{formatPrice(analytics.summary.materials_total_value_cents)}</Text>
                  </Card>
                  <Card withBorder p="md">
                    <Text size="xs" c="dimmed" tt="uppercase">Мало остатков</Text>
                    <Text size="xl" fw={700} c="orange">{analytics.summary.materials_low_stock_count}</Text>
                  </Card>
                </SimpleGrid>

                {/* Товары - основные метрики */}
                <Title order={4} mb="md">Товары каталога</Title>
                <SimpleGrid cols={{ base: 2, sm: 5 }} mb="xl">
                  <Card withBorder p="md">
                    <Text size="xs" c="dimmed" tt="uppercase">Категорий</Text>
                    <Text size="xl" fw={700}>{analytics.summary.total_catalog_categories || 0}</Text>
                  </Card>
                  <Card withBorder p="md">
                    <Text size="xs" c="dimmed" tt="uppercase">Товаров</Text>
                    <Text size="xl" fw={700}>{analytics.summary.total_catalog_products || 0}</Text>
                  </Card>
                  <Card withBorder p="md">
                    <Text size="xs" c="dimmed" tt="uppercase">SKU</Text>
                    <Text size="xl" fw={700}>{analytics.summary.total_product_skus}</Text>
                  </Card>
                  <Card withBorder p="md">
                    <Text size="xs" c="dimmed" tt="uppercase">На складе / Резерв</Text>
                    <Group gap="xs">
                      <Text size="xl" fw={700}>{analytics.summary.products_total_stock || 0}</Text>
                      <Text size="sm" c="dimmed">/ {analytics.summary.products_reserved_stock || 0}</Text>
                    </Group>
                  </Card>
                  <Card withBorder p="md">
                    <Text size="xs" c="dimmed" tt="uppercase">Стоимость товаров</Text>
                    <Text size="xl" fw={700}>{formatPrice(analytics.summary.products_total_value_cents)}</Text>
                  </Card>
                </SimpleGrid>

                <SimpleGrid cols={{ base: 1, md: 2 }} mb="xl">
                  <Card withBorder p="md">
                    <Title order={5} mb="md">Движения за 30 дней</Title>
                    <SimpleGrid cols={5}>
                      <Box>
                        <Text size="xs" c="dimmed">Поступления</Text>
                        <Text size="lg" fw={700} c="green">{analytics.summary.movements_incoming_count}</Text>
                      </Box>
                      <Box>
                        <Text size="xs" c="dimmed">Расходы</Text>
                        <Text size="lg" fw={700} c="red">{analytics.summary.movements_outgoing_count}</Text>
                      </Box>
                      <Box>
                        <Text size="xs" c="dimmed">Корректировки</Text>
                        <Text size="lg" fw={700} c="blue">{analytics.summary.movements_adjustment_count}</Text>
                      </Box>
                      <Box>
                        <Text size="xs" c="dimmed">Возвраты</Text>
                        <Text size="lg" fw={700} c="orange">{analytics.summary.movements_return_count || 0}</Text>
                      </Box>
                      <Box>
                        <Text size="xs" c="dimmed">Списания</Text>
                        <Text size="lg" fw={700} c="gray">{analytics.summary.movements_write_off_count || 0}</Text>
                      </Box>
                    </SimpleGrid>
                  </Card>
                  <Card withBorder p="md">
                    <Title order={5} mb="md">Проблемы с остатками товаров</Title>
                    <Group gap="xl">
                      <Box>
                        <Text size="xs" c="dimmed">Мало на складе</Text>
                        <Text size="lg" fw={700} c="orange">{analytics.summary.products_low_stock_count}</Text>
                      </Box>
                      <Box>
                        <Text size="xs" c="dimmed">Нет в наличии</Text>
                        <Text size="lg" fw={700} c="red">{analytics.summary.products_out_of_stock_count}</Text>
                      </Box>
                      <Box>
                        <Text size="xs" c="dimmed">Доступно</Text>
                        <Text size="lg" fw={700} c="green">{analytics.summary.products_available_stock || 0}</Text>
                      </Box>
                    </Group>
                  </Card>
                </SimpleGrid>

                {/* Top товары по стоимости */}
                {analytics.summary.top_products_by_value && analytics.summary.top_products_by_value.length > 0 && (
                  <>
                    <Title order={5} mb="md">Топ товаров по стоимости остатков</Title>
                    <ScrollArea mb="xl">
                      <Table striped>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Товар</Table.Th>
                            <Table.Th>Фасовка</Table.Th>
                            <Table.Th>Цена</Table.Th>
                            <Table.Th>На складе</Table.Th>
                            <Table.Th>Стоимость</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {analytics.summary.top_products_by_value.map((item, idx) => (
                            <Table.Tr key={idx}>
                              <Table.Td><Text fw={500}>{item.product_name}</Text></Table.Td>
                              <Table.Td>{item.weight_grams}г</Table.Td>
                              <Table.Td>{formatPrice(item.price_cents)}</Table.Td>
                              <Table.Td><Badge color="blue">{item.quantity}</Badge></Table.Td>
                              <Table.Td><Text fw={600}>{formatPrice(item.value_cents)}</Text></Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    </ScrollArea>
                  </>
                )}

                {/* Статистика по категориям товаров */}
                {analytics.catalog_categories_stats && analytics.catalog_categories_stats.length > 0 && (
                  <>
                    <Title order={5} mb="md">Статистика по категориям товаров</Title>
                    <ScrollArea mb="xl">
                      <Table striped>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Категория</Table.Th>
                            <Table.Th>Товаров</Table.Th>
                            <Table.Th>SKU</Table.Th>
                            <Table.Th>На складе</Table.Th>
                            <Table.Th>Резерв</Table.Th>
                            <Table.Th>Стоимость</Table.Th>
                            <Table.Th>Проблемы</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {analytics.catalog_categories_stats.map((cat) => (
                            <Table.Tr key={cat.category_id}>
                              <Table.Td><Text fw={500}>{cat.category_name}</Text></Table.Td>
                              <Table.Td>{cat.products_count}</Table.Td>
                              <Table.Td>{cat.skus_count}</Table.Td>
                              <Table.Td>{cat.total_stock}</Table.Td>
                              <Table.Td>{cat.total_reserved}</Table.Td>
                              <Table.Td>{formatPrice(cat.total_value_cents)}</Table.Td>
                              <Table.Td>
                                <Group gap="xs">
                                  {cat.low_stock_count > 0 && <Badge color="orange" size="sm">{cat.low_stock_count} мало</Badge>}
                                  {cat.out_of_stock_count > 0 && <Badge color="red" size="sm">{cat.out_of_stock_count} нет</Badge>}
                                  {cat.low_stock_count === 0 && cat.out_of_stock_count === 0 && <Badge color="green" size="sm">OK</Badge>}
                                </Group>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    </ScrollArea>
                  </>
                )}

                <Title order={5} mb="md">Статистика по категориям материалов</Title>
                <ScrollArea>
                  <Table striped>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Категория</Table.Th>
                        <Table.Th>Материалов</Table.Th>
                        <Table.Th>Общее кол-во</Table.Th>
                        <Table.Th>Общая стоимость</Table.Th>
                        <Table.Th>Мало остатков</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {analytics.categories_stats.map((cat) => (
                        <Table.Tr key={cat.category_id}>
                          <Table.Td><Text fw={500}>{cat.category_name}</Text></Table.Td>
                          <Table.Td>{cat.materials_count}</Table.Td>
                          <Table.Td>{cat.total_quantity}</Table.Td>
                          <Table.Td>{formatPrice(cat.total_value_cents)}</Table.Td>
                          <Table.Td>
                            {cat.low_stock_count > 0 ? (
                              <Badge color="orange">{cat.low_stock_count}</Badge>
                            ) : (
                              <Badge color="green">OK</Badge>
                            )}
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>
              </>
            )}
          </Paper>
        </Tabs.Panel>
      </Tabs>

      {/* ==================== Modals ==================== */}
      
      {/* Category Modal */}
      <Modal opened={categoryModalOpened} onClose={closeCategoryModal} title={editingCategory ? 'Редактировать категорию' : 'Новая категория'}>
        <Stack>
          <TextInput
            label="Название"
            required
            value={categoryForm.name}
            onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
          />
          <Textarea
            label="Описание"
            value={categoryForm.description}
            onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
          />
          <NumberInput
            label="Порядок сортировки"
            value={categoryForm.sort_order}
            onChange={(v) => setCategoryForm({ ...categoryForm, sort_order: Number(v) || 0 })}
          />
          <Switch
            label="Активна"
            checked={categoryForm.is_active}
            onChange={(e) => setCategoryForm({ ...categoryForm, is_active: e.currentTarget.checked })}
          />
          <Button onClick={handleSaveCategory}>Сохранить</Button>
        </Stack>
      </Modal>

      {/* Material Modal */}
      <Modal opened={materialModalOpened} onClose={closeMaterialModal} title={editingMaterial ? 'Редактировать материал' : 'Новый материал'} size="lg">
        <Stack>
          <Select
            label="Категория"
            required
            data={categories.map(c => ({ value: String(c.id), label: c.name }))}
            value={String(materialForm.category_id)}
            onChange={(v) => setMaterialForm({ ...materialForm, category_id: Number(v) || 0 })}
          />
          <TextInput
            label="Название"
            required
            value={materialForm.name}
            onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })}
          />
          <TextInput
            label="Артикул (SKU)"
            value={materialForm.sku_code}
            onChange={(e) => setMaterialForm({ ...materialForm, sku_code: e.target.value })}
          />
          <Textarea
            label="Описание"
            value={materialForm.description}
            onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })}
          />
          <Group grow>
            <TextInput
              label="Единица измерения"
              value={materialForm.unit}
              onChange={(e) => setMaterialForm({ ...materialForm, unit: e.target.value })}
            />
            <NumberInput
              label="Мин. количество"
              value={materialForm.min_quantity}
              onChange={(v) => setMaterialForm({ ...materialForm, min_quantity: Number(v) || 0 })}
            />
          </Group>
          {!editingMaterial && (
            <NumberInput
              label="Начальное количество"
              value={materialForm.quantity}
              onChange={(v) => setMaterialForm({ ...materialForm, quantity: Number(v) || 0 })}
            />
          )}
          <NumberInput
            label="Стоимость за единицу (копейки)"
            value={materialForm.cost_per_unit_cents}
            onChange={(v) => setMaterialForm({ ...materialForm, cost_per_unit_cents: Number(v) || 0 })}
          />
          <Switch
            label="Активен"
            checked={materialForm.is_active}
            onChange={(e) => setMaterialForm({ ...materialForm, is_active: e.currentTarget.checked })}
          />
          <Button onClick={handleSaveMaterial}>Сохранить</Button>
        </Stack>
      </Modal>

      {/* Adjust Material Modal */}
      <Modal opened={adjustModalOpened} onClose={closeAdjustModal} title={`Изменить количество: ${adjustingMaterial?.name}`}>
        <Stack>
          <Text size="sm" c="dimmed">
            Текущее количество: <b>{adjustingMaterial?.quantity} {adjustingMaterial?.unit}</b>
          </Text>
          <Select
            label="Тип операции"
            data={MOVEMENT_TYPES.map(m => ({ value: m.value, label: m.label }))}
            value={adjustForm.movement_type}
            onChange={(v) => setAdjustForm({ ...adjustForm, movement_type: v || 'adjustment' })}
          />
          <NumberInput
            label="Количество (+/-)"
            description="Положительное — добавить, отрицательное — убрать"
            value={adjustForm.quantity}
            onChange={(v) => setAdjustForm({ ...adjustForm, quantity: Number(v) || 0 })}
          />
          <Textarea
            label="Причина"
            required
            placeholder="Укажите причину изменения"
            value={adjustForm.reason}
            onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
          />
          <Button onClick={handleAdjustMaterial}>Применить</Button>
        </Stack>
      </Modal>

      {/* Adjust Product Modal */}
      <Modal opened={productAdjustModalOpened} onClose={closeProductAdjustModal} title={`Изменить остаток: ${adjustingProduct?.product_name}`}>
        <Stack>
          <Text size="sm" c="dimmed">
            Текущий остаток: <b>{adjustingProduct?.quantity}</b>, доступно: <b>{adjustingProduct?.available}</b>
          </Text>
          <Select
            label="Тип операции"
            data={MOVEMENT_TYPES.map(m => ({ value: m.value, label: m.label }))}
            value={productAdjustForm.movement_type}
            onChange={(v) => setProductAdjustForm({ ...productAdjustForm, movement_type: v || 'adjustment' })}
          />
          <NumberInput
            label="Количество (+/-)"
            value={productAdjustForm.quantity}
            onChange={(v) => setProductAdjustForm({ ...productAdjustForm, quantity: Number(v) || 0 })}
          />
          <Textarea
            label="Причина"
            required
            value={productAdjustForm.reason}
            onChange={(e) => setProductAdjustForm({ ...productAdjustForm, reason: e.target.value })}
          />
          <Button onClick={handleAdjustProduct}>Применить</Button>
        </Stack>
      </Modal>

      {/* Movements Drawer */}
      <Drawer
        opened={movementsDrawerOpened}
        onClose={closeMovementsDrawer}
        title="История движений"
        position="right"
        size="lg"
      >
        <LoadingOverlay visible={movementsLoading} />
        <Timeline active={-1} bulletSize={28} lineWidth={2}>
          {movements.map((mov) => {
            const info = getMovementInfo(mov.movement_type);
            return (
              <Timeline.Item
                key={mov.id}
                bullet={
                  <ThemeIcon size={28} variant="light" radius="xl" color={info.color}>
                    <info.icon size={14} />
                  </ThemeIcon>
                }
                title={
                  <Group gap="xs">
                    <Text size="sm" fw={500}>{info.label}</Text>
                    <Badge size="xs" color={mov.quantity >= 0 ? 'green' : 'red'}>
                      {mov.quantity >= 0 ? '+' : ''}{mov.quantity}
                    </Badge>
                  </Group>
                }
              >
                <Text size="xs" c="dimmed">
                  {mov.material_name || mov.product_name || `SKU #${mov.sku_id}`}
                </Text>
                <Text size="xs">
                  {mov.quantity_before} → {mov.quantity_after}
                </Text>
                {mov.reason && <Text size="xs" c="dimmed" fs="italic">{mov.reason}</Text>}
                <Text size="xs" c="dimmed" mt={4}>
                  {new Date(mov.created_at).toLocaleString('ru-RU')}
                  {mov.admin_name && ` • ${mov.admin_name}`}
                </Text>
              </Timeline.Item>
            );
          })}
        </Timeline>
        {movements.length === 0 && (
          <Text c="dimmed" ta="center" py="xl">История пуста</Text>
        )}
      </Drawer>
    </Box>
  );
}
