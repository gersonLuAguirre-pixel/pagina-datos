
import requests


class PedidoRepository:

    def __init__(self, firebase_db_url):
        if not firebase_db_url:
            raise ValueError(
                "Falta configurar la URL de Firebase"
            )

        self.firebase_db_url = firebase_db_url.rstrip("/")

    # =====================================================
    # VALIDAR ID DEL PEDIDO
    # =====================================================

    @staticmethod
    def _validar_id(id_pedido):
        if not isinstance(id_pedido, str) or not id_pedido.strip():
            raise ValueError("El ID del pedido no es válido")

        return id_pedido.strip()

    # =====================================================
    # VALIDAR RESPUESTA DE FIREBASE
    # =====================================================

    @staticmethod
    def _validar_respuesta(respuesta):
        respuesta.raise_for_status()
        return respuesta

    # =====================================================
    # OBTENER TODOS LOS PEDIDOS
    # =====================================================

    def obtener_todos(self):
        respuesta = requests.get(
            f"{self.firebase_db_url}/pedidos.json",
            timeout=15
        )

        self._validar_respuesta(respuesta)

        return respuesta.json() or {}

    # =====================================================
    # OBTENER UN PEDIDO POR ID
    # =====================================================

    def obtener_por_id(self, id_pedido):
        id_pedido = self._validar_id(id_pedido)

        respuesta = requests.get(
            f"{self.firebase_db_url}/pedidos/{id_pedido}.json",
            timeout=15
        )

        self._validar_respuesta(respuesta)

        return respuesta.json()

    # =====================================================
    # ACTUALIZAR ESTADO DEL PEDIDO
    # =====================================================

    def actualizar_estado(self, id_pedido, nuevo_estado):
        id_pedido = self._validar_id(id_pedido)

        respuesta = requests.patch(
            f"{self.firebase_db_url}/pedidos/{id_pedido}.json",
            json={
                "estado": nuevo_estado
            },
            timeout=15
        )

        self._validar_respuesta(respuesta)

        return respuesta.json()

    # =====================================================
    # REGISTRAR SOLICITUD DE CANCELACIÓN
    # =====================================================

    def actualizar_solicitud_cancelacion(
        self,
        id_pedido,
        solicitud
    ):
        id_pedido = self._validar_id(id_pedido)

        respuesta = requests.patch(
            f"{self.firebase_db_url}/pedidos/{id_pedido}.json",
            json={
                "solicitudCancelacion": solicitud
            },
            timeout=15
        )

        self._validar_respuesta(respuesta)

        return respuesta.json()

    # =====================================================
    # RESOLVER SOLICITUD DE CANCELACIÓN
    # =====================================================

    def resolver_solicitud_cancelacion(
        self,
        id_pedido,
        solicitud,
        nuevo_estado=None
    ):
        id_pedido = self._validar_id(id_pedido)

        datos = {
            "solicitudCancelacion": solicitud
        }

        if nuevo_estado is not None:
            datos["estado"] = nuevo_estado

        respuesta = requests.patch(
            f"{self.firebase_db_url}/pedidos/{id_pedido}.json",
            json=datos,
            timeout=15
        )

        self._validar_respuesta(respuesta)

        return respuesta.json()