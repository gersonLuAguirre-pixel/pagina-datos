def filtrar_pedidos_por_usuario(datos, correo_usuario):
    """
    Devuelve únicamente los pedidos pertenecientes
    al usuario autenticado.
    """

    pedidos_usuario = {}

    for id_pedido, pedido in datos.items():

        if pedido.get("correoUsuario") == correo_usuario:
            pedidos_usuario[id_pedido] = pedido

    return pedidos_usuario


def validar_estado_pedido(nuevo_estado):
    """
    Comprueba que el nuevo estado sea válido.
    """

    estados_permitidos = [
        "pendiente",
        "procesando",
        "completado",
        "cancelado"
    ]

    return nuevo_estado in estados_permitidos


def validar_transicion_estado(estado_actual, nuevo_estado):
    """
    Comprueba si el cambio de estado solicitado
    está permitido por las reglas del sistema.
    """

    transiciones_permitidas = {
        "pendiente": [
            "procesando",
            "cancelado"
        ],
        "procesando": [
            "completado",
            "cancelado"
        ],
        "completado": [],
        "cancelado": []
    }

    estados_siguientes = transiciones_permitidas.get(
        estado_actual,
        []
    )

    return nuevo_estado in estados_siguientes