'use client';

import { useEffect, useState } from 'react';
import {
  Paper, Text, Group, Stack, Box, LoadingOverlay, SimpleGrid,
  RingProgress, Center,
} from '@mantine/core';
import {
  IconMessages, IconMessageForward, IconUsers, IconClock,
  IconCoins, IconCalendarEvent, IconShieldCheck, IconArchive,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { getAssistantStats } from '@/lib/ai-api';

interface Stats {
  total_conversations: number;
  active_conversations: number;
  closed_conversations: number;
  total_messages: number;
  filtered_messages: number;
  avg_response_time_ms: number;
  total_tokens_used: number;
  conversations_today: number;
  messages_today: number;
  escalations_today: number;
  unique_users: number;
  manager_escalations: number;
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ComponentType<{ size?: number | string }>; label: string; value: string | number; color: string;
}) {
  return (
    <Paper withBorder p="md" radius="md">
      <Group>
        <Icon size={28} color={`var(--mantine-color-${color}-6)`} />
        <div>
          <Text c="dimmed" size="xs" tt="uppercase" fw={700}>{label}</Text>
          <Text fw={700} size="xl">{value}</Text>
        </div>
      </Group>
    </Paper>
  );
}

export function StatsTab() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await getAssistantStats();
      setStats(data);
    } catch {
      notifications.show({ title: 'Ошибка', message: 'Не удалось загрузить статистику', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStats(); }, []);

  const fmtTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)} мс`;
    return `${(ms / 1000).toFixed(1)} сек`;
  };

  const fmtTokens = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  };

  if (!stats && !loading) return <Text c="dimmed" ta="center" py="xl">Нет данных</Text>;

  const total = stats?.total_conversations || 0;
  const active = stats?.active_conversations || 0;
  const escalated = stats?.manager_escalations || 0;
  const pctActive = total > 0 ? Math.round((active / total) * 100) : 0;
  const pctEscalated = total > 0 ? Math.round((escalated / total) * 100) : 0;

  return (
    <Box pos="relative" mih={300}>
      <LoadingOverlay visible={loading} />

      <Text fw={600} mb="md">Статистика AI-ассистента</Text>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} mb="xl">
        <StatCard icon={IconMessages} label="Всего диалогов" value={stats?.total_conversations ?? '—'} color="blue" />
        <StatCard icon={IconMessageForward} label="Активные диалоги" value={stats?.active_conversations ?? '—'} color="teal" />
        <StatCard icon={IconArchive} label="Закрытые диалоги" value={stats?.closed_conversations ?? '—'} color="gray" />
        <StatCard icon={IconMessages} label="Всего сообщений" value={stats?.total_messages ?? '—'} color="indigo" />
        <StatCard icon={IconShieldCheck} label="Отфильтровано сообщ." value={stats?.filtered_messages ?? '—'} color="pink" />
        <StatCard icon={IconClock} label="Ср. время ответа" value={stats ? fmtTime(stats.avg_response_time_ms) : '—'} color="orange" />
        <StatCard icon={IconCoins} label="Токены использовано" value={stats ? fmtTokens(stats.total_tokens_used) : '—'} color="yellow" />
        <StatCard icon={IconUsers} label="Уникальных пользователей" value={stats?.unique_users ?? '—'} color="grape" />
        <StatCard icon={IconUsers} label="Всего эскалаций" value={stats?.manager_escalations ?? '—'} color="red" />
      </SimpleGrid>

      <Text fw={600} mb="sm">Сегодня</Text>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} mb="xl">
        <StatCard icon={IconCalendarEvent} label="Диалогов сегодня" value={stats?.conversations_today ?? '—'} color="cyan" />
        <StatCard icon={IconCalendarEvent} label="Сообщений сегодня" value={stats?.messages_today ?? '—'} color="cyan" />
        <StatCard icon={IconUsers} label="Эскалаций сегодня" value={stats?.escalations_today ?? '—'} color="red" />
      </SimpleGrid>

      <Text fw={600} mb="sm">Обзор</Text>
      <Group gap="xl">
        <Stack align="center" gap={4}>
          <RingProgress
            size={120}
            thickness={12}
            sections={[{ value: pctActive, color: 'teal' }]}
            label={<Center><Text fw={700} size="lg">{pctActive}%</Text></Center>}
          />
          <Text size="xs" c="dimmed">Активных</Text>
        </Stack>
        <Stack align="center" gap={4}>
          <RingProgress
            size={120}
            thickness={12}
            sections={[{ value: pctEscalated, color: 'red' }]}
            label={<Center><Text fw={700} size="lg">{pctEscalated}%</Text></Center>}
          />
          <Text size="xs" c="dimmed">Эскалации</Text>
        </Stack>
      </Group>
    </Box>
  );
}
