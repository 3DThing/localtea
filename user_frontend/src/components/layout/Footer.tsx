'use client';

import { Container, Group, Text, Stack, Anchor, Divider, Box } from '@mantine/core';
import { IconBrandTelegram, IconBrandVk, IconMail, IconPhone } from '@tabler/icons-react';
import Link from 'next/link';

export function Footer() {
  return (
    <Box
      component="footer"
      style={{
        background: 'linear-gradient(180deg, transparent 0%, rgba(10, 10, 15, 0.95) 20%)',
        borderTop: '1px solid rgba(117, 61, 218, 0.15)',
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
                background: 'linear-gradient(135deg, #753dda 0%, #ff922b 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontFamily: 'Georgia, serif',
              }}
            >
              ✦ LOCALTEA
            </Text>
            <Text size="sm" c="dimmed">
              Погрузитесь в мир изысканных чаёв. Каждая чашка — это путешествие в мир вкуса и аромата.
            </Text>
            <Group gap="md">
              <Anchor href="https://t.me/localtea" target="_blank" c="dimmed">
                <IconBrandTelegram size={24} />
              </Anchor>
              <Anchor href="https://vk.com/localtea" target="_blank" c="dimmed">
                <IconBrandVk size={24} />
              </Anchor>
            </Group>
          </Stack>

          {/* Navigation */}
          <Stack gap="xs">
            <Text fw={600} mb="xs">Навигация</Text>
            <Anchor component={Link} href="/" c="dimmed" size="sm">Главная</Anchor>
            <Anchor component={Link} href="/catalog" c="dimmed" size="sm">Каталог</Anchor>
            <Anchor component={Link} href="/blog" c="dimmed" size="sm">Блог</Anchor>
            <Anchor component={Link} href="/about" c="dimmed" size="sm">О нас</Anchor>
          </Stack>

          {/* Categories */}
          <Stack gap="xs">
            <Text fw={600} mb="xs">Категории</Text>
            <Anchor component={Link} href="/catalog?category=green" c="dimmed" size="sm">Зелёный чай</Anchor>
            <Anchor component={Link} href="/catalog?category=black" c="dimmed" size="sm">Чёрный чай</Anchor>
            <Anchor component={Link} href="/catalog?category=oolong" c="dimmed" size="sm">Улун</Anchor>
            <Anchor component={Link} href="/catalog?category=puer" c="dimmed" size="sm">Пуэр</Anchor>
          </Stack>

          {/* Contact */}
          <Stack gap="xs">
            <Text fw={600} mb="xs">Контакты</Text>
            <Group gap="xs">
              <IconMail size={16} style={{ color: 'var(--mantine-color-dimmed)' }} />
              <Anchor href="mailto:info@localtea.ru" c="dimmed" size="sm">info@localtea.ru</Anchor>
            </Group>
            <Group gap="xs">
              <IconPhone size={16} style={{ color: 'var(--mantine-color-dimmed)' }} />
              <Anchor href="tel:+79001234567" c="dimmed" size="sm">+7 (900) 123-45-67</Anchor>
            </Group>
          </Stack>
        </Group>

        <Divider my="xl" color="dark.5" />

        <Group justify="space-between">
          <Text size="xs" c="dimmed">
            © {new Date().getFullYear()} LocalTea. Все права защищены.
          </Text>
          <Group gap="md">
            <Anchor component={Link} href="/privacy" c="dimmed" size="xs">
              Политика конфиденциальности
            </Anchor>
            <Anchor component={Link} href="/terms" c="dimmed" size="xs">
              Условия использования
            </Anchor>
          </Group>
        </Group>
      </Container>
    </Box>
  );
}
