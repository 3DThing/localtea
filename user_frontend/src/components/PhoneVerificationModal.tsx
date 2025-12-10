'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Text,
  Stack,
  Button,
  Box,
  Group,
  ThemeIcon,
  Progress,
  Loader,
  Alert,
} from '@mantine/core';
import { IconPhone, IconCheck, IconClock, IconAlertCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { userApi } from '@/lib/api';

interface PhoneVerificationModalProps {
  opened: boolean;
  onClose: () => void;
  phoneNumber: string;
  onSuccess: () => void;
}

type VerificationState = 'idle' | 'loading' | 'waiting' | 'success' | 'error' | 'expired';

export default function PhoneVerificationModal({
  opened,
  onClose,
  phoneNumber,
  onSuccess,
}: PhoneVerificationModalProps) {
  const [state, setState] = useState<VerificationState>('idle');
  const [callPhone, setCallPhone] = useState('');
  const [timeLeft, setTimeLeft] = useState(300);
  const [error, setError] = useState('');

  // Сброс состояния при закрытии
  useEffect(() => {
    if (!opened) {
      setState('idle');
      setCallPhone('');
      setTimeLeft(300);
      setError('');
    }
  }, [opened]);

  // Таймер обратного отсчета
  useEffect(() => {
    if (state !== 'waiting') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setState('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [state]);

  // Проверка статуса каждые 5 секунд
  useEffect(() => {
    if (state !== 'waiting') return;

    const checkStatus = async () => {
      try {
        const response = await userApi.checkPhoneVerification();
        const data = response.data;

        if (data.is_confirmed) {
          setState('success');
          notifications.show({
            title: 'Успех!',
            message: 'Номер телефона подтвержден',
            color: 'green',
          });
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 2000);
        } else if (data.is_expired) {
          setState('expired');
        }
      } catch (err) {
        // Игнорируем ошибки при проверке статуса
      }
    };

    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [state, onSuccess, onClose]);

  const startVerification = useCallback(async () => {
    setState('loading');
    setError('');

    try {
      const response = await userApi.startPhoneVerification();
      const data = response.data;

      setCallPhone(data.call_phone_pretty);
      setTimeLeft(data.timeout_seconds || 300);
      setState('waiting');
    } catch (err: any) {
      setState('error');
      setError(err.response?.data?.detail || 'Не удалось инициировать звонок');
    }
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Подтверждение номера телефона"
      centered
      size="md"
      styles={{
        content: {
          background: 'linear-gradient(180deg, rgba(36,24,14,0.98), rgba(22,16,12,0.99))',
          border: '1px solid rgba(212,137,79,0.2)',
        },
        header: {
          background: 'transparent',
          color: '#fbf6ee',
        },
        title: {
          fontFamily: 'Georgia, serif',
          fontSize: '1.25rem',
          fontWeight: 600,
          color: '#fbf6ee',
        },
        close: {
          color: '#e8dcc8',
          '&:hover': {
            background: 'rgba(212,137,79,0.1)',
          },
        },
      }}
    >
      <Stack gap="lg">
        {/* Idle state */}
        {state === 'idle' && (
          <>
            <Box
              p="lg"
              style={{
                background: 'rgba(212,137,79,0.1)',
                borderRadius: 12,
                border: '1px solid rgba(212,137,79,0.2)',
              }}
            >
              <Group gap="md" align="flex-start">
                <ThemeIcon
                  size={48}
                  radius="xl"
                  style={{ background: 'rgba(212,137,79,0.2)' }}
                >
                  <IconPhone size={24} style={{ color: '#d4894f' }} />
                </ThemeIcon>
                <Box style={{ flex: 1 }}>
                  <Text fw={600} style={{ color: '#fbf6ee' }} mb={4}>
                    Ваш номер: {phoneNumber}
                  </Text>
                  <Text size="sm" style={{ color: '#e8dcc8' }}>
                    Для подтверждения номера телефона вам нужно будет позвонить на специальный номер.
                    Звонок бесплатный и будет автоматически сброшен.
                  </Text>
                </Box>
              </Group>
            </Box>

            <Stack gap="xs">
              <Text fw={600} style={{ color: '#d4894f' }}>
                Как это работает:
              </Text>
              <Box pl="md">
                <Text size="sm" style={{ color: '#e8dcc8' }}>
                  1. Нажмите «Получить номер для звонка»
                </Text>
                <Text size="sm" style={{ color: '#e8dcc8' }}>
                  2. Позвоните на указанный номер
                </Text>
                <Text size="sm" style={{ color: '#e8dcc8' }}>
                  3. Дождитесь автоматического подтверждения
                </Text>
              </Box>
            </Stack>

            <Button
              fullWidth
              size="lg"
              variant="gradient"
              gradient={{ from: '#d4894f', to: '#8b5a2b' }}
              leftSection={<IconPhone size={20} />}
              onClick={startVerification}
              style={{ color: '#fff' }}
            >
              Получить номер для звонка
            </Button>
          </>
        )}

        {/* Loading state */}
        {state === 'loading' && (
          <Box ta="center" py="xl">
            <Loader size="lg" color="#d4894f" />
            <Text mt="md" style={{ color: '#e8dcc8' }}>
              Инициализация звонка...
            </Text>
          </Box>
        )}

        {/* Waiting for call */}
        {state === 'waiting' && (
          <>
            <Alert
              icon={<IconPhone size={20} />}
              title="Позвоните на этот номер"
              color="orange"
              styles={{
                root: {
                  background: 'rgba(212,137,79,0.15)',
                  border: '1px solid rgba(212,137,79,0.3)',
                },
                title: { color: '#d4894f' },
                message: { color: '#e8dcc8' },
              }}
            >
              <Text
                size="xl"
                fw={700}
                style={{ color: '#fbf6ee', letterSpacing: 1 }}
                mt="xs"
              >
                {callPhone}
              </Text>
            </Alert>

            <Box
              p="md"
              style={{
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 8,
                border: '1px solid rgba(212,137,79,0.1)',
              }}
            >
              <Group justify="space-between" mb="xs">
                <Group gap="xs">
                  <IconClock size={16} style={{ color: '#d4894f' }} />
                  <Text size="sm" style={{ color: '#e8dcc8' }}>
                    Осталось времени:
                  </Text>
                </Group>
                <Text fw={700} style={{ color: '#d4894f' }}>
                  {formatTime(timeLeft)}
                </Text>
              </Group>
              <Progress
                value={(timeLeft / 300) * 100}
                color="#d4894f"
                size="sm"
              />
            </Box>

            <Text size="sm" ta="center" style={{ color: '#a89880' }}>
              Звонок будет автоматически сброшен. Это бесплатно.
            </Text>

            <Box ta="center">
              <Loader size="sm" color="#d4894f" />
              <Text size="sm" mt="xs" style={{ color: '#e8dcc8' }}>
                Ожидание звонка...
              </Text>
            </Box>
          </>
        )}

        {/* Success state */}
        {state === 'success' && (
          <Box ta="center" py="xl">
            <ThemeIcon
              size={80}
              radius="xl"
              style={{ background: 'rgba(74,222,128,0.2)', margin: '0 auto' }}
            >
              <IconCheck size={40} style={{ color: '#4ade80' }} />
            </ThemeIcon>
            <Text size="xl" fw={700} mt="lg" style={{ color: '#4ade80' }}>
              Номер подтвержден!
            </Text>
            <Text mt="xs" style={{ color: '#e8dcc8' }}>
              Ваш номер телефона успешно подтвержден
            </Text>
          </Box>
        )}

        {/* Error state */}
        {state === 'error' && (
          <>
            <Alert
              icon={<IconAlertCircle size={20} />}
              title="Ошибка"
              color="red"
              styles={{
                root: {
                  background: 'rgba(248,113,113,0.15)',
                  border: '1px solid rgba(248,113,113,0.3)',
                },
                title: { color: '#f87171' },
                message: { color: '#e8dcc8' },
              }}
            >
              {error}
            </Alert>

            <Button
              fullWidth
              variant="light"
              color="orange"
              onClick={() => setState('idle')}
            >
              Попробовать снова
            </Button>
          </>
        )}

        {/* Expired state */}
        {state === 'expired' && (
          <>
            <Alert
              icon={<IconClock size={20} />}
              title="Время истекло"
              color="yellow"
              styles={{
                root: {
                  background: 'rgba(250,204,21,0.15)',
                  border: '1px solid rgba(250,204,21,0.3)',
                },
                title: { color: '#facc15' },
                message: { color: '#e8dcc8' },
              }}
            >
              Время ожидания звонка истекло. Пожалуйста, запросите новый номер.
            </Alert>

            <Button
              fullWidth
              variant="gradient"
              gradient={{ from: '#d4894f', to: '#8b5a2b' }}
              onClick={startVerification}
              style={{ color: '#fff' }}
            >
              Запросить новый номер
            </Button>
          </>
        )}
      </Stack>
    </Modal>
  );
}
