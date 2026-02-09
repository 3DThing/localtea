'use client';

import { useState, useEffect } from 'react';
import { Stack, Table, Button, Group, Text, ActionIcon, Modal, TextInput, NumberInput, Checkbox, Badge, LoadingOverlay } from '@mantine/core';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { IconPlus, IconPencil, IconTrash, IconGripVertical, IconArrowUp, IconArrowDown } from '@tabler/icons-react';
import { Product, SKU, CatalogService } from '@/lib/api';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';

const skuSchema = z.object({
  sku_code: z.string().min(1, 'SKU код обязателен'),
  weight: z.number().min(1, 'Вес должен быть больше 0'),
  price_cents: z.number().min(1, 'Цена должна быть больше 0'),
  discount_cents: z.number().optional(),
  quantity: z.number().min(0, 'Количество не может быть отрицательным'),
  is_active: z.boolean(),
  is_visible: z.boolean(),
  is_limited: z.boolean(),
});

type SKUFormData = z.infer<typeof skuSchema>;

interface ProductSKUFormProps {
  product: Product;
  onUpdate: (product: Product) => void;
}

export function ProductSKUForm({ product, onUpdate }: ProductSKUFormProps) {
  const [skus, setSKUs] = useState<SKU[]>(product.skus || []);
  const [loading, setLoading] = useState(false);
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [editingSKU, setEditingSKU] = useState<SKU | null>(null);

  useEffect(() => {
    setSKUs(product.skus || []);
  }, [product]);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<SKUFormData>({
    resolver: zodResolver(skuSchema),
    defaultValues: {
      sku_code: '',
      weight: 50,
      price_cents: 0,
      discount_cents: 0,
      quantity: 0,
      is_active: true,
      is_visible: true,
      is_limited: false,
    }
  });

  const handleCreate = () => {
    setEditingSKU(null);
    reset({
      sku_code: `${product.slug}-`,
      weight: 50,
      price_cents: 0,
      discount_cents: 0,
      quantity: 0,
      is_active: true,
      is_visible: true,
      is_limited: false,
    });
    openModal();
  };

  const handleEdit = (sku: SKU) => {
    setEditingSKU(sku);
    reset({
      sku_code: sku.sku_code,
      weight: sku.weight,
      price_cents: sku.price_cents,
      discount_cents: sku.discount_cents || 0,
      quantity: sku.quantity,
      is_active: sku.is_active ?? true,
      is_visible: sku.is_visible ?? true,
      is_limited: sku.is_limited ?? false,
    });
    openModal();
  };

  const handleDelete = async (sku: SKU) => {
    if (!confirm(`Удалить SKU "${sku.sku_code}"?`)) return;
    setLoading(true);
    try {
      await CatalogService.deleteSkuApiV1CatalogSkusIdDelete(sku.id);
      setSKUs(prev => prev.filter(s => s.id !== sku.id));
      notifications.show({ title: 'Успешно', message: 'SKU удален', color: 'green' });
      
      const updated = await CatalogService.readProductApiV1CatalogProductsIdGet(product.id);
      onUpdate(updated);
    } catch (error) {
      notifications.show({ title: 'Ошибка', message: 'Не удалось удалить SKU', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const newSkus = [...skus];
    [newSkus[index - 1], newSkus[index]] = [newSkus[index], newSkus[index - 1]];
    await saveSkuOrder(newSkus);
  };

  const handleMoveDown = async (index: number) => {
    if (index === skus.length - 1) return;
    const newSkus = [...skus];
    [newSkus[index], newSkus[index + 1]] = [newSkus[index + 1], newSkus[index]];
    await saveSkuOrder(newSkus);
  };

  const saveSkuOrder = async (newSkus: SKU[]) => {
    setLoading(true);
    try {
      const skuIds = newSkus.map(s => s.id);
      await CatalogService.reorderSkusApiV1CatalogProductsProductIdSkusReorderPost(product.id, skuIds);
      setSKUs(newSkus);
      notifications.show({ title: 'Успешно', message: 'Порядок SKU изменен', color: 'green' });
      
      const updated = await CatalogService.readProductApiV1CatalogProductsIdGet(product.id);
      onUpdate(updated);
    } catch (error) {
      notifications.show({ title: 'Ошибка', message: 'Не удалось изменить порядок SKU', color: 'red' });
      // Restore original order
      setSKUs(product.skus || []);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: SKUFormData) => {
    setLoading(true);
    try {
      if (editingSKU) {
        await CatalogService.updateSkuApiV1CatalogSkusIdPatch(editingSKU.id, data);
        notifications.show({ title: 'Успешно', message: 'SKU обновлен', color: 'green' });
      } else {
        await CatalogService.createSkuApiV1CatalogProductsProductIdSkusPost(product.id, data);
        notifications.show({ title: 'Успешно', message: 'SKU создан', color: 'green' });
      }
      closeModal();
      
      const updated = await CatalogService.readProductApiV1CatalogProductsIdGet(product.id);
      onUpdate(updated);
      setSKUs(updated.skus || []);
    } catch (error) {
      notifications.show({ title: 'Ошибка', message: 'Не удалось сохранить SKU', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (cents: number) => {
    return `${(cents / 100).toFixed(2)} ₽`;
  };

  return (
    <Stack gap="md">
      <LoadingOverlay visible={loading} />
      
      <Group justify="space-between">
        <Text fw={500}>Вариации товара (SKU)</Text>
        <Button leftSection={<IconPlus size={16} />} onClick={handleCreate}>
          Добавить SKU
        </Button>
      </Group>

      {skus.length > 0 ? (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={80}>Порядок</Table.Th>
              <Table.Th>SKU код</Table.Th>
              <Table.Th>Вес (г)</Table.Th>
              <Table.Th>Цена</Table.Th>
              <Table.Th>Скидка</Table.Th>
              <Table.Th>Остаток</Table.Th>
              <Table.Th>Статус</Table.Th>
              <Table.Th w={100} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {skus.map((sku, index) => (
              <Table.Tr key={sku.id}>
                <Table.Td>
                  <Group gap={2}>
                    <ActionIcon 
                      variant="subtle" 
                      color="gray" 
                      size="sm"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                    >
                      <IconArrowUp size={14} />
                    </ActionIcon>
                    <ActionIcon 
                      variant="subtle" 
                      color="gray" 
                      size="sm"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === skus.length - 1}
                    >
                      <IconArrowDown size={14} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Text fw={500}>{sku.sku_code}</Text>
                </Table.Td>
                <Table.Td>{sku.weight}г</Table.Td>
                <Table.Td>{formatPrice(sku.price_cents)}</Table.Td>
                <Table.Td>
                  {sku.discount_cents ? (
                    <Text c="green">-{formatPrice(sku.discount_cents)}</Text>
                  ) : '-'}
                </Table.Td>
                <Table.Td>
                  <Badge color={sku.quantity > 0 ? 'green' : 'red'}>
                    {sku.quantity} шт
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    {sku.is_active && <Badge size="xs" color="green">Активен</Badge>}
                    {sku.is_limited && <Badge size="xs" color="orange">Лимитед</Badge>}
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Group gap={0} justify="flex-end">
                    <ActionIcon variant="subtle" color="gray" onClick={() => handleEdit(sku)}>
                      <IconPencil size={16} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(sku)}>
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      ) : (
        <Text c="dimmed" ta="center" py="xl">
          Нет добавленных SKU. Добавьте хотя бы одну вариацию товара.
        </Text>
      )}

      <Modal opened={modalOpened} onClose={closeModal} title={editingSKU ? 'Редактирование SKU' : 'Создание SKU'}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack gap="md">
            <TextInput
              label="SKU код"
              placeholder="tea-oolong-50g"
              required
              {...register('sku_code')}
              error={errors.sku_code?.message}
            />

            <NumberInput
              label="Вес (граммы)"
              placeholder="50"
              required
              min={1}
              value={watch('weight')}
              onChange={(val) => setValue('weight', typeof val === 'number' ? val : 0)}
              error={errors.weight?.message}
            />

            <NumberInput
              label="Цена (копейки)"
              description="Например: 50000 = 500.00 ₽"
              placeholder="50000"
              required
              min={0}
              value={watch('price_cents')}
              onChange={(val) => setValue('price_cents', typeof val === 'number' ? val : 0)}
              error={errors.price_cents?.message}
            />

            <NumberInput
              label="Скидка (копейки)"
              description="Оставьте 0 если без скидки"
              placeholder="0"
              min={0}
              value={watch('discount_cents')}
              onChange={(val) => setValue('discount_cents', typeof val === 'number' ? val : 0)}
            />

            <NumberInput
              label="Количество на складе"
              placeholder="100"
              required
              min={0}
              value={watch('quantity')}
              onChange={(val) => setValue('quantity', typeof val === 'number' ? val : 0)}
              error={errors.quantity?.message}
            />

            <Checkbox
              label="Активен"
              checked={watch('is_active')}
              onChange={(e) => setValue('is_active', e.currentTarget.checked)}
            />

            <Checkbox
              label="Видим для покупателей"
              checked={watch('is_visible')}
              onChange={(e) => setValue('is_visible', e.currentTarget.checked)}
            />

            <Checkbox
              label="Лимитированная серия"
              checked={watch('is_limited')}
              onChange={(e) => setValue('is_limited', e.currentTarget.checked)}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeModal}>Отмена</Button>
              <Button type="submit" loading={loading}>
                {editingSKU ? 'Сохранить' : 'Создать'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
