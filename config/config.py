import os

MONGO_URI = os.environ.get("MONGO_URI")

SECRET_KEY = os.environ.get(
    "SECRET_KEY",
    "LLAVE_SECRETA_SUPER_SEGURA_ECOVIDA"
)

MASTER_EMAIL = os.environ.get(
    "MASTER_EMAIL",
    "master@ecovida.com"
)

FIREBASE_DB_URL = os.environ.get(
    "FIREBASE_DB_URL",
    "https://pagina-hosting-c6ec9-default-rtdb.firebaseio.com"
)