'use client';

import { useState } from 'react';
import { Drawer, Stack, Group, Text, Badge, Button, Divider, Table, Paper, Title, LoadingOverlay, Select } from '@mantine/core';
import { IconX, IconUser, IconMapPin, IconPhone } from '@tabler/icons-react';
import { OrderAdminResponse, OrdersService, OrderStatus } from '@/lib/api';
import { notifications } from '@mantine/notifications';

const statusConfig: Record<string, { label: string; color: string }> = {
  awaiting_payment: { label: 'Ожидает оплаты', color: 'yellow' },
  paid: { label: 'Оплачен', color: 'blue' },
  shipped: { label: 'Отправлен', color: 'cyan' },
  delivered: { label: 'Доставлен', color: 'green' },
  cancelled: { label: 'Отменён', color: 'red' },
};

interface OrderDrawerProps {
  order: OrderAdminResponse | null;
  opened: boolean;
  onClose: () => void;
  onUpdate: (order: OrderAdminResponse) => void;
}

export function OrderDrawer({ order, opened, onClose, onUpdate }: OrderDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [newStatus, setNewStatus] = useState<string | null>(null);

  if (!order) return null;

  const status = order.status;
  const config = statusConfig[status] || statusConfig.awaiting_payment;

  const formatPrice = (cents: number) => `${(cents / 100).toFixed(2)} ₽`;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('ru-RU', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleStatusChange = async () => {
    if (!newStatus) return;
    setLoading(true);
    try {
      const updated = await OrdersService.updateOrderStatusApiV1OrdersIdStatusPatch(order.id, { status: newStatus as OrderStatus });
      notifications.show({ title: 'Успешно', message: 'Статус обновлён', color: 'green' });
      onUpdate(updated);
      setNewStatus(null);
    } catch (error) {
      notifications.show({ title: 'Ошибка', message: 'Не удалось обновить статус', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Отменить заказ? Это действие нельзя отменить.')) return;
    setLoading(true);
    try {
      const updated = await OrdersService.cancelOrderApiV1OrdersIdCancelPost(order.id);
      notifications.show({ title: 'Успешно', message: 'Заказ отменён', color: 'green' });
      onUpdate(updated);
    } catch (error) {
      notifications.show({ title: 'Ошибка', message: 'Не удалось отменить заказ', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = [
    { value: 'awaiting_payment', label: 'Ожидает оплаты' },
    { value: 'paid', label: 'Оплачен' },
    { value: 'shipped', label: 'Отправлен' },
    { value: 'delivered', label: 'Доставлен' },
  ];

  return (
    <Drawer 
      opened={opened} 
      onClose={onClose} 
      title={`Заказ #${order.id}`}
      position="right"
      size="lg"
    >
      <LoadingOverlay visible={loading} />
      
      <Stack gap="md">
        {/* Status */}
        <Paper withBorder p="md">
          <Group justify="space-between" mb="sm">
            <Text fw={500}>Статус</Text>
            <Badge size="lg" color={config.color}>{config.label}</Badge>
          </Group>
          
          {status !== 'cancelled' && status !== 'delivered' && (
            <Group>
              <Select
                placeholder="Изменить статус"
                data={statusOptions.filter(s => s.value !== status)}
                value={newStatus}
                onChange={setNewStatus}
                style={{ flex: 1 }}
              />
              <Button onClick={handleStatusChange} disabled={!newStatus}>
                Применить
              </Button>
            </Group>
          )}
        </Paper>

        {/* Customer Info */}
        <Paper withBorder p="md">
          <Title order={5} mb="sm">Информация о клиенте</Title>
          <Stack gap="xs">
            <Group gap="xs">
              <IconUser size={16} />
              <Text size="sm">{order.user_email || `User #${order.user_id}`}</Text>
            </Group>
            {order.shipping_address && (
              <Group gap="xs">
                <IconMapPin size={16} />
                <Text size="sm">{order.shipping_address}</Text>
              </Group>
            )}
            {order.phone && (
              <Group gap="xs">
                <IconPhone size={16} />
                <Text size="sm">{order.phone}</Text>
              </Group>
            )}
          </Stack>
        </Paper>

        {/* Order Items */}
        <Paper withBorder p="md">
          <Title order={5} mb="sm">Позиции заказа</Title>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Товар</Table.Th>
                <Table.Th>SKU</Table.Th>
                <Table.Th ta="right">Кол-во</Table.Th>
                <Table.Th ta="right">Цена</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {order.items?.map((item, idx) => (
                <Table.Tr key={idx}>
                  <Table.Td>
                    <Text size="sm" fw={500}>{item.product_title || 'Товар'}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">{item.sku_code || '-'}</Text>
                  </Table.Td>
                  <Table.Td ta="right">{item.quantity}</Table.Td>
                  <Table.Td ta="right">{formatPrice(item.price_cents)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          
          <Divider my="sm" />
          
          <Group justify="space-between">
            <Text fw={500}>Итого:</Text>
            <Text fw={700} size="lg">{formatPrice(order.total_cents)}</Text>
          </Group>
        </Paper>

        {/* Dates */}
        <Paper withBorder p="md">
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Создан:</Text>
              <Text size="sm">{formatDate(order.created_at)}</Text>
            </Group>
            {order.updated_at && (
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Обновлён:</Text>
                <Text size="sm">{formatDate(order.updated_at)}</Text>
              </Group>
            )}
          </Stack>
        </Paper>

        {/* Actions */}
        {status !== 'cancelled' && status !== 'delivered' && (
          <Button 
            color="red" 
            variant="outline" 
            leftSection={<IconX size={16} />}
            onClick={handleCancel}
          >
            Отменить заказ
          </Button>
        )}
      </Stack>
    </Drawer>
  );
}
