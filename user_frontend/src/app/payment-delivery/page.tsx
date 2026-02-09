'use client';

import { Anchor, Container, Divider, List, Stack, Text, Title } from '@mantine/core';
import Link from 'next/link';
import { colors } from '@/lib/theme';

const LAST_UPDATED = '26.12.2025';

export default function PaymentDeliveryPage() {
  return (
    <Container size="md" py="xl">
      <Stack gap="md">
        <Title order={1} style={{ color: colors.textPrimary }}>
          Оплата и доставка
        </Title>
        <Text size="sm" c={colors.textMuted}>
          Дата последнего обновления: {LAST_UPDATED}
        </Text>

        <Divider my="sm" style={{ borderColor: 'rgba(212,137,79,0.12)' }} />

        <Title order={3} style={{ color: colors.textPrimary }}>
          Оплата
        </Title>
        <Text c={colors.textSecondary} style={{ lineHeight: 1.8 }}>
          Оплата заказов осуществляется через платёжный сервис ЮKassa (Юкасса). Доступные способы оплаты отображаются на
          этапе оформления заказа.
        </Text>

        <Title order={3} style={{ color: colors.textPrimary }}>
          Доставка
        </Title>
        <Text c={colors.textSecondary} style={{ lineHeight: 1.8 }}>
          На текущий момент доступны следующие способы получения заказа:
        </Text>
        <List spacing="xs" c={colors.textSecondary}>
          <List.Item>
            <b>Почта России</b> — доставка на указанный при оформлении заказа адрес.
          </List.Item>
          <List.Item>
            <b>Самовывоз</b> — г. Москва, улица Строжевая, дом 4, строение 8.
          </List.Item>
        </List>

        <Text c={colors.textSecondary} style={{ lineHeight: 1.8 }}>
          Стоимость и сроки доставки зависят от выбранного способа и региона и указываются при оформлении заказа.
        </Text>

        <Divider my="sm" style={{ borderColor: 'rgba(212,137,79,0.12)' }} />

        <Text size="sm" c={colors.textMuted}>
          Контактная информация и карта расположены на странице{' '}
          <Anchor component={Link} href="/about" style={{ color: colors.accent, fontWeight: 600 }}>
            О нас
          </Anchor>
          .
        </Text>
      </Stack>
    </Container>
  );
}
