"""Django settings for TalentBridge (Django REST Framework + PostgreSQL)."""
from datetime import timedelta
from pathlib import Path
import os

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def env(key, default=""):
    return os.environ.get(key, default)


def env_bool(key, default=False):
    return env(key, str(default)).strip().lower() in {"1", "true", "yes", "on"}


DEBUG = env_bool("APP_DEBUG", False)

SECRET_KEY = os.getenv('SECRET_KEY')

ALLOWED_HOSTS = [h.strip() for h in env("ALLOWED_HOSTS", "").split(",") if h.strip()]



INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "core",
    "accounts",
    "catalog",
    "opportunities",
    "freelance",
    "community",
    "notifications",
    "messaging",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "core.middleware.ActiveAccountMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# Use a dedicated, least-privilege PostgreSQL database role.
# Set DB_SSLMODE=require or verify-full for external/production databases.
# Local PostgreSQL Docker typically does not provide TLS; use prefer locally.
DB_SSLMODE = env("DB_SSLMODE", "prefer" if DEBUG else "require")
if DB_SSLMODE not in {"disable", "allow", "prefer", "require", "verify-ca", "verify-full"}:
    raise RuntimeError("Invalid DB_SSLMODE")
if not DEBUG and DB_SSLMODE in {"disable", "allow", "prefer"}:
    raise RuntimeError("Production requires DB_SSLMODE=require, verify-ca or verify-full")


DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("DB_NAME"),
        "USER": env("DB_USER"),
        "PASSWORD": env("DB_PASSWORD"),
        "HOST": env("DB_HOST"),
        "PORT": env("DB_PORT"),
        "CONN_MAX_AGE": 60,
        "OPTIONS": {
            "sslmode": DB_SSLMODE,
            "connect_timeout": 10,
        },
    }
}

SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
if not DEBUG:
    SECURE_SSL_REDIRECT = env_bool("SECURE_SSL_REDIRECT", True)
    SECURE_HSTS_SECONDS = int(env("SECURE_HSTS_SECONDS", "31536000"))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool("SECURE_HSTS_INCLUDE_SUBDOMAINS", False)
    # Enable only if HTTPS termination/proxy headers are correctly configured.
    if env_bool("TRUST_PROXY_HTTPS", False):
        SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# Bcrypt hashes from existing accounts ($2y$...) can still verify.
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.BCryptSHA256PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher",
    "django.contrib.auth.hashers.ScryptPasswordHasher",
]

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = env("APP_TIMEZONE", "Asia/Kathmandu")
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
# Vite build output is served as the SPA entry point in production.
FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "core.authentication.CsrfSessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "core.pagination.StandardPagination",
    "PAGE_SIZE": 9,
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
        *(["rest_framework.renderers.BrowsableAPIRenderer"] if DEBUG else []),
    ],
    "EXCEPTION_HANDLER": "core.exceptions.api_exception_handler",
}

SESSION_COOKIE_AGE = int(env("SESSION_COOKIE_AGE", "1800"))
SESSION_SAVE_EVERY_REQUEST = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"
CSRF_TRUSTED_ORIGINS = [env("FRONTEND_URL"), env("APP_URL")]
CORS_ALLOWED_ORIGINS = [env("FRONTEND_URL")]
CORS_ALLOW_CREDENTIALS = True

EMAIL_BACKEND_MAP = {
    "console": "django.core.mail.backends.console.EmailBackend",
    "locmem": "django.core.mail.backends.locmem.EmailBackend",
    "smtp": "django.core.mail.backends.smtp.EmailBackend",
}
EMAIL_BACKEND = EMAIL_BACKEND_MAP.get(env("EMAIL_BACKEND", "console"), EMAIL_BACKEND_MAP["console"])
EMAIL_HOST = env("EMAIL_HOST")
EMAIL_PORT = int(env("EMAIL_PORT", "587"))
EMAIL_HOST_USER = env("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD")
EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", True)
EMAIL_USE_SSL = env_bool("EMAIL_USE_SSL", False)
EMAIL_TIMEOUT = int(env("EMAIL_TIMEOUT", "20"))
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", "no-reply@sdgtalent.example")
CONTACT_EMAIL = env("CONTACT_EMAIL", "hello@sdgtalent.example")
APP_URL = env("APP_URL", "http://localhost:8000")

# Recommendations/SDG selections are capped.
MAX_USER_SDGS = 5
