import os
from pathlib import Path
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

try:
    import environ
except ImportError:  # Allows diagnostics before dependencies are installed.
    environ = None

BASE_DIR = Path(__file__).resolve().parent.parent

# 1. Detect environment and load matching env file
DJANGO_ENV = os.environ.get('DJANGO_ENV', 'local').lower()
if DJANGO_ENV not in ('local', 'production'):
    DJANGO_ENV = 'local'

env_file = f'.env.{DJANGO_ENV}'
env_path = BASE_DIR / env_file

if env_path.exists():
    if environ is not None:
        environ.Env.read_env(str(env_path), overwrite=False)
    else:
        load_dotenv(env_path)
else:
    # Fallback to standard .env
    fallback_path = BASE_DIR / '.env'
    if fallback_path.exists():
        if environ is not None:
            environ.Env.read_env(str(fallback_path), overwrite=False)
        else:
            load_dotenv(fallback_path)

# Helper functions for types
def get_bool(key, default=False):
    val = os.environ.get(key)
    if val is None:
        return default
    return val.strip().lower() in ('true', '1', 'yes')

def get_int(key, default=0):
    val = os.environ.get(key)
    if val is None:
        return default
    try:
        return int(val.strip())
    except ValueError:
        return default

def get_list(key, default=None):
    if default is None:
        default = []
    val = os.environ.get(key)
    if not val:
        return default
    return [item.strip() for item in val.split(',') if item.strip()]

# 2. Schema definition and validation
errors = []
PAYMENT_MODE = os.environ.get('PAYMENT_MODE', 'manual_approval').strip().lower()
if PAYMENT_MODE not in ('manual_approval', 'online'):
    errors.append(
        "PAYMENT_MODE: Unsupported value. Use 'manual_approval' or 'online'."
    )

MEMBERSHIP_ACTIVATION_MODE = os.environ.get(
    'MEMBERSHIP_ACTIVATION_MODE', 'instant'
).strip().lower()
if MEMBERSHIP_ACTIVATION_MODE not in ('instant', 'payment_verified', 'manual_approval'):
    errors.append(
        "MEMBERSHIP_ACTIVATION_MODE: Unsupported value. Use 'instant', "
        "'payment_verified', or 'manual_approval'."
    )

PERMANENT_DELETE_DOCUMENT_POLICY = os.environ.get(
    'PERMANENT_DELETE_DOCUMENT_POLICY', 'delete_immediately'
).strip().lower()
if PERMANENT_DELETE_DOCUMENT_POLICY not in ('delete_immediately', 'retain_metadata'):
    errors.append(
        "PERMANENT_DELETE_DOCUMENT_POLICY: Unsupported value. Use "
        "'delete_immediately' or 'retain_metadata'. Document binary files are "
        "always deleted during permanent account deletion."
    )

# Required vars check helper
def require_env(key, description):
    val = os.environ.get(key)
    if not val or not val.strip():
        errors.append(f"{key}: Missing. ({description})")
        return None
    return val.strip()

# Optional vars check helper
def optional_env(key, default=""):
    return os.environ.get(key, default).strip()

# Run checks based on env
SECRET_KEY = os.environ.get('SECRET_KEY', '').strip()
if DJANGO_ENV in ('staging', 'production'):
    # In production/staging, SECRET_KEY is strictly required and must not be insecure/empty
    if not SECRET_KEY:
        errors.append("SECRET_KEY: Value is required but missing.")
    elif SECRET_KEY.startswith('django-insecure') or len(SECRET_KEY) < 30:
        errors.append("SECRET_KEY: Value is insecure. Must be at least 30 characters and not start with 'django-insecure'.")
    
    # Manual membership approval is the default. Gateway credentials only become
    # mandatory when an operator explicitly enables online payments.
    if PAYMENT_MODE == 'online':
        require_env('RAZORPAY_KEY_ID', 'Payment Gateway Client ID')
        require_env('RAZORPAY_KEY_SECRET', 'Payment Gateway Client Secret')
        require_env('RAZORPAY_WEBHOOK_SECRET', 'Payment Gateway Webhook Verification Secret')
    
    # Database password should be set
    db_pass = os.environ.get('DB_PASSWORD')
    if not db_pass:
        errors.append("DB_PASSWORD: Database password is required and cannot be empty in production/staging.")
else:
    # Development defaults
    if not SECRET_KEY:
        SECRET_KEY = 'django-insecure-development-key-my-dear-partner-2026'

# Let's collect all other config variables
config = {
    'DEBUG': get_bool('DEBUG', default=(DJANGO_ENV == 'local')),
    'ENVIRONMENT': DJANGO_ENV,
    'SECRET_KEY': SECRET_KEY,
    'ALLOWED_HOSTS': get_list('ALLOWED_HOSTS', default=['localhost', '127.0.0.1']),
    'APP_NAME': optional_env('APP_NAME', 'My Dear Partner'),
    'APP_URL': optional_env('APP_URL', 'http://localhost:8000'),
    'FRONTEND_URL': optional_env('FRONTEND_URL', 'http://localhost:3000'),
    'BACKEND_URL': optional_env('BACKEND_URL', 'http://localhost:8000'),
    'API_VERSION': optional_env('API_VERSION', 'v1'),
    
    # Database
    'DB_ENGINE': optional_env('DB_ENGINE', 'django.db.backends.postgresql'),
    'DB_NAME': optional_env('DB_NAME', 'matiromony'),
    'DB_USER': optional_env('DB_USER', 'postgres'),
    'DB_PASSWORD': os.environ.get('DB_PASSWORD', 'postgres'),
    'DB_HOST': optional_env('DB_HOST', 'localhost'),
    'DB_PORT': optional_env('DB_PORT', '5432'),
    # PgBouncer transaction pooling releases the server connection after each
    # transaction, so Django server-side cursors must be opt-in only.
    'DB_DISABLE_SERVER_SIDE_CURSORS': get_bool('DB_DISABLE_SERVER_SIDE_CURSORS', default=False),
    
    # Redis & Cache
    'REDIS_URL': optional_env('REDIS_URL', 'redis://localhost:6379/0'),
    'CACHE_URL': optional_env('CACHE_URL', 'redis://localhost:6379/1'),
    'CELERY_BROKER_URL': optional_env('CELERY_BROKER_URL', 'redis://localhost:6379/0'),
    'CELERY_RESULT_BACKEND': optional_env('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0'),
    
    # JWT
    'JWT_ACCESS_TOKEN_MINUTES': get_int('JWT_ACCESS_TOKEN_MINUTES', 15),
    'JWT_REFRESH_TOKEN_DAYS': get_int('JWT_REFRESH_TOKEN_DAYS', 7),
    'JWT_ALGORITHM': optional_env('JWT_ALGORITHM', 'HS256'),
    
    # Email
    'EMAIL_BACKEND': optional_env('EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend' if DJANGO_ENV == 'local' else 'django.core.mail.backends.smtp.EmailBackend'),
    'EMAIL_HOST': optional_env('EMAIL_HOST', 'localhost'),
    'EMAIL_PORT': get_int('EMAIL_PORT', 1025),
    'EMAIL_HOST_USER': optional_env('EMAIL_HOST_USER', ''),
    'EMAIL_HOST_PASSWORD': optional_env('EMAIL_HOST_PASSWORD', ''),
    'EMAIL_USE_TLS': get_bool('EMAIL_USE_TLS', default=False),
    'DEFAULT_FROM_EMAIL': optional_env('DEFAULT_FROM_EMAIL', 'noreply@mydearpartner.com'),
    
    # SMS
    'SMS_PROVIDER': optional_env('SMS_PROVIDER', 'dummy'),
    'TWILIO_ACCOUNT_SID': optional_env('TWILIO_ACCOUNT_SID', ''),
    'TWILIO_AUTH_TOKEN': optional_env('TWILIO_AUTH_TOKEN', ''),
    'TWILIO_PHONE_NUMBER': optional_env('TWILIO_PHONE_NUMBER', ''),
    
    # Payments
    'PAYMENT_MODE': PAYMENT_MODE,
    'MEMBERSHIP_ACTIVATION_MODE': MEMBERSHIP_ACTIVATION_MODE,
    'PERMANENT_DELETE_DOCUMENT_POLICY': PERMANENT_DELETE_DOCUMENT_POLICY,
    'RAZORPAY_KEY_ID': optional_env('RAZORPAY_KEY_ID', 'rzp_test_placeholder'),
    'RAZORPAY_KEY_SECRET': optional_env('RAZORPAY_KEY_SECRET', 'placeholder_secret'),
    'RAZORPAY_WEBHOOK_SECRET': optional_env('RAZORPAY_WEBHOOK_SECRET', 'placeholder_webhook_secret'),

    # Temporary rollout controls.  The underlying verification and back-office
    # code remains available, but neither is exposed until explicitly enabled.
    'REQUIRE_MEMBER_VERIFICATION': get_bool('REQUIRE_MEMBER_VERIFICATION', default=False),
    'ENABLE_ADMIN_PORTAL': get_bool('ENABLE_ADMIN_PORTAL', default=False),
    
    # Storage
    'USE_S3': get_bool('USE_S3', default=False),
    'AWS_ACCESS_KEY_ID': optional_env('AWS_ACCESS_KEY_ID', ''),
    'AWS_SECRET_ACCESS_KEY': optional_env('AWS_SECRET_ACCESS_KEY', ''),
    'AWS_STORAGE_BUCKET_NAME': optional_env('AWS_STORAGE_BUCKET_NAME', ''),
    'AWS_REGION': optional_env('AWS_REGION', 'ap-south-1'),
    'MEDIA_URL': optional_env('MEDIA_URL', '/media/'),
    'STATIC_URL': optional_env('STATIC_URL', '/static/'),
    
    # Security Headers
    'SECURE_SSL_REDIRECT': get_bool('SECURE_SSL_REDIRECT', default=(DJANGO_ENV in ('staging', 'production'))),
    'SESSION_COOKIE_SECURE': get_bool('SESSION_COOKIE_SECURE', default=(DJANGO_ENV in ('staging', 'production'))),
    'CSRF_COOKIE_SECURE': get_bool('CSRF_COOKIE_SECURE', default=(DJANGO_ENV in ('staging', 'production'))),
    'CORS_ALLOWED_ORIGINS': get_list('CORS_ALLOWED_ORIGINS', default=['http://localhost:3000']),
    'CSRF_TRUSTED_ORIGINS': get_list('CSRF_TRUSTED_ORIGINS', default=['http://localhost:3000', 'http://localhost:8000']),
    'SECURE_HSTS_SECONDS': get_int('SECURE_HSTS_SECONDS', 31536000 if DJANGO_ENV in ('staging', 'production') else 0),
    'SECURE_PROXY_SSL_HEADER': optional_env('SECURE_PROXY_SSL_HEADER', ''),
    
    # Logging & Monitoring
    'LOG_LEVEL': optional_env('LOG_LEVEL', 'INFO'),
    'SENTRY_DSN': optional_env('SENTRY_DSN', ''),
    
    # Rate Limiting
    'LOGIN_RATE_LIMIT': optional_env('LOGIN_RATE_LIMIT', '5/minute'),
    'OTP_RATE_LIMIT': optional_env('OTP_RATE_LIMIT', '3/minute'),
    'API_RATE_LIMIT': optional_env('API_RATE_LIMIT', '1000/day'),
    
    # Feature Flags
    'ENABLE_SIGNUP': get_bool('ENABLE_SIGNUP', default=True),
    'ENABLE_EMAIL_VERIFICATION': get_bool('ENABLE_EMAIL_VERIFICATION', default=True),
    'ENABLE_MOBILE_VERIFICATION': get_bool('ENABLE_MOBILE_VERIFICATION', default=False),
    'ENABLE_TWO_FACTOR': get_bool('ENABLE_TWO_FACTOR', default=False),
    'ENABLE_DEVELOPMENT_SEED': get_bool('ENABLE_DEVELOPMENT_SEED', default=(DJANGO_ENV == 'local')),
    'ENABLE_DEBUG_TOOLBAR': get_bool('ENABLE_DEBUG_TOOLBAR', default=False),
    'ENABLE_SWAGGER': get_bool('ENABLE_SWAGGER', default=(DJANGO_ENV != 'production')),
    'ENABLE_API_DOCS': get_bool('ENABLE_API_DOCS', default=(DJANGO_ENV != 'production')),
}

# If errors occurred, raise a startup crash block explaining which keys failed
if errors:
    error_header = (
        "\n========================================================================\n"
        "DJANGO STARTUP CONFIGURATION ERROR:\n"
        "The following required environment variables are missing or invalid:\n"
    )
    error_body = "\n".join(f"- {err}" for err in errors)
    error_footer = (
        "\n========================================================================\n"
    )
    raise ImproperlyConfigured(f"{error_header}{error_body}{error_footer}")
