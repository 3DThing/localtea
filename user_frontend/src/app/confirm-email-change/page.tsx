'use client';

import { useEffect, useState, Suspense } from 'react';
import {
  Container,
  Card,
  Title,
  Text,
  Stack,
  Box,
  Button,
  Loader,
  ThemeIcon,
  Group,
} from '@mantine/core';
import { IconCheck, IconX, IconMail, IconArrowRight } from '@tabler/icons-react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { userApi } from '@/lib/api';
import { useAuthStore } from '@/store';

function ConfirmEmailChangeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { checkAuth, user } = useAuthStore();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const confirmEmailChange = async () => {
      if (!token) {
        setStatus('error');
        setErrorMessage('Токен подтверждения не найден. Проверьте ссылку из письма.');
        return;
      }

      try {
        await userApi.confirmEmailChange(token);
        setStatus('success');
        // Обновляем данные пользователя
        if (user) {
          await checkAuth();
        }
      } catch (error: any) {
        setStatus('error');
        const message = error.response?.data?.detail || 'Не удалось подтвердить смену email. Возможно, ссылка устарела или уже была использована.';
        setErrorMessage(message);
      }
    };

    confirmEmailChange();
  }, [token, user, checkAuth]);

  return (
    <Container size={480} py={80}>
      <Card
        p="xl"
        radius="lg"
        style={{
          background: 'linear-gradient(180deg, rgba(36,24,14,0.94), rgba(18,14,10,0.98))',
          border: '1px solid rgba(212,137,79,0.08)',
          boxShadow: '0 12px 36px rgba(8,6,4,0.6)',
          borderRadius: 16,
        }}
      >
        {status === 'loading' && (
          <Stack align="center" gap="xl" py="xl">
            <Box
              style={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(212,137,79,0.15), rgba(212,137,79,0.05))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Loader size="lg" color="#d4894f" />
            </Box>
            <Box ta="center">
              <Title order={2} mb="sm" style={{ color: '#fbf6ee', fontFamily: 'Georgia, serif' }}>
                Подтверждение смены email
              </Title>
              <Text c="#e8dcc8" size="lg">
                Пожалуйста, подождите...
              </Text>
            </Box>
          </Stack>
        )}

        {status === 'success' && (
          <Stack align="center" gap="xl" py="xl">
            <Box
              style={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(74,222,128,0.2), rgba(34,197,94,0.1))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'pulse 2s ease-in-out infinite',
              }}
            >
              <ThemeIcon
                size={60}
                radius="xl"
                variant="gradient"
                gradient={{ from: '#4ade80', to: '#22c55e' }}
              >
                <IconCheck size={32} />
              </ThemeIcon>
            </Box>
            
            <Box ta="center">
              <Title order={2} mb="sm" style={{ color: '#fbf6ee', fontFamily: 'Georgia, serif' }}>
                Email изменён!
              </Title>
              <Text c="#e8dcc8" size="lg" mb="md">
                Ваш email успешно изменён. Теперь вы можете использовать новый адрес для входа в аккаунт.
              </Text>
            </Box>

            <Group gap="md">
              {user ? (
                <Button
                  component={Link}
                  href="/profile?tab=settings"
                  size="lg"
                  variant="gradient"
                  gradient={{ from: '#d4894f', to: '#8b5a2b' }}
                  rightSection={<IconArrowRight size={18} />}
                  style={{ color: '#fff', borderRadius: 10 }}
                >
                  Перейти в настройки
                </Button>
              ) : (
                <>
                  <Button
                    component={Link}
                    href="/login"
                    size="lg"
                    variant="gradient"
                    gradient={{ from: '#d4894f', to: '#8b5a2b' }}
                    rightSection={<IconArrowRight size={18} />}
                    style={{ color: '#fff', borderRadius: 10 }}
                  >
                    Войти в аккаунт
                  </Button>
                  <Button
                    component={Link}
                    href="/"
                    size="lg"
                    variant="subtle"
                    style={{ color: '#e8dcc8' }}
                  >
                    На главную
                  </Button>
                </>
              )}
            </Group>
          </Stack>
        )}

        {status === 'error' && (
          <Stack align="center" gap="xl" py="xl">
            <Box
              style={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(248,113,113,0.2), rgba(239,68,68,0.1))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ThemeIcon
                size={60}
                radius="xl"
                variant="gradient"
                gradient={{ from: '#f87171', to: '#ef4444' }}
              >
                <IconX size={32} />
              </ThemeIcon>
            </Box>
            
            <Box ta="center">
              <Title order={2} mb="sm" style={{ color: '#fbf6ee', fontFamily: 'Georgia, serif' }}>
                Ошибка подтверждения
              </Title>
              <Text c="#e8dcc8" size="lg" mb="md">
                {errorMessage}
              </Text>
            </Box>

            <Group gap="md">
              <Button
                component={Link}
                href="/profile?tab=settings"
                size="lg"
                variant="gradient"
                gradient={{ from: '#d4894f', to: '#8b5a2b' }}
                style={{ color: '#fff', borderRadius: 10 }}
              >
                Перейти в настройки
              </Button>
              <Button
                component={Link}
                href="/"
                size="lg"
                variant="subtle"
                style={{ color: '#e8dcc8' }}
              >
                На главную
              </Button>
            </Group>
          </Stack>
        )}
      </Card>

      {/* Info Card */}
      <Card
        mt="xl"
        p="lg"
        radius="lg"
        style={{
          background: 'linear-gradient(180deg, rgba(36,24,14,0.6), rgba(18,14,10,0.8))',
          border: '1px solid rgba(212,137,79,0.06)',
        }}
      >
        <Group gap="md" align="flex-start">
          <ThemeIcon
            size={44}
            radius="md"
            variant="light"
            style={{ background: 'rgba(212,137,79,0.15)' }}
          >
            <IconMail size={22} style={{ color: '#d4894f' }} />
          </ThemeIcon>
          <Box style={{ flex: 1 }}>
            <Text fw={600} mb={4} style={{ color: '#fbf6ee' }}>
              Нужна помощь?
            </Text>
            <Text size="sm" c="#e8dcc8">
              Если у вас возникли проблемы со сменой email, попробуйте запросить смену заново в настройках профиля или свяжитесь с поддержкой.
            </Text>
          </Box>
        </Group>
      </Card>
    </Container>
  );
}

export default function ConfirmEmailChangePage() {
  return (
    <Suspense
      fallback={
        <Container size={480} py={80} ta="center">
          <Loader size="lg" color="#d4894f" />
        </Container>
      }
    >
      <ConfirmEmailChangeContent />
    </Suspense>
  );
}

