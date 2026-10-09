
import os

from flask import Flask, jsonify
from flask_cors import CORS
from pymongo import MongoClient

from config.config import (
    MONGO_URI,
    FIREBASE_DB_URL
)

from repositories.usuario_repository import UsuarioRepository
from repositories.pedido_repository import PedidoRepository

from routes.auth_routes import crear_auth_blueprint
from routes.pedidos_routes import crear_pedidos_blueprint
from routes.delivery_routes import crear_delivery_blueprint


# =========================================================
# CREACIÓN DE LA APLICACIÓN
# =========================================================

app = Flask(__name__)


# =========================================================
# CONFIGURACIÓN CORS
# =========================================================

CORS(
    app,
    origins="*",
    allow_headers=[
        "Authorization",
        "Content-Type"
    ],
    methods=[
        "GET",
        "POST",
        "PATCH",
        "DELETE",
        "OPTIONS"
    ]
)


# =========================================================
# RESPUESTA A SOLICITUDES PREVIAS CORS (OPTIONS)
# =========================================================

@app.route(
    "/api/<path:ruta>",
    methods=["OPTIONS"]
)
def responder_preflight(ruta):
    return "", 204

# =========================================================
# VALIDAR CONFIGURACIÓN DE MONGODB
# =========================================================

if not MONGO_URI:
    raise RuntimeError(
        "Falta configurar la variable de entorno MONGO_URI"
    )


# =========================================================
# CONEXIÓN CON MONGODB
# =========================================================

try:
    client = MongoClient(
        MONGO_URI,
        serverSelectionTimeoutMS=5000
    )

    client.admin.command("ping")

    db = client["ecovida_db"]
    usuarios_col = db["usuarios"]

    print("Conexión exitosa con MongoDB Atlas.")

except Exception as e:
    print(f"Error de conexión con MongoDB: {e}")
    raise RuntimeError(
        "No se puede iniciar EcoVida sin conexión con MongoDB"
    ) from e


# =========================================================
# CREACIÓN DE REPOSITORIOS
# =========================================================

usuario_repository = UsuarioRepository(
    usuarios_col
)

pedido_repository = PedidoRepository(
    FIREBASE_DB_URL
)


# =========================================================
# REGISTRO DE RUTAS
# =========================================================

app.register_blueprint(
    crear_auth_blueprint(usuario_repository)
)

app.register_blueprint(
    crear_pedidos_blueprint(
        usuario_repository,
        pedido_repository
    )
)

app.register_blueprint(
    crear_delivery_blueprint()
)


# =========================================================
# ENDPOINT PRINCIPAL
# =========================================================

@app.route("/", methods=["GET"])
def inicio():
    return jsonify({
        "mensaje": "API EcoVida funcionando correctamente",
        "sistema": "MongoDB + Firebase",
        "estado": "OK"
    })


# =========================================================
# EJECUCIÓN LOCAL
# =========================================================

if __name__ == "__main__":
    entorno = os.environ.get(
        "FLASK_ENV",
        "production"
    ).lower()

    app.run(
        debug=(entorno == "development"),
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000))
    )