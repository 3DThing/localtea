'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Paper, Title, Group, Text, Badge, Table, ScrollArea, LoadingOverlay,
  SimpleGrid, Card, ActionIcon, Button, Modal, Stack, TextInput, NumberInput,
  Textarea, Select, Pagination, Flex, Box, ThemeIcon, Tooltip
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { DatePickerInput, DatesRangeValue } from '@mantine/dates';
import {
  IconCash, IconArrowUp, IconArrowDown, IconReceipt, IconRefresh,
  IconPlus, IconMinus, IconHistory, IconChartBar, IconWallet,
  IconShoppingCart, IconReceiptRefund, IconReportMoney
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import {
  FinanceService,
  FinanceTransaction,
  FinanceBalance,
  FinanceAnalytics,
  TransactionType
} from '@/lib/api/services/FinanceService';

const TRANSACTION_TYPES = [
  { value: 'sale', label: 'Продажа', color: 'green', icon: IconShoppingCart },
  { value: 'refund', label: 'Возврат', color: 'orange', icon: IconReceiptRefund },
  { value: 'deposit', label: 'Внесение', color: 'blue', icon: IconArrowDown },
  { value: 'withdrawal', label: 'Изъятие', color: 'red', icon: IconArrowUp },
  { value: 'expense', label: 'Расход', color: 'grape', icon: IconReceipt },
  { value: 'adjustment', label: 'Корректировка', color: 'gray', icon: IconReportMoney },
];

const getTransactionInfo = (type: string) =>
  TRANSACTION_TYPES.find(t => t.value === type) || TRANSACTION_TYPES[5];

const formatMoney = (cents: number): string => {
  const rubles = cents / 100;
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 2,
  }).format(rubles);
};

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function FinancePage() {
  // Balance state
  const [balance, setBalance] = useState<FinanceBalance | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  // Transactions state
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [transactionsTotal, setTransactionsTotal] = useState(0);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DatesRangeValue>([null, null]);

  // Analytics state
  const [analytics, setAnalytics] = useState<FinanceAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Categories state
  const [categories, setCategories] = useState<string[]>([]);

  // Modals
  const [depositModalOpened, { open: openDepositModal, close: closeDepositModal }] = useDisclosure(false);
  const [withdrawalModalOpened, { open: openWithdrawalModal, close: closeWithdrawalModal }] = useDisclosure(false);
  const [expenseModalOpened, { open: openExpenseModal, close: closeExpenseModal }] = useDisclosure(false);
  const [adjustmentModalOpened, { open: openAdjustmentModal, close: closeAdjustmentModal }] = useDisclosure(false);

  // Form states
  const [depositForm, setDepositForm] = useState({ amount: 0, description: '' });
  const [withdrawalForm, setWithdrawalForm] = useState({ amount: 0, description: '' });
  const [expenseForm, setExpenseForm] = useState({ amount: 0, description: '', category: '' });
  const [adjustmentForm, setAdjustmentForm] = useState({ amount: 0, description: '' });

  const [submitting, setSubmitting] = useState(false);

  const pageSize = 20;

  // ==================== Fetch functions ====================
  const fetchBalance = useCallback(async () => {
    setBalanceLoading(true);
    try {
      const data = await FinanceService.getBalance();
      setBalance(data);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось загрузить баланс',
        color: 'red',
      });
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    setTransactionsLoading(true);
    try {
      const skip = (transactionsPage - 1) * pageSize;
      const startDate = dateRange[0] ? (typeof dateRange[0] === 'string' ? dateRange[0] : dateRange[0].toISOString().split('T')[0]) : null;
      const endDate = dateRange[1] ? (typeof dateRange[1] === 'string' ? dateRange[1] : dateRange[1].toISOString().split('T')[0]) : null;
      const data = await FinanceService.listTransactions(
        skip,
        pageSize,
        transactionTypeFilter as TransactionType | null,
        startDate,
        endDate,
        null
      );
      setTransactions(data.items);
      setTransactionsTotal(data.total);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось загрузить транзакции',
        color: 'red',
      });
    } finally {
      setTransactionsLoading(false);
    }
  }, [transactionsPage, transactionTypeFilter, dateRange]);

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const data = await FinanceService.getAnalytics(30);
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await FinanceService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
    fetchCategories();
  }, [fetchBalance, fetchCategories]);

  useEffect(() => {
    fetchTransactions();
    fetchAnalytics();
  }, [fetchTransactions, fetchAnalytics]);

  // ==================== Submit handlers ====================
  const handleDepositSubmit = async () => {
    if (depositForm.amount <= 0 || !depositForm.description.trim()) {
      notifications.show({
        title: 'Ошибка',
        message: 'Заполните все поля',
        color: 'red',
      });
      return;
    }

    setSubmitting(true);
    try {
      await FinanceService.createDeposit({
        amount_cents: Math.round(depositForm.amount * 100),
        description: depositForm.description,
      });
      notifications.show({
        title: 'Успешно',
        message: 'Внесение зарегистрировано',
        color: 'green',
      });
      closeDepositModal();
      setDepositForm({ amount: 0, description: '' });
      fetchBalance();
      fetchTransactions();
      fetchAnalytics();
    } catch (error) {
      console.error('Failed to create deposit:', error);
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось создать запись',
        color: 'red',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdrawalSubmit = async () => {
    if (withdrawalForm.amount <= 0 || !withdrawalForm.description.trim()) {
      notifications.show({
        title: 'Ошибка',
        message: 'Заполните все поля',
        color: 'red',
      });
      return;
    }

    setSubmitting(true);
    try {
      await FinanceService.createWithdrawal({
        amount_cents: Math.round(withdrawalForm.amount * 100),
        description: withdrawalForm.description,
      });
      notifications.show({
        title: 'Успешно',
        message: 'Изъятие зарегистрировано',
        color: 'green',
      });
      closeWithdrawalModal();
      setWithdrawalForm({ amount: 0, description: '' });
      fetchBalance();
      fetchTransactions();
      fetchAnalytics();
    } catch (error) {
      console.error('Failed to create withdrawal:', error);
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось создать запись',
        color: 'red',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleExpenseSubmit = async () => {
    if (expenseForm.amount <= 0 || !expenseForm.description.trim()) {
      notifications.show({
        title: 'Ошибка',
        message: 'Заполните все поля',
        color: 'red',
      });
      return;
    }

    setSubmitting(true);
    try {
      await FinanceService.createExpense({
        amount_cents: Math.round(expenseForm.amount * 100),
        description: expenseForm.description,
        category: expenseForm.category || undefined,
      });
      notifications.show({
        title: 'Успешно',
        message: 'Расход зарегистрирован',
        color: 'green',
      });
      closeExpenseModal();
      setExpenseForm({ amount: 0, description: '', category: '' });
      fetchBalance();
      fetchTransactions();
      fetchAnalytics();
      fetchCategories();
    } catch (error) {
      console.error('Failed to create expense:', error);
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось создать запись',
        color: 'red',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjustmentSubmit = async () => {
    if (adjustmentForm.amount === 0 || !adjustmentForm.description.trim()) {
      notifications.show({
        title: 'Ошибка',
        message: 'Заполните все поля',
        color: 'red',
      });
      return;
    }

    setSubmitting(true);
    try {
      await FinanceService.createAdjustment({
        amount_cents: Math.round(adjustmentForm.amount * 100),
        description: adjustmentForm.description,
      });
      notifications.show({
        title: 'Успешно',
        message: 'Корректировка зарегистрирована',
        color: 'green',
      });
      closeAdjustmentModal();
      setAdjustmentForm({ amount: 0, description: '' });
      fetchBalance();
      fetchTransactions();
      fetchAnalytics();
    } catch (error) {
      console.error('Failed to create adjustment:', error);
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось создать запись',
        color: 'red',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.ceil(transactionsTotal / pageSize);

  return (
    <Box>
      <Group justify="space-between" mb="lg">
        <Title order={2}>Финансы</Title>
        <Group>
          <Button
            leftSection={<IconPlus size={16} />}
            color="blue"
            onClick={openDepositModal}
          >
            Внести
          </Button>
          <Button
            leftSection={<IconMinus size={16} />}
            color="red"
            onClick={openWithdrawalModal}
          >
            Изъять
          </Button>
          <Button
            leftSection={<IconReceipt size={16} />}
            color="grape"
            onClick={openExpenseModal}
          >
            Расход
          </Button>
          <Button
            leftSection={<IconReportMoney size={16} />}
            variant="outline"
            onClick={openAdjustmentModal}
          >
            Корректировка
          </Button>
          <ActionIcon
            variant="light"
            onClick={() => {
              fetchBalance();
              fetchTransactions();
              fetchAnalytics();
            }}
          >
            <IconRefresh size={18} />
          </ActionIcon>
        </Group>
      </Group>

      {/* Balance Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} mb="lg">
        <Card shadow="sm" p="lg" radius="md" withBorder pos="relative">
          <LoadingOverlay visible={balanceLoading} />
          <Group>
            <ThemeIcon size="lg" radius="md" color="teal">
              <IconWallet size={20} />
            </ThemeIcon>
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Текущий баланс
              </Text>
              <Text size="xl" fw={700} c={balance && balance.current_balance_cents >= 0 ? 'teal' : 'red'}>
                {balance ? formatMoney(balance.current_balance_cents) : '—'}
              </Text>
            </div>
          </Group>
        </Card>

        <Card shadow="sm" p="lg" radius="md" withBorder pos="relative">
          <LoadingOverlay visible={balanceLoading} />
          <Group>
            <ThemeIcon size="lg" radius="md" color="green">
              <IconArrowDown size={20} />
            </ThemeIcon>
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Всего приход
              </Text>
              <Text size="xl" fw={700} c="green">
                {balance ? formatMoney(balance.total_income_cents) : '—'}
              </Text>
            </div>
          </Group>
        </Card>

        <Card shadow="sm" p="lg" radius="md" withBorder pos="relative">
          <LoadingOverlay visible={balanceLoading} />
          <Group>
            <ThemeIcon size="lg" radius="md" color="red">
              <IconArrowUp size={20} />
            </ThemeIcon>
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Всего расход
              </Text>
              <Text size="xl" fw={700} c="red">
                {balance ? formatMoney(balance.total_expense_cents) : '—'}
              </Text>
            </div>
          </Group>
        </Card>

        <Card shadow="sm" p="lg" radius="md" withBorder pos="relative">
          <LoadingOverlay visible={balanceLoading} />
          <Group>
            <ThemeIcon size="lg" radius="md" color="blue">
              <IconHistory size={20} />
            </ThemeIcon>
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Сегодня
              </Text>
              <Text size="xl" fw={700} c={balance && (balance.today_income_cents - Math.abs(balance.today_expense_cents)) >= 0 ? 'blue' : 'red'}>
                {balance ? formatMoney(balance.today_income_cents - Math.abs(balance.today_expense_cents)) : '—'}
              </Text>
            </div>
          </Group>
        </Card>
      </SimpleGrid>

      {/* Analytics - Expense by Category */}
      {analytics && analytics.expense_by_category.length > 0 && (
        <Paper shadow="xs" p="md" mb="lg" withBorder>
          <Title order={5} mb="sm">Расходы по категориям</Title>
          <SimpleGrid cols={{ base: 2, sm: 3, md: 6 }}>
            {analytics.expense_by_category.map((cat) => (
              <Card key={cat.category} shadow="xs" p="sm" radius="md" withBorder>
                <Text size="xs" c="dimmed">{cat.category}</Text>
                <Text fw={600} c="grape">{formatMoney(Math.abs(cat.total_cents))}</Text>
                <Text size="xs" c="dimmed">{cat.count} операций</Text>
              </Card>
            ))}
          </SimpleGrid>
        </Paper>
      )}

      {/* Filters */}
      <Paper shadow="xs" p="md" mb="md" withBorder>
        <Group>
          <Select
            placeholder="Тип операции"
            data={[
              { value: '', label: 'Все типы' },
              ...TRANSACTION_TYPES.map(t => ({ value: t.value, label: t.label }))
            ]}
            value={transactionTypeFilter || ''}
            onChange={(value) => {
              setTransactionTypeFilter(value || null);
              setTransactionsPage(1);
            }}
            clearable
            w={180}
          />
          <DatePickerInput
            type="range"
            placeholder="Период"
            value={dateRange}
            onChange={(value) => {
              setDateRange(value);
              setTransactionsPage(1);
            }}
            clearable
            locale="ru"
            w={280}
          />
        </Group>
      </Paper>

      {/* Transactions Table */}
      <Paper shadow="xs" p="md" withBorder pos="relative">
        <LoadingOverlay visible={transactionsLoading} />
        <ScrollArea>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Дата</Table.Th>
                <Table.Th>Тип</Table.Th>
                <Table.Th>Сумма</Table.Th>
                <Table.Th>Описание</Table.Th>
                <Table.Th>Категория</Table.Th>
                <Table.Th>Заказ</Table.Th>
                <Table.Th>Совершил</Table.Th>
                <Table.Th>Баланс после</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {transactions.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={8}>
                    <Text ta="center" c="dimmed" py="xl">
                      Нет транзакций
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                transactions.map((tx) => {
                  const info = getTransactionInfo(tx.transaction_type);
                  const Icon = info.icon;
                  const isPositive = ['sale', 'deposit'].includes(tx.transaction_type) || 
                    (tx.transaction_type === 'adjustment' && tx.amount_cents > 0);
                  
                  return (
                    <Table.Tr key={tx.id}>
                      <Table.Td>
                        <Text size="sm">{formatDate(tx.created_at)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={info.color}
                          leftSection={<Icon size={12} />}
                          variant="light"
                        >
                          {info.label}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text 
                          fw={600} 
                          c={isPositive ? 'green' : 'red'}
                        >
                          {isPositive ? '+' : '-'}{formatMoney(Math.abs(tx.amount_cents))}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" lineClamp={2} maw={300}>
                          {tx.description}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        {tx.category ? (
                          <Badge variant="dot" color="gray">
                            {tx.category}
                          </Badge>
                        ) : (
                          <Text c="dimmed">—</Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        {tx.order_id ? (
                          <Badge variant="outline">#{tx.order_id}</Badge>
                        ) : (
                          <Text c="dimmed">—</Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">
                          {tx.admin_name || 'Система'}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={500}>
                          {formatMoney(tx.balance_after_cents)}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  );
                })
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>

        {totalPages > 1 && (
          <Flex justify="center" mt="md">
            <Pagination
              total={totalPages}
              value={transactionsPage}
              onChange={setTransactionsPage}
            />
          </Flex>
        )}
      </Paper>

      {/* Deposit Modal */}
      <Modal
        opened={depositModalOpened}
        onClose={closeDepositModal}
        title="Внесение средств"
        centered
      >
        <Stack>
          <NumberInput
            label="Сумма (₽)"
            placeholder="0.00"
            min={0.01}
            step={100}
            decimalScale={2}
            value={depositForm.amount}
            onChange={(val) => setDepositForm(f => ({ ...f, amount: Number(val) || 0 }))}
            required
          />
          <Textarea
            label="Описание"
            placeholder="Причина внесения..."
            value={depositForm.description}
            onChange={(e) => setDepositForm(f => ({ ...f, description: e.target.value }))}
            required
            minRows={3}
          />
          <Button
            fullWidth
            color="blue"
            onClick={handleDepositSubmit}
            loading={submitting}
          >
            Внести
          </Button>
        </Stack>
      </Modal>

      {/* Withdrawal Modal */}
      <Modal
        opened={withdrawalModalOpened}
        onClose={closeWithdrawalModal}
        title="Изъятие средств"
        centered
      >
        <Stack>
          <NumberInput
            label="Сумма (₽)"
            placeholder="0.00"
            min={0.01}
            step={100}
            decimalScale={2}
            value={withdrawalForm.amount}
            onChange={(val) => setWithdrawalForm(f => ({ ...f, amount: Number(val) || 0 }))}
            required
          />
          <Textarea
            label="Описание"
            placeholder="Причина изъятия..."
            value={withdrawalForm.description}
            onChange={(e) => setWithdrawalForm(f => ({ ...f, description: e.target.value }))}
            required
            minRows={3}
          />
          <Button
            fullWidth
            color="red"
            onClick={handleWithdrawalSubmit}
            loading={submitting}
          >
            Изъять
          </Button>
        </Stack>
      </Modal>

      {/* Expense Modal */}
      <Modal
        opened={expenseModalOpened}
        onClose={closeExpenseModal}
        title="Регистрация расхода"
        centered
      >
        <Stack>
          <NumberInput
            label="Сумма (₽)"
            placeholder="0.00"
            min={0.01}
            step={100}
            decimalScale={2}
            value={expenseForm.amount}
            onChange={(val) => setExpenseForm(f => ({ ...f, amount: Number(val) || 0 }))}
            required
          />
          <TextInput
            label="Категория"
            placeholder="Введите категорию расхода"
            value={expenseForm.category}
            onChange={(e) => setExpenseForm(f => ({ ...f, category: e.target.value }))}
          />
          <Textarea
            label="Описание"
            placeholder="На что потрачено..."
            value={expenseForm.description}
            onChange={(e) => setExpenseForm(f => ({ ...f, description: e.target.value }))}
            required
            minRows={3}
          />
          <Button
            fullWidth
            color="grape"
            onClick={handleExpenseSubmit}
            loading={submitting}
          >
            Зарегистрировать расход
          </Button>
        </Stack>
      </Modal>

      {/* Adjustment Modal */}
      <Modal
        opened={adjustmentModalOpened}
        onClose={closeAdjustmentModal}
        title="Корректировка баланса"
        centered
      >
        <Stack>
          <NumberInput
            label="Сумма (₽)"
            description="Положительное значение — увеличение, отрицательное — уменьшение"
            placeholder="0.00"
            step={100}
            decimalScale={2}
            value={adjustmentForm.amount}
            onChange={(val) => setAdjustmentForm(f => ({ ...f, amount: Number(val) || 0 }))}
            required
          />
          <Textarea
            label="Описание"
            placeholder="Причина корректировки..."
            value={adjustmentForm.description}
            onChange={(e) => setAdjustmentForm(f => ({ ...f, description: e.target.value }))}
            required
            minRows={3}
          />
          <Button
            fullWidth
            onClick={handleAdjustmentSubmit}
            loading={submitting}
          >
            Применить корректировку
          </Button>
        </Stack>
      </Modal>
    </Box>
  );
}
