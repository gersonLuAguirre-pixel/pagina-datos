
/* =====================================================
   ECOVIDA - PUNTO DE ENTRADA PRINCIPAL
   Carga los módulos en el orden correcto
===================================================== */

(function () {
    "use strict";

    const scriptActual = document.currentScript;

    if (!scriptActual || !scriptActual.src) {
        console.error("EcoVida: no se pudo determinar la ruta de los módulos.");
        return;
    }

    const rutaBase = new URL(".", scriptActual.src);

    const modulos = [
        "config.js",
        "auth.js",
        "carrito.js",
        "pedidos.js",
        "productos.js"
    ];

    function cargarModulo(nombreArchivo) {
        return new Promise((resolve, reject) => {
            const script = document.createElement("script");

            script.src = new URL(nombreArchivo, rutaBase).href;
            script.onload = () => resolve();
            script.onerror = () => reject(
                new Error(`No se pudo cargar el módulo ${nombreArchivo}`)
            );

            document.head.appendChild(script);
        });
    }

    async function iniciarEcoVida() {
        try {
            for (const modulo of modulos) {
                await cargarModulo(modulo);
            }

            console.info("EcoVida: módulos cargados correctamente.");

            // Proteger el acceso directo a la página del carrito.
            const paginaActual = window.location.pathname
                .split("/")
                .pop()
                .toLowerCase();

            if (
                paginaActual === "carrito.html" &&
                !localStorage.getItem("authToken")
            ) {
                sessionStorage.setItem(
                    "paginaDespuesLogin",
                    "carrito.html"
                );

                window.location.href = "login.html";
                return;
            }

            // Si el documento ya terminó de cargarse,
            // inicializar manualmente las funciones necesarias.
            // Si todavía está cargándose, los módulos se inicializarán
            // mediante sus propios eventos DOMContentLoaded.
            if (document.readyState !== "loading") {
                if (typeof window.verificarSesion === "function") {
                    window.verificarSesion();
                }

                if (
                    document.getElementById("listaCarrito") &&
                    typeof window.mostrarCarrito === "function"
                ) {
                    window.mostrarCarrito();
                }

                if (
                    document.getElementById("listaPedidos") &&
                    typeof window.mostrarPedidos === "function"
                ) {
                    window.mostrarPedidos();
                }
            }

        } catch (error) {
            console.error("EcoVida: error al iniciar los módulos:", error);

            alert(
                "No se pudieron cargar todos los componentes de EcoVida. " +
                "Revisa la conexión y las rutas de los archivos."
            );
        }
    }

    iniciarEcoVida();

})();