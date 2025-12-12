'use client';

import { useEffect, useState } from 'react';
import { Table, ScrollArea, Group, Text, Badge, Paper, Title, Tabs, ActionIcon, Pagination, LoadingOverlay, Flex, Box } from '@mantine/core';
import { IconEye, IconX, IconTruck, IconCheck, IconClock, IconShoppingCart } from '@tabler/icons-react';
import { OrdersService, OrderAdminResponse, OrderStatus } from '@/lib/api';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import { OrderDrawer } from './OrderDrawer';

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  awaiting_payment: { label: 'Ожидает', color: 'yellow', icon: <IconClock size={12} /> },
  paid: { label: 'Оплачен', color: 'blue', icon: <IconCheck size={12} /> },
  shipped: { label: 'Отправлен', color: 'cyan', icon: <IconTruck size={12} /> },
  delivered: { label: 'Доставлен', color: 'green', icon: <IconCheck size={12} /> },
  cancelled: { label: 'Отменён', color: 'red', icon: <IconX size={12} /> },
};

export function OrderList() {
  const [orders, setOrders] = useState<OrderAdminResponse[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>('all');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [selectedOrder, setSelectedOrder] = useState<OrderAdminResponse | null>(null);
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const skip = (page - 1) * pageSize;
      const status = statusFilter !== 'all' ? statusFilter as OrderStatus : undefined;
      const data = await OrdersService.readOrdersApiV1OrdersGet(skip, pageSize, status);
      setOrders(data.items || []);
      setTotalOrders(data.total || 0);
    } catch (error) {
      console.error('Orders fetch error:', error);
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось загрузить заказы',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter]);

  const handleViewOrder = (order: OrderAdminResponse) => {
    setSelectedOrder(order);
    openDrawer();
  };

  const handleOrderUpdate = (updatedOrder: OrderAdminResponse) => {
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    setSelectedOrder(updatedOrder);
  };

  const formatPrice = (cents: number) => `${(cents / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('ru-RU', { 
      day: '2-digit', 
      month: '2-digit', 
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const rows = orders.map((order) => {
    const status = order.status;
    const config = statusConfig[status] || statusConfig.awaiting_payment;
    
    // Extract customer name from contact_info
    const contactInfo = order.contact_info as { firstname?: string; lastname?: string; phone?: string; email?: string } | null;
    const customerName = contactInfo 
      ? [contactInfo.lastname, contactInfo.firstname].filter(Boolean).join(' ') || contactInfo.email || contactInfo.phone
      : order.user_id ? `User #${order.user_id}` : 'Гость';
    
    return (
      <Table.Tr key={order.id} style={{ cursor: 'pointer' }} onClick={() => handleViewOrder(order)}>
        <Table.Td>
          <Text fw={500} size="sm">#{order.id}</Text>
        </Table.Td>
        <Table.Td>
          <Text size="sm">{customerName}</Text>
        </Table.Td>
        <Table.Td>
          <Badge color={config.color} leftSection={config.icon} size="sm">
            {config.label}
          </Badge>
        </Table.Td>
        <Table.Td>
          <Text fw={500} size="sm">{formatPrice(order.final_amount_cents || order.total_amount_cents)}</Text>
          <Text size="xs" c="dimmed">
            {order.delivery_cost_cents > 0 
              ? `товары: ${formatPrice(order.total_amount_cents)} + ${formatPrice(order.delivery_cost_cents)} дост.`
              : `${order.items?.length || 0} поз.`
            }
          </Text>
        </Table.Td>
        <Table.Td>
          <Text size="xs">{formatDate(order.created_at)}</Text>
        </Table.Td>
        <Table.Td onClick={(e) => e.stopPropagation()}>
          <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => handleViewOrder(order)}>
            <IconEye size={14} />
          </ActionIcon>
        </Table.Td>
      </Table.Tr>
    );
  });

  return (
    <Paper withBorder p="sm" radius="md" pos="relative">
      <LoadingOverlay visible={loading} zIndex={10} overlayProps={{ radius: 'sm', blur: 2 }} />
      
      <Flex justify="space-between" align="center" mb="sm">
        <Group gap="sm">
          <IconShoppingCart size={20} style={{ color: 'var(--mantine-color-teal-6)' }} />
          <Title order={4}>Заказы</Title>
          <Badge variant="light" color="teal" size="sm">{totalOrders}</Badge>
        </Group>
      </Flex>

      <Tabs value={statusFilter} onChange={setStatusFilter} mb="sm">
        <Tabs.List>
          <Tabs.Tab value="all">Все</Tabs.Tab>
          <Tabs.Tab value="awaiting_payment" leftSection={<IconClock size={12} />}>
            Ожидают
          </Tabs.Tab>
          <Tabs.Tab value="paid" leftSection={<IconCheck size={12} />}>
            Оплачены
          </Tabs.Tab>
          <Tabs.Tab value="shipped" leftSection={<IconTruck size={12} />}>
            Отправлены
          </Tabs.Tab>
          <Tabs.Tab value="cancelled" leftSection={<IconX size={12} />}>
            Отменены
          </Tabs.Tab>
        </Tabs.List>
      </Tabs>

      <ScrollArea>
        <Table verticalSpacing="xs" striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={70}>№</Table.Th>
              <Table.Th>Клиент</Table.Th>
              <Table.Th>Статус</Table.Th>
              <Table.Th>Сумма</Table.Th>
              <Table.Th>Дата</Table.Th>
              <Table.Th w={50} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.length > 0 ? rows : !loading ? (
              <Table.Tr>
                <Table.Td colSpan={6}>
                  <Box py="lg" ta="center">
                    <IconShoppingCart size={40} style={{ color: 'var(--mantine-color-dimmed)', opacity: 0.5 }} />
                    <Text c="dimmed" size="sm" mt="xs">Заказы не найдены</Text>
                  </Box>
                </Table.Td>
              </Table.Tr>
            ) : null}
          </Table.Tbody>
        </Table>
      </ScrollArea>

      {totalOrders > pageSize && (
        <Group justify="center" mt="sm">
          <Pagination total={Math.ceil(totalOrders / pageSize)} value={page} onChange={setPage} size="sm" />
        </Group>
      )}

      <OrderDrawer 
        order={selectedOrder}
        opened={drawerOpened}
        onClose={closeDrawer}
        onUpdate={handleOrderUpdate}
      />
    </Paper>
  );
}
