'use client';

import { useState } from 'react';
import {
  Container,
  Card,
  Title,
  Text,
  TextInput,
  PasswordInput,
  Button,
  Stack,
  Anchor,
  Box,
  Divider,
  Checkbox,
  Modal,
  ScrollArea,
  Progress,
  Group,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconMail, IconLock, IconUser, IconCheck, IconX } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();
  const [error, setError] = useState('');
  const [modalOpened, setModalOpened] = useState(false);
  const [successModalOpened, setSuccessModalOpened] = useState(false);
  const [password, setPassword] = useState('');

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength += 25;
    if (/[A-Z]/.test(pwd)) strength += 25;
    if (/[a-z]/.test(pwd)) strength += 25;
    if (/[0-9]/.test(pwd)) strength += 12.5;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) strength += 12.5;
    return strength;
  };

  const passwordStrength = getPasswordStrength(password);
  const getStrengthColor = () => {
    if (passwordStrength < 25) return 'red';
    if (passwordStrength < 50) return 'orange';
    if (passwordStrength < 75) return 'yellow';
    return 'green';
  };

  const passwordChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const form = useForm({
    initialValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      firstname: '',
      lastname: '',
      middlename: '',
      address: '',
      postal_code: '',
      phone_number: '',
      birthdate: '',
      agree: false,
    },
    validate: {
      username: (value) => (value.length >= 3 ? null : 'Минимум 3 символа'),
      email: (value) => {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(value)) return 'Введите корректный email адрес';
        return null;
      },
      password: (value) => {
        if (value.length < 8) return 'Минимум 8 символов';
        return null;
      },
      confirmPassword: (value, values) =>
        value === values.password ? null : 'Пароли не совпадают',
      firstname: (value) => (value.length >= 2 ? null : 'Минимум 2 символа'),
      lastname: (value) => (value.length >= 2 ? null : 'Минимум 2 символа'),
      address: (value) => (value.length >= 10 ? null : 'Укажите полный адрес доставки'),
      postal_code: (value) => (value.length >= 5 ? null : 'Укажите корректный индекс'),
      phone_number: (value) => {
        if (!/^\+?7/.test(value.replace(/\D/g, ''))) {
          return 'Номер должен начинаться с +7';
        }
        if (value.replace(/\D/g, '').length < 11) {
          return 'Укажите полный номер телефона';
        }
        return null;
      },
      agree: (value) => (value ? null : 'Необходимо принять условия'),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setError('');
    try {
      await register(
        values.email, 
        values.username, 
        values.password,
        {
          firstname: values.firstname,
          lastname: values.lastname,
          middlename: values.middlename || undefined,
          address: values.address,
          postal_code: values.postal_code,
          phone_number: values.phone_number,
          birthdate: values.birthdate || undefined,
        }
      );
      notifications.show({
        title: 'Регистрация успешна!',
        message: 'Проверьте почту для подтверждения аккаунта',
        color: 'green',
        autoClose: 10000,
      });
      setSuccessModalOpened(true);
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Ошибка регистрации';
      setError(message);
      notifications.show({
        title: 'Ошибка',
        message,
        color: 'red',
      });
    }
  };

  return (
    <Container size={640} py={80}>
      <Box ta="center" mb="xl">
        <Title order={1} mb="xs" style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: '#fbf6ee' }}>
          Создать аккаунт
        </Title>
        <Text c="#e8dcc8">Присоединяйтесь к сообществу LocalTea</Text>
      </Box>

      <Card
        p="xl"
        radius="lg"
        style={{
          background: 'linear-gradient(180deg, rgba(36,24,14,0.94), rgba(18,14,10,0.98))',
          border: '1px solid rgba(212,137,79,0.08)',
          boxShadow: '0 12px 36px rgba(8,6,4,0.6)',
          borderRadius: 14,
        }}
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            {/* Учетные данные */}
            <Box
              style={{
                border: '1px solid rgba(212,137,79,0.06)',
                padding: 12,
                borderRadius: 8,
                background: 'linear-gradient(135deg, rgba(212,137,79,0.04), rgba(212,137,79,0.01))',
              }}
            >
              <Title order={5} style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: '#d4894f', marginBottom: 12 }}>Учетные данные</Title>
              <Stack gap="sm">
                <TextInput
                  label="Имя пользователя"
                  placeholder="username"
                  leftSection={<IconUser size={16} style={{ color: '#d4894f' }} />}
                  {...form.getInputProps('username')}
                  size="md"
                  styles={{ input: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(212,137,79,0.08)', color: '#fbf6ee' }, label: { color: '#e8dcc8' } }}
                />

                <TextInput
                  label="Email"
                  placeholder="your@email.com"
                  leftSection={<IconMail size={16} style={{ color: '#d4894f' }} />}
                  {...form.getInputProps('email')}
                  size="md"
                  styles={{ input: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(212,137,79,0.08)', color: '#fbf6ee' }, label: { color: '#e8dcc8' } }}
                />
                {/* Email validity indicator */}
                {form.values.email.length > 0 && (
                  <Group gap={8} align="center" mt={6}>
                    {(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(form.values.email)) ? (
                      <>
                        <IconCheck size={14} color="#4ade80" />
                        <Text size="xs" c="#4ade80">Email корректен</Text>
                      </>
                    ) : (
                      <>
                        <IconX size={14} color="#f87171" />
                        <Text size="xs" c="#f87171">Некорректный email</Text>
                      </>
                    )}
                  </Group>
                )}
              </Stack>
            </Box>

            {/* Безопасность */}
            <Box
              style={{
                border: '1px solid rgba(212,137,79,0.06)',
                padding: 12,
                borderRadius: 8,
                background: 'linear-gradient(135deg, rgba(212,137,79,0.04), rgba(212,137,79,0.01))',
              }}
            >
              <Title order={5} style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: '#d4894f', marginBottom: 12 }}>Безопасность</Title>
              <Stack gap="sm">
                <Box>
                  <PasswordInput
                    label="Пароль"
                    placeholder="Минимум 8 символов"
                    leftSection={<IconLock size={16} style={{ color: '#d4894f' }} />}
                    {...form.getInputProps('password')}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      form.setFieldValue('password', e.target.value);
                    }}
                    size="md"
                    styles={{ input: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(212,137,79,0.08)', color: '#fbf6ee' }, label: { color: '#e8dcc8' } }}
                  />
                  {password && (
                    <Box mt="xs">
                      <Group gap="xs" mb={6}>
                        <Text size="xs" c="#e8dcc8">Надёжность пароля:</Text>
                        <Text size="xs" fw={600} c={getStrengthColor()}>
                          {passwordStrength < 25 ? 'Слабый' : passwordStrength < 50 ? 'Средний' : passwordStrength < 75 ? 'Хороший' : 'Отличный'}
                        </Text>
                      </Group>
                      <Progress value={passwordStrength} color={getStrengthColor()} size="sm" mb="xs" />
                      <Stack gap={4}>
                        <Group gap={6}>
                          {passwordChecks.length ? <IconCheck size={14} color="#4ade80" /> : <IconX size={14} color="#f87171" />}
                          <Text size="xs" c={passwordChecks.length ? '#4ade80' : '#f87171'}>Минимум 8 символов (обязательно)</Text>
                        </Group>
                        <Group gap={6}>
                          {passwordChecks.uppercase ? <IconCheck size={14} color="#4ade80" /> : <IconX size={14} color="#94a3b8" />}
                          <Text size="xs" c={passwordChecks.uppercase ? '#4ade80' : '#94a3b8'}>Заглавная буква (рекомендуется)</Text>
                        </Group>
                        <Group gap={6}>
                          {passwordChecks.lowercase ? <IconCheck size={14} color="#4ade80" /> : <IconX size={14} color="#94a3b8" />}
                          <Text size="xs" c={passwordChecks.lowercase ? '#4ade80' : '#94a3b8'}>Строчная буква (рекомендуется)</Text>
                        </Group>
                        <Group gap={6}>
                          {passwordChecks.number ? <IconCheck size={14} color="#4ade80" /> : <IconX size={14} color="#94a3b8" />}
                          <Text size="xs" c={passwordChecks.number ? '#4ade80' : '#94a3b8'}>Цифра (рекомендуется)</Text>
                        </Group>
                        <Group gap={6}>
                          {passwordChecks.special ? <IconCheck size={14} color="#4ade80" /> : <IconX size={14} color="#94a3b8" />}
                          <Text size="xs" c={passwordChecks.special ? '#4ade80' : '#94a3b8'}>Спецсимвол (рекомендуется)</Text>
                        </Group>
                      </Stack>
                    </Box>
                  )}
                </Box>

                <PasswordInput
                  label="Подтверждение пароля"
                  placeholder="Повторите пароль"
                  leftSection={<IconLock size={16} style={{ color: '#d4894f' }} />}
                  {...form.getInputProps('confirmPassword')}
                  size="md"
                  styles={{ input: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(212,137,79,0.08)', color: '#fbf6ee' }, label: { color: '#e8dcc8' } }}
                />
                {/* Passwords match indicator */}
                {form.values.confirmPassword.length > 0 && (
                  <Group gap={8} align="center" mt={6}>
                    {(form.values.password && form.values.password === form.values.confirmPassword) ? (
                      <>
                        <IconCheck size={14} color="#4ade80" />
                        <Text size="xs" c="#4ade80">Пароли совпадают</Text>
                      </>
                    ) : (
                      <>
                        <IconX size={14} color="#f87171" />
                        <Text size="xs" c="#f87171">Пароли не совпадают</Text>
                      </>
                    )}
                  </Group>
                )}
              </Stack>
            </Box>

            <Box
              style={{
                border: '1px solid rgba(212,137,79,0.06)',
                padding: 12,
                borderRadius: 8,
                background: 'linear-gradient(180deg, rgba(255,255,255,0.01), rgba(255,255,255,0.00))',
              }}
            >
              <Title order={4} style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: '#d4894f', marginBottom: 8 }}>Данные для доставки</Title>
              <Stack gap="sm">
                <TextInput
                  label="Фамилия"
                  placeholder="Иванов"
                  leftSection={<IconUser size={16} style={{ color: '#d4894f' }} />}
                  {...form.getInputProps('lastname')}
                  size="md"
                  styles={{ input: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(212,137,79,0.08)', color: '#fbf6ee' }, label: { color: '#e8dcc8' } }}
                />

                <TextInput
                  label="Имя"
                  placeholder="Иван"
                  leftSection={<IconUser size={16} style={{ color: '#d4894f' }} />}
                  {...form.getInputProps('firstname')}
                  size="md"
                  styles={{ input: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(212,137,79,0.08)', color: '#fbf6ee' }, label: { color: '#e8dcc8' } }}
                />

                <TextInput
                  label="Отчество (необязательно)"
                  placeholder="Иванович"
                  leftSection={<IconUser size={16} style={{ color: '#d4894f' }} />}
                  {...form.getInputProps('middlename')}
                  size="md"
                  styles={{ input: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(212,137,79,0.08)', color: '#fbf6ee' }, label: { color: '#e8dcc8' } }}
                />

                <TextInput
                  label="Адрес доставки"
                  placeholder="г. Москва, ул. Пушкина, д. 10, кв. 5"
                  {...form.getInputProps('address')}
                  size="md"
                  styles={{ input: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(212,137,79,0.08)', color: '#fbf6ee' }, label: { color: '#e8dcc8' } }}
                />

                <TextInput
                  label="Почтовый индекс"
                  placeholder="123456"
                  {...form.getInputProps('postal_code')}
                  size="md"
                  styles={{ input: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(212,137,79,0.08)', color: '#fbf6ee' }, label: { color: '#e8dcc8' } }}
                />

                <Box>
                  <TextInput
                    label="Номер телефона"
                    placeholder="+7 (999) 123-45-67"
                    {...form.getInputProps('phone_number')}
                    size="md"
                    styles={{ input: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(212,137,79,0.08)', color: '#fbf6ee' }, label: { color: '#e8dcc8' } }}
                  />
                  {form.values.phone_number.length > 0 && (
                    <Group gap={8} align="center" mt={6}>
                      {/^\+?7/.test(form.values.phone_number.replace(/\D/g, '')) && form.values.phone_number.replace(/\D/g, '').length >= 11 ? (
                        <>
                          <IconCheck size={14} color="#4ade80" />
                          <Text size="xs" c="#4ade80">Номер корректен</Text>
                        </>
                      ) : (
                        <>
                          <IconX size={14} color="#f87171" />
                          <Text size="xs" c="#f87171">
                            {!/^\+?7/.test(form.values.phone_number.replace(/\D/g, '')) 
                              ? 'Номер должен начинаться с +7'
                              : 'Неполный номер'}
                          </Text>
                        </>
                      )}
                    </Group>
                  )}
                </Box>
              </Stack>
            </Box>

            <TextInput
              label="Дата рождения (необязательно)"
              placeholder="ГГГГ-ММ-ДД"
              type="date"
              {...form.getInputProps('birthdate')}
              size="md"
              styles={{ input: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(212,137,79,0.08)', color: '#fbf6ee' }, label: { color: '#e8dcc8' } }}
            />

            <Checkbox
              label={
                <Text size="sm">
                  Я согласен с{' '}
                  <Anchor component="button" type="button" onClick={() => setModalOpened(true)} style={{ color: '#d4894f', padding: 0, border: 'none', background: 'transparent' }}>
                    условиями использования
                  </Anchor>
                </Text>
              }
              {...form.getInputProps('agree', { type: 'checkbox' })}
            />

            {error && (
              <Text c="red" size="sm">
                {error}
              </Text>
            )}

            <Button
              type="submit"
              fullWidth
              size="md"
              variant="gradient"
              gradient={{ from: '#d4894f', to: '#8b5a2b' }}
              loading={isLoading}
              mt="md"
              style={{ color: '#fbf6ee', borderRadius: 10 }}
            >
              Зарегистрироваться
            </Button>
          </Stack>
        </form>

        <Divider my="lg" label="или" labelPosition="center" style={{ borderColor: 'rgba(212,137,79,0.2)' }} styles={{ label: { color: '#e8dcc8' } }} />

        <Text ta="center" size="sm" style={{ color: '#e8dcc8' }}>
          Уже есть аккаунт?{' '}
          <Anchor component={Link} href="/login" style={{ color: '#d4894f', fontWeight: 600 }}>
            Войти
          </Anchor>
        </Text>
      </Card>

      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title="Условия использования"
        size="lg"
        centered
        styles={{
          content: { background: 'rgba(24,18,14,0.96)', color: '#e8dcc8', borderRadius: 10 },
          title: { color: '#e8dcc8' },
        }}
      >
        <ScrollArea style={{ height: 420, paddingRight: 12 }}>
          <Box>
            <Title order={4} style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: '#d4894f' }}>1. Введение</Title>
            <Text c="#e8dcc8" mb="md">
              Настоящие Условия использования регулируют отношения между пользователем и компанией LocalTea (далее — «Компания»). Используя сайт и его сервисы, вы подтверждаете согласие с этими условиями.
            </Text>

            <Title order={5} style={{ marginTop: 8, color: '#d4894f' }}>2. Определения</Title>
            <Text c="#e8dcc8" mb="md">
              «Пользователь» — любое физическое лицо, использующее сайт. «Сайт» — веб-платформа LocalTea. «Услуги» — все функции и сервисы, предоставляемые компанией.
            </Text>

            <Title order={5} style={{ color: '#d4894f' }}>3. Регистрация и аккаунт</Title>
            <Text c="#e8dcc8" mb="md">
              При регистрации вы предоставляете достоверную информацию. Вы несёте ответственность за сохранность данных доступа и обязуетесь незамедлительно уведомить компанию о несанкционированном доступе.
            </Text>

            <Title order={5} style={{ color: '#d4894f' }}>4. Заказы, оплата и доставка</Title>
            <Text c="#e8dcc8" mb="md">
              Оформление заказа происходит через корзину на сайте. Оплата может быть произведена доступными способами, указанными на сайте. Условия доставки зависят от выбранного способа и региона.
            </Text>

            <Title order={5} style={{ color: '#d4894f' }}>5. Возврат и отмена</Title>
            <Text c="#e8dcc8" mb="md">
              Возврат товаров и отмена заказов осуществляется в соответствии с политикой возвратов, доступной на сайте и действующим законодательством.
            </Text>

            <Title order={5} style={{ color: '#d4894f' }}>6. Интеллектуальная собственность</Title>
            <Text c="#e8dcc8" mb="md">
              Все материалы сайта (тексты, изображения, дизайн) принадлежат Компании или её правообладателям. Использование материалов без разрешения запрещено.
            </Text>

            <Title order={5} style={{ color: '#d4894f' }}>7. Ограничение ответственности</Title>
            <Text c="#e8dcc8" mb="md">
              Компания не несёт ответственности за косвенные убытки, вызванные использованием сайта. В случае споров размер ответственности ограничен стоимостью услуг, предоставленных Компанией за последние 6 месяцев.
            </Text>

            <Title order={5} style={{ color: '#d4894f' }}>8. Конфиденциальность</Title>
            <Text c="#e8dcc8" mb="md">
              Обработка персональных данных осуществляется в соответствии с Политикой конфиденциальности. Используя сайт, вы соглашаетесь с условиями обработки данных.
            </Text>

            <Title order={5} style={{ color: '#d4894f' }}>9. Изменения условий</Title>
            <Text c="#e8dcc8" mb="md">
              Компания оставляет за собой право вносить изменения в настоящие Условия. Изменения публикуются на сайте и вступают в силу с момента публикации.
            </Text>

            <Title order={5} style={{ color: '#d4894f' }}>10. Контакты</Title>
            <Text c="#e8dcc8" mb="md">
              Для вопросов и претензий отправляйте письма на info@localtea.ru или звоните по телефону, указанному на сайте.
            </Text>
          </Box>
        </ScrollArea>
      </Modal>

      {/* Success Modal */}
      <Modal
        opened={successModalOpened}
        onClose={() => {
          setSuccessModalOpened(false);
          router.push('/login');
        }}
        title="Регистрация успешна!"
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
            fontSize: '1.5rem',
            fontWeight: 600,
            color: '#fbf6ee',
          },
        }}
      >
        <Stack gap="lg">
          <Box ta="center">
            <Box
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'rgba(74, 222, 128, 0.1)',
                border: '2px solid #4ade80',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
              }}
            >
              <IconCheck size={48} style={{ color: '#4ade80' }} />
            </Box>
            <Text size="lg" fw={600} mb="sm" style={{ color: '#fbf6ee' }}>
              Добро пожаловать в LocalTea!
            </Text>
            <Text size="sm" c="#e8dcc8" mb="lg">
              На вашу почту отправлено письмо с подтверждением.
              <br />
              Пожалуйста, проверьте папку "Входящие" и следуйте инструкциям в письме.
            </Text>
          </Box>
          
          <Button
            fullWidth
            variant="gradient"
            gradient={{ from: '#d4894f', to: '#8b5a2b' }}
            onClick={() => {
              setSuccessModalOpened(false);
              router.push('/login');
            }}
            style={{ color: '#fff' }}
          >
            Перейти на страницу входа
          </Button>
        </Stack>
      </Modal>
    </Container>
  );
}
