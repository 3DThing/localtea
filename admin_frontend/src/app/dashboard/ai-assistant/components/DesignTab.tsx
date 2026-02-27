'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Paper, Text, Group, Stack, TextInput, Button, LoadingOverlay,
  Select, Textarea, ColorInput, Box, Divider, Avatar, ActionIcon,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { getSettings, updateSettingsBulk, uploadAssistantAvatar, deleteAssistantAvatar } from '@/lib/ai-api';

interface DesignSettings {
  chat_primary_color: string;
  chat_bg_color: string;
  chat_header_text: string;
  chat_placeholder: string;
  chat_welcome_message: string;
  chat_position: string;
  chat_custom_css: string;
  assistant_avatar_url: string;
}

const DEFAULTS: DesignSettings = {
  chat_primary_color: '#d4894f',
  chat_bg_color: '#1a1412',
  chat_header_text: 'Чайный помощник',
  chat_placeholder: 'Задайте вопрос о чае...',
  chat_welcome_message: 'Здравствуйте! Я ваш чайный помощник. Расскажу о сортах чая, поможу с выбором и отвечу на любые вопросы. Чем могу помочь?',
  chat_position: 'bottom-right',
  chat_custom_css: '',  assistant_avatar_url: '',};

export function DesignTab() {
  const [settings, setSettings] = useState<DesignSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getSettings();
        const mapped: any = { ...DEFAULTS };
        for (const s of data) {
          if (s.key in mapped) mapped[s.key] = s.value;
        }
        setSettings(mapped);
      } catch {
        notifications.show({ title: 'Ошибка', message: 'Не удалось загрузить настройки', color: 'red' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const items: Record<string, string> = Object.fromEntries(Object.entries(settings));
      await updateSettingsBulk(items);
      notifications.show({ title: 'Сохранено', color: 'teal' });
    } catch {
      notifications.show({ title: 'Ошибка', message: 'Не удалось сохранить', color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const set = (key: keyof DesignSettings, value: string) =>
    setSettings(s => ({ ...s, [key]: value }));

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const result = await uploadAssistantAvatar(file);
      setSettings(s => ({ ...s, assistant_avatar_url: result.avatar_url }));
      notifications.show({ title: 'Аватарка загружена', color: 'teal' });
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : 'Не удалось загрузить аватарку';
      notifications.show({ title: 'Ошибка', message: msg, color: 'red' });
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAvatar = async () => {
    try {
      await deleteAssistantAvatar();
      setSettings(s => ({ ...s, assistant_avatar_url: '' }));
      notifications.show({ title: 'Аватарка удалена', color: 'teal' });
    } catch {
      notifications.show({ title: 'Ошибка', message: 'Не удалось удалить', color: 'red' });
    }
  };

  return (
    <Box pos="relative" mih={300}>
      <LoadingOverlay visible={loading} />

      <Text fw={600} mb="md">Оформление чат-виджета</Text>

      <Stack gap="md">
        {/* Avatar upload */}
        <Paper withBorder p="md" radius="sm">
          <Text fw={500} mb="sm">Аватарка ИИ агента</Text>
          <Text size="xs" c="dimmed" mb="md">
            Отображается рядом с каждым сообщением ассистента в чате.
            Рекомендуем квадратное изображение, мин. 256×256px. Форматы: JPG, PNG, WEBP.
          </Text>
          <Group align="center" gap="lg">
            <Avatar
              src={settings.assistant_avatar_url || null}
              size={80}
              radius={80}
              style={{ border: '2px solid var(--mantine-color-dark-4)' }}
            >
              🍵
            </Avatar>
            <Stack gap="xs">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={handleAvatarFileChange}
              />
              <Button
                size="sm"
                variant="light"
                loading={uploadingAvatar}
                onClick={() => fileInputRef.current?.click()}
              >
                {settings.assistant_avatar_url ? 'Заменить аватарку' : 'Загрузить аватарку'}
              </Button>
              {settings.assistant_avatar_url && (
                <Button size="sm" variant="subtle" color="red" onClick={handleDeleteAvatar}>
                  Удалить
                </Button>
              )}
            </Stack>
          </Group>
        </Paper>
        <Paper withBorder p="md" radius="sm">
          <Text fw={500} mb="sm">Цвета</Text>
          <Group grow>
            <ColorInput
              label="Основной цвет"
              value={settings.chat_primary_color}
              onChange={(val) => set('chat_primary_color', val)}
              format="hex"
            />
            <ColorInput
              label="Фон чата"
              value={settings.chat_bg_color}
              onChange={(val) => set('chat_bg_color', val)}
              format="hex"
            />
          </Group>
        </Paper>

        <Paper withBorder p="md" radius="sm">
          <Text fw={500} mb="sm">Тексты</Text>
          <Stack gap="sm">
            <TextInput
              label="Заголовок чата"
              value={settings.chat_header_text}
              onChange={(e) => set('chat_header_text', e.currentTarget.value)}
            />
            <TextInput
              label="Placeholder поля ввода"
              value={settings.chat_placeholder}
              onChange={(e) => set('chat_placeholder', e.currentTarget.value)}
            />
            <Textarea
              label="Приветственное сообщение"
              autosize
              minRows={2}
              maxRows={5}
              value={settings.chat_welcome_message}
              onChange={(e) => set('chat_welcome_message', e.currentTarget.value)}
            />
          </Stack>
        </Paper>

        <Paper withBorder p="md" radius="sm">
          <Text fw={500} mb="sm">Позиция и CSS</Text>
          <Stack gap="sm">
            <Select
              label="Позиция на экране"
              data={[
                { value: 'bottom-right', label: 'Правый нижний угол' },
                { value: 'bottom-left', label: 'Левый нижний угол' },
              ]}
              value={settings.chat_position}
              onChange={(val) => set('chat_position', val || 'bottom-right')}
            />
            <Textarea
              label="Пользовательский CSS"
              description="Дополнительные CSS-стили для виджета"
              autosize
              minRows={3}
              maxRows={10}
              value={settings.chat_custom_css}
              onChange={(e) => set('chat_custom_css', e.currentTarget.value)}
              styles={{ input: { fontFamily: 'monospace', fontSize: 13 } }}
            />
          </Stack>
        </Paper>

        <Divider />

        <Paper withBorder p="md" radius="sm" bg="var(--mantine-color-dark-7)">
          <Text fw={500} mb="xs">Предпросмотр</Text>
          <Box
            style={{
              background: settings.chat_bg_color,
              borderRadius: 12,
              padding: 16,
              maxWidth: 340,
              border: `1px solid ${settings.chat_primary_color}40`,
            }}
          >
            <Box
              style={{
                background: settings.chat_primary_color,
                borderRadius: '8px 8px 0 0',
                padding: '10px 14px',
                color: '#fff',
                fontWeight: 600,
                fontFamily: 'Georgia, serif',
              }}
            >
              {settings.chat_header_text || 'Чайный помощник'}
            </Box>
            <Box style={{ padding: '12px 14px', minHeight: 60 }}>
              <Box
                style={{
                  background: `${settings.chat_primary_color}20`,
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 13,
                  color: '#e0d5c7',
                  maxWidth: '85%',
                }}
              >
                {settings.chat_welcome_message || 'Приветствие...'}
              </Box>
            </Box>
            <Box
              style={{
                background: '#2a2320',
                borderRadius: '0 0 8px 8px',
                padding: '8px 12px',
                fontSize: 13,
                color: '#6b5d4f',
              }}
            >
              {settings.chat_placeholder || 'Введите сообщение...'}
            </Box>
          </Box>
        </Paper>

        <Group justify="flex-end">
          <Button onClick={handleSave} loading={saving}>Сохранить дизайн</Button>
        </Group>
      </Stack>
    </Box>
  );
}
