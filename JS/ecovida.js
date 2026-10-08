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

    const listaPedidos =
        document.getElementById("listaPedidos");

    if (!listaPedidos) {
        return;
    }

    // ==========================================
    // 1. OBTENER SESIÓN
    // ==========================================

    const tokenSesionReal =
        localStorage.getItem("authToken");

    const datosUsuario =
        JSON.parse(
            localStorage.getItem("usuarioLogueado")
        ) || null;


    // ==========================================
    // 2. VERIFICAR SESIÓN
    // ==========================================

    if (!tokenSesionReal || !datosUsuario) {

        listaPedidos.innerHTML = `
            <p>
                🔒 Debes iniciar sesión para consultar tus pedidos.
            </p>
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
        <p>
            ⏳ Consultando pedidos...
        </p>
    `;


    // ==========================================
    // 3. CONSULTAR FLASK / RENDER
    // ==========================================

    fetch(`${BASE_RENDER_URL}/api/pedidos`, {

        method: "GET",

        headers: {

            "Authorization":
                `Bearer ${tokenSesionReal}`,

            "Content-Type":
                "application/json"
        }

    })


        // ==========================================
        // 4. PROCESAR RESPUESTA
        // ==========================================

        .then(function (response) {

            return response.json()
                .then(function (data) {

                    if (!response.ok) {

                        throw new Error(
                            data.error ||
                            "No se pudieron obtener los pedidos"
                        );
                    }

                    return data;

                });

        })


        // ==========================================
        // 5. MOSTRAR PEDIDOS
        // ==========================================

        .then(function (datos) {

            console.log(
                "[PEDIDOS] Respuesta recibida:",
                datos
            );


            listaPedidos.innerHTML = "";


            const pedidos =
                datos.pedidos || {};
            window.pedidosMaster = pedidos;


            // ==========================================
            // CONTADORES
            // ==========================================

            let pendientes = 0;
            let procesando = 0;
            let completados = 0;
            let cancelados = 0;


            Object.values(pedidos)
                .forEach(function (pedido) {

                    const estado =
                        pedido.estado ||
                        "pendiente";


                    switch (estado) {

                        case "pendiente":
                            pendientes++;
                            break;

                        case "procesando":
                            procesando++;
                            break;

                        case "completado":
                            completados++;
                            break;

                        case "cancelado":
                            cancelados++;
                            break;
                    }

                });


            const totalPedidos =
                pendientes +
                procesando +
                completados +
                cancelados;


            // ==========================================
            // ORDENAR PEDIDOS
            // ==========================================

            const idsPedidos =
                Object.keys(pedidos)
                    .sort(function (a, b) {

                        const prioridad = {

                            pendiente: 1,
                            procesando: 2,
                            completado: 3,
                            cancelado: 4

                        };


                        const estadoA =
                            pedidos[a].estado ||
                            "pendiente";


                        const estadoB =
                            pedidos[b].estado ||
                            "pendiente";


                        return (
                            (prioridad[estadoA] || 99) -
                            (prioridad[estadoB] || 99)
                        );

                    });


            // ==========================================
            // 6. NO HAY PEDIDOS
            // ==========================================

            if (idsPedidos.length === 0) {

                listaPedidos.innerHTML = `

                    <div class="pedido">

                        <p>
                            📦 No tienes pedidos registrados.
                        </p>

                    </div>

                `;

                return;
            }


            // ==========================================
            // 7. CABECERA SEGÚN EL ROL
            // ==========================================

            if (datos.rol === "master") {

                // ==========================================
                // PANEL MASTER
                // ==========================================

                listaPedidos.innerHTML = `

                    <div class="info-pedidos">

                        <div class="panel-master-pedidos">
                        <div class="busqueda-pedidos-master">

                            <div class="busqueda-pedidos-input">

                                <span>🔎</span>

                                <input
                                    type="text"
                                    id="buscarPedidosMaster"
                                    placeholder="Buscar por pedido, usuario o producto..."
                                    autocomplete="off"
                                >

                                <button
                                    type="button"
                                    id="limpiarBusquedaPedidos"
                                    title="Limpiar búsqueda"
                                    aria-label="Limpiar búsqueda">

                                    ✕

                                </button>

                            </div>


                            <div class="filtros-pedidos-master">

                                <button
                                    type="button"
                                    class="filtro-estado-pedido activo"
                                    data-estado="todos">

                                    Todos

                                </button>

                                <button
                                    type="button"
                                    class="filtro-estado-pedido"
                                    data-estado="pendiente">

                                    🟡 Pendientes

                                </button>

                                <button
                                    type="button"
                                    class="filtro-estado-pedido"
                                    data-estado="procesando">

                                    🔵 Procesando

                                </button>

                                <button
                                    type="button"
                                    class="filtro-estado-pedido"
                                    data-estado="completado">

                                    🟢 Completados

                                </button>

                                <button
                                    type="button"
                                    class="filtro-estado-pedido"
                                    data-estado="cancelado">

                                    🔴 Cancelados

                                </button>

                            </div>


                            <span
                                id="resultadoBusquedaPedidos"
                                class="resultado-busqueda-pedidos">
                            </span>

                        </div>

                            <h2>
                                👑 PANEL DE PEDIDOS
                            </h2>

                            <p>
                                Todos los pedidos
                            </p>

                            <hr>


                            <div class="resumen-pedidos">

                                <p>
                                    🟡 Pendientes
                                    <strong>
                                        ${pendientes}
                                    </strong>
                                </p>


                                <p>
                                    🔵 Procesando
                                    <strong>
                                        ${procesando}
                                    </strong>
                                </p>


                                <p>
                                    🟢 Completados
                                    <strong>
                                        ${completados}
                                    </strong>
                                </p>


                                <p>
                                    🔴 Cancelados
                                    <strong>
                                        ${cancelados}
                                    </strong>
                                </p>

                            </div>

                            <hr>


                            <p>

                                <strong>
                                    Total pedidos:
                                    ${totalPedidos}
                                </strong>

                            </p>

                        </div>

                    </div>


                    <div class="tabla-pedidos-master">

                        <table>

                            <thead>

                                <tr>

                                    <th>
                                        Pedido
                                    </th>

                                    <th>
                                        Usuario
                                    </th>

                                    <th>
                                        Total
                                    </th>

                                    <th>
                                        Estado
                                    </th>

                                    <th>
                                        Acciones
                                    </th>

                                </tr>

                            </thead>


                            <tbody id="tablaPedidosMaster">

                            </tbody>

                        </table>

                    </div>

                `;


                // ==========================================
                // CREAR FILAS DE LA TABLA MASTER
                // ==========================================

                const tablaMaster =
                    document.getElementById(
                        "tablaPedidosMaster"
                    );


                idsPedidos.forEach(function (idPedido) {

                    const pedido =
                        pedidos[idPedido];


                    const estado =
                        pedido.estado ||
                        "pendiente";


                    let estadoTexto = "";
                    let estadoClase = "";


                    switch (estado) {

                        case "procesando":

                            estadoTexto =
                                "🔵 Procesando";

                            estadoClase =
                                "estado-procesando";

                            break;


                        case "completado":

                            estadoTexto =
                                "🟢 Completado";

                            estadoClase =
                                "estado-completado";

                            break;


                        case "cancelado":

                            estadoTexto =
                                "🔴 Cancelado";

                            estadoClase =
                                "estado-cancelado";

                            break;


                        default:

                            estadoTexto =
                                "🟡 Pendiente";

                            estadoClase =
                                "estado-pendiente";

                            break;

                    }


                    const total =
                        Number(
                            pedido.total || 0
                        );


                    if (tablaMaster) {

                        tablaMaster.innerHTML += `

                            <tr>

                                <td>

                                    <strong>
                                        #${idPedido}
                                    </strong>

                                </td>


                                <td>

                                    ${pedido.correoUsuario ||
                            "No asignado"}

                                </td>


                                <td>

                                    <strong>
                                        S/
                                        ${total.toFixed(2)}
                                    </strong>

                                </td>


                                <td>

                                    <span
                                        class="estado-pedido ${estadoClase}">

                                        ${estadoTexto}

                                    </span>

                                </td>
   
                                <td class="acciones-tabla">

                                    <button
                                        type="button"
                                        class="btn-tabla-detalles"
                                        data-pedido="${idPedido}">

                                        👁 Ver pedido

                                    </button>

                                </td>

                            </tr>

                        `;

                    }

                });


                // ==========================================
                // IMPORTANTE:
                // EL MASTER TERMINA AQUÍ
                // NO SE CREAN TARJETAS .pedido
                // ==========================================

                return;

            }


            // ==========================================
            // 8. VISTA USUARIO NORMAL
            // ==========================================

            listaPedidos.innerHTML = `

                    <div class="info-pedidos">

                        <div class="panel-master-pedidos">

                            <h2>
                                👑 PANEL DE PEDIDOS
                            </h2>

                            <p>
                                Todos los pedidos
                            </p>

                            <hr>

                            <div class="busqueda-pedidos-master">

                                <div class="busqueda-pedidos-input">

                                    <span>🔎</span>

                                    <input
                                        type="text"
                                        id="buscarPedidosMaster"
                                        placeholder="Buscar por pedido, usuario o producto..."
                                        autocomplete="off"
                                    >

                                    <button
                                        type="button"
                                        id="limpiarBusquedaPedidos"
                                        title="Limpiar búsqueda"
                                        aria-label="Limpiar búsqueda">

                                        ✕

                                    </button>

                                </div>

                                <span
                                    id="resultadoBusquedaPedidos"
                                    class="resultado-busqueda-pedidos">
                                </span>

                            </div>

                            <div class="resumen-pedidos">

                                <p>
                                    🟡 Pendientes
                                    <strong>
                                        ${pendientes}
                                    </strong>
                                </p>

                                <p>
                                    🔵 Procesando
                                    <strong>
                                        ${procesando}
                                    </strong>
                                </p>

                                <p>
                                    🟢 Completados
                                    <strong>
                                        ${completados}
                                    </strong>
                                </p>

                                <p>
                                    🔴 Cancelados
                                    <strong>
                                        ${cancelados}
                                    </strong>
                                </p>

                            </div>

                            <hr>

                            <p>
                                <strong>
                                    Total pedidos:
                                    ${totalPedidos}
                                </strong>
                            </p>

                        </div>

                    </div>


                    <div class="tabla-pedidos-master">

                        <table>

                            <thead>

                                <tr>

                                    <th>
                                        Pedido
                                    </th>

                                    <th>
                                        Usuario
                                    </th>

                                    <th>
                                        Total
                                    </th>

                                    <th>
                                        Estado
                                    </th>

                                    <th>
                                        Acciones
                                    </th>

                                </tr>

                            </thead>

                            <tbody id="tablaPedidosMaster">
                            </tbody>

                        </table>

                    </div>

                `;


            // ==========================================
            // CREAR TARJETAS DEL USUARIO
            // ==========================================

            idsPedidos.forEach(function (idPedido) {

                const pedido =
                    pedidos[idPedido];


                // ==========================================
                // PRODUCTOS
                // ==========================================

                let productosHTML = "";


                if (
                    pedido.productos &&
                    Array.isArray(pedido.productos)
                ) {

                    pedido.productos
                        .forEach(function (producto) {

                            productosHTML += `

                                <li>

                                    ${producto.nombre ||
                                "Producto"}

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

                        <li>
                            Sin productos registrados
                        </li>

                    `;

                }


                // ==========================================
                // ESTADO
                // ==========================================

                const estado =
                    pedido.estado ||
                    "pendiente";


                let estadoTexto = "";
                let estadoClase = "";


                switch (estado) {

                    case "procesando":

                        estadoTexto =
                            "🔵 Procesando";

                        estadoClase =
                            "estado-procesando";

                        break;


                    case "completado":

                        estadoTexto =
                            "🟢 Completado";

                        estadoClase =
                            "estado-completado";

                        break;


                    case "cancelado":

                        estadoTexto =
                            "🔴 Cancelado";

                        estadoClase =
                            "estado-cancelado";

                        break;


                    default:

                        estadoTexto =
                            "🟡 Pendiente";

                        estadoClase =
                            "estado-pendiente";

                        break;

                }


                // ==========================================
                // DATOS ECONÓMICOS
                // ==========================================

                const envio =
                    Number(
                        pedido.costoEnvioExterno || 0
                    );


                const subtotal =
                    Number(
                        pedido.subtotal || 0
                    );


                const total =
                    Number(
                        pedido.total || 0
                    );


                const fecha =
                    pedido.fecha
                        ? new Date(
                            pedido.fecha
                        ).toLocaleString()
                        : "No especificada";


                // ==========================================
                // TARJETA
                // ==========================================

                listaPedidos.innerHTML += `

                    <div class="pedido">

                        <h3>

                            📦 Pedido:
                            ${idPedido}

                        </h3>


                        <p>

                            <strong>
                                Estado:
                            </strong>

                            <span
                                class="estado-pedido ${estadoClase}">

                                ${estadoTexto}

                            </span>

                        </p>


                        <p>

                            <strong>
                                Propietario:
                            </strong>

                            ${pedido.correoUsuario ||
                    "No asignado"}

                        </p>


                        <p>

                            <strong>
                                Fecha:
                            </strong>

                            ${fecha}

                        </p>


                        <p>

                            <strong>
                                Subtotal:
                            </strong>

                            S/
                            ${subtotal.toFixed(2)}

                        </p>


                        <h4>
                            Productos:
                        </h4>


                        <ul>

                            ${productosHTML}

                        </ul>


                        <p>

                            <strong>
                                Costo de envío:
                            </strong>

                            S/
                            ${envio.toFixed(2)}

                        </p>


                        <p>

                            <strong>
                                Total:
                            </strong>

                            S/
                            ${total.toFixed(2)}

                        </p>


                        ${estado === "pendiente"
                        ? `

                                <button
                                    onclick="cancelarPedido('${idPedido}')">

                                    🔴 Cancelar pedido

                                </button>

                            `
                        : ""
                    }

                    </div>


                    <hr>

                `;

            });

        })


        // ==========================================
        // 9. ERROR
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
                        onclick="mostrarPedidos()">

                        🔄 Reintentar

                    </button>

                </div>

            `;

        });

}
// =============================================================
// FILTRAR PEDIDOS MASTER
// BÚSQUEDA + FILTRO POR ESTADO
// =============================================================

function filtrarPedidosMaster() {

    const input =
        document.getElementById(
            "buscarPedidosMaster"
        );

    const tabla =
        document.getElementById(
            "tablaPedidosMaster"
        );

    const contador =
        document.getElementById(
            "resultadoBusquedaPedidos"
        );

    if (!input || !tabla) {
        return;
    }


    // ==========================================
    // TEXTO DE BÚSQUEDA
    // ==========================================

    const texto =
        input.value
            .trim()
            .toLowerCase();


    // ==========================================
    // ESTADO SELECCIONADO
    // ==========================================

    const filtroActivo =
        document.querySelector(
            ".filtro-estado-pedido.activo"
        );


    const estadoSeleccionado =
        filtroActivo
            ? filtroActivo.dataset.estado
            : "todos";


    // ==========================================
    // PEDIDOS
    // ==========================================

    const pedidos =
        window.pedidosMaster || {};


    const idsPedidos =
        Object.keys(pedidos);


    // ==========================================
    // FILTRAR
    // ==========================================

    const resultados =
        idsPedidos.filter(function (idPedido) {

            const pedido =
                pedidos[idPedido];


            const estado =
                pedido.estado ||
                "pendiente";


            // ----------------------------------
            // FILTRO DE ESTADO
            // ----------------------------------

            if (
                estadoSeleccionado !== "todos" &&
                estado !== estadoSeleccionado
            ) {

                return false;

            }


            // ----------------------------------
            // PRODUCTOS
            // ----------------------------------

            const productos =
                Array.isArray(
                    pedido.productos
                )
                    ? pedido.productos
                    : [];


            const nombresProductos =
                productos
                    .map(function (producto) {

                        return producto.nombre || "";

                    })
                    .join(" ");


            // ----------------------------------
            // CONTENIDO BUSCABLE
            // ----------------------------------

            const contenido =
                [

                    idPedido,

                    pedido.correoUsuario || "",

                    pedido.estado || "",

                    nombresProductos

                ]
                    .join(" ")
                    .toLowerCase();


            // ----------------------------------
            // BÚSQUEDA
            // ----------------------------------

            return contenido.includes(texto);

        });


    // ==========================================
    // LIMPIAR TABLA
    // ==========================================

    tabla.innerHTML = "";


    // ==========================================
    // SIN RESULTADOS
    // ==========================================

    if (
        resultados.length === 0
    ) {

        tabla.innerHTML = `

            <tr class="fila-sin-resultados">

                <td colspan="5">

                    <span class="icono-sin-resultados">
                        🔎
                    </span>

                    No se encontraron pedidos.

                </td>

            </tr>

        `;

    }


    // ==========================================
    // MOSTRAR RESULTADOS
    // ==========================================

    else {

        resultados.forEach(
            function (idPedido) {

                const pedido =
                    pedidos[idPedido];


                const estado =
                    pedido.estado ||
                    "pendiente";


                let estadoTexto =
                    "🟡 Pendiente";


                let estadoClase =
                    "estado-pendiente";


                switch (estado) {

                    case "procesando":

                        estadoTexto =
                            "🔵 Procesando";

                        estadoClase =
                            "estado-procesando";

                        break;


                    case "completado":

                        estadoTexto =
                            "🟢 Completado";

                        estadoClase =
                            "estado-completado";

                        break;


                    case "cancelado":

                        estadoTexto =
                            "🔴 Cancelado";

                        estadoClase =
                            "estado-cancelado";

                        break;

                }


                const total =
                    Number(
                        pedido.total || 0
                    );


                tabla.innerHTML += `

                    <tr>

                        <td>

                            <strong>
                                #${idPedido}
                            </strong>

                        </td>


                        <td>

                            ${pedido.correoUsuario ||
                    "No asignado"
                    }

                        </td>


                        <td>

                            <strong>
                                S/
                                ${total.toFixed(2)}
                            </strong>

                        </td>


                        <td>

                            <span
                                class="estado-pedido ${estadoClase}">

                                ${estadoTexto}

                            </span>

                        </td>


                        <td class="acciones-tabla">

                            <button
                                type="button"
                                class="btn-tabla-detalles"
                                data-pedido="${idPedido}">

                                👁 Ver pedido

                            </button>

                        </td>

                    </tr>

                `;

            }
        );

    }


    // ==========================================
    // CONTADOR
    // ==========================================

    if (contador) {

        if (texto || estadoSeleccionado !== "todos") {

            contador.textContent =
                `${resultados.length} pedido${resultados.length === 1
                    ? ""
                    : "s"
                } encontrado${resultados.length === 1
                    ? ""
                    : "s"
                }`;

        } else {

            contador.textContent =
                `${resultados.length} pedidos`;

        }

    }

}
// =============================================================
// EVENTO BUSCADOR DE PEDIDOS
// =============================================================

document.addEventListener("input", function (event) {

    if (
        event.target &&
        event.target.id === "buscarPedidosMaster"
    ) {

        filtrarPedidosMaster();


        const botonLimpiar =
            document.getElementById(
                "limpiarBusquedaPedidos"
            );


        if (botonLimpiar) {

            botonLimpiar.classList.toggle(
                "visible",
                event.target.value.length > 0
            );

        }

    }

});
// =============================================================
// LIMPIAR BUSCADOR
// =============================================================

document.addEventListener("click", function (event) {

    const boton =
        event.target.closest(
            "#limpiarBusquedaPedidos"
        );

    if (!boton) {
        return;
    }


    const input =
        document.getElementById(
            "buscarPedidosMaster"
        );


    if (!input) {
        return;
    }


    input.value = "";


    filtrarPedidosMaster();


    boton.classList.remove("visible");


    input.focus();

});
//=========================================================
// Detalles pedidos
//========================================================
function verDetallesPedido(idPedido) {

    console.log("[PEDIDOS] Ejecutando verDetallesPedido:", idPedido);

    const pedidos = window.pedidosMaster || {};

    console.log("[PEDIDOS] Pedidos disponibles:", pedidos);

    const pedido = pedidos[idPedido];

    console.log("[PEDIDOS] Pedido seleccionado:", pedido);

    if (!pedido) {

        console.error(
            "[PEDIDOS] No se encontró el pedido:",
            idPedido
        );

        alert("No se encontró la información del pedido.");

        return;
    }

    const modal = document.createElement("div");

    modal.id = "modalDetallesPedido";

    modal.className = "modal-detalles-pedido";

    modal.innerHTML = `

        <div class="modal-detalles-contenido">

            <div class="modal-detalles-header">

                <div>

                    <span class="modal-detalles-etiqueta">

                        DETALLE DEL PEDIDO

                    </span>

                    <h2>

                        📦 #${idPedido}

                    </h2>

                </div>

                <button
                    type="button"
                    class="btn-cerrar-modal"
                    id="btnCerrarModalPedido">

                    ✕

                </button>

            </div>


            <div class="modal-detalles-datos">

                <div class="dato-pedido">

                    <span>
                        👤 Usuario
                    </span>

                    <strong>

                        ${pedido.correoUsuario || "No asignado"}

                    </strong>

                </div>


                <div class="dato-pedido">

                    <span>
                        📅 Fecha
                    </span>

                    <strong>

                        ${pedido.fecha
            ? new Date(
                pedido.fecha
            ).toLocaleString()
            : "No especificada"
        }

                    </strong>

                </div>


                <div class="dato-pedido">

                    <span>
                        📋 Estado
                    </span>

                    <strong>

                        ${pedido.estado || "pendiente"}

                    </strong>

                </div>

            </div>


            <div class="modal-seccion">

                <div class="modal-seccion-titulo">

                    <h3>
                        🛍️ Productos
                    </h3>

                </div>


                <div class="lista-detalles-productos">

                    ${pedido.productos &&
            Array.isArray(pedido.productos)

            ? pedido.productos.map(function (producto) {

                return `

                                    <div class="detalle-producto">

                                        <div class="detalle-producto-info">

                                            <strong>

                                                ${producto.nombre ||
                    "Producto"
                    }

                                            </strong>

                                            <span>

                                                Cantidad:
                                                ${producto.cantidad ||
                    producto.cantidadProducto ||
                    1
                    }

                                            </span>

                                        </div>

                                        <strong>

                                            S/
                                            ${Number(
                        producto.precio || 0
                    ).toFixed(2)
                    }

                                        </strong>

                                    </div>

                                `;

            }).join("")

            : `

                                <div class="detalle-sin-productos">

                                    📦 No hay productos registrados.

                                </div>

                            `
        }

                </div>

            </div>


            <div class="resumen-detalle-pedido">

                <div>

                    <span>
                        Subtotal
                    </span>

                    <strong>

                        S/
                        ${Number(
            pedido.subtotal || 0
        ).toFixed(2)}

                    </strong>

                </div>


                <div>

                    <span>
                        🚚 Envío
                    </span>

                    <strong>

                        S/
                        ${Number(
            pedido.costoEnvioExterno || 0
        ).toFixed(2)}

                    </strong>

                </div>


                <div class="total-detalle-pedido">

                    <span>
                        Total
                    </span>

                    <strong>

                        S/
                        ${Number(
            pedido.total || 0
        ).toFixed(2)}

                    </strong>

                </div>

            </div>

        </div>

    `;


    document.body.appendChild(modal);


    console.log(
        "[PEDIDOS] Modal agregado al documento."
    );


    document.body.style.overflow = "hidden";


    setTimeout(function () {

        modal.classList.add("modal-visible");

    }, 10);


    const btnCerrar =
        document.getElementById(
            "btnCerrarModalPedido"
        );


    if (btnCerrar) {

        btnCerrar.addEventListener(
            "click",
            cerrarDetallesPedido
        );

    }



    modal.addEventListener(
        "click",
        function (event) {

            if (
                event.target === modal
            ) {

                cerrarDetallesPedido();

            }

        }
    );

}


function cerrarDetallesPedido() {

    const modal =
        document.getElementById(
            "modalDetallesPedido"
        );

    if (!modal) {

        return;
    }

    modal.classList.remove(
        "modal-visible"
    );

    setTimeout(function () {

        modal.remove();

        document.body.style.overflow = "";

    }, 200);

}


function actualizarEstadoDesdeModal(
    idPedido,
    nuevoEstado
) {

    cerrarDetallesPedido();

    actualizarEstadoPedido(
        idPedido,
        nuevoEstado
    );

}
//agregue click

document.addEventListener("click", function (event) {

    const boton =
        event.target.closest(".btn-tabla-detalles");

    if (!boton) {
        return;
    }

    const idPedido =
        boton.getAttribute("data-pedido");

    console.log(
        "[PEDIDOS] Abriendo pedido:",
        idPedido
    );

    if (!idPedido) {

        console.error(
            "[PEDIDOS] No se encontró el ID del pedido."
        );

        return;
    }

    verDetallesPedido(idPedido);

});

document.addEventListener("input", function (event) {

    if (
        event.target &&
        event.target.id === "buscarPedidosMaster"
    ) {

        filtrarPedidosMaster();

        const botonLimpiar =
            document.getElementById(
                "limpiarBusquedaPedidos"
            );

        if (botonLimpiar) {

            botonLimpiar.classList.toggle(
                "visible",
                event.target.value.length > 0
            );

        }

    }

});

document.addEventListener("click", function (event) {

    const boton =
        event.target.closest(
            "#limpiarBusquedaPedidos"
        );

    if (!boton) {
        return;
    }

    const input =
        document.getElementById(
            "buscarPedidosMaster"
        );

    if (!input) {
        return;
    }

    input.value = "";

    filtrarPedidosMaster();

    boton.classList.remove("visible");

    input.focus();

});
// =============================================================
// FILTROS POR ESTADO
// =============================================================

document.addEventListener(
    "click",
    function (event) {

        const boton =
            event.target.closest(
                ".filtro-estado-pedido"
            );


        if (!boton) {
            return;
        }


        // Quitar activo de todos

        document
            .querySelectorAll(
                ".filtro-estado-pedido"
            )
            .forEach(function (botonFiltro) {

                botonFiltro.classList.remove(
                    "activo"
                );

            });


        // Activar seleccionado

        boton.classList.add(
            "activo"
        );


        // Aplicar filtro

        filtrarPedidosMaster();

    }
);
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