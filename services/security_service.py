
import logging

import jwt

from config.config import SECRET_KEY


logger = logging.getLogger(__name__)


# =====================================================
# EXTRAER TOKEN JWT
# =====================================================

def extraer_token(authorization):
    """
    Extrae el token JWT desde la cabecera Authorization.
    """

    if not authorization:
        return None, "No se proporcionó el token de acceso"

    partes = authorization.strip().split()

    if len(partes) != 2 or partes[0].lower() != "bearer":
        return None, "Formato de token inválido"

    token = partes[1].strip()

    if not token:
        return None, "Formato de token inválido"

    return token, None


# =====================================================
# DECODIFICAR Y VALIDAR TOKEN
# =====================================================

def decodificar_token(token):
    """
    Decodifica y valida el token JWT.
    """

    if not isinstance(token, str) or not token.strip():
        return None, "Token de acceso inválido"

    try:
        datos_token = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=["HS256"],
            options={
                "require": ["exp"]
            }
        )

        correo = datos_token.get("correo")

        if not isinstance(correo, str) or not correo.strip():
            return None, "El token no contiene un correo válido"

        return datos_token, None

    except jwt.ExpiredSignatureError:
        return None, "El token de sesión ha expirado"

    except jwt.InvalidTokenError:
        return None, "Token de acceso inválido"

    except Exception:
        logger.exception(
            "Error interno al validar el token JWT"
        )

        return None, "No se pudo validar el token de acceso"