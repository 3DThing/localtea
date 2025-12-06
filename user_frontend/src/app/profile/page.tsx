'use client';

import {
  Container,
  Title,
  Text,
  Box,
  Stack,
  Card,
  Group,
  Avatar,
  Button,
  TextInput,
  Divider,
  Tabs,
} from '@mantine/core';
import { IconUser, IconHeart, IconShoppingBag, IconSettings, IconLogout } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { useEffect } from 'react';

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout, isLoading } = useAuthStore();

  useEffect(() => {
    if (!user && !isLoading) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (!user) {
    return (
      <Container size="md" py={80} ta="center">
        <Text c="dimmed">Загрузка...</Text>
      </Container>
    );
  }

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <Container size="lg" py="xl">
      {/* Header */}
      <Card
        p="xl"
        radius="lg"
        mb="xl"
        style={{
          background: 'linear-gradient(135deg, rgba(67, 22, 151, 0.3) 0%, rgba(191, 64, 0, 0.2) 100%)',
          border: '1px solid rgba(117, 61, 218, 0.3)',
        }}
      >
        <Group gap="xl">
          <Avatar
            src={user.avatar_url}
            size={120}
            radius={120}
            style={{
              border: '4px solid rgba(117, 61, 218, 0.5)',
              boxShadow: '0 0 40px rgba(117, 61, 218, 0.3)',
            }}
          >
            {user.username?.charAt(0).toUpperCase()}
          </Avatar>

          <Stack gap="xs">
            <Title order={2}>{user.username}</Title>
            <Text c="dimmed">{user.email}</Text>
            {!user.is_email_confirmed && (
              <Text size="sm" c="orange">
                ⚠️ Email не подтверждён
              </Text>
            )}
          </Stack>

          <Box style={{ marginLeft: 'auto' }}>
            <Button
              variant="subtle"
              color="red"
              leftSection={<IconLogout size={16} />}
              onClick={handleLogout}
            >
              Выйти
            </Button>
          </Box>
        </Group>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="profile" color="violet">
        <Tabs.List mb="xl">
          <Tabs.Tab value="profile" leftSection={<IconUser size={16} />}>
            Профиль
          </Tabs.Tab>
          <Tabs.Tab value="orders" leftSection={<IconShoppingBag size={16} />}>
            Заказы
          </Tabs.Tab>
          <Tabs.Tab value="favorites" leftSection={<IconHeart size={16} />}>
            Избранное
          </Tabs.Tab>
          <Tabs.Tab value="settings" leftSection={<IconSettings size={16} />}>
            Настройки
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="profile">
          <Card
            p="xl"
            radius="lg"
            style={{
              background: 'rgba(26, 27, 30, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <Title order={4} mb="lg">Личная информация</Title>

            <Stack gap="md">
              <Group grow>
                <TextInput
                  label="Имя"
                  value={user.firstname || ''}
                  readOnly
                  placeholder="Не указано"
                />
                <TextInput
                  label="Фамилия"
                  value={user.lastname || ''}
                  readOnly
                  placeholder="Не указано"
                />
              </Group>

              <TextInput
                label="Email"
                value={user.email}
                readOnly
              />

              <TextInput
                label="Имя пользователя"
                value={user.username}
                readOnly
              />
            </Stack>

            <Divider my="xl" color="dark.5" />

            <Button variant="light" color="violet">
              Редактировать профиль
            </Button>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="orders">
          <Card
            p="xl"
            radius="lg"
            ta="center"
            style={{
              background: 'rgba(26, 27, 30, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <IconShoppingBag size={60} style={{ opacity: 0.2, marginBottom: 16 }} />
            <Title order={4} mb="xs">Заказов пока нет</Title>
            <Text c="dimmed" mb="lg">
              Сделайте первый заказ в нашем магазине
            </Text>
            <Button
              component="a"
              href="/catalog"
              variant="gradient"
              gradient={{ from: 'violet', to: 'grape' }}
            >
              Перейти в каталог
            </Button>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="favorites">
          <Card
            p="xl"
            radius="lg"
            ta="center"
            style={{
              background: 'rgba(26, 27, 30, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <IconHeart size={60} style={{ opacity: 0.2, marginBottom: 16 }} />
            <Title order={4} mb="xs">Избранное пусто</Title>
            <Text c="dimmed" mb="lg">
              Добавляйте понравившиеся товары в избранное
            </Text>
            <Button
              component="a"
              href="/catalog"
              variant="gradient"
              gradient={{ from: 'violet', to: 'grape' }}
            >
              Смотреть каталог
            </Button>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="settings">
          <Card
            p="xl"
            radius="lg"
            style={{
              background: 'rgba(26, 27, 30, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <Title order={4} mb="lg">Настройки аккаунта</Title>

            <Stack gap="lg">
              <Box>
                <Text fw={600} mb="xs">Сменить пароль</Text>
                <Button variant="light" color="gray">
                  Изменить пароль
                </Button>
              </Box>

              <Divider color="dark.5" />

              <Box>
                <Text fw={600} mb="xs" c="red">Опасная зона</Text>
                <Button variant="subtle" color="red">
                  Удалить аккаунт
                </Button>
              </Box>
            </Stack>
          </Card>
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}
