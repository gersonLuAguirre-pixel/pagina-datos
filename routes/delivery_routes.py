from flask import Blueprint, jsonify

from services.delivery_service import (
    obtener_costo_envio
)


def crear_delivery_blueprint():

    delivery_bp = Blueprint(
        "delivery",
        __name__,
        url_prefix="/api"
    )

    @delivery_bp.route(
        "/delivery",
        methods=["GET"]
    )
    def obtener_delivery():

        try:

            costo = obtener_costo_envio()

            return jsonify({
                "costoEnvio": costo
            }), 200

        except Exception as e:

            return jsonify({
                "error": f"Error al obtener costo de envío: {str(e)}"
            }), 500

    return delivery_bp