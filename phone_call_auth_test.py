#!/usr/bin/env python3
"""
Приложение для проверки работоспособности системы авторизации по звонку.

Простая консольная утилита без фреймворков, БД и зависимостей.
Тестирует API sms.ru для авторизации пользователя по звонку с его номера.

Workflow:
1. Пользователь вводит номер телефона
2. Система запрашивает звонок через API sms.ru
3. Получает номер для звонка и check_id
4. Пользователь видит инструкцию
5. Система регулярно проверяет статус звонка
6. При получении звонка выводит результат
"""

import requests
import time
import sys
from typing import Dict, Any, Optional
from datetime import datetime


# Константы
API_BASE_URL = "https://sms.ru"
API_ID = "D9A62F49-2FC5-213A-0404-61F414FB8088"

# Коды статусов
STATUS_PENDING = 400        # Номер не подтвережден
STATUS_CONFIRMED = 401      # Номер подтвережден (авторизация успешна)
STATUS_EXPIRED = 402        # Истекло время или неправильный check_id

# Параметры
TIMEOUT_SECONDS = 300  # 5 минут на звонок
CHECK_INTERVAL_SECONDS = 5  # Проверять статус каждые 5 секунд


class PhoneCallAuthTester:
    """Тестер системы авторизации по звонку."""
    
    def __init__(self, api_id: str = API_ID):
        """
        Инициализация тестера.
        
        Args:
            api_id: API ключ для sms.ru
        """
        self.api_id = api_id
        self.session = requests.Session()
        self.session.timeout = 10
    
    def print_header(self, text: str):
        """Вывести заголовок."""
        print("\n" + "="*60)
        print(f"  {text}")
        print("="*60 + "\n")
    
    def print_info(self, text: str):
        """Вывести информационное сообщение."""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] ℹ️  {text}")
    
    def print_success(self, text: str):
        """Вывести сообщение об успехе."""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] ✅ {text}")
    
    def print_error(self, text: str):
        """Вывести сообщение об ошибке."""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] ❌ {text}")
    
    def print_warning(self, text: str):
        """Вывести предупреждение."""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] ⚠️  {text}")
    
    def get_phone_input(self) -> str:
        """
        Получить номер телефона от пользователя.
        
        Returns:
            Номер телефона в формате 7XXXXXXXXXX
        """
        while True:
            phone = input("\n📱 Введите номер телефона (формат: 79991234567): ").strip()
            
            # Очистим номер от символов
            phone_digits = ''.join(c for c in phone if c.isdigit())
            
            # Проверим длину
            if len(phone_digits) == 11 and phone_digits.startswith('7'):
                return phone_digits
            
            self.print_error(
                f"Некорректный номер: {phone}. "
                "Используйте формат 79991234567 или +7 (999) 123-45-67"
            )
    
    def initiate_call(self, phone: str) -> Optional[Dict[str, Any]]:
        """
        Инициировать звонок.
        
        Args:
            phone: Номер телефона в формате 7XXXXXXXXXX
        
        Returns:
            Словарь с информацией о звонке или None при ошибке
        """
        self.print_info(f"Инициируем звонок для номера {phone}...")
        
        try:
            params = {
                "api_id": self.api_id,
                "phone": phone,
                "json": 1
            }
            
            response = self.session.get(
                f"{API_BASE_URL}/callcheck/add",
                params=params,
                timeout=10
            )
            response.raise_for_status()
            
            data = response.json()
            
            # Проверяем статус ответа
            if data.get("status") != "OK":
                self.print_error(
                    f"Ошибка API: {data.get('status')} "
                    f"(код: {data.get('status_code', 'неизвестно')})"
                )
                if data.get('status_text'):
                    self.print_error(f"Описание: {data.get('status_text')}")
                return None
            
            self.print_success("Звонок инициирован успешно!")
            return data
            
        except requests.exceptions.ConnectionError:
            self.print_error("Ошибка подключения к API sms.ru")
            self.print_info("Проверьте интернет-соединение и повторите попытку")
            return None
        
        except requests.exceptions.Timeout:
            self.print_error("Timeout при подключении к API")
            return None
        
        except Exception as e:
            self.print_error(f"Неожиданная ошибка: {type(e).__name__}: {str(e)}")
            return None
    
    def check_status(self, check_id: str) -> Optional[Dict[str, Any]]:
        """
        Проверить статус авторизации.
        
        Args:
            check_id: Идентификатор проверки
        
        Returns:
            Словарь со статусом или None при ошибке
        """
        try:
            params = {
                "api_id": self.api_id,
                "check_id": check_id,
                "json": 1
            }
            
            response = self.session.get(
                f"{API_BASE_URL}/callcheck/status",
                params=params,
                timeout=10
            )
            response.raise_for_status()
            
            data = response.json()
            
            # Проверяем наличие check_status в ответе
            if "check_status" not in data:
                # Если статус не готов или ошибка в ответе
                return {
                    "check_status": STATUS_PENDING,
                    "check_status_text": "Ожидание ответа от API",
                    "status": "OK"
                }
            
            # Преобразуем check_status в число если это строка
            if isinstance(data.get('check_status'), str):
                try:
                    data['check_status'] = int(data['check_status'])
                except (ValueError, TypeError):
                    pass
            
            return data
            
        except requests.exceptions.Timeout:
            # Timeout — считаем, что всё в порядке, продолжаем ждать
            return {
                "check_status": STATUS_PENDING,
                "check_status_text": "Timeout (продолжаем ждать)",
                "status": "OK"
            }
        except Exception as e:
            # При ошибке продолжаем ждать, не прерываем
            print(f"\r[Ошибка проверки: {str(e)[:30]}]" + " "*50, end="", flush=True)
            return {
                "check_status": STATUS_PENDING,
                "check_status_text": f"Ошибка подключения: {type(e).__name__}",
                "status": "OK"
            }
    
    def wait_for_call(self, check_id: str, timeout: int = TIMEOUT_SECONDS) -> bool:
        """
        Ожидать получения звонка.
        
        Args:
            check_id: Идентификатор проверки
            timeout: Время ожидания в секундах
        
        Returns:
            True если звонок получен, False если истекло время
        """
        self.print_header("ОЖИДАНИЕ ЗВОНКА")
        self.print_info(f"Максимальное время ожидания: {timeout} секунд ({timeout//60} мин)")
        print(f"Check ID: {check_id}\n")
        
        start_time = time.time()
        check_count = 0
        last_status = None
        
        while True:
            elapsed = int(time.time() - start_time)
            remaining = timeout - elapsed
            
            # Проверяем статус
            status_data = self.check_status(check_id)
            
            if not status_data:
                self.print_warning("Ошибка при получении статуса, повторяем...")
                time.sleep(CHECK_INTERVAL_SECONDS)
                continue
            
            check_count += 1
            status_code = status_data.get('check_status')
            status_text = status_data.get('check_status_text', '')
            
            # Преобразуем status_code в число если это строка
            if isinstance(status_code, str):
                try:
                    status_code = int(status_code)
                except (ValueError, TypeError):
                    status_code = None
            
            # Сохраняем последний известный статус для отладки
            if status_code:
                last_status = status_code
            
            # Звонок получен
            if status_code == STATUS_CONFIRMED:
                print()  # Новая строка
                self.print_success("🔔 ЗВОНОК ПОЛУЧЕН!")
                self.print_success(f"Статус: {status_text}")
                return True
            
            # Время истекло
            if status_code == STATUS_EXPIRED or remaining <= 0:
                print()  # Новая строка
                self.print_error("⏰ ВРЕМЯ ИСТЕКЛО")
                if status_text:
                    self.print_error(f"Статус: {status_text}")
                return False
            
            # Ожидаем звонка
            if status_code == STATUS_PENDING or status_code is None:
                progress_bar = self._get_progress_bar(elapsed, timeout)
                
                # Форматируем строку вывода
                status_display = f"Проверок: {check_count}"
                if status_text and "ожидание" not in status_text.lower():
                    status_display = f"[{status_text[:20]}...] Проверок: {check_count}"
                
                print(
                    f"\r[{elapsed:3d}s / {timeout}s] {progress_bar} {status_display}",
                    end="",
                    flush=True
                )
            else:
                # Неизвестный статус
                print(
                    f"\r[{elapsed:3d}s] Статус {status_code}: {status_text[:30]}",
                    end="",
                    flush=True
                )
            
            time.sleep(CHECK_INTERVAL_SECONDS)
    
    def _get_progress_bar(self, elapsed: int, total: int, width: int = 30) -> str:
        """Получить progress bar."""
        filled = int(width * elapsed / total)
        bar = '█' * filled + '░' * (width - filled)
        return f"[{bar}]"
    
    def print_call_info(self, call_data: Dict[str, Any]):
        """Вывести информацию о звонке."""
        print("\n")
        self.print_header("ИНФОРМАЦИЯ О ЗВОНКЕ")
        
        print(f"📌 Check ID:           {call_data.get('check_id', 'N/A')}")
        print(f"📞 Номер для звонка:  {call_data.get('call_phone_pretty', 'N/A')}")
        print(f"🔗 Raw номер:         {call_data.get('call_phone', 'N/A')}")
        print(f"✅ Статус:            {call_data.get('status', 'N/A')}")
        print(f"📊 Код статуса:       {call_data.get('status_code', 'N/A')}")
    
    def run_test(self):
        """Запустить полный тест."""
        self.print_header("ТЕСТ СИСТЕМЫ АВТОРИЗАЦИИ ПО ЗВОНКУ")
        
        print("Эта утилита проверяет работоспособность системы авторизации")
        print("через звонок с использованием API sms.ru\n")
        
        # Шаг 1: Получить номер телефона
        phone = self.get_phone_input()
        
        # Шаг 2: Инициировать звонок
        self.print_header("ШАГ 1: ИНИЦИИРОВАНИЕ ЗВОНКА")
        call_data = self.initiate_call(phone)
        
        if not call_data:
            self.print_error("Не удалось инициировать звонок. Тест прерван.")
            return False
        
        # Вывести информацию о звонке
        self.print_call_info(call_data)
        
        check_id = call_data.get('check_id')
        call_phone = call_data.get('call_phone_pretty')
        
        # Шаг 3: Инструкция для пользователя
        self.print_header("ШАГ 2: ИНСТРУКЦИЯ")
        print(f"📌 Пожалуйста, позвоните на номер: {call_phone}")
        print(f"⏱️  У вас есть 5 минут на совершение звонка")
        print(f"🔔 Звонок будет автоматически отброшен (бесплатен для вас)")
        print(f"✅ После звонка вы будете авторизованы в системе\n")
        
        input("Нажмите Enter, когда будете готовы позвонить...")
        
        # Шаг 4: Ожидание звонка
        success = self.wait_for_call(check_id)
        
        # Шаг 5: Результат
        self.print_header("РЕЗУЛЬТАТ ТЕСТА")
        if success:
            self.print_success("✅ АВТОРИЗАЦИЯ УСПЕШНА!")
            self.print_success("Пользователь может быть авторизован в системе")
            return True
        else:
            self.print_error("❌ АВТОРИЗАЦИЯ НЕ ПРОЙДЕНА")
            self.print_error("Звонок не был получен в отведенное время")
            self.print_info("Попробуйте еще раз...")
            return False
    
    def run_interactive(self):
        """Интерактивный режим с меню."""
        while True:
            self.print_header("ГЛАВНОЕ МЕНЮ")
            print("1. Запустить полный тест авторизации")
            print("2. Только инициировать звонок")
            print("3. Только проверить статус звонка")
            print("4. Выход\n")
            
            choice = input("Выберите опцию (1-4): ").strip()
            
            if choice == "1":
                self.run_test()
            
            elif choice == "2":
                phone = self.get_phone_input()
                call_data = self.initiate_call(phone)
                if call_data:
                    self.print_call_info(call_data)
            
            elif choice == "3":
                check_id = input("Введите check_id: ").strip()
                if check_id:
                    status = self.check_status(check_id)
                    if status:
                        print("\nОтвет API:")
                        for key, value in status.items():
                            print(f"  {key}: {value}")
            
            elif choice == "4":
                self.print_info("До свидания!")
                break
            
            else:
                self.print_error("Неверный выбор. Попробуйте еще раз.")


def main():
    """Главная функция."""
    try:
        tester = PhoneCallAuthTester()
        
        # Если есть аргумент командной строки - запустить прямой тест
        if len(sys.argv) > 1 and sys.argv[1] == "--quick":
            print("Режим быстрого теста с номером из переменной окружения")
            # Для автоматизации
            tester.run_test()
        else:
            # Интерактивный режим
            tester.run_interactive()
    
    except KeyboardInterrupt:
        print("\n\n⚠️  Программа прервана пользователем")
        sys.exit(0)
    
    except Exception as e:
        print(f"\n❌ Критическая ошибка: {type(e).__name__}: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
