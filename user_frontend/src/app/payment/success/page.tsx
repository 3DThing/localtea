'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Container,
  Card,
  Title,
  Text,
  Button,
  Stack,
  Group,
  Loader,
  ThemeIcon,
  Box,
} from '@mantine/core';
import { IconCheck, IconClock, IconShoppingBag, IconHome } from '@tabler/icons-react';
import Link from 'next/link';
import { api } from '@/lib/api';

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');
  const [countdown, setCountdown] = useState(10);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'checking' | 'paid' | 'pending'>('checking');
  
  // Check order payment status
  useEffect(() => {
    const checkPayment = async () => {
      if (!orderId) {
        setPaymentStatus('pending');
        return;
      }
      
      try {
        // This API call will trigger payment status check
        const response = await api.get(`/orders/${orderId}/status`);
        if (response.data.status === 'PAID' || response.data.status === 'paid') {
          setPaymentStatus('paid');
        } else {
          setPaymentStatus('pending');
          // Retry check after 3 seconds
          setTimeout(checkPayment, 3000);
        }
      } catch (error) {
        console.error('Error checking order status:', error);
        setPaymentStatus('pending');
      }
    };
    
    checkPayment();
  }, [orderId]);
  
  // Handle redirect separately from state update
  useEffect(() => {
    if (shouldRedirect) {
      router.push('/profile?tab=orders');
    }
  }, [shouldRedirect, router]);
  
  // Auto-redirect to orders after countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setShouldRedirect(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  return (
    <Box
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, rgba(22,16,12,1) 0%, rgba(36,24,14,1) 50%, rgba(22,16,12,1) 100%)',
        paddingTop: 60,
        paddingBottom: 60,
      }}
    >
      <Container size="sm">
        <Card
          p="xl"
          radius="lg"
          style={{
            background: 'linear-gradient(180deg, rgba(36,24,14,0.94), rgba(22,16,12,0.98))',
            border: '1px solid rgba(212,137,79,0.15)',
            boxShadow: '0 20px 60px rgba(6,4,3,0.6)',
            textAlign: 'center',
          }}
        >
          <Stack align="center" gap="lg">
            {/* Success Icon */}
            <ThemeIcon
              size={100}
              radius="xl"
              variant="gradient"
              gradient={paymentStatus === 'paid' 
                ? { from: '#4caf50', to: '#2e7d32' }
                : paymentStatus === 'checking'
                ? { from: '#ff9800', to: '#f57c00' }
                : { from: '#2196f3', to: '#1976d2' }
              }
            >
              {paymentStatus === 'checking' ? (
                <Loader color="white" size={40} />
              ) : (
                <IconCheck size={60} stroke={2} />
              )}
            </ThemeIcon>

            <Title
              order={2}
              style={{
                color: '#fbf6ee',
                fontFamily: 'Georgia, serif',
              }}
            >
              {paymentStatus === 'paid' ? 'Оплата подтверждена!' : 'Заказ оформлен!'}
            </Title>

            <Text
              size="lg"
              style={{ color: '#e8dcc8', maxWidth: 400 }}
            >
              {paymentStatus === 'paid' 
                ? 'Спасибо за покупку! Ваш заказ оплачен и передан в обработку.'
                : paymentStatus === 'checking'
                ? 'Проверяем статус оплаты...'
                : 'Спасибо за покупку! Ваш заказ создан. Ожидаем подтверждения оплаты.'}
            </Text>

            {/* Info Box */}
            <Card
              p="md"
              radius="md"
              style={{
                background: paymentStatus === 'paid' 
                  ? 'rgba(76,175,80,0.1)' 
                  : 'rgba(212,137,79,0.1)',
                border: paymentStatus === 'paid'
                  ? '1px solid rgba(76,175,80,0.3)'
                  : '1px solid rgba(212,137,79,0.2)',
                width: '100%',
              }}
            >
              <Group gap="xs" justify="center">
                {paymentStatus === 'checking' ? (
                  <Loader size={16} />
                ) : (
                  <IconClock size={20} style={{ color: paymentStatus === 'paid' ? '#4caf50' : '#d4894f' }} />
                )}
                <Text size="sm" style={{ color: '#e8dcc8' }}>
                  {paymentStatus === 'paid'
                    ? 'Оплата успешно получена'
                    : paymentStatus === 'checking'
                    ? 'Проверка статуса платежа...'
                    : 'Статус заказа обновится автоматически после оплаты'}
                </Text>
              </Group>
            </Card>

            {/* Buttons */}
            <Stack gap="sm" w="100%" maw={300}>
              <Button
                component={Link}
                href="/profile?tab=orders"
                variant="gradient"
                gradient={{ from: '#d4894f', to: '#8b5a2b' }}
                size="lg"
                leftSection={<IconShoppingBag size={20} />}
                fullWidth
              >
                Мои заказы
              </Button>

              <Button
                component={Link}
                href="/"
                variant="outline"
                size="md"
                leftSection={<IconHome size={18} />}
                fullWidth
                style={{
                  borderColor: 'rgba(212,137,79,0.3)',
                  color: '#e8dcc8',
                }}
              >
                На главную
              </Button>
            </Stack>

            {/* Auto-redirect notice */}
            <Text size="xs" style={{ color: 'rgba(232,220,200,0.5)' }}>
              Автоматический переход к заказам через {countdown} сек.
            </Text>
          </Stack>
        </Card>
      </Container>
    </Box>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <Box
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, rgba(22,16,12,1) 0%, rgba(36,24,14,1) 50%, rgba(22,16,12,1) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Loader color="#d4894f" size="xl" />
      </Box>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}