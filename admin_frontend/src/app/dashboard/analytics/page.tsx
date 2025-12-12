'use client';

import { useEffect, useState } from 'react';
import {
  Paper, Title, Group, Text, SimpleGrid, Card, Stack, Badge,
  LoadingOverlay, Select, Table, ScrollArea, Progress
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { AreaChart, BarChart, DonutChart } from '@mantine/charts';
import { 
  IconChartBar, IconTrendingUp, IconShoppingCart, IconUsers, 
  IconPackage, IconCoin, IconWallet, IconArrowDownRight, IconArrowUpRight
} from '@tabler/icons-react';
import { DashboardService } from '@/lib/api';
import { FinanceService, FinanceBalance } from '@/lib/api/services/FinanceService';
import { notifications } from '@mantine/notifications';

interface SalesData {
  period: string;
  revenue: number;
  orders_count: number;
}

interface ProductStats {
  product_id: number;
  name: string;
  quantity: number;
  revenue_cents: number;
}

interface CategoryStats {
  category_id: number;
  name: string;
  quantity: number;
  revenue_cents: number;
}

interface FunnelStep {
  stage: string;
  count: number;
  rate: number;
}

interface FunnelData {
  funnel: FunnelStep[];
  cancelled: { count: number; rate: number };
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('30');
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);

  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [topProducts, setTopProducts] = useState<ProductStats[]>([]);
  const [topCategories, setTopCategories] = useState<CategoryStats[]>([]);
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const [financeBalance, setFinanceBalance] = useState<FinanceBalance | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Calculate date range based on period
      const days = parseInt(period);
      const to = dateTo || new Date();
      const from = dateFrom || new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const fromStr = from.toISOString();
      const toStr = to.toISOString();

      const [sales, products, categories, funnel, users, finance] = await Promise.all([
        DashboardService.getSalesAnalyticsApiV1DashboardAnalyticsSalesGet(fromStr, toStr, 'day'),
        DashboardService.getTopProductsApiV1DashboardAnalyticsProductsGet(fromStr, toStr, 10, 'quantity'),
        DashboardService.getTopCategoriesApiV1DashboardAnalyticsCategoriesGet(fromStr, toStr, 10),
        DashboardService.getConversionFunnelApiV1DashboardAnalyticsFunnelGet(fromStr, toStr),
        DashboardService.getUsersAnalyticsApiV1DashboardAnalyticsUsersGet(fromStr, toStr),
        FinanceService.getBalance(),
      ]);

      // Parse sales data from API response
      setSalesData(sales.chart || []);
      setTopProducts(products || []);
      setTopCategories(categories || []);
      setFunnelData(funnel);
      setUserStats(users?.totals || {});
      setFinanceBalance(finance);
    } catch (error) {
      notifications.show({ title: 'Ошибка', message: 'Не удалось загрузить аналитику', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period, dateFrom, dateTo]);

  const formatMoney = (cents: number) => `${((cents || 0) / 100).toLocaleString('ru-RU')} ₽`;

  const totalSales = salesData.reduce((sum, d) => sum + (d.revenue || 0), 0);
  const totalOrders = salesData.reduce((sum, d) => sum + (d.orders_count || 0), 0);
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

  const chartData = salesData.map(d => ({
    date: d.period ? new Date(d.period).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) : '',
    sales: (d.revenue || 0) / 100,
    orders: d.orders_count || 0,
  }));

  const categoryChartData = topCategories.map((c, idx) => ({
    name: c.name || 'Без категории',
    value: (c.revenue_cents || 0) / 100,
    color: `teal.${Math.min(9, 3 + idx)}`,
  }));

  const funnelSteps = funnelData?.funnel ? funnelData.funnel.map(step => ({
    label: step.stage === 'created' ? 'Создано заказов' :
           step.stage === 'paid' ? 'Оплачено' :
           step.stage === 'shipped' ? 'Отправлено' :
           step.stage === 'delivered' ? 'Доставлено' : step.stage,
    value: step.count || 0,
    rate: step.rate || 0,
    color: step.stage === 'created' ? 'blue' :
           step.stage === 'paid' ? 'cyan' :
           step.stage === 'shipped' ? 'teal' :
           step.stage === 'delivered' ? 'green' : 'gray',
  })) : [];

  return (
    <Stack gap="md" pos="relative">
      <LoadingOverlay visible={loading} />

      {/* Header */}
      <Paper withBorder p="md" radius="md">
        <Group justify="space-between">
          <Group gap="sm">
            <IconChartBar size={24} style={{ color: 'var(--mantine-color-violet-6)' }} />
            <Title order={4}>Аналитика</Title>
          </Group>
          <Group>
            <Select
              value={period}
              onChange={(v) => setPeriod(v || '30')}
              data={[
                { value: '7', label: '7 дней' },
                { value: '14', label: '14 дней' },
                { value: '30', label: '30 дней' },
                { value: '90', label: '90 дней' },
              ]}
              w={120}
            />
            <DatePickerInput
              placeholder="С"
              value={dateFrom}
              onChange={setDateFrom}
              clearable
              w={140}
            />
            <DatePickerInput
              placeholder="По"
              value={dateTo}
              onChange={setDateTo}
              clearable
              w={140}
            />
          </Group>
        </Group>
      </Paper>

      {/* Summary Cards */}
      <SimpleGrid cols={{ base: 2, sm: 4 }}>
        <Card withBorder p="md">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase">Продажи</Text>
              <Text size="xl" fw={700}>{formatMoney(totalSales)}</Text>
            </div>
            <IconCoin size={32} style={{ color: 'var(--mantine-color-teal-6)', opacity: 0.5 }} />
          </Group>
        </Card>
        <Card withBorder p="md">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase">Заказов</Text>
              <Text size="xl" fw={700}>{totalOrders}</Text>
            </div>
            <IconShoppingCart size={32} style={{ color: 'var(--mantine-color-blue-6)', opacity: 0.5 }} />
          </Group>
        </Card>
        <Card withBorder p="md">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase">Средний чек</Text>
              <Text size="xl" fw={700}>{formatMoney(avgOrderValue)}</Text>
            </div>
            <IconTrendingUp size={32} style={{ color: 'var(--mantine-color-orange-6)', opacity: 0.5 }} />
          </Group>
        </Card>
        <Card withBorder p="md">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase">Новых клиентов</Text>
              <Text size="xl" fw={700}>{userStats?.new_users || 0}</Text>
            </div>
            <IconUsers size={32} style={{ color: 'var(--mantine-color-violet-6)', opacity: 0.5 }} />
          </Group>
        </Card>
      </SimpleGrid>

      {/* Finance Cards */}
      <SimpleGrid cols={{ base: 2, sm: 3 }}>
        <Card withBorder p="md" bg="teal.0">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase">Баланс</Text>
              <Text size="xl" fw={700} c="teal.7">
                {formatMoney(financeBalance?.current_balance_cents || 0)}
              </Text>
              <Text size="xs" c="dimmed">
                За месяц: +{formatMoney(financeBalance?.month_income_cents || 0)}
              </Text>
            </div>
            <IconWallet size={32} style={{ color: 'var(--mantine-color-teal-6)', opacity: 0.7 }} />
          </Group>
        </Card>
        <Card withBorder p="md" bg="green.0">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase">Доходы</Text>
              <Text size="xl" fw={700} c="green.7">
                +{formatMoney(financeBalance?.total_income_cents || 0)}
              </Text>
              <Text size="xs" c="dimmed">
                Сегодня: +{formatMoney(financeBalance?.today_income_cents || 0)}
              </Text>
            </div>
            <IconArrowUpRight size={32} style={{ color: 'var(--mantine-color-green-6)', opacity: 0.7 }} />
          </Group>
        </Card>
        <Card withBorder p="md" bg="red.0">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase">Расходы</Text>
              <Text size="xl" fw={700} c="red.7">
                -{formatMoney(financeBalance?.total_expense_cents || 0)}
              </Text>
              <Text size="xs" c="dimmed">
                За месяц: -{formatMoney(financeBalance?.month_expense_cents || 0)}
              </Text>
            </div>
            <IconArrowDownRight size={32} style={{ color: 'var(--mantine-color-red-6)', opacity: 0.7 }} />
          </Group>
        </Card>
      </SimpleGrid>

      {/* Sales Chart */}
      <Paper withBorder p="md" radius="md">
        <Title order={5} mb="md">Динамика продаж</Title>
        {chartData.length > 0 ? (
          <AreaChart
            h={300}
            data={chartData}
            dataKey="date"
            series={[
              { name: 'sales', label: 'Продажи (₽)', color: 'teal.6' },
            ]}
            curveType="linear"
          />
        ) : (
          <Text c="dimmed" ta="center" py="xl">Нет данных за выбранный период</Text>
        )}
      </Paper>

      {/* Top Products & Categories */}
      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <Paper withBorder p="md" radius="md">
          <Title order={5} mb="md">Топ товаров</Title>
          <ScrollArea h={300}>
            <Table striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Товар</Table.Th>
                  <Table.Th ta="right">Продано</Table.Th>
                  <Table.Th ta="right">Выручка</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {topProducts.map((p, i) => (
                  <Table.Tr key={p.product_id}>
                    <Table.Td>
                      <Group gap="xs">
                        <Badge size="xs" variant="light">{i + 1}</Badge>
                        <Text size="sm" lineClamp={1}>{p.name}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text size="sm">{p.quantity || 0}</Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text size="sm" fw={500}>{formatMoney(p.revenue_cents)}</Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Title order={5} mb="md">Продажи по категориям</Title>
          {categoryChartData.length > 0 ? (
            <DonutChart
              h={300}
              data={categoryChartData}
              withLabelsLine
              withLabels
              tooltipDataSource="segment"
              mx="auto"
            />
          ) : (
            <Text c="dimmed" ta="center" py="xl">Нет данных</Text>
          )}
        </Paper>
      </SimpleGrid>

      {/* Conversion Funnel */}
      <Paper withBorder p="md" radius="md">
        <Title order={5} mb="md">Воронка конверсии</Title>
        {funnelSteps.length > 0 ? (
          <Stack gap="sm">
            {funnelSteps.map((step, i) => {
              return (
                <div key={step.label}>
                  <Group justify="space-between" mb={4}>
                    <Text size="sm">{step.label}</Text>
                    <Group gap="xs">
                      <Text size="sm" fw={500}>{(step.value || 0).toLocaleString()}</Text>
                      <Badge size="xs" color={step.rate > 50 ? 'green' : 'orange'}>
                        {step.rate}%
                      </Badge>
                    </Group>
                  </Group>
                  <Progress 
                    value={step.rate} 
                    color={step.color}
                    size="lg"
                    radius="sm"
                  />
                </div>
              );
            })}
            {funnelData?.cancelled && (
              <div>
                <Group justify="space-between" mb={4}>
                  <Text size="sm" c="red">Отменено</Text>
                  <Group gap="xs">
                    <Text size="sm" fw={500}>{(funnelData.cancelled.count || 0).toLocaleString()}</Text>
                    <Badge size="xs" color="red">
                      {funnelData.cancelled.rate}%
                    </Badge>
                  </Group>
                </Group>
              </div>
            )}
          </Stack>
        ) : (
          <Text c="dimmed" ta="center" py="xl">Нет данных</Text>
        )}
      </Paper>
    </Stack>
  );
}
