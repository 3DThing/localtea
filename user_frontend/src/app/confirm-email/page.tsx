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
  TextInput,
} from '@mantine/core';
import { IconCheck, IconX, IconMail, IconArrowRight, IconKey } from '@tabler/icons-react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { userApi } from '@/lib/api';
import { useAuthStore } from '@/store';

function ConfirmEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { checkAuth, user } = useAuthStore();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'idle'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const confirmEmail = async () => {
      if (!token) {
        setStatus('idle');
        return;
      }

      setStatus('loading');
      try {
        await userApi.confirmEmail(token);
        setStatus('success');
        // Обновляем данные пользователя если он авторизован
        if (user) {
          await checkAuth();
        }
      } catch (error: any) {
        setStatus('error');
        const message = error.response?.data?.detail || 'Не удалось подтвердить email. Возможно, ссылка устарела или уже была использована.';
        setErrorMessage(message);
      }
    };

    confirmEmail();
  }, [token, user, checkAuth]);

  const handleManualSubmit = async () => {
    if (!manualToken.trim()) {
      setErrorMessage('Введите токен подтверждения');
      return;
    }

    setIsSubmitting(true);
    setStatus('loading');
    setErrorMessage('');

    try {
      await userApi.confirmEmail(manualToken.trim());
      setStatus('success');
      if (user) {
        await checkAuth();
      }
    } catch (error: any) {
      setStatus('error');
      const message = error.response?.data?.detail || 'Не удалось подтвердить email. Проверьте правильность токена.';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

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
        {status === 'idle' && (
          <Stack gap="xl" py="xl">
            <Box ta="center">
              <Box
                mb="xl"
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(212,137,79,0.15), rgba(212,137,79,0.05))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                }}
              >
                <ThemeIcon
                  size={60}
                  radius="xl"
                  variant="light"
                  style={{ background: 'rgba(212,137,79,0.2)' }}
                >
                  <IconKey size={32} style={{ color: '#d4894f' }} />
                </ThemeIcon>
              </Box>
              <Title order={2} mb="sm" style={{ color: '#fbf6ee', fontFamily: 'Georgia, serif' }}>
                Подтверждение email
              </Title>
              <Text c="#e8dcc8" size="lg" mb="xl">
                Введите токен подтверждения из письма
              </Text>
            </Box>

            <TextInput
              placeholder="Введите токен из письма"
              size="lg"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
              leftSection={<IconKey size={18} />}
              error={errorMessage}
              styles={{
                input: {
                  background: 'rgba(18,14,10,0.5)',
                  border: '1px solid rgba(212,137,79,0.2)',
                  color: '#fbf6ee',
                  '&:focus': {
                    borderColor: '#d4894f',
                  },
                },
              }}
            />

            <Button
              fullWidth
              size="lg"
              onClick={handleManualSubmit}
              loading={isSubmitting}
              variant="gradient"
              gradient={{ from: '#d4894f', to: '#8b5a2b' }}
              style={{ color: '#fff', borderRadius: 10 }}
            >
              Подтвердить email
            </Button>

            <Group gap="md" justify="center">
              <Button
                component={Link}
                href="/login"
                size="md"
                variant="subtle"
                style={{ color: '#e8dcc8' }}
              >
                Войти в аккаунт
              </Button>
              <Button
                component={Link}
                href="/"
                size="md"
                variant="subtle"
                style={{ color: '#e8dcc8' }}
              >
                На главную
              </Button>
            </Group>
          </Stack>
        )}

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
                Подтверждение email
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
                Email подтверждён!
              </Title>
              <Text c="#e8dcc8" size="lg" mb="md">
                Ваш email успешно подтверждён. Теперь вы можете пользоваться всеми возможностями LocalTea.
              </Text>
            </Box>

            <Group gap="md">
              {user ? (
                <Button
                  component={Link}
                  href="/profile"
                  size="lg"
                  variant="gradient"
                  gradient={{ from: '#d4894f', to: '#8b5a2b' }}
                  rightSection={<IconArrowRight size={18} />}
                  style={{ color: '#fff', borderRadius: 10 }}
                >
                  Перейти в профиль
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

            {!token && (
              <>
                <TextInput
                  placeholder="Введите токен из письма"
                  size="lg"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                  leftSection={<IconKey size={18} />}
                  style={{ width: '100%' }}
                  styles={{
                    input: {
                      background: 'rgba(18,14,10,0.5)',
                      border: '1px solid rgba(212,137,79,0.2)',
                      color: '#fbf6ee',
                      '&:focus': {
                        borderColor: '#d4894f',
                      },
                    },
                  }}
                />

                <Button
                  fullWidth
                  size="lg"
                  onClick={handleManualSubmit}
                  loading={isSubmitting}
                  variant="gradient"
                  gradient={{ from: '#d4894f', to: '#8b5a2b' }}
                  style={{ color: '#fff', borderRadius: 10 }}
                >
                  Попробовать снова
                </Button>
              </>
            )}

            <Group gap="md">
              <Button
                component={Link}
                href="/login"
                size="lg"
                variant="gradient"
                gradient={{ from: '#d4894f', to: '#8b5a2b' }}
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
              Не получили письмо?
            </Text>
            <Text size="sm" c="#e8dcc8">
              Проверьте папку «Спам» или напишите в тех поддержку, чтобы запросить повторную отправку письма с подтверждением.
            </Text>
          </Box>
        </Group>
      </Card>
    </Container>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense
      fallback={
        <Container size={480} py={80} ta="center">
          <Loader size="lg" color="#d4894f" />
        </Container>
      }
    >
      <ConfirmEmailContent />
    </Suspense>
  );
}

