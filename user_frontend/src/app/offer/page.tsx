'use client';

import { Anchor, Container, Divider, List, Stack, Text, Title } from '@mantine/core';
import Link from 'next/link';
import { colors } from '@/lib/theme';

const LAST_UPDATED = '26.12.2025';

export default function PublicOfferPage() {
  return (
    <Container size="md" py="xl">
      <Stack gap="md">
        <Title order={1} style={{ color: colors.textPrimary }}>
          Публичная оферта
        </Title>
        <Text size="sm" c={colors.textMuted}>
          Дата последнего обновления: {LAST_UPDATED}
        </Text>

        <Text c={colors.textSecondary} style={{ lineHeight: 1.8 }}>
          Настоящий документ является публичной офертой (предложением заключить договор) в смысле ст. 435–437
          Гражданского кодекса РФ и регулирует условия продажи товаров/оказания услуг через сайт LocalTea.
        </Text>

        <Text c={colors.textSecondary} style={{ lineHeight: 1.8 }}>
          Сайт предназначен для продажи чая, оформленного в тематике фэнтези‑миров.
        </Text>

        <Divider my="sm" style={{ borderColor: 'rgba(212,137,79,0.12)' }} />

        <Title order={3} style={{ color: colors.textPrimary }}>
          1. Стороны и термины
        </Title>
        <List spacing="xs" c={colors.textSecondary}>
          <List.Item>
            <b>Продавец</b> — <b>Вальтер Владислав Сергеевич</b>, самозанятый (НПД), ИНН <b>502014830390</b>, e‑mail
            {' '}
            <b>rbiter@localtea.ru</b>.
          </List.Item>
          <List.Item>
            <b>Покупатель</b> — дееспособное физическое лицо, оформившее заказ в Сервисе.
          </List.Item>
          <List.Item>
            <b>Сайт</b> — веб‑ресурс LocalTea и связанные интерфейсы.
          </List.Item>
          <List.Item>
            <b>Товар</b> — продукция, представленная в каталоге на сайте.
          </List.Item>
          <List.Item>
            <b>Заказ</b> — оформленный Покупателем запрос на покупку Товара с выбранным способом оплаты и доставки.
          </List.Item>
        </List>

        <Title order={3} style={{ color: colors.textPrimary }}>
          2. Предмет договора
        </Title>
        <Text c={colors.textSecondary} style={{ lineHeight: 1.8 }}>
          Продавец обязуется передать Покупателю Товар, а Покупатель обязуется оплатить и принять Товар на условиях
          настоящей оферты и информации, размещённой на сайте (описание товаров, цены, способы доставки).
        </Text>

        <Title order={3} style={{ color: colors.textPrimary }}>
          3. Акцепт оферты
        </Title>
        <Text c={colors.textSecondary} style={{ lineHeight: 1.8 }}>
          Акцептом оферты считается совершение Покупателем действий, однозначно выражающих намерение заключить договор,
          включая (но не ограничиваясь): оформление заказа на сайте и/или его оплату.
        </Text>

        <Title order={3} style={{ color: colors.textPrimary }}>
          4. Цена и оплата
        </Title>
        <Text c={colors.textSecondary} style={{ lineHeight: 1.8 }}>
          Цена Товара указывается на сайте в рублях РФ. Итоговая стоимость заказа может включать доставку и иные услуги,
          если они выбраны Покупателем.
        </Text>
        <Text c={colors.textSecondary} style={{ lineHeight: 1.8 }}>
          Оплата осуществляется способами, доступными на сайте. Если используется платёжный агрегатор/банк‑эквайер,
          обработка карточных данных производится таким провайдером; Продавец не получает и не хранит CVC/CVV.
        </Text>
        <Text c={colors.textSecondary} style={{ lineHeight: 1.8 }}>
          При осуществлении расчётов Продавец выдаёт кассовый чек/БСО в случаях и порядке, предусмотренных № 54‑ФЗ
          (если применимо).
        </Text>

        <Title order={3} style={{ color: colors.textPrimary }}>
          5. Доставка и передача товара
        </Title>
        <Text c={colors.textSecondary} style={{ lineHeight: 1.8 }}>
          Способы, сроки и стоимость доставки указываются при оформлении заказа и зависят от региона и выбранного способа.
          Риск случайной гибели/повреждения Товара переходит к Покупателю с момента передачи Товара (если иное не следует
          из закона или существа обязательства).
        </Text>

        <Title order={3} style={{ color: colors.textPrimary }}>
          6. Возврат, обмен и отказ от товара
        </Title>
        <Text c={colors.textSecondary} style={{ lineHeight: 1.8 }}>
          Возврат и обмен товаров, а также отказ от товара при дистанционной продаже осуществляются в соответствии с
          Законом РФ № 2300‑1 «О защите прав потребителей» и Постановлением Правительства РФ № 2463.
        </Text>
        <List spacing="xs" c={colors.textSecondary}>
          <List.Item>
            Покупатель вправе отказаться от товара до его передачи, а после передачи — в сроки и порядке,
            предусмотренных законодательством РФ для дистанционной торговли.
          </List.Item>
          <List.Item>
            Требования по товару ненадлежащего качества рассматриваются в порядке, предусмотренном законодательством РФ.
          </List.Item>
          <List.Item>
            Возврат денежных средств производится тем же способом, которым была произведена оплата, если иное не
            установлено законом или соглашением сторон.
          </List.Item>
        </List>

        <Title order={3} style={{ color: colors.textPrimary }}>
          7. Персональные данные
        </Title>
        <Text c={colors.textSecondary} style={{ lineHeight: 1.8 }}>
          Персональные данные Покупателя обрабатываются для заключения и исполнения договора, доставки, возврата,
          направления уведомлений и выполнения обязанностей Продавца. Подробные условия изложены в
          {' '}
          <Anchor component={Link} href="/privacy" style={{ color: colors.accent, fontWeight: 600 }}>
            Политике конфиденциальности
          </Anchor>
          .
        </Text>

        <Title order={3} style={{ color: colors.textPrimary }}>
          8. Ответственность сторон
        </Title>
        <Text c={colors.textSecondary} style={{ lineHeight: 1.8 }}>
          Стороны несут ответственность в соответствии с законодательством РФ. Продавец не отвечает за невозможность
          исполнения обязательств вследствие обстоятельств непреодолимой силы (форс‑мажор).
        </Text>

        <Title order={3} style={{ color: colors.textPrimary }}>
          9. Порядок рассмотрения претензий
        </Title>
        <Text c={colors.textSecondary} style={{ lineHeight: 1.8 }}>
          Претензии направляются на e‑mail: <b>rbiter@localtea.ru</b>.
          Сроки рассмотрения претензий определяются законодательством РФ.
        </Text>

        <Title order={3} style={{ color: colors.textPrimary }}>
          10. Заключительные положения
        </Title>
        <Text c={colors.textSecondary} style={{ lineHeight: 1.8 }}>
          К настоящей оферте применяется право Российской Федерации. Недействительность отдельного положения оферты не
          влияет на действительность остальных положений.
        </Text>

        <Title order={3} style={{ color: colors.textPrimary }}>
          11. Реквизиты продавца
        </Title>
        <List spacing="xs" c={colors.textSecondary}>
          <List.Item>Продавец: <b>Вальтер Владислав Сергеевич</b> (самозанятый, НПД)</List.Item>
          <List.Item>ИНН: <b>502014830390</b></List.Item>
          <List.Item>E‑mail: <b>rbiter@localtea.ru</b></List.Item>
        </List>

        <Divider my="sm" style={{ borderColor: 'rgba(212,137,79,0.12)' }} />

        <Text size="sm" c={colors.textMuted}>
          См. также:{' '}
          <Anchor component={Link} href="/terms" style={{ color: colors.accent, fontWeight: 600 }}>
            Условия использования
          </Anchor>
          .
        </Text>
      </Stack>
    </Container>
  );
}
