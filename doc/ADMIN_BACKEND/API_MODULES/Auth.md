# Модуль Auth (Admin)

Отвечает за аутентификацию администраторов и двухфакторную защиту.

## Эндпоинты

### `POST /api/v1/auth/login`
Первичный вход в систему по email и паролю.

*   **Тело запроса**: `LoginRequest` (email, password).
*   **Ответ**: `LoginResponse`
    *   `state`: `2fa_required` (если 2FA уже настроена) или `2fa_setup_required` (если первый вход).
    *   `temp_token`: Временный токен (pre-auth), необходимый для следующего шага.

### `POST /api/v1/auth/2fa/setup`
Настройка 2FA для нового администратора.

*   **Параметры**: `temp_token` (в query).
*   **Ответ**: `TwoFASetupResponse`
    *   `secret`: Секретный ключ (для ручного ввода).
    *   `otpauth_url`: URL для генерации QR-кода.

### `POST /api/v1/auth/2fa/verify`
Подтверждение кода и получение токенов доступа.

*   **Тело запроса**: `TwoFAVerifyRequest`
    *   `temp_token`: Токен с первого шага.
    *   `code`: 6-значный код из приложения.
*   **Ответ**: `Token` (access_token, refresh_token).
