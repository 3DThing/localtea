'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Box,
  Image,
  Title,
  Text,
  Group,
  Stack,
  Button,
  Badge,
  NumberInput,
  Card,
  Divider,
  ActionIcon,
  Tabs,
  Skeleton,
  Textarea,
  Avatar,
  Menu,
  Modal,
} from '@mantine/core';
import {
  IconHeart,
  IconShoppingCart,
  IconEye,
  IconMessage,
  IconStar,
  IconMinus,
  IconPlus,
  IconArrowLeft,
  IconDotsVertical,
  IconTrash,
  IconFlag,
} from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { notifications } from '@mantine/notifications';
import { catalogApi, interactionsApi } from '@/lib/api';
import { useCartStore, useAuthStore } from '@/store';
import Link from 'next/link';

export default function ProductDetailClient() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const slug = params.slug as string;

  const [selectedSku, setSelectedSku] = useState<any>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [comment, setComment] = useState('');
  const [reportModalOpened, { open: openReportModal, close: closeReportModal }] = useDisclosure(false);
  const [reportingCommentId, setReportingCommentId] = useState<number | null>(null);
  const [reportReason, setReportReason] = useState('');

  const { addItem, isLoading: cartLoading } = useCartStore();
  const { user } = useAuthStore();

  const { data: productData, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => catalogApi.getProduct(slug),
  });

  const { data: commentsData, refetch: refetchComments } = useQuery({
    queryKey: ['comments', 'product', productData?.data?.id],
    queryFn: () => interactionsApi.getComments({ product_id: productData?.data?.id }),
    enabled: !!productData?.data?.id,
  });

  const product = productData?.data;
  const comments = commentsData?.data || [];
  const commentsCount = comments.length || product?.comments_count || 0;

  const imagesKey = product?.images
    ?.map((img: any) => `${img.id}:${img.is_main ? 1 : 0}:${img.sort_order ?? ''}`)
    .join('|');

  // Select first SKU by default
  useEffect(() => {
    if (product?.skus?.length && !selectedSku) {
      setSelectedSku(product.skus[0]);
    }
  }, [product, selectedSku]);

  // Default to main image (cover) when product/images load
  useEffect(() => {
    if (!product?.images?.length) return;
    const mainIndex = product.images.findIndex((img: any) => img.is_main);
    setSelectedImageIndex(mainIndex >= 0 ? mainIndex : 0);
  }, [product?.id, imagesKey]);

  // Register view
  useEffect(() => {
    if (product?.id) {
      interactionsApi.registerView({ product_id: product.id }).catch(() => {});
    }
  }, [product?.id]);

  const likeMutation = useMutation({
    mutationFn: () => interactionsApi.toggleLike({ product_id: product.id }),
    // optimistic update for instant feedback
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['product', slug] });
      const previous = queryClient.getQueryData(['product', slug]);
      queryClient.setQueryData(['product', slug], (old: any) => {
        if (!old?.data) return old;
        const liked = !!old.data.is_liked;
        const likes = old.data.likes_count || 0;
        return {
          ...old,
          data: {
            ...old.data,
            is_liked: !liked,
            likes_count: liked ? Math.max(likes - 1, 0) : likes + 1,
          },
        };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['product', slug], context.previous);
      }
      notifications.show({
        title: 'Лайк не сохранён',
        message: 'Войдите в аккаунт, чтобы ставить лайки',
        color: 'red',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['product', slug] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) => interactionsApi.createComment({
      content,
      product_id: product.id,
    }),
    onSuccess: () => {
      setComment('');
      refetchComments();
      notifications.show({
        title: 'Комментарий добавлен',
        message: 'Ваш комментарий успешно опубликован',
        color: 'green',
      });
    },
    onError: () => {
      notifications.show({
        title: 'Ошибка',
        message: 'Войдите в аккаунт, чтобы оставить комментарий',
        color: 'red',
      });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: number) => interactionsApi.deleteComment(commentId),
    onSuccess: () => {
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ['product', slug] });
      notifications.show({
        title: 'Отзыв удалён',
        message: 'Ваш отзыв успешно удалён',
        color: 'green',
      });
    },
    onError: () => {
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось удалить отзыв',
        color: 'red',
      });
    },
  });

  const reportCommentMutation = useMutation({
    mutationFn: ({ commentId, reason }: { commentId: number; reason: string }) =>
      interactionsApi.reportComment(commentId, { reason }),
    onSuccess: () => {
      closeReportModal();
      setReportReason('');
      setReportingCommentId(null);
      notifications.show({
        title: 'Жалоба отправлена',
        message: 'Спасибо! Мы рассмотрим вашу жалобу',
        color: 'green',
      });
    },
    onError: () => {
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось отправить жалобу',
        color: 'red',
      });
    },
  });

  const handleOpenReport = (commentId: number) => {
    setReportingCommentId(commentId);
    openReportModal();
  };

  const handleSubmitReport = () => {
    if (reportingCommentId && reportReason.trim()) {
      reportCommentMutation.mutate({ commentId: reportingCommentId, reason: reportReason });
    }
  };

  const handleLike = () => {
    if (!user) {
      notifications.show({
        title: 'Требуется вход',
        message: 'Войдите в аккаунт, чтобы ставить лайки',
        color: 'red',
      });
      return;
    }
    likeMutation.mutate();
  };

  const handleAddToCart = async () => {
    if (!selectedSku) return;

    try {
      await addItem(selectedSku.id, quantity);
      notifications.show({
        title: 'Добавлено в корзину',
        message: `${product.title} (${selectedSku.weight}г) добавлен в корзину`,
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось добавить товар в корзину',
        color: 'red',
      });
    }
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  if (isLoading) {
    return (
      <Container size="xl" py="xl">
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Skeleton height={500} radius="lg" />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Stack gap="md">
              <Skeleton height={40} width="60%" />
              <Skeleton height={20} width="40%" />
              <Skeleton height={100} />
              <Skeleton height={50} />
              <Skeleton height={50} />
            </Stack>
          </Grid.Col>
        </Grid>
      </Container>
    );
  }

  if (!product) {
    return (
      <Container size="xl" py="xl" ta="center">
        <Title order={2} mb="md">Товар не найден</Title>
        <Button component={Link} href="/catalog">Вернуться в каталог</Button>
      </Container>
    );
  }

  const mainImage = product.images?.[selectedImageIndex]?.url
    || product.images?.find((img: any) => img.is_main)?.url
    || product.images?.[0]?.url
    || 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600';

  return (
    <Container size="xl" py="xl">
      {/* Back Button */}
      <Button
        variant="subtle"
        color="gray"
        leftSection={<IconArrowLeft size={16} />}
        mb="xl"
        onClick={() => router.back()}
      >
        Назад
      </Button>

      <Grid gutter="xl">
        {/* Image Section */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card
            p={0}
            radius="lg"
            style={{
              overflow: 'hidden',
              background: 'rgba(26, 27, 30, 0.8)',
              border: '1px solid rgba(117, 61, 218, 0.2)',
            }}
          >
            <Image
              src={mainImage}
              alt={product.title}
              h={500}
              style={{ objectFit: 'cover' }}
            />
          </Card>

          {/* Thumbnails */}
          {product.images?.length > 1 && (
            <Group gap="xs" mt="md">
              {product.images.map((img: any, index: number) => (
                <Box
                  key={img.id}
                  onClick={() => setSelectedImageIndex(index)}
                  style={{ cursor: 'pointer' }}
                >
                  <Image
                    src={img.url}
                    alt=""
                    w={80}
                    h={80}
                    radius="md"
                    style={{
                      objectFit: 'cover',
                      border: selectedImageIndex === index 
                        ? '2px solid rgba(117, 61, 218, 0.8)' 
                        : '2px solid rgba(117, 61, 218, 0.3)',
                      opacity: selectedImageIndex === index ? 1 : 0.7,
                      transition: 'all 0.2s ease',
                    }}
                  />
                </Box>
              ))}
            </Group>
          )}
        </Grid.Col>

        {/* Product Info */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Stack gap="lg">
            {/* Category & Type */}
            <Group gap="xs">
              <Badge variant="light" color="violet">
                {product.category?.name || 'Чай'}
              </Badge>
              {product.tea_type && (
                <Badge variant="outline" color="gray">
                  {product.tea_type}
                </Badge>
              )}
            </Group>

            {/* Title */}
            <Title order={1}>{product.title}</Title>

            {/* Stats */}
            <Group gap="lg">
              <Group gap={4}>
                <IconEye size={18} style={{ opacity: 0.5 }} />
                <Text size="sm" c="dimmed">{product.views_count || 0}</Text>
              </Group>
              <Group gap={4}>
                <IconHeart
                  size={18}
                  style={{
                    opacity: 0.5,
                    cursor: 'pointer',
                    color: product.is_liked ? '#ff6b6b' : undefined,
                  }}
                  onClick={handleLike}
                />
                <Text size="sm" c="dimmed">{product.likes_count ?? 0}</Text>
              </Group>
              <Group gap={4}>
                <IconMessage size={18} style={{ opacity: 0.5 }} />
                <Text size="sm" c="dimmed">{commentsCount}</Text>
              </Group>
            </Group>

            {/* Description */}
            <Text c="dimmed" size="lg" style={{ lineHeight: 1.8 }}>
              
              {product.lore_description || 'Описание скоро появится...'}
            </Text>

            <Divider my="md" color="dark.5" />

            {/* SKU Selection */}
            <Box>
              <Text size="sm" fw={600} mb="xs">Выберите объём:</Text>
              <Group gap="xs">
                {product.skus?.map((sku: any) => (
                  <Button
                    key={sku.id}
                    variant={selectedSku?.id === sku.id ? 'filled' : 'outline'}
                    color="violet"
                    onClick={() => setSelectedSku(sku)}
                    disabled={!sku.is_active || sku.quantity === 0}
                  >
                    {sku.weight}г
                    {sku.quantity === 0 && ' (нет в наличии)'}
                  </Button>
                ))}
              </Group>
            </Box>

            {/* Price */}
            {selectedSku && (
              <Box>
                <Group gap="md" align="baseline">
                  <Text size="xl" fw={700} c="violet">
                    {formatPrice(selectedSku.price_cents - (selectedSku.discount_cents || 0))}
                  </Text>
                  {selectedSku.discount_cents > 0 && (
                    <Text size="md" c="dimmed" td="line-through">
                      {formatPrice(selectedSku.price_cents)}
                    </Text>
                  )}
                </Group>
                <Text size="xs" c="dimmed" mt={4}>
                  В наличии: {selectedSku.quantity} шт.
                </Text>
              </Box>
            )}

            {/* Quantity & Add to Cart */}
            <Group gap="md">
              <Group gap={0}>
                <ActionIcon
                  variant="light"
                  color="gray"
                  size="lg"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <IconMinus size={16} />
                </ActionIcon>
                <NumberInput
                  value={quantity}
                  onChange={(val) => setQuantity(typeof val === 'number' ? val : 1)}
                  min={1}
                  max={selectedSku?.quantity || 99}
                  hideControls
                  styles={{
                    input: { width: 60, textAlign: 'center' },
                  }}
                />
                <ActionIcon
                  variant="light"
                  color="gray"
                  size="lg"
                  onClick={() => setQuantity(Math.min(selectedSku?.quantity || 99, quantity + 1))}
                >
                  <IconPlus size={16} />
                </ActionIcon>
              </Group>

              <Button
                size="lg"
                variant="gradient"
                gradient={{ from: 'brown', to: 'grape' }}
                leftSection={<IconShoppingCart size={20} />}
                onClick={handleAddToCart}
                loading={cartLoading}
                disabled={!selectedSku || selectedSku.quantity === 0}
                style={{ flex: 1 }}
              >
                Добавить в корзину
              </Button>

              <ActionIcon
                size="lg"
                variant="light"
                color={product.is_liked ? 'red' : 'gray'}
                onClick={handleLike}
              >
                <IconHeart size={20} fill={product.is_liked ? '#ff6b6b' : 'none'} />
              </ActionIcon>
            </Group>
          </Stack>
        </Grid.Col>
      </Grid>

      {/* Tabs Section */}
      <Box mt={60}>
        <Tabs defaultValue="description" color="violet">
          <Tabs.List>
            <Tabs.Tab value="description">Описание</Tabs.Tab>

            <Tabs.Tab value="comments">
              Отзывы ({commentsCount})
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="description" pt="xl">
            <Text size="lg" style={{ lineHeight: 2, whiteSpace: 'pre-wrap' }}>
              { product.description || 'Описание скоро появится...'}
            </Text>
          </Tabs.Panel>

          <Tabs.Panel value="brewing" pt="xl">
            {product.brewing_guide ? (
              <Stack gap="md">
                {Object.entries(product.brewing_guide).map(([key, value]) => (
                  <Group key={key} gap="md">
                    <Text fw={600} tt="capitalize">{key}:</Text>
                    <Text c="dimmed">{String(value)}</Text>
                  </Group>
                ))}
              </Stack>
            ) : (
              <Text c="dimmed">Информация о заваривании скоро появится...</Text>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="comments" pt="xl">
            <Stack gap="xl">
              {/* Comment Form */}
              <Card
                p="lg"
                radius="md"
                style={{
                  background: 'rgba(26, 27, 30, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                <Stack gap="md">
                  <Text fw={600}>Оставить отзыв</Text>
                  <Textarea
                    placeholder={user ? 'Напишите ваш отзыв...' : 'Войдите, чтобы оставить отзыв'}
                    value={comment}
                    onChange={(e) => setComment(e.currentTarget.value)}
                    minRows={3}
                    disabled={!user}
                  />
                  <Group justify="flex-end">
                    <Button
                      variant="gradient"
                      gradient={{ from: 'violet', to: 'grape' }}
                      onClick={() => commentMutation.mutate(comment)}
                      loading={commentMutation.isPending}
                      disabled={!user || !comment.trim()}
                    >
                      Опубликовать
                    </Button>
                  </Group>
                </Stack>
              </Card>

              {/* Comments List */}
              {comments.length > 0 ? (
                <Stack gap="md">
                  {comments.map((c: any) => (
                    <Card
                      key={c.id}
                      p="lg"
                      radius="md"
                      style={{
                        background: 'rgba(26, 27, 30, 0.5)',
                        border: '1px solid rgba(255, 255, 255, 0.03)',
                      }}
                    >
                      <Group gap="md" mb="sm" justify="space-between">
                        <Group gap="md">
                          <Avatar 
                            radius="xl" 
                            size="md"
                            src={c.user?.avatar_url}
                          >
                            {c.user?.username?.charAt(0).toUpperCase() || 'U'}
                          </Avatar>
                          <Box>
                            <Text fw={600} size="sm">{c.user?.username || 'Пользователь'}</Text>
                            <Text size="xs" c="dimmed">
                              {new Date(c.created_at).toLocaleDateString('ru-RU')}
                            </Text>
                          </Box>
                        </Group>
                        {user && (
                          <Menu shadow="md" width={200}>
                            <Menu.Target>
                              <ActionIcon variant="subtle" color="gray">
                                <IconDotsVertical size={16} />
                              </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                              {c.user_id === user.id ? (
                                <Menu.Item
                                  color="red"
                                  leftSection={<IconTrash size={14} />}
                                  onClick={() => deleteCommentMutation.mutate(c.id)}
                                >
                                  Удалить
                                </Menu.Item>
                              ) : (
                                <Menu.Item
                                  color="orange"
                                  leftSection={<IconFlag size={14} />}
                                  onClick={() => handleOpenReport(c.id)}
                                >
                                  Пожаловаться
                                </Menu.Item>
                              )}
                            </Menu.Dropdown>
                          </Menu>
                        )}
                      </Group>
                      <Text style={{ lineHeight: 1.8 }}>{c.content}</Text>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <Text c="dimmed" ta="center" py="xl">
                  Пока нет отзывов. Будьте первым!
                </Text>
              )}
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Box>

      {/* Report Modal */}
      <Modal
        opened={reportModalOpened}
        onClose={closeReportModal}
        title="Пожаловаться на отзыв"
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Опишите причину жалобы. Мы рассмотрим её в ближайшее время.
          </Text>
          <Textarea
            placeholder="Укажите причину жалобы..."
            value={reportReason}
            onChange={(e) => setReportReason(e.currentTarget.value)}
            minRows={3}
          />
          <Group justify="flex-end" gap="sm">
            <Button variant="subtle" onClick={closeReportModal}>
              Отмена
            </Button>
            <Button
              color="orange"
              onClick={handleSubmitReport}
              loading={reportCommentMutation.isPending}
              disabled={!reportReason.trim()}
            >
              Отправить жалобу
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
