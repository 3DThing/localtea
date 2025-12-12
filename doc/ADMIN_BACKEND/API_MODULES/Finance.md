# Модуль Finance (Admin)

Финансовый учёт: баланс магазина, транзакции, аналитика.
Базовый префикс для всех маршрутов: `/api/v1/finance`.

## Баланс и транзакции

### `GET /balance`

*   **Описание**: Текущий баланс и статистика.
*   **Требования**: Права администратора.
*   **Ответ**: `FinanceBalance`
    *   `current_balance_cents` (int): Текущий баланс в копейках.
    *   `total_income_cents` (int): Общий доход.
    *   `total_expenses_cents` (int): Общие расходы.
    *   `today_income_cents` (int): Доход за сегодня.
    *   `today_expenses_cents` (int): Расходы за сегодня.
    *   `month_income_cents` (int): Доход за месяц.
    *   `month_expenses_cents` (int): Расходы за месяц.

### `GET /transactions`

*   **Описание**: Список финансовых транзакций.
*   **Требования**: Права администратора.
*   **Параметры запроса**:
    *   `skip` (int, default=0): Пропустить N записей.
    *   `limit` (int, default=50, max=200): Лимит записей.
    *   `transaction_type` (string, optional): Фильтр по типу.
    *   `category` (string, optional): Фильтр по категории расхода.
    *   `order_id` (int, optional): Фильтр по заказу.
    *   `date_from` (datetime, optional): Дата начала периода.
    *   `date_to` (datetime, optional): Дата конца периода.
    *   `q` (string, optional): Поиск по описанию.
*   **Ответ**: `FinanceTransactionListResponse`.

### `GET /transactions/{transaction_id}`

*   **Описание**: Детали транзакции.
*   **Требования**: Права администратора.
*   **Параметры**: `transaction_id` (Integer).
*   **Ответ**: Объект `FinanceTransactionResponse`.

---

## Операции с балансом

### `POST /deposit`

*   **Описание**: Внести средства на баланс.
*   **Требования**: Права администратора.
*   **Тело запроса**: `DepositRequest`
    *   `amount_cents` (int, required): Сумма в копейках (положительная).
    *   `description` (string, required): Описание операции.
    *   `category` (string, optional): Категория.
*   **Ответ**: Созданная транзакция.

### `POST /withdrawal`

*   **Описание**: Вывести средства с баланса.
*   **Требования**: Права администратора.
*   **Тело запроса**: `WithdrawalRequest`
    *   `amount_cents` (int, required): Сумма в копейках (положительная).
    *   `description` (string, required): Описание операции.
    *   `category` (string, optional): Категория.
*   **Ответ**: Созданная транзакция.

### `POST /expense`

*   **Описание**: Записать расход.
*   **Требования**: Права администратора.
*   **Тело запроса**: `ExpenseRequest`
    *   `amount_cents` (int, required): Сумма расхода в копейках.
    *   `description` (string, required): Описание.
    *   `category` (string, required): Категория расхода.
*   **Ответ**: Созданная транзакция.

### `POST /adjust`

*   **Описание**: Корректировка баланса.
*   **Требования**: Права администратора.
*   **Тело запроса**: `AdjustRequest`
    *   `amount_cents` (int, required): Сумма корректировки (+ или -).
    *   `description` (string, required): Причина корректировки.
    *   `category` (string, optional): Категория.
*   **Ответ**: Созданная транзакция.

---

## Аналитика и категории

### `GET /analytics`

*   **Описание**: Финансовая аналитика за период.
*   **Требования**: Права администратора.
*   **Параметры запроса**:
    *   `days` (int, default=30, range=1-365): Период в днях.
*   **Ответ**: `FinanceAnalytics`
    *   `period_income_cents` (int): Доход за период.
    *   `period_expenses_cents` (int): Расходы за период.
    *   `period_profit_cents` (int): Прибыль за период.
    *   `orders_count` (int): Количество заказов.
    *   `average_order_cents` (int): Средний чек.
    *   `income_by_day` (array): Доход по дням.
    *   `expenses_by_category` (object): Расходы по категориям.

### `GET /categories`

*   **Описание**: Список используемых категорий расходов.
*   **Требования**: Права администратора.
*   **Ответ**: Массив строк с названиями категорий.

---

## Типы транзакций

| Тип | Описание | Влияние на баланс |
|-----|----------|-------------------|
| `deposit` | Внесение средств | + |
| `withdrawal` | Вывод средств | - |
| `expense` | Расход | - |
| `adjustment` | Корректировка | +/- |
| `sale` | Оплата заказа (авто) | + |
| `refund` | Возврат средств (авто) | - |

---

## Автоматические транзакции

Создаются автоматически при:
*   **sale**: Успешная оплата заказа через YooKassa webhook.
*   **refund**: Успешный возврат средств через модуль Refunds.

---

## Модель FinanceTransactionResponse

*   `id` (int): ID транзакции.
*   `transaction_type` (string): Тип транзакции.
*   `amount_cents` (int): Сумма в копейках.
*   `description` (string): Описание.
*   `category` (string, optional): Категория.
*   `order_id` (int, optional): Связанный заказ.
*   `order_number` (string, optional): Номер заказа.
*   `admin_id` (int, optional): ID администратора.
*   `admin_name` (string, optional): Имя администратора.
*   `balance_after_cents` (int): Баланс после операции.
*   `created_at` (datetime): Дата операции.
