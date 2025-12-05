'use client';

import { Tabs } from '@mantine/core';
import { CategoryList } from '@/features/catalog/components/CategoryList';
import { ProductList } from '@/features/catalog/components/ProductList';
import { IconCategory, IconPackage } from '@tabler/icons-react';

export default function CatalogPage() {
  return (
    <Tabs defaultValue="products">
      <Tabs.List mb="sm">
        <Tabs.Tab value="products" leftSection={<IconPackage size={14} />}>
          Товары
        </Tabs.Tab>
        <Tabs.Tab value="categories" leftSection={<IconCategory size={14} />}>
          Категории
        </Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="products">
        <ProductList />
      </Tabs.Panel>

      <Tabs.Panel value="categories">
        <CategoryList />
      </Tabs.Panel>
    </Tabs>
  );
}
