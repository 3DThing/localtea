'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TextInput, PasswordInput, Button, Paper, Title, Container, PinInput, Group, Text, Alert, Center } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import { AuthService, ApiError } from '@/lib/api';
import { IconAlertCircle } from '@tabler/icons-react';
import QRCode from "react-qr-code";

const loginSchema = z.object({
  email: z.string().email({ message: 'Некорректный email' }),
  password: z.string().min(1, { message: 'Введите пароль' }),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'login' | '2fa' | 'setup'>('login');
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onLoginSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setErrorDetail(null);
    try {
      const response = await AuthService.loginApiV1AuthLoginPost(data);
      setTempToken(response.temp_token);
      
      if (response.state === '2fa_required') {
        setStep('2fa');
      } else if (response.state === '2fa_setup_required') {
        const setupData = await AuthService.setup2FaApiV1Auth2FaSetupPost(response.temp_token);
        setQrUrl(setupData.otpauth_url);
        setStep('setup');
      }
    } catch (err) {
      const error = err as ApiError;
      let message = 'Произошла ошибка';
      let debugInfo = '';

      if (error.status) {
        debugInfo += `Код ошибки: ${error.status}. `;
      } else {
        debugInfo += 'Нет ответа от сервера (возможно CORS или сервер недоступен). ';
      }

      if (error.body && (error.body as { detail?: unknown }).detail) {
          const detail = (error.body as { detail?: unknown }).detail;
          if (Array.isArray(detail)) {
              message = detail.map((e: { msg: string }) => e.msg).join(', ');
          } else if (typeof detail === 'string') {
              message = detail;
          }
      } else if (error.message) {
          // Fallback to error message if no body
          message = error.message;
      }
      
      const fullMessage = `${message} (${debugInfo})`;
      setErrorDetail(fullMessage);

      notifications.show({
        title: 'Ошибка входа',
        message: fullMessage,
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const onVerifySubmit = async (code: string) => {
    if (!tempToken) return;
    setLoading(true);
    try {
      const response = await AuthService.verify2FaApiV1Auth2FaVerifyPost({
          temp_token: tempToken,
          code: code,
      });
      
      localStorage.setItem('accessToken', response.access_token);
      localStorage.setItem('refreshToken', response.refresh_token);
      
      notifications.show({
        title: 'Успешно',
        message: 'Вход выполнен успешно',
        color: 'green',
      });
      
      router.push('/dashboard');
    } catch (err) {
      const error = err as ApiError;
      notifications.show({
        title: 'Ошибка проверки',
        message: (error.body as { detail?: string })?.detail || 'Неверный код',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  if (step === 'login') {
    return (
      <Container size={420} my={40}>
        <Title ta="center">Вход в админку</Title>
        <Paper withBorder shadow="md" p={30} mt={30} radius="md">
          {errorDetail && (
            <Alert icon={<IconAlertCircle size={16} />} title="Ошибка" color="red" mb="md">
              {errorDetail}
            </Alert>
          )}
          <form onSubmit={handleSubmit(onLoginSubmit)}>
            <TextInput
              label="Email"
              placeholder="you@example.com"
              required
              {...register('email')}
              error={errors.email?.message}
            />
            <PasswordInput
              label="Пароль"
              placeholder="Ваш пароль"
              required
              mt="md"
              {...register('password')}
              error={errors.password?.message}
            />
            <Button fullWidth mt="xl" type="submit" loading={loading}>
              Войти
            </Button>
          </form>
        </Paper>
      </Container>
    );
  }

  if (step === '2fa') {
    return (
      <Container size={420} my={40}>
        <Title ta="center">Двухфакторная аутентификация</Title>
        <Paper withBorder shadow="md" p={30} mt={30} radius="md">
          <Text size="sm" mb="md" ta="center">
            Введите 6-значный код из приложения аутентификатора.
          </Text>
          <Group justify="center">
            <PinInput 
              length={6} 
              type="number" 
              onComplete={onVerifySubmit} 
              disabled={loading}
              autoFocus
            />
          </Group>
          {loading && <Text ta="center" mt="sm" size="xs">Проверка...</Text>}
          <Button variant="subtle" fullWidth mt="md" onClick={() => setStep('login')}>
            Вернуться ко входу
          </Button>
        </Paper>
      </Container>
    );
  }

  if (step === 'setup') {
     return (
      <Container size={420} my={40}>
        <Title ta="center">Настройка 2FA</Title>
        <Paper withBorder shadow="md" p={30} mt={30} radius="md">
          <Alert icon={<IconAlertCircle size={16} />} title="Требуется действие" color="yellow" mb="md">
            Необходимо настроить двухфакторную аутентификацию для продолжения.
          </Alert>
          <Text size="sm" mb="md">
            Отсканируйте этот QR-код в приложении аутентификатора (Google Authenticator, Authy и др.):
          </Text>
          
          {qrUrl && (
            <Center my="md">
              <div style={{ background: 'white', padding: '16px', borderRadius: '8px' }}>
                <QRCode value={qrUrl} size={200} />
              </div>
            </Center>
          )}
          
          <Text size="sm" mt="md" mb="xs">Затем введите полученный код:</Text>
          <Group justify="center">
            <PinInput 
              length={6} 
              type="number" 
              onComplete={onVerifySubmit} 
              disabled={loading}
            />
          </Group>
        </Paper>
      </Container>
     );
  }

  return null;
}
