'use client';

import { Container, Group, Text, Stack, Anchor, Divider, Box, Skeleton } from '@mantine/core';
import { IconBrandTelegram, IconBrandVk, IconMail, IconPhone } from '@tabler/icons-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '@/lib/api';
import { colors } from '@/lib/theme';

export function Footer() {
  return (
    <Box
      component="footer"
      style={{
        background: 'linear-gradient(180deg, transparent 0%, rgba(18,14,10,0.95) 20%)',
        borderTop: `1px solid ${colors.border}`,
        marginTop: '80px',
      }}
    >
      <Container size="xl" py="xl">
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="xl">
          {/* Logo & Description */}
          <Stack gap="md" style={{ maxWidth: 300 }}>
            <Text
              size="xl"
              fw={700}
              style={{
                background: colors.gradientLogo,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontFamily: 'Georgia, serif',
              }}
            >
              ✦ LOCALTEA
            </Text>
            <Text size="sm" c={colors.textSecondary}>
              Погрузитесь в мир изысканных чаёв. Каждая чашка — это путешествие в мир вкуса и аромата.
            </Text>
            <Group gap="md">
              <Anchor 
                href="https://t.me/localtea" 
                target="_blank" 
                style={{ color: colors.textMuted, transition: 'color 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.color = colors.accent}
                onMouseLeave={(e) => e.currentTarget.style.color = colors.textMuted}
              >
                <IconBrandTelegram size={24} />
              </Anchor>
              <Anchor 
                href="https://vk.com/localtea" 
                target="_blank" 
                style={{ color: colors.textMuted, transition: 'color 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.color = colors.accent}
                onMouseLeave={(e) => e.currentTarget.style.color = colors.textMuted}
              >
                <IconBrandVk size={24} />
              </Anchor>
            </Group>
          </Stack>

          {/* Navigation */}
          <Stack gap="xs">
            <Text fw={600} mb="xs" style={{ color: colors.textPrimary }}>Навигация</Text>
            <FooterLink href="/">Главная</FooterLink>
            <FooterLink href="/catalog">Каталог</FooterLink>
            <FooterLink href="/blog">Блог</FooterLink>
            <FooterLink href="/about">О нас</FooterLink>
            
          </Stack>

          {/* Categories */}
          <Stack gap="xs">
            <Text fw={600} mb="xs" style={{ color: colors.textPrimary }}>Категории</Text>
            <CategoriesList />
          </Stack>

          {/* Contact */}
          <Stack gap="xs">
            <Text fw={600} mb="xs" style={{ color: colors.textPrimary }}>Контакты</Text>
            <Group gap="xs">
              <IconMail size={16} style={{ color: colors.textMuted }} />
              <Anchor 
                href="mailto:info@localtea.ru" 
                size="sm"
                style={{ color: colors.textSecondary, transition: 'color 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.color = colors.accent}
                onMouseLeave={(e) => e.currentTarget.style.color = colors.textSecondary}
              >
                info@localtea.ru
              </Anchor>
            </Group>
            <Group gap="xs">
              <IconPhone size={16} style={{ color: colors.textMuted }} />
              <Anchor 
                href="tel:+79001234567" 
                size="sm"
                style={{ color: colors.textSecondary, transition: 'color 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.color = colors.accent}
                onMouseLeave={(e) => e.currentTarget.style.color = colors.textSecondary}
              >
                +7 (900) 123-45-67
              </Anchor>
              
            </Group>
            <FooterLink href="/for-business" style={{ color: '#ff8c00' }}>Для юридических лиц</FooterLink>
          </Stack>
        </Group>

        <Divider my="xl" style={{ borderColor: 'rgba(212,137,79,0.1)' }} />

        <Group justify="space-between">
          <Text size="xs" c={colors.textMuted}>
            © {new Date().getFullYear()} LocalTea. Все права защищены.
          </Text>
          <Group gap="md">
            <FooterLink href="/privacy" size="xs">
              Политика конфиденциальности
            </FooterLink>
            <FooterLink href="/terms" size="xs">
              Условия использования
            </FooterLink>
          </Group>
        </Group>
      </Container>
    </Box>
  );
}

// Helper component for footer links
function FooterLink({ 
  href, 
  children, 
  size = 'sm',
  style,
  ...rest
}: { 
  href: string; 
  children: React.ReactNode; 
  size?: 'xs' | 'sm';
  style?: React.CSSProperties;
  [key: string]: any;
}) {
  const mergedStyle: React.CSSProperties = {
    color: colors.textSecondary,
    transition: 'color 0.2s',
    textDecoration: 'none',
    ...(style || {}),
  };

  // preserve the base color (either passed via props or default)
  const baseColor = (mergedStyle.color as string) || colors.textSecondary;

  // make links visually stand out by default (semibold)
  mergedStyle.fontWeight = (mergedStyle.fontWeight as any) || 600;

  return (
    <Anchor
      component={Link}
      href={href}
      size={size}
      {...rest}
      style={mergedStyle}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.color = colors.accent;
      }}
      onMouseLeave={(e) => {
        // restore the original color passed via props (or default)
        (e.currentTarget as HTMLElement).style.color = baseColor;
      }}
    >
      {children}
    </Anchor>
  );
}

// Categories list component
function CategoriesList() {
  const { data: categoriesData, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => catalogApi.getCategories(),
  });

  const categories = categoriesData?.data || [];

  if (isLoading) {
    return (
      <>
        <Skeleton height={14} width={120} mb={6} style={{ background: 'rgba(212,137,79,0.1)' }} />
        <Skeleton height={14} width={100} mb={6} style={{ background: 'rgba(212,137,79,0.1)' }} />
        <Skeleton height={14} width={80} mb={6} style={{ background: 'rgba(212,137,79,0.1)' }} />
        <Skeleton height={14} width={90} style={{ background: 'rgba(212,137,79,0.1)' }} />
      </>
    );
  }

  return (
    <>
      {categories.slice(0, 6).map((cat: any) => (
        <FooterLink key={cat.id} href={`/catalog?category=${cat.id}`}>
          {cat.name}
        </FooterLink>
      ))}
    </>
  );
}
