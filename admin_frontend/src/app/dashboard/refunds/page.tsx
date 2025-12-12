'use client';

import { useEffect, useState } from 'react';
import {
  Paper, Title, Table, ScrollArea, Group, Text, Badge, Button, Stack,
  LoadingOverlay, Modal, NumberInput, Textarea, ActionIcon, Pagination
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { IconReceiptRefund, IconPlus, IconRefresh, IconEye } from '@tabler/icons-react';
import { RefundsService, RefundResponse, RefundCreate } from '@/lib/api';
import { notifications } from '@mantine/notifications';

export default function RefundsPage() {
  const [refunds, setRefunds] = useState<RefundResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [createModalOpened, { open: openCreateModal, close: closeCreateModal }] = useDisclosure(false);
  const [detailsModalOpened, { open: openDetailsModal, close: closeDetailsModal }] = useDisclosure(false);
  const [selectedRefund, setSelectedRefund] = useState<RefundResponse | null>(null);

  const form = useForm<RefundCreate>({
    initialValues: {
      order_id: 0,
      amount_cents: 0,
      reason: '',
    },
  });

  const fetchRefunds = async () => {
    setLoading(true);
    try {
      const skip = (page - 1) * pageSize;
      const response = await RefundsService.listRefundsApiV1RefundsGet(skip, pageSize);
      setRefunds(response.items || []);
      setTotal(response.total || 0);
    } catch (error) {
      notifications.show({ title: 'Ошибка', message: 'Не удалось загрузить возвраты', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, [page]);

  const handleCreate = async (values: RefundCreate) => {
    try {
      await RefundsService.createRefundApiV1RefundsPost(values);
      notifications.show({ title: 'Успешно', message: 'Возврат создан', color: 'green' });
      closeCreateModal();
      form.reset();
      fetchRefunds();
    } catch (error: any) {
      notifications.show({ 
        title: 'Ошибка', 
        message: error.body?.detail || 'Не удалось создать возврат', 
        color: 'red' 
      });
    }
  };

  const handleCheckStatus = async (refundId: number) => {
    try {
      const response = await RefundsService.checkRefundStatusApiV1RefundsRefundIdStatusGet(refundId);
      setSelectedRefund(response);
      openDetailsModal();
      fetchRefunds();
    } catch (error) {
      notifications.show({ title: 'Ошибка', message: 'Не удалось проверить статус', color: 'red' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded': return 'green';
      case 'pending': return 'yellow';
      case 'canceled': return 'red';
      default: return 'gray';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'succeeded': return 'Выполнен';
      case 'pending': return 'В обработке';
      case 'canceled': return 'Отменён';
      default: return status;
    }
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString('ru-RU');
  const formatMoney = (cents: number) => `${(cents / 100).toLocaleString('ru-RU')} ₽`;

  const rows = refunds.map((refund) => (
    <Table.Tr key={refund.id}>
      <Table.Td>
        <Text size="sm" fw={500}>#{refund.id}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm">Заказ #{refund.order_id}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm" fw={500}>{formatMoney(refund.amount_cents)}</Text>
      </Table.Td>
      <Table.Td>
        <Badge color={getStatusColor(refund.status)}>
          {getStatusLabel(refund.status)}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Text size="xs" c="dimmed" lineClamp={1}>{refund.reason || '—'}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="xs">{formatDate(refund.created_at)}</Text>
      </Table.Td>
      <Table.Td>
        <Group gap="xs">
          <ActionIcon 
            variant="subtle" 
            color="blue"
            onClick={() => handleCheckStatus(refund.id)}
          >
            <IconRefresh size={16} />
          </ActionIcon>
          <ActionIcon 
            variant="subtle" 
            color="gray"
            onClick={() => {
              setSelectedRefund(refund);
              openDetailsModal();
            }}
          >
            <IconEye size={16} />
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Paper withBorder p="md" radius="md" pos="relative">
      <LoadingOverlay visible={loading} />

      <Group justify="space-between" mb="md">
        <Group gap="sm">
          <IconReceiptRefund size={24} style={{ color: 'var(--mantine-color-red-6)' }} />
          <Title order={4}>Возвраты</Title>
          <Badge variant="light" color="red">{total}</Badge>
        </Group>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
          Создать возврат
        </Button>
      </Group>

      <ScrollArea>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>ID</Table.Th>
              <Table.Th>Заказ</Table.Th>
              <Table.Th>Сумма</Table.Th>
              <Table.Th>Статус</Table.Th>
              <Table.Th>Причина</Table.Th>
              <Table.Th>Дата</Table.Th>
              <Table.Th w={80} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.length > 0 ? rows : (
              <Table.Tr>
                <Table.Td colSpan={7}>
                  <Text c="dimmed" ta="center" py="xl">Возвратов нет</Text>
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

      {/* Create Refund Modal */}
      <Modal opened={createModalOpened} onClose={closeCreateModal} title="Создать возврат">
        <form onSubmit={form.onSubmit(handleCreate)}>
          <Stack gap="sm">
            <NumberInput
              label="ID заказа"
              placeholder="12345"
              required
              min={1}
              {...form.getInputProps('order_id')}
            />
            <NumberInput
              label="Сумма (копейки)"
              description="Введите 0 для полного возврата"
              placeholder="10000"
              min={0}
              {...form.getInputProps('amount_cents')}
            />
            <Textarea
              label="Причина возврата"
              placeholder="Клиент отказался от товара..."
              {...form.getInputProps('reason')}
            />
            <Button type="submit" fullWidth mt="md">
              Создать возврат
            </Button>
          </Stack>
        </form>
      </Modal>

      {/* Refund Details Modal */}
      <Modal 
        opened={detailsModalOpened} 
        onClose={closeDetailsModal} 
        title={`Возврат #${selectedRefund?.id}`}
      >
        {selectedRefund && (
          <Stack gap="sm">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Заказ:</Text>
              <Text size="sm" fw={500}>#{selectedRefund.order_id}</Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Сумма:</Text>
              <Text size="sm" fw={500}>{formatMoney(selectedRefund.amount_cents)}</Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Статус:</Text>
              <Badge color={getStatusColor(selectedRefund.status)}>
                {getStatusLabel(selectedRefund.status)}
              </Badge>
            </Group>
            {selectedRefund.refund_id && (
              <Group justify="space-between">
                <Text size="sm" c="dimmed">ID в YooKassa:</Text>
                <Text size="xs" ff="monospace">{selectedRefund.refund_id}</Text>
              </Group>
            )}
            {selectedRefund.reason && (
              <>
                <Text size="sm" c="dimmed">Причина:</Text>
                <Text size="sm">{selectedRefund.reason}</Text>
              </>
            )}
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Создан:</Text>
              <Text size="sm">{formatDate(selectedRefund.created_at)}</Text>
            </Group>
            {selectedRefund.admin_id && (
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Администратор:</Text>
                <Text size="sm">#{selectedRefund.admin_id}</Text>
              </Group>
            )}
          </Stack>
        )}
      </Modal>
    </Paper>
  );
}
