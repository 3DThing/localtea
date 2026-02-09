'use client';

import { useState, useEffect } from 'react';
import { Stack, Group, Text, Image, ActionIcon, Paper, SimpleGrid, Badge, LoadingOverlay, rem } from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import '@mantine/dropzone/styles.css';
import { IconUpload, IconX, IconPhoto, IconTrash, IconStar, IconStarFilled } from '@tabler/icons-react';
import { Product, CatalogService, ProductImage } from '@/lib/api';
import { getValidToken } from '@/lib/api-client';
import { API_URL } from '@/lib/axios';
import { notifications } from '@mantine/notifications';

interface ProductImagesFormProps {
  product: Product;
  onUpdate: (product: Product) => void;
}

export function ProductImagesForm({ product, onUpdate }: ProductImagesFormProps) {
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<ProductImage[]>(product.images || []);

  useEffect(() => {
    setImages(product.images || []);
  }, [product]);

  const handleUpload = async (files: File[]) => {
    setUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('is_main', images.length === 0 ? 'true' : 'false');
        formData.append('sort_order', images.length.toString());

        const token = await getValidToken();
        const response = await fetch(`${API_URL}/catalog/products/${product.id}/images`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });

        if (!response.ok) throw new Error('Upload failed');
        
        const newImage = await response.json();
        setImages(prev => [...prev, newImage]);
      }
      notifications.show({ title: 'Успешно', message: 'Изображения загружены', color: 'green' });
      
      // Refresh product data
      const updated = await CatalogService.readProductApiV1CatalogProductsIdGet(product.id);
      onUpdate(updated);
    } catch (error) {
      notifications.show({ title: 'Ошибка', message: 'Не удалось загрузить изображение', color: 'red' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (imageId: number) => {
    if (!confirm('Удалить изображение?')) return;
    try {
      await CatalogService.deleteImageApiV1CatalogImagesIdDelete(imageId);
      setImages(prev => prev.filter(img => img.id !== imageId));
      notifications.show({ title: 'Успешно', message: 'Изображение удалено', color: 'green' });
      
      const updated = await CatalogService.readProductApiV1CatalogProductsIdGet(product.id);
      onUpdate(updated);
    } catch (error) {
      notifications.show({ title: 'Ошибка', message: 'Не удалось удалить изображение', color: 'red' });
    }
  };

  const handleSetMain = async (imageId: number) => {
    try {
      const token = await getValidToken();
      const response = await fetch(`${API_URL}/catalog/images/${imageId}/set-main`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to set main image');
      }

      notifications.show({ title: 'Успешно', message: 'Главное изображение обновлено', color: 'green' });

      const updated = await CatalogService.readProductApiV1CatalogProductsIdGet(product.id);
      onUpdate(updated);
    } catch (error) {
      notifications.show({ title: 'Ошибка', message: 'Не удалось сделать изображение главным', color: 'red' });
    }
  };

  return (
    <Stack gap="md">
      <LoadingOverlay visible={uploading} />
      
      <Dropzone
        onDrop={handleUpload}
        onReject={() => notifications.show({ title: 'Ошибка', message: 'Файл не поддерживается', color: 'red' })}
        maxSize={5 * 1024 ** 2}
        accept={IMAGE_MIME_TYPE}
        loading={uploading}
      >
        <Group justify="center" gap="xl" mih={120} style={{ pointerEvents: 'none' }}>
          <Dropzone.Accept>
            <IconUpload style={{ width: rem(52), height: rem(52), color: 'var(--mantine-color-blue-6)' }} stroke={1.5} />
          </Dropzone.Accept>
          <Dropzone.Reject>
            <IconX style={{ width: rem(52), height: rem(52), color: 'var(--mantine-color-red-6)' }} stroke={1.5} />
          </Dropzone.Reject>
          <Dropzone.Idle>
            <IconPhoto style={{ width: rem(52), height: rem(52), color: 'var(--mantine-color-dimmed)' }} stroke={1.5} />
          </Dropzone.Idle>

          <div>
            <Text size="xl" inline>
              Перетащите изображения сюда
            </Text>
            <Text size="sm" c="dimmed" inline mt={7}>
              Поддерживаются форматы JPG, PNG, WebP. Максимум 5мб на файл.
            </Text>
          </div>
        </Group>
      </Dropzone>

      {images.length > 0 && (
        <>
          <Text fw={500}>Загруженные изображения ({images.length})</Text>
          <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
            {images.map((image) => (
              <Paper key={image.id} withBorder p="xs" radius="md" pos="relative">
                <Image
                  src={image.url}
                  alt={`Product image ${image.id}`}
                  h={150}
                  fit="cover"
                  radius="sm"
                />
                {image.is_main && (
                  <Badge 
                    pos="absolute" 
                    top={8} 
                    left={8} 
                    color="yellow"
                    leftSection={<IconStarFilled size={12} />}
                  >
                    Главное
                  </Badge>
                )}
                <Group justify="center" mt="xs" gap="xs">
                  <ActionIcon 
                    variant="light" 
                    color="yellow"
                    onClick={() => handleSetMain(image.id)}
                    title="Сделать главным"
                  >
                    {image.is_main ? <IconStarFilled size={16} /> : <IconStar size={16} />}
                  </ActionIcon>
                  <ActionIcon 
                    variant="light" 
                    color="red"
                    onClick={() => handleDelete(image.id)}
                    title="Удалить"
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Paper>
            ))}
          </SimpleGrid>
        </>
      )}

      {images.length === 0 && (
        <Text c="dimmed" ta="center">Нет загруженных изображений</Text>
      )}
    </Stack>
  );
}
