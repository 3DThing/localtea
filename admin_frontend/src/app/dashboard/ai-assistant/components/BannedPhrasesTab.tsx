'use client';

import { useEffect, useState } from 'react';
import {
  Paper, Text, Group, Stack, TextInput, Button, LoadingOverlay,
  ActionIcon, Badge, Modal, Switch, Select, Box,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconEdit, IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { getBannedPhrases, createBannedPhrase, updateBannedPhrase, deleteBannedPhrase } from '@/lib/ai-api';

interface BannedPhrase {
  id: number;
  phrase: string;
  apply_to_input: boolean;
  apply_to_output: boolean;
  action: string;
  replacement: string | null;
  is_active: boolean;
  created_at: string;
}

export function BannedPhrasesTab() {
  const [phrases, setPhrases] = useState<BannedPhrase[]>([]);
  const [loading, setLoading] = useState(true);
  const [opened, { open, close }] = useDisclosure(false);
  const [editPhrase, setEditPhrase] = useState<BannedPhrase | null>(null);
  const [form, setForm] = useState({
    phrase: '',
    apply_to_input: true,
    apply_to_output: true,
    action: 'block',
    replacement: '',
  });
  const [saving, setSaving] = useState(false);

  const loadPhrases = async () => {
    setLoading(true);
    try {
      const data = await getBannedPhrases();
      setPhrases(data);
    } catch {
      notifications.show({ title: 'Ошибка', message: 'Не удалось загрузить', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPhrases(); }, []);

  const openCreate = () => {
    setEditPhrase(null);
    setForm({ phrase: '', apply_to_input: true, apply_to_output: true, action: 'block', replacement: '' });
    open();
  };

  const openEdit = (p: BannedPhrase) => {
    setEditPhrase(p);
    setForm({
      phrase: p.phrase,
      apply_to_input: p.apply_to_input,
      apply_to_output: p.apply_to_output,
      action: p.action,
      replacement: p.replacement || '',
    });
    open();
  };

  const handleSave = async () => {
    if (!form.phrase.trim()) {
      notifications.show({ title: 'Ошибка', message: 'Введите фразу', color: 'orange' });
      return;
    }
    setSaving(true);
    try {
      if (editPhrase) {
        await updateBannedPhrase(editPhrase.id, form);
      } else {
        await createBannedPhrase(form);
      }
      close();
      loadPhrases();
      notifications.show({ title: 'Сохранено', color: 'teal' });
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : 'Не удалось сохранить';
      notifications.show({ title: 'Ошибка', message: msg, color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить фразу?')) return;
    try {
      await deleteBannedPhrase(id);
      loadPhrases();
    } catch {
      notifications.show({ title: 'Ошибка', color: 'red' });
    }
  };

  const handleToggle = async (p: BannedPhrase) => {
    try {
      await updateBannedPhrase(p.id, { is_active: !p.is_active });
      loadPhrases();
    } catch {}
  };

  return (
    <Box pos="relative" mih={300}>
      <LoadingOverlay visible={loading} />

      <Group justify="space-between" mb="sm">
        <div>
          <Text fw={600}>Запрещённые слова и фразы</Text>
          <Text size="xs" c="dimmed">
            Фразы, которые будут блокироваться или заменяться в сообщениях пользователей и ответах AI.
          </Text>
        </div>
        <Button size="xs" leftSection={<IconPlus size={14} />} onClick={openCreate}>
          Добавить
        </Button>
      </Group>

      <Stack gap="xs">
        {phrases.map((p) => (
          <Paper key={p.id} withBorder p="xs" radius="sm">
            <Group justify="space-between">
              <Group gap={8}>
                <Text fw={500} size="sm">{p.phrase}</Text>
                <Badge size="xs" color={p.action === 'block' ? 'red' : 'orange'}>
                  {p.action === 'block' ? 'Блокировать' : 'Заменить'}
                </Badge>
                {p.apply_to_input && <Badge size="xs" variant="outline">Вход</Badge>}
                {p.apply_to_output && <Badge size="xs" variant="outline">Выход</Badge>}
                <Badge size="xs" color={p.is_active ? 'teal' : 'gray'}>
                  {p.is_active ? 'Активна' : 'Отключена'}
                </Badge>
                {p.replacement && (
                  <Text size="xs" c="dimmed">→ {p.replacement}</Text>
                )}
              </Group>
              <Group gap={4}>
                <Switch size="xs" checked={p.is_active} onChange={() => handleToggle(p)} />
                <ActionIcon variant="subtle" size="sm" onClick={() => openEdit(p)}>
                  <IconEdit size={14} />
                </ActionIcon>
                <ActionIcon variant="subtle" color="red" size="sm" onClick={() => handleDelete(p.id)}>
                  <IconTrash size={14} />
                </ActionIcon>
              </Group>
            </Group>
          </Paper>
        ))}
        {phrases.length === 0 && !loading && (
          <Text c="dimmed" ta="center" py="xl" size="sm">Нет запрещённых фраз</Text>
        )}
      </Stack>

      <Modal opened={opened} onClose={close} title={editPhrase ? 'Редактировать фразу' : 'Новая фраза'}>
        <Stack gap="sm">
          <TextInput
            label="Фраза"
            required
            value={form.phrase}
            onChange={(e) => setForm(f => ({ ...f, phrase: e.currentTarget.value }))}
          />
          <Select
            label="Действие"
            data={[
              { value: 'block', label: 'Блокировать (отклонить сообщение)' },
              { value: 'replace', label: 'Заменить текст' },
            ]}
            value={form.action}
            onChange={(val) => setForm(f => ({ ...f, action: val || 'block' }))}
          />
          {form.action === 'replace' && (
            <TextInput
              label="Замена"
              value={form.replacement}
              onChange={(e) => setForm(f => ({ ...f, replacement: e.currentTarget.value }))}
              placeholder="***"
            />
          )}
          <Switch
            label="Фильтровать ввод пользователя"
            checked={form.apply_to_input}
            onChange={(e) => setForm(f => ({ ...f, apply_to_input: e.currentTarget.checked }))}
          />
          <Switch
            label="Фильтровать ответы AI"
            checked={form.apply_to_output}
            onChange={(e) => setForm(f => ({ ...f, apply_to_output: e.currentTarget.checked }))}
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={close}>Отмена</Button>
            <Button onClick={handleSave} loading={saving}>
              {editPhrase ? 'Обновить' : 'Создать'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
