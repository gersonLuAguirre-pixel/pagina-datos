import os
import datetime
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
from pymongo import MongoClient
import bcrypt
import jwt
app = Flask(__name__)

# CORRECCIÓN REAL DE CORS: Habilita el soporte para recibir el token JWT en las cabeceras HTTP
CORS(
    app,
    origins="*",
    allow_headers=["Authorization", "Content-Type"],
    methods=["GET", "POST", "DELETE", "OPTIONS"]
)
# RECONEXIÓN CON TUS CREDENCIALES ORIGINALES DE INICIO
MONGO_URI = os.environ.get("MONGO_URI")
SECRET_KEY = os.environ.get("SECRET_KEY", "LLAVE_SECRETA_SUPER_SEGURA_ECOVIDA")
MASTER_EMAIL = os.environ.get("MASTER_EMAIL", "master@ecovida.com")
FIREBASE_DB_URL = os.environ.get("FIREBASE_DB_URL", "https://pagina-hosting-c6ec9-default-rtdb.firebaseio.com")


try:
    client = MongoClient(MONGO_URI)
    db = client['ecovida_db']           
    usuarios_col = db['usuarios']       
    print("✅ Conexión exitosa y en producción con MongoDB Atlas.")
except Exception as e:
    print(f"❌ Error de conexión: {e}")

# =========================================================
# CONTROLADOR DE ROLES (MASTER VS USUARIO)
# =========================================================
def obtener_rol(correo):
    if correo.lower() == MASTER_EMAIL.lower():
        return "master"
    return "usuario"

# =========================================================
# MIDDLEWARE DE EXTRACCIÓN Y VERIFICACIÓN DE TOKENS JWT
# =========================================================
def obtener_usuario_desde_token():
    authorization = request.headers.get("Authorization")
    if not authorization:
        return None, "No se proporcionó el token de acceso"

    if not authorization.startswith("Bearer "):
        return None, "Formato de token inválido"

   # CORRECCIÓN DE ALTA PRECISIÓN: Extraemos estrictamente la posición 1 (el string del token)
    token_lista = authorization.split(" ")
    token_puro = token_lista[1]

    try:
        datos_token = jwt.decode(
            token_puro,
            SECRET_KEY,
            algorithms=["HS256"]
        )

        correo = datos_token.get("correo")
        if not correo:
            return None, "El token no contiene un correo válido"

        usuario = usuarios_col.find_one({"correo": correo})
        if not usuario:
            return None, "El usuario asociado al token no existe"

        rol = obtener_rol(correo)
        return {
            "nombre": usuario.get("nombre"),
            "correo": correo,
            "rol": rol
        }, None

    except jwt.ExpiredSignatureError:
        return None, "El token de sesión ha expirado"
    except jwt.InvalidTokenError:
        return None, "Token de acceso inválido"
    except Exception as e:
        return None, f"Error al validar credenciales criptográficas: {str(e)}"

# ==========================================
# ENDPOINT 1: ALTA DE IDENTIDADES (REGISTER)
# ==========================================
@app.route('/api/register', methods=['POST'])
def register():
    try:
        datos = request.json
        if not datos:
            return jsonify({"error": "No se recibieron datos"}), 400
            
        nombre = datos.get('nombre')
        email = datos.get('correo')
        password = datos.get('contrasena')

        if not nombre or not email or not password:
            return jsonify({"error": "Todos los campos son obligatorios"}), 400
        
        email = email.lower().strip()

        if len(password) < 8:
            return jsonify({"error": "La contraseña debe tener mínimo 8 caracteres"}), 400

        if usuarios_col.find_one({"correo": email}):
            return jsonify({"error": "El correo ya se encuentra registrado"}), 400

        salt = bcrypt.gensalt()
        password_encriptada = bcrypt.hashpw(password.encode('utf-8'), salt)

        nuevo_usuario = {
            "nombre": nombre,
            "correo": email,
            "contrasena": password_encriptada
        }
        
        usuarios_col.insert_one(nuevo_usuario)
        return jsonify({
            "message": "Usuario registrado exitosamente en MongoDB Atlas", 
            "usuario": {
                "nombre": nombre,
                "correo": email,
                "rol": obtener_rol(email)
            }
        }), 201

    except Exception as e:
        return jsonify({"error": f"Error interno en el servidor: {str(e)}"}), 500

# ==========================================
# ENDPOINT 2: MÓDULO DE ACCESO JWT (LOGIN)
# ==========================================
@app.route('/api/login', methods=['POST'])
def login():
    try:
        datos = request.json
        if not datos:
            return jsonify({"error": "No se recibieron datos"}), 400
            
        email = datos.get('correo')
        password = datos.get('contrasena')

        if not email or not password:
            return jsonify({"error": "Faltan datos obligatorios"}), 400
        
        email = email.lower().strip()

        usuario = usuarios_col.find_one({"correo": email})
        if not usuario:
            return jsonify({"error": "Correo o contraseña incorrectos"}), 401

        if not bcrypt.checkpw(password.encode('utf-8'), usuario['contrasena']):
            return jsonify({"error": "Correo o contraseña incorrectos"}), 401
            
        rol = obtener_rol(email)

        token = jwt.encode({
            "correo": email,
            "nombre": usuario["nombre"],
            "rol": rol,
            "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=2)
        }, SECRET_KEY, algorithm="HS256")

        return jsonify({
            "message": "Autenticación válida",
            "usuario": {
                "nombre": usuario["nombre"],
                "correo": email,
                "rol": rol
            },
            "token": token
        }), 200

    except Exception as e:
        return jsonify({"error": f"Error en el servidor: {str(e)}"}), 500
        
# =========================================================
# ENDPOINT 4: CONSULTAR PEDIDOS
# FIREBASE REALTIME DATABASE + CONTROL POR ROL
# =========================================================
@app.route("/api/pedidos", methods=["GET", "OPTIONS"])
@cross_origin(
    origins="*",
    allow_headers=["Authorization", "Content-Type"],
    methods=["GET", "OPTIONS"]
)
def obtener_pedidos():

    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200

    try:

        usuario, error = obtener_usuario_desde_token()

        if error:
            return jsonify({
                "error": error
            }), 401

        print(
            f"[PEDIDOS] Usuario: {usuario['correo']} | "
            f"Rol: {usuario['rol']}"
        )


        # ==========================================
        # 3. CONSULTAR FIREBASE
        # ==========================================

        respuesta = requests.get(
            f"{FIREBASE_DB_URL}/pedidos.json",
            timeout=15
        )

        if not respuesta.ok:

            print(
                "[FIREBASE ERROR]",
                respuesta.status_code,
                respuesta.text
            )

            return jsonify({
                "error": "No se pudo consultar Firebase"
            }), 500

        datos = respuesta.json() or {}

        # ==========================================
        # 4. MASTER → PUEDE VER TODOS LOS PEDIDOS
        # ==========================================

        if usuario["rol"] == "master":

            return jsonify({
                "rol": "master",
                "pedidos": datos
            }), 200

        # ==========================================
        # 5. USUARIO NORMAL → SOLO SUS PEDIDOS
        # ==========================================

        pedidos_usuario = {}

        for id_pedido, pedido in datos.items():

            if pedido.get("correoUsuario") == usuario["correo"]:

                pedidos_usuario[id_pedido] = pedido

        return jsonify({
            "rol": "usuario",
            "pedidos": pedidos_usuario
        }), 200

    # ==========================================
    # 6. ERROR DE CONEXIÓN CON FIREBASE
    # ==========================================

    except requests.RequestException as e:

        print(
            "[FIREBASE ERROR]",
            str(e)
        )

        return jsonify({
            "error": "Error de comunicación con Firebase"
        }), 500

    # ==========================================
    # 7. OTROS ERRORES
    # ==========================================

    except Exception as e:

        print(
            "[PEDIDOS ERROR]",
            str(e)
        )

        return jsonify({
            "error": f"Error interno: {str(e)}"
        }), 500
# =========================================================
# ENDPOINT 5: ELIMINAR PEDIDO (RESTRICCIÓN PERIMETRAL)
# =========================================================
@app.route("/api/pedidos/<id_pedido>", methods=["PATCH"])
def actualizar_estado_pedido(id_pedido):
    try:
        usuario, error = obtener_usuario_desde_token()

        if error:
            return jsonify({"error": error}), 401

        # =================================================
        # OBTENER PEDIDO ACTUAL
        # =================================================
        respuesta = requests.get(
            f"{FIREBASE_DB_URL}/pedidos/{id_pedido}.json",
            timeout=15
        )

        if not respuesta.ok:
            return jsonify({
                "error": "No se pudo consultar el pedido"
            }), 500

        pedido = respuesta.json()

        if not pedido:
            return jsonify({
                "error": "El pedido especificado no existe"
            }), 404

        # =================================================
        # CONTROL DE ACCESO: USUARIO NORMAL
        # =================================================
        if usuario["rol"] == "usuario":

            correo_pedido = pedido.get("correoUsuario")

            if correo_pedido != usuario["correo"]:
                return jsonify({
                    "error": "No tienes permiso para modificar este pedido"
                }), 403

        # =================================================
        # OBTENER NUEVO ESTADO
        # =================================================
        datos = request.get_json(silent=True) or {}

        nuevo_estado = datos.get("estado")

        estados_permitidos = [
            "pendiente",
            "procesando",
            "completado",
            "cancelado"
        ]

        if nuevo_estado not in estados_permitidos:
            return jsonify({
                "error": "Estado de pedido no válido"
            }), 400

        # =================================================
        # ACTUALIZAR ESTADO EN FIREBASE
        # =================================================
        respuesta_patch = requests.patch(
            f"{FIREBASE_DB_URL}/pedidos/{id_pedido}.json",
            json={
                "estado": nuevo_estado
            },
            timeout=15
        )

        if not respuesta_patch.ok:
            return jsonify({
                "error": "No se pudo actualizar el estado del pedido"
            }), 500

        return jsonify({
            "message": "Estado del pedido actualizado correctamente",
            "estado": nuevo_estado
        }), 200

    except Exception as e:

        return jsonify({
            "error": f"Error al actualizar pedido: {str(e)}"
        }), 500

# =========================================================
# ENDPOINT DE PRUEBA / ENRUTAMIENTO BASE
# =========================================================
@app.route("/", methods=["GET"])
def inicio():
    return jsonify({
        "mensaje": "API EcoVida funcionando correctamente",
        "sistema": "MongoDB + Firebase",
        "estado": "OK"
    })



# =========================================================
# EJECUTAR SERVIDOR
# =========================================================

if __name__ == "__main__":

    app.run(
        debug=True,
        port=5000
    )


    """# Generamos un Token JWT real firmado digitalmente válido por 2 horas
            token = jwt.encode({
                'correo': usuario['correo'],
                'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=2)
            }
            
            # Codificación explícita en formato string (UTF-8) compatible con PyJWT moderno
            token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')

            return jsonify({
                "message": "Autenticación válida",
                "usuario": {
                    "nombre": usuario['nombre'],
                    "correo": usuario['correo']
                },
                "token": token
            }), 200
        else:
            return jsonify({"error": "Correo o contraseña incorrectos"}), 401

    except Exception as e:
        return jsonify({"error": f"Error en el servidor: {str(e)}"}), 500

if __name__ == '__main__':
    # Arranca el servidor local de Python en el puerto 5000
    app.run(debug=True, port=5000)"""
