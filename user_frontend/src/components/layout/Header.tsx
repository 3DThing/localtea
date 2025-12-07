"use client";

import React, { useEffect } from "react";
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
  Box,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconShoppingCart,
  IconUser,
  IconLogout,
  IconSettings,
  IconHeart,
} from "@tabler/icons-react";
import Link from "next/link";
import { useAuthStore, useCartStore } from "@/store";
import { colors } from "@/lib/theme";

const navLinks = [
  { label: "Главная", href: "/" },
  { label: "Каталог", href: "/catalog" },
  { label: "Блог", href: "/blog" },
  { label: "О нас", href: "/about" },
];

export function Header() {
  const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] = useDisclosure(false);
  const { user, logout } = useAuthStore();
  const { items, fetchCart } = useCartStore();

  useEffect(() => {
    fetchCart();
  }, [fetchCart, user]);

  const cartItemsCount = items.reduce((acc: number, item: any) => acc + item.quantity, 0);

  return (
    <>
      <Box
        component="header"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          background: colors.gradientHeader,
          backdropFilter: "blur(10px)",
          borderBottom: `1px solid ${colors.borderLight}`,
          boxShadow: "0 6px 24px rgba(6,4,3,0.6)",
        }}
      >
        <Container size="xl" py="md">
          <Group justify="space-between">
            {/* Logo */}
            <Link href="/" style={{ textDecoration: "none" }}>
              <Group gap="xs">
                <Text
                  size="xl"
                  fw={700}
                  style={{
                    background: colors.gradientLogo,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    fontFamily: "Georgia, serif",
                    letterSpacing: "2px",
                  }}
                >
                  ✦ LOCALTEA
                </Text>
              </Group>
            </Link>

            {/* Desktop Navigation */}
            <Group gap="xl" visibleFrom="md">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} style={{ textDecoration: "none" }}>
                  <Text
                    size="sm"
                    style={{
                      color: colors.textSecondary,
                      transition: "color 0.2s ease",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = colors.textPrimary)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = colors.textSecondary)}
                  >
                    {link.label}
                  </Text>
                </Link>
              ))}
            </Group>

            {/* Actions */}
            <Group gap="md">
              {/* Cart */}
              <Link href="/cart" style={{ textDecoration: "none" }}>
                <ActionIcon
                  variant="transparent"
                  size="lg"
                  color="gray"
                  aria-label="Открыть корзину"
                  style={{ 
                    position: "relative", 
                    background: "transparent", 
                    border: "none", 
                    padding: 8, 
                    overflow: "visible" 
                  }}
                >
                  <IconShoppingCart size={22} style={{ color: colors.textSecondary }} />
                  {cartItemsCount > 0 && (
                    <Badge
                      size="xs"
                      style={{
                        position: "absolute",
                        top: -8,
                        right: -8,
                        padding: "0 8px",
                        minWidth: 22,
                        height: 22,
                        fontSize: 12,
                        lineHeight: "20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        whiteSpace: "nowrap",
                        background: colors.accent,
                        color: "#fff",
                        border: "none",
                        borderRadius: 999,
                        boxShadow: "0 6px 18px rgba(212,137,79,0.18)",
                        zIndex: 2300,
                        overflow: "visible",
                      }}
                    >
                      {cartItemsCount > 99 ? "99+" : cartItemsCount}
                    </Badge>
                  )}
                </ActionIcon>
              </Link>

              {/* User Menu */}
              {user ? (
                <Menu
                  shadow="lg"
                  width={220}
                  position="bottom-end"
                  styles={{
                    dropdown: {
                      background: colors.bgOverlay,
                      border: `1px solid ${colors.border}`,
                      boxShadow: "0 12px 40px rgba(2,2,2,0.6)",
                      zIndex: 2200,
                      padding: 8,
                      borderRadius: 12,
                    },
                    item: {
                      color: colors.textSecondary,
                    },
                  }}
                >
                  <Menu.Target>
                    <Avatar
                      src={user.avatar_url}
                      radius="xl"
                      size="md"
                      style={{ 
                        cursor: "pointer", 
                        border: `2px solid ${colors.border}`, 
                        boxShadow: "0 6px 18px rgba(212,137,79,0.06)" 
                      }}
                    >
                      {user.username?.charAt(0).toUpperCase()}
                    </Avatar>
                  </Menu.Target>

                  <Menu.Dropdown>
                    <Menu.Label>
                      <Text size="xs" c={colors.textMuted}>
                        Привет, {user.username}!
                      </Text>
                    </Menu.Label>
                    <Menu.Item 
                      component={Link} 
                      href="/profile" 
                      leftSection={<IconUser size={16} />}
                    >
                      Профиль
                    </Menu.Item>
                    <Menu.Item 
                      component={Link} 
                      href="/profile?tab=favorites" 
                      leftSection={<IconHeart size={16} />}
                    >
                      Избранное
                    </Menu.Item>
                    <Menu.Item 
                      component={Link} 
                      href="/profile?tab=settings" 
                      leftSection={<IconSettings size={16} />}
                    >
                      Настройки
                    </Menu.Item>
                    <Menu.Divider style={{ borderColor: colors.border }} />
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
                    size="sm" 
                    style={{ color: colors.textSecondary }}
                  >
                    Войти
                  </Button>
                  <Button 
                    component={Link} 
                    href="/register" 
                    variant="gradient" 
                    gradient={colors.gradientButton} 
                    size="sm" 
                    style={{ 
                      borderRadius: 10, 
                      boxShadow: "0 8px 24px rgba(212,137,79,0.12)", 
                      color: "#fff" 
                    }}
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
                color={colors.textSecondary} 
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
          <Text 
            fw={700} 
            style={{ 
              background: colors.gradientLogo, 
              WebkitBackgroundClip: "text", 
              WebkitTextFillColor: "transparent" 
            }}
          >
            ✦ LOCALTEA
          </Text>
        }
        padding="xl"
        size="xs"
        position="right"
        styles={{ 
          root: {}, 
          body: { 
            background: colors.bgOverlay,
          }, 
          header: { 
            background: colors.bgOverlay,
            borderBottom: `1px solid ${colors.border}`,
          },
          close: {
            color: colors.textSecondary,
            '&:hover': {
              background: 'rgba(212,137,79,0.1)',
            },
          },
        }}
      >
        <Stack gap="md">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={closeDrawer} style={{ textDecoration: "none" }}>
              <Text 
                size="lg" 
                py="xs"
                style={{ 
                  color: colors.textSecondary,
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = colors.textPrimary}
                onMouseLeave={(e) => e.currentTarget.style.color = colors.textSecondary}
              >
                {link.label}
              </Text>
            </Link>
          ))}

          <Divider my="md" style={{ borderColor: colors.border }} />

          {user ? (
            <Stack gap="sm">
              <Link href="/profile" onClick={closeDrawer} style={{ textDecoration: "none" }}>
                <Text size="md" style={{ color: colors.textSecondary }}>
                  Профиль
                </Text>
              </Link>
              <Link href="/profile?tab=favorites" onClick={closeDrawer} style={{ textDecoration: "none" }}>
                <Text size="md" style={{ color: colors.textSecondary }}>
                  Избранное
                </Text>
              </Link>
              <Link href="/profile?tab=settings" onClick={closeDrawer} style={{ textDecoration: "none" }}>
                <Text size="md" style={{ color: colors.textSecondary }}>
                  Настройки
                </Text>
              </Link>
              <Button 
                variant="subtle" 
                color="red" 
                onClick={() => { closeDrawer(); logout(); }} 
                fullWidth
                mt="sm"
              >
                Выйти
              </Button>
            </Stack>
          ) : (
            <Stack gap="sm">
              <Button 
                component={Link} 
                href="/login" 
                variant="subtle" 
                fullWidth 
                onClick={closeDrawer} 
                style={{ color: colors.textSecondary }}
              >
                Войти
              </Button>
              <Button 
                component={Link} 
                href="/register" 
                variant="gradient" 
                gradient={colors.gradientButton} 
                fullWidth 
                onClick={closeDrawer} 
                style={{ 
                  borderRadius: 10, 
                  boxShadow: "0 10px 30px rgba(212,137,79,0.14)", 
                  color: "#fff" 
                }}
              >
                Регистрация
              </Button>
            </Stack>
          )}
        </Stack>
      </Drawer>
    </>
  );
}
