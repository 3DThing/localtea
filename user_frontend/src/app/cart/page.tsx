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
import { IconMinus, IconPlus, IconTrash, IconArrowLeft, IconShoppingCart } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import Link from 'next/link';
import { useCartStore } from '@/store';

export default function CartPage() {
  const { items, totalAmount, updateItem, removeItem, clearCart, isLoading } = useCartStore();

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
        <IconShoppingCart size={80} style={{ opacity: 0.2, marginBottom: 24 }} />
        <Title order={2} mb="md">Корзина пуста</Title>
        <Text c="dimmed" mb="xl">
          Добавьте товары из каталога, чтобы оформить заказ
        </Text>
        <Button
          component={Link}
          href="/catalog"
          variant="gradient"
          gradient={{ from: 'violet', to: 'grape' }}
          size="lg"
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
          variant="subtle"
          color="red"
          leftSection={<IconTrash size={16} />}
          onClick={() => clearCart()}
        >
          Очистить
        </Button>
      </Group>

      <Box style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 32 }}>
        {/* Items List */}
        <Stack gap="md">
          {items.map((item) => (
            <Card
              key={item.id}
              p="lg"
              radius="lg"
              style={{
                background: 'rgba(26, 27, 30, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
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
                  <Text fw={700} c="violet">
                    {formatPrice(item.sku.price_cents)}
                  </Text>
                </Box>

                <Group gap="xs">
                  <ActionIcon
                    variant="light"
                    color="gray"
                    onClick={() => handleQuantityChange(item.id, Math.max(1, item.quantity - 1))}
                    disabled={isLoading}
                  >
                    <IconMinus size={14} />
                  </ActionIcon>
                  <Text w={40} ta="center">{item.quantity}</Text>
                  <ActionIcon
                    variant="light"
                    color="gray"
                    onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                    disabled={isLoading}
                  >
                    <IconPlus size={14} />
                  </ActionIcon>
                </Group>

                <Text fw={700} w={100} ta="right">
                  {formatPrice(item.total_cents)}
                </Text>

                <ActionIcon
                  variant="subtle"
                  color="red"
                  onClick={() => handleRemove(item.id)}
                  disabled={isLoading}
                >
                  <IconTrash size={18} />
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
            background: 'rgba(26, 27, 30, 0.8)',
            border: '1px solid rgba(117, 61, 218, 0.2)',
            position: 'sticky',
            top: 100,
            height: 'fit-content',
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
            <Text size="xl" fw={700} c="violet">
              {formatPrice(totalAmount)}
            </Text>
          </Group>

          <Button
            fullWidth
            size="lg"
            variant="gradient"
            gradient={{ from: 'violet', to: 'grape' }}
            component={Link}
            href="/checkout"
          >
            Оформить заказ
          </Button>

          <Text size="xs" c="dimmed" ta="center" mt="md">
            Нажимая «Оформить заказ», вы соглашаетесь с условиями покупки
          </Text>
        </Card>
      </Box>
    </Container>
  );
}
