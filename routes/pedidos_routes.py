
import logging
from datetime import datetime, timezone

import requests
from flask import Blueprint, request, jsonify

from config.config import MASTER_EMAIL

from services.pedidos_service import (
    filtrar_pedidos_por_usuario,
    validar_estado_pedido,
    validar_transicion_estado
)

from services.security_service import (
    extraer_token,
    decodificar_token
)


logger = logging.getLogger(__name__)


def crear_pedidos_blueprint(usuario_repository, pedido_repository):

    pedidos_bp = Blueprint(
        "pedidos",
        __name__,
        url_prefix="/api"
    )

    # =====================================================
    # OBTENER USUARIO Y DETERMINAR ROL
    # =====================================================

    def obtener_usuario_y_rol(correo):

        if not correo:
            return None, None

        correo = str(correo).strip().lower()
        correo_maestro = str(
            MASTER_EMAIL or ""
        ).strip().lower()

        usuario = usuario_repository.buscar_por_correo(correo)

        if not usuario:
            return None, None

        if correo_maestro and correo == correo_maestro:
            rol = "master"
        else:
            rol_guardado = str(
                usuario.get("rol") or "usuario"
            ).strip().lower()

            # Impide que otro correo obtenga permisos de Master.
            rol = (
                "usuario"
                if rol_guardado == "master"
                else rol_guardado
            )

        return usuario, rol

    # =====================================================
    # VALIDAR TOKEN Y OBTENER IDENTIDAD
    # =====================================================

    def obtener_identidad():

        authorization = request.headers.get("Authorization")

        token, error = extraer_token(authorization)

        if error:
            return None, None, (
                jsonify({"error": error}),
                401
            )

        datos_token, error = decodificar_token(token)

        if error:
            return None, None, (
                jsonify({"error": error}),
                401
            )

        correo = str(
            datos_token.get("correo") or ""
        ).strip().lower()

        usuario, rol = obtener_usuario_y_rol(correo)

        if not usuario:
            return None, None, (
                jsonify({
                    "error": "El usuario asociado a la sesión no existe"
                }),
                401
            )

        return correo, rol, None

    # =====================================================
    # VALIDAR CUERPO JSON
    # =====================================================

    def obtener_datos_json():

        datos = request.get_json(silent=True)

        if not isinstance(datos, dict):
            return None

        return datos

    # =====================================================
    # OBTENER PEDIDOS
    # =====================================================

    @pedidos_bp.route("/pedidos", methods=["GET", "OPTIONS"])
    def obtener_pedidos():

        if request.method == "OPTIONS":
            return jsonify({"status": "ok"}), 200

        try:
            correo, rol, respuesta_error = obtener_identidad()

            if respuesta_error:
                return respuesta_error

            datos = pedido_repository.obtener_todos()

            if rol == "master":
                return jsonify({
                    "rol": "master",
                    "pedidos": datos
                }), 200

            pedidos_usuario = filtrar_pedidos_por_usuario(
                datos,
                correo
            )

            return jsonify({
                "rol": "usuario",
                "pedidos": pedidos_usuario
            }), 200

        except requests.RequestException:
            logger.exception(
                "Error de comunicación con Firebase al consultar pedidos"
            )

            return jsonify({
                "error": "Error de comunicación con Firebase"
            }), 502

        except Exception:
            logger.exception(
                "Error interno al consultar pedidos"
            )

            return jsonify({
                "error": "No se pudieron obtener los pedidos"
            }), 500

    # =====================================================
    # ACTUALIZAR ESTADO DEL PEDIDO (MASTER)
    # =====================================================

    @pedidos_bp.route("/pedidos/<id_pedido>", methods=["PATCH"])
    def actualizar_estado_pedido(id_pedido):

        try:
            correo, rol, respuesta_error = obtener_identidad()

            if respuesta_error:
                return respuesta_error

            if rol != "master":
                return jsonify({
                    "error": (
                        "Solo el usuario Master puede modificar "
                        "el estado de los pedidos"
                    )
                }), 403

            datos = obtener_datos_json()

            if datos is None:
                return jsonify({
                    "error": "El cuerpo de la solicitud debe ser JSON válido"
                }), 400

            nuevo_estado = datos.get("estado")

            if not validar_estado_pedido(nuevo_estado):
                return jsonify({
                    "error": "Estado de pedido no válido"
                }), 400

            nuevo_estado = str(nuevo_estado).strip().lower()

            pedido = pedido_repository.obtener_por_id(id_pedido)

            if not pedido:
                return jsonify({
                    "error": "El pedido especificado no existe"
                }), 404

            estado_actual = str(
                pedido.get("estado", "pendiente")
            ).strip().lower()

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

            pedido_repository.actualizar_estado(
                id_pedido,
                nuevo_estado
            )

            return jsonify({
                "message": "Estado del pedido actualizado correctamente",
                "estado": nuevo_estado
            }), 200

        except requests.RequestException:
            logger.exception(
                "Error de Firebase al actualizar el estado del pedido"
            )

            return jsonify({
                "error": "Error de comunicación con Firebase"
            }), 502

        except Exception:
            logger.exception(
                "Error interno al actualizar el estado del pedido"
            )

            return jsonify({
                "error": "No se pudo actualizar el estado del pedido"
            }), 500

    # =====================================================
    # SOLICITAR CANCELACIÓN (USUARIO)
    # =====================================================

    @pedidos_bp.route(
        "/pedidos/<id_pedido>/solicitud-cancelacion",
        methods=["POST"]
    )
    def solicitar_cancelacion_pedido(id_pedido):

        try:
            correo, rol, respuesta_error = obtener_identidad()

            if respuesta_error:
                return respuesta_error

            if rol == "master":
                return jsonify({
                    "error": (
                        "El usuario Master no puede solicitar "
                        "la cancelación como cliente"
                    )
                }), 403

            datos = obtener_datos_json()

            if datos is None:
                return jsonify({
                    "error": "El cuerpo de la solicitud debe ser JSON válido"
                }), 400

            motivo = str(
                datos.get("motivo") or ""
            ).strip()

            if not motivo:
                return jsonify({
                    "error": "Debes indicar el motivo de la cancelación"
                }), 400

            if len(motivo) > 1000:
                return jsonify({
                    "error": "El motivo no puede superar los 1000 caracteres"
                }), 400

            pedido = pedido_repository.obtener_por_id(id_pedido)

            if not pedido:
                return jsonify({
                    "error": "El pedido especificado no existe"
                }), 404

            correo_pedido = str(
                pedido.get("correoUsuario") or ""
            ).strip().lower()

            if correo_pedido != correo:
                return jsonify({
                    "error": (
                        "No tienes permiso para solicitar "
                        "la cancelación de este pedido"
                    )
                }), 403

            estado = str(
                pedido.get("estado", "pendiente")
            ).strip().lower()

            if estado not in ["pendiente", "procesando"]:
                return jsonify({
                    "error": (
                        "Este pedido no admite solicitudes de cancelación "
                        "desde la página. Contacta con soporte."
                    )
                }), 400

            solicitud_actual = (
                pedido.get("solicitudCancelacion") or {}
            )

            if solicitud_actual.get("estado") == "pendiente":
                return jsonify({
                    "error": (
                        "Este pedido ya tiene una solicitud "
                        "de cancelación pendiente"
                    )
                }), 409

            solicitud = {
                "estado": "pendiente",
                "motivo": motivo,
                "fechaSolicitud": datetime.now(
                    timezone.utc
                ).isoformat(),
                "correoUsuario": correo
            }

            pedido_repository.actualizar_solicitud_cancelacion(
                id_pedido,
                solicitud
            )

            return jsonify({
                "message": "Solicitud de cancelación registrada correctamente",
                "solicitudCancelacion": solicitud
            }), 200

        except requests.RequestException:
            logger.exception(
                "Error de Firebase al solicitar la cancelación"
            )

            return jsonify({
                "error": "Error de comunicación con Firebase"
            }), 502

        except Exception:
            logger.exception(
                "Error interno al solicitar la cancelación"
            )

            return jsonify({
                "error": "No se pudo registrar la solicitud de cancelación"
            }), 500

    # =====================================================
    # RESOLVER SOLICITUD DE CANCELACIÓN (MASTER)
    # =====================================================

    @pedidos_bp.route(
        "/pedidos/<id_pedido>/solicitud-cancelacion",
        methods=["PATCH"]
    )
    def resolver_solicitud_cancelacion(id_pedido):

        try:
            correo, rol, respuesta_error = obtener_identidad()

            if respuesta_error:
                return respuesta_error

            if rol != "master":
                return jsonify({
                    "error": "Solo el usuario Master puede resolver solicitudes"
                }), 403

            datos = obtener_datos_json()

            if datos is None:
                return jsonify({
                    "error": "El cuerpo de la solicitud debe ser JSON válido"
                }), 400

            decision = str(
                datos.get("decision") or ""
            ).strip().lower()

            respuesta_master = str(
                datos.get("respuesta") or ""
            ).strip()

            if decision not in ["aprobar", "rechazar"]:
                return jsonify({
                    "error": "La decisión debe ser aprobar o rechazar"
                }), 400

            if len(respuesta_master) > 1000:
                return jsonify({
                    "error": "La respuesta no puede superar los 1000 caracteres"
                }), 400

            pedido = pedido_repository.obtener_por_id(id_pedido)

            if not pedido:
                return jsonify({
                    "error": "El pedido especificado no existe"
                }), 404

            solicitud = pedido.get("solicitudCancelacion") or {}

            if solicitud.get("estado") != "pendiente":
                return jsonify({
                    "error": "El pedido no tiene una solicitud pendiente"
                }), 409

            estado_actual = str(
                pedido.get("estado", "pendiente")
            ).strip().lower()

            nuevo_estado = None

            if decision == "aprobar":

                if estado_actual not in ["pendiente", "procesando"]:
                    return jsonify({
                        "error": (
                            "El estado actual del pedido "
                            "no permite cancelarlo"
                        )
                    }), 409

                solicitud["estado"] = "aprobada"
                nuevo_estado = "cancelado"

            else:
                solicitud["estado"] = "rechazada"

            solicitud["fechaResolucion"] = datetime.now(
                timezone.utc
            ).isoformat()

            solicitud["resueltaPor"] = correo
            solicitud["respuestaMaster"] = respuesta_master

            pedido_repository.resolver_solicitud_cancelacion(
                id_pedido,
                solicitud,
                nuevo_estado
            )

            return jsonify({
                "message": (
                    "Solicitud aprobada correctamente"
                    if decision == "aprobar"
                    else "Solicitud rechazada correctamente"
                ),
                "solicitudCancelacion": solicitud
            }), 200

        except requests.RequestException:
            logger.exception(
                "Error de Firebase al resolver la solicitud de cancelación"
            )

            return jsonify({
                "error": "Error de comunicación con Firebase"
            }), 502

        except Exception:
            logger.exception(
                "Error interno al resolver la solicitud de cancelación"
            )

            return jsonify({
                "error": "No se pudo resolver la solicitud de cancelación"
            }), 500

    return pedidos_bp