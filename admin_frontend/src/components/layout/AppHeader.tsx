'use client';

import { Group, Burger, ActionIcon, useMantineColorScheme, useComputedColorScheme, Avatar, Menu, rem } from '@mantine/core';
import { IconSun, IconMoon, IconLogout, IconUser } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

interface AppHeaderProps {
  opened: boolean;
  toggle: () => void;
}

export function AppHeader({ opened, toggle }: AppHeaderProps) {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    router.push('/login');
  };

  return (
    <Group h="100%" px="sm" justify="space-between">
      <Group>
        <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
      </Group>

      <Group gap="xs">
        <ActionIcon
          onClick={() => setColorScheme(computedColorScheme === 'light' ? 'dark' : 'light')}
          variant="default"
          size="md"
          aria-label="Toggle color scheme"
        >
          <IconSun size={16} className={computedColorScheme === 'dark' ? 'mantine-visible-dark' : 'mantine-hidden-dark'} stroke={1.5} />
          <IconMoon size={16} className={computedColorScheme === 'light' ? 'mantine-visible-dark' : 'mantine-hidden-dark'} stroke={1.5} />
        </ActionIcon>

        <Menu shadow="md" width={180}>
          <Menu.Target>
            <Avatar radius="xl" size="sm" color="teal" style={{ cursor: 'pointer' }}>
              <IconUser size={16} />
            </Avatar>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Label>Аккаунт</Menu.Label>
            <Menu.Item leftSection={<IconUser style={{ width: rem(14), height: rem(14) }} />}>
              Профиль
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item 
              color="red" 
              leftSection={<IconLogout style={{ width: rem(14), height: rem(14) }} />}
              onClick={handleLogout}
            >
              Выйти
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Group>
  );
}
