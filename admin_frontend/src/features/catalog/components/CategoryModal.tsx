'use client';

import { useEffect, useState } from 'react';
import { Modal, Button, TextInput, Textarea, Checkbox, Group, LoadingOverlay, Select, Image, Text, Paper, ActionIcon, rem } from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import '@mantine/dropzone/styles.css';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Category, CategoryCreate, CategoryUpdate, CatalogService } from '@/lib/api';
import { getValidToken } from '@/lib/api-client';
import { API_URL } from '@/lib/axios';
import { IconUpload, IconX, IconPhoto } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

const categorySchema = z.object({
  name: z.string().min(1, { message: 'Название обязательно' }),
  slug: z.string().min(1, { message: 'Slug обязателен' }),
  description: z.string().optional(),
  image: z.string().optional(),
  parent_id: z.string().optional().nullable(), // Select returns string usually
  is_active: z.boolean(),
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryModalProps {
  opened: boolean;
  onClose: () => void;
  category: Category | null;
  categories: Category[]; // For parent selection
  onSubmit: (data: CategoryCreate | CategoryUpdate) => Promise<void>;
  loading: boolean;
}

export function CategoryModal({ opened, onClose, category, categories, onSubmit, loading }: CategoryModalProps) {
  const [uploading, setUploading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      is_active: true,
    }
  });

  const imageUrl = watch('image');

  useEffect(() => {
    if (category) {
      reset({
        name: category.name,
        slug: category.slug,
        description: category.description || '',
        image: category.image || '',
        parent_id: category.parent_id?.toString() || null,
        is_active: category.is_active ?? true,
        seo_title: category.seo_title || '',
        seo_description: category.seo_description || '',
      });
    } else {
      reset({
        name: '',
        slug: '',
        description: '',
        image: '',
        parent_id: null,
        is_active: true,
        seo_title: '',
        seo_description: '',
      });
    }
  }, [category, reset]);

  // Auto-generate slug from name if creating new category
  const nameValue = watch('name');
  useEffect(() => {
    if (!category && nameValue) {
        const slug = nameValue
            .toLowerCase()
            .replace(/ /g, '-')
            .replace(/[^\w-]+/g, '');
        setValue('slug', slug);
    }
  }, [nameValue, category, setValue]);

  const onFormSubmit = (data: CategoryFormData) => {
    const formattedData = {
        ...data,
        parent_id: data.parent_id ? parseInt(data.parent_id) : null,
    };
    onSubmit(formattedData);
  };

  const handleImageUpload = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        const token = await getValidToken();
        const response = await fetch(`${API_URL}/catalog/categories/image`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData,
        });
        
        if (!response.ok) {
            throw new Error('Upload failed');
        }
        
        const data = await response.json();
        setValue('image', data.url);
        notifications.show({ title: 'Успешно', message: 'Изображение загружено', color: 'green' });
    } catch (error) {
        console.error(error);
        notifications.show({ title: 'Ошибка', message: 'Не удалось загрузить изображение', color: 'red' });
    } finally {
        setUploading(false);
    }
  };

  const parentOptions = categories
    .filter(c => c.id !== category?.id) // Prevent selecting self as parent
    .map(c => ({ value: c.id.toString(), label: c.name }));

  return (
    <Modal opened={opened} onClose={onClose} title={category ? `Редактирование: ${category.name}` : 'Создание категории'} size="lg">
      <LoadingOverlay visible={loading || uploading} />
      <form onSubmit={handleSubmit(onFormSubmit)}>
        <Group grow align="flex-start">
            <div style={{ flex: 1 }}>
                <TextInput
                label="Название"
                placeholder="Зеленый чай"
                required
                mb="sm"
                {...register('name')}
                error={errors.name?.message}
                />
                <TextInput
                label="Slug (URL)"
                placeholder="green-tea"
                required
                mb="sm"
                {...register('slug')}
                error={errors.slug?.message}
                />
                <Select
                    label="Родительская категория"
                    placeholder="Нет"
                    data={parentOptions}
                    mb="sm"
                    clearable
                    value={watch('parent_id')}
                    onChange={(val) => setValue('parent_id', val)}
                />
            </div>
            <div style={{ width: 200, marginLeft: 16 }}>
                <Text size="sm" fw={500} mb={4}>Изображение</Text>
                <Paper withBorder p={0} h={180} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                    {imageUrl ? (
                        <>
                            <Image src={imageUrl} h={180} w="100%" fit="contain" alt="Category" />
                            <ActionIcon 
                                color="red" 
                                variant="filled" 
                                size="sm" 
                                style={{ position: 'absolute', top: 5, right: 5 }}
                                onClick={() => setValue('image', '')}
                            >
                                <IconX size={14} />
                            </ActionIcon>
                        </>
                    ) : (
                        <Dropzone 
                            onDrop={(files) => handleImageUpload(files[0])}
                            onReject={() => notifications.show({ title: 'Ошибка', message: 'Файл не поддерживается', color: 'red' })}
                            maxSize={5 * 1024 ** 2}
                            accept={IMAGE_MIME_TYPE}
                            multiple={false}
                            style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 0, backgroundColor: 'transparent' }}
                        >
                            <Group justify="center" gap="xs" style={{ pointerEvents: 'none' }}>
                                <Dropzone.Accept>
                                    <IconUpload style={{ width: rem(32), height: rem(32), color: 'var(--mantine-color-blue-6)' }} stroke={1.5} />
                                </Dropzone.Accept>
                                <Dropzone.Reject>
                                    <IconX style={{ width: rem(32), height: rem(32), color: 'var(--mantine-color-red-6)' }} stroke={1.5} />
                                </Dropzone.Reject>
                                <Dropzone.Idle>
                                    <IconPhoto style={{ width: rem(32), height: rem(32), color: 'var(--mantine-color-dimmed)' }} stroke={1.5} />
                                </Dropzone.Idle>

                                <Text size="xs" inline c="dimmed" ta="center">
                                    Перетащите фото или кликните
                                </Text>
                            </Group>
                        </Dropzone>
                    )}
                </Paper>
            </div>
        </Group>

        <Textarea
          label="Описание"
          placeholder="Описание категории..."
          mb="sm"
          {...register('description')}
          error={errors.description?.message}
        />

        <Checkbox
          label="Активна"
          mb="md"
          checked={watch('is_active')}
          onChange={(e) => setValue('is_active', e.currentTarget.checked)}
        />

        <TextInput
            label="SEO Title"
            placeholder="Купить зеленый чай..."
            mb="sm"
            {...register('seo_title')}
        />
        <Textarea
            label="SEO Description"
            placeholder="Лучший зеленый чай в магазине..."
            mb="lg"
            {...register('seo_description')}
        />

        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>Отмена</Button>
          <Button type="submit" loading={loading}>Сохранить</Button>
        </Group>
      </form>
    </Modal>
  );
}
