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
  Alert,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconMail, IconLock, IconX } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [error, setError] = useState('');

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  const translateAuthError = (detail: string) => {
    const normalized = detail?.trim();
    if (!normalized) return 'Ошибка авторизации';

    const mapping: Record<string, string> = {
      'Invalid credentials': 'Неверная почта или пароль',
      'Email not confirmed': 'Почта не подтверждена',
      'Inactive user': 'Аккаунт отключён',
    };

    return mapping[normalized] ?? normalized;
  };

  const form = useForm({
    initialValues: {
      email: '',
      password: '',
    },
    validate: {
      email: (value) => (emailRegex.test(value) ? null : 'Введите корректный email'),
      password: (value) => (value.length >= 8 ? null : 'Минимум 8 символов'),
    },
  });

  const canSubmit = emailRegex.test(form.values.email) && form.values.password.length >= 8 && !isLoading;

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
      const rawDetail = err.response?.data?.detail;
      const message = translateAuthError(typeof rawDetail === 'string' ? rawDetail : 'Ошибка авторизации');
      setError(message);
      notifications.show({
        title: 'Ошибка',
        message,
        color: 'red',
        autoClose: 8000,
      });
    }
  };

  return (
    <Container size={420} py={80}>
      <Box ta="center" mb="xl">
        <Title order={1} mb="xs" style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: '#fbf6ee' }}>
          Добро пожаловать
        </Title>
        <Text c="#e8dcc8">
          Войдите в свой аккаунт LocalTea
        </Text>
      </Box>

      <Card
        p="xl"
        radius="lg"
        style={{
          background: 'linear-gradient(180deg, rgba(36,24,14,0.94), rgba(18,14,10,0.98))',
          border: '1px solid rgba(212,137,79,0.08)',
          boxShadow: '0 12px 36px rgba(8,6,4,0.6)',
          borderRadius: 14,
        }}
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Email"
              placeholder="your@email.com"
              leftSection={<IconMail size={16} style={{ color: '#d4894f' }} />}
              {...form.getInputProps('email')}
              size="md"
              styles={{
                input: {
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(212,137,79,0.08)',
                  color: '#fbf6ee',
                },
                label: { color: '#e8dcc8' },
              }}
            />

            <PasswordInput
              label="Пароль"
              placeholder="Ваш пароль"
              leftSection={<IconLock size={16} style={{ color: '#d4894f' }} />}
              {...form.getInputProps('password')}
              size="md"
              styles={{
                input: {
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(212,137,79,0.08)',
                  color: '#fbf6ee',
                },
                label: { color: '#e8dcc8' },
              }}
            />

            {error && (
              <Alert
                icon={<IconX size={16} />}
                color="red"
                variant="filled"
                radius="md"
                styles={{
                  root: { border: '1px solid rgba(248,113,113,0.35)' },
                  message: { color: '#fff' },
                }}
              >
                {error === 'Почта не подтверждена'
                  ? 'Почта не подтверждена. Проверьте письмо и подтвердите аккаунт.'
                  : error}
              </Alert>
            )}

            <Button
              type="submit"
              fullWidth
              size="md"
              variant="gradient"
              gradient={{ from: '#d4894f', to: '#8b5a2b' }}
              loading={isLoading}
              disabled={!canSubmit}
              mt="md"
              style={{ color: '#fbf6ee', borderRadius: 10, padding: '12px 16px' }}
            >
              Войти
            </Button>
          </Stack>
        </form>

        <Divider my="lg" label="или" labelPosition="center" style={{ color: '#e8dcc8' }} />

        <Text ta="center" size="sm" style={{ color: '#e8dcc8' }}>
          Ещё нет аккаунта?{' '}
          <Anchor component={Link} href="/register" style={{ color: '#d4894f', fontWeight: 600 }}>
            Зарегистрироваться
          </Anchor>
        </Text>
      </Card>
    </Container>
  );
}
