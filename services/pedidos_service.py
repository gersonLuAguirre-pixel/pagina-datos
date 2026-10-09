
# =====================================================
# ESTADOS Y TRANSICIONES PERMITIDOS
# =====================================================

ESTADOS_PERMITIDOS = {
    "pendiente",
    "procesando",
    "completado",
    "cancelado"
}

TRANSICIONES_PERMITIDAS = {
    "pendiente": {"procesando", "cancelado"},
    "procesando": {"completado", "cancelado"},
    "completado": set(),
    "cancelado": set()
}


# =====================================================
# FILTRAR PEDIDOS POR USUARIO
# =====================================================

def filtrar_pedidos_por_usuario(datos, correo_usuario):
    """
    Devuelve únicamente los pedidos del usuario autenticado.
    La comparación de correos no distingue mayúsculas.
    """

    correo_buscado = str(
        correo_usuario or ""
    ).strip().lower()

    # Si no hay identidad válida, no devolver pedidos.
    if not correo_buscado:
        return {}

    if not isinstance(datos, dict):
        return {}

    pedidos_usuario = {}

    for id_pedido, pedido in datos.items():

        if not isinstance(pedido, dict):
            continue

        correo_pedido = str(
            pedido.get("correoUsuario") or ""
        ).strip().lower()

        if correo_pedido == correo_buscado:
            pedidos_usuario[id_pedido] = pedido

    return pedidos_usuario


# =====================================================
# VALIDAR ESTADO DEL PEDIDO
# =====================================================

def validar_estado_pedido(nuevo_estado):
    """
    Comprueba si el estado solicitado está permitido.
    """

    if not isinstance(nuevo_estado, str):
        return False

    return nuevo_estado.strip().lower() in ESTADOS_PERMITIDOS


# =====================================================
# VALIDAR TRANSICIÓN DE ESTADO
# =====================================================

def validar_transicion_estado(estado_actual, nuevo_estado):
    """
    Comprueba si el pedido puede pasar de su estado actual
    al nuevo estado solicitado.
    Los pedidos completados o cancelados quedan cerrados.
    """

    estado_actual = str(
        estado_actual or ""
    ).strip().lower()

    nuevo_estado = str(
        nuevo_estado or ""
    ).strip().lower()

    estados_siguientes = TRANSICIONES_PERMITIDAS.get(
        estado_actual,
        set()
    )

    return nuevo_estado in estados_siguientes