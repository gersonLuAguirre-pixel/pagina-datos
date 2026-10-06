// ==============================================================
// 🌐 CONFIGURACIÓN ARQUITECTURA MULTICLOUD EN INTERNET (RENDER)
// ==============================================================
// Tu endpoint real y unificado desplegado en la nube de Render
const BASE_RENDER_URL = "https://ecovida-api-real.onrender.com";
// ==============================================================
// 🔐 MIDDLEWARE DE SEGURIDAD PERIMETRAL (BLOQUEO ABSOLUTO)
// ==============================================================
(function verificarAccesoObligatorio() {
    // 1. EXTRAER EL ARCHIVO ACTUAL DE LA URL
    const rutaActual = window.location.pathname;
    const paginaActual = rutaActual.substring(rutaActual.lastIndexOf("/") + 1);

    // 2. LEER EL TOKEN EMITIDO POR PYTHON Y MONGODB ATLAS
    const tokenSesionReal = localStorage.getItem("authToken");

    // 3. LOGICA DE RESTRICCIÓN PERIMETRAL (ZERO TRUST)
    if (paginaActual !== "login.html" && !tokenSesionReal) {

        console.warn("[SEGURIDAD CRÍTICA] Intento de bypass detectado. Redirección forzosa.");
        alert("🔒 Acceso Restringido:\n\nDebe autenticarse con sus credenciales institucionales de Python y MongoDB Atlas antes de interactuar con la plataforma EcoVida.");

        if (paginaActual === "" || paginaActual === "index.html" || paginaActual === "nosotros.html" || paginaActual === "carrito.html" || paginaActual === "pedidos.html" || paginaActual === "quiz.html") {
            window.location.href = "login.html";
        }
    }

    // 4. CONTROL DE COMPORTAMIENTO DE BOTONES DINÁMICOS
    document.addEventListener("DOMContentLoaded", function () {
        const btnLogin = document.getElementById("btn-login-nav");
        const btnLogout = document.getElementById("btn-logout-nav");

        if (tokenSesionReal) {
            if (btnLogin) btnLogin.style.display = "none";     // Oculta "Iniciar Sesión"
            if (btnLogout) btnLogout.style.display = "block";    // Muestra "Cerrar Sesión"
        } else {
            if (btnLogin) btnLogin.style.display = "block";   // Muestra "Iniciar Sesión"
            if (btnLogout) btnLogout.style.display = "none";    // Oculta "Cerrar Sesión"
        }
    });
})();


// ===============================
// AGREGAR PRODUCTO AL CARRITO
// ===============================
function agregarProducto(nombre, precio) {
    let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    let producto = { nombre: nombre, precio: precio };
    carrito.push(producto);
    localStorage.setItem("carrito", JSON.stringify(carrito));
    alert(nombre + " fue agregado al carrito 🛒");
}

// ===============================
// MOSTRAR CARRITO
// ===============================
function mostrarCarrito() {
    let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    let lista = document.getElementById("listaCarrito");
    let totalElemento = document.getElementById("total");

    if (!lista || !totalElemento) {
        return;
    }

    lista.innerHTML = "";
    let total = 0;

    if (carrito.length === 0) {
        lista.innerHTML = "<p>El carrito está vacío.</p>";
        totalElemento.textContent = "0.00";
        return;
    }

    carrito.forEach(function (producto, posicion) {
        lista.innerHTML += `
            <div class="producto-carrito">
                <h3>${producto.nombre}</h3>
                <p>Precio: S/ ${Number(producto.precio).toFixed(2)}</p>
                <button onclick="eliminarProducto(${posicion})">Eliminar</button>
            </div>
        `;
        total = total + Number(producto.precio);
    });

    totalElemento.textContent = total.toFixed(2);
}

// ===============================
// ELIMINAR PRODUCTO
// ===============================
function eliminarProducto(posicion) {
    let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    carrito.splice(posicion, 1);
    localStorage.setItem("carrito", JSON.stringify(carrito));
    mostrarCarrito();
}

// ===============================
// VACIAR CARRITO
// ===============================
function vaciarCarrito() {
    localStorage.removeItem("carrito");
    mostrarCarrito();
}

// ==============================================================
// GUARDAR PEDIDO INTEGRADO (FIREBASE + MICROSERVICIO EN RENDER)
// ==============================================================
function guardarPedido() {
    let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

    if (carrito.length === 0) {
        alert("El carrito está vacío");
        return;
    }

    let subtotal = 0;
    carrito.forEach(function (producto) {
        subtotal = subtotal + Number(producto.precio);
    });

    console.log("[MULTICLOUD] Consultando tarifas logísticas en el servidor remoto de Render...");

    // Consulta de costos logísticos a tu servidor externo en la nube de Render
    fetch(`${BASE_RENDER_URL}/api/delivery`)
        .then(function (resRender) {
            if (!resRender.ok) {
                throw new Error("El servidor Render reportó un fallo");
            }
            return resRender.json();
        })
        .then(function (datosRender) {
            let costoEnvio = datosRender.id ? 15.00 : 15.00;
            console.log("[MULTICLOUD] Conexión exitosa con Render. Costo de envío: S/ " + costoEnvio);
            procesarGuardadoFirebase(carrito, subtotal, costoEnvio);
        })
        .catch(function (errRender) {
            console.error("[MULTICLOUD ERROR] Render caído. Aplicando tolerancia a fallos:", errRender);
            procesarGuardadoFirebase(carrito, subtotal, 10.00);
        });
}

/**
 * Función interna que consolida los datos y ejecuta el guardado final en Firebase
 */
function procesarGuardadoFirebase(carrito, subtotal, costoEnvio) {
    let totalFinal = subtotal + costoEnvio;

    // Extraemos de forma segura el perfil del usuario autenticado en la sesión
    const datosUsuario = JSON.parse(localStorage.getItem("usuarioLogueado")) || null;
    const correoActivo = datosUsuario ? datosUsuario.correo : "anonimo@ecovida.com";

    let pedido = {
        fecha: new Date().toISOString(),
        correoUsuario: correoActivo, // Campo obligatorio para el filtrado seguro por roles en Python
        productos: carrito,
        subtotal: subtotal,
        costoEnvioExterno: costoEnvio,
        total: totalFinal
    };

    console.log("Enviando pedido consolidado a Firebase con propietario:", pedido);

    fetch("https://pagina-hosting-c6ec9-default-rtdb.firebaseio.com/pedidos.json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pedido)
    })
        .then(function (response) {
            if (!response.ok) {
                throw new Error("Firebase respondió con error: " + response.status);
            }
            return response.json();
        })
        .then(function (data) {
            alert(`✅ ¡Pedido Procesado con Éxito!\n\nSubtotal: S/ ${subtotal.toFixed(2)}\nEnvío (Render Cloud): S/ ${costoEnvio.toFixed(2)}\nTotal Final: S/ ${totalFinal.toFixed(2)}`);
            localStorage.removeItem("carrito");
            mostrarCarrito();
        })
        .catch(function (error) {
            console.error("ERROR COMPLETO EN FIREBASE:", error);
            alert("❌ Error: " + error.message);
        });
}

// ==============================================================
// MOSTRAR PEDIDOS
// Consulta segura mediante Python + JWT + Firebase
// ==============================================================
console.log("🔥 ECOVIDA.JS NUEVO CARGADO");
function mostrarPedidos() {

    const listaPedidos = document.getElementById("listaPedidos");

    if (!listaPedidos) {
        return;
    }

    // ==========================================
    // 1. OBTENER SESIÓN
    // ==========================================

    const tokenSesionReal = localStorage.getItem("authToken");

    const datosUsuario = JSON.parse(
        localStorage.getItem("usuarioLogueado")
    ) || null;

    // ==========================================
    // 2. VERIFICAR SESIÓN
    // ==========================================

    if (!tokenSesionReal || !datosUsuario) {

        listaPedidos.innerHTML = `
            <p>🔒 Debes iniciar sesión para consultar tus pedidos.</p>
        `;

        return;
    }

    console.log(
        "[PEDIDOS] Consultando pedidos mediante API..."
    );

    console.log(
        "[PEDIDOS] Usuario:",
        datosUsuario.correo
    );

    console.log(
        "[PEDIDOS] Rol:",
        datosUsuario.rol
    );

    listaPedidos.innerHTML = `
        <p>⏳ Consultando pedidos...</p>
    `;

    // ==========================================
    // 3. CONSULTAR FLASK / RENDER
    // ==========================================

    fetch(`${BASE_RENDER_URL}/api/pedidos`, {

        method: "GET",

        headers: {
            "Authorization": `Bearer ${tokenSesionReal}`,
            "Content-Type": "application/json"
        }

    })

        // ==========================================
        // 4. PROCESAR RESPUESTA
        // ==========================================

        .then(function (response) {

            return response.json().then(function (data) {

                if (!response.ok) {

                    throw new Error(
                        data.error ||
                        "No se pudieron obtener los pedidos"
                    );
                }

                return data;
            });

        })

        .then(function (datos) {

            console.log(
                "[PEDIDOS] Respuesta recibida:",
                datos
            );

            listaPedidos.innerHTML = "";

            const pedidos = datos.pedidos || {};

            const idsPedidos = Object.keys(pedidos);

            // ==========================================
            // 5. NO HAY PEDIDOS
            // ==========================================

            if (idsPedidos.length === 0) {

                listaPedidos.innerHTML = `
                <div class="pedido">
                    <p>📦 No tienes pedidos registrados.</p>
                </div>
            `;

                return;
            }

            // ==========================================
            // 6. MOSTRAR TÍTULO SEGÚN EL ROL
            // ==========================================

            const tituloRol =
                datos.rol === "master"
                    ? "👑 Pedidos de todos los usuarios"
                    : "📦 Mis pedidos";

            listaPedidos.innerHTML += `
            <div class="info-pedidos">

                <h3>${tituloRol}</h3>

                <p>
                    Usuario:
                    <strong>${datosUsuario.correo}</strong>
                </p>

            </div>
        `;

            // ==========================================
            // 7. MOSTRAR CADA PEDIDO
            // ==========================================

            idsPedidos.forEach(function (idPedido) {

                const pedido = pedidos[idPedido];

                let productosHTML = "";

                // ==========================================
                // PRODUCTOS
                // ==========================================

                if (
                    pedido.productos &&
                    Array.isArray(pedido.productos)
                ) {

                    pedido.productos.forEach(function (producto) {

                        productosHTML += `
                        <li>
                            ${producto.nombre || "Producto"}
                            -
                            S/
                            ${Number(
                            producto.precio || 0
                        ).toFixed(2)}
                        </li>
                    `;

                    });

                } else {

                    productosHTML = `
                    <li>Sin productos registrados</li>
                `;

                }

                // ==========================================
                // DATOS DEL PEDIDO
                // ==========================================

                const envio = Number(
                    pedido.costoEnvioExterno || 0
                );

                const subtotal = Number(
                    pedido.subtotal || 0
                );

                const total = Number(
                    pedido.total || 0
                );

                const fecha = pedido.fecha
                    ? new Date(
                        pedido.fecha
                    ).toLocaleString()
                    : "No especificada";

                // ==========================================
                // MOSTRAR PEDIDO
                // ==========================================

                listaPedidos.innerHTML += `

                <div class="pedido">

                    <h3>
                        📦 Pedido: ${idPedido}
                    </h3>

                    <p>
                        <strong>Propietario:</strong>
                        ${pedido.correoUsuario || "No asignado"}
                    </p>

                    <p>
                        <strong>Fecha:</strong>
                        ${fecha}
                    </p>

                    <p>
                        <strong>Subtotal:</strong>
                        S/ ${subtotal.toFixed(2)}
                    </p>

                    <h4>
                        Productos:
                    </h4>

                    <ul>
                        ${productosHTML}
                    </ul>

                    <p>
                        <strong>Costo de envío:</strong>
                        S/ ${envio.toFixed(2)}
                    </p>

                    <p>
                        <strong>Total:</strong>
                        S/ ${total.toFixed(2)}
                    </p>

                    <button
                        onclick="eliminarPedido('${idPedido}')"
                    >
                        🗑️ Eliminar pedido
                    </button>

                </div>

                <hr>

            `;

            });

        })

        // ==========================================
        // 8. ERROR
        // ==========================================

        .catch(function (error) {

            console.error(
                "[PEDIDOS ERROR]:",
                error
            );

            listaPedidos.innerHTML = `

            <div class="pedido">

                <h3>
                    ❌ Error de conexión
                </h3>

                <p>
                    ${error.message}
                </p>

                <button
                    onclick="mostrarPedidos()"
                >
                    🔄 Reintentar
                </button>

            </div>

        `;

        });
}
// ==============================================================
// 🗑️ ELIMINAR PEDIDO
// ==============================================================

function eliminarPedido(idPedido) {

    const tokenSesionReal = localStorage.getItem("authToken");

    if (!tokenSesionReal) {
        alert("🔒 Tu sesión ha expirado. Inicia sesión nuevamente.");
        window.location.href = "login.html";
        return;
    }

    const confirmar = confirm(
        "¿Estás seguro de que deseas eliminar este pedido?\n\n" +
        "Esta acción no se puede deshacer."
    );

    if (!confirmar) {
        return;
    }

    fetch(`${BASE_RENDER_URL}/api/pedidos/${idPedido}`, {
        method: "DELETE",
        headers: {
            "Authorization": `Bearer ${tokenSesionReal}`
        }
    })
        .then(function (response) {

            return response.json().then(function (data) {

                if (!response.ok) {
                    throw new Error(
                        data.error || "No se pudo eliminar el pedido"
                    );
                }

                return data;
            });

        })
        .then(function (data) {

            alert("✅ " + data.message);

            // Actualizar automáticamente la lista
            mostrarPedidos();

        })
        .catch(function (error) {

            console.error(
                "[ELIMINAR PEDIDO ERROR]:",
                error
            );

            alert(
                "❌ No se pudo eliminar el pedido:\n\n" +
                error.message
            );

        });
}
// ==============================================================
// 🔑 MICROSERVICIO DE AUTENTICACIÓN REAL (PYTHON + MONGODB ATLAS)
// ==============================================================

/**
 * Procesa el inicio de sesión enviando los datos al servidor en internet de Render
 */
function iniciarSesionReal(email, password) {
    let credenciales = {
        correo: email,
        contrasena: password
    };

    // Consumimos el endpoint del backend real mapeado en internet
    fetch(`${BASE_RENDER_URL}/api/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(credenciales)
    })
        .then(function (response) {
            return response.json().then(function (data) {
                if (!response.ok) {
                    throw new Error(data.error || "Fallo en la autenticación");
                }
                return data;
            });
        })
        .then(function (data) {
            console.log("[JWT] Token de sesión recibido de Render:", data.token);
            alert("🔑 ¡Bienvenido, " + data.usuario.nombre + "!");

            // Guardamos el token criptográfico y el objeto de identidad emitidos por Python
            localStorage.setItem("authToken", data.token);
            localStorage.setItem("usuarioLogueado", JSON.stringify(data.usuario));

            // Redirección relativa que limpia la URL tanto en local como en Firebase Hosting
            const rutaActual = window.location.pathname;
            const nuevaRuta = rutaActual.replace("login.html", "index.html");
            window.location.href = nuevaRuta;
        })
        .catch(function (error) {
            console.error("[AUTH ERROR]:", error.message);
            alert("❌ Error de acceso: " + error.message);
        });
}

/**
 * Captura el evento del formulario HTML de login.html
 */
function manejarFormularioLogin(evento) {
    evento.preventDefault();

    let email = document.getElementById("loginEmail").value;
    let contrasena = document.getElementById("loginPassword").value;

    iniciarSesionReal(email, contrasena);
}

function cerrarSesionCorporativa() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("usuarioLogueado");
    alert("🔒 Sesión finalizada de manera segura.");
    window.location.href = "login.html";
}
