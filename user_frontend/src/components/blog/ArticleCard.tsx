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
          background: 'linear-gradient(90deg, rgba(36,24,14,0.92), rgba(20,16,12,0.96))',
          border: '1px solid rgba(212,137,79,0.07)',
          boxShadow: '0 8px 30px rgba(10,8,6,0.6)',
          transition: 'transform 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease',
          borderRadius: 12,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(212,137,79,0.22)';
          e.currentTarget.style.transform = 'translateY(-6px)';
          e.currentTarget.style.boxShadow = '0 16px 44px rgba(8,6,4,0.65)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(212,137,79,0.07)';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 8px 30px rgba(10,8,6,0.6)';
        }}
      >
        {/* Image */}
        <Box style={{ width: 320, flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
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
              background: 'linear-gradient(to right, rgba(0,0,0,0.05) 30%, rgba(20,16,12,0.9) 100%)',
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
            <Text size="xl" fw={700} c="#fbf6ee" mb="xs" lineClamp={1} style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              {article.title}
            </Text>
            <Text size="sm" c="#e8dcc8" lineClamp={2} mb="md">
              {truncateText(article.content.replace(/<[^>]*>/g, ''), 150)}
            </Text>
          </Box>

          <Group justify="space-between" align="center">
              <Group gap="lg">
              <Group gap={4}>
                <IconEye size={16} style={{ color: '#d9b37a' }} />
                <Text size="sm" c="#e8dcc8">{article.views_count.toLocaleString('ru-RU')}</Text>
              </Group>
              <Group gap={4}>
                <IconHeart size={16} style={{ color: '#d4894f' }} />
                <Text size="sm" c="#e8dcc8">{article.likes_count}</Text>
              </Group>
              <Group gap={4}>
                <IconMessage size={16} style={{ color: '#d9b37a' }} />
                <Text size="sm" c="#e8dcc8">{article.comments_count}</Text>
              </Group>
            </Group>

            <Button
              variant="subtle"
              color="orange"
              rightSection={<IconArrowRight size={14} />}
              size="sm"
              style={{ color: '#f8efe0' }}
            >
              Читать полностью
            </Button>
          </Group>
        </Box>
      </Box>
    </Link>
  );
}
