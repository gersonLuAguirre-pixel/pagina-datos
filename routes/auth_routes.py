
import logging

from flask import Blueprint, request, jsonify

from services.auth_service import (
    registrar_usuario,
    autenticar_usuario
)


logger = logging.getLogger(__name__)


def crear_auth_blueprint(usuario_repository):

    auth_bp = Blueprint(
        "auth",
        __name__,
        url_prefix="/api"
    )

    # =====================================================
    # REGISTRO DE USUARIOS
    # =====================================================

    @auth_bp.route("/register", methods=["POST"])
    def register():

        datos = request.get_json(silent=True)

        if not isinstance(datos, dict):
            return jsonify({
                "error": "No se recibieron datos válidos"
            }), 400

        nombre = datos.get("nombre")
        email = datos.get("correo")
        password = datos.get("contrasena")

        if not all([nombre, email, password]):
            return jsonify({
                "error": "Todos los campos son obligatorios"
            }), 400

        try:
            usuario, error = registrar_usuario(
                usuario_repository,
                nombre,
                email,
                password
            )

            if error:
                return jsonify({
                    "error": error
                }), 400

            return jsonify({
                "message": "Usuario registrado exitosamente",
                "usuario": usuario
            }), 201

        except Exception:
            logger.exception(
                "Error interno durante el registro de usuario"
            )

            return jsonify({
                "error": "Ocurrió un error interno al registrar el usuario"
            }), 500

    # =====================================================
    # INICIO DE SESIÓN
    # =====================================================

    @auth_bp.route("/login", methods=["POST"])
    def login():

        datos = request.get_json(silent=True)

        if not isinstance(datos, dict):
            return jsonify({
                "error": "No se recibieron datos válidos"
            }), 400

        email = datos.get("correo")
        password = datos.get("contrasena")

        if not email or not password:
            return jsonify({
                "error": "El correo y la contraseña son obligatorios"
            }), 400

        try:
            resultado, error = autenticar_usuario(
                usuario_repository,
                email,
                password
            )

            if error:
                return jsonify({
                    "error": error
                }), 401

            return jsonify({
                "message": "Autenticación válida",
                **resultado
            }), 200

        except Exception:
            logger.exception(
                "Error interno durante la autenticación"
            )

            return jsonify({
                "error": "Ocurrió un error interno al iniciar sesión"
            }), 500

    return auth_bp