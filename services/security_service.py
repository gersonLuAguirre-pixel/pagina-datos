import jwt

from config.config import SECRET_KEY


def extraer_token(authorization):
    """
    Extrae el token JWT desde la cabecera Authorization.
    """

    if not authorization:
        return None, "No se proporcionó el token de acceso"

    if not authorization.startswith("Bearer "):
        return None, "Formato de token inválido"

    partes = authorization.split(" ")

    if len(partes) != 2 or not partes[1]:
        return None, "Formato de token inválido"

    return partes[1], None


def decodificar_token(token):
    """
    Decodifica y valida el token JWT.
    """

    try:

        datos_token = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=["HS256"]
        )

        correo = datos_token.get("correo")

        if not correo:
            return None, "El token no contiene un correo válido"

        return datos_token, None

    except jwt.ExpiredSignatureError:

        return None, "El token de sesión ha expirado"

    except jwt.InvalidTokenError:

        return None, "Token de acceso inválido"

    except Exception as e:

        return None, (
            "Error al validar credenciales criptográficas: "
            f"{str(e)}"
        )