'use client';

import { useEffect, useState } from 'react';
import {
  Paper, Text, Group, Stack, TextInput, Button, LoadingOverlay, Textarea, 
  ActionIcon, Badge, Modal, Select, Switch, Box,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconEdit, IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { getRAGDocuments, createRAGDocument, updateRAGDocument, deleteRAGDocument } from '@/lib/ai-api';

interface RAGDocument {
  id: number;
  title: string;
  content: string;
  category: string | null;
  source: string | null;
  keywords: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { value: 'tea_types', label: 'Виды чая' },
  { value: 'brewing', label: 'Заваривание' },
  { value: 'storage', label: 'Хранение' },
  { value: 'health', label: 'Здоровье' },
  { value: 'store', label: 'О магазине' },
  { value: 'gifts', label: 'Подарки' },
  { value: 'accessories', label: 'Аксессуары' },
  { value: 'general', label: 'Общее' },
];

export function RAGTab() {
  const [docs, setDocs] = useState<RAGDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [opened, { open, close }] = useDisclosure(false);
  const [editDoc, setEditDoc] = useState<RAGDocument | null>(null);
  const [form, setForm] = useState({
    title: '', content: '', category: '', source: '', keywords: '',
  });
  const [saving, setSaving] = useState(false);

  const loadDocs = async () => {
    setLoading(true);
    try {
      const data = await getRAGDocuments({ active_only: false });
      setDocs(data);
    } catch {
      notifications.show({ title: 'Ошибка', message: 'Не удалось загрузить', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDocs(); }, []);

  const openCreate = () => {
    setEditDoc(null);
    setForm({ title: '', content: '', category: '', source: '', keywords: '' });
    open();
  };

  const openEdit = (doc: RAGDocument) => {
    setEditDoc(doc);
    setForm({
      title: doc.title,
      content: doc.content,
      category: doc.category || '',
      source: doc.source || '',
      keywords: doc.keywords || '',
    });
    open();
  };

  const handleSave = async () => {
    if (!form.title || !form.content) {
      notifications.show({ title: 'Ошибка', message: 'Заполните название и содержание', color: 'orange' });
      return;
    }
    setSaving(true);
    try {
      if (editDoc) {
        await updateRAGDocument(editDoc.id, form);
      } else {
        await createRAGDocument(form);
      }
      close();
      loadDocs();
      notifications.show({ title: 'Сохранено', message: editDoc ? 'Документ обновлён' : 'Документ создан', color: 'teal' });
    } catch {
      notifications.show({ title: 'Ошибка', message: 'Не удалось сохранить', color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить документ?')) return;
    try {
      await deleteRAGDocument(id);
      loadDocs();
      notifications.show({ title: 'Удалено', color: 'gray' });
    } catch {
      notifications.show({ title: 'Ошибка', message: 'Не удалось удалить', color: 'red' });
    }
  };

  const handleToggle = async (doc: RAGDocument) => {
    try {
      await updateRAGDocument(doc.id, { is_active: !doc.is_active });
      loadDocs();
    } catch {
      notifications.show({ title: 'Ошибка', color: 'red' });
    }
  };

  return (
    <Box pos="relative" mih={300}>
      <LoadingOverlay visible={loading} />

      <Group justify="space-between" mb="sm">
        <Text fw={600}>База знаний RAG ({docs.length} документов)</Text>
        <Button size="xs" leftSection={<IconPlus size={14} />} onClick={openCreate}>
          Добавить
        </Button>
      </Group>

      <Stack gap="xs">
        {docs.map((doc) => (
          <Paper key={doc.id} withBorder p="sm" radius="sm">
            <Group justify="space-between">
              <div style={{ flex: 1 }}>
                <Group gap={6} mb={4}>
                  <Text fw={600} size="sm">{doc.title}</Text>
                  {doc.category && (
                    <Badge size="xs" variant="light">
                      {CATEGORIES.find(c => c.value === doc.category)?.label || doc.category}
                    </Badge>
                  )}
                  <Badge size="xs" color={doc.is_active ? 'teal' : 'gray'}>
                    {doc.is_active ? 'Активен' : 'Отключен'}
                  </Badge>
                </Group>
                <Text size="xs" c="dimmed" lineClamp={2}>{doc.content}</Text>
                {doc.keywords && (
                  <Text size="xs" c="dimmed" mt={2}>Ключевые слова: {doc.keywords}</Text>
                )}
              </div>
              <Group gap={4}>
                <Switch
                  size="xs"
                  checked={doc.is_active}
                  onChange={() => handleToggle(doc)}
                />
                <ActionIcon variant="subtle" size="sm" onClick={() => openEdit(doc)}>
                  <IconEdit size={14} />
                </ActionIcon>
                <ActionIcon variant="subtle" color="red" size="sm" onClick={() => handleDelete(doc.id)}>
                  <IconTrash size={14} />
                </ActionIcon>
              </Group>
            </Group>
          </Paper>
        ))}
      </Stack>

      <Modal
        opened={opened}
        onClose={close}
        title={editDoc ? 'Редактировать документ' : 'Новый документ'}
        size="lg"
      >
        <Stack gap="sm">
          <TextInput
            label="Название"
            required
            value={form.title}
            onChange={(e) => { const v = e.currentTarget.value; setForm(f => ({ ...f, title: v })); }}
          />
          <Select
            label="Категория"
            data={CATEGORIES}
            value={form.category}
            onChange={(val) => setForm(f => ({ ...f, category: val || '' }))}
            clearable
          />
          <Textarea
            label="Содержание"
            required
            value={form.content}
            onChange={(e) => { const v = e.currentTarget.value; setForm(f => ({ ...f, content: v })); }}
            autosize
            minRows={6}
            maxRows={15}
          />
          <TextInput
            label="Источник"
            value={form.source}
            onChange={(e) => { const v = e.currentTarget.value; setForm(f => ({ ...f, source: v })); }}
          />
          <TextInput
            label="Ключевые слова (через запятую)"
            value={form.keywords}
            onChange={(e) => { const v = e.currentTarget.value; setForm(f => ({ ...f, keywords: v })); }}
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={close}>Отмена</Button>
            <Button onClick={handleSave} loading={saving}>
              {editDoc ? 'Обновить' : 'Создать'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
