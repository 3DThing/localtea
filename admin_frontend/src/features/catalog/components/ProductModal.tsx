'use client';

import { useEffect, useState } from 'react';
import { Modal, Button, TextInput, Textarea, Checkbox, Group, LoadingOverlay, Select, Paper, Text, ActionIcon, rem, Image } from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import '@mantine/dropzone/styles.css';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Product, ProductCreate, ProductUpdate, Category, CatalogService } from '@/lib/api';
import { getValidToken } from '@/lib/api-client';
import { API_URL } from '@/lib/axios';
import { IconUpload, IconX, IconPhoto } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

const productSchema = z.object({
  title: z.string().min(1, { message: 'Название обязательно' }),
  slug: z.string().min(1, { message: 'Slug обязателен' }),
  category_id: z.string().min(1, { message: 'Категория обязательна' }), // Select returns string
  description: z.string().optional(),
  lore_description: z.string().optional(),
  is_active: z.boolean(),
  tea_type: z.string().optional(),
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductModalProps {
  opened: boolean;
  onClose: () => void;
  product: Product | null;
  categories: Category[];
  onSubmit: (data: ProductCreate | ProductUpdate) => Promise<void>;
  loading: boolean;
}

export function ProductModal({ opened, onClose, product, categories, onSubmit, loading }: ProductModalProps) {
  const [uploading, setUploading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      is_active: true,
    }
  });

  const handleImageUpload = async (file: File) => {
    if (!product) return;
    setUploading(true);
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('is_main', 'false');
        formData.append('sort_order', '0');
        
        const token = await getValidToken();
        const response = await fetch(`${API_URL}/catalog/products/${product.id}/images`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData,
        });
        
        if (!response.ok) {
            throw new Error('Upload failed');
        }
        
        notifications.show({ title: 'Успешно', message: 'Изображение загружено', color: 'green' });
        // Ideally we should refresh the product or images list here, but for now just notification
    } catch (error) {
        notifications.show({ title: 'Ошибка', message: 'Не удалось загрузить изображение', color: 'red' });
    } finally {
        setUploading(false);
    }
  };

  useEffect(() => {
    if (product) {
      reset({
        title: product.title,
        slug: product.slug,
        category_id: product.category_id.toString(),
        description: product.description || '',
        lore_description: product.lore_description || '',
        is_active: product.is_active ?? true,
        tea_type: product.tea_type || '',
        seo_title: product.seo_title || '',
        seo_description: product.seo_description || '',
      });
    } else {
      reset({
        title: '',
        slug: '',
        category_id: '',
        description: '',
        lore_description: '',
        is_active: true,
        tea_type: '',
        seo_title: '',
        seo_description: '',
      });
    }
  }, [product, reset]);

  // Auto-generate slug
  const titleValue = watch('title');
  useEffect(() => {
    if (!product && titleValue) {
        const slug = titleValue
            .toLowerCase()
            .replace(/ /g, '-')
            .replace(/[^\w-]+/g, '');
        setValue('slug', slug);
    }
  }, [titleValue, product, setValue]);

  const onFormSubmit = (data: ProductFormData) => {
    const formattedData = {
        ...data,
        category_id: parseInt(data.category_id),
    };
    onSubmit(formattedData);
  };

  const categoryOptions = categories.map(c => ({ value: c.id.toString(), label: c.name }));

  return (
    <Modal opened={opened} onClose={onClose} title={product ? `Редактирование: ${product.title}` : 'Создание товара'} size="lg">
      <LoadingOverlay visible={loading} />
      <form onSubmit={handleSubmit(onFormSubmit)}>
        <TextInput
          label="Название"
          placeholder="Зеленый чай Улун"
          required
          mb="sm"
          {...register('title')}
          error={errors.title?.message}
        />
        <TextInput
          label="Slug (URL)"
          placeholder="green-tea-oolong"
          required
          mb="sm"
          {...register('slug')}
          error={errors.slug?.message}
        />
        
        <Select
            label="Категория"
            placeholder="Выберите категорию"
            data={categoryOptions}
            required
            mb="sm"
            value={watch('category_id')}
            onChange={(val) => setValue('category_id', val || '')}
            error={errors.category_id?.message}
        />

        <TextInput
            label="Тип чая"
            placeholder="Улун"
            mb="sm"
            {...register('tea_type')}
        />

        <Textarea
          label="Описание"
          placeholder="Описание товара..."
          mb="sm"
          {...register('description')}
          error={errors.description?.message}
        />

        <Textarea
          label="Аутентичное описание (Lore)"
          placeholder="История чая..."
          mb="sm"
          minRows={4}
          {...register('lore_description')}
        />

        {product && (
            <Paper withBorder p="md" mb="sm">
                <Text size="sm" fw={500} mb="xs">Изображения товара</Text>
                <Dropzone 
                    onDrop={(files) => handleImageUpload(files[0])}
                    onReject={() => notifications.show({ title: 'Ошибка', message: 'Файл не поддерживается', color: 'red' })}
                    maxSize={5 * 1024 ** 2}
                    accept={IMAGE_MIME_TYPE}
                    loading={uploading}
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

                        <div>
                            <Text size="xl" inline>
                                Перетащите изображения сюда
                            </Text>
                            <Text size="sm" c="dimmed" inline mt={7}>
                                Прикрепить файл не более 5мб
                            </Text>
                        </div>
                    </Group>
                </Dropzone>
            </Paper>
        )}

        <Checkbox
          label="Активен"
          mb="md"
          checked={watch('is_active')}
          onChange={(e) => setValue('is_active', e.currentTarget.checked)}
        />

        <TextInput
            label="SEO Title"
            placeholder="Купить..."
            mb="sm"
            {...register('seo_title')}
        />
        <Textarea
            label="SEO Description"
            placeholder="..."
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
