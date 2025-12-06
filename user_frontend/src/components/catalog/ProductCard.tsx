'use client';

import { Card, Box, Image, Text, Group, Button, ActionIcon, Badge } from '@mantine/core';
import { IconHeart, IconEye, IconShoppingCart } from '@tabler/icons-react';
import Link from 'next/link';

interface ProductCardProps {
  product: {
    id: number;
    title: string;
    slug: string;
    tea_type?: string;
    main_image?: string;
    min_price_cents: number;
    category?: {
      name: string;
    };
    views_count?: number;
    likes_count?: number;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  return (
    <Card className="product-card" p={0}>
      <Link href={`/catalog/${product.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <Box className="image-wrapper" h={200} style={{ position: 'relative' }}>
          <Image
            src={product.main_image || 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400'}
            alt={product.title}
            h="100%"
            style={{ objectFit: 'cover' }}
          />
          {product.tea_type && (
            <Badge
              variant="gradient"
              gradient={{ from: 'violet', to: 'grape' }}
              style={{
                position: 'absolute',
                top: 12,
                left: 12,
                zIndex: 3,
              }}
            >
              {product.tea_type}
            </Badge>
          )}
          <Group
            gap="xs"
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              zIndex: 3,
            }}
          >
            <ActionIcon
              variant="subtle"
              color="white"
              size="sm"
              style={{ background: 'rgba(0,0,0,0.5)' }}
            >
              <IconHeart size={14} />
            </ActionIcon>
          </Group>
        </Box>
      </Link>

      <Box p="md">
        <Text size="xs" c="dimmed" mb={4}>
          {product.category?.name || 'Чай'}
        </Text>
        <Link href={`/catalog/${product.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <Text fw={600} lineClamp={1} mb="xs" style={{ cursor: 'pointer' }}>
            {product.title}
          </Text>
        </Link>

        <Group gap="md" mb="sm">
          {product.views_count !== undefined && (
            <Group gap={4}>
              <IconEye size={14} style={{ opacity: 0.5 }} />
              <Text size="xs" c="dimmed">{product.views_count}</Text>
            </Group>
          )}
          {product.likes_count !== undefined && (
            <Group gap={4}>
              <IconHeart size={14} style={{ opacity: 0.5 }} />
              <Text size="xs" c="dimmed">{product.likes_count}</Text>
            </Group>
          )}
        </Group>

        <Group justify="space-between" align="center">
          <Text fw={700} size="lg" c="violet">
            от {formatPrice(product.min_price_cents)}
          </Text>
          <Button
            component={Link}
            href={`/catalog/${product.slug}`}
            size="xs"
            variant="light"
            color="violet"
            rightSection={<IconShoppingCart size={14} />}
          >
            Купить
          </Button>
        </Group>
      </Box>
    </Card>
  );
}
