'use client';

import { useEffect, useState } from 'react';
import {
  Table, ScrollArea, Group, Text, Badge, Button, Paper, Title, ActionIcon,
  LoadingOverlay, Flex, Box, Modal, TextInput, NumberInput, Select, Switch,
  Stack, Pagination
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconPencil, IconTrash, IconDiscount2, IconToggleLeft } from '@tabler/icons-react';
import { PromoCodesService, PromoCodeResponse, PromoCodeCreate, DiscountType } from '@/lib/api';
import { notifications } from '@mantine/notifications';

export default function PromoCodesPage() {
  const [promoCodes, setPromoCodes] = useState<PromoCodeResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [editingPromo, setEditingPromo] = useState<PromoCodeResponse | null>(null);
  
  // Отдельные стейты для дат
  const [validFrom, setValidFrom] = useState<Date | null>(null);
  const [validUntil, setValidUntil] = useState<Date | null>(null);

  const form = useForm<PromoCodeCreate>({
    initialValues: {
      code: '',
      discount_type: DiscountType.PERCENTAGE,
      discount_value: 10,
      min_order_amount_cents: undefined,
      usage_limit: undefined,
      usage_limit_per_user: 1,
      valid_from: undefined,
      valid_until: undefined,
      is_active: true,
    },
  });

  const fetchPromoCodes = async () => {
    setLoading(true);
    try {
      const skip = (page - 1) * pageSize;
      const response = await PromoCodesService.listPromoCodesApiV1PromoCodesGet(skip, pageSize);
      setPromoCodes(response.items || []);
      setTotal(response.total || 0);
    } catch (error) {
      notifications.show({ title: 'Ошибка', message: 'Не удалось загрузить промокоды', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromoCodes();
  }, [page]);

  const handleCreate = () => {
    setEditingPromo(null);
    form.reset();
    setValidFrom(null);
    setValidUntil(null);
    openModal();
  };

  const handleEdit = (promo: PromoCodeResponse) => {
    setEditingPromo(promo);
    form.setValues({
      code: promo.code,
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      min_order_amount_cents: promo.min_order_amount_cents || undefined,
      usage_limit: promo.usage_limit || undefined,
      usage_limit_per_user: promo.usage_limit_per_user || 1,
      valid_from: promo.valid_from || undefined,
      valid_until: promo.valid_until || undefined,
      is_active: promo.is_active,
    });
    setValidFrom(promo.valid_from ? new Date(promo.valid_from) : null);
    setValidUntil(promo.valid_until ? new Date(promo.valid_until) : null);
    openModal();
  };

  const handleSubmit = async (values: PromoCodeCreate) => {
    try {
      // Собираем данные, удаляя undefined значения
      const submitData: Record<string, any> = {
        code: values.code,
        discount_type: values.discount_type,
        discount_value: values.discount_value,
        is_active: values.is_active ?? true,
      };
      
      // Добавляем опциональные поля только если они заданы
      if (values.min_order_amount_cents) {
        submitData.min_order_amount_cents = values.min_order_amount_cents;
      }
      if (values.usage_limit) {
        submitData.usage_limit = values.usage_limit;
      }
      if (values.usage_limit_per_user) {
        submitData.usage_limit_per_user = values.usage_limit_per_user;
      }
      
      // Обработка дат - DatePickerInput возвращает строку YYYY-MM-DD
      if (validFrom) {
        submitData.valid_from = new Date(validFrom as any).toISOString();
      }
      if (validUntil) {
        submitData.valid_until = new Date(validUntil as any).toISOString();
      }
      
      console.log('Submitting promo code:', submitData);
      
      if (editingPromo) {
        await PromoCodesService.updatePromoCodeApiV1PromoCodesPromoIdPatch(editingPromo.id, submitData as PromoCodeCreate);
        notifications.show({ title: 'Успешно', message: 'Промокод обновлен', color: 'green' });
      } else {
        await PromoCodesService.createPromoCodeApiV1PromoCodesPost(submitData as PromoCodeCreate);
        notifications.show({ title: 'Успешно', message: 'Промокод создан', color: 'green' });
      }
      closeModal();
      fetchPromoCodes();
    } catch (error: any) {
      console.error('Promo code error:', error);
      notifications.show({ 
        title: 'Ошибка', 
        message: error.body?.detail || error.message || 'Не удалось сохранить промокод', 
        color: 'red' 
      });
    }
  };

  const handleDelete = async (promo: PromoCodeResponse) => {
    if (!confirm(`Удалить промокод "${promo.code}"?`)) return;
    try {
      await PromoCodesService.deletePromoCodeApiV1PromoCodesPromoIdDelete(promo.id);
      notifications.show({ title: 'Успешно', message: 'Промокод удален', color: 'green' });
      fetchPromoCodes();
    } catch (error) {
      notifications.show({ title: 'Ошибка', message: 'Не удалось удалить промокод', color: 'red' });
    }
  };

  const handleToggle = async (promo: PromoCodeResponse) => {
    try {
      await PromoCodesService.togglePromoCodeApiV1PromoCodesPromoIdTogglePost(promo.id);
      fetchPromoCodes();
    } catch (error) {
      notifications.show({ title: 'Ошибка', message: 'Не удалось изменить статус', color: 'red' });
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('ru-RU');
  };

  const rows = promoCodes.map((promo) => (
    <Table.Tr key={promo.id}>
      <Table.Td>
        <Text fw={600} ff="monospace">{promo.code}</Text>
      </Table.Td>
      <Table.Td>
        <Badge color={promo.discount_type === DiscountType.PERCENTAGE ? 'blue' : 'green'}>
          {promo.discount_type === DiscountType.PERCENTAGE 
            ? `${promo.discount_value}%` 
            : `${promo.discount_value} ₽`}
        </Badge>
      </Table.Td>
      <Table.Td>
        {promo.min_order_amount_cents ? `${(promo.min_order_amount_cents / 100).toFixed(0)} ₽` : '—'}
      </Table.Td>
      <Table.Td>
        {promo.usage_count || 0} / {promo.usage_limit || '∞'}
      </Table.Td>
      <Table.Td>
        <Text size="xs">{formatDate(promo.valid_from)} — {formatDate(promo.valid_until)}</Text>
      </Table.Td>
      <Table.Td>
        <Badge color={promo.is_active ? 'green' : 'gray'}>
          {promo.is_active ? 'Активен' : 'Выкл'}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Group gap="xs">
          <ActionIcon variant="subtle" color="blue" onClick={() => handleToggle(promo)}>
            <IconToggleLeft size={16} />
          </ActionIcon>
          <ActionIcon variant="subtle" color="gray" onClick={() => handleEdit(promo)}>
            <IconPencil size={16} />
          </ActionIcon>
          <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(promo)}>
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Paper withBorder p="md" radius="md" pos="relative">
      <LoadingOverlay visible={loading} />

      <Flex justify="space-between" align="center" mb="md">
        <Group gap="sm">
          <IconDiscount2 size={24} style={{ color: 'var(--mantine-color-violet-6)' }} />
          <Title order={4}>Промокоды</Title>
          <Badge variant="light" color="violet">{total}</Badge>
        </Group>
        <Button leftSection={<IconPlus size={16} />} onClick={handleCreate}>
          Создать промокод
        </Button>
      </Flex>

      <ScrollArea>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Код</Table.Th>
              <Table.Th>Скидка</Table.Th>
              <Table.Th>Мин. сумма</Table.Th>
              <Table.Th>Использований</Table.Th>
              <Table.Th>Период</Table.Th>
              <Table.Th>Статус</Table.Th>
              <Table.Th w={100} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.length > 0 ? rows : (
              <Table.Tr>
                <Table.Td colSpan={7}>
                  <Text c="dimmed" ta="center" py="xl">Промокоды не найдены</Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </ScrollArea>

      {total > pageSize && (
        <Group justify="center" mt="md">
          <Pagination total={Math.ceil(total / pageSize)} value={page} onChange={setPage} />
        </Group>
      )}

      <Modal opened={modalOpened} onClose={closeModal} title={editingPromo ? 'Редактировать промокод' : 'Новый промокод'}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="sm">
            <TextInput
              label="Код"
              placeholder="SALE2024"
              required
              {...form.getInputProps('code')}
              styles={{ input: { textTransform: 'uppercase', fontFamily: 'monospace' } }}
            />
            <Select
              label="Тип скидки"
              data={[
                { value: DiscountType.PERCENTAGE, label: 'Процент' },
                { value: DiscountType.FIXED, label: 'Фиксированная сумма' },
              ]}
              {...form.getInputProps('discount_type')}
            />
            <NumberInput
              label={form.values.discount_type === DiscountType.PERCENTAGE ? 'Процент скидки' : 'Сумма скидки (₽)'}
              min={1}
              max={form.values.discount_type === DiscountType.PERCENTAGE ? 100 : undefined}
              required
              {...form.getInputProps('discount_value')}
            />
            <NumberInput
              label="Минимальная сумма заказа (коп.)"
              min={0}
              {...form.getInputProps('min_order_amount_cents')}
            />
            <Group grow>
              <NumberInput
                label="Макс. использований"
                min={1}
                {...form.getInputProps('usage_limit')}
              />
              <NumberInput
                label="На пользователя"
                min={1}
                {...form.getInputProps('usage_limit_per_user')}
              />
            </Group>
            <Group grow>
              <DatePickerInput
                label="Действует с"
                placeholder="Выберите дату"
                clearable
                valueFormat="DD.MM.YYYY"
                value={validFrom}
                onChange={(date) => {
                  console.log('DatePicker validFrom changed:', date);
                  setValidFrom(date);
                }}
                popoverProps={{ withinPortal: true }}
              />
              <DatePickerInput
                label="Действует до"
                placeholder="Выберите дату"
                clearable
                valueFormat="DD.MM.YYYY"
                value={validUntil}
                onChange={(date) => {
                  console.log('DatePicker validUntil changed:', date);
                  setValidUntil(date);
                }}
                popoverProps={{ withinPortal: true }}
              />
            </Group>
            <Switch
              label="Активен"
              {...form.getInputProps('is_active', { type: 'checkbox' })}
            />
            <Button type="submit" fullWidth mt="md">
              {editingPromo ? 'Сохранить' : 'Создать'}
            </Button>
          </Stack>
        </form>
      </Modal>
    </Paper>
  );
}
