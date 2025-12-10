# API Маршруты (Endpoints) модуля Users

В этом документе описаны все маршруты API модуля Users.
Базовый префикс для всех маршрутов: `/api/v1/user`.

## Аутентификация и Регистрация

### `POST /registration`

**Описание**: Регистрация нового пользователя.

**Лимиты**: 5 запросов/минуту, 20 запросов/час.

**Тело запроса** (`UserCreate`):
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "securepassword",
  "firstname": "Иван",           // опционально
  "lastname": "Иванов",          // опционально
  "middlename": "Иванович",      // опционально
  "address": "г. Москва, ...",   // опционально
  "birthdate": "1990-01-15"      // опционально
}
```

**Действия**:
1. Проверяет уникальность email и username.
2. Хеширует пароль (Argon2).
3. Создает пользователя со статусом `is_active=False`.
4. Генерирует токен подтверждения email.
5. Отправляет письмо с ссылкой подтверждения.

**Ответ**: Созданный объект пользователя.

**Ошибки**:
- `400`: Email или username уже зарегистрирован.

### `POST /login`

**Описание**: Вход в систему.

**Тело запроса** (`UserLogin`):
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Действия**:
1. Проверяет учётные данные.
2. Генерирует Access Token (JWT, 30 мин).
3. Генерирует Refresh Token (UUID, 7 дней).
4. Генерирует CSRF Token.
5. Сохраняет сессию в БД.
6. Устанавливает cookies: `refresh_token` (httpOnly), `csrf_token`.

**Ответ**:
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer"
}
```

### `POST /login/access-token`

**Описание**: OAuth2-совместимый вход (для Swagger UI).

**Тело запроса**: `OAuth2PasswordRequestForm` (username, password).

### `POST /logout`

**Описание**: Выход из системы.

**Требования**: Аутентификация.

**Действия**:
1. Аннулирует refresh token в БД.
2. Удаляет cookies.

### `POST /refresh`

**Описание**: Обновление Access Token.

**Требования**: Валидный `refresh_token` в cookies.

**Лимиты**: 2 запроса/минуту.

**Ответ**: Новый `access_token`.

---

## Подтверждение Email

### `POST /confirm-email`

**Описание**: Подтверждение email после регистрации.

**Параметры**: `token` (query).

**Действия**:
1. Валидирует токен.
2. Активирует пользователя (`is_active=True`).
3. Устанавливает `email_verified=True`.

**Ответ**: Статус подтверждения.

### `GET /confirm-email-change`

**Описание**: Подтверждение смены email.

**Параметры**: `token` (query).

**Действия**:
1. Валидирует токен.
2. Обновляет email пользователя.

---

## Профиль пользователя

Все маршруты требуют аутентификации и CSRF токена (заголовок `X-CSRF-Token`).

### `GET /get-profile`

**Описание**: Получение данных текущего пользователя.

**Ответ** (`User`):
```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "username",
  "firstname": "Иван",
  "lastname": "Иванов",
  "middlename": "Иванович",
  "phone_number": "+79991234567",
  "phone_verified": true,
  "address": "г. Москва, ул. Примерная, д. 1",
  "postal_code": "123456",
  "birthdate": "1990-01-15",
  "avatar_url": "/uploads/avatars/user_1.jpg",
  "is_active": true,
  "email_verified": true,
  "created_at": "2025-01-01T12:00:00Z"
}
```

### `GET /get-public-profile/{user_id}`

**Описание**: Получение публичных данных пользователя.

**Ответ**:
```json
{
  "username": "username",
  "avatar_url": "/uploads/avatars/user_1.jpg"
}
```

---

## Редактирование профиля

### `POST /change-password`

**Тело запроса**:
```json
{
  "old_password": "currentpassword",
  "new_password": "newsecurepassword"
}
```

### `POST /change-email`

**Описание**: Запрос на смену email.

**Тело запроса**:
```json
{
  "email": "newemail@example.com"
}
```

**Действия**: Отправляет письмо с подтверждением на новый адрес.

### `POST /change-username`

**Тело запроса**:
```json
{
  "username": "newusername"
}
```

### `POST /change-firstname`

**Тело запроса**:
```json
{
  "firstname": "Пётр"
}
```

### `POST /change-lastname`

**Тело запроса**:
```json
{
  "lastname": "Петров"
}
```

### `POST /change-middlename`

**Тело запроса**:
```json
{
  "middlename": "Петрович"
}
```

### `POST /change-birthdate`

**Тело запроса**:
```json
{
  "birthdate": "1990-05-20"
}
```

### `POST /change-address`

**Тело запроса**:
```json
{
  "address": "г. Санкт-Петербург, ул. Новая, д. 5"
}
```

### `POST /change-postal-code`

**Тело запроса**:
```json
{
  "postal_code": "190000"
}
```

### `POST /change-phone-number`

**Тело запроса**:
```json
{
  "phone_number": "+79998887766"
}
```

**Примечание**: После смены номера `phone_verified` сбрасывается в `False`.

---

## Загрузка аватара

### `POST /upload-avatar`

**Описание**: Загрузка изображения аватара.

**Content-Type**: `multipart/form-data`

**Тело запроса**: `file` (изображение).

**Ограничения**:
- Максимальный размер: 5 MB.
- Форматы: JPEG, PNG, GIF, WebP.

**Действия**:
1. Валидирует файл.
2. Генерирует уникальное имя.
3. Сохраняет в `/uploads/avatars/`.
4. Обновляет `avatar_url` пользователя.

---

## Верификация телефона

### `POST /phone-verification/start`

**Описание**: Инициировать верификацию телефона через звонок.

**Лимиты**: 3 запроса/минуту, 10 запросов/час.

**Требования**: У пользователя должен быть указан `phone_number`.

**Действия**:
1. Отправляет запрос в SMS.ru API.
2. Запускает фоновую задачу Celery для проверки статуса.

**Ответ** (`PhoneVerificationStart`):
```json
{
  "status": "pending",
  "message": "Ожидайте звонок на номер +7999***7766"
}
```

### `GET /phone-verification/status`

**Описание**: Проверить статус верификации.

**Ответ** (`PhoneVerificationStatus`):
```json
{
  "status": "verified",       // pending | verified | failed
  "phone_verified": true,
  "message": "Телефон успешно подтверждён"
}
```

---

## Удаление аккаунта

### `DELETE /account`

**Описание**: Удаление аккаунта с подтверждением паролем.

**Тело запроса**:
```json
{
  "password": "currentpassword"
}
```

**Действия**:
1. Проверяет пароль.
2. Удаляет все связанные данные (токены, корзина и т.д.).
3. Удаляет пользователя.

**Ответ**:
```json
{
  "message": "Аккаунт успешно удалён"
}
```

---

## Модель пользователя

```python
class User(Base):
    id: int
    email: str                  # Уникальный
    username: str               # Уникальный
    hashed_password: str
    
    firstname: str | None
    lastname: str | None
    middlename: str | None
    
    phone_number: str | None    # Уникальный
    phone_verified: bool        # По умолчанию False
    
    address: str | None
    postal_code: str | None
    birthdate: date | None
    
    avatar_url: str | None
    
    is_active: bool             # Активирован через email
    is_superuser: bool
    email_verified: bool
    
    created_at: datetime
    updated_at: datetime
```

---

## Безопасность

### JWT токены

- **Access Token**: JWT, срок жизни 30 минут.
- **Refresh Token**: UUID, хранится в БД (хешированный), срок жизни 7 дней.

### CSRF защита

- CSRF токен генерируется при логине.
- Передаётся в cookie `csrf_token` (не httpOnly).
- Проверяется в заголовке `X-CSRF-Token` для защищённых маршрутов.

### Rate Limiting

- Регистрация: 5/мин, 20/час.
- Логин: неограниченно (но есть защита от брутфорса).
- Верификация телефона: 3/мин, 10/час.

### Хеширование паролей

Используется Argon2 через библиотеку `passlib`.
