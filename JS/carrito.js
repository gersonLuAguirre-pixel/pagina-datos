
/* =====================================================
   ECOVIDA - CARRITO Y REGISTRO DE PEDIDOS
===================================================== */

(function () {
    "use strict";

    const CLAVE_CARRITO = "carrito";

    function obtenerConfig() {
        return window.ECOVIDA_CONFIG || {};
    }

    function obtenerUsuario() {
        const datos =
            localStorage.getItem("usuarioLogueado") ||
            localStorage.getItem("usuario");

        try {
            return datos ? JSON.parse(datos) : null;
        } catch (error) {
            return null;
        }
    }

    function obtenerToken() {
        return localStorage.getItem("authToken");
    }

    function obtenerCarrito() {
        try {
            const carrito = JSON.parse(
                localStorage.getItem(CLAVE_CARRITO) || "[]"
            );

            return Array.isArray(carrito) ? carrito : [];
        } catch (error) {
            return [];
        }
    }

    function guardarCarrito(carrito) {
        localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
    }

    function exigirSesion() {
        if (obtenerToken()) {
            return true;
        }

        sessionStorage.setItem("paginaDespuesLogin", "carrito.html");

        alert("Debes iniciar sesión para continuar.");
        window.location.href = "login.html";

        return false;
    }

    function agregarProducto(nombre, precio) {
        if (!exigirSesion()) return;

        const precioNumerico = Number(precio);

        if (!nombre || !Number.isFinite(precioNumerico) || precioNumerico < 0) {
            alert("Los datos del producto no son válidos.");
            return;
        }

        const carrito = obtenerCarrito();

        const productoExistente = carrito.find(
            producto =>
                String(producto.nombre).trim().toLowerCase() ===
                String(nombre).trim().toLowerCase()
        );

        if (productoExistente) {
            productoExistente.cantidad =
                (Number(productoExistente.cantidad) || 1) + 1;
        } else {
            carrito.push({
                nombre: nombre,
                precio: precioNumerico,
                cantidad: 1
            });
        }

        guardarCarrito(carrito);

        alert(`${nombre} se agregó al carrito.`);

        if (document.getElementById("listaCarrito")) {
            mostrarCarrito();
        }
    }

    function mostrarCarrito() {
        const lista = document.getElementById("listaCarrito");

        if (!lista) return;

        const carrito = obtenerCarrito();

        if (carrito.length === 0) {
            lista.innerHTML = "<p>Tu carrito está vacío.</p>";
            actualizarTotalCarrito(0);
            return;
        }

        let subtotal = 0;

        lista.innerHTML = carrito.map((producto, indice) => {
            const precio = Number(producto.precio) || 0;
            const cantidad = Number(producto.cantidad) || 1;
            const importe = precio * cantidad;

            subtotal += importe;

            return `
                <div class="producto-carrito">
                    <div>
                        <strong>${escaparHTML(producto.nombre)}</strong>
                        <p>Precio: S/ ${precio.toFixed(2)}</p>
                        <p>Cantidad: ${cantidad}</p>
                        <p>Subtotal: S/ ${importe.toFixed(2)}</p>
                    </div>
                    <button type="button"
                        onclick="eliminarProducto(${indice})">
                        Eliminar
                    </button>
                </div>
            `;
        }).join("");

        actualizarTotalCarrito(subtotal);
    }

    function actualizarTotalCarrito(subtotal) {
        const total = document.getElementById("total");

        if (total) {
            total.textContent = Number(subtotal).toFixed(2);
        }

        const subtotalElemento = document.getElementById("subtotalCarrito");

        if (subtotalElemento) {
            subtotalElemento.textContent =
                `S/ ${Number(subtotal).toFixed(2)}`;
        }
    }

    function eliminarProducto(posicion) {
        const carrito = obtenerCarrito();

        if (posicion < 0 || posicion >= carrito.length) return;

        carrito.splice(posicion, 1);
        guardarCarrito(carrito);
        mostrarCarrito();
    }

    function vaciarCarrito() {
        guardarCarrito([]);
        mostrarCarrito();
    }

    // Consolidar productos repetidos por nombre.
    function consolidarProductos(carrito) {
        const agrupados = {};

        carrito.forEach(producto => {
            const nombre = String(producto.nombre || "").trim();
            const clave = nombre.toLowerCase();
            const cantidad = Number(producto.cantidad) || 1;
            const precio = Number(producto.precio) || 0;

            if (!nombre) return;

            if (!agrupados[clave]) {
                agrupados[clave] = {
                    nombre: nombre,
                    precio: precio,
                    cantidad: 0
                };
            }

            agrupados[clave].cantidad += cantidad;
        });

        return Object.values(agrupados);
    }

    async function guardarPedido() {
        if (!exigirSesion()) return;

        const config = obtenerConfig();
        const token = obtenerToken();
        const carritoOriginal = obtenerCarrito();

        if (carritoOriginal.length === 0) {
            alert("Tu carrito está vacío.");
            return;
        }

        if (!config.BASE_RENDER_URL || !config.FIREBASE_DB_URL) {
            alert("Falta la configuración de la API o de Firebase.");
            return;
        }

        const usuario = obtenerUsuario();

        if (!usuario) {
            alert("No se encontraron los datos de tu usuario. Inicia sesión nuevamente.");
            return;
        }

        const correoUsuario =
            usuario.correo ||
            usuario.email ||
            usuario.correoElectronico;

        if (!correoUsuario) {
            alert("No se encontró el correo de tu usuario.");
            return;
        }

        const productos = consolidarProductos(carritoOriginal);

        const subtotal = productos.reduce(
            (suma, producto) =>
                suma + producto.precio * producto.cantidad,
            0
        );

        try {
            // Mantener el método GET del sistema original.
            const respuestaDelivery = await fetch(
                `${config.BASE_RENDER_URL}/api/delivery`,
                {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                }
            );

            if (!respuestaDelivery.ok) {
                throw new Error("No se pudo obtener el costo de delivery.");
            }

            const datosDelivery = await respuestaDelivery.json();
            const costoEnvio = Number(datosDelivery.costoEnvio);

            if (!Number.isFinite(costoEnvio) || costoEnvio < 0) {
                throw new Error("La API devolvió un costo de envío no válido.");
            }

            await procesarGuardadoFirebase(
                productos,
                subtotal,
                costoEnvio,
                correoUsuario
            );

        } catch (error) {
            console.error("Error al guardar el pedido:", error);
            alert(error.message || "No se pudo registrar el pedido.");
        }
    }

    async function procesarGuardadoFirebase(
        productos,
        subtotal,
        costoEnvio,
        correoUsuario
    ) {
        const config = obtenerConfig();

        const pedido = {
            fecha: new Date().toISOString(),
            correoUsuario: correoUsuario,
            productos: productos,
            subtotal: subtotal,
            costoEnvioExterno: costoEnvio,
            total: subtotal + costoEnvio,
            estado: "pendiente"
        };

        const urlFirebase =
            `${config.FIREBASE_DB_URL}/pedidos.json`;

        const respuesta = await fetch(urlFirebase, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(pedido)
        });

        if (!respuesta.ok) {
            throw new Error("Firebase no pudo registrar el pedido.");
        }

        guardarCarrito([]);

        alert("¡Pedido registrado correctamente!");

        mostrarCarrito();

        window.location.href = "pedidos.html";
    }

    function escaparHTML(texto) {
        return String(texto ?? "").replace(/[&<>"']/g, caracter => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[caracter]);
    }

    // Funciones globales usadas por los botones HTML.
    window.obtenerCarrito = obtenerCarrito;
    window.guardarCarrito = guardarCarrito;
    window.agregarProducto = agregarProducto;
    window.mostrarCarrito = mostrarCarrito;
    window.eliminarProducto = eliminarProducto;
    window.vaciarCarrito = vaciarCarrito;
    window.consolidarProductos = consolidarProductos;
    window.guardarPedido = guardarPedido;
    window.procesarGuardadoFirebase = procesarGuardadoFirebase;

    document.addEventListener("DOMContentLoaded", () => {
        if (document.getElementById("listaCarrito")) {
            mostrarCarrito();
        }
    });

})();