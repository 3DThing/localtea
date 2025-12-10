"""
Калькулятор стоимости доставки Почтой России
"""

import requests
from dataclasses import dataclass
from typing import Optional


@dataclass
class Address:
    """Адрес с индексом"""
    address: str
    postcode: str


@dataclass
class DeliveryResult:
    """Результат расчёта"""
    total_cost: float           # Стоимость в рублях
    delivery_min_days: int      # Мин. срок (дней)
    delivery_max_days: int      # Макс. срок (дней)
    mail_type_name: str         # Тип отправления


# Типы отправлений
MAIL_TYPES = {
    "посылка": 27030,           # Посылка стандарт
    "посылка_1класс": 47030,    # Посылка 1 класса
    "курьер": 27020,            # Курьер онлайн
    "ems": 7030,                # EMS
}


def calculate_delivery(
    sender: Address,
    recipient: Address,
    weight: int,
    mail_type: str = "посылка",
    pack: int = 10  # Упаковка отправителя по умолчанию
) -> DeliveryResult:
    """
    Рассчитать стоимость доставки
    
    Args:
        sender: Адрес отправителя с индексом
        recipient: Адрес получателя с индексом
        weight: Вес в граммах
        mail_type: Тип отправления (посылка, посылка_1класс, курьер, ems)
        pack: Код упаковки (10 - отправителя, 20 - Почты России)
    
    Returns:
        DeliveryResult с информацией о стоимости и сроках
    """
    url = "https://tariff.pochta.ru/v2/calculate/tariff"
    
    params = {
        "from": sender.postcode,
        "to": recipient.postcode,
        "weight": weight,
        "object": MAIL_TYPES.get(mail_type, 27030),
        "pack": pack,
    }
    
    headers = {
        "Accept": "application/json"
    }
    
    response = requests.get(url, params=params, headers=headers)
    
    # API может вернуть 400 с JSON данными и ошибками
    try:
        data = response.json()
    except:
        response.raise_for_status()
        raise
    
    # Проверка ошибок в JSON
    if "errors" in data and data["errors"]:
        errors = "; ".join([e.get("msg", str(e)) for e in data["errors"]])
        raise ValueError(f"Ошибка расчёта доставки: {errors}")
    
    # Проверяем что есть стоимость
    if "pay" not in data:
        raise ValueError(f"API не вернул стоимость доставки. Ответ: {data}")
    
    return DeliveryResult(
        total_cost=data.get("pay", 0) / 100,
        delivery_min_days=data.get("delivery", {}).get("min", 0),
        delivery_max_days=data.get("delivery", {}).get("max", 0),
        mail_type_name=data.get("name", "Неизвестно")
    )


def calculate_all_options(
    sender: Address,
    recipient: Address,
    weight: int
) -> list[DeliveryResult]:
    """Рассчитать стоимость для всех типов отправлений"""
    results = []
    
    for mail_type in MAIL_TYPES:
        try:
            result = calculate_delivery(sender, recipient, weight, mail_type)
            results.append(result)
        except (ValueError, requests.RequestException):
            continue
    
    return sorted(results, key=lambda x: x.total_cost)


def main():
    """Интерактивный режим"""
    print("=" * 50)
    print("Калькулятор доставки Почтой России")
    print("=" * 50)
    
    # Ввод данных отправителя
    print("\n📤 ОТПРАВИТЕЛЬ:")
    sender_address = input("Адрес: ").strip()
    sender_postcode = input("Индекс (6 цифр): ").strip()
    sender = Address(sender_address, sender_postcode)
    
    # Ввод данных получателя
    print("\n📥 ПОЛУЧАТЕЛЬ:")
    recipient_address = input("Адрес: ").strip()
    recipient_postcode = input("Индекс (6 цифр): ").strip()
    recipient = Address(recipient_address, recipient_postcode)
    
    # Вес
    print("\n📦 ПОСЫЛКА:")
    weight = int(input("Вес в граммах: ").strip())
    
    # Расчёт
    print("\n" + "=" * 50)
    print("РЕЗУЛЬТАТЫ РАСЧЁТА:")
    print("=" * 50)
    
    print(f"\nОткуда: {sender.address} ({sender.postcode})")
    print(f"Куда:   {recipient.address} ({recipient.postcode})")
    print(f"Вес:    {weight} г ({weight/1000:.2f} кг)")
    
    print("\n" + "-" * 50)
    print("Варианты доставки:")
    print("-" * 50)
    
    results = calculate_all_options(sender, recipient, weight)
    
    for result in results:
        print(f"\n📬 {result.mail_type_name}")
        print(f"   Стоимость: {result.total_cost:.2f} руб.")
        print(f"   Срок: {result.delivery_min_days}-{result.delivery_max_days} дней")
    
    if results:
        cheapest = results[0]
        print("\n" + "=" * 50)
        print(f"💰 Самый дешёвый вариант: {cheapest.mail_type_name}")
        print(f"   {cheapest.total_cost:.2f} руб. за {cheapest.delivery_min_days}-{cheapest.delivery_max_days} дней")


# Пример программного использования
if __name__ == "__main__":
    main()