# USER_FRONTEND — Техническое задание

## Оглавление

1. [Общие сведения](#общие-сведения)
2. [Архитектура и стек](#архитектура-и-стек)
3. [Структура приложения](#структура-приложения)
4. [Компоненты и страницы](#компоненты-и-страницы)
5. [Пользовательские сценарии](#пользовательские-сценарии)
6. [Дизайн и UX](#дизайн-и-ux)
7. [API интеграция](#api-интеграция)
8. [Состояние и управление данными](#состояние-и-управление-данными)

---

## Общие сведения

### Назначение

`USER_FRONTEND` — публичное веб-приложение для онлайн-магазина локального чая. Позволяет клиентам:
- Просматривать каталог чайных товаров по категориям
- Читать описания и характеристики товаров
- Добавлять товары в корзину
- Оформлять заказы
- Читать блог с информацией о чае

### Технические требования

| Параметр | Значение |
|----------|---------|
| Framework | Next.js 16+ (App Router) |
| Язык | TypeScript |
| UI компоненты | Mantine v8+ |
| HTTP клиент | axios + openapi-typescript-codegen |
| Управление состоянием | React Query (TanStack Query) |
| Стили | CSS modules + Mantine theming |
| Node.js версия | 20+ |
| Развёртывание | Docker контейнер на порту 3000 |
| Production сборка | Next.js Standalone |

### URL и доступ

```
Development: http://localhost:3000
Production:  https://localtea.ru
API:         https://api.localtea.ru/api/v1
```

---

## Архитектура и стек

### Почему Mantine?

**Да, Mantine — отличная идея** для этого проекта:

#### Преимущества
✅ **UI компоненты премиум качества** — готовые, стилизованные, доступные
✅ **Кастомизация** — легко менять цвета, размеры, шрифты
✅ **Реактивный дизайн** — встроенная поддержка responsive layout
✅ **Accessibility** — компоненты соответствуют WCAG
✅ **TypeScript** — полная поддержка типов
✅ **Hooks** — удобные хуки для работы с медиа, модальными окнами и т.д.
✅ **Быстрая разработка** — не нужно писать CSS с нуля
✅ **Тёмная тема** — встроенная поддержка light/dark mode

#### Компоненты Mantine для этого проекта
- `Card` — карточки товаров, блога
- `Grid` — сетка товаров
- `Tabs` / `Stepper` — шаги оформления заказа
- `Modal` / `Drawer` — модальные окна (фильтры, корзина)
- `Button` — кнопки действий
- `TextInput`, `Select` — формы заказа
- `Badge` — теги, категории
- `Image` — оптимизированные изображения
- `Carousel` — галерея товаров
- `Pagination` — навигация по товарам
- `Group`, `Stack` — макеты и выравнивание
- `Notification` / `Toast` — уведомления при добавлении в корзину

---

## Структура приложения

```
src/
├── app/                           # Next.js App Router
│   ├── layout.tsx                 # Корневой лейаут (header, footer)
│   ├── page.tsx                   # Главная страница
│   ├── (auth)/                    # Auth route group (без лейаута)
│   │   ├── login/
│   │   │   └── page.tsx           # Страница входа
│   │   ├── register/
│   │   │   └── page.tsx           # Страница регистрации
│   │   └── forgot-password/
│   │       └── page.tsx           # Восстановление пароля
│   ├── categories/
│   │   └── page.tsx               # Страница выбора категорий
│   ├── catalog/
│   │   ├── page.tsx               # Товары выбранной категории
│   │   └── [slug]/
│   │       └── page.tsx           # Страница товара
│   ├── cart/
│   │   └── page.tsx               # Корзина
│   ├── checkout/
│   │   └── page.tsx               # Оформление заказа
│   ├── orders/
│   │   └── [id]/page.tsx          # Статус заказа
│   ├── blog/
│   │   ├── page.tsx               # Список статей блога
│   │   └── [slug]/
│   │       └── page.tsx           # Статья блога
│   └── account/
│       ├── profile/page.tsx       # Профиль пользователя
│       └── orders/page.tsx        # История заказов
│
├── components/                    # Переиспользуемые компоненты
│   ├── layout/
│   │   ├── Header.tsx             # Шапка с логотипом, меню, корзиной
│   │   ├── Footer.tsx             # Подвал
│   │   └── MainLayout.tsx         # Главный лейаут (wrapper)
│   ├── catalog/
│   │   ├── CategoryBanner.tsx      # Баннер категории (красивая карточка)
│   │   ├── CategoryGrid.tsx        # Сетка категорий
│   │   ├── ProductCard.tsx         # Карточка товара (превью)
│   │   ├── ProductGallery.tsx      # Галерея товара
│   │   └── ProductFilters.tsx      # Фильтры (цена, вес, и т.д.)
│   ├── cart/
│   │   ├── CartIcon.tsx            # Иконка корзины в header
│   │   ├── CartDrawer.tsx          # Выдвижная корзина
│   │   └── CartItem.tsx            # Товар в корзине
│   ├── auth/
│   │   ├── LoginForm.tsx           # Форма входа
│   │   ├── RegisterForm.tsx        # Форма регистрации
│   │   └── AuthGuard.tsx           # Защита приватных маршрутов
│   ├── blog/
│   │   ├── ArticleCard.tsx         # Карточка статьи
│   │   └── ArticleContent.tsx      # Контент статьи
│   └── shared/
│       ├── LoadingSpinner.tsx      # Лоадер
│       ├── EmptyState.tsx          # Пустое состояние
│       └── ErrorBoundary.tsx       # Обработка ошибок
│
├── features/                      # Бизнес-логика по функциям
│   ├── catalog/
│   │   ├── api.ts                 # API функции каталога
│   │   ├── hooks.ts               # Custom хуки (useProducts, useCategories)
│   │   ├── types.ts               # TypeScript типы
│   │   └── store.ts               # Zustand/Context для состояния
│   ├── cart/
│   │   ├── hooks.ts               # useCart, useAddToCart
│   │   ├── types.ts
│   │   └── store.ts               # CartStore
│   ├── auth/
│   │   ├── hooks.ts               # useAuth, useLogin, useRegister
│   │   └── types.ts
│   └── orders/
│       ├── api.ts
│       ├── hooks.ts
│       └── types.ts
│
├── lib/
│   ├── api-client.ts              # Инициализация OpenAPI клиента
│   ├── axios.ts                   # Axios инстанс с interceptors
│   ├── query-client.ts            # React Query конфигурация
│   └── hooks/
│       ├── useAsync.ts
│       └── useDebounce.ts
│
└── styles/
    ├── globals.css                # Глобальные стили
    └── theme.ts                   # Mantine кастомная тема
```

---

## Компоненты и страницы

### 1. Главная страница (`/`)

**Что отображается:**
- Красивый hero баннер с логотипом и слоганом LocalTea
- Кнопка "Перейти в каталог"
- Блок "Почему выбирают LocalTea?" с преимуществами:
  - ✨ Премиум качество чая
  - 🚚 Быстрая доставка
  - 💰 Справедливые цены
- Каруселль популярных товаров
- Последние статьи блога
- Подписка на новости (email)

**Компоненты:**
```tsx
<HeroBanner />
<FeaturesSection />
<ProductCarousel products={popularProducts} />
<BlogPreview articles={latestArticles} />
<NewsletterSignup />
```

**Поведение:**
- Страница загружается без обращения к API (может быть статическая часть)
- Популярные товары и блог загружаются параллельно

---

### 2. Страница выбора категорий (`/categories`)

**Дизайн и поведение:**

#### Layout:
```
┌─────────────────────────────────────────┐
│          ВЫБЕРИ КАТЕГОРИЮ ЧАЯ          │
│    Исследуй наш полный ассортимент     │
└─────────────────────────────────────────┘
│                                         │
│ ┌─────────────┐  ┌─────────────┐      │
│ │  Чёрный чай │  │  Зелёный    │      │
│ │             │  │   чай       │      │
│ │  12 товаров │  │  18 товаров │      │
│ └─────────────┘  └─────────────┘      │
│                                         │
│ ┌─────────────┐  ┌─────────────┐      │
│ │ Белый чай   │  │ Фруктовый   │      │
│ │             │  │   чай       │      │
│ │  8 товаров  │  │  15 товаров │      │
│ └─────────────┘  └─────────────┘      │
```

**Каждая категория — интерактивный баннер:**
- Красивый градиентный фон (разный для каждой категории)
- Иконка/иллюстрация чая
- Название категории (крупный шрифт)
- Количество товаров
- При наведении: анимация увеличения, изменение тени
- При клике: переход на `/catalog?category={id}` с анимацией

**Компоненты:**
```tsx
<CategoryGrid>
  {categories.map(cat => (
    <CategoryBanner
      key={cat.id}
      category={cat}
      onClick={() => router.push(`/catalog?category=${cat.id}`)}
    />
  ))}
</CategoryGrid>
```

**API запрос:**
```typescript
useQuery(['categories'], () => catalogApi.getCategories())
```

---

### 3. Страница каталога товаров (`/catalog?category={id}`)

**Дизайн:**

```
┌──────────────────────────────────────────────────┐
│        ТОВАРЫ КАТЕГОРИИ: ЧЁРНЫЙ ЧАЙ            │
│     Выбрано: Чёрный чай | Все | Сортировка    │
└──────────────────────────────────────────────────┘

[Плавная анимация появления товаров снизу]

┌─────────────────────────────────────────────────┐
│   ТОВАР 1        │   ТОВАР 2        │   ТОВАР 3 │
│ ┌──────────────┐ │ ┌──────────────┐ │ ┌──────┐ │
│ │   [Фото]     │ │ │   [Фото]     │ │ │ .... │ │
│ │              │ │ │              │ │ │      │ │
│ │ Название     │ │ │ Название     │ │ │      │ │
│ │ ⭐ 4.8 / 100 │ │ │ ⭐ 4.5 / 100 │ │ │      │ │
│ │ 299₽ - 1299₽ │ │ │ 199₽ - 899₽  │ │ │      │ │
│ │              │ │ │              │ │ │      │ │
│ │ [В корзину] │ │ │ [В корзину] │ │ │      │ │
│ └──────────────┘ │ └──────────────┘ │ └──────┘ │
└─────────────────────────────────────────────────┘

[Пагинация внизу]
```

**Функциональность:**
- Загрузка товаров выбранной категории
- Сортировка:
  - По популярности (по умолчанию)
  - По цене (возрастание/убывание)
  - По новизне
  - По рейтингу
- Фильтры (опционально, в Drawer):
  - Диапазон цены (slider)
  - Вес товара
  - Наличие
- Поиск в рамках категории (поле поиска в header)
- Бесконечная прокрутка ИЛИ пагинация

**Карточка товара (ProductCard):**
```tsx
<Card 
  withBorder 
  radius="md" 
  className={styles.productCard}
  onClick={() => router.push(`/catalog/${product.slug}`)}
>
  <Card.Section>
    <Image 
      src={product.mainImage} 
      height={200} 
      alt={product.title}
    />
  </Card.Section>
  
  <Group justify="space-between" mt="md">
    <Text fw={500}>{product.title}</Text>
    <Badge>{product.category}</Badge>
  </Group>
  
  <Rating value={product.rating} readOnly />
  
  <Group justify="space-between" mt="md">
    <Text>{product.minPrice}₽ - {product.maxPrice}₽</Text>
    <Button onClick={(e) => {
      e.stopPropagation();
      addToCart(product);
    }}>
      В корзину
    </Button>
  </Group>
</Card>
```

**API запросы:**
```typescript
// Загрузка товаров категории
useQuery(
  ['products', categoryId, sort, page],
  () => catalogApi.getProducts({ categoryId, sort, page, limit: 12 })
)

// Загрузка категорий в sidebar (опционально)
useQuery(['categories'], () => catalogApi.getCategories())
```

---

### 4. Страница товара (`/catalog/[slug]`)

**Дизайн (2-колончный layout):**

```
┌─────────────────────────────────────────────┐
│ ← Назад в каталог                           │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Галерея [1-4 фото]  │  Информация товара   │
│                     │                      │
│ ┌───────────────┐   │ Премиум чёрный чай   │
│ │               │   │ от категории Улун   │
│ │   [Большое    │   │                      │
│ │    фото]      │   │ ⭐ 4.8 / 100 отзыв  │
│ │               │   │                      │
│ └───────────────┘   │ ──────────────────   │
│                     │                      │
│ [Миниатюры]         │ Выберите вес:        │
│ [1][2][3][4]        │ [50г] [100г] [250г]  │
│                     │                      │
│                     │ Цена:  299₽ → 1299₽ │
│                     │ В наличии: 45 шт    │
│                     │                      │
│                     │ [+ В корзину] [♡]   │
│                     │ [Описание▼]          │
│                     │ [Характеристики▼]   │
│                     │ [Отзывы▼]           │
└─────────────────────────────────────────────┘

[Развёрнутые секции]

Описание:
Lorem ipsum dolor sit amet...

Характеристики:
- Страна: Китай
- Чай: Чёрный (Red)
- Время ферментации: 60 часов
- Оптимальная температура: 90-95°C
- ...

Рекомендуемые товары:
[Товар 1] [Товар 2] [Товар 3]
```

**Компоненты:**
```tsx
<ProductGallery images={product.images} />

<Group direction="column" spacing="lg">
  <Title order={1}>{product.title}</Title>
  
  <Rating value={product.rating} />
  
  <SKUSelector 
    skus={product.skus}
    onSelect={setSKU}
  />
  
  <Text>{product.price}₽</Text>
  
  <Button 
    size="lg" 
    onClick={() => addToCart(selectedSKU)}
  >
    В корзину
  </Button>
  
  <Accordion>
    <AccordionItem title="Описание">
      {product.description}
    </AccordionItem>
    <AccordionItem title="Характеристики">
      <SpecsList specs={product.specs} />
    </AccordionItem>
    <AccordionItem title="Отзывы">
      <ReviewsList reviews={product.reviews} />
    </AccordionItem>
  </Accordion>
</Group>

<RelatedProducts products={related} />
```

**Логика выбора размера (SKU):**
1. SKU (Stock Keeping Unit) = вариант товара (50g, 100g, 250g)
2. При выборе SKU меняется цена и доступность
3. В корзину добавляется конкретный SKU (не товар)

**API запросы:**
```typescript
// Получить товар по slug
useQuery(['product', slug], () => catalogApi.getProductBySlug(slug))

// Получить похожие товары
useQuery(['relatedProducts', productId], 
  () => catalogApi.getRelatedProducts(productId)
)
```

---

### 4. Вход (Авторизация) (`/login`)

**Дизайн:**

```
┌──────────────────────────────────────────────┐
│                                              │
│            ВХОД В АККАУНТ                    │
│         Рады видеть вас снова! ☕           │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│ Email                                        │
│ [________________________]                  │
│                                              │
│ Пароль                                       │
│ [________________________] [👁 Показать]    │
│                                              │
│ [Помню пароль]  [Забыли пароль?]           │
│                                              │
│ [    ВОЙТИ    ]                             │
│                                              │
│ ────────────────────────────────            │
│                                              │
│ Нет аккаунта? [Зарегистрироваться]         │
│                                              │
└──────────────────────────────────────────────┘
```

**Функциональность:**
- Email поле с валидацией
- Пароль с toggle видимости
- Чекбокс "Помню пароль" (сохранение cookies)
- Ссылка "Забыли пароль?" → переход на `/forgot-password`
- Кнопка "Войти" (с лоадером при отправке)
- Ссылка "Зарегистрироваться" → переход на `/register`
- Ошибки (неправильный пароль, юзер не найден) в Alert

**Компоненты:**
```tsx
<Stack spacing="lg">
  <Title order={2}>Вход в аккаунт</Title>
  <Text c="dimmed">Рады видеть вас снова! ☕</Text>
  
  <form onSubmit={handleLogin}>
    <TextInput
      label="Email"
      placeholder="your@email.com"
      value={email}
      onChange={(e) => setEmail(e.currentTarget.value)}
      error={errors.email}
      required
    />
    
    <PasswordInput
      label="Пароль"
      placeholder="••••••••"
      value={password}
      onChange={(e) => setPassword(e.currentTarget.value)}
      error={errors.password}
      required
      mt="md"
    />
    
    <Group justify="space-between" mt="md">
      <Checkbox label="Помню пароль" {...form.getInputProps('remember')} />
      <Anchor component={Link} href="/forgot-password" size="sm">
        Забыли пароль?
      </Anchor>
    </Group>
    
    {error && <Alert color="red" mt="md">{error}</Alert>}
    
    <Button fullWidth mt="xl" loading={loading} type="submit">
      Войти
    </Button>
  </form>
  
  <Text align="center">
    Нет аккаунта?{' '}
    <Anchor component={Link} href="/register">
      Зарегистрироваться
    </Anchor>
  </Text>
</Stack>
```

**API запросы:**
```typescript
// POST /api/v1/users/login
async function login(email: string, password: string) {
  const response = await ApiService.login({ email, password });
  // response: { accessToken, refreshToken, user }
  localStorage.setItem('accessToken', response.accessToken);
  localStorage.setItem('refreshToken', response.refreshToken);
  return response.user;
}
```

---

### 5. Регистрация (`/register`)

**Дизайн:**

```
┌──────────────────────────────────────────────┐
│                                              │
│        СОЗДАЙТЕ НОВЫЙ АККАУНТ                │
│      Присоединитесь к нам и享受 чай! ☕    │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│ Имя                                          │
│ [________________________]                  │
│                                              │
│ Фамилия                                      │
│ [________________________]                  │
│                                              │
│ Email                                        │
│ [________________________]                  │
│                                              │
│ Пароль (минимум 8 символов)                 │
│ [________________________] [👁 Показать]    │
│ • Минимум 8 символов ✓                      │
│ • Содержит прописные буквы ✗                │
│ • Содержит цифры ✗                          │
│                                              │
│ Подтвердите пароль                          │
│ [________________________]                  │
│                                              │
│ [✓] Я согласен с условиями использования   │
│                                              │
│ [  СОЗДАТЬ АККАУНТ  ]                       │
│                                              │
│ ────────────────────────────────            │
│                                              │
│ Уже есть аккаунт? [Войти]                   │
│                                              │
└──────────────────────────────────────────────┘
```

**Функциональность:**
- Валидация в реальном времени (Real-time validation)
- Проверка требований к паролю (strength meter)
- Проверка что оба пароля совпадают
- Email валидация (проверка на уникальность ✓)
- Чекбокс согласия с условиями (обязательный)
- Ссылка на условия использования
- Прогресс создания аккаунта (лоадер)
- Ошибки (email занят, пароль слаб)

**Компоненты:**
```tsx
<Stack spacing="lg">
  <Title order={2}>Создайте новый аккаунт</Title>
  <Text c="dimmed">Присоединитесь к нам и享受 чай! ☕</Text>
  
  <form onSubmit={handleRegister}>
    <Group grow>
      <TextInput
        label="Имя"
        placeholder="John"
        {...form.getInputProps('firstName')}
        error={errors.firstName}
      />
      <TextInput
        label="Фамилия"
        placeholder="Doe"
        {...form.getInputProps('lastName')}
        error={errors.lastName}
      />
    </Group>
    
    <TextInput
      label="Email"
      placeholder="your@email.com"
      {...form.getInputProps('email')}
      error={errors.email}
      mt="md"
      required
    />
    
    <PasswordInput
      label="Пароль"
      placeholder="••••••••"
      {...form.getInputProps('password')}
      mt="md"
      required
    />
    
    <PasswordRequirements password={form.values.password} />
    
    <PasswordInput
      label="Подтвердите пароль"
      placeholder="••••••••"
      {...form.getInputProps('confirmPassword')}
      error={errors.confirmPassword}
      mt="md"
      required
    />
    
    <Checkbox
      label="Я согласен с условиями использования"
      {...form.getInputProps('terms', { type: 'checkbox' })}
      error={errors.terms}
      mt="md"
    />
    
    {error && <Alert color="red" mt="md">{error}</Alert>}
    
    <Button fullWidth mt="xl" loading={loading} type="submit">
      Создать аккаунт
    </Button>
  </form>
  
  <Text align="center">
    Уже есть аккаунт?{' '}
    <Anchor component={Link} href="/login">
      Войти
    </Anchor>
  </Text>
</Stack>
```

**Компонент валидации пароля:**
```tsx
interface PasswordRequirement {
  re: RegExp;
  label: string;
}

const requirements: PasswordRequirement[] = [
  { re: /[0-9]/, label: 'Содержит минимум одну цифру' },
  { re: /[a-z]/, label: 'Содержит минимум одну строчную букву' },
  { re: /[A-Z]/, label: 'Содержит минимум одну заглавную букву' },
  { re: /.{8,}/, label: 'Минимум 8 символов' },
];

function PasswordRequirements({ password }: { password: string }) {
  return (
    <Stack gap={5} mt="md">
      {requirements.map((requirement) => (
        <Group key={requirement.label} spacing="xs">
          <ThemeIcon
            color={requirement.re.test(password) ? 'teal' : 'gray'}
            radius="xl"
            size="sm"
          >
            {requirement.re.test(password) ? <IconCheck /> : <IconX />}
          </ThemeIcon>
          <Text size="sm">{requirement.label}</Text>
        </Group>
      ))}
    </Stack>
  );
}
```

**API запросы:**
```typescript
// POST /api/v1/users/register
async function register(data: RegisterRequest) {
  const response = await ApiService.register(data);
  // response: { accessToken, refreshToken, user }
  localStorage.setItem('accessToken', response.accessToken);
  localStorage.setItem('refreshToken', response.refreshToken);
  return response.user;
}
```

---

### 6. Восстановление пароля (`/forgot-password`)

**Дизайн:**

```
┌──────────────────────────────────────────────┐
│                                              │
│      ВОССТАНОВЛЕНИЕ ПАРОЛЯ                   │
│   Введите email для восстановления доступа  │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│ Email                                        │
│ [________________________]                  │
│                                              │
│ [  ОТПРАВИТЬ КОД  ]                         │
│                                              │
│ ────────────────────────────────            │
│                                              │
│ Помните пароль? [Войти]                     │
│                                              │
└──────────────────────────────────────────────┘

[После отправки кода]

┌──────────────────────────────────────────────┐
│                                              │
│      ВВЕДИТЕ КОД ИЗ EMAIL                    │
│   Мы отправили код подтверждения на        │
│   your@email.com                            │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│ Код (6 цифр)                                │
│ [_] [_] [_] [_] [_] [_]                    │
│                                              │
│ Не получили код? [Отправить снова]         │
│                                              │
│ [  ДАЛЕЕ  ]                                 │
│                                              │
│ ────────────────────────────────            │
│ [← Назад на вход]                           │
│                                              │
└──────────────────────────────────────────────┘

[После верификации кода]

┌──────────────────────────────────────────────┐
│                                              │
│      НОВЫЙ ПАРОЛЬ                            │
│   Придумайте надёжный пароль                │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│ Новый пароль                                │
│ [________________________]                  │
│                                              │
│ Подтвердите пароль                          │
│ [________________________]                  │
│                                              │
│ [  УСТАНОВИТЬ ПАРОЛЬ  ]                     │
│                                              │
└──────────────────────────────────────────────┘
```

**Функциональность:**
- Шаг 1: Ввод email, отправка кода на почту
- Шаг 2: Ввод 6-значного кода из email
- Шаг 3: Установка нового пароля
- После успеха: редирект на `/login`

**API запросы:**
```typescript
// POST /api/v1/users/forgot-password
requestPasswordReset(email: string) → { message: string }

// POST /api/v1/users/verify-reset-code
verifyResetCode(email: string, code: string) → { token: string }

// POST /api/v1/users/reset-password
resetPassword(token: string, newPassword: string) → { message: string }
```

---

### 7. Корзина (`/cart`)

**Два режима:**

#### Режим 1: Выдвижной drawer (Sidebar Cart)
- Открывается по клику на иконку корзины в header
- Показывает список товаров
- Можно удалять, менять количество
- Кнопка "Оформить заказ" ведёт на `/checkout`
- Сумма заказа видна внизу

#### Режим 2: Отдельная страница (`/cart`)
```
┌────────────────────────────────────────────┐
│            МОЯ КОРЗИНА                     │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ ТОВАР 1              │ КОЛ-ВО │ ЦЕНА      │
│ [Фото] Чай чёрный   │  [1-] │ 299₽     │
│ 50г, Кол-во: 1      │        │          │
│ [Удалить] [Сохранить на потом]           │
├────────────────────────────────────────────┤
│ ТОВАР 2              │ КОЛ-ВО │ ЦЕНА      │
│ [Фото] Чай зелёный  │  [1-] │ 399₽     │
│ 100г, Кол-во: 1     │        │          │
│ [Удалить] [Сохранить на потом]           │
├────────────────────────────────────────────┤
│                              Сумма: 698₽  │
│                    [Оформить заказ ›]    │
└────────────────────────────────────────────┘

Рекомендуемые товары:
[Товар 1] [Товар 2]
```

**Компоненты:**
```tsx
<CartItem>
  <Image src={item.image} />
  <Group>
    <Text>{item.title}</Text>
    <Badge>{item.sku}</Badge>
  </Group>
  
  <NumberInput 
    value={item.quantity}
    onChange={updateQuantity}
  />
  
  <Text>{item.price * item.quantity}₽</Text>
  
  <Button variant="subtle" onClick={removeItem}>
    Удалить
  </Button>
</CartItem>
```

**API / State:**
```typescript
// Zustand Store для корзины
const useCartStore = create((set) => ({
  items: [],
  addItem: (product) => {...},
  removeItem: (id) => {...},
  updateQuantity: (id, qty) => {...},
  clear: () => {...},
}))
```

---

### 6. Оформление заказа (`/checkout`)

**Stepper (шаги оформления):**

```
Шаг 1: Доставка
Шаг 2: Оплата
Шаг 3: Подтверждение
```

#### Шаг 1: Доставка
```
Контактная информация
[Имя*] [Фамилия*]
[Email*] [Телефон*]

Адрес доставки
[Город*] [Улица*]
[Дом*] [Квартира]

Вид доставки
○ Почта России (7-14 дней) — 300₽
○ Курьер (1-3 дня) — 500₽
○ Самовывоз (сегодня) — 0₽
```

#### Шаг 2: Оплата
```
Способ оплаты
○ Карта (Yookassa)
○ Яндекс.Касса
○ Сбербанк онлайн
○ Наличные при получении

[При выборе карты — редирект в платёжную систему]
```

#### Шаг 3: Подтверждение
```
Заказ создан успешно!
Номер заказа: #12345
Сумма: 1498₽
Статус: Ожидание оплаты

Ваш заказ:
- Чай чёрный (50г) x1 = 299₽
- Чай зелёный (100g) x1 = 399₽
- Доставка (Курьер) = 500₽

Отследить заказ: [Перейти в личный кабинет]
```

**Компоненты:**
```tsx
<Stepper active={step} onStepClick={setStep}>
  <Stepper.Step label="Доставка" description="Адрес">
    <DeliveryForm onNext={nextStep} />
  </Stepper.Step>
  
  <Stepper.Step label="Оплата" description="Способ">
    <PaymentForm onNext={nextStep} />
  </Stepper.Step>
  
  <Stepper.Step label="Готово" description="Подтверждение">
    <OrderConfirmation order={order} />
  </Stepper.Step>
</Stepper>
```

**API:**
```typescript
// POST /api/v1/orders/create
createOrder(orderData) → Order

// POST /api/v1/orders/{id}/pay
initiatePayment(orderId, amount) → PaymentLink
```

---

### 7. История заказов (`/account/orders`)

```
┌────────────────────────────────────────────┐
│        МОИ ЗАКАЗЫ (3 активных)             │
└────────────────────────────────────────────┘

Фильтр: [Все] [Ожидание] [В пути] [Доставлено]

┌────────────────────────────────────────────┐
│ Заказ #12345                               │
│ 15 ноября 2024 — 1498₽                    │
│                                            │
│ Статус: 🟡 В пути                          │
│ Дата доставки: 17 ноября                  │
│ Доставка: Курьер (500₽)                   │
│                                            │
│ Товары: 2 шт                               │
│ [Показать детали ▼]                       │
│                                            │
│ [Отследить] [Повторить заказ]            │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ Заказ #12344                               │
│ 10 ноября 2024 — 899₽                     │
│                                            │
│ Статус: ✅ Доставлено                      │
│ Доставлено: 12 ноября                     │
│                                            │
│ Товары: 1 шт                               │
│ [Показать детали ▼]                       │
│                                            │
│ [Повторить заказ] [Оставить отзыв]       │
└────────────────────────────────────────────┘
```

**API:**
```typescript
// GET /api/v1/orders
getOrders(userId) → Order[]

// GET /api/v1/orders/{id}
getOrder(orderId) → Order
```

---

### 8. Блог (`/blog`)

```
┌────────────────────────────────────────────┐
│         БЛОГ: ВСЁ О ЧАЕ                    │
│    Статьи и советы от наших экспертов     │
└────────────────────────────────────────────┘

Фильтр: [Все] [Советы] [История] [Рецепты]

┌──────────────────────────────────────────────┐
│ [Фото] │ Как выбрать качественный чай?      │
│        │ 5 ноября 2024 · 5 мин чтения      │
│        │                                    │
│        │ Разбираемся в сортах, видах       │
│        │ ферментации и правилах хранения... │
│        │ [Читать далее]                    │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ [Фото] │ Семейные традиции чаепития        │
│        │ 30 октября 2024 · 8 мин чтения    │
│        │                                    │
│        │ История чайных традиций разных    │
│        │ культур и как их начать дома...   │
│        │ [Читать далее]                    │
└──────────────────────────────────────────────┘
```

**Страница статьи (`/blog/[slug]`):**
```
[← Назад в блог]

Как выбрать качественный чай?
Опубликовано: 5 ноября 2024 · 5 мин чтения
Автор: Сергей Иванов

[Большое фото статьи]

[Контент с форматированием HTML]
- Заголовки (h2, h3)
- Текст с выделением
- Списки
- Цитаты
- Встроенные изображения

[Рекомендуемые товары из статьи]
[Товар 1] [Товар 2]

[Другие статьи]
[Статья 1] [Статья 2] [Статья 3]
```

**API:**
```typescript
// GET /api/v1/blog
getBlogArticles(page, limit) → Article[]

// GET /api/v1/blog/{slug}
getArticle(slug) → Article

// POST /api/v1/blog/{id}/views
trackView(articleId)
```

---

### 9. Профиль пользователя (`/account/profile`)

```
┌────────────────────────────────────────────┐
│      МОЙ ПРОФИЛЬ                           │
└────────────────────────────────────────────┘

Личная информация
[Имя*] [Фамилия*]
[Email*] [Телефон*]
Дата рождения: [Дата]

[Обновить]

──────────────────────────────────────────

Адреса доставки
Основной адрес:
[Город] [Улица] [Дом]
[Изменить] [Удалить]

+ Добавить адрес

──────────────────────────────────────────

Безопасность
Пароль: ••••••••••
[Изменить пароль]

Подписки:
[✓] Новости и акции
[✓] Рекомендации товаров
[✗] Еженедельный дайджест

──────────────────────────────────────────
[Выход из аккаунта] [Удалить аккаунт]
```

---

## Пользовательские сценарии

### Сценарий 0: Регистрация и вход (новый пользователь)

```
1. Пользователь заходит на https://localtea.ru
   → Видит красивый hero баннер
   → В header справа видит кнопки "Вход" и "Регистрация"

2. Кликает "Регистрация"
   → Переходит на /register

3. Заполняет форму регистрации:
   - Имя: "Иван"
   - Фамилия: "Петров"
   - Email: "ivan@example.com"
   - Пароль: "SecurePass123" (видит зелёные галочки требований)
   - Подтверждение пароля: "SecurePass123"
   - Чекбокс согласия

4. Кликает "Создать аккаунт"
   → Система создаёт аккаунт
   → Автоматически логинит пользователя
   → Редирект на главную страницу (/)
   → В header справа вместо "Вход" теперь "Привет, Иван!" + иконка профиля

5. Кликает на иконку профиля в header
   → Видит выпадающее меню:
     - Мой профиль (/account/profile)
     - Мои заказы (/account/orders)
     - Выход

[АЛЬТЕРНАТИВА: Пользователь уже есть в системе]

1. На главной кликает "Вход"
   → Переходит на /login

2. Вводит:
   - Email: "ivan@example.com"
   - Пароль: "SecurePass123"
   - Чекбокс "Помню пароль"

3. Кликает "Войти"
   → Система проверяет credentials
   → Логинит пользователя
   → Сохраняет accessToken и refreshToken в localStorage
   → Редирект на главную (/), в header "Привет, Иван!"

[ЕСЛИ ЗАБЫЛ ПАРОЛЬ]

1. На странице /login кликает "Забыли пароль?"
   → Переходит на /forgot-password

2. Вводит email: "ivan@example.com"
   → Кликает "Отправить код"
   → Система отправляет письмо с кодом подтверждения

3. Вводит 6-значный код из письма
   → Кликает "Далее"
   → Переходит к вводу нового пароля

4. Вводит новый пароль (с проверкой требований)
   → Кликает "Установить пароль"
   → Система обновляет пароль
   → Редирект на /login
   → Может войти с новым паролем
```

### Сценарий 1: Первый визит и покупка (авторизованный)

```
1. Авторизованный пользователь заходит на https://localtea.ru
   → В header видит свой аватар и "Привет, Иван!"
   → Видит красивый hero баннер
   → Кликает "Перейти в каталог"

2. → Переходит на /categories
   → Видит 4+ красивых баннера категорий
   → Выбирает "Чёрный чай"
   → Баннер "поднимается" с анимацией

3. → Попадает на /catalog?category=black-tea
   → Видит товары, плавно выходящие снизу (intersection observer)
   → Наводит на карточку товара → работает hover эффект
   → Кликает на карточку

4. → Открывается /catalog/premium-black-tea
   → Видит галерею товара, описание, характеристики
   → Выбирает размер (50g, 100g)
   → Цена меняется в зависимости от выбора
   → Кликает "В корзину" → уведомление Toast "Товар добавлен!"

5. → Еще пару товаров добавляет
   → Кликает иконку корзины в header (видит счётчик "3")
   → Открывается CartDrawer с товарами
   → Может изменить количество или удалить товар
   → Кликает "Оформить заказ"

6. → Переходит на /checkout
   → Шаг 1: Данные доставки (уже заполнены из профиля)
   → Выбирает способ доставки
   → Кликает "Далее"

7. → Шаг 2: Выбирает способ оплаты
   → Выбирает "Карта"
   → Кликает "Оплатить"
   → Редирект в Yookassa → вводит данные карты → платит

8. → Возвращается на сайт
   → Шаг 3: Видит подтверждение заказа
   → Номер заказа: #12345
   → Кнопка "Отследить заказ"

9. → Может перейти в /account/orders
   → Видит свой заказ со статусом "Ожидание оплаты"
   → Спустя время статус меняется на "В пути"
   → Может кликнуть "Отследить" → открывает трекинг доставки
```
   → Шаг 1: Вводит данные доставки
   → Выбирает способ доставки
   → Кликает "Далее"

7. → Шаг 2: Выбирает способ оплаты
   → Выбирает "Карта"
   → Кликает "Оплатить"
   → Редирект в Yookassa → оплачивает

8. → Возвращается на сайт
   → Шаг 3: Видит подтверждение заказа
   → Номер заказа: #12345
   → Кнопка "Отследить заказ"

9. → Может перейти в /account/orders
   → Видит свой заказ со статусом "Ожидание оплаты"
   → Спустя время статус меняется на "В пути"
   → Может кликнуть "Отследить" → открывает трекинг
```

### Сценарий 2: Повторная покупка

```
1. Авторизованный пользователь заходит на сайт
   → В header видит "Привет, {Имя}!"
   → Может кликнуть на профиль

2. Кликает на /account/orders
   → Видит список прошлых заказов
   → Кликает "Повторить заказ" на старом заказе
   → Товары из старого заказа добавляются в новую корзину

3. → Может сразу перейти на /checkout
   → Адреса и способ доставки заполнены по умолчанию
   → Выбирает способ оплаты и оплачивает
```

### Сценарий 3: Поиск информации в блоге

```
1. Пользователь кликает на "Блог" в header
   → Переходит на /blog
   → Видит список последних статей

2. Кликает на статью "Как выбрать чай"
   → Открывается /blog/how-to-choose-tea
   → Видит полный контент статьи
   → В конце статьи видит "Рекомендуемые товары"
   → Может кликнуть на товар → переход на /catalog/{slug}
```

---

## Дизайн и UX

### Общие принципы

✨ **Минимализм** — чистый, светлый интерфейс с дыхающим пространством
🎨 **Цветовая гамма** — нежные, тёплые цвета, ассоциирующиеся с чаем
  - Основной: `#2D5016` (тёмно-зелёный)
  - Акцент: `#D4AF37` (золото)
  - Нейтральный: `#F5F1E8` (бежевый)
  - Текст: `#333333` (почти чёрный)

🎭 **Анимации** — мягкие, ненавязчивые
  - Появление товаров при скролле (intersection observer)
  - Hover эффекты на карточках
  - Плавные переходы между страницами
  - Scale и opacity анимации

♿ **Accessibility** — поддержка Mantine компонентов
  - ARIA labels
  - Keyboard navigation
  - Контраст 4.5:1 для текста

📱 **Responsive** — работает на мобильных, планшетах, десктопе
  - Mobile First подход
  - Стек для мобилей (вертикально)
  - Grid для десктопов

### Палитра Mantine Theme

```typescript
// theme.ts
export const theme: MantineThemeOverride = {
  colors: {
    brand: [
      '#f5f1e8',
      '#e8dcc5',
      '#d9c7a0',
      '#c8b183',
      '#b89a61',
      '#a8834f',
      '#988241',
      '#886d3a',
      '#765833',
      '#2d5016',
    ],
  },
  primaryColor: 'brand',
  primaryShade: 9,
  components: {
    Button: {
      defaultProps: {
        size: 'md',
      },
      styles: {
        root: {
          borderRadius: '8px',
        },
      },
    },
    Card: {
      defaultProps: {
        withBorder: true,
        radius: 'md',
      },
    },
  },
};
```

### Компоненты Mantine (используемые)

| Компонент | Применение | Пример |
|-----------|-----------|--------|
| `Button` | CTA кнопки | "В корзину", "Оформить заказ" |
| `Card` | Карточки товаров | ProductCard |
| `Image` | Изображения с lazy load | Товары, статьи |
| `Grid` | Макет сетки | Товары 3 в ряд |
| `Tabs` | Сортировка, фильтры | Вкладки категорий |
| `Modal` | Модальные окна | Выбор размера товара |
| `Drawer` | Выдвижная корзина | CartDrawer |
| `Stepper` | Шаги оформления | Checkout |
| `TextInput` | Текстовые поля | Форма заказа |
| `Select` | Выпадающие списки | Выбор города |
| `Badge` | Теги | Категория товара |
| `Group` | Горизонтальное выравнивание | Header layout |
| `Stack` | Вертикальное выравнивание | Card layout |
| `Pagination` | Навигация | Товары по 12 |
| `Carousel` | Галерея | Популярные товары |
| `Notification` | Уведомления | "Товар добавлен" |

### Типичный компонент Mantine

```tsx
import { Card, Image, Button, Group, Text, Badge, Rating } from '@mantine/core';
import styles from './ProductCard.module.css';

export function ProductCard({ product, onAddCart }) {
  return (
    <Card withBorder radius="md" className={styles.root}>
      <Card.Section>
        <Image 
          src={product.image} 
          height={200} 
          alt={product.title}
          fit="cover"
        />
      </Card.Section>

      <Group justify="space-between" mt="md" mb="xs">
        <Text fw={500} lineClamp={1}>{product.title}</Text>
        <Badge size="sm">{product.category}</Badge>
      </Group>

      <Group justify="space-between">
        <div>
          <Rating value={product.rating} readOnly size="sm" />
          <Text size="sm" c="dimmed">{product.reviews} отзывов</Text>
        </div>
      </Group>

      <Group justify="space-between" mt="md">
        <Text fw={600}>{product.minPrice} - {product.maxPrice}₽</Text>
        <Button 
          size="sm" 
          onClick={() => onAddCart(product)}
        >
          В корзину
        </Button>
      </Group>
    </Card>
  );
}
```

---

## API интеграция

### OpenAPI TypeScript Codegen

**Установка:**
```bash
npm install @openapitools/openapi-generator-cli openapi-typescript-codegen
```

**Генерация клиента:**
```bash
npm run generate-client
```

**package.json:**
```json
{
  "scripts": {
    "generate-client": "openapi --input https://api.localtea.ru/api/v1/openapi.json --output ./src/lib/api --client axios"
  }
}
```

**Инициализация OpenAPI клиента:**
```typescript
// src/lib/api-client.ts
import { OpenAPI } from './api/core/OpenAPI';

export function initializeApiClient() {
  OpenAPI.BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.localtea.ru/api/v1';
  OpenAPI.TOKEN = localStorage.getItem('accessToken');
}

// Вызывать в _app.tsx (или app/layout.tsx для App Router)
initializeApiClient();
```

**Использование:**
```typescript
// src/features/catalog/hooks.ts
import { CatalogService } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

export function useProducts(categoryId: number) {
  return useQuery(['products', categoryId], () =>
    CatalogService.getProducts({ categoryId, limit: 12 })
  );
}

export function useProduct(slug: string) {
  return useQuery(['product', slug], () =>
    CatalogService.getProductBySlug({ slug })
  );
}
```

### API методы, требуемые для фронтенда

На основе USER_BACKEND API:

**Каталог:**
- `GET /api/v1/catalog/categories` — все категории
- `GET /api/v1/catalog/products?category_id=&sort=&page=&limit=` — товары
- `GET /api/v1/catalog/products/{slug}` — товар по slug
- `GET /api/v1/catalog/skus/{sku_id}` — информация SKU

**Заказы:**
- `POST /api/v1/orders/create` — создать заказ
- `GET /api/v1/orders` — список заказов пользователя
- `GET /api/v1/orders/{id}` — детали заказа
- `POST /api/v1/orders/{id}/pay` — инициировать оплату

**Пользователь:**
- `POST /api/v1/users/register` — регистрация
- `POST /api/v1/users/login` — вход
- `GET /api/v1/users/me` — текущий пользователь
- `PATCH /api/v1/users/me` — обновить профиль

**Блог:**
- `GET /api/v1/blog` — список статей
- `GET /api/v1/blog/{slug}` — статья
- `POST /api/v1/blog/{id}/views` — отследить просмотр

---

## Состояние и управление данными

### Архитектура state management

```
┌─────────────────────────────────────────┐
│      React Query (Server State)        │
│  - Каталог товаров                     │
│  - Заказы пользователя                 │
│  - Статьи блога                        │
└─────────────────────────────────────────┘
         ↑
┌─────────────────────────────────────────┐
│    Zustand (Client State)               │
│  - Корзина товаров                      │
│  - UI состояние (modals, drawers)      │
│  - Фильтры в каталоге                   │
│  - Аутентификация (token)               │
└─────────────────────────────────────────┘
         ↑
┌─────────────────────────────────────────┐
│    localStorage                         │
│  - Токены доступа                       │
│  - Корзина (резервная копия)            │
│  - Предпочтения пользователя            │
└─────────────────────────────────────────┘
```

### React Query (TanStack Query)

**Конфигурация:**
```typescript
// src/lib/query-client.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 минут
      gcTime: 10 * 60 * 1000, // 10 минут (cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

**Использование:**
```typescript
// src/features/catalog/hooks.ts
import { useQuery, useMutation } from '@tanstack/react-query';
import { CatalogService } from '@/lib/api';

export function useProducts(categoryId: number, page: number = 1) {
  return useQuery({
    queryKey: ['products', categoryId, page],
    queryFn: () => 
      CatalogService.getProducts({ categoryId, page, limit: 12 }),
  });
}

export function useAddToCart() {
  return useMutation({
    mutationFn: (product) => addToCart(product),
    onSuccess: () => {
      showNotification('Товар добавлен в корзину');
    },
  });
}
```

### Zustand Store (Корзина)

```typescript
// src/features/cart/store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartItem {
  id: string;
  productId: number;
  skuId: number;
  title: string;
  price: number;
  image: string;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  clear: () => void;
  total: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find(i => i.id === item.id);
          if (existing) {
            return {
              items: state.items.map(i =>
                i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
              ),
            };
          }
          return { items: [...state.items, item] };
        }),
      
      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter(i => i.id !== id),
        })),
      
      updateQuantity: (id, qty) =>
        set((state) => ({
          items: state.items.map(i =>
            i.id === id ? { ...i, quantity: Math.max(1, qty) } : i
          ),
        })),
      
      clear: () => set({ items: [] }),
      
      total: () => {
        const { items } = get();
        return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);
```

### Zustand Store (Аутентификация)

```typescript
// src/features/auth/store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      
      login: async (email, password) => {
        const response = await AuthService.login({ email, password });
        localStorage.setItem('accessToken', response.accessToken);
        set({ token: response.accessToken, user: response.user });
      },
      
      logout: () => {
        localStorage.removeItem('accessToken');
        set({ user: null, token: null });
      },
      
      setUser: (user) => set({ user }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
);
```

---

## Структура файлов - детальный пример

### Пример: Компонент CategoryBanner

**Файловая структура:**
```
src/
├── components/
│   └── catalog/
│       ├── CategoryBanner.tsx
│       ├── CategoryBanner.module.css
│       ├── index.ts
│       └── types.ts
```

**CategoryBanner.tsx:**
```typescript
import { Card, Group, Text, Badge, Image, Button } from '@mantine/core';
import { motion } from 'framer-motion';
import styles from './CategoryBanner.module.css';
import { Category } from './types';

interface CategoryBannerProps {
  category: Category;
  onClick: () => void;
}

export function CategoryBanner({ category, onClick }: CategoryBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      className={styles.wrapper}
    >
      <Card 
        withBorder 
        radius="lg" 
        className={styles.card}
        style={{
          background: `linear-gradient(135deg, ${category.colorStart}, ${category.colorEnd})`,
        }}
      >
        <Group justify="space-between" align="flex-start">
          <div>
            <Text fw={600} size="xl" c="white">
              {category.name}
            </Text>
            <Text size="sm" c="rgba(255,255,255,0.8)" mt="xs">
              {category.count} товаров
            </Text>
          </div>
          
          <Image 
            src={category.icon} 
            alt={category.name}
            width={80}
            height={80}
          />
        </Group>
        
        <Button
          variant="white"
          size="sm"
          mt="md"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          Смотреть каталог →
        </Button>
      </Card>
    </motion.div>
  );
}
```

**CategoryBanner.module.css:**
```css
.wrapper {
  cursor: pointer;
}

.card {
  padding: 24px;
  min-height: 200px;
  transition: all 0.3s ease;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

@media (max-width: 768px) {
  .card {
    min-height: 160px;
    padding: 16px;
  }
}
```

**types.ts:**
```typescript
export interface Category {
  id: number;
  name: string;
  description: string;
  icon: string;
  colorStart: string;
  colorEnd: string;
  count: number;
}
```

---

## Дополнительные технические детали

### Обработка ошибок

```typescript
// src/components/shared/ErrorBoundary.tsx
import { Alert } from '@mantine/core';
import { ReactNode } from 'react';

export function ErrorBoundary({ children }: { children: ReactNode }) {
  try {
    return children;
  } catch (error) {
    return (
      <Alert title="Ошибка" color="red">
        {error instanceof Error ? error.message : 'Неизвестная ошибка'}
      </Alert>
    );
  }
}
```

### SEO Оптимизация

```typescript
// src/lib/seo.ts
import Head from 'next/head';

export function SEOMeta({
  title,
  description,
  image,
  url,
}: {
  title: string;
  description: string;
  image: string;
  url: string;
}) {
  return (
    <Head>
      <title>{title} | LocalTea</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />
    </Head>
  );
}
```

### Производительность

**Lazy Loading Изображений:**
```tsx
<Image
  src={product.image}
  placeholder="blur"
  blurDataURL="data:image/png;base64,..."
/>
```

**Code Splitting:**
```typescript
import dynamic from 'next/dynamic';

const ProductFilters = dynamic(() => import('@/components/ProductFilters'), {
  loading: () => <LoadingSpinner />,
});
```

**Оптимизация бандла:**
```bash
npm run build
# Next.js автоматически:
# - Code splitting по routes
# - Tree-shaking неиспользуемого кода
# - Минификация CSS/JS
# - Compression (gzip, brotli)
```

---

## Резюме

### Технология
- Next.js 16 (App Router)
- TypeScript
- Mantine UI (✅ хорошая идея)
- React Query для server state
- Zustand для client state
- openapi-typescript-codegen для API

### UX принципы
- Минимализм и чистота
- Плавные анимации
- Mobile-first подход
- Интуитивная навигация
- Быстрая загрузка (< 2 сек)

### Основные страницы
1. `/` — главная
2. `/categories` — выбор категорий (красивые баннеры)
3. `/catalog?category={id}` — товары (карточки с hover эффектами)
4. `/catalog/{slug}` — товар (галерея, характеристики)
5. `/cart` — корзина
6. `/checkout` — оформление (Stepper)
7. `/blog` — блог
8. `/account` — профиль и заказы

### API
- OpenAPI TypeScript Codegen
- axios + React Query
- Автоматическая генерация типов

Всё готово к разработке! 🚀
