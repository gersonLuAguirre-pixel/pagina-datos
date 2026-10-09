
class UsuarioRepository:

    def __init__(self, usuarios_col):
        self.usuarios_col = usuarios_col

    # =====================================================
    # BUSCAR USUARIO POR CORREO
    # =====================================================

    def buscar_por_correo(self, correo):
        correo = str(correo or "").strip().lower()

        return self.usuarios_col.find_one({
            "correo": correo
        })

    # =====================================================
    # CREAR USUARIO
    # =====================================================

    def crear_usuario(self, usuario):
        return self.usuarios_col.insert_one(usuario)