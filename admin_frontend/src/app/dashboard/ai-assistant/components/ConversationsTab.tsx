'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Paper, Text, Group, Stack, Badge, TextInput, Select, Button,
  LoadingOverlay, ScrollArea, ActionIcon, Tooltip, Box, Grid,
  Textarea, Divider,
} from '@mantine/core';
import { IconSearch, IconRefresh, IconRobot, IconUserCheck, IconX, IconSend, IconMessageCircle, IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import {
  getConversations, getConversation,
  switchToManager, switchToAI, closeConversation, sendManagerMessage,
  deleteConversation as apiDeleteConversation,
} from '@/lib/ai-api';

interface Message {
  id: number;
  role: string;
  content: string;
  tokens_used?: number;
  response_time_ms?: number;
  was_filtered: boolean;
  created_at: string;
}

interface Conversation {
  id: number;
  user_id?: number;
  user_email?: string;
  user_username?: string;
  session_id?: string;
  status: string;
  title?: string;
  message_count: number;
  last_message?: string;
  created_at: string;
  updated_at: string;
}

interface ConversationDetail {
  id: number;
  user_id?: number;
  user_email?: string;
  user_username?: string;
  status: string;
  title?: string;
  messages: Message[];
  manager_id?: number;
  total_tokens_used: number;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  active: { label: 'AI активен', color: 'teal' },
  manager_requested: { label: 'Запрос менеджера', color: 'orange' },
  manager_connected: { label: 'Менеджер', color: 'blue' },
  closed: { label: 'Закрыт', color: 'gray' },
};

export function ConversationsTab() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedConv, setSelectedConv] = useState<ConversationDetail | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [managerMsg, setManagerMsg] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterStatus) params.status = filterStatus;
      if (search) params.search = search;
      const data = await getConversations(params);
      setConversations(data.items || []);
      setTotal(data.total || 0);
    } catch {
      notifications.show({ title: 'Ошибка', message: 'Не удалось загрузить переписки', color: 'red' });
    } finally {
      setLoading(false);
    }
  }, [filterStatus, search]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Polling for selected conversation
  const selectedConvId = selectedConv?.id ?? null;
  useEffect(() => {
    if (selectedConvId === null) return;
    const interval = setInterval(async () => {
      try {
        const data = await getConversation(selectedConvId);
        setSelectedConv(data);
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedConvId]);

  const selectConversation = async (id: number) => {
    setSelectedLoading(true);
    try {
      const data = await getConversation(id);
      setSelectedConv(data);
    } catch {
      notifications.show({ title: 'Ошибка', message: 'Не удалось загрузить переписку', color: 'red' });
    } finally {
      setSelectedLoading(false);
    }
  };

  const handleSwitchToManager = async () => {
    if (!selectedConv) return;
    try {
      await switchToManager(selectedConv.id);
      const data = await getConversation(selectedConv.id);
      setSelectedConv(data);
      loadConversations();
      notifications.show({ title: 'Готово', message: 'Переведено в режим менеджера', color: 'blue' });
    } catch {
      notifications.show({ title: 'Ошибка', message: 'Не удалось переключить режим', color: 'red' });
    }
  };

  const handleSwitchToAI = async () => {
    if (!selectedConv) return;
    try {
      await switchToAI(selectedConv.id);
      const data = await getConversation(selectedConv.id);
      setSelectedConv(data);
      loadConversations();
      notifications.show({ title: 'Готово', message: 'Переведено в режим AI', color: 'teal' });
    } catch {
      notifications.show({ title: 'Ошибка', message: 'Не удалось переключить режим', color: 'red' });
    }
  };

  const handleClose = async () => {
    if (!selectedConv) return;
    try {
      await closeConversation(selectedConv.id);
      const data = await getConversation(selectedConv.id);
      setSelectedConv(data);
      loadConversations();
      notifications.show({ title: 'Готово', message: 'Переписка закрыта', color: 'gray' });
    } catch {
      notifications.show({ title: 'Ошибка', message: 'Не удалось закрыть', color: 'red' });
    }
  };

  const handleSendManagerMsg = async () => {
    if (!selectedConv || !managerMsg.trim()) return;
    setSendingMsg(true);
    try {
      await sendManagerMessage(selectedConv.id, managerMsg.trim());
      setManagerMsg('');
      const data = await getConversation(selectedConv.id);
      setSelectedConv(data);
    } catch {
      notifications.show({ title: 'Ошибка', message: 'Не удалось отправить', color: 'red' });
    } finally {
      setSendingMsg(false);
    }
  };

  const handleDelete = async (convId: number) => {
    if (!confirm('Удалить эту переписку? Действие необратимо.')) return;
    try {
      await apiDeleteConversation(convId);
      if (selectedConv?.id === convId) {
        setSelectedConv(null);
      }
      loadConversations();
      notifications.show({ title: 'Удалено', message: 'Переписка удалена', color: 'gray' });
    } catch {
      notifications.show({ title: 'Ошибка', message: 'Не удалось удалить', color: 'red' });
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <Grid gutter="sm">
      {/* Conversations list */}
      <Grid.Col span={{ base: 12, md: 5 }}>
        <Paper withBorder p="sm" radius="md">
          <Group mb="sm" justify="space-between">
            <Text fw={600} size="sm">Переписки ({total})</Text>
            <ActionIcon variant="subtle" onClick={loadConversations}><IconRefresh size={16} /></ActionIcon>
          </Group>
          
          <Group mb="sm" gap="xs">
            <TextInput
              placeholder="Поиск..."
              size="xs"
              leftSection={<IconSearch size={14} />}
              value={search}
              onChange={(e) => { setSearch(e.currentTarget.value); }}
              style={{ flex: 1 }}
            />
            <Select
              placeholder="Статус"
              size="xs"
              clearable
              value={filterStatus}
              onChange={setFilterStatus}
              data={[
                { value: 'active', label: 'AI активен' },
                { value: 'manager_requested', label: 'Запрос менеджера' },
                { value: 'manager_connected', label: 'Менеджер' },
                { value: 'closed', label: 'Закрыт' },
              ]}
              w={160}
            />
          </Group>

          <Box pos="relative" mih={200}>
            <LoadingOverlay visible={loading} />
            <ScrollArea h={500}>
              <Stack gap={6}>
                {conversations.map((conv) => {
                  const s = STATUS_MAP[conv.status] || { label: conv.status, color: 'gray' };
                  const isSelected = selectedConv?.id === conv.id;
                  return (
                    <Paper
                      key={conv.id}
                      withBorder
                      p="xs"
                      radius="sm"
                      style={{
                        cursor: 'pointer',
                        background: isSelected ? 'var(--mantine-color-teal-light)' : undefined,
                        borderColor: isSelected ? 'var(--mantine-color-teal-4)' : undefined,
                      }}
                      onClick={() => selectConversation(conv.id)}
                    >
                      <Group justify="space-between" mb={4}>
                        <Group gap={6}>
                          <Text size="xs" fw={600}>#{conv.id}</Text>
                          <Badge size="xs" color={s.color} variant="light">{s.label}</Badge>
                        </Group>
                        <Text size="xs" c="dimmed">{formatDate(conv.updated_at)}</Text>
                      </Group>
                      <Text size="xs" fw={500} lineClamp={1}>
                        {conv.title || 'Без названия'}
                      </Text>
                      <Group gap={6} mt={4}>
                        <Text size="xs" c="dimmed">
                          {conv.user_username || conv.user_email || (conv.session_id ? `Гость (${conv.session_id.slice(0, 10)})` : 'Гость')}
                        </Text>
                        <Text size="xs" c="dimmed">• {conv.message_count} сообщ.</Text>
                      </Group>
                      {conv.last_message && (
                        <Text size="xs" c="dimmed" lineClamp={1} mt={2}>
                          {conv.last_message}
                        </Text>
                      )}
                    </Paper>
                  );
                })}
                {conversations.length === 0 && !loading && (
                  <Text c="dimmed" ta="center" py="xl" size="sm">Нет переписок</Text>
                )}
              </Stack>
            </ScrollArea>
          </Box>
        </Paper>
      </Grid.Col>

      {/* Conversation detail */}
      <Grid.Col span={{ base: 12, md: 7 }}>
        <Paper withBorder p="sm" radius="md" pos="relative" mih={600}>
          <LoadingOverlay visible={selectedLoading} />
          {selectedConv ? (
            <>
              {/* Header */}
              <Group justify="space-between" mb="sm">
                <div>
                  <Group gap={6}>
                    <Text fw={600} size="sm">#{selectedConv.id}</Text>
                    <Badge size="xs" color={STATUS_MAP[selectedConv.status]?.color || 'gray'}>
                      {STATUS_MAP[selectedConv.status]?.label || selectedConv.status}
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed">
                    {selectedConv.user_username || selectedConv.user_email || 'Анонимный пользователь'}
                    {selectedConv.total_tokens_used > 0 && ` • ${selectedConv.total_tokens_used} токенов`}
                  </Text>
                </div>
                <Group gap={6}>
                  {selectedConv.status !== 'manager_connected' ? (
                    <Tooltip label="Переключить на менеджера">
                      <Button size="xs" variant="light" color="blue" leftSection={<IconUserCheck size={14} />}
                        onClick={handleSwitchToManager}>
                        Менеджер
                      </Button>
                    </Tooltip>
                  ) : (
                    <Tooltip label="Вернуть AI">
                      <Button size="xs" variant="light" color="teal" leftSection={<IconRobot size={14} />}
                        onClick={handleSwitchToAI}>
                        AI режим
                      </Button>
                    </Tooltip>
                  )}
                  {selectedConv.status !== 'closed' && (
                    <Tooltip label="Закрыть переписку">
                      <ActionIcon variant="light" color="red" size="sm" onClick={handleClose}>
                        <IconX size={14} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                  <Tooltip label="Удалить переписку">
                    <ActionIcon variant="light" color="red" size="sm" onClick={() => handleDelete(selectedConv.id)}>
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>

              <Divider mb="sm" />

              {/* Messages */}
              <ScrollArea h={400} mb="sm">
                <Stack gap={8} p="xs">
                  {selectedConv.messages.map((msg) => (
                    <div key={msg.id} style={{
                      display: 'flex',
                      justifyContent: msg.role === 'user' ? 'flex-end' :
                        msg.role === 'system' ? 'center' : 'flex-start',
                    }}>
                      {msg.role === 'system' ? (
                        <Badge variant="light" color="gray" size="sm">{msg.content}</Badge>
                      ) : (
                        <Paper
                          withBorder
                          p="xs"
                          radius="sm"
                          maw="75%"
                          style={{
                            background: msg.role === 'user' ? 'var(--mantine-color-teal-light)' :
                              msg.role === 'manager' ? 'var(--mantine-color-blue-light)' :
                              undefined,
                          }}
                        >
                          <Group gap={4} mb={2}>
                            <Badge size="xs" variant="dot" color={
                              msg.role === 'user' ? 'teal' :
                              msg.role === 'manager' ? 'blue' : 'orange'
                            }>
                              {msg.role === 'user' ? 'Пользователь' :
                               msg.role === 'manager' ? 'Менеджер' : 'AI'}
                            </Badge>
                            <Text size="xs" c="dimmed">{formatDate(msg.created_at)}</Text>
                            {msg.was_filtered && <Badge size="xs" color="red">Фильтр</Badge>}
                          </Group>
                          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</Text>
                          {(msg.tokens_used || msg.response_time_ms) && (
                            <Text size="xs" c="dimmed" mt={2}>
                              {msg.tokens_used && `${msg.tokens_used} ток.`}
                              {msg.response_time_ms && ` • ${msg.response_time_ms}мс`}
                            </Text>
                          )}
                        </Paper>
                      )}
                    </div>
                  ))}
                </Stack>
              </ScrollArea>

              {/* Manager input */}
              {(selectedConv.status === 'manager_connected' || selectedConv.status === 'manager_requested') && (
                <Group gap="xs">
                  <Textarea
                    placeholder="Ответ от менеджера..."
                    size="xs"
                    value={managerMsg}
                    onChange={(e) => { setManagerMsg(e.currentTarget.value); }}
                    style={{ flex: 1 }}
                    autosize
                    minRows={1}
                    maxRows={4}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendManagerMsg();
                      }
                    }}
                  />
                  <ActionIcon
                    color="blue"
                    variant="filled"
                    size="lg"
                    onClick={handleSendManagerMsg}
                    loading={sendingMsg}
                    disabled={!managerMsg.trim()}
                  >
                    <IconSend size={16} />
                  </ActionIcon>
                </Group>
              )}
            </>
          ) : (
            <Stack align="center" justify="center" h={500}>
              <IconMessageCircle size={48} color="var(--mantine-color-dimmed)" opacity={0.3} />
              <Text c="dimmed" size="sm">Выберите переписку из списка</Text>
            </Stack>
          )}
        </Paper>
      </Grid.Col>
    </Grid>
  );
}
