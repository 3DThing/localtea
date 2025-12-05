'use client';

import { useEffect } from 'react';
import { 
  Modal, 
  Button, 
  TextInput, 
  Checkbox, 
  Group, 
  LoadingOverlay, 
  ActionIcon, 
  CopyButton, 
  Tooltip,
  Tabs,
  Stack,
  Badge,
  Text
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserAdminResponse, UserAdminUpdate } from '@/lib/api';
import dayjs from 'dayjs';
import { IconCopy, IconCheck, IconUser, IconShieldCheck, IconKey } from '@tabler/icons-react';

const userSchema = z.object({
  email: z.string().email({ message: 'Некорректный email' }),
  username: z.string().min(1, { message: 'Username обязателен' }),
  firstname: z.string().optional(),
  lastname: z.string().optional(),
  middlename: z.string().optional(),
  birthdate: z.date().nullable().optional(),
  address: z.string().optional(),
  password: z.string().optional(),
  is_active: z.boolean(),
  is_superuser: z.boolean(),
  is_email_confirmed: z.boolean(),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserEditModalProps {
  opened: boolean;
  onClose: () => void;
  user: UserAdminResponse | null;
  onSubmit: (data: UserAdminUpdate) => Promise<void>;
  loading: boolean;
}

export function UserEditModal({ opened, onClose, user, onSubmit, loading }: UserEditModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      is_active: true,
      is_superuser: false,
    }
  });

  useEffect(() => {
    if (user) {
      reset({
        email: user.email,
        username: user.username,
        firstname: user.firstname || '',
        lastname: user.lastname || '',
        middlename: user.middlename || '',
        birthdate: user.birthdate ? new Date(user.birthdate) : null,
        address: user.address || '',
        password: '',
        is_active: user.is_active,
        is_superuser: user.is_superuser,
        is_email_confirmed: user.is_email_confirmed,
      });
    } else {
      reset({
        email: '',
        username: '',
        firstname: '',
        lastname: '',
        middlename: '',
        birthdate: null,
        address: '',
        password: '',
        is_active: true,
        is_superuser: false,
        is_email_confirmed: false,
      });
    }
  }, [user, reset]);

  const onFormSubmit = (data: UserFormData) => {
    const formattedData: UserAdminUpdate = {
      ...data,
      birthdate: data.birthdate ? dayjs(data.birthdate).format('YYYY-MM-DD') : null,
    };
    // Не отправляем пустой пароль
    if (!formattedData.password || formattedData.password.trim() === '') {
      delete formattedData.password;
    }
    onSubmit(formattedData);
  };

  return (
    <Modal 
      opened={opened} 
      onClose={onClose} 
      title={
        <Group gap="xs">
          <Text fw={600}>{user ? user.username : 'Новый пользователь'}</Text>
          {user && (
            <Badge size="xs" color={user.is_active ? 'green' : 'red'}>
              {user.is_active ? 'Активен' : 'Заблокирован'}
            </Badge>
          )}
        </Group>
      } 
      size="md"
    >
      <LoadingOverlay visible={loading} />
      <form onSubmit={handleSubmit(onFormSubmit)}>
        <Tabs defaultValue="profile">
          <Tabs.List mb="sm">
            <Tabs.Tab value="profile" leftSection={<IconUser size={14} />}>Профиль</Tabs.Tab>
            <Tabs.Tab value="access" leftSection={<IconShieldCheck size={14} />}>Доступ</Tabs.Tab>
            <Tabs.Tab value="security" leftSection={<IconKey size={14} />}>Безопасность</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="profile">
            <Stack gap="xs">
              <Group grow>
                <TextInput
                  label="Email"
                  placeholder="email@example.com"
                  required
                  size="sm"
                  {...register('email')}
                  error={errors.email?.message}
                />
                <TextInput
                  label="Username"
                  placeholder="username"
                  required
                  size="sm"
                  {...register('username')}
                  error={errors.username?.message}
                />
              </Group>
              
              <Group grow>
                <TextInput
                  label="Фамилия"
                  placeholder="Иванов"
                  size="sm"
                  {...register('lastname')}
                />
                <TextInput
                  label="Имя"
                  placeholder="Иван"
                  size="sm"
                  {...register('firstname')}
                />
                <TextInput
                  label="Отчество"
                  placeholder="Иванович"
                  size="sm"
                  {...register('middlename')}
                />
              </Group>

              <Group grow>
                <Controller
                  name="birthdate"
                  control={control}
                  render={({ field }) => (
                    <DateInput
                      label="Дата рождения"
                      placeholder="Выберите дату"
                      value={field.value}
                      onChange={field.onChange}
                      valueFormat="DD.MM.YYYY"
                      size="sm"
                    />
                  )}
                />
                <TextInput
                  label="Адрес"
                  placeholder="г. Москва..."
                  size="sm"
                  {...register('address')}
                />
              </Group>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="access">
            <Stack gap="xs">
              <Controller
                name="is_active"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    label="Аккаунт активен"
                    description="Неактивный пользователь не может войти в систему"
                    checked={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              
              <Controller
                name="is_email_confirmed"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    label="Email подтвержден"
                    description="Можно подтвердить вручную"
                    checked={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              
              <Controller
                name="is_superuser"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    label="Администратор"
                    description="Полный доступ к админ-панели"
                    checked={field.value}
                    onChange={field.onChange}
                    color="blue"
                  />
                )}
              />

              {user?.email_confirm_token && (
                <TextInput
                  label="Токен подтверждения Email"
                  value={user.email_confirm_token}
                  readOnly
                  size="sm"
                  rightSection={
                    <CopyButton value={user.email_confirm_token} timeout={2000}>
                      {({ copied, copy }) => (
                        <Tooltip label={copied ? 'Скопировано' : 'Копировать'} withArrow>
                          <ActionIcon color={copied ? 'teal' : 'gray'} variant="subtle" onClick={copy} size="sm">
                            {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </CopyButton>
                  }
                />
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="security">
            <Stack gap="xs">
              <TextInput
                label="Новый пароль"
                placeholder="Оставьте пустым, чтобы не менять"
                size="sm"
                type="password"
                {...register('password')}
              />
              <Text size="xs" c="dimmed">
                Пароль должен содержать минимум 8 символов. Оставьте поле пустым, если не хотите менять пароль.
              </Text>
            </Stack>
          </Tabs.Panel>
        </Tabs>

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose} size="sm">Отмена</Button>
          <Button type="submit" loading={loading} size="sm">Сохранить</Button>
        </Group>
      </form>
    </Modal>
  );
}
