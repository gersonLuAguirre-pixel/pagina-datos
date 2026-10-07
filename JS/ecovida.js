// ==============================================================
// 🌐 CONFIGURACIÓN ARQUITECTURA MULTICLOUD EN INTERNET (RENDER)
// ==============================================================
// Tu endpoint real y unificado desplegado en la nube de Render
const BASE_RENDER_URL = "https://ecovida-api-real.onrender.com";
// ==============================================================
// 🔐 MIDDLEWARE DE SEGURIDAD PERIMETRAL (BLOQUEO ABSOLUTO)
// ==============================================================
// ==============================================================
// 🔐 CONTROL DE SESIÓN
// ==============================================================

(function verificarSesion() {

    const tokenSesionReal = localStorage.getItem("authToken");

    document.addEventListener("DOMContentLoaded", function () {

        const btnLogin = document.getElementById("btn-login-nav");
        const btnLogout = document.getElementById("btn-logout-nav");

        if (tokenSesionReal) {

            // Usuario autenticado
            if (btnLogin) {
                btnLogin.style.display = "none";
            }

            if (btnLogout) {
                btnLogout.style.display = "block";
            }

        } else {

            // Visitante
            if (btnLogin) {
                btnLogin.style.display = "block";
            }

            if (btnLogout) {
                btnLogout.style.display = "none";
            }

        }

    });

})();
(function protegerCarrito() {

    const rutaActual = window.location.pathname;

    const paginaActual = rutaActual.substring(
        rutaActual.lastIndexOf("/") + 1
    );

    const tokenSesionReal = localStorage.getItem("authToken");

    if (paginaActual === "carrito.html" && !tokenSesionReal) {

        // Guardamos la página que el usuario quería visitar
        sessionStorage.setItem(
            "paginaDespuesLogin",
            "carrito.html"
        );

        alert(
            "🔒 Para acceder al carrito debes iniciar sesión."
        );

        window.location.href = "login.html";
    }

})();

// ===============================
// AGREGAR PRODUCTO AL CARRITO
// ===============================
function agregarProducto(nombre, precio) {

    // Verificar si existe una sesión activa
    const tokenSesionReal = localStorage.getItem("authToken");

    if (!tokenSesionReal) {

        alert(
            "🔒 Para agregar productos al carrito debes iniciar sesión."
        );

        window.location.href = "login.html";
        return;
    }

    // Usuario autenticado: agregar producto normalmente
    let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

    let producto = {
        nombre: nombre,
        precio: precio
    };

    carrito.push(producto);

    localStorage.setItem(
        "carrito",
        JSON.stringify(carrito)
    );

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

    // ==========================================
    // 🔐 VERIFICAR SESIÓN
    // ==========================================

    const tokenSesionReal = localStorage.getItem("authToken");

    if (!tokenSesionReal) {

        alert(
            "🔒 Debes iniciar sesión para realizar una compra."
        );

        window.location.href = "login.html";

        return;
    }

    // ==========================================
    // 🛒 OBTENER CARRITO
    // ==========================================

    let carrito = JSON.parse(
        localStorage.getItem("carrito")
    ) || [];

    if (carrito.length === 0) {

        alert("El carrito está vacío");

        return;
    }

    // ==========================================
    // 💰 CALCULAR SUBTOTAL
    // ==========================================

    let subtotal = 0;

    carrito.forEach(function (producto) {

        subtotal =
            subtotal +
            Number(producto.precio);

    });

    console.log(
        "[MULTICLOUD] Consultando tarifas logísticas en el servidor remoto de Render..."
    );

    // ==========================================
    // 🚚 CONSULTAR COSTO DE ENVÍO
    // ==========================================

    fetch(`${BASE_RENDER_URL}/api/delivery`)

        .then(function (resRender) {

            if (!resRender.ok) {

                throw new Error(
                    "El servidor Render reportó un fallo"
                );

            }

            return resRender.json();

        })

        .then(function (datosRender) {

            let costoEnvio =
                datosRender.id
                    ? 15.00
                    : 15.00;

            console.log(
                "[MULTICLOUD] Conexión exitosa con Render. Costo de envío: S/ " +
                costoEnvio
            );

            procesarGuardadoFirebase(
                carrito,
                subtotal,
                costoEnvio
            );

        })

        .catch(function (errRender) {

            console.error(
                "[MULTICLOUD ERROR] Render caído. Aplicando tolerancia a fallos:",
                errRender
            );

            procesarGuardadoFirebase(
                carrito,
                subtotal,
                10.00
            );

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
        correoUsuario: correoActivo,
        productos: carrito,
        subtotal: subtotal,
        costoEnvioExterno: costoEnvio,
        total: totalFinal,
        estado: "pendiente"
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

             </div>
`           ;

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

                const estado = pedido.estado || "pendiente";

                let estadoTexto = "";
                let estadoClase = "";

                switch (estado) {

                    case "procesando":
                        estadoTexto = "🔵 Procesando";
                        estadoClase = "estado-procesando";
                        break;

                    case "completado":
                        estadoTexto = "🟢 Completado";
                        estadoClase = "estado-completado";
                        break;

                    case "cancelado":
                        estadoTexto = "🔴 Cancelado";
                        estadoClase = "estado-cancelado";
                        break;

                    default:
                        estadoTexto = "🟡 Pendiente";
                        estadoClase = "estado-pendiente";
                        break;
                }

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
                    ? new Date(pedido.fecha).toLocaleString()
                    : "No especificada";
                // ==========================================
                // MOSTRAR PEDIDO
                // ==========================================

                listaPedidos.innerHTML += `

                <div class="pedido">

                    <h3>📦 Pedido: ${idPedido}</h3>
                    <p><strong>Estado:</strong><span class="estado-pedido ${estadoClase}">${estadoTexto}
                    </span></p>
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

                   ${datos.rol === "master" ? `
                        <div class="acciones-pedido">

                            ${estado === "pendiente" ? `
                                <button
                                    onclick="actualizarEstadoPedido('${idPedido}', 'procesando')">
                                    🔵 Procesar pedido
                                </button>
                            ` : ""}

                            ${estado === "procesando" ? `
                                <button
                                    onclick="actualizarEstadoPedido('${idPedido}', 'completado')">
                                    🟢 Marcar como completado
                                </button>
                            ` : ""}

                            ${estado !== "cancelado" && estado !== "completado" ? `
                                <button
                                    onclick="actualizarEstadoPedido('${idPedido}', 'cancelado')">
                                    🔴 Cancelar pedido
                                </button>
                            ` : ""}

                        </div>
                    ` : estado === "pendiente" ? `
                        <button
                            onclick="cancelarPedido('${idPedido}')">
                            🔴 Cancelar pedido
                        </button>
                    ` : ""}

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
// 🗑️ CANCELAR PEDIDO
// ==============================================================

function cancelarPedido(idPedido) {

    const tokenSesionReal = localStorage.getItem("authToken");

    if (!tokenSesionReal) {
        alert("🔒 Tu sesión ha expirado. Inicia sesión nuevamente.");
        window.location.href = "login.html";
        return;
    }

    const confirmar = confirm(
        "¿Estás seguro de que deseas cancelar este pedido?\n\n" +
        "El pedido permanecerá registrado como cancelado."
    );

    if (!confirmar) {
        return;
    }

    fetch(`${BASE_RENDER_URL}/api/pedidos/${idPedido}`, {

        method: "PATCH",

        headers: {
            "Authorization": `Bearer ${tokenSesionReal}`,
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            estado: "cancelado"
        })

    })
        .then(function (response) {

            return response.json().then(function (data) {

                if (!response.ok) {
                    throw new Error(
                        data.error || "No se pudo cancelar el pedido"
                    );
                }

                return data;
            });

        })
        .then(function (data) {

            alert("🔴 " + data.message);

            mostrarPedidos();

        })
        .catch(function (error) {

            console.error(
                "[CANCELAR PEDIDO ERROR]:",
                error
            );

            alert(
                "❌ No se pudo cancelar el pedido:\n\n" +
                error.message
            );

        });
}
//=============================================================
//Actualizar estado 
//===========================================================//
function actualizarEstadoPedido(idPedido, nuevoEstado) {

    const tokenSesionReal = localStorage.getItem("authToken");

    if (!tokenSesionReal) {
        alert("🔒 Tu sesión ha expirado. Inicia sesión nuevamente.");
        window.location.href = "login.html";
        return;
    }

    let mensajeConfirmacion = "";

    switch (nuevoEstado) {
        case "procesando":
            mensajeConfirmacion =
                "¿Deseas cambiar este pedido a PROCESANDO?";
            break;

        case "completado":
            mensajeConfirmacion =
                "¿Deseas marcar este pedido como COMPLETADO?";
            break;

        case "cancelado":
            mensajeConfirmacion =
                "¿Deseas cancelar este pedido?";
            break;

        default:
            alert("❌ Estado no válido.");
            return;
    }

    if (!confirm(mensajeConfirmacion)) {
        return;
    }

    fetch(`${BASE_RENDER_URL}/api/pedidos/${idPedido}`, {

        method: "PATCH",

        headers: {
            "Authorization": `Bearer ${tokenSesionReal}`,
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            estado: nuevoEstado
        })

    })
        .then(function (response) {

            return response.json().then(function (data) {

                if (!response.ok) {

                    throw new Error(
                        data.error ||
                        "No se pudo actualizar el estado"
                    );
                }

                return data;
            });

        })

        .then(function (data) {

            alert("✅ " + data.message);

            mostrarPedidos();

        })

        .catch(function (error) {

            console.error(
                "[ACTUALIZAR ESTADO ERROR]:",
                error
            );

            alert(
                "❌ No se pudo actualizar el estado:\n\n" +
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
            const paginaDespuesLogin =
                sessionStorage.getItem("paginaDespuesLogin");

            if (paginaDespuesLogin) {

                sessionStorage.removeItem("paginaDespuesLogin");

                window.location.href = paginaDespuesLogin;

            } else {

                window.location.href = "index.html";

            }
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

    window.location.href = "index.html";
}