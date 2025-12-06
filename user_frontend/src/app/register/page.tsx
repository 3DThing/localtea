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
  Checkbox,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconMail, IconLock, IconUser } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();
  const [error, setError] = useState('');

  const form = useForm({
    initialValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      agree: false,
    },
    validate: {
      username: (value) => (value.length >= 3 ? null : 'Минимум 3 символа'),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Некорректный email'),
      password: (value) => (value.length >= 8 ? null : 'Минимум 8 символов'),
      confirmPassword: (value, values) =>
        value === values.password ? null : 'Пароли не совпадают',
      agree: (value) => (value ? null : 'Необходимо принять условия'),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setError('');
    try {
      await register(values.email, values.username, values.password);
      notifications.show({
        title: 'Регистрация успешна!',
        message: 'Проверьте почту для подтверждения аккаунта',
        color: 'green',
        autoClose: 10000,
      });
      router.push('/login');
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Ошибка регистрации';
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
          Создать аккаунт
        </Title>
        <Text c="dimmed">
          Присоединяйтесь к сообществу LocalTea
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
              label="Имя пользователя"
              placeholder="username"
              leftSection={<IconUser size={16} />}
              {...form.getInputProps('username')}
              size="md"
            />

            <TextInput
              label="Email"
              placeholder="your@email.com"
              leftSection={<IconMail size={16} />}
              {...form.getInputProps('email')}
              size="md"
            />

            <PasswordInput
              label="Пароль"
              placeholder="Минимум 8 символов"
              leftSection={<IconLock size={16} />}
              {...form.getInputProps('password')}
              size="md"
            />

            <PasswordInput
              label="Подтверждение пароля"
              placeholder="Повторите пароль"
              leftSection={<IconLock size={16} />}
              {...form.getInputProps('confirmPassword')}
              size="md"
            />

            <Checkbox
              label={
                <Text size="sm">
                  Я согласен с{' '}
                  <Anchor href="/terms" target="_blank" c="violet">
                    условиями использования
                  </Anchor>
                </Text>
              }
              {...form.getInputProps('agree', { type: 'checkbox' })}
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
              Зарегистрироваться
            </Button>
          </Stack>
        </form>

        <Divider my="lg" label="или" labelPosition="center" />

        <Text ta="center" size="sm">
          Уже есть аккаунт?{' '}
          <Anchor component={Link} href="/login" c="violet">
            Войти
          </Anchor>
        </Text>
      </Card>
    </Container>
  );
}
