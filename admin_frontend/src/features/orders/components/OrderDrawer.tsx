'use client';

import { useState } from 'react';
import { Drawer, Stack, Group, Text, Badge, Button, Divider, Table, Paper, Title, LoadingOverlay, Select, TextInput } from '@mantine/core';
import { IconX, IconUser, IconMapPin, IconPhone, IconMail, IconTruck, IconPackage } from '@tabler/icons-react';
import { OrderAdminResponse, OrdersService, OrderStatus } from '@/lib/api';
import { notifications } from '@mantine/notifications';

const statusConfig: Record<string, { label: string; color: string }> = {
  awaiting_payment: { label: 'Ожидает оплаты', color: 'yellow' },
  paid: { label: 'Оплачен', color: 'blue' },
  processing: { label: 'В обработке', color: 'indigo' },
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
  const [trackingNumber, setTrackingNumber] = useState('');

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

  // Extract contact info
  const contactInfo = order.contact_info as { firstname?: string; lastname?: string; middlename?: string; phone?: string; email?: string } | null;
  const customerName = contactInfo 
    ? [contactInfo.lastname, contactInfo.firstname, contactInfo.middlename].filter(Boolean).join(' ')
    : `User #${order.user_id || 'Гость'}`;
  const customerPhone = contactInfo?.phone;
  const customerEmail = contactInfo?.email;

  // Extract shipping address
  const shippingAddress = order.shipping_address as { address?: string; postal_code?: string } | null;
  const fullAddress = shippingAddress 
    ? `${shippingAddress.postal_code || ''}, ${shippingAddress.address || ''}`.replace(/^, |, $/g, '')
    : null;

  const handleStatusChange = async () => {
    if (!newStatus) return;
    setLoading(true);
    try {
      const updated = await OrdersService.updateOrderStatusApiV1OrdersIdStatusPatch(order.id, { status: newStatus as OrderStatus });
      notifications.show({ title: 'Успешно', message: 'Статус обновлён', color: 'green' });
      onUpdate(updated);
      setNewStatus(null);
    } catch (error) {
      notifications.show({ title: 'Ошибка', message: (error as { body?: { detail?: string } }).body?.detail || 'Не удалось обновить статус', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  const handleTrackingUpdate = async () => {
    if (!trackingNumber.trim()) return;
    setLoading(true);
    try {
      const updated = await OrdersService.updateTrackingNumberApiV1OrdersIdTrackingPatch(order.id, { tracking_number: trackingNumber.trim() });
      notifications.show({ title: 'Успешно', message: 'Трек-номер сохранён', color: 'green' });
      onUpdate(updated);
      setTrackingNumber('');
    } catch (error) {
      notifications.show({ title: 'Ошибка', message: (error as { body?: { detail?: string } }).body?.detail || 'Не удалось сохранить трек-номер', color: 'red' });
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
      notifications.show({ title: 'Ошибка', message: (error as { body?: { detail?: string } }).body?.detail || 'Не удалось отменить заказ', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = [
    { value: 'awaiting_payment', label: 'Ожидает оплаты' },
    { value: 'paid', label: 'Оплачен' },
    { value: 'processing', label: 'В обработке' },
    { value: 'shipped', label: 'Отправлен' },
    { value: 'delivered', label: 'Доставлен' },
  ];

  const deliveryMethodLabel = order.delivery_method === 'russian_post' ? 'Почта России' : 'Самовывоз';

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

        {/* Tracking Number */}
        {(status === 'shipped' || status === 'processing' || order.tracking_number) && (
          <Paper withBorder p="md">
            <Title order={5} mb="sm">Отслеживание</Title>
            {order.tracking_number ? (
              <Group gap="xs">
                <IconPackage size={16} />
                <Text size="sm" fw={500}>Трек-номер: {order.tracking_number}</Text>
              </Group>
            ) : (
              <Group>
                <TextInput
                  placeholder="Введите трек-номер"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  style={{ flex: 1 }}
                />
                <Button onClick={handleTrackingUpdate} disabled={!trackingNumber.trim()}>
                  Сохранить
                </Button>
              </Group>
            )}
          </Paper>
        )}

        {/* Customer Info */}
        <Paper withBorder p="md">
          <Title order={5} mb="sm">Информация о клиенте</Title>
          <Stack gap="xs">
            <Group gap="xs">
              <IconUser size={16} />
              <Text size="sm">{customerName}</Text>
            </Group>
            {customerPhone && (
              <Group gap="xs">
                <IconPhone size={16} />
                <Text size="sm">{customerPhone}</Text>
              </Group>
            )}
            {customerEmail && (
              <Group gap="xs">
                <IconMail size={16} />
                <Text size="sm">{customerEmail}</Text>
              </Group>
            )}
          </Stack>
        </Paper>

        {/* Delivery Info */}
        <Paper withBorder p="md">
          <Title order={5} mb="sm">Доставка</Title>
          <Stack gap="xs">
            <Group gap="xs">
              <IconTruck size={16} />
              <Text size="sm">{deliveryMethodLabel}</Text>
            </Group>
            {fullAddress && (
              <Group gap="xs">
                <IconMapPin size={16} />
                <Text size="sm">{fullAddress}</Text>
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
                <Table.Th>Вариант</Table.Th>
                <Table.Th ta="right">Кол-во</Table.Th>
                <Table.Th ta="right">Цена</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {order.items?.map((item, idx) => (
                <Table.Tr key={idx}>
                  <Table.Td>
                    <Text size="sm" fw={500}>{item.title || 'Товар'}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">{item.sku_info || '-'}</Text>
                  </Table.Td>
                  <Table.Td ta="right">{item.quantity}</Table.Td>
                  <Table.Td ta="right">{formatPrice(item.price_cents)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          
          <Divider my="sm" />
          
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Товары:</Text>
              <Text size="sm">{formatPrice(order.total_amount_cents)}</Text>
            </Group>
            {(order.delivery_cost_cents ?? 0) > 0 && (
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Доставка:</Text>
                <Text size="sm">{formatPrice(order.delivery_cost_cents ?? 0)}</Text>
              </Group>
            )}
            {(order.discount_amount_cents ?? 0) > 0 && (
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Скидка{order.promo_code ? ` (${order.promo_code})` : ''}:</Text>
                <Text size="sm" c="green">-{formatPrice(order.discount_amount_cents ?? 0)}</Text>
              </Group>
            )}
            <Divider my="xs" />
            <Group justify="space-between">
              <Text fw={500} size="md">Итого:</Text>
              <Text fw={700} size="lg">{formatPrice(order.final_amount_cents || (order.total_amount_cents + (order.delivery_cost_cents ?? 0)))}</Text>
            </Group>
          </Stack>
        </Paper>

        {/* Dates */}
        <Paper withBorder p="md">
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Создан:</Text>
              <Text size="sm">{formatDate(order.created_at)}</Text>
            </Group>
            {order.expires_at && status === 'awaiting_payment' && (
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Истекает:</Text>
                <Text size="sm" c="orange">{formatDate(order.expires_at)}</Text>
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
