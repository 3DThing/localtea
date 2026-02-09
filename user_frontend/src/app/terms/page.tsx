'use client';

import { Anchor, Container, Divider, List, Stack, Text, Title } from '@mantine/core';
import Link from 'next/link';
import { colors } from '@/lib/theme';

const LAST_UPDATED = '26.12.2025';

export default function TermsOfUsePage() {
  return (
    <Container size="md" py="xl">
      <Stack gap="md">
        <Title order={1} style={{ color: colors.textPrimary }}>
          Условия использования
        </Title>
        <Text size="sm" c={colors.textMuted}>
          Дата последнего обновления: {LAST_UPDATED}
        </Text>

        <Text c={colors.textSecondary} style={{ lineHeight: 1.8 }}>
          Настоящие Условия использования (далее — «Условия») регулируют порядок использования сайта и сервисов LocalTea.
          Используя Сервис, вы подтверждаете, что ознакомились и согласились с Условиями.
        </Text>

        <Text c={colors.textSecondary} style={{ lineHeight: 1.8 }}>
          Сервис предназначен для продажи чая, оформленного в тематике фэнтези‑миров.
        </Text>

        <Divider my="sm" style={{ borderColor: 'rgba(212,137,79,0.12)' }} />

        <Title order={3} style={{ color: colors.textPrimary }}>
          1. Термины
        </Title>
        <List spacing="xs" c={colors.textSecondary}>
          <List.Item>
            <b>Сервис</b> — сайт, веб‑интерфейсы и функциональность LocalTea.
          </List.Item>
          <List.Item>
            <b>Пользователь</b> — дееспособное лицо, использующее Сервис.
          </List.Item>
          <List.Item>
            <b>Администратор/Правообладатель</b> — <b>Вальтер Владислав Сергеевич</b>.
          </List.Item>
        </List>

        <Title order={3} style={{ color: colors.textPrimary }}>
          2. Доступ к сервису и аккаунт
        </Title>
        <Text c={colors.textSecondary} style={{ lineHeight: 1.8 }}>
          Для использования отдельных функций может потребоваться регистрация и подтверждение контактных данных.
          Пользователь обязуется предоставлять достоверную информацию и обеспечивать конфиденциальность данных доступа.
        </Text>

        <Title order={3} style={{ color: colors.textPrimary }}>
          3. Заказы, оплата и доставка
        </Title>
        <Text c={colors.textSecondary} style={{ lineHeight: 1.8 }}>
          Если Сервис функционирует как интернет‑магазин, оформление заказа осуществляется через корзину.
          Условия оплаты и доставки публикуются в интерфейсе Сервиса и могут зависеть от региона и выбранного способа.
        </Text>
        <Text c={colors.textSecondary} style={{ lineHeight: 1.8 }}>
          При приёме оплат могут применяться требования законодательства РФ (например, о применении ККТ и выдаче чеков —
          № 54‑ФЗ, если применимо к вашей схеме расчётов).
        </Text>

        <Title order={3} style={{ color: colors.textPrimary }}>
          4. Возвраты, отмены и претензии
        </Title>
        <Text c={colors.textSecondary} style={{ lineHeight: 1.8 }}>
          Порядок возврата и обмена товаров/отмены заказов определяется законодательством РФ и правилами Сервиса.
          Для дистанционной торговли применяются нормы Закона РФ «О защите прав потребителей» № 2300‑1 и
          Постановления Правительства РФ № 2463 (при продаже товаров дистанционным способом).
        </Text>

        <Title order={3} style={{ color: colors.textPrimary }}>
          5. Контент и права
        </Title>
        <Text c={colors.textSecondary} style={{ lineHeight: 1.8 }}>
          Все элементы Сервиса (дизайн, тексты, изображения, товарные знаки, код) охраняются законом.
          Пользователь получает ограниченную неисключительную лицензию на использование Сервиса в личных некоммерческих
          целях в пределах его функциональности.
        </Text>

        <Title order={3} style={{ color: colors.textPrimary }}>
          6. Запрещённые действия
        </Title>
        <List spacing="xs" c={colors.textSecondary}>
          <List.Item>Нарушать работу Сервиса, пытаться получить несанкционированный доступ к аккаунтам/системам.</List.Item>
          <List.Item>Размещать заведомо незаконную информацию или нарушать права третьих лиц.</List.Item>
          <List.Item>Использовать Сервис для мошенничества, спама, обхода ограничений и иных противоправных целей.</List.Item>
        </List>

        <Title order={3} style={{ color: colors.textPrimary }}>
          7. Ответственность и ограничения
        </Title>
        <Text c={colors.textSecondary} style={{ lineHeight: 1.8 }}>
          Сервис предоставляется «как есть», в пределах, допускаемых законодательством РФ.
          Правообладатель не несёт ответственности за сбои, вызванные действиями третьих лиц, форс‑мажором,
          проблемами связи или оборудования пользователя.
        </Text>

        <Title order={3} style={{ color: colors.textPrimary }}>
          8. Персональные данные
        </Title>
        <Text c={colors.textSecondary} style={{ lineHeight: 1.8 }}>
          Обработка персональных данных осуществляется в соответствии с
          {' '}
          <Anchor component={Link} href="/privacy" style={{ color: colors.accent, fontWeight: 600 }}>
            Политикой конфиденциальности
          </Anchor>
          .
        </Text>

        <Title order={3} style={{ color: colors.textPrimary }}>
          9. Изменение условий
        </Title>
        <Text c={colors.textSecondary} style={{ lineHeight: 1.8 }}>
          Правообладатель вправе изменять Условия, публикуя новую редакцию на сайте. Если пользователь продолжает
          пользоваться Сервисом после вступления изменений в силу, это считается принятием новой редакции.
        </Text>

        <Title order={3} style={{ color: colors.textPrimary }}>
          10. Применимое право и споры
        </Title>
        <Text c={colors.textSecondary} style={{ lineHeight: 1.8 }}>
          К Условиям и отношениям сторон применяется право Российской Федерации.
          Претензионный порядок и подсудность определяются применимыми нормами РФ.
        </Text>

        <Title order={3} style={{ color: colors.textPrimary }}>
          11. Реквизиты и контакты
        </Title>
        <Text c={colors.textSecondary} style={{ lineHeight: 1.8 }}>
          Правообладатель/исполнитель: <b>Вальтер Владислав Сергеевич</b>, самозанятый (НПД).
          ИНН: <b>502014830390</b>. E‑mail: <b>rbiter@localtea.ru</b>.
        </Text>

        <Divider my="sm" style={{ borderColor: 'rgba(212,137,79,0.12)' }} />

        <Text size="sm" c={colors.textMuted}>
          См. также:{' '}
          <Anchor component={Link} href="/offer" style={{ color: colors.accent, fontWeight: 600 }}>
            Публичная оферта
          </Anchor>
          .
        </Text>
      </Stack>
    </Container>
  );
}
