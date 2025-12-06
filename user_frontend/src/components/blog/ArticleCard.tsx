'use client';

import { Box, Image, Text, Group, Button } from '@mantine/core';
import { IconEye, IconHeart, IconMessage, IconArrowRight } from '@tabler/icons-react';
import Link from 'next/link';

interface ArticleCardProps {
  article: {
    id: number;
    slug: string;
    title: string;
    content: string;
    preview_image?: string;
    views_count: number;
    likes_count: number;
    comments_count: number;
  };
}

export function ArticleCard({ article }: ArticleCardProps) {
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '...';
  };

  return (
    <Link href={`/blog/${article.slug}`} style={{ textDecoration: 'none' }}>
      <Box
        className="banner-card"
        style={{
          display: 'flex',
          flexDirection: 'row',
          height: 200,
          overflow: 'hidden',
          background: 'rgba(26, 27, 30, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          transition: 'all 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(117, 61, 218, 0.3)';
          e.currentTarget.style.transform = 'translateY(-4px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        {/* Image */}
        <Box style={{ width: 300, flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
          <Image
            src={article.preview_image || 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400'}
            alt={article.title}
            h="100%"
            w="100%"
            style={{ objectFit: 'cover' }}
          />
          <Box
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to right, transparent 50%, rgba(26, 27, 30, 1) 100%)',
            }}
          />
        </Box>

        {/* Content */}
        <Box
          style={{
            flex: 1,
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <Box>
            <Text size="xl" fw={700} c="white" mb="xs" lineClamp={1}>
              {article.title}
            </Text>
            <Text size="sm" c="gray.5" lineClamp={2} mb="md">
              {truncateText(article.content.replace(/<[^>]*>/g, ''), 150)}
            </Text>
          </Box>

          <Group justify="space-between" align="center">
            <Group gap="lg">
              <Group gap={4}>
                <IconEye size={16} style={{ color: 'var(--mantine-color-dimmed)' }} />
                <Text size="sm" c="dimmed">{article.views_count.toLocaleString('ru-RU')}</Text>
              </Group>
              <Group gap={4}>
                <IconHeart size={16} style={{ color: 'var(--mantine-color-dimmed)' }} />
                <Text size="sm" c="dimmed">{article.likes_count}</Text>
              </Group>
              <Group gap={4}>
                <IconMessage size={16} style={{ color: 'var(--mantine-color-dimmed)' }} />
                <Text size="sm" c="dimmed">{article.comments_count}</Text>
              </Group>
            </Group>

            <Button
              variant="subtle"
              color="violet"
              rightSection={<IconArrowRight size={14} />}
              size="sm"
            >
              Читать полностью
            </Button>
          </Group>
        </Box>
      </Box>
    </Link>
  );
}
