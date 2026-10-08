class UsuarioRepository:

    def __init__(self, usuarios_col):
        self.usuarios_col = usuarios_col

    def buscar_por_correo(self, correo):
        return self.usuarios_col.find_one({
            "correo": correo
        })

    def crear_usuario(self, usuario):
        return self.usuarios_col.insert_one(usuario)