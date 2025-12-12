'use client';

import {
  Container,
  Title,
  Text,
  Box,
  Stack,
  Card,
  Group,
  Avatar,
  Button,
  TextInput,
  Divider,
  Tabs,
  Modal,
  PasswordInput,
  FileInput,
  Input,
  Textarea,
  Alert,
  Loader,
  Badge,
} from '@mantine/core';
import { IconUser, IconHeart, IconShoppingBag, IconSettings, IconLogout, IconAlertCircle, IconUpload, IconPhoto, IconX, IconMail, IconAt, IconCheck, IconPhone, IconPhoneOff } from '@tabler/icons-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store';
import { useEffect, useState, useRef, Suspense } from 'react';
import { userApi, orderApi } from '@/lib/api';
import { notifications } from '@mantine/notifications';
import Image from 'next/image';
import DeliveryDataBanner from '@/components/DeliveryDataBanner';
import PhoneVerificationModal from '@/components/PhoneVerificationModal';

function ProfilePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout, isLoading, checkAuth } = useAuthStore();
  const [editModal, setEditModal] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phoneVerificationModalOpen, setPhoneVerificationModalOpen] = useState(false);
  
  // Orders state
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  
  // Read tab from URL query params
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<string | null>(tabFromUrl || 'profile');
  
  // Sync tab with URL when it changes
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['profile', 'orders', 'favorites', 'settings'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);
  
  // Load orders when orders tab is active
  useEffect(() => {
    const loadOrders = async () => {
      if (activeTab === 'orders' && user) {
        setOrdersLoading(true);
        try {
          const response = await orderApi.getOrders();
          setOrders(response.data || []);
        } catch (error) {
          console.error('Failed to load orders:', error);
        } finally {
          setOrdersLoading(false);
        }
      }
    };
    loadOrders();
  }, [activeTab, user]);
  
  const handleTabChange = (value: string | null) => {
    setActiveTab(value);
    // Update URL without full navigation
    if (value && value !== 'profile') {
      router.push(`/profile?tab=${value}`, { scroll: false });
    } else {
      router.push('/profile', { scroll: false });
    }
  };

  useEffect(() => {
    if (!user && !isLoading) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Paste from clipboard handler
  useEffect(() => {
    if (editModal !== 'avatar') return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            handleFileSelect(file);
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [editModal]);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      notifications.show({
        title: 'Ошибка',
        message: 'Файл должен быть изображением',
        color: 'red',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      notifications.show({
        title: 'Ошибка',
        message: 'Размер файла не должен превышать 5 МБ',
        color: 'red',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
      setFormData({ ...formData, avatarFile: file });
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  if (!user) {
    return (
      <Container size="md" py={80} ta="center">
        <Text c="dimmed">Загрузка...</Text>
      </Container>
    );
  }

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleUpdateFirstname = async () => {
    try {
      setIsUpdating(true);
      await userApi.updateFirstname({ firstname: formData.firstname || '' });
      await checkAuth();
      setEditModal(null);
      notifications.show({
        title: 'Успешно',
        message: 'Имя обновлено',
        color: 'green',
      });
    } catch (error: any) {
      notifications.show({
        title: 'Ошибка',
        message: error.response?.data?.detail || 'Не удалось обновить имя',
        color: 'red',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateLastname = async () => {
    try {
      setIsUpdating(true);
      await userApi.updateLastname({ lastname: formData.lastname || '' });
      await checkAuth();
      setEditModal(null);
      notifications.show({
        title: 'Успешно',
        message: 'Фамилия обновлена',
        color: 'green',
      });
    } catch (error: any) {
      notifications.show({
        title: 'Ошибка',
        message: error.response?.data?.detail || 'Не удалось обновить фамилию',
        color: 'red',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateMiddlename = async () => {
    try {
      setIsUpdating(true);
      await userApi.updateMiddlename({ middlename: formData.middlename || '' });
      await checkAuth();
      setEditModal(null);
      notifications.show({
        title: 'Успешно',
        message: 'Отчество обновлено',
        color: 'green',
      });
    } catch (error: any) {
      notifications.show({
        title: 'Ошибка',
        message: error.response?.data?.detail || 'Не удалось обновить отчество',
        color: 'red',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateBirthdate = async () => {
    try {
      setIsUpdating(true);
      const date = formData.birthdate;
      const dateStr = date ? new Date(date).toISOString().split('T')[0] : '';
      await userApi.updateBirthdate({ birthdate: dateStr });
      await checkAuth();
      setEditModal(null);
      notifications.show({
        title: 'Успешно',
        message: 'Дата рождения обновлена',
        color: 'green',
      });
    } catch (error: any) {
      notifications.show({
        title: 'Ошибка',
        message: error.response?.data?.detail || 'Не удалось обновить дату рождения',
        color: 'red',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateAddress = async () => {
    try {
      setIsUpdating(true);
      await userApi.updateAddress({ address: formData.address || '' });
      await checkAuth();
      setEditModal(null);
      notifications.show({
        title: 'Успешно',
        message: 'Адрес обновлен',
        color: 'green',
      });
    } catch (error: any) {
      notifications.show({
        title: 'Ошибка',
        message: error.response?.data?.detail || 'Не удалось обновить адрес',
        color: 'red',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdatePostalCode = async () => {
    try {
      setIsUpdating(true);
      await userApi.updatePostalCode({ postal_code: formData.postal_code || '' });
      await checkAuth();
      setEditModal(null);
      notifications.show({
        title: 'Успешно',
        message: 'Почтовый индекс обновлен',
        color: 'green',
      });
    } catch (error: any) {
      notifications.show({
        title: 'Ошибка',
        message: error.response?.data?.detail || 'Не удалось обновить почтовый индекс',
        color: 'red',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdatePhoneNumber = async () => {
    try {
      setIsUpdating(true);
      await userApi.updatePhoneNumber({ phone_number: formData.phone_number || '' });
      await checkAuth();
      setEditModal(null);
      notifications.show({
        title: 'Успешно',
        message: 'Номер телефона обновлен. Пожалуйста, подтвердите новый номер телефона.',
        color: 'blue',
      });
    } catch (error: any) {
      notifications.show({
        title: 'Ошибка',
        message: error.response?.data?.detail || 'Не удалось обновить номер телефона',
        color: 'red',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUploadAvatar = async () => {
    const file = formData.avatarFile;
    if (!file) return;
    try {
      setIsUpdating(true);
      await userApi.uploadAvatar(file);
      await checkAuth();
      setEditModal(null);
      setPreviewUrl(null);
      setFormData({});
      notifications.show({
        title: 'Успешно',
        message: 'Аватар загружен',
        color: 'green',
      });
    } catch (error: any) {
      notifications.show({
        title: 'Ошибка',
        message: error.response?.data?.detail || 'Не удалось загрузить аватар',
        color: 'red',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      setIsUpdating(true);
      if (!formData.oldPassword || !formData.newPassword) {
        throw new Error('Заполните оба поля паролей');
      }
      await userApi.changePassword({
        old_password: formData.oldPassword,
        new_password: formData.newPassword,
      });
      setEditModal(null);
      setFormData({});
      notifications.show({
        title: 'Успешно',
        message: 'Пароль изменен',
        color: 'green',
      });
    } catch (error: any) {
      notifications.show({
        title: 'Ошибка',
        message: error.response?.data?.detail || error.message || 'Не удалось изменить пароль',
        color: 'red',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangeEmail = async () => {
    try {
      setIsUpdating(true);
      if (!formData.newEmail) {
        throw new Error('Введите новый email');
      }
      await userApi.changeEmail({ email: formData.newEmail });
      setEditModal(null);
      setFormData({});
      notifications.show({
        title: 'Успешно',
        message: 'На новый email отправлено письмо для подтверждения',
        color: 'green',
        autoClose: 10000,
      });
    } catch (error: any) {
      notifications.show({
        title: 'Ошибка',
        message: error.response?.data?.detail || error.message || 'Не удалось изменить email',
        color: 'red',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangeUsername = async () => {
    try {
      setIsUpdating(true);
      if (!formData.newUsername) {
        throw new Error('Введите новое имя пользователя');
      }
      await userApi.changeUsername({ username: formData.newUsername });
      await checkAuth();
      setEditModal(null);
      setFormData({});
      notifications.show({
        title: 'Успешно',
        message: 'Имя пользователя изменено',
        color: 'green',
      });
    } catch (error: any) {
      notifications.show({
        title: 'Ошибка',
        message: error.response?.data?.detail || error.message || 'Не удалось изменить имя пользователя',
        color: 'red',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setIsUpdating(true);
      if (!formData.deletePassword) {
        throw new Error('Введите пароль для подтверждения');
      }
      await userApi.deleteAccount(formData.deletePassword);
      setEditModal(null);
      setFormData({});
      notifications.show({
        title: 'Аккаунт удалён',
        message: 'Ваш аккаунт успешно удалён',
        color: 'green',
      });
      // Выходим и редиректим на главную
      await logout();
      router.push('/');
    } catch (error: any) {
      notifications.show({
        title: 'Ошибка',
        message: error.response?.data?.detail || error.message || 'Не удалось удалить аккаунт',
        color: 'red',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Container size="lg" py="xl">
      {/* Header */}
      <Card
        p="xl"
        radius="lg"
        mb="xl"
        style={{
          background: 'linear-gradient(135deg, rgba(36,24,14,0.95) 0%, rgba(22,16,12,0.98) 100%)',
          border: '1px solid rgba(212,137,79,0.2)',
          boxShadow: '0 12px 48px rgba(6,4,3,0.6)',
        }}
      >
        <Group gap="xl">
          <Box style={{ position: 'relative' }}>
            <Avatar
              src={user.avatar_url}
              size={120}
              radius={120}
              style={{
                border: '4px solid rgba(212,137,79,0.3)',
                boxShadow: '0 0 40px rgba(212,137,79,0.2)',
              }}
            >
              {user.username?.charAt(0).toUpperCase()}
            </Avatar>
          </Box>

          <Stack gap="xs" style={{ flex: 1 }}>
            <Title order={2} style={{ color: '#fbf6ee', fontFamily: 'Georgia, serif' }}>{user.username}</Title>
            <Text style={{ color: '#e8dcc8' }}>{user.email}</Text>
            {!user.is_email_confirmed && (
              <Text size="sm" style={{ color: '#d4894f' }}>
                ⚠️ Email не подтверждён
              </Text>
            )}
          </Stack>

          <Box style={{ marginLeft: 'auto' }}>
            <Button
              variant="subtle"
              color="red"
              leftSection={<IconLogout size={16} />}
              onClick={handleLogout}
              style={{ color: '#f87171' }}
            >
              Выйти
            </Button>
          </Box>
        </Group>
      </Card>

      {/* Delivery Data Banner */}
      {user && (
        <DeliveryDataBanner
          user={user}
          onVerifyPhone={() => setPhoneVerificationModalOpen(true)}
        />
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onChange={handleTabChange} styles={{
        tab: {
          color: '#e8dcc8',
          '&:hover': {
            backgroundColor: 'rgba(212,137,79,0.1)',
          },
        },
      }}>
        <Tabs.List mb="xl">
          <Tabs.Tab value="profile" leftSection={<IconUser size={16} />} style={{ color: '#e8dcc8' }}>
            Профиль
          </Tabs.Tab>
          <Tabs.Tab value="orders" leftSection={<IconShoppingBag size={16} />} style={{ color: '#e8dcc8' }}>
            Заказы
          </Tabs.Tab>
          <Tabs.Tab value="favorites" leftSection={<IconHeart size={16} />} style={{ color: '#e8dcc8' }}>
            Избранное
          </Tabs.Tab>
          <Tabs.Tab value="settings" leftSection={<IconSettings size={16} />} style={{ color: '#e8dcc8' }}>
            Настройки
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="profile">
          <Stack gap="lg">
            {/* Учетные данные */}
            <Card
              p="xl"
              radius="lg"
              style={{
                background: 'linear-gradient(180deg, rgba(36,24,14,0.94), rgba(22,16,12,0.98))',
                border: '1px solid rgba(212,137,79,0.08)',
                boxShadow: '0 10px 30px rgba(6,4,3,0.5)',
              }}
            >
              <Title order={4} mb="lg" style={{ color: '#fbf6ee', fontFamily: 'Georgia, serif' }}>Учетные данные</Title>

              <Stack gap="md">
                <Group grow>
                  <Box
                    p="md"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: 8,
                      border: '1px solid rgba(212,137,79,0.1)',
                    }}
                  >
                    <Text size="xs" fw={600} mb="xs" style={{ color: '#d4894f', textTransform: 'uppercase' }}>Имя пользователя</Text>
                    <Text fw={600} style={{ color: '#fbf6ee' }}>{user.username}</Text>
                  </Box>
                  <Box
                    p="md"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: 8,
                      border: '1px solid rgba(212,137,79,0.1)',
                    }}
                  >
                    <Text size="xs" fw={600} mb="xs" style={{ color: '#d4894f', textTransform: 'uppercase' }}>Email</Text>
                    <Text fw={600} style={{ color: '#fbf6ee' }}>{user.email}</Text>
                  </Box>
                </Group>
              </Stack>
            </Card>

            {/* Личная информация */}
            <Card
              p="xl"
              radius="lg"
              style={{
                background: 'linear-gradient(180deg, rgba(36,24,14,0.94), rgba(22,16,12,0.98))',
                border: '1px solid rgba(212,137,79,0.08)',
                boxShadow: '0 10px 30px rgba(6,4,3,0.5)',
              }}
            >
              <Title order={4} mb="lg" style={{ color: '#fbf6ee', fontFamily: 'Georgia, serif' }}>Личная информация</Title>

              <Stack gap="md">
                <Group grow>
                  <Box
                    p="md"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: 8,
                      border: '1px solid rgba(212,137,79,0.1)',
                    }}
                  >
                    <Text size="xs" fw={600} mb="xs" style={{ color: '#d4894f', textTransform: 'uppercase' }}>Фамилия</Text>
                    <Text fw={600} style={{ color: '#fbf6ee' }}>{user.lastname || <span style={{ color: '#a89880', fontStyle: 'italic' }}>Не указано</span>}</Text>
                  </Box>
                  <Box
                    p="md"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: 8,
                      border: '1px solid rgba(212,137,79,0.1)',
                    }}
                  >
                    <Text size="xs" fw={600} mb="xs" style={{ color: '#d4894f', textTransform: 'uppercase' }}>Имя</Text>
                    <Text fw={600} style={{ color: '#fbf6ee' }}>{user.firstname || <span style={{ color: '#a89880', fontStyle: 'italic' }}>Не указано</span>}</Text>
                  </Box>
                </Group>

                <Group grow>
                  <Box
                    p="md"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: 8,
                      border: '1px solid rgba(212,137,79,0.1)',
                    }}
                  >
                    <Text size="xs" fw={600} mb="xs" style={{ color: '#d4894f', textTransform: 'uppercase' }}>Отчество</Text>
                    <Text fw={600} style={{ color: '#fbf6ee' }}>{user.middlename || <span style={{ color: '#a89880', fontStyle: 'italic' }}>Не указано</span>}</Text>
                  </Box>
                  <Box
                    p="md"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: 8,
                      border: '1px solid rgba(212,137,79,0.1)',
                    }}
                  >
                    <Text size="xs" fw={600} mb="xs" style={{ color: '#d4894f', textTransform: 'uppercase' }}>Дата рождения</Text>
                    <Text fw={600} style={{ color: '#fbf6ee' }}>
                      {user.birthdate 
                        ? new Date(user.birthdate).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })
                        : <span style={{ color: '#a89880', fontStyle: 'italic' }}>Не указано</span>}
                    </Text>
                  </Box>
                </Group>
              </Stack>
            </Card>

            {/* Данные для доставки */}
            <Card
              p="xl"
              radius="lg"
              style={{
                background: 'linear-gradient(180deg, rgba(36,24,14,0.94), rgba(22,16,12,0.98))',
                border: '1px solid rgba(212,137,79,0.08)',
                boxShadow: '0 10px 30px rgba(6,4,3,0.5)',
              }}
            >
              <Title order={4} mb="lg" style={{ color: '#fbf6ee', fontFamily: 'Georgia, serif' }}>Данные для доставки</Title>

              <Stack gap="md">
                <Box
                  p="md"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: 8,
                    border: '1px solid rgba(212,137,79,0.1)',
                  }}
                >
                  <Text size="xs" fw={600} mb="xs" style={{ color: '#d4894f', textTransform: 'uppercase' }}>Адрес доставки</Text>
                  <Text fw={600} style={{ color: '#fbf6ee' }}>{user.address || <span style={{ color: '#a89880', fontStyle: 'italic' }}>Не указано</span>}</Text>
                </Box>

                <Group grow>
                  <Box
                    p="md"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: 8,
                      border: '1px solid rgba(212,137,79,0.1)',
                    }}
                  >
                    <Text size="xs" fw={600} mb="xs" style={{ color: '#d4894f', textTransform: 'uppercase' }}>Почтовый индекс</Text>
                    <Text fw={600} style={{ color: '#fbf6ee' }}>{user.postal_code || <span style={{ color: '#a89880', fontStyle: 'italic' }}>Не указано</span>}</Text>
                  </Box>
                  <Box
                    p="md"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: 8,
                      border: '1px solid rgba(212,137,79,0.1)',
                    }}
                  >
                    <Text size="xs" fw={600} mb="xs" style={{ color: '#d4894f', textTransform: 'uppercase' }}>Телефон</Text>
                    <Text fw={600} style={{ color: '#fbf6ee' }}>{user.phone_number || <span style={{ color: '#a89880', fontStyle: 'italic' }}>Не указано</span>}</Text>
                  </Box>
                </Group>
              </Stack>
            </Card>

            <Box style={{ textAlign: 'center' }}>
              <Button
                component={Link}
                href="/profile?tab=settings"
                variant="gradient"
                gradient={{ from: '#d4894f', to: '#8b5a2b' }}
                style={{ color: '#fbf6ee' }}
              >
                Отредактировать данные
              </Button>
            </Box>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="orders">
          {ordersLoading ? (
            <Card
              p="xl"
              radius="lg"
              ta="center"
              style={{
                background: 'linear-gradient(180deg, rgba(36,24,14,0.94), rgba(22,16,12,0.98))',
                border: '1px solid rgba(212,137,79,0.08)',
                boxShadow: '0 10px 30px rgba(6,4,3,0.5)',
              }}
            >
              <Loader color="#d4894f" size="lg" />
              <Text mt="md" style={{ color: '#e8dcc8' }}>Загрузка заказов...</Text>
            </Card>
          ) : orders.length === 0 ? (
            <Card
              p="xl"
              radius="lg"
              ta="center"
              style={{
                background: 'linear-gradient(180deg, rgba(36,24,14,0.94), rgba(22,16,12,0.98))',
                border: '1px solid rgba(212,137,79,0.08)',
                boxShadow: '0 10px 30px rgba(6,4,3,0.5)',
              }}
            >
              <IconShoppingBag size={60} style={{ opacity: 0.15, marginBottom: 16, color: '#d4894f' }} />
              <Title order={4} mb="xs" style={{ color: '#fbf6ee', fontFamily: 'Georgia, serif' }}>Заказов пока нет</Title>
              <Text mb="lg" style={{ color: '#e8dcc8' }}>
                Сделайте первый заказ в нашем магазине
              </Text>
              <Button
                component="a"
                href="/catalog"
                variant="gradient"
                gradient={{ from: '#d4894f', to: '#8b5a2b' }}
                style={{ color: '#fff' }}
              >
                Перейти в каталог
              </Button>
            </Card>
          ) : (
            <Stack gap="md">
              {orders.map((order) => {
                const statusLabels: Record<string, { label: string; color: string }> = {
                  awaiting_payment: { label: 'Ожидает оплаты', color: 'yellow' },
                  paid: { label: 'Оплачен', color: 'blue' },
                  processing: { label: 'Собирается', color: 'cyan' },
                  shipped: { label: 'Передан в доставку', color: 'grape' },
                  delivered: { label: 'Доставлен', color: 'green' },
                  cancelled: { label: 'Отменён', color: 'red' },
                };
                const deliveryLabels: Record<string, string> = {
                  pickup: 'Самовывоз',
                  russian_post: 'Почта России',
                };
                const status = statusLabels[order.status] || { label: order.status, color: 'gray' };
                const delivery = deliveryLabels[order.delivery_method] || order.delivery_method;
                // Используем final_amount_cents если есть, иначе считаем вручную
                const finalAmount = order.final_amount_cents ?? (order.total_amount_cents + (order.delivery_cost_cents || 0) - (order.discount_amount_cents || 0));
                
                return (
                  <Card
                    key={order.id}
                    p="lg"
                    radius="lg"
                    style={{
                      background: 'linear-gradient(180deg, rgba(36,24,14,0.94), rgba(22,16,12,0.98))',
                      border: '1px solid rgba(212,137,79,0.08)',
                      boxShadow: '0 10px 30px rgba(6,4,3,0.5)',
                    }}
                  >
                    <Group justify="space-between" mb="md">
                      <Group gap="sm">
                        <Text fw={600} style={{ color: '#fbf6ee' }}>Заказ #{order.id}</Text>
                        <Badge color={status.color} variant="light">{status.label}</Badge>
                      </Group>
                      <Text size="sm" style={{ color: 'rgba(232,220,200,0.6)' }}>
                        {new Date(order.created_at).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </Group>
                    
                    <Divider mb="md" style={{ borderColor: 'rgba(212,137,79,0.1)' }} />
                    
                    {/* Order Items */}
                    <Stack gap="xs" mb="md">
                      {order.items?.map((item: any) => (
                        <Group key={item.id} justify="space-between">
                          <Text size="sm" style={{ color: '#e8dcc8' }}>
                            {item.title} {item.sku_info && `(${item.sku_info})`} × {item.quantity}
                          </Text>
                          <Text size="sm" style={{ color: '#d4894f' }}>
                            {(item.price_cents * item.quantity / 100).toLocaleString('ru-RU')} ₽
                          </Text>
                        </Group>
                      ))}
                    </Stack>
                    
                    <Divider mb="md" style={{ borderColor: 'rgba(212,137,79,0.1)' }} />
                    
                    {/* Delivery & Total */}
                    <Group justify="space-between" mb="xs">
                      <Text size="sm" style={{ color: 'rgba(232,220,200,0.7)' }}>
                        Доставка: {delivery}
                      </Text>
                      <Text size="sm" style={{ color: order.delivery_cost_cents > 0 ? '#e8dcc8' : '#4caf50' }}>
                        {order.delivery_cost_cents > 0 ? `${(order.delivery_cost_cents / 100).toLocaleString('ru-RU')} ₽` : 'Бесплатно'}
                      </Text>
                    </Group>
                    
                    {order.discount_amount_cents > 0 && (
                      <Group justify="space-between" mb="xs">
                        <Text size="sm" style={{ color: 'rgba(232,220,200,0.7)' }}>
                          Скидка{order.promo_code ? ` (${order.promo_code})` : ''}
                        </Text>
                        <Text size="sm" style={{ color: '#4caf50' }}>
                          -{(order.discount_amount_cents / 100).toLocaleString('ru-RU')} ₽
                        </Text>
                      </Group>
                    )}
                    
                    <Group justify="space-between">
                      <Text fw={600} style={{ color: '#fbf6ee' }}>Итого</Text>
                      <Text fw={700} size="lg" style={{ color: '#d4894f' }}>
                        {(finalAmount / 100).toLocaleString('ru-RU')} ₽
                      </Text>
                    </Group>
                    
                    {/* Tracking Number */}
                    {order.tracking_number && (
                      <>
                        <Divider my="md" style={{ borderColor: 'rgba(212,137,79,0.1)' }} />
                        <Group gap="xs">
                          <Text size="sm" style={{ color: 'rgba(232,220,200,0.7)' }}>Трек-номер:</Text>
                          <Text size="sm" fw={500} style={{ color: '#d4894f' }}>{order.tracking_number}</Text>
                        </Group>
                      </>
                    )}
                    
                    {/* Payment button for awaiting payment orders */}
                    {order.status === 'awaiting_payment' && (
                      <>
                        <Divider my="md" style={{ borderColor: 'rgba(212,137,79,0.1)' }} />
                        <Button
                          variant="gradient"
                          gradient={{ from: '#d4894f', to: '#8b5a2b' }}
                          fullWidth
                          onClick={async () => {
                            try {
                              // Get fresh payment URL
                              const response = await orderApi.getOrder(order.id);
                              if (response.data.payment_url) {
                                window.location.href = response.data.payment_url;
                              } else {
                                notifications.show({
                                  title: 'Ошибка',
                                  message: 'Не удалось получить ссылку на оплату',
                                  color: 'red',
                                });
                              }
                            } catch (error) {
                              notifications.show({
                                title: 'Ошибка',
                                message: 'Не удалось загрузить данные заказа',
                                color: 'red',
                              });
                            }
                          }}
                        >
                          Оплатить заказ
                        </Button>
                      </>
                    )}
                  </Card>
                );
              })}
            </Stack>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="favorites">
          <Card
            p="xl"
            radius="lg"
            ta="center"
            style={{
              background: 'linear-gradient(180deg, rgba(36,24,14,0.94), rgba(22,16,12,0.98))',
              border: '1px solid rgba(212,137,79,0.08)',
              boxShadow: '0 10px 30px rgba(6,4,3,0.5)',
            }}
          >
            <IconHeart size={60} style={{ opacity: 0.15, marginBottom: 16, color: '#d4894f' }} />
            <Title order={4} mb="xs" style={{ color: '#fbf6ee', fontFamily: 'Georgia, serif' }}>Избранное пусто</Title>
            <Text mb="lg" style={{ color: '#e8dcc8' }}>
              Добавляйте понравившиеся товары в избранное
            </Text>
            <Button
              component="a"
              href="/catalog"
              variant="gradient"
              gradient={{ from: '#d4894f', to: '#8b5a2b' }}
              style={{ color: '#fff' }}
            >
              Смотреть каталог
            </Button>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="settings">
          <Stack gap="lg">
            {/* Personal Information Section */}
            <Card
              p="xl"
              radius="lg"
              style={{
                background: 'linear-gradient(180deg, rgba(36,24,14,0.94), rgba(22,16,12,0.98))',
                border: '1px solid rgba(212,137,79,0.08)',
                boxShadow: '0 10px 30px rgba(6,4,3,0.5)',
              }}
            >
              <Title order={4} mb="lg" style={{ color: '#fbf6ee', fontFamily: 'Georgia, serif' }}>Личная информация</Title>

              <Stack gap="lg">
                {/* First Name & Last Name */}
                <Group grow>
                  <Box
                    p="md"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: 8,
                      border: '1px solid rgba(212,137,79,0.1)',
                    }}
                  >
                    <Group justify="space-between" mb="xs">
                      <Box>
                        <Text size="sm" style={{ color: '#e8dcc8' }}>Имя</Text>
                        <Text fw={600} style={{ color: '#fbf6ee' }}>{user.firstname || '—'}</Text>
                      </Box>
                      <Button
                        variant="light"
                        size="xs"
                        style={{ 
                          background: 'rgba(212,137,79,0.15)',
                          color: '#d4894f',
                          border: 'none',
                        }}
                        onClick={() => {
                          setFormData({ firstname: user.firstname || '' });
                          setEditModal('firstname');
                        }}
                      >
                        Изменить
                      </Button>
                    </Group>
                  </Box>
                  <Box
                    p="md"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: 8,
                      border: '1px solid rgba(212,137,79,0.1)',
                    }}
                  >
                    <Group justify="space-between" mb="xs">
                      <Box>
                        <Text size="sm" style={{ color: '#e8dcc8' }}>Фамилия</Text>
                        <Text fw={600} style={{ color: '#fbf6ee' }}>{user.lastname || '—'}</Text>
                      </Box>
                      <Button
                        variant="light"
                        size="xs"
                        style={{ 
                          background: 'rgba(212,137,79,0.15)',
                          color: '#d4894f',
                          border: 'none',
                        }}
                        onClick={() => {
                          setFormData({ lastname: user.lastname || '' });
                          setEditModal('lastname');
                        }}
                      >
                        Изменить
                      </Button>
                    </Group>
                  </Box>
                </Group>

                {/* Middle Name */}
                <Box
                  p="md"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: 8,
                    border: '1px solid rgba(212,137,79,0.1)',
                  }}
                >
                  <Group justify="space-between">
                    <Box>
                      <Text size="sm" style={{ color: '#e8dcc8' }}>Отчество</Text>
                      <Text fw={600} style={{ color: '#fbf6ee' }}>{user.middlename || '—'}</Text>
                    </Box>
                    <Button
                      variant="light"
                      size="xs"
                      style={{ 
                        background: 'rgba(212,137,79,0.15)',
                        color: '#d4894f',
                        border: 'none',
                      }}
                      onClick={() => {
                        setFormData({ middlename: user.middlename || '' });
                        setEditModal('middlename');
                      }}
                    >
                      Изменить
                    </Button>
                  </Group>
                </Box>

                {/* Birthdate */}
                <Box
                  p="md"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: 8,
                    border: '1px solid rgba(212,137,79,0.1)',
                  }}
                >
                  <Group justify="space-between">
                    <Box>
                      <Text size="sm" style={{ color: '#e8dcc8' }}>Дата рождения</Text>
                      <Text fw={600} style={{ color: '#fbf6ee' }}>{user.birthdate ? new Date(user.birthdate).toLocaleDateString('ru-RU') : '—'}</Text>
                    </Box>
                    <Button
                      variant="light"
                      size="xs"
                      style={{ 
                        background: 'rgba(212,137,79,0.15)',
                        color: '#d4894f',
                        border: 'none',
                      }}
                      onClick={() => {
                        setFormData({ birthdate: user.birthdate ? new Date(user.birthdate) : null });
                        setEditModal('birthdate');
                      }}
                    >
                      Изменить
                    </Button>
                  </Group>
                </Box>

                {/* Address */}
                <Box
                  p="md"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: 8,
                    border: '1px solid rgba(212,137,79,0.1)',
                  }}
                >
                  <Group justify="space-between">
                    <Box style={{ flex: 1 }}>
                      <Text size="sm" style={{ color: '#e8dcc8' }}>Адрес</Text>
                      <Text fw={600} style={{ wordBreak: 'break-word', color: '#fbf6ee' }}>
                        {user.address || '—'}
                      </Text>
                    </Box>
                    <Button
                      variant="light"
                      size="xs"
                      style={{ 
                        background: 'rgba(212,137,79,0.15)',
                        color: '#d4894f',
                        border: 'none',
                      }}
                      onClick={() => {
                        setFormData({ address: user.address || '' });
                        setEditModal('address');
                      }}
                    >
                      Изменить
                    </Button>
                  </Group>
                </Box>

                {/* Postal Code */}
                <Box
                  p="md"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: 8,
                    border: '1px solid rgba(212,137,79,0.1)',
                  }}
                >
                  <Group justify="space-between">
                    <Box style={{ flex: 1 }}>
                      <Text size="sm" style={{ color: '#e8dcc8' }}>Почтовый индекс</Text>
                      <Text fw={600} style={{ wordBreak: 'break-word', color: '#fbf6ee' }}>
                        {user.postal_code || '—'}
                      </Text>
                    </Box>
                    <Button
                      variant="light"
                      size="xs"
                      style={{ 
                        background: 'rgba(212,137,79,0.15)',
                        color: '#d4894f',
                        border: 'none',
                      }}
                      onClick={() => {
                        setFormData({ postal_code: user.postal_code || '' });
                        setEditModal('postal_code');
                      }}
                    >
                      Изменить
                    </Button>
                  </Group>
                </Box>

                {/* Avatar */}
                <Box
                  p="md"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: 8,
                    border: '1px solid rgba(212,137,79,0.1)',
                  }}
                >
                  <Group justify="space-between">
                    <Box>
                      <Text size="sm" style={{ color: '#e8dcc8' }}>Фото профиля</Text>
                      <Text fw={600} size="sm" style={{ color: '#fbf6ee' }}>Загрузить новое</Text>
                    </Box>
                    <Button
                      variant="light"
                      size="xs"
                      style={{ 
                        background: 'rgba(212,137,79,0.15)',
                        color: '#d4894f',
                        border: 'none',
                      }}
                      onClick={() => {
                        setPreviewUrl(null);
                        setFormData({});
                        setEditModal('avatar');
                      }}
                    >
                      Загрузить
                    </Button>
                  </Group>
                </Box>
              </Stack>
            </Card>

            {/* Account Section */}
            <Card
              p="xl"
              radius="lg"
              style={{
                background: 'linear-gradient(180deg, rgba(36,24,14,0.94), rgba(22,16,12,0.98))',
                border: '1px solid rgba(212,137,79,0.08)',
                boxShadow: '0 10px 30px rgba(6,4,3,0.5)',
              }}
            >
              <Title order={4} mb="lg" style={{ color: '#fbf6ee', fontFamily: 'Georgia, serif' }}>Аккаунт</Title>

              <Stack gap="lg">
                {/* Email */}
                <Box
                  p="md"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: 8,
                    border: '1px solid rgba(212,137,79,0.1)',
                  }}
                >
                  <Group justify="space-between" align="flex-start">
                    <Box style={{ flex: 1 }}>
                      <Group gap="xs" mb={4}>
                        <IconMail size={16} style={{ color: '#d4894f' }} />
                        <Text size="sm" style={{ color: '#e8dcc8' }}>Email</Text>
                      </Group>
                      <Text fw={600} style={{ color: '#fbf6ee' }}>{user.email}</Text>
                      {user.is_email_confirmed ? (
                        <Group gap={4} mt={4}>
                          <IconCheck size={14} style={{ color: '#4ade80' }} />
                          <Text size="xs" style={{ color: '#4ade80' }}>Подтверждён</Text>
                        </Group>
                      ) : (
                        <Text size="xs" mt={4} style={{ color: '#fbbf24' }}>
                          ⚠️ Не подтверждён — проверьте почту
                        </Text>
                      )}
                    </Box>
                    <Button
                      variant="light"
                      size="xs"
                      style={{ 
                        background: 'rgba(212,137,79,0.15)',
                        color: '#d4894f',
                        border: 'none',
                      }}
                      onClick={() => {
                        setFormData({ newEmail: '' });
                        setEditModal('email');
                      }}
                    >
                      Изменить
                    </Button>
                  </Group>
                </Box>

                {/* Phone */}
                <Box
                  p="md"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: 8,
                    border: '1px solid rgba(212,137,79,0.1)',
                  }}
                >
                  <Group justify="space-between" align="flex-start">
                    <Box style={{ flex: 1 }}>
                      <Group gap="xs" mb={4}>
                        <IconPhone size={16} style={{ color: '#d4894f' }} />
                        <Text size="sm" style={{ color: '#e8dcc8' }}>Телефон</Text>
                      </Group>
                      <Text fw={600} style={{ color: '#fbf6ee' }}>{user.phone_number || '—'}</Text>
                      {user.phone_number && (
                        user.is_phone_confirmed ? (
                          <Group gap={4} mt={4}>
                            <IconCheck size={14} style={{ color: '#4ade80' }} />
                            <Text size="xs" style={{ color: '#4ade80' }}>Подтверждён</Text>
                          </Group>
                        ) : (
                          <Text size="xs" mt={4} style={{ color: '#fbbf24' }}>
                            ⚠️ Не подтверждён — подтвердите номер
                          </Text>
                        )
                      )}
                    </Box>
                    <Button
                      variant="light"
                      size="xs"
                      style={{ 
                        background: 'rgba(212,137,79,0.15)',
                        color: '#d4894f',
                        border: 'none',
                      }}
                      onClick={() => {
                        setFormData({ phone_number: user.phone_number || '' });
                        setEditModal('phone_number');
                      }}
                    >
                      {user.phone_number ? 'Изменить' : 'Добавить'}
                    </Button>
                  </Group>
                </Box>

                {/* Username */}
                <Box
                  p="md"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: 8,
                    border: '1px solid rgba(212,137,79,0.1)',
                  }}
                >
                  <Group justify="space-between">
                    <Box>
                      <Group gap="xs" mb={4}>
                        <IconAt size={16} style={{ color: '#d4894f' }} />
                        <Text size="sm" style={{ color: '#e8dcc8' }}>Имя пользователя</Text>
                      </Group>
                      <Text fw={600} style={{ color: '#fbf6ee' }}>{user.username}</Text>
                    </Box>
                    <Button
                      variant="light"
                      size="xs"
                      style={{ 
                        background: 'rgba(212,137,79,0.15)',
                        color: '#d4894f',
                        border: 'none',
                      }}
                      onClick={() => {
                        setFormData({ newUsername: user.username || '' });
                        setEditModal('username');
                      }}
                    >
                      Изменить
                    </Button>
                  </Group>
                </Box>
              </Stack>
            </Card>

            {/* Security Section */}
            <Card
              p="xl"
              radius="lg"
              style={{
                background: 'linear-gradient(180deg, rgba(36,24,14,0.94), rgba(22,16,12,0.98))',
                border: '1px solid rgba(212,137,79,0.08)',
                boxShadow: '0 10px 30px rgba(6,4,3,0.5)',
              }}
            >
              <Title order={4} mb="lg" style={{ color: '#fbf6ee', fontFamily: 'Georgia, serif' }}>Безопасность</Title>

              <Stack gap="md">
                <Box>
                  <Text fw={600} mb="xs" style={{ color: '#fbf6ee' }}>Смена пароля</Text>
                  <Button
                    variant="light"
                    style={{ 
                      background: 'rgba(212,137,79,0.15)',
                      color: '#d4894f',
                      border: 'none',
                    }}
                    onClick={() => {
                      setFormData({});
                      setEditModal('password');
                    }}
                  >
                    Изменить пароль
                  </Button>
                </Box>

                <Divider style={{ borderColor: 'rgba(212,137,79,0.1)' }} />

                <Box>
                  <Text fw={600} mb="xs" c="red">
                    Опасная зона
                  </Text>
                  <Button 
                    variant="subtle" 
                    color="red"
                    onClick={() => {
                      setFormData({});
                      setEditModal('delete');
                    }}
                  >
                    Удалить аккаунт
                  </Button>
                </Box>
              </Stack>
            </Card>
          </Stack>
        </Tabs.Panel>
      </Tabs>

      {/* Modals for editing */}

      {/* First Name Modal */}
      <Modal
        opened={editModal === 'firstname'}
        onClose={() => setEditModal(null)}
        title="Изменить имя"
        centered
        styles={{
          content: { background: 'linear-gradient(180deg, rgba(36,24,14,0.98), rgba(22,16,12,0.99))', border: '1px solid rgba(212,137,79,0.2)' },
          header: { background: 'transparent', color: '#fbf6ee' },
          title: { fontFamily: 'Georgia, serif', color: '#fbf6ee' },
        }}
      >
        <Stack gap="md">
          <TextInput
            label="Имя"
            placeholder="Введите имя"
            value={formData.firstname || ''}
            onChange={(e) => setFormData({ ...formData, firstname: e.target.value })}
            styles={{ input: { background: 'rgba(255,255,255,0.05)', color: '#fbf6ee', borderColor: 'rgba(212,137,79,0.2)' }, label: { color: '#e8dcc8' } }}
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setEditModal(null)} style={{ color: '#e8dcc8' }}>
              Отмена
            </Button>
            <Button onClick={handleUpdateFirstname} loading={isUpdating} variant="gradient" gradient={{ from: '#d4894f', to: '#8b5a2b' }} style={{ color: '#fff' }}>
              Сохранить
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Last Name Modal */}
      <Modal
        opened={editModal === 'lastname'}
        onClose={() => setEditModal(null)}
        title="Изменить фамилию"
        centered
        styles={{
          content: { background: 'linear-gradient(180deg, rgba(36,24,14,0.98), rgba(22,16,12,0.99))', border: '1px solid rgba(212,137,79,0.2)' },
          header: { background: 'transparent', color: '#fbf6ee' },
          title: { fontFamily: 'Georgia, serif', color: '#fbf6ee' },
        }}
      >
        <Stack gap="md">
          <TextInput
            label="Фамилия"
            placeholder="Введите фамилию"
            value={formData.lastname || ''}
            onChange={(e) => setFormData({ ...formData, lastname: e.target.value })}
            styles={{ input: { background: 'rgba(255,255,255,0.05)', color: '#fbf6ee', borderColor: 'rgba(212,137,79,0.2)' }, label: { color: '#e8dcc8' } }}
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setEditModal(null)} style={{ color: '#e8dcc8' }}>
              Отмена
            </Button>
            <Button onClick={handleUpdateLastname} loading={isUpdating} variant="gradient" gradient={{ from: '#d4894f', to: '#8b5a2b' }} style={{ color: '#fff' }}>
              Сохранить
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Middle Name Modal */}
      <Modal
        opened={editModal === 'middlename'}
        onClose={() => setEditModal(null)}
        title="Изменить отчество"
        centered
        styles={{
          content: { background: 'linear-gradient(180deg, rgba(36,24,14,0.98), rgba(22,16,12,0.99))', border: '1px solid rgba(212,137,79,0.2)' },
          header: { background: 'transparent', color: '#fbf6ee' },
          title: { fontFamily: 'Georgia, serif', color: '#fbf6ee' },
        }}
      >
        <Stack gap="md">
          <TextInput
            label="Отчество"
            placeholder="Введите отчество"
            value={formData.middlename || ''}
            onChange={(e) => setFormData({ ...formData, middlename: e.target.value })}
            styles={{ input: { background: 'rgba(255,255,255,0.05)', color: '#fbf6ee', borderColor: 'rgba(212,137,79,0.2)' }, label: { color: '#e8dcc8' } }}
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setEditModal(null)} style={{ color: '#e8dcc8' }}>
              Отмена
            </Button>
            <Button onClick={handleUpdateMiddlename} loading={isUpdating} variant="gradient" gradient={{ from: '#d4894f', to: '#8b5a2b' }} style={{ color: '#fff' }}>
              Сохранить
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Birthdate Modal */}
      <Modal
        opened={editModal === 'birthdate'}
        onClose={() => setEditModal(null)}
        title="Изменить дату рождения"
        centered
        styles={{
          content: { background: 'linear-gradient(180deg, rgba(36,24,14,0.98), rgba(22,16,12,0.99))', border: '1px solid rgba(212,137,79,0.2)' },
          header: { background: 'transparent', color: '#fbf6ee' },
          title: { fontFamily: 'Georgia, serif', color: '#fbf6ee' },
        }}
      >
        <Stack gap="md">
          <TextInput
            label="Дата рождения"
            placeholder="Выберите дату"
            type="date"
            value={formData.birthdate ? formData.birthdate.toISOString().split('T')[0] : ''}
            onChange={(e) => {
              const date = e.target.value ? new Date(e.target.value + 'T00:00:00') : null;
              setFormData({ ...formData, birthdate: date });
            }}
            styles={{ input: { background: 'rgba(255,255,255,0.05)', color: '#fbf6ee', borderColor: 'rgba(212,137,79,0.2)' }, label: { color: '#e8dcc8' } }}
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setEditModal(null)} style={{ color: '#e8dcc8' }}>
              Отмена
            </Button>
            <Button onClick={handleUpdateBirthdate} loading={isUpdating} variant="gradient" gradient={{ from: '#d4894f', to: '#8b5a2b' }} style={{ color: '#fff' }}>
              Сохранить
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Address Modal */}
      <Modal
        opened={editModal === 'address'}
        onClose={() => setEditModal(null)}
        title="Изменить адрес"
        centered
        styles={{
          content: { background: 'linear-gradient(180deg, rgba(36,24,14,0.98), rgba(22,16,12,0.99))', border: '1px solid rgba(212,137,79,0.2)' },
          header: { background: 'transparent', color: '#fbf6ee' },
          title: { fontFamily: 'Georgia, serif', color: '#fbf6ee' },
        }}
      >
        <Stack gap="md">
          <Textarea
            label="Адрес"
            placeholder="Введите адрес"
            value={formData.address || ''}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            rows={4}
            styles={{ input: { background: 'rgba(255,255,255,0.05)', color: '#fbf6ee', borderColor: 'rgba(212,137,79,0.2)' }, label: { color: '#e8dcc8' } }}
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setEditModal(null)} style={{ color: '#e8dcc8' }}>
              Отмена
            </Button>
            <Button onClick={handleUpdateAddress} loading={isUpdating} variant="gradient" gradient={{ from: '#d4894f', to: '#8b5a2b' }} style={{ color: '#fff' }}>
              Сохранить
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Postal Code Modal */}
      <Modal
        opened={editModal === 'postal_code'}
        onClose={() => setEditModal(null)}
        title="Изменить почтовый индекс"
        centered
        styles={{
          content: { background: 'linear-gradient(180deg, rgba(36,24,14,0.98), rgba(22,16,12,0.99))', border: '1px solid rgba(212,137,79,0.2)' },
          header: { background: 'transparent', color: '#fbf6ee' },
          title: { fontFamily: 'Georgia, serif', color: '#fbf6ee' },
        }}
      >
        <Stack gap="md">
          <TextInput
            label="Почтовый индекс"
            placeholder="123456"
            value={formData.postal_code || ''}
            onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
            styles={{ input: { background: 'rgba(255,255,255,0.05)', color: '#fbf6ee', borderColor: 'rgba(212,137,79,0.2)' }, label: { color: '#e8dcc8' } }}
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setEditModal(null)} style={{ color: '#e8dcc8' }}>
              Отмена
            </Button>
            <Button onClick={handleUpdatePostalCode} loading={isUpdating} variant="gradient" gradient={{ from: '#d4894f', to: '#8b5a2b' }} style={{ color: '#fff' }}>
              Сохранить
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Phone Number Modal */}
      <Modal
        opened={editModal === 'phone_number'}
        onClose={() => setEditModal(null)}
        title="Изменить номер телефона"
        centered
        styles={{
          content: { background: 'linear-gradient(180deg, rgba(36,24,14,0.98), rgba(22,16,12,0.99))', border: '1px solid rgba(212,137,79,0.2)' },
          header: { background: 'transparent', color: '#fbf6ee' },
          title: { fontFamily: 'Georgia, serif', color: '#fbf6ee' },
        }}
      >
        <Stack gap="md">
          <TextInput
            label="Номер телефона"
            placeholder="+7 (999) 123-45-67"
            value={formData.phone_number || ''}
            onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
            styles={{ input: { background: 'rgba(255,255,255,0.05)', color: '#fbf6ee', borderColor: 'rgba(212,137,79,0.2)' }, label: { color: '#e8dcc8' } }}
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setEditModal(null)} style={{ color: '#e8dcc8' }}>
              Отмена
            </Button>
            <Button onClick={handleUpdatePhoneNumber} loading={isUpdating} variant="gradient" gradient={{ from: '#d4894f', to: '#8b5a2b' }} style={{ color: '#fff' }}>
              Сохранить
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Avatar Modal */}
      <Modal
        opened={editModal === 'avatar'}
        onClose={() => {
          setEditModal(null);
          setPreviewUrl(null);
          setFormData({});
        }}
        title="Загрузить аватар"
        centered
        size="lg"
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
          <Box
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${isDragging ? '#d4894f' : 'rgba(212,137,79,0.3)'}`,
              borderRadius: 12,
              padding: '48px 24px',
              textAlign: 'center',
              background: isDragging ? 'rgba(212,137,79,0.05)' : 'rgba(255,255,255,0.02)',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              position: 'relative',
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />

            {previewUrl ? (
              <Box style={{ position: 'relative' }}>
                <Avatar
                  src={previewUrl}
                  size={200}
                  radius={200}
                  mx="auto"
                  mb="md"
                  style={{
                    border: '4px solid rgba(212,137,79,0.3)',
                    boxShadow: '0 8px 32px rgba(212,137,79,0.2)',
                  }}
                />
                <Button
                  variant="subtle"
                  color="red"
                  size="xs"
                  leftSection={<IconX size={14} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewUrl(null);
                    setFormData({});
                  }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: '50%',
                    transform: 'translateX(120px)',
                  }}
                >
                  Удалить
                </Button>
              </Box>
            ) : (
              <>
                <IconUpload size={48} style={{ color: '#d4894f', opacity: 0.6, margin: '0 auto 16px' }} />
                <Text fw={600} mb="xs" style={{ color: '#fbf6ee' }}>
                  Перетащите изображение сюда
                </Text>
                <Text size="sm" mb="xs" style={{ color: '#e8dcc8' }}>
                  или нажмите, чтобы выбрать файл
                </Text>
                <Text size="xs" style={{ color: '#d4894f', opacity: 0.7 }}>
                  Также можно вставить из буфера обмена (Ctrl+V / Cmd+V)
                </Text>
              </>
            )}
          </Box>

          <Text size="sm" style={{ color: '#e8dcc8' }} ta="center">
            Поддерживаемые форматы: PNG, JPEG, WebP • Макс. размер: 5 МБ
          </Text>

          <Group justify="flex-end">
            <Button
              variant="subtle"
              onClick={() => {
                setEditModal(null);
                setPreviewUrl(null);
                setFormData({});
              }}
              style={{ color: '#e8dcc8' }}
            >
              Отмена
            </Button>
            <Button
              onClick={handleUploadAvatar}
              loading={isUpdating}
              disabled={!formData.avatarFile}
              variant="gradient"
              gradient={{ from: '#d4894f', to: '#8b5a2b' }}
              style={{ color: '#fff' }}
            >
              Загрузить
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Password Modal */}
      <Modal
        opened={editModal === 'password'}
        onClose={() => setEditModal(null)}
        title="Изменить пароль"
        centered
        styles={{
          content: { background: 'linear-gradient(180deg, rgba(36,24,14,0.98), rgba(22,16,12,0.99))', border: '1px solid rgba(212,137,79,0.2)' },
          header: { background: 'transparent', color: '#fbf6ee' },
          title: { fontFamily: 'Georgia, serif', color: '#fbf6ee' },
        }}
      >
        <Stack gap="md">
          <Alert icon={<IconAlertCircle size={16} />} style={{ background: 'rgba(212,137,79,0.15)', border: '1px solid rgba(212,137,79,0.3)', color: '#e8dcc8' }} title="Требования к паролю">
            Пароль должен быть достаточно надежным
          </Alert>
          <PasswordInput
            label="Старый пароль"
            placeholder="Введите старый пароль"
            value={formData.oldPassword || ''}
            onChange={(e) => setFormData({ ...formData, oldPassword: e.target.value })}
            styles={{ input: { background: 'rgba(255,255,255,0.05)', color: '#fbf6ee', borderColor: 'rgba(212,137,79,0.2)' }, label: { color: '#e8dcc8' } }}
          />
          <PasswordInput
            label="Новый пароль"
            placeholder="Введите новый пароль"
            value={formData.newPassword || ''}
            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
            styles={{ input: { background: 'rgba(255,255,255,0.05)', color: '#fbf6ee', borderColor: 'rgba(212,137,79,0.2)' }, label: { color: '#e8dcc8' } }}
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setEditModal(null)} style={{ color: '#e8dcc8' }}>
              Отмена
            </Button>
            <Button onClick={handleChangePassword} loading={isUpdating} variant="gradient" gradient={{ from: '#d4894f', to: '#8b5a2b' }} style={{ color: '#fff' }}>
              Изменить
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Email Change Modal */}
      <Modal
        opened={editModal === 'email'}
        onClose={() => setEditModal(null)}
        title="Изменить email"
        centered
        styles={{
          content: { background: 'linear-gradient(180deg, rgba(36,24,14,0.98), rgba(22,16,12,0.99))', border: '1px solid rgba(212,137,79,0.2)' },
          header: { background: 'transparent', color: '#fbf6ee' },
          title: { fontFamily: 'Georgia, serif', color: '#fbf6ee' },
        }}
      >
        <Stack gap="md">
          <Alert 
            icon={<IconMail size={16} />} 
            style={{ background: 'rgba(212,137,79,0.15)', border: '1px solid rgba(212,137,79,0.3)', color: '#e8dcc8' }} 
            title="Подтверждение email"
          >
            На новый адрес будет отправлено письмо для подтверждения. До подтверждения email не изменится.
          </Alert>
          <Box>
            <Text size="sm" mb="xs" style={{ color: '#e8dcc8' }}>Текущий email</Text>
            <Text fw={600} style={{ color: '#fbf6ee' }}>{user.email}</Text>
          </Box>
          <TextInput
            label="Новый email"
            placeholder="Введите новый email"
            type="email"
            value={formData.newEmail || ''}
            onChange={(e) => setFormData({ ...formData, newEmail: e.target.value })}
            leftSection={<IconMail size={16} style={{ color: '#d4894f' }} />}
            styles={{ input: { background: 'rgba(255,255,255,0.05)', color: '#fbf6ee', borderColor: 'rgba(212,137,79,0.2)' }, label: { color: '#e8dcc8' } }}
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setEditModal(null)} style={{ color: '#e8dcc8' }}>
              Отмена
            </Button>
            <Button 
              onClick={handleChangeEmail} 
              loading={isUpdating} 
              variant="gradient" 
              gradient={{ from: '#d4894f', to: '#8b5a2b' }} 
              style={{ color: '#fff' }}
              disabled={!formData.newEmail || formData.newEmail === user.email}
            >
              Отправить подтверждение
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Username Change Modal */}
      <Modal
        opened={editModal === 'username'}
        onClose={() => setEditModal(null)}
        title="Изменить имя пользователя"
        centered
        styles={{
          content: { background: 'linear-gradient(180deg, rgba(36,24,14,0.98), rgba(22,16,12,0.99))', border: '1px solid rgba(212,137,79,0.2)' },
          header: { background: 'transparent', color: '#fbf6ee' },
          title: { fontFamily: 'Georgia, serif', color: '#fbf6ee' },
        }}
      >
        <Stack gap="md">
          <TextInput
            label="Новое имя пользователя"
            placeholder="Введите новое имя пользователя"
            value={formData.newUsername || ''}
            onChange={(e) => setFormData({ ...formData, newUsername: e.target.value })}
            leftSection={<IconAt size={16} style={{ color: '#d4894f' }} />}
            styles={{ input: { background: 'rgba(255,255,255,0.05)', color: '#fbf6ee', borderColor: 'rgba(212,137,79,0.2)' }, label: { color: '#e8dcc8' } }}
          />
          <Text size="xs" style={{ color: '#a89880' }}>
            Имя пользователя должно быть уникальным и содержать не менее 3 символов
          </Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setEditModal(null)} style={{ color: '#e8dcc8' }}>
              Отмена
            </Button>
            <Button 
              onClick={handleChangeUsername} 
              loading={isUpdating} 
              variant="gradient" 
              gradient={{ from: '#d4894f', to: '#8b5a2b' }} 
              style={{ color: '#fff' }}
              disabled={!formData.newUsername || formData.newUsername.length < 3 || formData.newUsername === user.username}
            >
              Сохранить
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        opened={editModal === 'delete'}
        onClose={() => setEditModal(null)}
        title="Удалить аккаунт"
        centered
        styles={{
          content: { background: 'linear-gradient(180deg, rgba(36,24,14,0.98), rgba(22,16,12,0.99))', border: '1px solid rgba(212,137,79,0.2)' },
          header: { background: 'transparent', color: '#fbf6ee' },
          title: { fontFamily: 'Georgia, serif', color: '#fbf6ee' },
        }}
      >
        <Stack gap="md">
          <Alert 
            icon={<IconAlertCircle size={16} />} 
            color="red"
            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#e8dcc8' }} 
            title="Внимание!"
          >
            Это действие необратимо. Все ваши данные будут удалены безвозвратно.
          </Alert>
          <PasswordInput
            label="Введите пароль для подтверждения"
            placeholder="Ваш текущий пароль"
            value={formData.deletePassword || ''}
            onChange={(e) => setFormData({ ...formData, deletePassword: e.target.value })}
            styles={{ 
              input: { 
                background: 'rgba(255,255,255,0.05)', 
                color: '#fbf6ee', 
                borderColor: 'rgba(239,68,68,0.3)' 
              }, 
              label: { color: '#e8dcc8' } 
            }}
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setEditModal(null)} style={{ color: '#e8dcc8' }}>
              Отмена
            </Button>
            <Button 
              onClick={handleDeleteAccount} 
              loading={isUpdating} 
              color="red"
              disabled={!formData.deletePassword}
            >
              Удалить аккаунт
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Phone Verification Modal */}
      {user && (
        <PhoneVerificationModal
          opened={phoneVerificationModalOpen}
          onClose={() => setPhoneVerificationModalOpen(false)}
          phoneNumber={user.phone_number || ''}
          onSuccess={() => {
            checkAuth();
          }}
        />
      )}
    </Container>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <Container size="md" py={80} ta="center">
        <Loader color="#d4894f" />
      </Container>
    }>
      <ProfilePageContent />
    </Suspense>
  );
}
