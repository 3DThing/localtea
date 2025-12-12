'use client';

import { useEffect, useState } from 'react';
import { Grid, Paper, Text, Group, Title, SimpleGrid, Stack, Badge, LoadingOverlay, ScrollArea, Box } from '@mantine/core';
import { IconReceipt2, IconCoin, IconUserPlus, IconActivity } from '@tabler/icons-react';
import { AreaChart } from '@mantine/charts';
import { DashboardService, DashboardStats } from '@/lib/api';
import { notifications } from '@mantine/notifications';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await DashboardService.getDashboardStatsApiV1DashboardStatsGet();
        setStats(data);
      } catch (error) {
        notifications.show({ title: 'Ошибка', message: 'Не удалось загрузить статистику', color: 'red' });
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const formatPrice = (cents: number) => {
    return `${(cents / 100).toLocaleString('ru-RU')} ₽`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('ru-RU', { 
      day: '2-digit', 
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const statCards = [
    { 
      title: 'Заказы сегодня', 
      value: stats?.orders?.today ?? 0, 
      week: stats?.orders?.week ?? 0,
      icon: IconReceipt2, 
      color: 'teal' 
    },
    { 
      title: 'Продажи сегодня', 
      value: formatPrice(stats?.sales?.today ?? 0), 
      week: formatPrice(stats?.sales?.week ?? 0),
      icon: IconCoin, 
      color: 'blue' 
    },
    { 
      title: 'Новые пользователи', 
      value: stats?.users?.today ?? 0, 
      week: stats?.users?.week ?? 0,
      icon: IconUserPlus, 
      color: 'orange' 
    },
    { 
      title: 'Действия за неделю', 
      value: stats?.logs?.length ?? 0, 
      week: null,
      icon: IconActivity, 
      color: 'violet' 
    },
  ];

  const chartData = stats?.sales_chart?.map(item => ({
    date: new Date(item.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
    sales: item.amount / 100,
  })) || [];

  return (
    <Box pos="relative">
      <LoadingOverlay visible={loading} />
      <Title order={3} mb="sm">Обзор</Title>
      
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="sm" mb="sm">
        {statCards.map((stat) => (
          <Paper withBorder p="sm" radius="md" key={stat.title}>
            <Group justify="space-between">
              <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                {stat.title}
              </Text>
              <stat.icon size={18} stroke={1.5} color={`var(--mantine-color-${stat.color}-6)`} />
            </Group>

            <Group align="flex-end" gap="xs" mt="md">
              <Text fw={700} size="lg">{stat.value}</Text>
            </Group>

            {stat.week !== null && (
              <Text fz="xs" c="dimmed" mt={4}>
                За неделю: {stat.week}
              </Text>
            )}
          </Paper>
        ))}
      </SimpleGrid>

      <Grid gutter="sm">
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper withBorder p="sm" radius="md">
            <Text size="sm" fw={500} mb="sm">Продажи за 30 дней</Text>
            {chartData.length > 0 ? (
              <AreaChart
                h={240}
                data={chartData}
                dataKey="date"
                series={[
                  { name: 'sales', label: 'Продажи (₽)', color: 'teal.6' },
                ]}
                curveType="linear"
              />
            ) : (
              <Text c="dimmed" ta="center" py="xl" size="sm">Нет данных для отображения</Text>
            )}
          </Paper>
        </Grid.Col>
        
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Paper withBorder p="sm" radius="md" h="100%">
            <Text size="sm" fw={500} mb="sm">Последние действия</Text>
            <ScrollArea h={200}>
              {stats?.logs && stats.logs.length > 0 ? (
                <Stack gap={6}>
                  {stats.logs.map((log: any) => (
                    <Paper key={log.id} withBorder p="xs" radius="sm">
                      <Group justify="space-between" mb={2}>
                        <Badge size="xs" color={
                          log.action === 'create' ? 'green' :
                          log.action === 'update' ? 'blue' :
                          log.action === 'delete' ? 'red' : 'gray'
                        }>
                          {log.action}
                        </Badge>
                        <Text size="xs" c="dimmed">{formatDate(log.created_at)}</Text>
                      </Group>
                      <Text size="xs" lineClamp={1}>
                        {typeof log.details === 'object' && log.details?.message 
                          ? log.details.message 
                          : (typeof log.details === 'string' ? log.details : `${log.details?.entity_type || 'action'} #${log.entity_id}`)}
                      </Text>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Text c="dimmed" size="xs" ta="center">Нет действий</Text>
              )}
            </ScrollArea>
          </Paper>
        </Grid.Col>
      </Grid>
    </Box>
  );
}
