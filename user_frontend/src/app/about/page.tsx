'use client';

import {
  Container,
  Title,
  Text,
  Stack,
  Box,
  Card,
  SimpleGrid,
  Image,
  Group,
} from '@mantine/core';
import { IconLeaf, IconTruck, IconHeart, IconAward } from '@tabler/icons-react';

export default function AboutPage() {
  return (
    <Container size="lg" py="xl">
      {/* Hero */}
      <Box
        ta="center"
        mb={80}
        style={{
          padding: '48px 20px',
          background: 'linear-gradient(180deg, rgba(24,16,10,0.02), rgba(12,8,6,0.02))',
          borderRadius: 12,
        }}
      >
        <Text size="sm" c="#d4894f" fw={600} tt="uppercase" style={{ letterSpacing: '2px' }} mb="xs">
          О нас
        </Text>
        <Title order={1} mb="lg" style={{ fontSize: '3rem', fontFamily: 'Georgia, "Times New Roman", serif', color: '#fbf6ee', textShadow: '0 6px 28px rgba(0,0,0,0.6)' }}>
          LocalTea
        </Title>
        <Text size="xl" c="#e8dcc8" maw={720} mx="auto" style={{ lineHeight: 1.9 }}>
          Мы привозим лучшие сорта чая со всего мира, чтобы подарить вам незабываемые моменты
          наслаждения вкусом и ароматом. Каждая чашка — это история, и мы рады поделиться
          ею с вами.
        </Text>
      </Box>

      {/* Story */}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing={60} mb={80} style={{ alignItems: 'center' }}>
        <Box>
          <Image
            src="https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=1000"
            alt="Чайная плантация"
            radius="md"
            h={440}
            style={{ objectFit: 'cover', border: '1px solid rgba(212,137,79,0.06)', boxShadow: '0 20px 50px rgba(8,6,4,0.6)' }}
          />
        </Box>
        <Stack gap="lg" justify="center">
          <Title order={2} style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: '#fbf6ee' }}>Наша история</Title>
          <Text c="#e8dcc8" style={{ lineHeight: 2 }}>
            LocalTea родился из страсти к настоящему чаю. Мы начали как небольшая
            семейная компания и выросли благодаря уважению к традициям и вниманию к
            качеству. Сейчас мы работаем напрямую с плантациями в Китае, Японии,
            Индии и Тайване, отбирая только лучшие урожаи.
          </Text>
          <Text c="#e8dcc8" style={{ lineHeight: 2 }}>
            Каждую партию мы оцениваем лично: цвет, аромат, послевкусие — всё это
            важно, чтобы вы получили идеальную чашку.
          </Text>
        </Stack>
      </SimpleGrid>

      {/* Values */}
      <Box mb={80}>
        <Title order={2} ta="center" mb="xl" style={{ color: '#fbf6ee' }}>Наши ценности</Title>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="xl">
          {[
            {
              icon: IconLeaf,
              title: 'Натуральность',
              description: 'Только органический чай без искусственных добавок',
            },
            {
              icon: IconTruck,
              title: 'Свежесть',
              description: 'Прямые поставки с плантаций, минимальные сроки',
            },
            {
              icon: IconHeart,
              title: 'Забота',
              description: 'Внимание к каждому клиенту и его предпочтениям',
            },
            {
              icon: IconAward,
              title: 'Качество',
              description: 'Строгий контроль на всех этапах производства',
            },
          ].map((value, index) => (
            <Card
              key={index}
              p="xl"
              radius="md"
              style={{
                background: 'linear-gradient(180deg, rgba(28,20,12,0.94), rgba(16,12,9,0.96))',
                border: '1px solid rgba(212,137,79,0.06)',
                boxShadow: '0 12px 32px rgba(8,6,4,0.6)',
                textAlign: 'center',
              }}
            >
              <value.icon size={44} style={{ color: '#d4894f', marginBottom: 14 }} />
              <Text fw={700} size="lg" mb="xs" style={{ color: '#fbf6ee' }}>{value.title}</Text>
              <Text size="sm" c="#e8dcc8">{value.description}</Text>
            </Card>
          ))}
        </SimpleGrid>
      </Box>

      <Box mt="lg" style={{ textAlign: 'center' }}>
        <Title order={4} style={{ color: '#fbf6ee', fontFamily: 'Georgia, "Times New Roman", serif' }}>Наш офис</Title>
        <Text c="#e8dcc8" size="sm" mb="md">г. Москва, улица Строжевая, дом 4, строение 1</Text>

        <Box style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(212,137,79,0.08)', boxShadow: '0 12px 36px rgba(8,6,4,0.5)' }}>
          <iframe
            src="https://www.google.com/maps?q=Москва+улица+Строжевая+4+стр1&output=embed"
            width="100%"
            height="320"
            style={{ border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Map: Москва, улица Строжевая 4 стр1"
          />
        </Box>
      </Box>

      {/* Contact CTA */}
      <Card
        p={60}
        radius="xl"
        style={{
          background: 'linear-gradient(135deg, rgba(44,18,8,0.22) 0%, rgba(80,46,18,0.12) 100%)',
          border: '1px solid rgba(212,137,79,0.12)',
          textAlign: 'center',
          marginTop: 48,
        }}
      >
        <Title order={2} mb="lg" style={{ color: '#fbf6ee' }}>Свяжитесь с нами</Title>
        <Text size="lg" c="#e8dcc8" mb="xl">
          Есть вопросы? Мы всегда рады помочь!
        </Text>
        <Group justify="center" gap="xl">
          <Box>
            <Text size="sm" c="#e8dcc8">Email</Text>
            <Text fw={700} style={{ color: '#fbf6ee' }}>info@localtea.ru</Text>
          </Box>
          <Box>
            <Text size="sm" c="#e8dcc8">Телефон</Text>
            <Text fw={700} style={{ color: '#fbf6ee' }}>+7 (900) 123-45-67</Text>
          </Box>
          <Box>
            <Text size="sm" c="#e8dcc8">Telegram</Text>
            <Text fw={700} style={{ color: '#fbf6ee' }}>@localtea</Text>
          </Box>
        </Group>
      </Card>
    </Container>
  );
}
