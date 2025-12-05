'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Paper, Title, Tabs, Button, Group, LoadingOverlay, Breadcrumbs, Anchor } from '@mantine/core';
import { IconArrowLeft, IconInfoCircle, IconPhoto, IconPackage, IconSearch } from '@tabler/icons-react';
import { CatalogService, Product, Category } from '@/lib/api';
import { notifications } from '@mantine/notifications';
import { ProductBasicForm } from '@/features/catalog/components/ProductForm/ProductBasicForm';
import { ProductImagesForm } from '@/features/catalog/components/ProductForm/ProductImagesForm';
import { ProductSKUForm } from '@/features/catalog/components/ProductForm/ProductSKUForm';
import { ProductSEOForm } from '@/features/catalog/components/ProductForm/ProductSEOForm';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProductEditPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string | null>('basic');

  const isNew = id === 'new';

  const fetchProduct = async () => {
    if (isNew) {
      setLoading(false);
      return;
    }
    try {
      const data = await CatalogService.readProductApiV1CatalogProductsIdGet(parseInt(id));
      setProduct(data);
    } catch (error) {
      notifications.show({ title: 'Ошибка', message: 'Не удалось загрузить товар', color: 'red' });
      router.push('/dashboard/catalog');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await CatalogService.readCategoriesApiV1CatalogCategoriesGet();
      setCategories(data);
    } catch (error) {
      console.error('Failed to fetch categories');
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchProduct();
  }, [id]);

  const handleProductUpdate = (updatedProduct: Product) => {
    setProduct(updatedProduct);
  };

  const breadcrumbItems = [
    { title: 'Каталог', href: '/dashboard/catalog' },
    { title: isNew ? 'Новый товар' : product?.title || 'Загрузка...' },
  ].map((item, index) => (
    item.href ? (
      <Anchor href={item.href} key={index}>{item.title}</Anchor>
    ) : (
      <span key={index}>{item.title}</span>
    )
  ));

  return (
    <Container size="lg" py="md">
      <LoadingOverlay visible={loading} />
      
      <Group mb="md">
        <Button 
          variant="subtle" 
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => router.push('/dashboard/catalog')}
        >
          Назад
        </Button>
        <Breadcrumbs>{breadcrumbItems}</Breadcrumbs>
      </Group>

      <Title order={2} mb="lg">
        {isNew ? 'Создание товара' : `Редактирование: ${product?.title}`}
      </Title>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List mb="md">
          <Tabs.Tab value="basic" leftSection={<IconInfoCircle size={16} />}>
            Основное
          </Tabs.Tab>
          <Tabs.Tab value="images" leftSection={<IconPhoto size={16} />} disabled={isNew}>
            Изображения
          </Tabs.Tab>
          <Tabs.Tab value="sku" leftSection={<IconPackage size={16} />} disabled={isNew}>
            SKU (Вариации)
          </Tabs.Tab>
          <Tabs.Tab value="seo" leftSection={<IconSearch size={16} />}>
            SEO
          </Tabs.Tab>
        </Tabs.List>

        <Paper withBorder p="lg" radius="md">
          <Tabs.Panel value="basic">
            <ProductBasicForm 
              product={product} 
              categories={categories}
              onSave={handleProductUpdate}
              isNew={isNew}
            />
          </Tabs.Panel>

          <Tabs.Panel value="images">
            {product && (
              <ProductImagesForm 
                product={product}
                onUpdate={handleProductUpdate}
              />
            )}
          </Tabs.Panel>

          <Tabs.Panel value="sku">
            {product && (
              <ProductSKUForm 
                product={product}
                onUpdate={handleProductUpdate}
              />
            )}
          </Tabs.Panel>

          <Tabs.Panel value="seo">
            <ProductSEOForm 
              product={product}
              onSave={handleProductUpdate}
              isNew={isNew}
            />
          </Tabs.Panel>
        </Paper>
      </Tabs>
    </Container>
  );
}
