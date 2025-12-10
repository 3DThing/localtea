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
  Divider,
  Radio,
  TextInput,
  Stepper,
  Loader,
  Alert,
  Modal,
} from '@mantine/core';
import { useMediaQuery, useDisclosure } from '@mantine/hooks';
import { 
  IconMinus, 
  IconPlus, 
  IconTrash, 
  IconArrowLeft, 
  IconShoppingCart,
  IconTruck,
  IconBuildingStore,
  IconMail,
  IconCheck,
  IconAlertCircle,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCartStore, useAuthStore } from '@/store';
import { useCallback, useState, useEffect } from 'react';
import { deliveryApi, orderApi } from '@/lib/api';

type DeliveryMethod = 'pickup' | 'russian_post';

interface ContactForm {
  firstname: string;
  lastname: string;
  middlename: string;
  phone: string;
  email: string;
}

interface AddressForm {
  postal_code: string;
  address: string;
}

interface DeliveryOption {
  mail_type: string;
  mail_type_name: string;
  total_cost: number;
  total_cost_cents: number;
  delivery_min_days: number;
  delivery_max_days: number;
}

export default function CartPage() {
  const router = useRouter();
  const { items, totalAmount, updateItem, removeItem, clearCart, isLoading } = useCartStore();
  const { user } = useAuthStore();
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  // Stepper state
  const [activeStep, setActiveStep] = useState(0);
  
  // Delivery method
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('pickup');
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  const [selectedDeliveryOption, setSelectedDeliveryOption] = useState<DeliveryOption | null>(null);
  const [isCalculatingDelivery, setIsCalculatingDelivery] = useState(false);
  
  // Contact info
  const [contactForm, setContactForm] = useState<ContactForm>({
    firstname: user?.firstname || '',
    lastname: user?.lastname || '',
    middlename: user?.middlename || '',
    phone: user?.phone_number || '',
    email: user?.email || '',
  });
  
  // Address
  const [addressForm, setAddressForm] = useState<AddressForm>({
    postal_code: user?.postal_code || '',
    address: user?.address || '',
  });
  
  // Checkout state
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  
  // Success modal
  const [successOpened, { open: openSuccess, close: closeSuccess }] = useDisclosure(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  
  // Update contact form when user changes
  useEffect(() => {
    if (user) {
      setContactForm(prev => ({
        firstname: prev.firstname || user.firstname || '',
        lastname: prev.lastname || user.lastname || '',
        middlename: prev.middlename || user.middlename || '',
        phone: prev.phone || user.phone_number || '',
        email: prev.email || user.email || '',
      }));
      setAddressForm(prev => ({
        ...prev,
        postal_code: prev.postal_code || user.postal_code || '',
        address: prev.address || user.address || '',
      }));
    }
  }, [user]);
  
  // Calculate total weight
  const totalWeight = items.reduce((sum, item) => sum + (item.sku.weight * item.quantity), 0);
  
  // Calculate delivery when postal code changes
  useEffect(() => {
    const calculateDelivery = async () => {
      if (deliveryMethod === 'russian_post' && addressForm.postal_code.length === 6) {
        setIsCalculatingDelivery(true);
        try {
          const response = await deliveryApi.calculate({
            postal_code: addressForm.postal_code,
            weight_grams: totalWeight || 500, // минимум 500г
          });
          setDeliveryOptions(response.data.options);
          if (response.data.cheapest) {
            setSelectedDeliveryOption(response.data.cheapest);
          }
        } catch (error) {
          notifications.show({
            title: 'Ошибка',
            message: 'Не удалось рассчитать стоимость доставки',
            color: 'red',
          });
          setDeliveryOptions([]);
        } finally {
          setIsCalculatingDelivery(false);
        }
      }
    };
    
    const timeoutId = setTimeout(calculateDelivery, 500);
    return () => clearTimeout(timeoutId);
  }, [addressForm.postal_code, deliveryMethod, totalWeight]);

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  const handleQuantityChange = useCallback(async (itemId: number, quantity: number) => {
    try {
      await updateItem(itemId, quantity);
    } catch (error) {
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось обновить количество',
        color: 'red',
      });
    }
  }, [updateItem]);

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
  
  // Validate step
  const canProceedToStep = (step: number): boolean => {
    if (step === 1) {
      // Validate delivery
      if (deliveryMethod === 'russian_post') {
        return addressForm.postal_code.length === 6 && 
               addressForm.address.length > 0 &&
               selectedDeliveryOption !== null;
      }
      return true;
    }
    if (step === 2) {
      // Validate contact
      return contactForm.firstname.length > 0 &&
             contactForm.lastname.length > 0 &&
             contactForm.phone.length >= 10 &&
             contactForm.email.includes('@');
    }
    return true;
  };
  
  // Calculate totals
  const deliveryCost = deliveryMethod === 'russian_post' && selectedDeliveryOption 
    ? selectedDeliveryOption.total_cost_cents 
    : 0;
  const grandTotal = totalAmount + deliveryCost;
  
  // Handle checkout
  const handleCheckout = async () => {
    setIsCheckingOut(true);
    setCheckoutError(null);
    
    try {
      const checkoutData: any = {
        delivery_method: deliveryMethod,
        contact_info: {
          firstname: contactForm.firstname,
          lastname: contactForm.lastname,
          middlename: contactForm.middlename || undefined,
          phone: contactForm.phone,
          email: contactForm.email,
        },
        delivery_cost_cents: deliveryCost,
        payment_method: 'card',
      };
      
      if (deliveryMethod === 'russian_post') {
        checkoutData.shipping_address = {
          postal_code: addressForm.postal_code,
          address: addressForm.address,
        };
      }
      
      const response = await orderApi.checkout(checkoutData);
      
      if (response.data.payment_url) {
        setPaymentUrl(response.data.payment_url);
        // Redirect to payment
        window.location.href = response.data.payment_url;
      } else {
        openSuccess();
      }
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Не удалось оформить заказ';
      setCheckoutError(message);
      notifications.show({
        title: 'Ошибка оформления',
        message,
        color: 'red',
      });
    } finally {
      setIsCheckingOut(false);
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
          <Title order={1} style={{ color: '#fbf6ee' }}>Оформление заказа</Title>
        </Box>
      </Group>
      
      {/* Stepper */}
      <Card
        p="xl"
        radius="lg"
        mb="xl"
        style={{
          background: 'linear-gradient(180deg, rgba(36,24,14,0.94), rgba(22,16,12,0.98))',
          border: '1px solid rgba(212,137,79,0.08)',
        }}
      >
        <Stepper 
          active={activeStep} 
          onStepClick={setActiveStep}
          color="orange"
          styles={{
            step: { color: '#e8dcc8' },
            stepLabel: { color: '#fbf6ee' },
            stepDescription: { color: '#a89880' },
          }}
        >
          <Stepper.Step label="Корзина" description="Проверьте товары">
            {/* Cart Items */}
            <Stack gap="md" mt="xl">
              {items.map((item) => (
                <Card
                  key={item.id}
                  p="md"
                  radius="md"
                  style={{
                    background: 'rgba(18,14,10,0.5)',
                    border: '1px solid rgba(212,137,79,0.06)',
                  }}
                >
                  <Group gap="md" wrap="nowrap">
                    <Image
                      src={item.sku.image || 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=200'}
                      alt={item.sku.title}
                      w={80}
                      h={80}
                      radius="md"
                      style={{ objectFit: 'cover' }}
                    />
                    
                    <Box style={{ flex: 1 }}>
                      <Text fw={600} style={{ color: '#fbf6ee' }}>{item.sku.title}</Text>
                      <Text size="sm" c="#a89880">{item.sku.weight}г</Text>
                    </Box>
                    
                    <Group gap="xs">
                      <ActionIcon
                        variant="light"
                        onClick={() => handleQuantityChange(item.id, Math.max(1, item.quantity - 1))}
                        disabled={item.quantity <= 1}
                        style={{ background: 'rgba(212,137,79,0.1)' }}
                      >
                        <IconMinus size={14} style={{ color: '#d4894f' }} />
                      </ActionIcon>
                      <Text w={30} ta="center" style={{ color: '#fbf6ee' }}>{item.quantity}</Text>
                      <ActionIcon
                        variant="light"
                        onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                        style={{ background: 'rgba(212,137,79,0.1)' }}
                      >
                        <IconPlus size={14} style={{ color: '#d4894f' }} />
                      </ActionIcon>
                    </Group>
                    
                    <Text fw={700} style={{ color: '#d4894f', minWidth: 80, textAlign: 'right' }}>
                      {formatPrice(item.total_cents)}
                    </Text>
                    
                    <ActionIcon variant="subtle" color="red" onClick={() => handleRemove(item.id)}>
                      <IconTrash size={18} />
                    </ActionIcon>
                  </Group>
                </Card>
              ))}
              
              <Divider my="md" style={{ borderColor: 'rgba(212,137,79,0.1)' }} />
              
              <Group justify="space-between">
                <Text c="#a89880">Товары ({items.length})</Text>
                <Text fw={600} style={{ color: '#fbf6ee' }}>{formatPrice(totalAmount)}</Text>
              </Group>
              <Group justify="space-between">
                <Text c="#a89880">Общий вес</Text>
                <Text style={{ color: '#e8dcc8' }}>{(totalWeight / 1000).toFixed(2)} кг</Text>
              </Group>
            </Stack>
            
            <Group justify="flex-end" mt="xl">
              <Button
                variant="gradient"
                gradient={{ from: '#d4894f', to: '#8b5a2b' }}
                onClick={() => setActiveStep(1)}
                style={{ color: '#fff' }}
              >
                Далее: Доставка
              </Button>
            </Group>
          </Stepper.Step>
          
          <Stepper.Step label="Доставка" description="Выберите способ">
            <Stack gap="xl" mt="xl">
              {/* Delivery Method Selection */}
              <Radio.Group
                value={deliveryMethod}
                onChange={(value) => setDeliveryMethod(value as DeliveryMethod)}
              >
                <Stack gap="md">
                  <Card
                    p="lg"
                    radius="md"
                    style={{
                      background: deliveryMethod === 'pickup' ? 'rgba(212,137,79,0.1)' : 'rgba(18,14,10,0.5)',
                      border: deliveryMethod === 'pickup' ? '2px solid #d4894f' : '1px solid rgba(212,137,79,0.1)',
                      cursor: 'pointer',
                    }}
                    onClick={() => setDeliveryMethod('pickup')}
                  >
                    <Group>
                      <Radio value="pickup" color="orange" />
                      <IconBuildingStore size={24} style={{ color: '#d4894f' }} />
                      <Box style={{ flex: 1 }}>
                        <Text fw={600} style={{ color: '#fbf6ee' }}>Самовывоз</Text>
                        <Text size="sm" c="#a89880">Бесплатно. Заберите заказ самостоятельно.</Text>
                      </Box>
                      <Text fw={700} style={{ color: '#4ade80' }}>0 ₽</Text>
                    </Group>
                  </Card>
                  
                  <Card
                    p="lg"
                    radius="md"
                    style={{
                      background: deliveryMethod === 'russian_post' ? 'rgba(212,137,79,0.1)' : 'rgba(18,14,10,0.5)',
                      border: deliveryMethod === 'russian_post' ? '2px solid #d4894f' : '1px solid rgba(212,137,79,0.1)',
                      cursor: 'pointer',
                    }}
                    onClick={() => setDeliveryMethod('russian_post')}
                  >
                    <Group>
                      <Radio value="russian_post" color="orange" />
                      <IconTruck size={24} style={{ color: '#d4894f' }} />
                      <Box style={{ flex: 1 }}>
                        <Text fw={600} style={{ color: '#fbf6ee' }}>Почта России</Text>
                        <Text size="sm" c="#a89880">Доставка на указанный адрес.</Text>
                      </Box>
                      {deliveryMethod === 'russian_post' && selectedDeliveryOption && (
                        <Text fw={700} style={{ color: '#d4894f' }}>
                          от {formatPrice(selectedDeliveryOption.total_cost_cents)}
                        </Text>
                      )}
                    </Group>
                  </Card>
                </Stack>
              </Radio.Group>
              
              {/* Address Form (for Russian Post) */}
              {deliveryMethod === 'russian_post' && (
                <Card
                  p="lg"
                  radius="md"
                  style={{
                    background: 'rgba(18,14,10,0.5)',
                    border: '1px solid rgba(212,137,79,0.1)',
                  }}
                >
                  <Title order={4} mb="md" style={{ color: '#fbf6ee' }}>Адрес доставки</Title>
                  
                  <Stack gap="md">
                    <TextInput
                      label="Почтовый индекс"
                      placeholder="123456"
                      maxLength={6}
                      value={addressForm.postal_code}
                      onChange={(e) => setAddressForm({ ...addressForm, postal_code: e.target.value.replace(/\D/g, '') })}
                      styles={{
                        input: { background: 'rgba(255,255,255,0.05)', color: '#fbf6ee', borderColor: 'rgba(212,137,79,0.2)' },
                        label: { color: '#e8dcc8' },
                      }}
                      rightSection={isCalculatingDelivery && <Loader size="xs" color="#d4894f" />}
                    />
                    
                    <TextInput
                      label="Адрес"
                      placeholder="ул. Примерная, д. 1, кв. 1"
                      value={addressForm.address}
                      onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
                      styles={{
                        input: { background: 'rgba(255,255,255,0.05)', color: '#fbf6ee', borderColor: 'rgba(212,137,79,0.2)' },
                        label: { color: '#e8dcc8' },
                      }}
                    />
                    
                    {/* Delivery Options */}
                    {deliveryOptions.length > 0 && (
                      <Box mt="md">
                        <Text size="sm" fw={500} mb="sm" style={{ color: '#e8dcc8' }}>
                          Выберите тариф:
                        </Text>
                        <Radio.Group
                          value={selectedDeliveryOption?.mail_type || ''}
                          onChange={(value) => {
                            const option = deliveryOptions.find(o => o.mail_type === value);
                            setSelectedDeliveryOption(option || null);
                          }}
                        >
                          <Stack gap="sm">
                            {deliveryOptions.map((option) => (
                              <Card
                                key={option.mail_type}
                                p="sm"
                                radius="sm"
                                style={{
                                  background: selectedDeliveryOption?.mail_type === option.mail_type 
                                    ? 'rgba(212,137,79,0.15)' 
                                    : 'rgba(255,255,255,0.02)',
                                  border: selectedDeliveryOption?.mail_type === option.mail_type
                                    ? '1px solid #d4894f'
                                    : '1px solid rgba(212,137,79,0.05)',
                                  cursor: 'pointer',
                                }}
                                onClick={() => setSelectedDeliveryOption(option)}
                              >
                                <Group justify="space-between">
                                  <Group>
                                    <Radio value={option.mail_type} color="orange" />
                                    <Box>
                                      <Text size="sm" fw={500} style={{ color: '#fbf6ee' }}>
                                        {option.mail_type_name}
                                      </Text>
                                      <Text size="xs" c="#a89880">
                                        {option.delivery_min_days}-{option.delivery_max_days} дней
                                      </Text>
                                    </Box>
                                  </Group>
                                  <Text fw={600} style={{ color: '#d4894f' }}>
                                    {formatPrice(option.total_cost_cents)}
                                  </Text>
                                </Group>
                              </Card>
                            ))}
                          </Stack>
                        </Radio.Group>
                      </Box>
                    )}
                  </Stack>
                </Card>
              )}
            </Stack>
            
            <Group justify="space-between" mt="xl">
              <Button variant="subtle" onClick={() => setActiveStep(0)} style={{ color: '#e8dcc8' }}>
                Назад
              </Button>
              <Button
                variant="gradient"
                gradient={{ from: '#d4894f', to: '#8b5a2b' }}
                onClick={() => setActiveStep(2)}
                disabled={!canProceedToStep(1)}
                style={{ color: '#fff' }}
              >
                Далее: Контакты
              </Button>
            </Group>
          </Stepper.Step>
          
          <Stepper.Step label="Контакты" description="Данные получателя">
            <Stack gap="xl" mt="xl">
              <Card
                p="lg"
                radius="md"
                style={{
                  background: 'rgba(18,14,10,0.5)',
                  border: '1px solid rgba(212,137,79,0.1)',
                }}
              >
                <Title order={4} mb="md" style={{ color: '#fbf6ee' }}>Данные получателя</Title>
                
                <Stack gap="md">
                  <Group grow>
                    <TextInput
                      label="Фамилия"
                      placeholder="Иванов"
                      required
                      value={contactForm.lastname}
                      onChange={(e) => setContactForm({ ...contactForm, lastname: e.target.value })}
                      styles={{
                        input: { background: 'rgba(255,255,255,0.05)', color: '#fbf6ee', borderColor: 'rgba(212,137,79,0.2)' },
                        label: { color: '#e8dcc8' },
                      }}
                    />
                    <TextInput
                      label="Имя"
                      placeholder="Иван"
                      required
                      value={contactForm.firstname}
                      onChange={(e) => setContactForm({ ...contactForm, firstname: e.target.value })}
                      styles={{
                        input: { background: 'rgba(255,255,255,0.05)', color: '#fbf6ee', borderColor: 'rgba(212,137,79,0.2)' },
                        label: { color: '#e8dcc8' },
                      }}
                    />
                  </Group>
                  
                  <TextInput
                    label="Отчество"
                    placeholder="Иванович (необязательно)"
                    value={contactForm.middlename}
                    onChange={(e) => setContactForm({ ...contactForm, middlename: e.target.value })}
                    styles={{
                      input: { background: 'rgba(255,255,255,0.05)', color: '#fbf6ee', borderColor: 'rgba(212,137,79,0.2)' },
                      label: { color: '#e8dcc8' },
                    }}
                  />
                  
                  <TextInput
                    label="Телефон"
                    placeholder="+7 (999) 123-45-67"
                    required
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    styles={{
                      input: { background: 'rgba(255,255,255,0.05)', color: '#fbf6ee', borderColor: 'rgba(212,137,79,0.2)' },
                      label: { color: '#e8dcc8' },
                    }}
                  />
                  
                  <TextInput
                    label="Email"
                    placeholder="email@example.com"
                    required
                    type="email"
                    leftSection={<IconMail size={16} style={{ color: '#d4894f' }} />}
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    styles={{
                      input: { background: 'rgba(255,255,255,0.05)', color: '#fbf6ee', borderColor: 'rgba(212,137,79,0.2)' },
                      label: { color: '#e8dcc8' },
                    }}
                  />
                </Stack>
              </Card>
              
              {/* Order Summary */}
              <Card
                p="lg"
                radius="md"
                style={{
                  background: 'rgba(212,137,79,0.08)',
                  border: '1px solid rgba(212,137,79,0.2)',
                }}
              >
                <Title order={4} mb="md" style={{ color: '#fbf6ee' }}>Итого к оплате</Title>
                
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Text c="#a89880">Товары ({items.length})</Text>
                    <Text style={{ color: '#e8dcc8' }}>{formatPrice(totalAmount)}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text c="#a89880">Доставка ({deliveryMethod === 'pickup' ? 'Самовывоз' : 'Почта России'})</Text>
                    <Text style={{ color: deliveryCost === 0 ? '#4ade80' : '#e8dcc8' }}>
                      {deliveryCost === 0 ? 'Бесплатно' : formatPrice(deliveryCost)}
                    </Text>
                  </Group>
                  
                  <Divider my="sm" style={{ borderColor: 'rgba(212,137,79,0.2)' }} />
                  
                  <Group justify="space-between">
                    <Text size="lg" fw={600} style={{ color: '#fbf6ee' }}>К оплате</Text>
                    <Text size="xl" fw={700} style={{ color: '#d4894f' }}>
                      {formatPrice(grandTotal)}
                    </Text>
                  </Group>
                </Stack>
              </Card>
              
              {checkoutError && (
                <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
                  {checkoutError}
                </Alert>
              )}
            </Stack>
            
            <Group justify="space-between" mt="xl">
              <Button variant="subtle" onClick={() => setActiveStep(1)} style={{ color: '#e8dcc8' }}>
                Назад
              </Button>
              <Button
                variant="gradient"
                gradient={{ from: '#d4894f', to: '#8b5a2b' }}
                size="lg"
                onClick={handleCheckout}
                loading={isCheckingOut}
                disabled={!canProceedToStep(2)}
                style={{ color: '#fff' }}
              >
                Оплатить {formatPrice(grandTotal)}
              </Button>
            </Group>
          </Stepper.Step>
        </Stepper>
      </Card>
      
      {/* Success Modal */}
      <Modal
        opened={successOpened}
        onClose={closeSuccess}
        centered
        withCloseButton={false}
        styles={{
          content: { 
            background: 'linear-gradient(180deg, rgba(36,24,14,0.98), rgba(22,16,12,0.99))', 
            border: '1px solid rgba(212,137,79,0.2)' 
          },
        }}
      >
        <Stack align="center" gap="lg" py="xl">
          <Box
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(74,222,128,0.2), rgba(34,197,94,0.1))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconCheck size={40} style={{ color: '#4ade80' }} />
          </Box>
          
          <Title order={3} ta="center" style={{ color: '#fbf6ee' }}>
            Заказ оформлен!
          </Title>
          <Text ta="center" c="#e8dcc8">
            Ваш заказ успешно создан. Ожидает оплаты.
          </Text>
          
          <Button
            fullWidth
            variant="gradient"
            gradient={{ from: '#d4894f', to: '#8b5a2b' }}
            component={Link}
            href="/profile?tab=orders"
            style={{ color: '#fff' }}
          >
            Мои заказы
          </Button>
        </Stack>
      </Modal>
    </Container>
  );
}
