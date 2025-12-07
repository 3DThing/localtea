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
    <Card className="product-card" p={0} radius="md" shadow="sm" style={{ overflow: 'hidden', margin: '0 auto' }}>
      <Link href={`/catalog/${product.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <Box className="image-wrapper" h={320} style={{ position: 'relative' }}>
          <Image
            src={product.main_image || 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800'}
            alt={product.title}
            h="100%"
            style={{ objectFit: 'cover' }}
          />
          {product.tea_type && (
            <Badge
              variant="filled"
              color="yellow"
              style={{
                position: 'absolute',
                top: 12,
                left: 12,
                zIndex: 3,
                background: 'rgba(218,160,80,0.95)',
                color: '#2b1f15',
                fontWeight: 700,
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
              color="gray"
              size="sm"
              style={{ background: 'rgba(0,0,0,0.35)', color: 'white' }}
            >
              <IconHeart size={14} />
            </ActionIcon>
          </Group>
        </Box>
      </Link>

      <Box p="md">
        <Text size="xs" c="dimmed" mb={4} style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>
          {product.category?.name || 'Чай'}
        </Text>
        <Link href={`/catalog/${product.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <Text fw={700} lineClamp={1} mb="xs" style={{ cursor: 'pointer' }}>
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

        <Group justify="space-between" align="center" style={{ marginTop: 8 }}>
          <Text fw={800} size="lg" style={{ color: '#d9a85b' }}>
            от {formatPrice(product.min_price_cents)}
          </Text>
          <Button
            component={Link}
            href={`/catalog/${product.slug}`}
            size="sm"
            variant="filled"
            color="yellow"
            rightSection={<IconShoppingCart size={14} />}
            style={{ background: '#d9a85b', color: '#2b1f15' }}
          >
            Купить
          </Button>
        </Group>
      </Box>
    </Card>
  );
}
