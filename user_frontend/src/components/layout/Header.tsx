'use client';

import { 
  Container, 
  Group, 
  Text, 
  Button, 
  Menu, 
  Avatar, 
  Badge,
  ActionIcon,
  Drawer,
  Stack,
  Divider,
  Burger,
  Box
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { 
  IconShoppingCart, 
  IconUser, 
  IconLogout, 
  IconSettings,
  IconHeart,
  IconMenu2
} from '@tabler/icons-react';
import Link from 'next/link';
import { useAuthStore, useCartStore } from '@/store';
import { useEffect } from 'react';

const navLinks = [
  { label: 'Главная', href: '/' },
  { label: 'Каталог', href: '/catalog' },
  { label: 'Блог', href: '/blog' },
  { label: 'О нас', href: '/about' },
];

export function Header() {
  const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] = useDisclosure(false);
  const { user, logout } = useAuthStore();
  const { items, fetchCart } = useCartStore();

  useEffect(() => {
    fetchCart();
  }, [fetchCart, user]);

  const cartItemsCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <>
      <Box
        component="header"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          background: 'rgba(10, 10, 15, 0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(117, 61, 218, 0.2)',
        }}
      >
        <Container size="xl" py="md">
          <Group justify="space-between">
            {/* Logo */}
            <Link href="/" style={{ textDecoration: 'none' }}>
              <Group gap="xs">
                <Text
                  size="xl"
                  fw={700}
                  style={{
                    background: 'linear-gradient(135deg, #753dda 0%, #ff922b 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontFamily: 'Georgia, serif',
                    letterSpacing: '2px',
                  }}
                >
                  ✦ LOCALTEA
                </Text>
              </Group>
            </Link>

            {/* Desktop Navigation */}
            <Group gap="xl" visibleFrom="md">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} style={{ textDecoration: 'none' }}>
                  <Text
                    size="sm"
                    c="dimmed"
                    style={{
                      transition: 'color 0.2s ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                    onMouseLeave={(e) => e.currentTarget.style.color = ''}
                  >
                    {link.label}
                  </Text>
                </Link>
              ))}
            </Group>

            {/* Actions */}
            <Group gap="md">
              {/* Cart */}
              <Link href="/cart" style={{ textDecoration: 'none' }}>
                <ActionIcon
                  variant="subtle"
                  size="lg"
                  color="gray"
                  style={{ position: 'relative' }}
                >
                  <IconShoppingCart size={22} />
                  {cartItemsCount > 0 && (
                    <Badge
                      size="xs"
                      color="violet"
                      style={{
                        position: 'absolute',
                        top: -5,
                        right: -5,
                        padding: '0 4px',
                        minWidth: 18,
                        height: 18,
                      }}
                    >
                      {cartItemsCount}
                    </Badge>
                  )}
                </ActionIcon>
              </Link>

              {/* User Menu */}
              {user ? (
                <Menu shadow="md" width={200} position="bottom-end">
                  <Menu.Target>
                    <Avatar
                      src={user.avatar_url}
                      radius="xl"
                      size="md"
                      style={{ cursor: 'pointer', border: '2px solid rgba(117, 61, 218, 0.5)' }}
                    >
                      {user.username?.charAt(0).toUpperCase()}
                    </Avatar>
                  </Menu.Target>

                  <Menu.Dropdown style={{ background: 'rgba(26, 27, 30, 0.95)', border: '1px solid rgba(117, 61, 218, 0.3)' }}>
                    <Menu.Label>
                      <Text size="xs" c="dimmed">Привет, {user.username}!</Text>
                    </Menu.Label>
                    <Menu.Item component={Link} href="/profile" leftSection={<IconUser size={16} />}>
                      Профиль
                    </Menu.Item>
                    <Menu.Item component={Link} href="/favorites" leftSection={<IconHeart size={16} />}>
                      Избранное
                    </Menu.Item>
                    <Menu.Item component={Link} href="/profile/settings" leftSection={<IconSettings size={16} />}>
                      Настройки
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item 
                      color="red" 
                      leftSection={<IconLogout size={16} />}
                      onClick={logout}
                    >
                      Выйти
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              ) : (
                <Group gap="xs" visibleFrom="sm">
                  <Button 
                    component={Link} 
                    href="/login" 
                    variant="subtle" 
                    color="gray"
                    size="sm"
                  >
                    Войти
                  </Button>
                  <Button 
                    component={Link} 
                    href="/register" 
                    variant="gradient"
                    gradient={{ from: 'violet', to: 'grape' }}
                    size="sm"
                  >
                    Регистрация
                  </Button>
                </Group>
              )}

              {/* Mobile Menu Toggle */}
              <Burger 
                opened={drawerOpened} 
                onClick={toggleDrawer} 
                hiddenFrom="md"
                color="white"
              />
            </Group>
          </Group>
        </Container>
      </Box>

      {/* Mobile Drawer */}
      <Drawer
        opened={drawerOpened}
        onClose={closeDrawer}
        title={
          <Text fw={700} style={{ background: 'linear-gradient(135deg, #753dda 0%, #ff922b 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ✦ LOCALTEA
          </Text>
        }
        padding="xl"
        size="xs"
        position="right"
        styles={{
          root: { },
          body: { background: 'rgba(10, 10, 15, 0.98)' },
          header: { background: 'rgba(10, 10, 15, 0.98)' },
        }}
      >
        <Stack gap="md">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={closeDrawer} style={{ textDecoration: 'none' }}>
              <Text size="lg" c="gray.3" py="xs">
                {link.label}
              </Text>
            </Link>
          ))}
          <Divider my="md" color="dark.4" />
          {!user && (
            <>
              <Button 
                component={Link} 
                href="/login" 
                variant="subtle" 
                color="gray"
                fullWidth
                onClick={closeDrawer}
              >
                Войти
              </Button>
              <Button 
                component={Link} 
                href="/register" 
                variant="gradient"
                gradient={{ from: 'violet', to: 'grape' }}
                fullWidth
                onClick={closeDrawer}
              >
                Регистрация
              </Button>
            </>
          )}
        </Stack>
      </Drawer>
    </>
  );
}
