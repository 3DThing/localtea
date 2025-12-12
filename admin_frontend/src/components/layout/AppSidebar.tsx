'use client';

import { Group, ScrollArea, NavLink, Text, ThemeIcon, Tooltip, ActionIcon, Stack, Divider, Box } from '@mantine/core';
import {
  IconGauge,
  IconUsers,
  IconShoppingCart,
  IconCategory,
  IconLogout,
  IconLeaf,
  IconChevronLeft,
  IconChevronRight,
  IconArticle,
  IconDiscount2,
  IconShield,
  IconPackage,
  IconReceiptRefund,
  IconChartBar,
  IconCash,
} from '@tabler/icons-react';
import { useRouter, usePathname } from 'next/navigation';

const data = [
  { link: '/dashboard', label: 'Дашборд', icon: IconGauge },
  { link: '/dashboard/catalog', label: 'Каталог', icon: IconCategory },
  { link: '/dashboard/orders', label: 'Заказы', icon: IconShoppingCart },
  { link: '/dashboard/users', label: 'Пользователи', icon: IconUsers },
  { link: '/dashboard/blog', label: 'Блог', icon: IconArticle },
  { link: '/dashboard/promo-codes', label: 'Промокоды', icon: IconDiscount2 },
  { link: '/dashboard/inventory', label: 'Склад', icon: IconPackage },
  { link: '/dashboard/finance', label: 'Финансы', icon: IconCash },
  { link: '/dashboard/moderation', label: 'Модерация', icon: IconShield },
  { link: '/dashboard/refunds', label: 'Возвраты', icon: IconReceiptRefund },
  { link: '/dashboard/analytics', label: 'Аналитика', icon: IconChartBar },
];

interface AppSidebarProps {
  collapsed: boolean;
  toggleCollapsed: () => void;
}

export function AppSidebar({ collapsed, toggleCollapsed }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    router.push('/login');
  };

  const links = data.map((item) => {
    const isActive = pathname === item.link || (item.link !== '/dashboard' && pathname.startsWith(item.link));
    
    if (collapsed) {
      return (
        <Tooltip key={item.label} label={item.label} position="right" withArrow>
          <ActionIcon
            variant={isActive ? 'light' : 'subtle'}
            color={isActive ? 'teal' : 'gray'}
            size="lg"
            onClick={() => router.push(item.link)}
            style={{ width: '100%' }}
          >
            <item.icon size={20} stroke={1.5} />
          </ActionIcon>
        </Tooltip>
      );
    }

    return (
      <NavLink
        key={item.label}
        active={isActive}
        label={item.label}
        leftSection={<item.icon size={18} stroke={1.5} />}
        onClick={() => router.push(item.link)}
        variant="light"
        color="teal"
        styles={{ label: { fontSize: 14 } }}
      />
    );
  });

  return (
    <nav style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo */}
      <Box pb="xs" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
        {collapsed ? (
          <Tooltip label="LocalTea Admin" position="right" withArrow>
            <Group justify="center">
              <ThemeIcon variant="light" size={36} color="teal">
                <IconLeaf size={20} />
              </ThemeIcon>
            </Group>
          </Tooltip>
        ) : (
          <Group gap="xs">
            <ThemeIcon variant="light" size={28} color="teal">
              <IconLeaf size={16} />
            </ThemeIcon>
            <Text fw={600} size="sm">LocalTea Admin</Text>
          </Group>
        )}
      </Box>

      {/* Nav Links */}
      <ScrollArea style={{ flex: 1 }} py="xs">
        <Stack gap={collapsed ? 6 : 2}>
          {links}
        </Stack>
      </ScrollArea>

      {/* Bottom section */}
      <Box pt="xs" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
        <Stack gap={4}>
          {collapsed ? (
            <>
              <Tooltip label="Выйти" position="right" withArrow>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  size="lg"
                  onClick={handleLogout}
                  style={{ width: '100%' }}
                >
                  <IconLogout size={20} stroke={1.5} />
                </ActionIcon>
              </Tooltip>
              <Divider my={4} />
              <Tooltip label="Развернуть меню" position="right" withArrow>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="lg"
                  onClick={toggleCollapsed}
                  style={{ width: '100%' }}
                >
                  <IconChevronRight size={18} stroke={1.5} />
                </ActionIcon>
              </Tooltip>
            </>
          ) : (
            <>
              <NavLink
                label="Выйти"
                leftSection={<IconLogout size={18} stroke={1.5} />}
                onClick={handleLogout}
                color="red"
                variant="subtle"
                styles={{ label: { fontSize: 14 } }}
              />
              <Divider my={4} />
              <NavLink
                label="Свернуть меню"
                leftSection={<IconChevronLeft size={18} stroke={1.5} />}
                onClick={toggleCollapsed}
                color="gray"
                variant="subtle"
                styles={{ label: { fontSize: 14 } }}
              />
            </>
          )}
        </Stack>
      </Box>
    </nav>
  );
}
