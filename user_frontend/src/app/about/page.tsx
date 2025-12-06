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
      <Box ta="center" mb={80}>
        <Text size="sm" c="violet" fw={600} tt="uppercase" style={{ letterSpacing: "2px" }} mb="xs">
          О нас
        </Text>
        <Title order={1} mb="lg" style={{ fontSize: '3rem' }}>
          LocalTea
        </Title>
        <Text size="xl" c="dimmed" maw={600} mx="auto" style={{ lineHeight: 1.8 }}>
          Мы привозим лучшие сорта чая со всего мира, чтобы подарить вам 
          незабываемые моменты наслаждения вкусом и ароматом.
        </Text>
      </Box>

      {/* Story */}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing={60} mb={80}>
        <Box>
          <Image
            src="https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600"
            alt="Чайная плантация"
            radius="xl"
            h={400}
            style={{ objectFit: 'cover' }}
          />
        </Box>
        <Stack gap="lg" justify="center">
          <Title order={2}>Наша история</Title>
          <Text c="dimmed" style={{ lineHeight: 2 }}>
            LocalTea родился из страсти к настоящему чаю. Мы начали как небольшая 
            семейная компания, а теперь сотрудничаем с лучшими плантациями Китая, 
            Японии, Индии и Тайваня.
          </Text>
          <Text c="dimmed" style={{ lineHeight: 2 }}>
            Каждый сорт проходит строгий отбор качества. Мы лично посещаем 
            плантации, знакомимся с производителями и выбираем только те чаи, 
            которые вызывают восхищение.
          </Text>
        </Stack>
      </SimpleGrid>

      {/* Values */}
      <Box mb={80}>
        <Title order={2} ta="center" mb="xl">Наши ценности</Title>
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
              className="glow-card"
              p="xl"
              radius="lg"
              ta="center"
            >
              <value.icon size={48} style={{ color: '#753dda', marginBottom: 16 }} />
              <Text fw={600} size="lg" mb="xs">{value.title}</Text>
              <Text size="sm" c="dimmed">{value.description}</Text>
            </Card>
          ))}
        </SimpleGrid>
      </Box>

      {/* Contact CTA */}
      <Card
        p={60}
        radius="xl"
        style={{
          background: 'linear-gradient(135deg, rgba(67, 22, 151, 0.3) 0%, rgba(191, 64, 0, 0.2) 100%)',
          border: '1px solid rgba(117, 61, 218, 0.3)',
          textAlign: 'center',
        }}
      >
        <Title order={2} mb="lg">Свяжитесь с нами</Title>
        <Text size="lg" c="dimmed" mb="xl">
          Есть вопросы? Мы всегда рады помочь!
        </Text>
        <Group justify="center" gap="xl">
          <Box>
            <Text size="sm" c="dimmed">Email</Text>
            <Text fw={600}>info@localtea.ru</Text>
          </Box>
          <Box>
            <Text size="sm" c="dimmed">Телефон</Text>
            <Text fw={600}>+7 (900) 123-45-67</Text>
          </Box>
          <Box>
            <Text size="sm" c="dimmed">Telegram</Text>
            <Text fw={600}>@localtea</Text>
          </Box>
        </Group>
      </Card>
    </Container>
  );
}
