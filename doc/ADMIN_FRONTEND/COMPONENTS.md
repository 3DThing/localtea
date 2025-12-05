# Компоненты Admin Frontend

## Layout компоненты

### MainLayout

**Путь**: `src/components/layout/MainLayout.tsx`

Основной layout приложения, объединяющий sidebar и header.

```tsx
interface MainLayoutProps {
  children: React.ReactNode;
}
```

### AppSidebar

**Путь**: `src/components/layout/AppSidebar.tsx`

Боковое навигационное меню.

**Элементы навигации**:
| Иконка | Название | Путь |
|--------|----------|------|
| IconDashboard | Дашборд | /dashboard |
| IconCategory | Каталог | /dashboard/catalog |
| IconShoppingCart | Заказы | /dashboard/orders |
| IconUsers | Пользователи | /dashboard/users |
| IconArticle | Блог | /dashboard/blog |

**Особенности**:
- Сворачиваемый режим (только иконки)
- Подсветка активного пункта
- Логотип LocalTea

### AppHeader

**Путь**: `src/components/layout/AppHeader.tsx`

Верхняя панель.

**Элементы**:
- Breadcrumbs (хлебные крошки)
- Переключатель темы (светлая/тёмная)
- Профиль пользователя с dropdown меню
- Кнопка выхода

---

## Shared компоненты

### RichTextEditor

**Путь**: `src/components/shared/RichTextEditor/`

WYSIWYG редактор на базе TipTap.

```tsx
interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  onImageUpload?: (file: File) => Promise<string>;
  placeholder?: string;
}
```

**Функции**:
- Заголовки (H1, H2, H3)
- Форматирование текста (bold, italic, underline, strikethrough)
- Выделение (highlight)
- Списки (маркированные, нумерованные)
- Цитаты (blockquote)
- Код (inline и блоки)
- Ссылки (с модальным окном для ввода URL)
- Изображения (загрузка через FileButton)
- Выравнивание текста (лево, центр, право, по ширине)
- Undo/Redo

**TipTap Extensions**:
- StarterKit
- Image
- Link
- Placeholder
- TextAlign
- Underline
- Highlight

### AuthGuard

**Путь**: `src/components/AuthGuard.tsx`

HOC для защиты роутов.

```tsx
interface AuthGuardProps {
  children: React.ReactNode;
}
```

**Логика**:
1. Проверяет наличие `accessToken` в localStorage
2. Если токена нет — redirect на `/login`
3. Если токен есть — рендерит children

---

## Feature компоненты

### Auth

#### LoginForm
Форма входа с полями email и password.

#### TwoFASetup  
Отображение QR-кода для настройки Google Authenticator.

#### TwoFAVerify
Ввод 6-значного TOTP кода.

---

### Catalog

#### CategoryModal

**Путь**: `src/features/catalog/components/CategoryModal.tsx`

Модальное окно для создания/редактирования категории.

```tsx
interface CategoryModalProps {
  opened: boolean;
  onClose: () => void;
  category?: Category;
  categories: Category[];
  onSuccess: () => void;
}
```

**Поля формы**:
- Название (обязательное)
- Slug (обязательный, автогенерация)
- Описание
- Родительская категория (Select)
- Изображение (Dropzone)
- SEO Title
- SEO Description
- Активность (Switch)

#### ProductModal

**Путь**: `src/features/catalog/components/ProductModal.tsx`

Модальное окно для быстрого создания/редактирования товара.

#### ProductForm

**Путь**: `src/features/catalog/components/ProductForm/`

Полная форма редактирования товара с табами.

**Табы**:
1. **Основное**: Название, slug, категория, описания
2. **Изображения**: Drag & Drop загрузка, сортировка, выбор главного
3. **SKU**: Таблица вариаций (вес, цена, скидка, остаток)
4. **SEO**: Meta title, description

##### ProductImagesForm
Управление изображениями товара.

```tsx
interface ProductImagesFormProps {
  product: Product;
  onUpdate: (product: Product) => void;
}
```

**Функции**:
- Drag & Drop загрузка (множественная)
- Удаление изображений
- Установка главного изображения
- Сортировка (опционально)

##### ProductSKUForm
Управление SKU товара.

---

### Orders

#### OrderDetailsDrawer
Боковая панель с деталями заказа.

**Информация**:
- Данные покупателя
- Адрес доставки
- Список товаров
- Итоговая сумма
- Кнопки смены статуса

#### OrderStatusBadge
Цветной бейдж статуса заказа.

| Статус | Цвет |
|--------|------|
| AWAITING_PAYMENT | gray |
| PAID | blue |
| PROCESSING | yellow |
| SHIPPED | cyan |
| DELIVERED | green |
| CANCELLED | red |

---

### Users

#### UserEditModal

**Путь**: `src/features/users/components/UserEditModal.tsx`

Модальное окно редактирования пользователя.

```tsx
interface UserEditModalProps {
  opened: boolean;
  onClose: () => void;
  user: UserAdminResponse;
  onSubmit: (data: UserAdminUpdate) => void;
  isPending: boolean;
}
```

**Поля формы**:
- Email
- Username
- Имя, Фамилия, Отчество
- Дата рождения (DateInput)
- Адрес
- Пароль (опционально)
- Email подтверждён (Switch)
- Активен (Switch)
- Суперпользователь (Switch)

**Особенности**:
- Пароль отправляется только если заполнен
- Валидация через Zod

---

### Blog

#### ArticleList

**Путь**: `src/features/blog/components/ArticleList.tsx`

Таблица статей блога.

**Колонки**:
- Заголовок
- Автор
- Статус (опубликовано/черновик)
- Дата создания
- Действия (редактировать, удалить)

#### ArticleEditPage

**Путь**: `src/app/dashboard/blog/[id]/page.tsx`

Страница редактирования статьи.

**Табы**:
1. **Содержание**: Заголовок, slug, RichTextEditor
2. **Обложка**: Dropzone для загрузки изображения
3. **Предпросмотр**: Отображение статьи как на сайте
4. **Настройки**: Переключатель публикации

**Действия**:
- Сохранить
- Опубликовать / Снять с публикации
- Назад к списку

---

## Провайдеры

### Providers

**Путь**: `src/app/providers.tsx`

Обёртка с провайдерами:
- MantineProvider (темы, цвета)
- QueryClientProvider (React Query)
- Notifications (уведомления)

```tsx
'use client';

import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const theme = createTheme({
  primaryColor: 'teal',
  // ...
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme} defaultColorScheme="light">
        <Notifications position="top-right" />
        {children}
      </MantineProvider>
    </QueryClientProvider>
  );
}
```
