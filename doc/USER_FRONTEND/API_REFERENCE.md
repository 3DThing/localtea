# API Reference (User Frontend)

## API клиент

**Путь**: `src/lib/api.ts`

HTTP клиент на базе Axios с автоматическим обновлением токена.

**Базовый URL**: `/api/v1` (проксируется через Next.js на `https://api.localtea.ru/api/v1`)

**Особенности**:
- Автоматическое добавление CSRF токена из cookies.
- Автоматическое обновление Access Token при 401 ошибке.
- Очередь запросов для предотвращения множественных refresh.

---

## Модули API

### catalogApi

Работа с каталогом товаров.

| Метод | Endpoint | Описание |
|-------|----------|----------|
| getCategories | GET `/catalog/categories` | Дерево категорий |
| getProducts | GET `/catalog/products` | Список товаров с фильтрами |
| getProduct | GET `/catalog/products/{slug}` | Детали товара по slug |

**Параметры getProducts**:
*   `page` (int): Номер страницы.
*   `limit` (int): Лимит на страницу.
*   `category_id` (int, optional): Фильтр по категории.
*   `tea_type` (string, optional): Тип чая.
*   `sort` (string, optional): Сортировка.
*   `q` (string, optional): Поисковый запрос.

---

### blogApi

Работа с блогом.

| Метод | Endpoint | Описание |
|-------|----------|----------|
| getArticles | GET `/blog/articles/` | Список статей |
| getArticle | GET `/blog/articles/{slug}` | Детали статьи |

---

### userApi

Аутентификация и профиль пользователя.

#### Аутентификация

| Метод | Endpoint | Описание |
|-------|----------|----------|
| register | POST `/user/registration` | Регистрация |
| login | POST `/user/login` | Вход |
| logout | POST `/user/logout` | Выход |
| getProfile | GET `/user/get-profile` | Профиль |
| refresh | POST `/user/refresh` | Обновление токена |

#### Редактирование профиля

| Метод | Endpoint | Описание |
|-------|----------|----------|
| updateFirstname | POST `/user/change-firstname` | Изменить имя |
| updateLastname | POST `/user/change-lastname` | Изменить фамилию |
| updateMiddlename | POST `/user/change-middlename` | Изменить отчество |
| updateBirthdate | POST `/user/change-birthdate` | Изменить дату рождения |
| updateAddress | POST `/user/change-address` | Изменить адрес |
| updatePostalCode | POST `/user/change-postal-code` | Изменить индекс |
| updatePhoneNumber | POST `/user/change-phone-number` | Изменить телефон |
| uploadAvatar | POST `/user/upload-avatar` | Загрузить аватар |
| changePassword | POST `/user/change-password` | Сменить пароль |
| changeEmail | POST `/user/change-email` | Сменить email |
| changeUsername | POST `/user/change-username` | Сменить username |

#### Верификация

| Метод | Endpoint | Описание |
|-------|----------|----------|
| confirmEmail | POST `/user/confirm-email` | Подтвердить email |
| confirmEmailChange | GET `/user/confirm-email-change` | Подтвердить смену email |
| startPhoneVerification | POST `/user/phone-verification/start` | Начать верификацию телефона |
| checkPhoneVerification | GET `/user/phone-verification/status` | Проверить статус верификации |

#### Аккаунт

| Метод | Endpoint | Описание |
|-------|----------|----------|
| deleteAccount | DELETE `/user/account` | Удалить аккаунт |

---

### cartApi

Работа с корзиной.

| Метод | Endpoint | Описание |
|-------|----------|----------|
| getCart | GET `/cart` | Получить корзину |
| addItem | POST `/cart/items` | Добавить товар |
| updateItem | PATCH `/cart/items/{id}` | Изменить количество |
| removeItem | DELETE `/cart/items/{id}` | Удалить товар |
| clearCart | DELETE `/cart` | Очистить корзину |
| applyPromoCode | POST `/cart/promo` | Применить промокод |

**Параметры getCart**:
*   `promo_code` (string, optional): Промокод для расчёта скидки.

**Гостевая корзина**: Поддерживается через cookie `guest_session_id`.

---

### deliveryApi

Расчёт доставки.

| Метод | Endpoint | Описание |
|-------|----------|----------|
| getMethods | GET `/delivery/methods` | Доступные методы доставки |
| calculate | POST `/delivery/calculate` | Рассчитать стоимость |

**Параметры calculate**:
*   `postal_code` (string): Почтовый индекс (6 цифр).
*   `weight_grams` (int): Вес посылки в граммах.

---

### orderApi

Работа с заказами.

| Метод | Endpoint | Описание |
|-------|----------|----------|
| checkout | POST `/orders/checkout` | Оформить заказ |
| getOrders | GET `/orders` | Список заказов |
| getOrder | GET `/orders/{id}` | Детали заказа (включая payment_url) |

**Параметры checkout**:
*   `delivery_method` (string): "pickup" или "russian_post".
*   `contact_info` (object): Данные получателя (firstname, lastname, phone, email).
*   `shipping_address` (object, optional): Адрес и индекс для Почты России.
*   `delivery_cost_cents` (int): Стоимость доставки в копейках.
*   `payment_method` (string, optional): Способ оплаты.
*   `promo_code` (string, optional): Промокод для скидки.

---

### interactionsApi

Комментарии, лайки, просмотры.

| Метод | Endpoint | Описание |
|-------|----------|----------|
| getComments | GET `/interactions/comments` | Получить комментарии |
| createComment | POST `/interactions/comments` | Создать комментарий |
| deleteComment | DELETE `/interactions/comments/{id}` | Удалить комментарий |
| reportComment | POST `/interactions/comments/{id}/report` | Пожаловаться на комментарий |
| toggleLike | POST `/interactions/likes` | Поставить/убрать лайк |
| registerView | POST `/interactions/views` | Зарегистрировать просмотр |

**Параметры reportComment**:
*   `reason` (string): Причина жалобы.

---

## Управление состоянием

### AuthStore

**Путь**: `src/store/index.ts`

Zustand store для управления авторизацией.

**Состояние**:
*   `user` (User | null): Текущий пользователь.
*   `accessToken` (string | null): Access token.
*   `isLoading` (boolean): Флаг загрузки.

**Actions**:
*   `login(email, password)`: Вход в систему.
*   `logout()`: Выход.
*   `checkAuth()`: Проверка авторизации.
*   `refreshToken()`: Обновление токена.
*   `setUser(user)`: Установка пользователя.

**Особенности**:
- Токены хранятся в httpOnly cookies (не в localStorage).
- При 401 ошибке автоматически пытается обновить токен.
