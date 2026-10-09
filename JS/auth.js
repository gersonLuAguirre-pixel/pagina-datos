
/* =====================================================
   ECOVIDA - AUTENTICACIÓN Y SESIÓN
===================================================== */

(function () {
    "use strict";

    // Obtener los datos del usuario, conservando compatibilidad
    // con el sistema original y los nuevos módulos.
    function obtenerSesion() {
        const token = localStorage.getItem("authToken");

        let usuario = localStorage.getItem("usuarioLogueado");

        if (!usuario) {
            usuario = localStorage.getItem("usuario");
        }

        try {
            usuario = usuario ? JSON.parse(usuario) : null;
        } catch (error) {
            usuario = null;
        }

        return {
            token: token,
            usuario: usuario
        };
    }

    function haySesionActiva() {
        const sesion = obtenerSesion();
        return Boolean(sesion.token && sesion.usuario);
    }

    function obtenerRolActual() {
        const sesion = obtenerSesion();

        return String(sesion.usuario?.rol || "").toLowerCase();
    }

    function esUsuarioMaster() {
        return obtenerRolActual() === "master";
    }

    // Actualizar los botones de navegación, si existen.
    function verificarSesion() {
        const sesion = obtenerSesion();

        const btnLogin = document.getElementById("btn-login-nav");
        const btnLogout = document.getElementById("btn-logout-nav");
        const btnDashboard = document.getElementById("btn-dashboard-nav");

        if (btnLogin) {
            btnLogin.style.display = sesion.token ? "none" : "";
        }

        if (btnLogout) {
            btnLogout.style.display = sesion.token ? "" : "none";
        }

        if (btnDashboard) {
            btnDashboard.style.display =
                sesion.token && esUsuarioMaster() ? "" : "none";
        }

        return sesion;
    }

    // Iniciar sesión mediante la API de Render.
    async function iniciarSesionReal(email, contrasena) {
        const config = window.ECOVIDA_CONFIG;

        if (!config?.BASE_RENDER_URL) {
            alert("Error de configuración. No se encuentra la URL de la API.");
            return;
        }

        try {
            const respuesta = await fetch(
                `${config.BASE_RENDER_URL}/api/login`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        correo: email,
                        contrasena: contrasena
                    })
                }
            );

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(
                    datos.error || datos.mensaje || "Credenciales incorrectas."
                );
            }

            if (!datos.token || !datos.usuario) {
                throw new Error("La API no devolvió los datos esperados.");
            }

            // Guardar la sesión con las claves originales y compatibles.
            localStorage.setItem("authToken", datos.token);

            localStorage.setItem(
                "usuarioLogueado",
                JSON.stringify(datos.usuario)
            );

            localStorage.setItem(
                "usuario",
                JSON.stringify(datos.usuario)
            );

            verificarSesion();

            alert(`¡Bienvenido, ${datos.usuario.nombre || "usuario"}!`);

            const paginaDespuesLogin =
                sessionStorage.getItem("paginaDespuesLogin");

            if (paginaDespuesLogin) {
                sessionStorage.removeItem("paginaDespuesLogin");
                window.location.href = paginaDespuesLogin;
            } else {
                window.location.href = "index.html";
            }

        } catch (error) {
            console.error("Error al iniciar sesión:", error);
            alert(error.message || "No se pudo iniciar sesión. Inténtalo nuevamente.");
        }
    }

    // Conservar el manejador que utiliza el formulario de login.
    function manejarFormularioLogin(evento) {
        evento.preventDefault();

        const campoEmail = document.getElementById("loginEmail");
        const campoPassword = document.getElementById("loginPassword");

        if (!campoEmail || !campoPassword) {
            alert("No se encontraron los campos del formulario de inicio de sesión.");
            return;
        }

        const email = campoEmail.value.trim();
        const contrasena = campoPassword.value;

        if (!email || !contrasena) {
            alert("Ingresa tu correo y contraseña.");
            return;
        }

        iniciarSesionReal(email, contrasena);
    }

    // Cerrar sesión.
    function cerrarSesionCorporativa() {
        localStorage.removeItem("authToken");
        localStorage.removeItem("usuarioLogueado");
        localStorage.removeItem("usuario");

        alert("Has cerrado sesión correctamente.");
        window.location.href = "index.html";
    }

    // Exponer las funciones para los HTML y los demás módulos.
    window.obtenerSesion = obtenerSesion;
    window.haySesionActiva = haySesionActiva;
    window.obtenerRolActual = obtenerRolActual;
    window.esUsuarioMaster = esUsuarioMaster;
    window.verificarSesion = verificarSesion;
    window.iniciarSesionReal = iniciarSesionReal;
    window.manejarFormularioLogin = manejarFormularioLogin;
    window.cerrarSesionCorporativa = cerrarSesionCorporativa;

    document.addEventListener("DOMContentLoaded", verificarSesion);

})();