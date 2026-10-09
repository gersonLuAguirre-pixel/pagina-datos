
import logging

from flask import Blueprint, jsonify

from services.delivery_service import obtener_costo_envio


logger = logging.getLogger(__name__)


def crear_delivery_blueprint():

    delivery_bp = Blueprint(
        "delivery",
        __name__,
        url_prefix="/api"
    )

    @delivery_bp.route("/delivery", methods=["GET"])
    def obtener_delivery():

        try:
            costo = obtener_costo_envio()

            return jsonify({
                "costoEnvio": costo
            }), 200

        except Exception:
            logger.exception(
                "Error al obtener el costo de envío"
            )

            return jsonify({
                "error": "No se pudo obtener el costo de envío"
            }), 500

    return delivery_bp