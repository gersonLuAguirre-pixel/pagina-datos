import datetime
import bcrypt
import jwt

from config.config import SECRET_KEY, MASTER_EMAIL


def obtener_rol(correo):
    """
    Determina el rol del usuario según su correo.
    """
    if correo.lower() == MASTER_EMAIL.lower():
        return "master"

    return "usuario"


def registrar_usuario(usuario_repository, nombre, email, password):
    """
    Registra un nuevo usuario en el sistema.
    """

    email = email.lower().strip()

    if len(password) < 8:
        return None, "La contraseña debe tener mínimo 8 caracteres"

    usuario_existente = usuario_repository.buscar_por_correo(email)

    if usuario_existente:
        return None, "El correo ya se encuentra registrado"

    salt = bcrypt.gensalt()

    password_encriptada = bcrypt.hashpw(
        password.encode("utf-8"),
        salt
    )

    nuevo_usuario = {
        "nombre": nombre,
        "correo": email,
        "contrasena": password_encriptada
    }

    usuario_repository.crear_usuario(nuevo_usuario)

    return {
        "nombre": nombre,
        "correo": email,
        "rol": obtener_rol(email)
    }, None


def autenticar_usuario(usuario_repository, email, password):
    """
    Valida las credenciales y genera el token JWT.
    """

    email = email.lower().strip()

    usuario = usuario_repository.buscar_por_correo(email)

    if not usuario:
        return None, "Correo o contraseña incorrectos"

    if not bcrypt.checkpw(
        password.encode("utf-8"),
        usuario["contrasena"]
    ):
        return None, "Correo o contraseña incorrectos"

    rol = obtener_rol(email)

    token = jwt.encode(
        {
            "correo": email,
            "nombre": usuario["nombre"],
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
            "nombre": usuario["nombre"],
            "correo": email,
            "rol": rol
        },
        "token": token
    }, None