'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Paper, Text, Group, Stack, Switch, TextInput, Button, LoadingOverlay, Textarea, Box,
  Table, Badge, Modal, Select, Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  getSettings, updateSetting, testTelegram,
  getTelegramLinks, createTelegramLink, updateTelegramLink, deleteTelegramLink,
  testTelegramLink, getTelegramAdmins,
} from '@/lib/ai-api';

/** Safely extract a string error message from an Axios error. */
const apiErr = (err: unknown, fallback = 'Ошибка') => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const axErr = err as Record<string, any>;
  const detail = axErr?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    return typeof first?.msg === 'string' ? first.msg : fallback;
  }
  return fallback;
};

interface Setting {
  id: number;
  key: string;
  value: string;
  value_type: string;
  group: string;
  description: string;
}

interface TgLink {
  id: number;
  admin_user_id: number;
  admin_username: string | null;
  admin_email: string | null;
  telegram_chat_id: string;
  telegram_username: string | null;
  notify_new_conversation: boolean;
  notify_manager_request: boolean;
  notify_new_message: boolean;
  is_active: boolean;
  created_at: string;
}

interface AdminUser {
  id: number;
  username: string;
  email: string;
}

export function SettingsTab() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await getSettings('general');
      setSettings(data);
      const vals: Record<string, string> = {};
      data.forEach((s: Setting) => { vals[s.key] = s.value || ''; });
      setEditValues(vals);
    } catch {
      notifications.show({ title: 'Ошибка', message: 'Не удалось загрузить настройки', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSettings(); }, []);

  const handleSave = async (key: string) => {
    setSaving(key);
    try {
      await updateSetting(key, editValues[key]);
      notifications.show({ title: 'Сохранено', message: `${key} обновлён`, color: 'teal' });
    } catch {
      notifications.show({ title: 'Ошибка', message: 'Не удалось сохранить', color: 'red' });
    } finally {
      setSaving(null);
    }
  };

  // Also show the system prompt from "system_prompt" group
  const [promptSettings, setPromptSettings] = useState<Setting[]>([]);

  useEffect(() => {
    getSettings('system_prompt').then(data => {
      setPromptSettings(data);
      data.forEach((s: Setting) => {
        setEditValues(prev => ({ ...prev, [s.key]: s.value || '' }));
      });
    }).catch(() => {});
  }, []);

  // Manager keywords
  const [managerSettings, setManagerSettings] = useState<Setting[]>([]);

  useEffect(() => {
    getSettings('manager').then(data => {
      setManagerSettings(data);
      data.forEach((s: Setting) => {
        setEditValues(prev => ({ ...prev, [s.key]: s.value || '' }));
      });
    }).catch(() => {});
  }, []);

  // Rate limit settings
  const [rateLimitSettings, setRateLimitSettings] = useState<Setting[]>([]);

  useEffect(() => {
    getSettings('rate_limit').then(data => {
      setRateLimitSettings(data);
      data.forEach((s: Setting) => {
        setEditValues(prev => ({ ...prev, [s.key]: s.value || '' }));
      });
    }).catch(() => {});
  }, []);

  // Telegram settings (global: enabled, bot_token)
  const [telegramSettings, setTelegramSettings] = useState<Setting[]>([]);
  const [, setTestingTg] = useState(false);

  // Telegram links (per-admin)
  const [tgLinks, setTgLinks] = useState<TgLink[]>([]);
  const [tgAdmins, setTgAdmins] = useState<AdminUser[]>([]);
  const [addLinkOpen, setAddLinkOpen] = useState(false);
  const [newLink, setNewLink] = useState({ admin_user_id: '', telegram_chat_id: '', telegram_username: '' });
  const [addingLink, setAddingLink] = useState(false);
  const [testingLinkId, setTestingLinkId] = useState<number | null>(null);

  useEffect(() => {
    getSettings('telegram').then(data => {
      setTelegramSettings(data);
      data.forEach((s: Setting) => {
        setEditValues(prev => ({ ...prev, [s.key]: s.value || '' }));
      });
    }).catch(() => {});
    loadTgLinks();
    getTelegramAdmins().then(setTgAdmins).catch(() => {});
  }, []);

  const loadTgLinks = () => {
    getTelegramLinks().then(setTgLinks).catch(() => {});
  };

  const handleTestTelegram = useCallback(async () => {
    setTestingTg(true);
    try {
      const tokenKey = 'telegram_bot_token';
      if (editValues[tokenKey]) await updateSetting(tokenKey, editValues[tokenKey]);
      
      const result = await testTelegram();
      notifications.show({ title: 'Успешно', message: result.message, color: 'teal' });
    } catch (err: unknown) {
      const msg = apiErr(err, 'Не удалось отправить тестовое сообщение');
      notifications.show({ title: 'Ошибка', message: msg, color: 'red' });
    } finally {
      setTestingTg(false);
    }
  }, [editValues]);

  const handleAddLink = async () => {
    if (!newLink.admin_user_id || !newLink.telegram_chat_id) return;
    setAddingLink(true);
    try {
      await createTelegramLink({
        admin_user_id: Number(newLink.admin_user_id),
        telegram_chat_id: newLink.telegram_chat_id,
        telegram_username: newLink.telegram_username || undefined,
      });
      notifications.show({ title: 'Добавлено', message: 'Привязка создана', color: 'teal' });
      setAddLinkOpen(false);
      setNewLink({ admin_user_id: '', telegram_chat_id: '', telegram_username: '' });
      loadTgLinks();
    } catch (err: unknown) {
      notifications.show({ title: 'Ошибка', message: apiErr(err, 'Добавление не удалось'), color: 'red' });
    } finally {
      setAddingLink(false);
    }
  };

  const handleToggleLinkProp = async (linkId: number, prop: string, value: boolean) => {
    try {
      await updateTelegramLink(linkId, { [prop]: value });
      setTgLinks(prev => prev.map(l => l.id === linkId ? { ...l, [prop]: value } : l));
    } catch {
      notifications.show({ title: 'Ошибка', message: 'Не удалось обновить', color: 'red' });
    }
  };

  const handleDeleteLink = async (linkId: number) => {
    try {
      await deleteTelegramLink(linkId);
      setTgLinks(prev => prev.filter(l => l.id !== linkId));
      notifications.show({ title: 'Удалено', message: 'Привязка удалена', color: 'teal' });
    } catch {
      notifications.show({ title: 'Ошибка', message: 'Не удалось удалить', color: 'red' });
    }
  };

  const handleTestLink = async (linkId: number) => {
    setTestingLinkId(linkId);
    try {
      const result = await testTelegramLink(linkId);
      notifications.show({ title: 'Успешно', message: result.message, color: 'teal' });
    } catch (err: unknown) {
      notifications.show({ title: 'Ошибка', message: apiErr(err), color: 'red' });
    } finally {
      setTestingLinkId(null);
    }
  };

  return (
    <Box pos="relative" mih={300}>
      <LoadingOverlay visible={loading} />
      
      <Stack gap="md">
        <Paper withBorder p="md" radius="md">
          <Text fw={600} mb="sm">Общие настройки</Text>
          <Stack gap="sm">
            {settings.map((s) => (
              <Group key={s.key} justify="space-between" align="flex-end">
                {s.value_type === 'bool' ? (
                  <Switch
                    label={s.description}
                    checked={editValues[s.key] === 'true'}
                    onChange={(e) => {
                      const val = e.currentTarget.checked ? 'true' : 'false';
                      setEditValues(prev => ({ ...prev, [s.key]: val }));
                    }}
                  />
                ) : (
                  <TextInput
                    label={s.description}
                    value={editValues[s.key] || ''}
                    onChange={(e) => { const v = e.currentTarget.value; setEditValues(prev => ({ ...prev, [s.key]: v })); }}
                    style={{ flex: 1 }}
                    size="sm"
                  />
                )}
                <Button
                  size="xs"
                  variant="light"
                  onClick={() => handleSave(s.key)}
                  loading={saving === s.key}
                >
                  Сохранить
                </Button>
              </Group>
            ))}
          </Stack>
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Text fw={600} mb="sm">Системный промт</Text>
          <Stack gap="sm">
            {promptSettings.map((s) => (
              <div key={s.key}>
                <Text size="xs" c="dimmed" mb={4}>{s.description}</Text>
                <Textarea
                  value={editValues[s.key] || ''}
                  onChange={(e) => { const v = e.currentTarget.value; setEditValues(prev => ({ ...prev, [s.key]: v })); }}
                  autosize
                  minRows={8}
                  maxRows={20}
                  size="sm"
                />
                <Button
                  size="xs"
                  variant="light"
                  mt="xs"
                  onClick={() => handleSave(s.key)}
                  loading={saving === s.key}
                >
                  Сохранить промт
                </Button>
              </div>
            ))}
          </Stack>
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Text fw={600} mb="sm">Настройки менеджера</Text>
          <Stack gap="sm">
            {managerSettings.map((s) => (
              <Group key={s.key} justify="space-between" align="flex-end">
                {s.value_type === 'bool' ? (
                  <Switch
                    label={s.description}
                    checked={editValues[s.key] === 'true'}
                    onChange={(e) => {
                      const val = e.currentTarget.checked ? 'true' : 'false';
                      setEditValues(prev => ({ ...prev, [s.key]: val }));
                    }}
                  />
                ) : (
                  <Textarea
                    label={s.description}
                    value={editValues[s.key] || ''}
                    onChange={(e) => { const v = e.currentTarget.value; setEditValues(prev => ({ ...prev, [s.key]: v })); }}
                    style={{ flex: 1 }}
                    autosize
                    minRows={2}
                    maxRows={6}
                    size="sm"
                  />
                )}
                <Button
                  size="xs"
                  variant="light"
                  onClick={() => handleSave(s.key)}
                  loading={saving === s.key}
                >
                  Сохранить
                </Button>
              </Group>
            ))}
          </Stack>
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Text fw={600} mb="sm">Лимиты запросов</Text>
          <Text size="xs" c="dimmed" mb="sm">
            Ограничение количества сообщений для защиты от злоупотреблений. Установите 0 чтобы отключить лимит.
          </Text>
          <Stack gap="sm">
            {rateLimitSettings.map((s) => (
              <Group key={s.key} justify="space-between" align="flex-end">
                {s.value_type === 'int' ? (
                  <TextInput
                    label={s.description}
                    value={editValues[s.key] || ''}
                    onChange={(e) => { const v = e.currentTarget.value; setEditValues(prev => ({ ...prev, [s.key]: v })); }}
                    type="number"
                    min={0}
                    style={{ flex: 1 }}
                    size="sm"
                  />
                ) : (
                  <Textarea
                    label={s.description}
                    value={editValues[s.key] || ''}
                    onChange={(e) => { const v = e.currentTarget.value; setEditValues(prev => ({ ...prev, [s.key]: v })); }}
                    style={{ flex: 1 }}
                    autosize
                    minRows={2}
                    maxRows={4}
                    size="sm"
                  />
                )}
                <Button
                  size="xs"
                  variant="light"
                  onClick={() => handleSave(s.key)}
                  loading={saving === s.key}
                >
                  Сохранить
                </Button>
              </Group>
            ))}
          </Stack>
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Text fw={600} mb="sm">Telegram уведомления</Text>
          <Text size="xs" c="dimmed" mb="sm">
            Создайте бота через @BotFather и укажите его токен. Привяжите аккаунты администраторов
            к Telegram Chat ID. Узнать Chat ID можно, написав /start боту.
            Администраторы смогут отвечать клиентам прямо из Telegram, ответив на уведомление.
          </Text>
          <Stack gap="sm">
            {/* Global telegram settings (enabled + bot_token) */}
            {telegramSettings.map((s) => (
              <Group key={s.key} justify="space-between" align="flex-end">
                {s.value_type === 'bool' ? (
                  <Switch
                    label={s.description}
                    checked={editValues[s.key] === 'true'}
                    onChange={(e) => {
                      const val = e.currentTarget.checked ? 'true' : 'false';
                      setEditValues(prev => ({ ...prev, [s.key]: val }));
                    }}
                  />
                ) : (
                  <TextInput
                    label={s.description}
                    value={editValues[s.key] || ''}
                    onChange={(e) => { const v = e.currentTarget.value; setEditValues(prev => ({ ...prev, [s.key]: v })); }}
                    style={{ flex: 1 }}
                    size="sm"
                    type={s.key === 'telegram_bot_token' ? 'password' : 'text'}
                  />
                )}
                <Button
                  size="xs"
                  variant="light"
                  onClick={() => handleSave(s.key)}
                  loading={saving === s.key}
                >
                  Сохранить
                </Button>
              </Group>
            ))}
            <Button size="xs" variant="outline" onClick={handleTestTelegram}>
              Тест бота
            </Button>
          </Stack>
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" mb="sm">
            <Text fw={600}>Привязки Telegram</Text>
            <Button size="xs" onClick={() => setAddLinkOpen(true)}>
              + Добавить привязку
            </Button>
          </Group>
          <Text size="xs" c="dimmed" mb="sm">
            Каждый администратор может получать уведомления и отвечать клиентам через Telegram.
          </Text>

          {tgLinks.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="md">
              Нет привязок. Добавьте привязку, чтобы получать уведомления в Telegram.
            </Text>
          ) : (
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Администратор</Table.Th>
                  <Table.Th>Chat ID</Table.Th>
                  <Table.Th>TG Username</Table.Th>
                  <Table.Th>Новые диалоги</Table.Th>
                  <Table.Th>Запрос менеджера</Table.Th>
                  <Table.Th>Все сообщения</Table.Th>
                  <Table.Th>Статус</Table.Th>
                  <Table.Th>Действия</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {tgLinks.map((link) => (
                  <Table.Tr key={link.id}>
                    <Table.Td>
                      <Text size="sm" fw={500}>{link.admin_username || link.admin_email || `ID ${link.admin_user_id}`}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" ff="monospace">{link.telegram_chat_id}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{link.telegram_username ? `@${link.telegram_username}` : '—'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Switch
                        size="xs"
                        checked={link.notify_new_conversation}
                        onChange={(e) => handleToggleLinkProp(link.id, 'notify_new_conversation', e.currentTarget.checked)}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Switch
                        size="xs"
                        checked={link.notify_manager_request}
                        onChange={(e) => handleToggleLinkProp(link.id, 'notify_manager_request', e.currentTarget.checked)}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Switch
                        size="xs"
                        checked={link.notify_new_message}
                        onChange={(e) => handleToggleLinkProp(link.id, 'notify_new_message', e.currentTarget.checked)}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Badge color={link.is_active ? 'green' : 'gray'} size="sm" variant="light">
                        {link.is_active ? 'Активна' : 'Выкл'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        <Tooltip label="Тест">
                          <Button
                            size="compact-xs"
                            variant="light"
                            color="blue"
                            onClick={() => handleTestLink(link.id)}
                            loading={testingLinkId === link.id}
                          >
                            Тест
                          </Button>
                        </Tooltip>
                        <Switch
                          size="xs"
                          checked={link.is_active}
                          onChange={(e) => handleToggleLinkProp(link.id, 'is_active', e.currentTarget.checked)}
                        />
                        <Button
                          size="compact-xs"
                          variant="light"
                          color="red"
                          onClick={() => handleDeleteLink(link.id)}
                        >
                          Удалить
                        </Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Paper>
      </Stack>

      {/* Add Telegram Link Modal */}
      <Modal opened={addLinkOpen} onClose={() => setAddLinkOpen(false)} title="Добавить привязку Telegram" size="md">
        <Stack gap="sm">
          <Select
            label="Администратор"
            placeholder="Выберите администратора"
            data={tgAdmins.map(a => ({ value: String(a.id), label: `${a.username} (${a.email})` }))}
            value={newLink.admin_user_id}
            onChange={(val) => setNewLink(prev => ({ ...prev, admin_user_id: val || '' }))}
            searchable
          />
          <TextInput
            label="Telegram Chat ID"
            description="Напишите /start боту, чтобы узнать ваш Chat ID"
            placeholder="123456789"
            value={newLink.telegram_chat_id}
            onChange={(e) => { const v = e.currentTarget.value; setNewLink(prev => ({ ...prev, telegram_chat_id: v })); }}
            required
          />
          <TextInput
            label="Telegram Username (опционально)"
            placeholder="username"
            value={newLink.telegram_username}
            onChange={(e) => { const v = e.currentTarget.value; setNewLink(prev => ({ ...prev, telegram_username: v })); }}
          />
          <Button
            onClick={handleAddLink}
            loading={addingLink}
            disabled={!newLink.admin_user_id || !newLink.telegram_chat_id}
          >
            Добавить
          </Button>
        </Stack>
      </Modal>
    </Box>
  );
}
