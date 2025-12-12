'use client';

import { useEffect, useState } from 'react';
import {
  Table, ScrollArea, Group, Text, Badge, Paper, Title, ActionIcon,
  LoadingOverlay, Flex, Box, Tabs, Pagination, Textarea, Modal, Button, Stack
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconTrash, IconShield, IconMessage, IconFlag, IconUserOff, IconUserCheck, IconCheck } from '@tabler/icons-react';
import { ModerationService, CommentModerationResponse, ReportResponse, UserAdminResponse } from '@/lib/api';
import { notifications } from '@mantine/notifications';

export default function ModerationPage() {
  const [comments, setComments] = useState<CommentModerationResponse[]>([]);
  const [reports, setReports] = useState<ReportResponse[]>([]);
  const [bannedUsers, setBannedUsers] = useState<UserAdminResponse[]>([]);
  const [commentsTotal, setCommentsTotal] = useState(0);
  const [reportsTotal, setReportsTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>('comments');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [resolveModalOpened, { open: openResolveModal, close: closeResolveModal }] = useDisclosure(false);
  const [selectedReport, setSelectedReport] = useState<ReportResponse | null>(null);
  const [resolution, setResolution] = useState('');

  const fetchComments = async () => {
    setLoading(true);
    try {
      const skip = (page - 1) * pageSize;
      const response = await ModerationService.listCommentsApiV1ModerationCommentsGet(skip, pageSize);
      setComments(response.items || []);
      setCommentsTotal(response.total || 0);
    } catch (error) {
      notifications.show({ title: 'Ошибка', message: 'Не удалось загрузить комментарии', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const skip = (page - 1) * pageSize;
      const response = await ModerationService.listReportsApiV1ModerationReportsGet(skip, pageSize);
      setReports(response.items || []);
      setReportsTotal(response.total || 0);
    } catch (error) {
      notifications.show({ title: 'Ошибка', message: 'Не удалось загрузить жалобы', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  const fetchBannedUsers = async () => {
    setLoading(true);
    try {
      const response = await ModerationService.listBannedUsersApiV1ModerationUsersBannedGet();
      setBannedUsers(response.items || []);
    } catch (error) {
      notifications.show({ title: 'Ошибка', message: 'Не удалось загрузить заблокированных', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    if (activeTab === 'comments') fetchComments();
    else if (activeTab === 'reports') fetchReports();
    else if (activeTab === 'banned') fetchBannedUsers();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'comments') fetchComments();
    else if (activeTab === 'reports') fetchReports();
  }, [page]);

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('Удалить комментарий?')) return;
    try {
      await ModerationService.deleteCommentApiV1ModerationCommentsCommentIdDelete(commentId);
      notifications.show({ title: 'Успешно', message: 'Комментарий удален', color: 'green' });
      fetchComments();
    } catch (error) {
      notifications.show({ title: 'Ошибка', message: 'Не удалось удалить комментарий', color: 'red' });
    }
  };

  const handleResolveReport = async () => {
    if (!selectedReport) return;
    try {
      await ModerationService.resolveReportApiV1ModerationReportsReportIdResolvePost(
        selectedReport.id,
        { resolution }
      );
      notifications.show({ title: 'Успешно', message: 'Жалоба обработана', color: 'green' });
      closeResolveModal();
      setResolution('');
      fetchReports();
    } catch (error) {
      notifications.show({ title: 'Ошибка', message: 'Не удалось обработать жалобу', color: 'red' });
    }
  };

  const handleBanUser = async (userId: number, reason: string = 'Нарушение правил') => {
    if (!confirm('Заблокировать пользователя?')) return;
    try {
      await ModerationService.banUserApiV1ModerationUsersUserIdBanPost(userId, { reason });
      notifications.show({ title: 'Успешно', message: 'Пользователь заблокирован', color: 'green' });
      fetchBannedUsers();
    } catch (error) {
      notifications.show({ title: 'Ошибка', message: 'Не удалось заблокировать', color: 'red' });
    }
  };

  const handleUnbanUser = async (userId: number) => {
    if (!confirm('Разблокировать пользователя?')) return;
    try {
      await ModerationService.unbanUserApiV1ModerationUsersUserIdUnbanPost(userId);
      notifications.show({ title: 'Успешно', message: 'Пользователь разблокирован', color: 'green' });
      fetchBannedUsers();
    } catch (error) {
      notifications.show({ title: 'Ошибка', message: 'Не удалось разблокировать', color: 'red' });
    }
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString('ru-RU');

  const commentRows = comments.map((comment) => (
    <Table.Tr key={comment.id}>
      <Table.Td>
        <Text size="sm" fw={500}>{comment.author?.username || `User #${comment.user_id}`}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm" lineClamp={2}>{comment.content}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="xs" c="dimmed">{comment.article_title || `Статья #${comment.article_id}`}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="xs">{formatDate(comment.created_at)}</Text>
      </Table.Td>
      <Table.Td>
        <Group gap="xs">
          <ActionIcon variant="subtle" color="red" onClick={() => handleDeleteComment(comment.id)}>
            <IconTrash size={16} />
          </ActionIcon>
          <ActionIcon variant="subtle" color="orange" onClick={() => handleBanUser(comment.user_id)}>
            <IconUserOff size={16} />
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  const reportRows = reports.map((report) => (
    <Table.Tr key={report.id}>
      <Table.Td>
        <Badge color={report.status === 'pending' ? 'yellow' : 'green'}>
          {report.status === 'pending' ? 'Ожидает' : 'Обработана'}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{report.reason}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="xs" c="dimmed">{report.entity_type} #{report.entity_id}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="xs">{formatDate(report.created_at)}</Text>
      </Table.Td>
      <Table.Td>
        {report.status === 'pending' && (
          <ActionIcon 
            variant="subtle" 
            color="green"
            onClick={() => {
              setSelectedReport(report);
              openResolveModal();
            }}
          >
            <IconCheck size={16} />
          </ActionIcon>
        )}
      </Table.Td>
    </Table.Tr>
  ));

  const bannedRows = bannedUsers.map((user) => (
    <Table.Tr key={user.id}>
      <Table.Td>
        <Text size="sm" fw={500}>{user.username}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{user.email}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="xs" c="dimmed">{user.ban_reason || '—'}</Text>
      </Table.Td>
      <Table.Td>
        <ActionIcon variant="subtle" color="green" onClick={() => handleUnbanUser(user.id)}>
          <IconUserCheck size={16} />
        </ActionIcon>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Paper withBorder p="md" radius="md" pos="relative">
      <LoadingOverlay visible={loading} />

      <Flex justify="space-between" align="center" mb="md">
        <Group gap="sm">
          <IconShield size={24} style={{ color: 'var(--mantine-color-orange-6)' }} />
          <Title order={4}>Модерация</Title>
        </Group>
      </Flex>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List mb="md">
          <Tabs.Tab value="comments" leftSection={<IconMessage size={14} />}>
            Комментарии
            {commentsTotal > 0 && <Badge size="xs" ml="xs">{commentsTotal}</Badge>}
          </Tabs.Tab>
          <Tabs.Tab value="reports" leftSection={<IconFlag size={14} />}>
            Жалобы
            {reportsTotal > 0 && <Badge size="xs" ml="xs" color="red">{reportsTotal}</Badge>}
          </Tabs.Tab>
          <Tabs.Tab value="banned" leftSection={<IconUserOff size={14} />}>
            Заблокированные
            {bannedUsers.length > 0 && <Badge size="xs" ml="xs">{bannedUsers.length}</Badge>}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="comments">
          <ScrollArea>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Автор</Table.Th>
                  <Table.Th>Комментарий</Table.Th>
                  <Table.Th>Статья</Table.Th>
                  <Table.Th>Дата</Table.Th>
                  <Table.Th w={80} />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {commentRows.length > 0 ? commentRows : (
                  <Table.Tr>
                    <Table.Td colSpan={5}>
                      <Text c="dimmed" ta="center" py="xl">Комментариев нет</Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </ScrollArea>
          {commentsTotal > pageSize && (
            <Group justify="center" mt="md">
              <Pagination total={Math.ceil(commentsTotal / pageSize)} value={page} onChange={setPage} />
            </Group>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="reports">
          <ScrollArea>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Статус</Table.Th>
                  <Table.Th>Причина</Table.Th>
                  <Table.Th>Объект</Table.Th>
                  <Table.Th>Дата</Table.Th>
                  <Table.Th w={50} />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {reportRows.length > 0 ? reportRows : (
                  <Table.Tr>
                    <Table.Td colSpan={5}>
                      <Text c="dimmed" ta="center" py="xl">Жалоб нет</Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </ScrollArea>
          {reportsTotal > pageSize && (
            <Group justify="center" mt="md">
              <Pagination total={Math.ceil(reportsTotal / pageSize)} value={page} onChange={setPage} />
            </Group>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="banned">
          <ScrollArea>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Пользователь</Table.Th>
                  <Table.Th>Email</Table.Th>
                  <Table.Th>Причина</Table.Th>
                  <Table.Th w={50} />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {bannedRows.length > 0 ? bannedRows : (
                  <Table.Tr>
                    <Table.Td colSpan={4}>
                      <Text c="dimmed" ta="center" py="xl">Заблокированных нет</Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Tabs.Panel>
      </Tabs>

      <Modal opened={resolveModalOpened} onClose={closeResolveModal} title="Обработать жалобу">
        <Stack>
          <Text size="sm">Причина жалобы: {selectedReport?.reason}</Text>
          <Textarea
            label="Резолюция"
            placeholder="Опишите принятые меры..."
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            minRows={3}
          />
          <Button onClick={handleResolveReport} disabled={!resolution}>
            Закрыть жалобу
          </Button>
        </Stack>
      </Modal>
    </Paper>
  );
}
