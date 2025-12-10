# USER_FRONTEND — Компоненты

## Структура компонентов

```
src/components/
├── layout/                 # Layout компоненты
│   ├── Header.tsx          # Шапка сайта
│   ├── Footer.tsx          # Подвал
│   └── Navigation.tsx      # Навигация
│
├── catalog/               # Компоненты каталога
│   ├── ProductCard.tsx    # Карточка товара
│   ├── ProductGrid.tsx    # Сетка товаров
│   └── Filters.tsx        # Фильтры
│
├── blog/                  # Компоненты блога
│   ├── ArticleCard.tsx    # Карточка статьи
│   └── ArticleList.tsx    # Список статей
│
├── DeliveryDataBanner.tsx      # Баннер о заполнении данных доставки
├── NotificationsContainer.tsx  # Контейнер уведомлений Mantine
└── PhoneVerificationModal.tsx  # Модал верификации телефона
```

---

## Основные компоненты

### DeliveryDataBanner

**Назначение**: Показывает баннер с предложением заполнить данные для доставки (адрес, индекс, телефон).

**Расположение**: `src/components/DeliveryDataBanner.tsx`

**Условия отображения**:
- Пользователь авторизован
- Не заполнен адрес ИЛИ не заполнен индекс ИЛИ не заполнен/не верифицирован телефон

**Пример использования**:
```tsx
import DeliveryDataBanner from '@/components/DeliveryDataBanner';

<DeliveryDataBanner />
```

---

### PhoneVerificationModal

**Назначение**: Модальное окно для верификации номера телефона через звонок.

**Расположение**: `src/components/PhoneVerificationModal.tsx`

**Пропсы**:
```typescript
interface Props {
  opened: boolean;
  onClose: () => void;
}
```

**Функционал**:
1. Инициирует звонок на номер пользователя.
2. Показывает маскированный номер.
3. Автоматически проверяет статус верификации.
4. Показывает результат (успех/ошибка).

**Пример использования**:
```tsx
const [modalOpen, setModalOpen] = useState(false);

<PhoneVerificationModal 
  opened={modalOpen} 
  onClose={() => setModalOpen(false)} 
/>
```

---

### NotificationsContainer

**Назначение**: Контейнер для Mantine уведомлений с кастомной позицией.

**Расположение**: `src/components/NotificationsContainer.tsx`

**Пример использования**:
```tsx
// В layout.tsx или providers.tsx
import NotificationsContainer from '@/components/NotificationsContainer';

<NotificationsContainer />
```

**Показ уведомлений**:
```tsx
import { notifications } from '@mantine/notifications';

notifications.show({
  title: 'Успешно',
  message: 'Товар добавлен в корзину',
  color: 'green',
});
```

---

## Layout компоненты

### Header

**Функционал**:
- Логотип с ссылкой на главную
- Основная навигация (Каталог, Блог, О нас)
- Поиск товаров
- Иконка корзины с количеством товаров
- Кнопка авторизации / аватар пользователя
- Мобильное меню (бургер)

### Footer

**Секции**:
- Контактная информация
- Ссылки навигации
- Социальные сети
- Копирайт

---

## Компоненты каталога

### ProductCard

**Пропсы**:
```typescript
interface Props {
  product: {
    id: number;
    title: string;
    slug: string;
    images: Array<{ url: string; is_main: boolean }>;
    skus: Array<{
      id: number;
      weight: string;
      price_cents: number;
      discount_cents: number;
    }>;
  };
}
```

**Функционал**:
- Изображение товара
- Название с ссылкой на карточку
- Цена (минимальная среди SKU)
- Скидка (если есть)
- Кнопка "В корзину"

### ProductGrid

**Пропсы**:
```typescript
interface Props {
  products: Product[];
  loading?: boolean;
}
```

**Функционал**:
- Адаптивная сетка карточек товаров
- Skeleton-загрузка

---

## Страничные компоненты

### Корзина и Checkout (`/cart`)

**Состояние (Stepper)**:
1. **Корзина** — список товаров, изменение количества
2. **Доставка** — выбор способа:
   - Самовывоз
   - Почта России (расчёт по индексу)
3. **Контакты** — ввод данных получателя

### Профиль (`/profile`)

**Вкладки (Tabs)**:
1. **Профиль** — основная информация, аватар
2. **Заказы** — история с фильтрацией по статусу
3. **Избранное** — сохранённые товары
4. **Настройки** — редактирование данных

---

## Стилизация

### Тема Mantine

**Расположение**: `src/lib/theme.ts`

**Основные цвета**:
```typescript
const theme = createTheme({
  primaryColor: 'tea',
  colors: {
    tea: [
      '#fff4e6', '#ffe8cc', '#ffd8a8', '#ffc078', 
      '#ffa94d', '#ff922b', '#fd7e14', '#e67700',
      '#d4894f', '#8b5a2b'  // основные оттенки
    ],
  },
  fontFamily: 'Georgia, serif',
});
```

### Глобальные стили

**Расположение**: `src/app/globals.css`

- Тёмная тема по умолчанию
- Кастомные градиенты для карточек
- Стили для кнопок и форм
