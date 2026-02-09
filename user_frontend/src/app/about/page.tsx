'use client';

import {
  Container,
  Title,
  Text,
  Stack,
  Box,
  Card,
  SimpleGrid,
  Group,
  Divider,
} from '@mantine/core';
import Image from 'next/image';
import {
  IconSparkles,
  IconMapPin,
  IconMail,
  IconPhone,
  IconBrandTelegram,
  IconLeaf,
  IconPalette,
  IconHeart,
  IconWand,
} from '@tabler/icons-react';
import { colors } from '@/lib/theme';

export default function AboutPage() {
  return (
    <Box>
      {/* Hero Section with Image */}
      <Box
        style={{
          position: 'relative',
          minHeight: '70vh',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <Box style={{ position: 'absolute', inset: 0 }}>
          <Image
            src="/aboutus.png"
            alt="LocalTea — чай из любимых миров"
            fill
            priority
            style={{ objectFit: 'cover', objectPosition: 'center' }}
          />
          <Box
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(90deg, rgba(10,8,6,0.88) 0%, rgba(10,8,6,0.55) 50%, rgba(10,8,6,0.35) 100%)',
            }}
          />
        </Box>

        <Container size="lg" py={80} style={{ position: 'relative', zIndex: 1 }}>
          <Stack gap="lg" maw={680}>
            <Group gap="xs">
              <IconSparkles size={18} style={{ color: colors.accent }} />
              <Text
                size="sm"
                fw={600}
                tt="uppercase"
                style={{ letterSpacing: '3px', color: colors.accent }}
              >
                О нас
              </Text>
            </Group>

            <Title
              order={1}
              style={{
                fontSize: 'clamp(2.4rem, 6vw, 4rem)',
                fontFamily: 'Georgia, "Times New Roman", serif',
                color: colors.textPrimary,
                textShadow: `0 8px 32px ${colors.shadowDark}`,
                lineHeight: 1.15,
              }}
            >
              Размываем границы между любимыми мирами и реальностью
            </Title>

            <Text
              size="lg"
              c={colors.textSecondary}
              style={{ lineHeight: 1.9, maxWidth: 600 }}
            >
              Мы создали бренд, чтобы вы могли почувствовать аромат и вкус мест,
              которые раньше существовали только в воображении.
            </Text>
          </Stack>
        </Container>
      </Box>

      <Container size="lg" py={80}>
        {/* Atmosphere Block */}
        <Card
          p="xl"
          radius="lg"
          mb={60}
          style={{
            background: `linear-gradient(135deg, rgba(44,18,8,0.28) 0%, rgba(80,46,18,0.14) 100%)`,
            border: `1px solid ${colors.borderHover}`,
            boxShadow: `0 16px 48px ${colors.shadowDark}`,
          }}
        >
          <Group gap="md" align="flex-start" wrap="nowrap">
            <Box
              style={{
                width: 56,
                height: 56,
                borderRadius: 12,
                background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDark} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <IconPalette size={28} style={{ color: '#fff' }} />
            </Box>
            <Stack gap="xs">
              <Title order={3} style={{ color: colors.textPrimary }}>
                Атмосферность
              </Title>
              <Text c={colors.textSecondary} style={{ lineHeight: 1.85 }}>
                Каждая локация подбирается индивидуально, скрупулёзно подбирается каждый
                ингредиент, передающий атмосферу и историю этого места.
              </Text>
            </Stack>
          </Group>
        </Card>

        {/* Main Story */}
        <Stack gap="xl" mb={80}>
          <Title
            order={2}
            ta="center"
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              color: colors.textPrimary,
              fontSize: '2rem',
            }}
          >
            Наша история
          </Title>

          <Text
            size="lg"
            c={colors.textSecondary}
            ta="center"
            maw={900}
            mx="auto"
            style={{ lineHeight: 2 }}
          >
            Мы LocalTea создали бренд, нацеленный на размытие границ между любимыми мирами
            и реальностью. До этого момента, прогуливаясь по локациям Азерота, путешествуя
            по Средиземью, сражаясь в Неверленде с чудовищами, мы лишь могли представить
            запах и вкус, опираясь на текстовое и визуальное описание.
          </Text>

          <Text
            size="xl"
            fw={600}
            ta="center"
            style={{
              color: colors.accent,
              fontFamily: 'Georgia, serif',
              fontStyle: 'italic',
            }}
          >
            Теперь это в прошлом.
          </Text>

          <Text
            size="lg"
            c={colors.textSecondary}
            ta="center"
            maw={900}
            mx="auto"
            style={{ lineHeight: 2 }}
          >
            Окутывающий аромат, любимый вкус приятного сердцу места — прямо у вас дома!
          </Text>
        </Stack>

        {/* Tea Examples */}
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl" mb={80}>
          <Card
            p="xl"
            radius="lg"
            style={{
              background: colors.gradientCard,
              border: `1px solid ${colors.border}`,
              boxShadow: `0 12px 36px ${colors.shadowDark}`,
            }}
          >
            <Group gap="xs" mb="md">
              <IconWand size={20} style={{ color: colors.accent }} />
              <Text fw={700} c={colors.textPrimary}>
                Новиград
              </Text>
            </Group>
            <Text size="sm" c={colors.textSecondary} style={{ lineHeight: 1.8 }}>
              Заварите себе кружечку пряного и терпкого «Новиграда» и, запустив игру или
              открыв книгу, отправляйтесь с ведьмаками в приключение.
            </Text>
          </Card>

          <Card
            p="xl"
            radius="lg"
            style={{
              background: colors.gradientCard,
              border: `1px solid ${colors.border}`,
              boxShadow: `0 12px 36px ${colors.shadowDark}`,
            }}
          >
            <Group gap="xs" mb="md">
              <IconLeaf size={20} style={{ color: '#7cb342' }} />
              <Text fw={700} c={colors.textPrimary}>
                Шир
              </Text>
            </Group>
            <Text size="sm" c={colors.textSecondary} style={{ lineHeight: 1.8 }}>
              Если «терпкое» — не про вас, то прохладный, пахнущий летом и фермой Шир
              наверняка не оставит вас равнодушным. Идеален для спокойного денька,
              наполненного приятными хлопотами. Рекомендуем под музыку!
            </Text>
          </Card>

          <Card
            p="xl"
            radius="lg"
            style={{
              background: colors.gradientCard,
              border: `1px solid ${colors.border}`,
              boxShadow: `0 12px 36px ${colors.shadowDark}`,
            }}
          >
            <Group gap="xs" mb="md">
              <IconHeart size={20} style={{ color: '#e57373' }} />
              <Text fw={700} c={colors.textPrimary}>
                Элвинский лес
              </Text>
            </Group>
            <Text size="sm" c={colors.textSecondary} style={{ lineHeight: 1.8 }}>
              Обласканный солнцем край с вековыми кронами, заряжающий на эпическое
              путешествие и передающий запах цветущих лесов и тепло таверны.
            </Text>
          </Card>
        </SimpleGrid>

        {/* CTA */}
        <Card
          p={48}
          radius="xl"
          mb={80}
          style={{
            background: `linear-gradient(135deg, rgba(44,18,8,0.22) 0%, rgba(80,46,18,0.12) 100%)`,
            border: `1px solid ${colors.borderHover}`,
            textAlign: 'center',
          }}
        >
          <Text
            size="xl"
            c={colors.textSecondary}
            style={{ lineHeight: 1.9 }}
            mb="md"
          >
            У нас найдётся всё, а если нет — мы соберём отдельный купаж специально для тебя :)
          </Text>
          <Text
            size="lg"
            fw={600}
            style={{ color: colors.accent, fontFamily: 'Georgia, serif' }}
          >
            Не отказывай себе в удовольствии!
          </Text>
          <Text c={colors.textMuted} size="md" mt="sm">
            Выбирай что нравится, и пусть уюта и любимого мира в твоей коллекции станет
            чуточку больше.
          </Text>
        </Card>

        <Divider
          my={40}
          style={{ borderColor: colors.border }}
          label={
            <Text size="sm" c={colors.textMuted}>
              Контакты
            </Text>
          }
          labelPosition="center"
        />

        {/* Office & Map */}
        <Stack gap="xl">
          <Box ta="center">
            <Group gap="xs" justify="center" mb="xs">
              <IconMapPin size={18} style={{ color: colors.accent }} />
              <Title
                order={4}
                style={{ color: colors.textPrimary, fontFamily: 'Georgia, serif' }}
              >
                Наш офис
              </Title>
            </Group>
            <Text c={colors.textSecondary} size="md">
              г. Москва, улица Строжевая, дом 4, строение 8
            </Text>
          </Box>

          <Box
            style={{
              borderRadius: 16,
              overflow: 'hidden',
              border: `1px solid ${colors.border}`,
              boxShadow: `0 16px 48px ${colors.shadowDark}`,
            }}
          >
            <iframe
              src="https://www.google.com/maps?q=Москва+улица+Строжевая+4+стр8&output=embed"
              width="100%"
              height="360"
              style={{ border: 0, display: 'block' }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Map: Москва, улица Строжевая 4 стр8"
            />
          </Box>
        </Stack>

        {/* Contact Info */}
        <Card
          p={48}
          radius="xl"
          mt={60}
          style={{
            background: colors.gradientCard,
            border: `1px solid ${colors.border}`,
            boxShadow: `0 16px 48px ${colors.shadowDark}`,
          }}
        >
          <Title
            order={3}
            ta="center"
            mb="xl"
            style={{ color: colors.textPrimary, fontFamily: 'Georgia, serif' }}
          >
            Свяжитесь с нами
          </Title>
          <Text ta="center" c={colors.textSecondary} mb="xl">
            Есть вопросы? Мы всегда рады помочь!
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xl">
            <Box ta="center">
              <IconMail size={28} style={{ color: colors.accent, marginBottom: 8 }} />
              <Text size="sm" c={colors.textMuted} mb={4}>
                Email
              </Text>
              <Text fw={600} c={colors.textPrimary}>
                info@localtea.ru
              </Text>
            </Box>
            <Box ta="center">
              <IconPhone size={28} style={{ color: colors.accent, marginBottom: 8 }} />
              <Text size="sm" c={colors.textMuted} mb={4}>
                Телефон
              </Text>
              <Text fw={600} c={colors.textPrimary}>
                +7 (962) 951-33-71
              </Text>
            </Box>
            <Box ta="center">
              <IconBrandTelegram size={28} style={{ color: colors.accent, marginBottom: 8 }} />
              <Text size="sm" c={colors.textMuted} mb={4}>
                Telegram
              </Text>
              <Text fw={600} c={colors.textPrimary}>
                @localtea
              </Text>
            </Box>
          </SimpleGrid>
        </Card>
      </Container>
    </Box>
  );
}
