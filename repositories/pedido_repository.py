import requests


class PedidoRepository:

    def __init__(self, firebase_db_url):
        self.firebase_db_url = firebase_db_url

    def obtener_todos(self):
        """
        Obtiene todos los pedidos almacenados en Firebase.
        """
        respuesta = requests.get(
            f"{self.firebase_db_url}/pedidos.json",
            timeout=15
        )

        if not respuesta.ok:
            raise requests.RequestException(
                f"Firebase respondió con código {respuesta.status_code}"
            )

        return respuesta.json() or {}

    def obtener_por_id(self, id_pedido):
        """
        Obtiene un pedido específico desde Firebase.
        """
        respuesta = requests.get(
            f"{self.firebase_db_url}/pedidos/{id_pedido}.json",
            timeout=15
        )

        if not respuesta.ok:
            raise requests.RequestException(
                f"Firebase respondió con código {respuesta.status_code}"
            )

        return respuesta.json()

    def actualizar_estado(self, id_pedido, nuevo_estado):
        """
        Actualiza únicamente el estado de un pedido.
        """
        respuesta = requests.patch(
            f"{self.firebase_db_url}/pedidos/{id_pedido}.json",
            json={
                "estado": nuevo_estado
            },
            timeout=15
        )

        if not respuesta.ok:
            raise requests.RequestException(
                f"Firebase respondió con código {respuesta.status_code}"
            )

        return respuesta