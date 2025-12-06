'use client';

import { useState } from 'react';
import {
  Container,
  Card,
  Title,
  Text,
  TextInput,
  PasswordInput,
  Button,
  Stack,
  Anchor,
  Box,
  Divider,
  Group,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconMail, IconLock } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [error, setError] = useState('');

  const form = useForm({
    initialValues: {
      email: '',
      password: '',
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Некорректный email'),
      password: (value) => (value.length >= 6 ? null : 'Минимум 6 символов'),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setError('');
    try {
      await login(values.email, values.password);
      notifications.show({
        title: 'Добро пожаловать!',
        message: 'Вы успешно вошли в аккаунт',
        color: 'green',
      });
      router.push('/');
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Ошибка авторизации';
      setError(message);
      notifications.show({
        title: 'Ошибка',
        message,
        color: 'red',
      });
    }
  };

  return (
    <Container size={420} py={80}>
      <Box ta="center" mb="xl">
        <Title order={1} mb="xs">
          Добро пожаловать
        </Title>
        <Text c="dimmed">
          Войдите в свой аккаунт LocalTea
        </Text>
      </Box>

      <Card
        p="xl"
        radius="lg"
        style={{
          background: 'rgba(26, 27, 30, 0.8)',
          border: '1px solid rgba(117, 61, 218, 0.2)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Email"
              placeholder="your@email.com"
              leftSection={<IconMail size={16} />}
              {...form.getInputProps('email')}
              size="md"
            />

            <PasswordInput
              label="Пароль"
              placeholder="Ваш пароль"
              leftSection={<IconLock size={16} />}
              {...form.getInputProps('password')}
              size="md"
            />

            {error && (
              <Text c="red" size="sm">
                {error}
              </Text>
            )}

            <Button
              type="submit"
              fullWidth
              size="md"
              variant="gradient"
              gradient={{ from: 'violet', to: 'grape' }}
              loading={isLoading}
              mt="md"
            >
              Войти
            </Button>
          </Stack>
        </form>

        <Divider my="lg" label="или" labelPosition="center" />

        <Text ta="center" size="sm">
          Ещё нет аккаунта?{' '}
          <Anchor component={Link} href="/register" c="violet">
            Зарегистрироваться
          </Anchor>
        </Text>
      </Card>
    </Container>
  );
}
