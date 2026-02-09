'use client';

import {
  Badge,
  Box,
  Card,
  Container,
  Divider,
  Group,
  List,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
  Anchor,
} from '@mantine/core';
import Link from 'next/link';
import Image from 'next/image';
import {
  IconBug,
  IconShieldCheck,
  IconCup,
  IconTrophy,
  IconMail,
  IconTarget,
  IconBan,
  IconClipboardList,
} from '@tabler/icons-react';
import { colors } from '@/lib/theme';

const LAST_UPDATED = '23.12.2025';

const points = [
  {
    level: 'Critical',
    score: 100,
    examples: 'RCE, SQLi с доступом к данным, обход аутентификации/привилегий, компрометация админки',
  },
  {
    level: 'High',
    score: 60,
    examples: 'Stored XSS, IDOR/утечка персональных данных, SSRF с влиянием, обход CSRF/сессий',
  },
  {
    level: 'Medium',
    score: 30,
    examples: 'Reflected XSS, CSRF в чувствительных действиях, логические баги в оплате/заказах',
  },
  {
    level: 'Low',
    score: 10,
    examples: 'Неполные ограничения rate limit, раскрытие информации без прямого ущерба, слабые настройки cookies',
  },
  {
    level: 'Info',
    score: 2,
    examples: 'Рекомендации по заголовкам безопасности/гигиене, мелкие hardening-заметки',
  },
];

export default function BugBountyPage() {
  return (
    <Box>
      {/* Hero */}
      <Box
        style={{
          position: 'relative',
          minHeight: 'calc(100vh - 80px)',
          overflow: 'hidden',
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <Box style={{ position: 'absolute', inset: 0 }}>
          <Image
            src="/Bug_hunetr.png"
            alt="Страница для баг-хантеров и white-hat исследователей"
            fill
            priority
            style={{ objectFit: 'cover', objectPosition: 'center right', filter: 'saturate(1.05) contrast(1.05)' }}
          />
          <Box
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(90deg, rgba(10,8,6,0.92) 0%, rgba(10,8,6,0.70) 45%, rgba(10,8,6,0.50) 100%)',
            }}
          />
        </Box>

        <Container size="lg" py={70} style={{ position: 'relative' }}>
          <Stack gap="md">
            <Group gap="sm" wrap="wrap">
              <Badge variant="light" color="teaGold" leftSection={<IconBug size={14} />}>
                Bug bounty (чайный)
              </Badge>
              <Badge variant="light" color="teaGold" leftSection={<IconShieldCheck size={14} />}>
                Responsible disclosure
              </Badge>
              <Badge variant="light" color="teaGold" leftSection={<IconClipboardList size={14} />}>
                Правила + баллы
              </Badge>
            </Group>

            <Title
              order={1}
              style={{
                color: colors.textPrimary,
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: '2.6rem',
                textShadow: `0 14px 40px ${colors.shadowDark}`,
                maxWidth: 860,
              }}
            >
              Для баг‑хантеров и white‑hat исследователей
            </Title>

            <Text c={colors.textSecondary} size="lg" style={{ lineHeight: 1.8, maxWidth: 860 }}>
              Мы — начинающий (и довольно бедный) стартап. Денежные награды пока не обещаем, но мы реально ценим помощь
              в защите пользователей: за валидные отчёты дарим чай и добавляем вас в наш будущий «дашборд славы».
            </Text>

            <Text c={colors.textMuted} size="sm">
              Дата последнего обновления правил: {LAST_UPDATED}
            </Text>

            <Group gap="md" wrap="wrap">
              <Badge variant="outline" color="teaGold" leftSection={<IconCup size={14} />}>
                Награда: чай
              </Badge>
              <Badge variant="outline" color="teaGold" leftSection={<IconTrophy size={14} />}>
                Награда: место в лидерборде
              </Badge>
              <Badge variant="outline" color="teaGold" leftSection={<IconTarget size={14} />}>
                Фокус: безопасность пользователей
              </Badge>
            </Group>
          </Stack>
        </Container>
      </Box>

      <Container size="lg" py="xl">
        <Stack gap="xl">
          {/* How to report */}
          <Card
            p="xl"
            radius="lg"
            style={{
              background: colors.gradientCard,
              border: `1px solid ${colors.border}`,
              boxShadow: `0 16px 46px ${colors.shadowDark}`,
            }}
          >
            <Group gap="md" align="flex-start" wrap="wrap">
              <Box style={{ flex: '1 1 520px' }}>
                <Title order={2} style={{ color: colors.textPrimary }}>
                  Как сообщить об уязвимости
                </Title>
                <Text c={colors.textSecondary} style={{ lineHeight: 1.8 }} mt="sm">
                  Пожалуйста, пишите на{' '}
                  <Anchor href="mailto:info@localtea.ru" style={{ color: colors.accent, fontWeight: 700 }}>
                    info@localtea.ru
                  </Anchor>
                  {' '}с темой «Security report».
                </Text>
                <List spacing="xs" mt="md" c={colors.textSecondary}>
                  <List.Item>
                    Опишите шаги воспроизведения (PoC) так, чтобы мы могли повторить проблему.
                  </List.Item>
                  <List.Item>Укажите затронутый URL/эндпоинт, аккаунт/роль и ожидаемое поведение.</List.Item>
                  <List.Item>
                    Не извлекайте и не публикуйте персональные данные; достаточно минимального доказательства.
                  </List.Item>
                  <List.Item>
                    Мы ответим как можно быстрее: обычно в течение 1–3 рабочих дней (иногда мы спим, мы правда маленькие).
                  </List.Item>
                </List>
              </Box>
              <Box style={{ flex: '0 1 280px' }}>
                <Card
                  p="md"
                  radius="md"
                  style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${colors.border}` }}
                >
                  <Group gap="xs" mb="xs">
                    <IconMail size={18} style={{ color: colors.accent }} />
                    <Text fw={700} c={colors.textPrimary}>
                      Шаблон отчёта
                    </Text>
                  </Group>
                  <Text size="sm" c={colors.textSecondary} style={{ lineHeight: 1.6 }}>
                    1) Что за баг
                    <br />
                    2) Где найден (URL)
                    <br />
                    3) Шаги воспроизведения
                    <br />
                    4) Влияние/риск
                    <br />
                    5) Скрин/видео/PoC
                    <br />
                    6) Контакты/ник для лидерборда
                  </Text>
                </Card>
              </Box>
            </Group>
          </Card>

          {/* Scope & rules */}
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
            <Card
              p="xl"
              radius="lg"
              style={{ background: colors.gradientCard, border: `1px solid ${colors.border}` }}
            >
              <Group gap="sm" mb="sm">
                <IconTarget size={22} style={{ color: colors.accent }} />
                <Title order={3} style={{ color: colors.textPrimary }}>
                  Область тестирования (scope)
                </Title>
              </Group>
              <List spacing="xs" c={colors.textSecondary}>
                <List.Item>
                  Публичный сайт: <b>https://localtea.ru</b>
                </List.Item>
                <List.Item>
                  API (пользовательское): <b>https://api.localtea.ru</b>
                </List.Item>
                <List.Item>
                  Страницы и API внутри нашего домена, доступные без специальных разрешений.
                </List.Item>
              </List>
              <Divider my="md" style={{ borderColor: 'rgba(212,137,79,0.12)' }} />
              <Text c={colors.textMuted} size="sm" style={{ lineHeight: 1.7 }}>
                Если сомневаетесь — напишите нам перед активными тестами, и мы подтвердим scope.
              </Text>
            </Card>

            <Card
              p="xl"
              radius="lg"
              style={{ background: colors.gradientCard, border: `1px solid ${colors.border}` }}
            >
              <Group gap="sm" mb="sm">
                <IconShieldCheck size={22} style={{ color: colors.accent }} />
                <Title order={3} style={{ color: colors.textPrimary }}>
                  Правила участия
                </Title>
              </Group>
              <List spacing="xs" c={colors.textSecondary}>
                <List.Item>
                  Действуйте добросовестно: без вреда пользователям, без массового перебора и без шума.
                </List.Item>
                <List.Item>Не выходите за рамки минимального PoC (доказательства).</List.Item>
                <List.Item>
                  Сначала сообщите нам, дайте время на исправление — затем уже обсуждайте публично.
                </List.Item>
                <List.Item>Один баг — один отчёт. Дубликаты могут не оцениваться.</List.Item>
              </List>
            </Card>
          </SimpleGrid>

          {/* Forbidden */}
          <Card
            p="xl"
            radius="lg"
            style={{ background: colors.gradientCard, border: `1px solid ${colors.border}` }}
          >
            <Group gap="sm" mb="sm">
              <IconBan size={22} style={{ color: colors.error }} />
              <Title order={3} style={{ color: colors.textPrimary }}>
                Запрещено
              </Title>
            </Group>
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
              <List spacing="xs" c={colors.textSecondary}>
                <List.Item>DoS/DDoS, нагрузочное «ломание» продакшна, массовые сканирования.</List.Item>
                <List.Item>Социальная инженерия, фишинг, попытки получить доступ к чужим аккаунтам через людей.</List.Item>
                <List.Item>Изменение/удаление данных, которые вам не принадлежат, даже «для проверки».</List.Item>
              </List>
              <List spacing="xs" c={colors.textSecondary}>
                <List.Item>Эксплуатация, приводящая к утечке персональных данных (сверх минимума PoC).</List.Item>
                <List.Item>Доступ к инфраструктуре/панелям, не относящимся к публичному продукту.</List.Item>
                <List.Item>Публикация уязвимости до того, как мы успели исправить (без согласования).</List.Item>
              </List>
            </SimpleGrid>
            <Text c={colors.textMuted} size="sm" mt="md" style={{ lineHeight: 1.7 }}>
              Мы можем попросить прекратить тестирование, если видим риск для сервиса или пользователей.
            </Text>
          </Card>

          {/* Points table */}
          <Card
            p="xl"
            radius="lg"
            style={{ background: colors.gradientCard, border: `1px solid ${colors.border}` }}
          >
            <Title order={2} style={{ color: colors.textPrimary }}>
              Система баллов
            </Title>
            <Text c={colors.textSecondary} mt="sm" style={{ lineHeight: 1.8 }}>
              Мы оцениваем отчёты по влиянию и воспроизводимости. Баллы — это наш внутренний «чайный рейтинг»:
              чем больше баллов, тем выше вы в лидерборде (и тем проще нам выбрать, кому отправить самый вкусный чай).
            </Text>

            <Divider my="md" style={{ borderColor: 'rgba(212,137,79,0.12)' }} />

            <Table withTableBorder withColumnBorders highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ color: colors.textPrimary }}>Уровень</Table.Th>
                  <Table.Th style={{ color: colors.textPrimary }}>Баллы</Table.Th>
                  <Table.Th style={{ color: colors.textPrimary }}>Примеры</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {points.map((row) => (
                  <Table.Tr key={row.level}>
                    <Table.Td style={{ color: colors.textSecondary, fontWeight: 700 }}>{row.level}</Table.Td>
                    <Table.Td style={{ color: colors.textSecondary }}>{row.score}</Table.Td>
                    <Table.Td style={{ color: colors.textSecondary }}>{row.examples}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            <Text c={colors.textMuted} size="sm" mt="md" style={{ lineHeight: 1.7 }}>
              Баллы не суммируются автоматически: финальная оценка может зависеть от качества отчёта,
              новизны, реального влияния и сложности исправления.
            </Text>
          </Card>

          {/* Rewards */}
          <Card
            p="xl"
            radius="lg"
            style={{
              background: 'linear-gradient(135deg, rgba(44,18,8,0.22) 0%, rgba(80,46,18,0.12) 100%)',
              border: `1px solid ${colors.borderHover}`,
            }}
          >
            <Title order={2} style={{ color: colors.textPrimary }}>
              Награды
            </Title>
            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md" mt="md">
              <Card p="lg" radius="md" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${colors.border}` }}>
                <Group gap="xs" mb="xs">
                  <IconCup size={18} style={{ color: colors.accent }} />
                  <Text fw={800} c={colors.textPrimary}>
                    Чай
                  </Text>
                </Group>
                <Text size="sm" c={colors.textSecondary} style={{ lineHeight: 1.7 }}>
                  Да, реально чай. У нас чай — валюта и философия.
                </Text>
              </Card>
              <Card p="lg" radius="md" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${colors.border}` }}>
                <Group gap="xs" mb="xs">
                  <IconTrophy size={18} style={{ color: colors.accent }} />
                  <Text fw={800} c={colors.textPrimary}>
                    Лидерборд
                  </Text>
                </Group>
                <Text size="sm" c={colors.textSecondary} style={{ lineHeight: 1.7 }}>
                  Почётное место в нашем дашборде. Можно ник, можно «анонимный самурай».
                </Text>
              </Card>
              <Card p="lg" radius="md" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${colors.border}` }}>
                <Group gap="xs" mb="xs">
                  <IconShieldCheck size={18} style={{ color: colors.accent }} />
                  <Text fw={800} c={colors.textPrimary}>
                    Карма
                  </Text>
                </Group>
                <Text size="sm" c={colors.textSecondary} style={{ lineHeight: 1.7 }}>
                  Главное — безопасность пользователей. Спасибо, что помогаете.
                </Text>
              </Card>
            </SimpleGrid>
            <Text c={colors.textMuted} size="sm" mt="md" style={{ lineHeight: 1.7 }}>
              Дисклеймер: это не денежная программа bug bounty. Мы не гарантируем вознаграждение за любой отчёт.
              Но мы стараемся быть честными и благодарными.
            </Text>
          </Card>

          {/* Leaderboard (empty) */}
          <Card
            p="xl"
            radius="lg"
            style={{ background: colors.gradientCard, border: `1px solid ${colors.border}` }}
          >
            <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
              <Box>
                <Title order={2} style={{ color: colors.textPrimary }}>
                  Дашборд (лидерборд)
                </Title>
                <Text c={colors.textSecondary} style={{ lineHeight: 1.8 }} mt="xs">
                  Пока таблица лидеров пуста — стань первым и забери чайную корону.
                </Text>
              </Box>
              <Badge variant="light" color="teaGold" leftSection={<IconTrophy size={14} />}>
                скоро в проде
              </Badge>
            </Group>

            <Divider my="md" style={{ borderColor: 'rgba(212,137,79,0.12)' }} />

            <Table withTableBorder highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ color: colors.textPrimary }}>Место</Table.Th>
                  <Table.Th style={{ color: colors.textPrimary }}>Ник</Table.Th>
                  <Table.Th style={{ color: colors.textPrimary }}>Баллы</Table.Th>
                  <Table.Th style={{ color: colors.textPrimary }}>Отчётов</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td colSpan={4} style={{ color: colors.textMuted, textAlign: 'center', padding: '22px' }}>
                    Таблица лидеров пока пуста.
                  </Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>

            <Text c={colors.textMuted} size="sm" mt="md">
              Связанные документы:{' '}
              <Anchor component={Link} href="/terms" style={{ color: colors.accent, fontWeight: 600 }}>
                Условия
              </Anchor>
              ,{' '}
              <Anchor component={Link} href="/privacy" style={{ color: colors.accent, fontWeight: 600 }}>
                Конфиденциальность
              </Anchor>
              .
            </Text>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
}
