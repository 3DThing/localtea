'use client';

import { useEffect, useState } from 'react';
import { Affix, Box, Button, Group, Text, Anchor } from '@mantine/core';
import Link from 'next/link';
import { colors } from '@/lib/theme';

const STORAGE_KEY = 'cookie_consent_v1';

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      if (value !== 'accepted') {
        setVisible(true);
      }
    } catch {
      // If storage is unavailable, still show the banner.
      setVisible(true);
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'accepted');
    } catch {
      // Ignore storage errors.
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <Affix position={{ bottom: 18, left: 0, right: 0 }}>
      <Box px="md">
        <Box
          maw={980}
          mx="auto"
          p="md"
          style={{
            background: colors.bgOverlay,
            border: `1px solid ${colors.borderHover}`,
            borderRadius: 12,
            boxShadow: `0 18px 50px ${colors.shadowDark}`,
          }}
        >
          <Group justify="space-between" align="center" wrap="wrap" gap="md">
            <Text c={colors.textSecondary} size="sm" style={{ lineHeight: 1.5, flex: '1 1 520px' }}>
              Мы используем cookies, чтобы сайт работал корректно и был удобнее. Подробнее — в{' '}
              <Anchor component={Link} href="/privacy" style={{ color: colors.accent, fontWeight: 600 }}>
                Политике конфиденциальности
              </Anchor>
              .
            </Text>
            <Button
              onClick={accept}
              variant="gradient"
              gradient={{ from: colors.accent, to: colors.accentDark }}
              style={{ color: colors.textPrimary }}
            >
              Принять
            </Button>
          </Group>
        </Box>
      </Box>
    </Affix>
  );
}
