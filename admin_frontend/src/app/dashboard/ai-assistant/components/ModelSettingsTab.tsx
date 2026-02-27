'use client';

import { useEffect, useState } from 'react';
import {
  Paper, Text, Group, Stack, TextInput, Button, LoadingOverlay, NumberInput, Box,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { getSettings, updateSetting } from '@/lib/ai-api';

interface Setting {
  id: number;
  key: string;
  value: string;
  value_type: string;
  group: string;
  description: string;
}

export function ModelSettingsTab() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await getSettings('model');
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

  const renderField = (s: Setting) => {
    if (s.key === 'openai_api_key') {
      return (
        <TextInput
          label={s.description}
          value={editValues[s.key] || ''}
          onChange={(e) => setEditValues(prev => ({ ...prev, [s.key]: e.currentTarget.value }))}
          style={{ flex: 1 }}
          size="sm"
          type="password"
        />
      );
    }
    if (s.value_type === 'float') {
      return (
        <NumberInput
          label={s.description}
          value={parseFloat(editValues[s.key] || '0')}
          onChange={(val) => setEditValues(prev => ({ ...prev, [s.key]: String(val) }))}
          step={0.1}
          min={0}
          max={2}
          decimalScale={2}
          style={{ flex: 1 }}
          size="sm"
        />
      );
    }
    if (s.value_type === 'int') {
      return (
        <NumberInput
          label={s.description}
          value={parseInt(editValues[s.key] || '0')}
          onChange={(val) => setEditValues(prev => ({ ...prev, [s.key]: String(val) }))}
          min={1}
          max={128000}
          style={{ flex: 1 }}
          size="sm"
        />
      );
    }
    return (
      <TextInput
        label={s.description}
        value={editValues[s.key] || ''}
        onChange={(e) => setEditValues(prev => ({ ...prev, [s.key]: e.currentTarget.value }))}
        style={{ flex: 1 }}
        size="sm"
      />
    );
  };

  return (
    <Box pos="relative" mih={300}>
      <LoadingOverlay visible={loading} />

      <Paper withBorder p="md" radius="md">
        <Text fw={600} mb="sm">Настройки модели и API</Text>
        <Text size="xs" c="dimmed" mb="md">
          Настройте подключение к OpenAI-совместимому API и параметры генерации ответов.
        </Text>
        <Stack gap="sm">
          {settings.map((s) => (
            <Group key={s.key} justify="space-between" align="flex-end">
              {renderField(s)}
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
    </Box>
  );
}
