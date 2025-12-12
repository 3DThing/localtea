# Модуль отправки электронной почты

В проекте LocalTea реализована система отправки транзакционных писем (подтверждение регистрации, смена пароля и т.д.) с использованием SMTP и HTML-шаблонов.

## Архитектура

Отправка писем вынесена в асинхронный фоновый процесс, чтобы не блокировать основной поток обработки HTTP-запросов пользователя.

1.  **Инициатор**: Сервис (например, `UserService`) формирует данные для письма.
2.  **Планировщик**: Задача отправляется в очередь Celery (`send_email.delay(...)`).
3.  **Брокер**: Redis сохраняет задачу.
4.  **Исполнитель**: Celery Worker забирает задачу из Redis и выполняет её.
5.  **Транспорт**: Модуль `backend/utils/email.py` устанавливает SSL-соединение с SMTP-сервером (например, Yandex, Gmail) и отправляет письмо.

## Конфигурация

Настройки почты задаются в файле `.env`. **Эти данные не должны попадать в репозиторий!**

```ini
# .env
SMTP_SERVER=smtp.yandex.ru
SMTP_PORT=465
SMTP_USER=your_email@yandex.ru
SMTP_PASSWORD=your_app_password  # Пароль приложения, не основной пароль от почты!
EMAILS_FROM_EMAIL=your_email@yandex.ru
EMAILS_FROM_NAME=LocalTea
```

*   **SMTP_PORT**: Используется порт `465` для защищенного SSL соединения (`smtplib.SMTP_SSL`).

## Шаблоны писем

Для формирования тела писем используется шаблонизатор **Jinja2**.
Шаблоны находятся в директории `backend/templates/`.

### Доступные шаблоны

| Шаблон | Назначение | Описание |
|--------|-----------|----------|
| `base.html` | Базовый шаблон | Общая структура, стили, фэнтези-оформление |
| `verification.html` | Подтверждение email | Отправляется при регистрации |
| `password_changed.html` | Смена пароля | Уведомление об успешной смене |
| `email_change.html` | Смена email | Подтверждение нового адреса |
| `order_confirmation.html` | Подтверждение заказа | Детали заказа и оплаты |
| `order_shipped.html` | Отправка заказа | Уведомление с трек-номером |

### Переменные контекста

#### `verification.html`
*   `title` (str): Заголовок письма.
*   `token` (str): Код подтверждения.
*   `link` (str): Ссылка для подтверждения.

#### `password_changed.html`
*   `username` (str): Имя пользователя.
*   `changed_at` (str): Дата и время смены пароля.

#### `email_change.html`
*   `username` (str): Имя пользователя.
*   `new_email` (str): Новый email адрес.
*   `token` (str): Код подтверждения.
*   `link` (str): Ссылка для подтверждения.

#### `order_confirmation.html`
*   `customer_name` (str): Имя покупателя.
*   `order_id` (int): Номер заказа.
*   `payment_id` (str): ID платежа (YooKassa).
*   `order_date` (str): Дата заказа.
*   `items` (list): Список товаров:
    *   `name` (str): Название товара.
    *   `variant` (str, optional): Вариант/размер.
    *   `quantity` (int): Количество.
    *   `price` (str): Цена (форматированная).
*   `subtotal` (str): Сумма товаров.
*   `discount_amount` (int): Размер скидки (0 если нет).
*   `promo_code` (str, optional): Применённый промокод.
*   `delivery_method` (str): Способ доставки.
*   `delivery_cost` (int): Стоимость доставки (0 = бесплатно).
*   `total` (str): Итоговая сумма.
*   `shipping_address` (str, optional): Адрес доставки.
*   `order_link` (str): Ссылка на страницу заказа.

#### `order_shipped.html`
*   `customer_name` (str): Имя покупателя.
*   `order_id` (int): Номер заказа.
*   `tracking_number` (str, optional): Трек-номер.
*   `delivery_method` (str): Способ доставки.
*   `shipping_address` (str, optional): Адрес доставки.
*   `estimated_days` (str): Ожидаемый срок ("5-7 дней").
*   `order_link` (str): Ссылка на страницу заказа.

### Функции отправки

В модуле `backend/utils/email.py` доступны удобные функции:

```python
from backend.utils.email import (
    send_verification_email,
    send_password_changed_email,
    send_email_change_confirmation,
    send_order_confirmation_email,
    send_order_shipped_email
)

# Подтверждение email
send_verification_email(
    email_to="user@example.com",
    username="Путник",
    token="ABC123",
    link="https://localtea.ru/confirm-email?token=ABC123"
)

# Смена пароля
send_password_changed_email(
    email_to="user@example.com",
    username="Путник"
)

# Смена email
send_email_change_confirmation(
    email_to="new@example.com",
    username="Путник",
    new_email="new@example.com",
    token="XYZ789",
    link="https://localtea.ru/confirm-email-change?token=XYZ789"
)

# Подтверждение заказа
send_order_confirmation_email(
    email_to="user@example.com",
    customer_name="Иван Иванов",
    order_id=12345,
    payment_id="2a3b4c5d-6e7f-8g9h",
    order_date="12.12.2025",
    items=[
        {"name": "Улун Да Хун Пао", "variant": "100г", "quantity": 2, "price": "1 200"},
        {"name": "Пуэр Шу", "variant": "50г", "quantity": 1, "price": "800"}
    ],
    subtotal="3 200",
    discount_amount=320,
    promo_code="TEA10",
    delivery_method="Почта России",
    delivery_cost=350,
    total="3 230",
    shipping_address="123456, г. Москва, ул. Чайная, д. 1",
    order_link="https://localtea.ru/profile?tab=orders"
)

# Отправка заказа
send_order_shipped_email(
    email_to="user@example.com",
    customer_name="Иван Иванов",
    order_id=12345,
    tracking_number="RA123456789RU",
    delivery_method="Почта России",
    shipping_address="123456, г. Москва, ул. Чайная, д. 1",
    estimated_days="5-7 рабочих дней",
    order_link="https://localtea.ru/profile?tab=orders"
)
```

### Стилизация

Письма оформлены в стиле "Свиток/Фентези":
*   Фон напоминает старую бумагу.
*   Используются шрифты с засечками (Georgia, serif).
*   Кнопки стилизованы под сургучные печати или магические элементы.
*   Адаптивная верстка для корректного отображения на мобильных устройствах.

## Использование в коде

Для отправки письма используйте задачу Celery `send_email`.

```python
from backend.worker import send_email

# ... внутри асинхронной функции ...

send_email.delay(
    email_to="user@example.com",
    subject="Тема письма",
    template_name="verification.html", # Имя файла в backend/templates/
    environment={
        "title": "Добро пожаловать!",
        "link": "http://example.com/confirm?token=...",
        "some_variable": "Значение для шаблона"
    }
)
```

## Отладка

Если письма не приходят:
1.  Проверьте логи контейнера `worker`:
    ```bash
    docker-compose logs -f worker
    ```
2.  Убедитесь, что порты SMTP (465, 587, 25) не заблокированы хостинг-провайдером.
3.  Проверьте правильность учетных данных в `.env`.
4.  Для проверки соединения можно использовать скрипт `backend/debug_smtp.py` (если он есть) или создать простой скрипт с `smtplib`.
