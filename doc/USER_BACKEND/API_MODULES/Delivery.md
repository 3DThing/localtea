# API Маршруты (Endpoints) модуля Delivery

В этом документе описаны маршруты API для расчёта стоимости доставки.
Базовый префикс для всех маршрутов: `/api/v1/delivery`.

## Расчёт доставки

### `POST /calculate`

**Описание**: Рассчитать стоимость доставки Почтой России.

**Тело запроса** (`DeliveryCalculateRequest`):
```json
{
  "postal_code": "141631",    // Индекс получателя (6 цифр)
  "weight_grams": 500         // Вес отправления в граммах (1-50000)
}
```

**Ответ** (`DeliveryCalculateResponse`):
```json
{
  "options": [
    {
      "mail_type": "27030",
      "mail_type_name": "Посылка стандарт",
      "total_cost": 350.00,
      "total_cost_cents": 35000,
      "delivery_min_days": 5,
      "delivery_max_days": 10
    },
    {
      "mail_type": "47030",
      "mail_type_name": "Посылка 1-го класса",
      "total_cost": 450.00,
      "total_cost_cents": 45000,
      "delivery_min_days": 2,
      "delivery_max_days": 5
    },
    {
      "mail_type": "7030",
      "mail_type_name": "EMS",
      "total_cost": 800.00,
      "total_cost_cents": 80000,
      "delivery_min_days": 1,
      "delivery_max_days": 3
    }
  ],
  "cheapest": {
    "mail_type": "27030",
    "mail_type_name": "Посылка стандарт",
    "total_cost": 350.00,
    "total_cost_cents": 35000,
    "delivery_min_days": 5,
    "delivery_max_days": 10
  }
}
```

**Ошибки**:
- `400`: Не удалось рассчитать доставку (некорректный индекс).

### `GET /methods`

**Описание**: Получить список доступных методов доставки.

**Ответ** (`DeliveryMethodsResponse`):
```json
{
  "methods": [
    {
      "id": "pickup",
      "name": "Самовывоз",
      "description": "Забрать заказ по адресу: г. Москва, ул. Примерная, д. 1",
      "cost": 0,
      "cost_text": "Бесплатно"
    },
    {
      "id": "russian_post",
      "name": "Почта России",
      "description": "Доставка по всей России",
      "cost": null,
      "cost_text": "Рассчитывается по индексу"
    }
  ]
}
```

---

## Интеграция с Почтой России

### API тарификации

Сервис использует официальный API Почты России для расчёта тарифов:
`https://tariff.pochta.ru/v2/calculate/tariff`

### Типы отправлений

| Код | Название | Описание |
|-----|----------|----------|
| 27030 | Посылка стандарт | Экономичная доставка |
| 47030 | Посылка 1-го класса | Ускоренная доставка |
| 7030 | EMS | Экспресс-доставка |

### Параметры расчёта

- **Индекс отправителя**: Настраивается через `SENDER_POSTAL_CODE` в `.env` (по умолчанию: `111020`)
- **Объявленная ценность**: 0 (без объявленной ценности)
- **Наложенный платёж**: 0 (оплата онлайн)

---

## Конфигурация

### Переменные окружения

```env
SENDER_POSTAL_CODE=111020    # Индекс отправителя (опционально)
```

---

## Сервис доставки

### DeliveryService (`backend/services/delivery.py`)

```python
class DeliveryService:
    async def calculate_single(
        self, 
        to_postal_code: str, 
        weight_grams: int, 
        mail_type: str
    ) -> Optional[DeliveryOption]
    
    async def calculate_all_options(
        self, 
        to_postal_code: str, 
        weight_grams: int
    ) -> List[DeliveryOption]
    
    async def get_cheapest_option(
        self, 
        to_postal_code: str, 
        weight_grams: int
    ) -> Optional[DeliveryOption]
```

### DeliveryOption

```python
@dataclass
class DeliveryOption:
    mail_type: str           # Код типа отправления
    mail_type_name: str      # Название типа
    total_cost: float        # Стоимость в рублях
    delivery_min_days: int   # Минимальный срок доставки
    delivery_max_days: int   # Максимальный срок доставки
```
