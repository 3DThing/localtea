'use client';

import { Box, Text, Stack, Group, Button, ThemeIcon } from '@mantine/core';
import { IconAlertTriangle, IconPhone, IconMapPin, IconMail } from '@tabler/icons-react';
import Link from 'next/link';

interface DeliveryDataBannerProps {
  user: {
    address?: string;
    postal_code?: string;
    phone_number?: string;
    is_phone_confirmed?: boolean;
  };
  onVerifyPhone: () => void;
}

export default function DeliveryDataBanner({ user, onVerifyPhone }: DeliveryDataBannerProps) {
  const missingAddress = !user.address;
  const missingPostalCode = !user.postal_code;
  const missingPhone = !user.phone_number;
  const phoneNotVerified = user.phone_number && !user.is_phone_confirmed;

  const hasIssues = missingAddress || missingPostalCode || missingPhone || phoneNotVerified;

  if (!hasIssues) return null;

  const issues = [];
  if (missingAddress) issues.push({ icon: IconMapPin, text: 'Не указан адрес доставки' });
  if (missingPostalCode) issues.push({ icon: IconMail, text: 'Не указан почтовый индекс' });
  if (missingPhone) issues.push({ icon: IconPhone, text: 'Не указан номер телефона' });
  if (phoneNotVerified) issues.push({ icon: IconPhone, text: 'Номер телефона не подтвержден', action: 'verify' });

  return (
    <Box
      p="lg"
      mb="xl"
      style={{
        background: 'linear-gradient(135deg, rgba(250,204,21,0.15), rgba(212,137,79,0.1))',
        border: '1px solid rgba(250,204,21,0.3)',
        borderRadius: 12,
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
      }}
    >
      <Group gap="md" align="flex-start" mb="md">
        <ThemeIcon
          size={40}
          radius="xl"
          style={{ background: 'rgba(250,204,21,0.2)' }}
        >
          <IconAlertTriangle size={22} style={{ color: '#facc15' }} />
        </ThemeIcon>
        <Box style={{ flex: 1 }}>
          <Text fw={600} size="lg" style={{ color: '#fbf6ee' }} mb={4}>
            Заполните данные для доставки
          </Text>
          <Text size="sm" style={{ color: '#e8dcc8' }}>
            Для оформления заказа необходимо указать данные для доставки
          </Text>
        </Box>
      </Group>

      <Stack gap="sm" mb="md">
        {issues.map((issue, index) => (
          <Group key={index} gap="sm" justify="space-between">
            <Group gap="xs">
              <issue.icon size={16} style={{ color: issue.action ? '#facc15' : '#e8dcc8' }} />
              <Text size="sm" style={{ color: issue.action ? '#facc15' : '#e8dcc8' }}>
                {issue.text}
              </Text>
            </Group>
            {issue.action === 'verify' && (
              <Button
                size="xs"
                variant="light"
                color="yellow"
                onClick={onVerifyPhone}
                leftSection={<IconPhone size={14} />}
              >
                Подтвердить
              </Button>
            )}
          </Group>
        ))}
      </Stack>

      {(missingAddress || missingPostalCode || missingPhone) && (
        <Button
          component={Link}
          href="/profile?tab=settings"
          variant="gradient"
          gradient={{ from: '#facc15', to: '#d4894f' }}
          size="sm"
          style={{ color: '#1a1a1a' }}
        >
          Заполнить данные
        </Button>
      )}
    </Box>
  );
}
