'use client';

import {
  Container,
  Title,
  Text,
  Box,
  Stack,
  Card,
  Group,
  Image,
  Button,
  ActionIcon,
  NumberInput,
  Divider,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconMinus, IconPlus, IconTrash, IconArrowLeft, IconShoppingCart } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import Link from 'next/link';
import { useCartStore } from '@/store';

export default function CartPage() {
  const { items, totalAmount, updateItem, removeItem, clearCart, isLoading } = useCartStore();
  const isMobile = useMediaQuery('(max-width: 768px)');

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  const handleQuantityChange = async (itemId: number, quantity: number) => {
    try {
      await updateItem(itemId, quantity);
    } catch (error) {
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось обновить количество',
        color: 'red',
      });
    }
  };

  const handleRemove = async (itemId: number) => {
    try {
      await removeItem(itemId);
      notifications.show({
        message: 'Товар удалён из корзины',
        color: 'gray',
      });
    } catch (error) {
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось удалить товар',
        color: 'red',
      });
    }
  };

  if (items.length === 0) {
    return (
      <Container size="md" py={80} ta="center">
        <Box
          style={{
            width: 120,
            height: 120,
            margin: '0 auto 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 20,
            background: 'linear-gradient(180deg, rgba(36,24,14,0.9), rgba(18,14,10,0.96))',
            boxShadow: '0 12px 36px rgba(8,6,4,0.6)'
          }}
        >
          <IconShoppingCart size={52} style={{ color: '#d4894f' }} />
        </Box>

        <Title order={2} mb="md" style={{ color: '#fbf6ee' }}>Корзина пуста</Title>
        <Text c="#e8dcc8" mb="xl">
          Добавьте товары из каталога, чтобы оформить заказ
        </Text>
        <Button
          component={Link}
          href="/catalog"
          variant="gradient"
          gradient={{ from: '#d4894f', to: '#8b5a2b' }}
          size="lg"
          style={{ color: '#fff', borderRadius: 10, boxShadow: '0 10px 30px rgba(212,137,79,0.14)' }}
        >
          Перейти в каталог
        </Button>
      </Container>
    );
  }

  return (
    <Container size="lg" py="xl">
      {/* Header */}
      <Group justify="space-between" mb="xl">
        <Box>
          <Button
            component={Link}
            href="/catalog"
            variant="subtle"
            color="gray"
            leftSection={<IconArrowLeft size={16} />}
            mb="xs"
          >
            Продолжить покупки
          </Button>
          <Title order={1}>Корзина</Title>
          <Text c="dimmed">{items.length} товар(ов)</Text>
        </Box>
        <Button
          variant="gradient"
          gradient={{ from: '#d4894f', to: '#8b5a2b' }}
          leftSection={<IconTrash size={16} />}
          onClick={() => clearCart()}
          style={{ 
            color: '#fff', 
            borderRadius: 10,
            transition: 'transform 180ms ease, box-shadow 180ms ease',
            boxShadow: '0 8px 28px rgba(212,137,79,0.10)',
          }}
        >
          Очистить
        </Button>
      </Group>

      {isMobile ? (
        <Stack gap="md">
          {items.map((item) => (
            <Card
              key={item.id}
              p="lg"
              radius="lg"
              style={{
                background: 'linear-gradient(180deg, rgba(36,24,14,0.94), rgba(22,16,12,0.98))',
                border: '1px solid rgba(212,137,79,0.06)',
                boxShadow: '0 10px 30px rgba(6,4,3,0.5)',
              }}
            >
              <Group gap="lg" wrap="nowrap">
                <Image
                  src={item.sku.image || 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=200'}
                  alt={item.sku.title}
                  w={100}
                  h={100}
                  radius="md"
                  style={{ objectFit: 'cover' }}
                />

                <Box style={{ flex: 1 }}>
                  <Text fw={600} mb={4}>{item.sku.title}</Text>
                  <Text size="sm" c="dimmed" mb="xs">
                    {item.sku.weight}г
                  </Text>
                  <Text fw={700} style={{ color: '#d4894f' }}>
                    {formatPrice(item.sku.price_cents)}
                  </Text>
                </Box>

                <Group gap="xs" style={{ alignItems: 'center' }}>
                  <NumberInput
                    value={item.quantity}
                    min={1}
                    onChange={(val) => {
                      const q = typeof val === 'number' ? val : 1;
                      handleQuantityChange(item.id, q);
                    }}
                    styles={{ input: { background: 'rgba(255,255,255,0.02)', color: '#fbf6ee' } }}
                    hideControls
                    step={1}
                  />
                </Group>

                <Text fw={700} w={100} ta="right" style={{ color: '#fbf6ee' }}>
                  {formatPrice(item.total_cents)}
                </Text>

                <ActionIcon
                  variant="subtle"
                  color="red"
                  onClick={() => handleRemove(item.id)}
                  disabled={isLoading}
                  style={{ background: 'transparent' }}
                >
                  <IconTrash size={18} style={{ color: '#f87171' }} />
                </ActionIcon>
              </Group>
            </Card>
          ))}

          {/* Order Summary (mobile below items) */}
          <Card
            p="xl"
            radius="lg"
            style={{
              background: 'linear-gradient(180deg, rgba(36,24,14,0.8), rgba(22,16,12,0.95))',
              border: '1px solid rgba(212,137,79,0.06)',
              position: 'relative',
              top: 'auto',
              height: 'fit-content',
              boxShadow: '0 12px 36px rgba(6,4,3,0.5)',
              transition: 'transform 180ms ease, box-shadow 180ms ease',
            }}
          >
            <Title order={3} mb="lg">Итого</Title>

            <Stack gap="sm">
              <Group justify="space-between">
                <Text c="dimmed">Товары ({items.length})</Text>
                <Text>{formatPrice(totalAmount)}</Text>
              </Group>
              <Group justify="space-between">
                <Text c="dimmed">Доставка</Text>
                <Text>Бесплатно</Text>
              </Group>
            </Stack>

            <Divider my="lg" color="dark.5" />

            <Group justify="space-between" mb="xl">
              <Text size="lg" fw={600}>К оплате</Text>
              <Text size="xl" fw={700} style={{ color: '#d4894f' }}>
                {formatPrice(totalAmount)}
              </Text>
            </Group>

            <Button
              fullWidth
              size="lg"
              variant="gradient"
              gradient={{ from: '#d4894f', to: '#8b5a2b' }}
              component={Link}
              href="/checkout"
              style={{ 
                color: '#fff', 
                borderRadius: 10,
                transition: 'transform 180ms ease, box-shadow 180ms ease',
                boxShadow: '0 12px 36px rgba(212,137,79,0.12)',
              }}
            >
              Оформить заказ
            </Button>

            <Text size="xs" c="dimmed" ta="center" mt="md">
              Нажимая «Оформить заказ», вы соглашаетесь с условиями покупки
            </Text>
          </Card>
        </Stack>
      ) : (
        <Box style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 32 }}>
          {/* Items List */}
          <Stack gap="md">
            {items.map((item) => (
              <Card
                key={item.id}
                p="lg"
                radius="lg"
                style={{
                  background: 'linear-gradient(180deg, rgba(36,24,14,0.94), rgba(22,16,12,0.98))',
                  border: '1px solid rgba(212,137,79,0.06)',
                  boxShadow: '0 10px 30px rgba(6,4,3,0.5)',
                }}
              >
                <Group gap="lg" wrap="nowrap">
                  <Image
                    src={item.sku.image || 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=200'}
                    alt={item.sku.title}
                    w={100}
                    h={100}
                    radius="md"
                    style={{ objectFit: 'cover' }}
                  />

                  <Box style={{ flex: 1 }}>
                    <Text fw={600} mb={4}>{item.sku.title}</Text>
                    <Text size="sm" c="dimmed" mb="xs">
                      {item.sku.weight}г
                    </Text>
                    <Text fw={700} style={{ color: '#d4894f' }}>
                      {formatPrice(item.sku.price_cents)}
                    </Text>
                  </Box>

                  <Group gap="xs" style={{ alignItems: 'center' }}>
                    {!isMobile ? (
                      <>
                        <ActionIcon
                          variant="filled"
                          color="dark"
                          onClick={() => handleQuantityChange(item.id, Math.max(1, item.quantity - 1))}
                          disabled={isLoading}
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,137,79,0.04)' }}
                        >
                          <IconMinus size={14} style={{ color: '#e8dcc8' }} />
                        </ActionIcon>
                        <Text w={40} ta="center" style={{ color: '#fbf6ee', fontWeight: 600 }}>{item.quantity}</Text>
                        <ActionIcon
                          variant="filled"
                          color="dark"
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                          disabled={isLoading}
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,137,79,0.04)' }}
                        >
                          <IconPlus size={14} style={{ color: '#e8dcc8' }} />
                        </ActionIcon>
                      </>
                    ) : (
                      <NumberInput
                        value={item.quantity}
                        min={1}
                        onChange={(val) => {
                          const q = typeof val === 'number' ? val : 1;
                          handleQuantityChange(item.id, q);
                        }}
                        styles={{ input: { background: 'rgba(255,255,255,0.02)', color: '#fbf6ee' } }}
                        hideControls
                        step={1}
                      />
                    )}
                  </Group>

                  <Text fw={700} w={100} ta="right" style={{ color: '#fbf6ee' }}>
                    {formatPrice(item.total_cents)}
                  </Text>

                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={() => handleRemove(item.id)}
                    disabled={isLoading}
                    style={{ background: 'transparent' }}
                  >
                    <IconTrash size={18} style={{ color: '#f87171' }} />
                  </ActionIcon>
                </Group>
              </Card>
            ))}
          </Stack>

          {/* Order Summary */}
          <Card
            p="xl"
            radius="lg"
            style={{
              background: 'linear-gradient(180deg, rgba(36,24,14,0.8), rgba(22,16,12,0.95))',
              border: '1px solid rgba(212,137,79,0.06)',
              position: 'sticky',
              top: 100,
              height: 'fit-content',
              boxShadow: '0 12px 36px rgba(6,4,3,0.5)',
              transition: 'transform 180ms ease, box-shadow 180ms ease',
            }}
          >
            <Title order={3} mb="lg">Итого</Title>

            <Stack gap="sm">
              <Group justify="space-between">
                <Text c="dimmed">Товары ({items.length})</Text>
                <Text>{formatPrice(totalAmount)}</Text>
              </Group>
              <Group justify="space-between">
                <Text c="dimmed">Доставка</Text>
                <Text>Бесплатно</Text>
              </Group>
            </Stack>

            <Divider my="lg" style={{ borderColor: 'rgba(212,137,79,0.1)' }} />

            <Group justify="space-between" mb="xl">
              <Text size="lg" fw={600}>К оплате</Text>
              <Text size="xl" fw={700} style={{ color: '#d4894f' }}>
                {formatPrice(totalAmount)}
              </Text>
            </Group>

            <Button
              fullWidth
              size="lg"
              variant="gradient"
              gradient={{ from: '#d4894f', to: '#8b5a2b' }}
              component={Link}
              href="/checkout"
              style={{ 
                color: '#fff', 
                borderRadius: 10,
                transition: 'transform 180ms ease, box-shadow 180ms ease',
                boxShadow: '0 12px 36px rgba(212,137,79,0.12)',
              }}
            >
              Оформить заказ
            </Button>

            <Text size="xs" c="dimmed" ta="center" mt="md">
              Нажимая «Оформить заказ», вы соглашаетесь с условиями покупки
            </Text>
          </Card>
        </Box>
      )}
    </Container>
  );
}
