'use client';

import {
  Container,
  Title,
  Text,
  Stack,
  Box,
  Card,
  Group,
  Button,
  SimpleGrid,
  Image,
} from '@mantine/core';
import { IconBriefcase, IconTruck, IconUsers } from '@tabler/icons-react';
import Link from 'next/link';

function FeatureCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: any;
  title: string;
  desc: string;
}) {
  return (
    <Card
      p="md"
      radius="md"
      style={{ background: 'transparent', border: '1px solid rgba(212,137,79,0.06)' }}
    >
      <Group align="flex-start">
        <Box style={{ background: 'rgba(212,137,79,0.06)', padding: 10, borderRadius: 8 }}>
          <Icon size={28} style={{ color: '#d4894f' }} />
        </Box>
        <Box>
          <Text fw={700} style={{ color: '#fbf6ee' }}>
            {title}
          </Text>
          <Text size="sm" c="#e8dcc8">
            {desc}
          </Text>
        </Box>
      </Group>
    </Card>
  );
}

export default function ForBusinessPage() {
  return (
    <Container size="lg" py="xl">
      {/* Hero */}
      <Box
        style={{
          padding: '36px 28px',
          borderRadius: 12,
          background: 'linear-gradient(180deg, rgba(24,16,10,0.02), rgba(12,8,6,0.02))',
          border: '1px solid rgba(212,137,79,0.06)',
        }}
        mb={32}
      >
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing={40}>
          <Box style={{ display: 'flex', alignItems: 'center' }}>
            <Image
              src="/bus_in_ass_man.png"
              alt="Для гильдий и таверн"
              radius={0}
              style={{
                border: 'none',
                boxShadow: 'none',
                width: '100%',
                height: 'auto',
              }}
            />
          </Box>

          <Box>
            <Text
              size="sm"
              c="#d4894f"
              fw={600}
              tt="uppercase"
              mb="xs"
              style={{ letterSpacing: 2 }}
            >
              Для гильдий и таверн
            </Text>
            <Title
              order={1}
              mb="md"
              style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                color: '#fbf6ee',
              }}
            >
              Вы — чайная обитель, таверна странников или лавка редких листьев?
            </Title>
            <Text c="#e8dcc8" size="lg" style={{ lineHeight: 1.8 }}>
              В наших древних чертогах Золотого Листа мы открываем особые свитки
              для могущественных торговых домов, уютных чайных и таверн у
              перекрёстков миров. Для вас — заклинания гибких скидок, что танцуют
              подобно лунному свету над плантациями, верные духи-хранители
              (персональные менеджеры) и драконья логистика, что несёт сокровища
              сквозь любые бури.
              <br />
              <br />
              Шепните в нефритовый амулет или коснитесь магического свитка —
              звоните нам или пишите нам прямо сейчас, и мы соткём персональное
              коммерческое предложение, достойное императорского чайного дворца.
            </Text>
          </Box>
        </SimpleGrid>
      </Box>

      {/* Features */}
      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg" mb={32}>
        <FeatureCard
          icon={IconBriefcase}
          title="Оптовые условия"
          desc="Гибкие скидки и персонализированные цены для постоянных партнёров."
        />
        <FeatureCard
          icon={IconUsers}
          title="Персональный менеджер"
          desc="Вы получите выделенного менеджера для быстрого оформления и сопровождения заказов."
        />
        <FeatureCard
          icon={IconTruck}
          title="Логистика и доставка"
          desc="Надёжные партнёры по доставке и удобные условия по всей России."
        />
      </SimpleGrid>

      {/* Contact card */}
      <Card p="lg" radius="md" style={{ border: '1px solid rgba(212,137,79,0.06)' }}>
        <Stack gap="sm">
          <Text fw={700} style={{ color: '#fbf6ee' }}>
            Контакт для корпоративных клиентов
          </Text>
          <Text c="#e8dcc8">
            Email:{' '}
            <a href="mailto:info@localtea.ru" style={{ color: '#d4894f' }}>
              info@localtea.ru
            </a>
          </Text>
          <Text c="#e8dcc8">
            Телефон:{' '}
            <a href="tel:+79001234567" style={{ color: '#d4894f' }}>
              +7 (962) 951-33-71
            </a>
          </Text>
          <Group mt="sm">
            {/*<Button component={Link} href="/contact" variant="outline">
              Связаться
            </Button> */}
            <Button component={Link} href="/catalog" variant="subtle">
              Каталог
            </Button>
          </Group>
        </Stack>
      </Card>
    </Container>
  );
}
