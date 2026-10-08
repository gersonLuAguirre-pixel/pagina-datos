from flask import Blueprint, request, jsonify

from services.auth_service import (
    registrar_usuario,
    autenticar_usuario
)


def crear_auth_blueprint(usuario_repository):

    auth_bp = Blueprint(
        "auth",
        __name__,
        url_prefix="/api"
    )

    @auth_bp.route("/register", methods=["POST"])
    def register():

        try:
            datos = request.get_json(silent=True)

            if not datos:
                return jsonify({
                    "error": "No se recibieron datos"
                }), 400

            nombre = datos.get("nombre")
            email = datos.get("correo")
            password = datos.get("contrasena")

            if not nombre or not email or not password:
                return jsonify({
                    "error": "Todos los campos son obligatorios"
                }), 400

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
                "message": "Usuario registrado exitosamente en MongoDB Atlas",
                "usuario": usuario
            }), 201

        except Exception as e:
            return jsonify({
                "error": f"Error interno en el servidor: {str(e)}"
            }), 500

    @auth_bp.route("/login", methods=["POST"])
    def login():

        try:
            datos = request.get_json(silent=True)

            if not datos:
                return jsonify({
                    "error": "No se recibieron datos"
                }), 400

            email = datos.get("correo")
            password = datos.get("contrasena")

            if not email or not password:
                return jsonify({
                    "error": "Faltan datos obligatorios"
                }), 400

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

        except Exception as e:
            return jsonify({
                "error": f"Error en el servidor: {str(e)}"
            }), 500

    return auth_bp