'use client';

import { useState } from 'react';
import { Stack, TextInput, Textarea, Button, Group, Text } from '@mantine/core';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Product, ProductUpdate, CatalogService } from '@/lib/api';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';

const seoSchema = z.object({
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
  seo_keywords: z.string().optional(),
});

type SEOFormData = z.infer<typeof seoSchema>;

interface ProductSEOFormProps {
  product: Product | null;
  onSave: (product: Product) => void;
  isNew: boolean;
}

export function ProductSEOForm({ product, onSave, isNew }: ProductSEOFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch } = useForm<SEOFormData>({
    resolver: zodResolver(seoSchema),
    defaultValues: {
      seo_title: product?.seo_title || '',
      seo_description: product?.seo_description || '',
      seo_keywords: product?.seo_keywords || '',
    }
  });

  const onSubmit = async (data: SEOFormData) => {
    if (isNew) {
      notifications.show({ 
        title: 'Информация', 
        message: 'Сначала сохраните товар на вкладке "Основное"', 
        color: 'blue' 
      });
      return;
    }

    setLoading(true);
    try {
      const result = await CatalogService.updateProductApiV1CatalogProductsIdPatch(product!.id, data as ProductUpdate);
      notifications.show({ title: 'Успешно', message: 'SEO настройки сохранены', color: 'green' });
      onSave(result);
    } catch (error) {
      notifications.show({ title: 'Ошибка', message: 'Не удалось сохранить SEO', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  const seoTitle = watch('seo_title');
  const seoDescription = watch('seo_description');

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          SEO настройки влияют на то, как товар отображается в результатах поиска.
        </Text>

        <TextInput
          label="SEO Title"
          description={`${seoTitle?.length || 0}/60 символов (рекомендуется до 60)`}
          placeholder="Купить Зеленый чай Улун | LocalTea"
          {...register('seo_title')}
        />

        <Textarea
          label="SEO Description"
          description={`${seoDescription?.length || 0}/160 символов (рекомендуется до 160)`}
          placeholder="Купить настоящий китайский зеленый чай Улун с доставкой по России. Высокое качество, свежий урожай."
          minRows={3}
          {...register('seo_description')}
        />

        <TextInput
          label="SEO Keywords"
          description="Ключевые слова через запятую (устарело, но может быть полезно)"
          placeholder="зеленый чай, улун, китайский чай, купить чай"
          {...register('seo_keywords')}
        />

        {!isNew && (
          <Group justify="flex-end" mt="md">
            <Button type="submit" loading={loading}>
              Сохранить SEO
            </Button>
          </Group>
        )}

        {isNew && (
          <Text c="dimmed" size="sm" ta="center">
            SEO настройки будут доступны после создания товара
          </Text>
        )}
      </Stack>
    </form>
  );
}
