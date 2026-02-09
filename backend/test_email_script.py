import random
import sys
import os

# Ensure we can import backend modules
sys.path.append('/app')

try:
    from backend.utils.email import send_email_sync
    from backend.core.config import settings
    
    code = str(random.randint(100000, 999999))
    email = 'rbiter@yandex.ru'
    
    print(f"Sending verification code {code} to {email}...")
    
    send_email_sync(
        email_to=email,
        subject='Test Verification Code',
        template_name='verification.html',
        environment={
            'title': 'Подтверждение регистрации',
            'link': f'{settings.BASE_URL}/verify?code={code}'
        }
    )
    print("Email sent successfully!")

except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
