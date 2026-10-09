
import datetime
import logging

import bcrypt
import jwt

from config.config import SECRET_KEY, MASTER_EMAIL


logger = logging.getLogger(__name__)


# =====================================================
# DETERMINAR ROL
# =====================================================

def obtener_rol(correo):
    """
    Determina el rol según la configuración del servidor.
    """

    correo = str(correo or "").strip().lower()
    correo_maestro = str(MASTER_EMAIL or "").strip().lower()

    if correo_maestro and correo == correo_maestro:
        return "master"

    return "usuario"


# =====================================================
# REGISTRAR USUARIO
# =====================================================

def registrar_usuario(usuario_repository, nombre, email, password):
    """
    Registra un usuario nuevo.
    El rol se asigna en el servidor y no desde el formulario.
    """

    nombre = str(nombre or "").strip()
    email = str(email or "").strip().lower()

    if not nombre or not email or not isinstance(password, str) or not password:
        return None, "Todos los campos son obligatorios"

    if "@" not in email or email.startswith("@") or email.endswith("@"):
        return None, "El correo electrónico no es válido"

    if len(password) < 8:
        return None, "La contraseña debe tener mínimo 8 caracteres"

    if len(password.encode("utf-8")) > 72:
        return None, "La contraseña no puede superar los 72 bytes"

    # La cuenta Master no puede crearse mediante el registro público.
    correo_maestro = str(MASTER_EMAIL or "").strip().lower()

    if correo_maestro and email == correo_maestro:
        return None, "No se puede registrar esta cuenta desde el formulario"

    try:
        usuario_existente = usuario_repository.buscar_por_correo(email)

        if usuario_existente:
            return None, "El correo ya se encuentra registrado"

        password_encriptada = bcrypt.hashpw(
            password.encode("utf-8"),
            bcrypt.gensalt()
        )

        nuevo_usuario = {
            "nombre": nombre,
            "correo": email,
            "contrasena": password_encriptada,
            "rol": "usuario"
        }

        usuario_repository.crear_usuario(nuevo_usuario)

        return {
            "nombre": nombre,
            "correo": email,
            "rol": "usuario"
        }, None

    except Exception:
        logger.exception("Error interno al registrar usuario")

        return None, "No se pudo completar el registro"


# =====================================================
# AUTENTICAR USUARIO
# =====================================================

def autenticar_usuario(usuario_repository, email, password):
    """
    Verifica las credenciales y genera un token JWT.
    """

    email = str(email or "").strip().lower()

    if not email or not isinstance(password, str) or not password:
        return None, "Correo o contraseña incorrectos"

    try:
        usuario = usuario_repository.buscar_por_correo(email)

        if not usuario:
            return None, "Correo o contraseña incorrectos"

        contrasena_guardada = usuario.get("contrasena")

        if isinstance(contrasena_guardada, str):
            contrasena_guardada = contrasena_guardada.encode("utf-8")

        if not isinstance(contrasena_guardada, bytes):
            return None, "No se pudo validar la contraseña del usuario"

        try:
            contrasena_valida = bcrypt.checkpw(
                password.encode("utf-8"),
                contrasena_guardada
            )
        except (ValueError, TypeError):
            contrasena_valida = False

        if not contrasena_valida:
            return None, "Correo o contraseña incorrectos"

        # El rol Master depende de la configuración del servidor.
        rol = obtener_rol(email)

        if rol != "master":
            rol_guardado = str(
                usuario.get("rol") or "usuario"
            ).strip().lower()

            # Solo se conserva el rol de usuario permitido.
            # Ningún rol guardado en MongoDB puede otorgar Master.
            rol = (
                rol_guardado
                if rol_guardado == "usuario"
                else "usuario"
            )

        token = jwt.encode(
            {
                "correo": email,
                "nombre": usuario.get("nombre", ""),
                "rol": rol,
                "exp": datetime.datetime.now(
                    datetime.timezone.utc
                ) + datetime.timedelta(hours=2)
            },
            SECRET_KEY,
            algorithm="HS256"
        )

        return {
            "usuario": {
                "nombre": usuario.get("nombre", ""),
                "correo": email,
                "rol": rol
            },
            "token": token
        }, None

    except Exception:
        logger.exception("Error interno durante la autenticación")

        return None, "No se pudo completar el inicio de sesión"