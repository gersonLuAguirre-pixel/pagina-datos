from flask import Blueprint, request, jsonify
import requests

from services.pedidos_service import (
    filtrar_pedidos_por_usuario,
    validar_estado_pedido,
    validar_transicion_estado
)

from services.security_service import (
    extraer_token,
    decodificar_token
)


def crear_pedidos_blueprint(
    usuario_repository,
    pedido_repository
):

    pedidos_bp = Blueprint(
        "pedidos",
        __name__,
        url_prefix="/api"
    )

    @pedidos_bp.route(
        "/pedidos",
        methods=["GET", "OPTIONS"]
    )
    def obtener_pedidos():

        if request.method == "OPTIONS":
            return jsonify({
                "status": "ok"
            }), 200

        try:
            # ==========================================
            # 1. OBTENER TOKEN
            # ==========================================

            authorization = request.headers.get(
                "Authorization"
            )

            token, error = extraer_token(
                authorization
            )

            if error:
                return jsonify({
                    "error": error
                }), 401

            # ==========================================
            # 2. VALIDAR TOKEN
            # ==========================================

            datos_token, error = decodificar_token(
                token
            )

            if error:
                return jsonify({
                    "error": error
                }), 401

            correo = datos_token.get("correo")

            # ==========================================
            # 3. VERIFICAR USUARIO EN MONGODB
            # ==========================================

            usuario = usuario_repository.buscar_por_correo(
                correo
            )

            if not usuario:
                return jsonify({
                    "error": "El usuario asociado al token no existe"
                }), 401

            rol = datos_token.get("rol", "usuario")

            print(
                f"[PEDIDOS] Usuario: {correo} | "
                f"Rol: {rol}"
            )

            # ==========================================
            # 4. CONSULTAR FIREBASE
            # ==========================================

            datos = pedido_repository.obtener_todos()

            # ==========================================
            # 5. MASTER → TODOS LOS PEDIDOS
            # ==========================================

            if rol == "master":

                return jsonify({
                    "rol": "master",
                    "pedidos": datos
                }), 200

            # ==========================================
            # 6. USUARIO → SOLO SUS PEDIDOS
            # ==========================================

            pedidos_usuario = filtrar_pedidos_por_usuario(
                datos,
                correo
            )

            return jsonify({
                "rol": "usuario",
                "pedidos": pedidos_usuario
            }), 200

        except requests.RequestException as e:

            print(
                "[FIREBASE ERROR]",
                str(e)
            )

            return jsonify({
                "error": "Error de comunicación con Firebase"
            }), 500

        except Exception as e:

            print(
                "[PEDIDOS ERROR]",
                str(e)
            )

            return jsonify({
                "error": f"Error interno: {str(e)}"
            }), 500

    @pedidos_bp.route(
        "/pedidos/<id_pedido>",
        methods=["PATCH"]
    )
    def actualizar_estado_pedido(id_pedido):

        try:
            # ==========================================
            # 1. OBTENER TOKEN
            # ==========================================

            authorization = request.headers.get(
                "Authorization"
            )

            token, error = extraer_token(
                authorization
            )

            if error:
                return jsonify({
                    "error": error
                }), 401

            # ==========================================
            # 2. VALIDAR TOKEN
            # ==========================================

            datos_token, error = decodificar_token(
                token
            )

            if error:
                return jsonify({
                    "error": error
                }), 401

            correo = datos_token.get("correo")

            # ==========================================
            # 3. VERIFICAR USUARIO
            # ==========================================

            usuario = usuario_repository.buscar_por_correo(
                correo
            )

            if not usuario:
                return jsonify({
                    "error": "El usuario asociado al token no existe"
                }), 401

            rol = datos_token.get("rol", "usuario")

            # ==========================================
            # 4. OBTENER PEDIDO
            # ==========================================

            pedido = pedido_repository.obtener_por_id(
                id_pedido
            )

            if not pedido:

                return jsonify({
                    "error": "El pedido especificado no existe"
                }), 404

            # ==========================================
            # 5. SOLO MASTER PUEDE MODIFICAR
            # ==========================================

            if rol != "master":

                return jsonify({
                    "error": (
                        "Solo el usuario Master puede "
                        "modificar el estado de los pedidos"
                    )
                }), 403

            # ==========================================
            # 6. OBTENER NUEVO ESTADO
            # ==========================================

            datos = request.get_json(
                silent=True
            ) or {}

            nuevo_estado = datos.get(
                "estado"
            )

            # ==========================================
            # 7. VALIDAR ESTADO
            # ==========================================

            if not validar_estado_pedido(
                nuevo_estado
            ):

                return jsonify({
                    "error": "Estado de pedido no válido"
                }), 400

            # ==========================================
            # 8. VALIDAR TRANSICIÓN
            # ==========================================

            estado_actual = pedido.get(
                "estado",
                "pendiente"
            )

            if not validar_transicion_estado(
                estado_actual,
                nuevo_estado
            ):

                return jsonify({
                    "error": (
                        f"No se puede cambiar el pedido de "
                        f"{estado_actual} a {nuevo_estado}"
                    )
                }), 400

            # ==========================================
            # 9. ACTUALIZAR EN FIREBASE
            # ==========================================

            pedido_repository.actualizar_estado(
                id_pedido,
                nuevo_estado
            )

            return jsonify({
                "message": (
                    "Estado del pedido actualizado "
                    "correctamente"
                ),
                "estado": nuevo_estado
            }), 200

        except requests.RequestException as e:

            print(
                "[FIREBASE ERROR]",
                str(e)
            )

            return jsonify({
                "error": "Error de comunicación con Firebase"
            }), 500

        except Exception as e:

            print(
                "[PEDIDOS ERROR]",
                str(e)
            )

            return jsonify({
                "error": (
                    f"Error al actualizar pedido: {str(e)}"
                )
            }), 500

    return pedidos_bp