'use client';

import { useEffect, useState } from 'react';
import { 
  Table, 
  ScrollArea, 
  Group, 
  Text, 
  ActionIcon, 
  Badge, 
  TextInput, 
  Paper, 
  Title, 
  Pagination, 
  Select,
  Avatar,
  Stack,
  LoadingOverlay,
  Tooltip,
  Box,
  Flex
} from '@mantine/core';
import { IconSearch, IconPencil, IconTrash, IconKey, IconUserShield, IconUsers, IconMail, IconCalendar } from '@tabler/icons-react';
import { UsersService, UserAdminResponse, UserAdminUpdate } from '@/lib/api';
import { notifications } from '@mantine/notifications';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import { UserEditModal } from './UserEditModal';

export function UsersTable() {
  const [users, setUsers] = useState<UserAdminResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState('20');
  
  const [selectedUser, setSelectedUser] = useState<UserAdminResponse | null>(null);
  const [isEditModalOpen, { open: openEditModal, close: closeEditModal }] = useDisclosure(false);
  const [editLoading, setEditLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const skip = (page - 1) * parseInt(pageSize);
      const response = await UsersService.readUsersApiV1UsersGet(
        skip,
        parseInt(pageSize),
        debouncedSearch || undefined
      );
      setUsers(response.items);
      setTotal(response.total);
    } catch (error) {
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось загрузить пользователей',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [debouncedSearch, page, pageSize]);

  const handleEditClick = (user: UserAdminResponse) => {
    setSelectedUser(user);
    openEditModal();
  };

  const handleEditSubmit = async (data: UserAdminUpdate) => {
    if (!selectedUser) return;
    setEditLoading(true);
    try {
      await UsersService.updateUserApiV1UsersUserIdPatch(selectedUser.id, data);
      notifications.show({
        title: 'Успешно',
        message: 'Пользователь обновлен',
        color: 'green',
      });
      closeEditModal();
      fetchUsers();
    } catch (error) {
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось обновить пользователя',
        color: 'red',
      });
    } finally {
      setEditLoading(false);
    }
  };

  const handleReset2FA = async (user: UserAdminResponse) => {
    if (!confirm(`Вы уверены, что хотите сбросить 2FA для пользователя ${user.username}?`)) return;
    try {
      await UsersService.reset2FaApiV1UsersUserIdReset2FaPost(user.id);
      notifications.show({
        title: 'Успешно',
        message: '2FA сброшен',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось сбросить 2FA (возможно, он не настроен)',
        color: 'red',
      });
    }
  };

  const handleImpersonate = async (user: UserAdminResponse) => {
    try {
      const token = await UsersService.impersonateUserApiV1UsersUserIdImpersonatePost(user.id);
      console.log('Impersonation Token:', token);
      notifications.show({
        title: 'Токен получен',
        message: 'Токен для входа скопирован в консоль (функционал перехода в разработке)',
        color: 'blue',
      });
    } catch (error) {
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось получить доступ',
        color: 'red',
      });
    }
  };

  const handleDelete = async (user: UserAdminResponse) => {
    if (!confirm(`Вы уверены, что хотите удалить пользователя ${user.username}? Это действие необратимо.`)) return;
    try {
      await UsersService.deleteUserApiV1UsersUserIdDelete(user.id);
      notifications.show({
        title: 'Успешно',
        message: 'Пользователь удален',
        color: 'green',
      });
      fetchUsers();
    } catch (error) {
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось удалить пользователя',
        color: 'red',
      });
    }
  };

  const totalPages = Math.ceil(total / parseInt(pageSize));
  
  const getInitials = (user: UserAdminResponse) => {
    const first = user.firstname?.charAt(0) || '';
    const last = user.lastname?.charAt(0) || '';
    if (first || last) return `${first}${last}`.toUpperCase();
    return user.username?.charAt(0)?.toUpperCase() || '?';
  };
  
  const getFullName = (user: UserAdminResponse) => {
    const parts = [user.lastname, user.firstname, user.middlename].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : '—';
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const rows = users.map((user) => (
    <Table.Tr 
      key={user.id}
      style={{ cursor: 'pointer' }}
      onClick={() => handleEditClick(user)}
    >
      <Table.Td>
        <Group gap="sm" wrap="nowrap">
          <Avatar 
            size={40} 
            radius="xl" 
            color={user.is_superuser ? 'blue' : 'gray'}
          >
            {getInitials(user)}
          </Avatar>
          <Stack gap={0}>
            <Text size="sm" fw={600}>
              {user.username}
            </Text>
            <Text size="xs" c="dimmed">
              ID: {user.id}
            </Text>
          </Stack>
        </Group>
      </Table.Td>
      <Table.Td>
        <Group gap={4} wrap="nowrap">
          <IconMail size={14} style={{ color: 'var(--mantine-color-dimmed)' }} />
          <Text size="sm">{user.email}</Text>
        </Group>
      </Table.Td>
      <Table.Td>
        <Text size="sm" lineClamp={1}>
          {getFullName(user)}
        </Text>
      </Table.Td>
      <Table.Td>
        <Badge 
          color={user.is_superuser ? 'blue' : 'gray'} 
          variant={user.is_superuser ? 'filled' : 'light'}
          size="sm"
        >
          {user.is_superuser ? 'Админ' : 'Пользователь'}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Group gap={6} wrap="nowrap">
          <Tooltip label={user.is_active ? 'Аккаунт активен' : 'Аккаунт заблокирован'}>
            <Badge 
              color={user.is_active ? 'green' : 'red'} 
              variant="dot"
              size="sm"
            >
              {user.is_active ? 'Активен' : 'Заблокирован'}
            </Badge>
          </Tooltip>
          <Tooltip label={user.is_email_confirmed ? 'Email подтвержден' : 'Email не подтвержден'}>
            <Badge 
              color={user.is_email_confirmed ? 'teal' : 'orange'} 
              variant="outline"
              size="sm"
            >
              {user.is_email_confirmed ? '✓ Email' : '⏳ Email'}
            </Badge>
          </Tooltip>
        </Group>
      </Table.Td>
      <Table.Td>
        <Group gap={4} wrap="nowrap">
          <IconCalendar size={14} style={{ color: 'var(--mantine-color-dimmed)' }} />
          <Text size="xs" c="dimmed">
            {formatDate(user.created_at)}
          </Text>
        </Group>
      </Table.Td>
      <Table.Td onClick={(e) => e.stopPropagation()}>
        <Group gap={4} justify="flex-end" wrap="nowrap">
          <Tooltip label="Редактировать">
            <ActionIcon variant="subtle" color="gray" onClick={() => handleEditClick(user)}>
              <IconPencil size={16} stroke={1.5} />
            </ActionIcon>
          </Tooltip>
          {user.is_superuser && (
            <Tooltip label="Сбросить 2FA">
              <ActionIcon variant="subtle" color="orange" onClick={() => handleReset2FA(user)}>
                <IconUserShield size={16} stroke={1.5} />
              </ActionIcon>
            </Tooltip>
          )}
          <Tooltip label="Войти как пользователь">
            <ActionIcon variant="subtle" color="blue" onClick={() => handleImpersonate(user)}>
              <IconKey size={16} stroke={1.5} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Удалить">
            <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(user)}>
              <IconTrash size={16} stroke={1.5} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Paper withBorder p="md" radius="md" pos="relative">
      <LoadingOverlay visible={loading} zIndex={10} overlayProps={{ radius: 'sm', blur: 2 }} />
      
      <Flex justify="space-between" align="center" mb="md" wrap="wrap" gap="sm">
        <Group gap="sm">
          <IconUsers size={24} style={{ color: 'var(--mantine-color-blue-6)' }} />
          <Title order={3}>Пользователи</Title>
          <Badge variant="light" color="blue" size="lg">
            {total}
          </Badge>
        </Group>
      </Flex>

      <Group mb="md" gap="sm">
        <TextInput
          placeholder="Поиск по email, username или имени..."
          leftSection={<IconSearch size={16} stroke={1.5} />}
          value={search}
          onChange={(event) => {
            setSearch(event.currentTarget.value);
            setPage(1);
          }}
          style={{ flex: 1, minWidth: 200 }}
        />
        <Select
          value={pageSize}
          onChange={(val) => {
            setPageSize(val || '20');
            setPage(1);
          }}
          data={[
            { value: '10', label: '10 / стр' },
            { value: '20', label: '20 / стр' },
            { value: '50', label: '50 / стр' },
            { value: '100', label: '100 / стр' },
          ]}
          w={110}
        />
      </Group>

      <ScrollArea>
        <Table verticalSpacing="sm" striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ minWidth: 180 }}>Пользователь</Table.Th>
              <Table.Th style={{ minWidth: 200 }}>Email</Table.Th>
              <Table.Th style={{ minWidth: 180 }}>ФИО</Table.Th>
              <Table.Th style={{ minWidth: 100 }}>Роль</Table.Th>
              <Table.Th style={{ minWidth: 180 }}>Статус</Table.Th>
              <Table.Th style={{ minWidth: 100 }}>Регистрация</Table.Th>
              <Table.Th style={{ width: 140 }} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.length > 0 ? (
              rows
            ) : !loading ? (
              <Table.Tr>
                <Table.Td colSpan={7}>
                  <Box py="xl" ta="center">
                    <IconUsers size={48} style={{ color: 'var(--mantine-color-dimmed)', opacity: 0.5 }} />
                    <Text c="dimmed" mt="sm">
                      {search ? 'Пользователи не найдены' : 'Нет пользователей'}
                    </Text>
                  </Box>
                </Table.Td>
              </Table.Tr>
            ) : null}
          </Table.Tbody>
        </Table>
      </ScrollArea>
      
      {totalPages > 1 && (
        <Group justify="space-between" mt="md">
          <Text size="sm" c="dimmed">
            Показано {((page - 1) * parseInt(pageSize)) + 1}–{Math.min(page * parseInt(pageSize), total)} из {total}
          </Text>
          <Pagination total={totalPages} value={page} onChange={setPage} size="sm" />
        </Group>
      )}

      <UserEditModal
        opened={isEditModalOpen}
        onClose={closeEditModal}
        user={selectedUser}
        onSubmit={handleEditSubmit}
        loading={editLoading}
      />
    </Paper>
  );
}
