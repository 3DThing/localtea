'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TextInput, Textarea, Select, Checkbox, Button, Group, Stack } from '@mantine/core';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Product, ProductCreate, ProductUpdate, Category, CatalogService } from '@/lib/api';
import { notifications } from '@mantine/notifications';

const productSchema = z.object({
  title: z.string().min(1, 'Название обязательно'),
  slug: z.string().min(1, 'Slug обязателен'),
  category_id: z.string().min(1, 'Категория обязательна'),
  tea_type: z.string().optional(),
  description: z.string().optional(),
  lore_description: z.string().optional(),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof productSchema>;

interface ProductBasicFormProps {
  product: Product | null;
  categories: Category[];
  onSave: (product: Product) => void;
  isNew: boolean;
}

export function ProductBasicForm({ product, categories, onSave, isNew }: ProductBasicFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      title: '',
      slug: '',
      category_id: '',
      tea_type: '',
      description: '',
      lore_description: '',
      is_active: true,
    }
  });

  // Обновляем форму когда product загрузится
  useEffect(() => {
    if (product) {
      reset({
        title: product.title || '',
        slug: product.slug || '',
        category_id: product.category_id?.toString() || '',
        tea_type: product.tea_type || '',
        description: product.description || '',
        lore_description: product.lore_description || '',
        is_active: product.is_active ?? true,
      });
    }
  }, [product, reset]);

  // Auto-generate slug for new products only
  const titleValue = watch('title');
  const currentSlug = watch('slug');
  useEffect(() => {
    if (isNew && titleValue && !currentSlug) {
      const slug = titleValue.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
      setValue('slug', slug);
    }
  }, [isNew, titleValue, currentSlug, setValue]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const payload = {
        ...data,
        category_id: parseInt(data.category_id),
      };

      let result: Product;
      if (isNew) {
        result = await CatalogService.createProductApiV1CatalogProductsPost(payload as ProductCreate);
        notifications.show({ title: 'Успешно', message: 'Товар создан', color: 'green' });
        router.push(`/dashboard/catalog/products/${result.id}`);
      } else {
        result = await CatalogService.updateProductApiV1CatalogProductsIdPatch(product!.id, payload as ProductUpdate);
        notifications.show({ title: 'Успешно', message: 'Товар обновлен', color: 'green' });
        onSave(result);
      }
    } catch (error) {
      notifications.show({ title: 'Ошибка', message: 'Не удалось сохранить товар', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  const categoryOptions = categories.map(c => ({ value: c.id.toString(), label: c.name }));

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack gap="md">
        <TextInput
          label="Название"
          placeholder="Зеленый чай Улун"
          required
          {...register('title')}
          error={errors.title?.message}
        />

        <TextInput
          label="Slug (URL)"
          placeholder="green-tea-oolong"
          required
          {...register('slug')}
          error={errors.slug?.message}
        />

        <Select
          label="Категория"
          placeholder="Выберите категорию"
          data={categoryOptions}
          required
          value={watch('category_id')}
          onChange={(val) => setValue('category_id', val || '')}
          error={errors.category_id?.message}
        />

        <TextInput
          label="Тип чая"
          placeholder="Улун, Пуэр, Зеленый..."
          {...register('tea_type')}
        />

        <Textarea
          label="Описание"
          placeholder="Подробное описание товара..."
          minRows={3}
          {...register('description')}
        />

        <Textarea
          label="Аутентичное описание (Lore)"
          placeholder="История и легенды о чае..."
          minRows={4}
          {...register('lore_description')}
        />

        <Checkbox
          label="Активен (виден покупателям)"
          checked={watch('is_active')}
          onChange={(e) => setValue('is_active', e.currentTarget.checked)}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={() => router.push('/dashboard/catalog')}>
            Отмена
          </Button>
          <Button type="submit" loading={loading}>
            {isNew ? 'Создать' : 'Сохранить'}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
