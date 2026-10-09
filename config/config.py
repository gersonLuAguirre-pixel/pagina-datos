
import os


# =====================================================
# CONFIGURACIÓN DE MONGODB
# =====================================================

MONGO_URI = os.environ.get("MONGO_URI")


# =====================================================
# SEGURIDAD JWT
# =====================================================

SECRET_KEY = os.environ.get("SECRET_KEY")

if not SECRET_KEY:
    raise RuntimeError(
        "Falta configurar la variable de entorno SECRET_KEY"
    )


# =====================================================
# USUARIO MAESTRO
# =====================================================

MASTER_EMAIL = os.environ.get(
    "MASTER_EMAIL",
    "master@ecovida.com"
).strip().lower()


# =====================================================
# FIREBASE REALTIME DATABASE
# =====================================================

FIREBASE_DB_URL = os.environ.get(
    "FIREBASE_DB_URL",
    "https://pagina-hosting-c6ec9-default-rtdb.firebaseio.com"
).rstrip("/")