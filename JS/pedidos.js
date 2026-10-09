
/* =====================================================
   ECOVIDA - GESTIÓN DE PEDIDOS
===================================================== */

(function () {
    "use strict";

    const ESTADOS = [
        "pendiente",
        "procesando",
        "completado",
        "cancelado"
    ];

    let pedidosActuales = [];
    let filtroEstado = "todos";
    let busqueda = "";

    function obtenerConfig() {
        return window.ECOVIDA_CONFIG || {};
    }

    function obtenerUsuario() {
        try {
            return JSON.parse(
                localStorage.getItem("usuarioLogueado") ||
                localStorage.getItem("usuario") ||
                "null"
            );
        } catch (error) {
            return null;
        }
    }

    function obtenerToken() {
        return localStorage.getItem("authToken");
    }

    function esMaster() {
        return String(obtenerUsuario()?.rol || "").toLowerCase() === "master";
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

    function normalizarEstado(estado) {
        const valor = String(estado || "pendiente").toLowerCase();

        return ESTADOS.includes(valor) ? valor : "pendiente";
    }

    function obtenerProductos(pedido) {
        if (Array.isArray(pedido.productos)) {
            return pedido.productos;
        }

        return [];
    }

    function obtenerCantidadProductos(pedido) {
        return obtenerProductos(pedido).reduce(
            (total, producto) =>
                total + (Number(producto.cantidad) || 1),
            0
        );
    }

    function obtenerNombreProductos(pedido) {
        return obtenerProductos(pedido)
            .map(producto => producto.nombre || "Producto")
            .join(", ");
    }

    function obtenerTotal(pedido) {
        const total = Number(pedido.total);

        if (Number.isFinite(total)) {
            return total;
        }

        return (
            (Number(pedido.subtotal) || 0) +
            (Number(pedido.costoEnvioExterno) || 0)
        );
    }

    async function mostrarPedidos() {
        const contenedor = document.getElementById("listaPedidos");

        if (!contenedor) return;

        const token = obtenerToken();
        const config = obtenerConfig();

        if (!token) {
            contenedor.innerHTML =
                "<p>Debes iniciar sesión para consultar tus pedidos.</p>";
            return;
        }

        if (!config.BASE_RENDER_URL) {
            contenedor.innerHTML =
                "<p>No se encuentra la configuración de la API.</p>";
            return;
        }

        contenedor.innerHTML = "<p>Cargando pedidos...</p>";

        try {
            const respuesta = await fetch(
                `${config.BASE_RENDER_URL}/api/pedidos`,
                {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                }
            );

            if (!respuesta.ok) {
                throw new Error(
                    respuesta.status === 401 || respuesta.status === 403
                        ? "No tienes permiso para consultar estos pedidos."
                        : "No se pudieron cargar los pedidos."
                );
            }

            const datos = await respuesta.json();

            let pedidos = datos.pedidos ?? datos;

            if (Array.isArray(pedidos)) {
                pedidosActuales = pedidos.map((pedido, indice) => ({
                    ...pedido,
                    id: pedido.id || pedido._id || String(indice),
                    estado: normalizarEstado(pedido.estado)
                }));
            } else if (pedidos && typeof pedidos === "object") {
                pedidosActuales = Object.entries(pedidos).map(
                    ([id, pedido]) => ({
                        ...pedido,
                        id: pedido.id || pedido._id || id,
                        estado: normalizarEstado(pedido.estado)
                    })
                );
            } else {
                pedidosActuales = [];
            }

            // Compatibilidad con otros componentes de la página.
            window.pedidosMaster = pedidosActuales;

            renderizarPedidos();

        } catch (error) {
            console.error("Error al cargar pedidos:", error);

            contenedor.innerHTML = `
                <p class="error-pedidos">
                    ${escaparHTML(error.message || "Error de conexión.")}
                </p>
                <button type="button" onclick="mostrarPedidos()">
                    Reintentar
                </button>
            `;
        }
    }


    function renderizarPedidos() {
        const contenedor = document.getElementById("listaPedidos");
        if (!contenedor) return;

        const pedidosFiltrados = pedidosActuales.filter(pedido => {
            const coincideEstado =
                filtroEstado === "todos" || pedido.estado === filtroEstado;

            const texto = [
                pedido.id,
                pedido.correoUsuario,
                pedido.estado,
                obtenerNombreProductos(pedido)
            ].join(" ").toLowerCase();

            return coincideEstado && texto.includes(busqueda);
        });

        // Resumen de pedidos por estado
        const resumen = ESTADOS.map(estado => {
            const cantidad = pedidosActuales.filter(
                pedido => pedido.estado === estado
            ).length;

            return `
            <p>
                ${estado.charAt(0).toUpperCase() + estado.slice(1)}
                <strong>${cantidad}</strong>
            </p>
        `;
        }).join("");

        // Filtros para consultar los pedidos
        const filtros = `
        <div class="filtros-pedidos-master">
            <button type="button"
                class="filtro-estado-pedido ${filtroEstado === "todos" ? "activo" : ""}"
                onclick="filtrarPedidosMaster('todos')">
                Todos (${pedidosActuales.length})
            </button>

            ${ESTADOS.map(estado => {
            const cantidad = pedidosActuales.filter(
                pedido => pedido.estado === estado
            ).length;

            return `
                    <button type="button"
                        class="filtro-estado-pedido ${filtroEstado === estado ? "activo" : ""}"
                        onclick="filtrarPedidosMaster('${estado}')">
                        ${estado.charAt(0).toUpperCase() + estado.slice(1)}
                        (${cantidad})
                    </button>
                `;
        }).join("")}
        </div>
    `;

        // Tabla de pedidos
        const filas = pedidosFiltrados.map(pedido => `
        <tr>
            <td>${escaparHTML(pedido.id)}</td>
            <td>${escaparHTML(pedido.correoUsuario || "No disponible")}</td>
            <td>${escaparHTML(obtenerNombreProductos(pedido) || "Sin productos")}</td>
            <td>${obtenerCantidadProductos(pedido)}</td>
            <td>S/ ${obtenerTotal(pedido).toFixed(2)}</td>
            <td>
                <span class="estado-pedido estado-${escaparHTML(pedido.estado)}">
                    ${escaparHTML(pedido.estado)}
                </span>
            </td>
            <td>
                <button type="button"
                    class="btn-tabla-detalles"
                    onclick="verDetallesPedido('${escaparHTML(pedido.id)}')">
                    Ver pedido
                </button>
            </td>
        </tr>
    `).join("");

        contenedor.innerHTML = `
        <section class="panel-master-pedidos panel-pedidos">

            <div class="resumen-pedidos">
                ${resumen}
            </div>

            ${filtros}

            <div class="busqueda-pedidos-master">
                <input
                    type="search"
                    id="buscarPedidosMaster"
                    class="busqueda-pedidos-input"
                    placeholder="Buscar por pedido, correo o producto..."
                    value="${escaparHTML(busqueda)}">

                <button type="button"
                    onclick="limpiarBusquedaPedidos()">
                    Limpiar
                </button>
            </div>

            <div class="tabla-pedidos-master">
                <table>
                    <thead>
                        <tr>
                            <th>Pedido</th>
                            <th>Cliente</th>
                            <th>Productos</th>
                            <th>Cantidad</th>
                            <th>Total</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${filas || `
                            <tr>
                                <td colspan="7">
                                    No se encontraron pedidos.
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>

            <div id="modalDetallesPedido" class="modal-pedido">
                <div class="modal-detalles-contenido">
                    <div id="contenidoDetallesPedido"></div>
                </div>
            </div>

        </section>
    `;

        // Mantener el buscador activo mientras se escribe
        const campoBusqueda = document.getElementById("buscarPedidosMaster");

        if (campoBusqueda) {
            campoBusqueda.addEventListener("input", evento => {
                const posicion = evento.target.selectionStart;
                busqueda = evento.target.value.toLowerCase();

                renderizarPedidos();

                const nuevoCampo = document.getElementById("buscarPedidosMaster");

                if (nuevoCampo) {
                    nuevoCampo.focus();
                    nuevoCampo.setSelectionRange(posicion, posicion);
                }
            });
        }
    }

    function filtrarPedidosMaster(estado) {
        filtroEstado = estado;
        renderizarPedidos();
    }

    function limpiarBusquedaPedidos() {
        busqueda = "";
        renderizarPedidos();
    }


    function verDetallesPedido(idPedido) {
        const pedido = pedidosActuales.find(
            item => String(item.id) === String(idPedido)
        );

        if (!pedido) {
            alert("No se encontró el pedido seleccionado.");
            return;
        }

        const modal = document.getElementById("modalDetallesPedido");
        const contenido = document.getElementById("contenidoDetallesPedido");

        if (!modal || !contenido) {
            console.error("No se encontró la estructura del modal.");
            return;
        }

        const productosHTML = obtenerProductos(pedido).map(producto => {
            const cantidad = Number(producto.cantidad) || 1;
            const precio = Number(producto.precio) || 0;

            return `
            <li class="detalle-producto">
                <span>${escaparHTML(producto.nombre || "Producto")}</span>
                <span>${cantidad} × S/ ${precio.toFixed(2)}</span>
            </li>
        `;
        }).join("");

        // Solo el master puede modificar el estado
        const controlesEstado = esMaster() ? `
        <div class="modal-acciones">
            <label for="nuevoEstadoPedido">Cambiar estado del pedido</label>

            <select id="nuevoEstadoPedido">
                ${ESTADOS.map(estado => `
                    <option value="${estado}"
                        ${pedido.estado === estado ? "selected" : ""}>
                        ${estado.charAt(0).toUpperCase() + estado.slice(1)}
                    </option>
                `).join("")}
            </select>

            <button type="button"
                onclick="actualizarEstadoPedido('${escaparHTML(pedido.id)}')">
                Guardar estado
            </button>
        </div>
    ` : "";

        // Controles para solicitar o resolver una cancelación
        const solicitudCancelacion = pedido.solicitudCancelacion || {};
        let controlesCancelacion = "";

        if (esMaster()) {
            if (solicitudCancelacion.estado === "pendiente") {
                controlesCancelacion = `
                    <div class="modal-acciones">
                        <h3>Solicitud de cancelación</h3>
                        <p><strong>Motivo del cliente:</strong></p>
                        <p>${escaparHTML(solicitudCancelacion.motivo || "Sin motivo indicado")}</p>

                        <label for="respuestaSolicitudCancelacion">
                            Respuesta al cliente (opcional)
                        </label>
                        <textarea
                            id="respuestaSolicitudCancelacion"
                            rows="3"
                            maxlength="500"
                            placeholder="Escribe una respuesta..."></textarea>

                        <button type="button"
                            onclick="resolverSolicitudCancelacion('${escaparHTML(pedido.id)}', 'aprobar')">
                            Aprobar cancelación
                        </button>

                        <button type="button"
                            onclick="resolverSolicitudCancelacion('${escaparHTML(pedido.id)}', 'rechazar')">
                            Rechazar solicitud
                        </button>
                    </div>
                `;
            } else if (solicitudCancelacion.estado) {
                controlesCancelacion = `
                    <div class="modal-acciones">
                        <h3>Solicitud de cancelación</h3>
                        <p>Estado: <strong>${escaparHTML(solicitudCancelacion.estado)}</strong></p>
                        <p>Motivo: ${escaparHTML(solicitudCancelacion.motivo || "No indicado")}</p>
                        <p>Respuesta: ${escaparHTML(solicitudCancelacion.respuestaMaster || "Sin respuesta")}</p>
                    </div>
                `;
            }
        } else {
            if (["pendiente", "procesando"].includes(pedido.estado)) {
                if (solicitudCancelacion.estado === "pendiente") {
                    controlesCancelacion = `
                        <div class="modal-acciones">
                            <h3>Solicitud de cancelación</h3>
                            <p>Tu solicitud está pendiente de revisión.</p>
                            <p>Motivo: ${escaparHTML(solicitudCancelacion.motivo || "No indicado")}</p>
                        </div>
                    `;
                } else {
                    controlesCancelacion = `
                        <div class="modal-acciones">
                            <h3>¿Deseas cancelar tu pedido?</h3>
                            <label for="motivoSolicitudCancelacion">
                                Motivo de la cancelación
                            </label>
                            <textarea
                                id="motivoSolicitudCancelacion"
                                rows="3"
                                maxlength="500"
                                placeholder="Explica por qué deseas cancelar..."
                                required></textarea>

                            <button type="button"
                                onclick="solicitarCancelacionPedido('${escaparHTML(pedido.id)}')">
                                Enviar solicitud
                            </button>
                        </div>
                    `;
                }
            } else {
                controlesCancelacion = `
                    <div class="modal-acciones">
                        <p>Para consultar una cancelación de este pedido, contacta con soporte.</p>
                    </div>
                `;
            }

            if (
                solicitudCancelacion.estado === "aprobada" ||
                solicitudCancelacion.estado === "rechazada"
            ) {
                controlesCancelacion += `
                    <p>Resultado de tu solicitud:
                        <strong>${escaparHTML(solicitudCancelacion.estado)}</strong>
                    </p>
                    <p>${escaparHTML(solicitudCancelacion.respuestaMaster || "")}</p>
                `;
            }
        }

        contenido.innerHTML = `
        <div class="modal-detalles-header">
            <div>
                <h2>Detalle del pedido</h2>
                <p>Información completa de tu pedido EcoVida</p>
            </div>

            <button type="button"
                class="btn-cerrar-modal"
                onclick="cerrarModalPedido()"
                aria-label="Cerrar detalles">
                ✕
            </button>
        </div>

        <div class="modal-detalles-datos">
            <div class="dato-pedido">
                <span>Código del pedido</span>
                <strong>${escaparHTML(pedido.id)}</strong>
            </div>

            <div class="dato-pedido">
                <span>Cliente</span>
                <strong>${escaparHTML(pedido.correoUsuario || "No disponible")}</strong>
            </div>

            <div class="dato-pedido">
                <span>Fecha</span>
                <strong>${escaparHTML(pedido.fecha || "No disponible")}</strong>
            </div>

            <div class="dato-pedido">
                <span>Estado actual</span>
                <strong class="estado-pedido estado-${escaparHTML(pedido.estado)}">
                    ${escaparHTML(pedido.estado)}
                </strong>
            </div>
        </div>

        <div class="modal-seccion">
            <h3 class="modal-seccion-titulo">Productos del pedido</h3>

            <ul class="lista-detalles-productos">
                ${productosHTML || "<li>Sin productos registrados.</li>"}
            </ul>
        </div>

        <div class="resumen-detalle-pedido">
            <p>
                <span>Subtotal</span>
                <strong>S/ ${(Number(pedido.subtotal) || 0).toFixed(2)}</strong>
            </p>

            <p>
                <span>Delivery</span>
                <strong>S/ ${(Number(pedido.costoEnvioExterno) || 0).toFixed(2)}</strong>
            </p>

            <p class="total-detalle-pedido">
                <span>Total</span>
                <strong>S/ ${obtenerTotal(pedido).toFixed(2)}</strong>
            </p>
        </div>

                ${controlesEstado}
        ${controlesCancelacion}
    `;

        modal.classList.add("modal-visible");
    }


    function cerrarModalPedido() {
        const modal = document.getElementById("modalDetallesPedido");

        if (modal) {
            modal.classList.remove("modal-visible");
        }
    }

    async function actualizarEstadoPedido(idPedido) {
        if (!esMaster()) {
            alert("Solo el usuario master puede cambiar el estado.");
            return;
        }

        const selector = document.getElementById("nuevoEstadoPedido");
        const nuevoEstado = selector?.value;

        if (!ESTADOS.includes(nuevoEstado)) {
            alert("Selecciona un estado válido.");
            return;
        }

        const config = obtenerConfig();
        const token = obtenerToken();

        try {
            const respuesta = await fetch(
                `${config.BASE_RENDER_URL}/api/pedidos/${encodeURIComponent(idPedido)}`,
                {
                    method: "PATCH",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ estado: nuevoEstado })
                }
            );

            if (!respuesta.ok) {
                const datos = await respuesta.json().catch(() => ({}));

                throw new Error(
                    datos.error || datos.mensaje ||
                    "No se pudo actualizar el estado del pedido."
                );
            }

            alert("Estado del pedido actualizado correctamente.");

            await mostrarPedidos();
            cerrarModalPedido();

        } catch (error) {
            console.error("Error al actualizar el pedido:", error);
            alert(error.message || "Error al actualizar el pedido.");
        }
    }
    // ======================================================
    // SOLICITAR CANCELACIÓN DE UN PEDIDO (USUARIO)
    // ======================================================

    async function solicitarCancelacionPedido(idPedido) {
        if (esMaster()) {
            alert("El administrador no puede solicitar la cancelación como cliente.");
            return;
        }

        const textarea = document.getElementById(
            "motivoSolicitudCancelacion"
        );

        if (!textarea) {
            alert("No se encontró el campo del motivo.");
            return;
        }

        const motivo = textarea.value.trim();

        if (!motivo) {
            alert("Debes indicar el motivo de la cancelación.");
            textarea.focus();
            return;
        }

        const config = obtenerConfig();
        const token = obtenerToken();

        if (!token || !config.BASE_RENDER_URL) {
            alert("Tu sesión o la configuración de la API no están disponibles.");
            return;
        }

        try {
            const respuesta = await fetch(
                `${config.BASE_RENDER_URL}/api/pedidos/${encodeURIComponent(idPedido)}/solicitud-cancelacion`,
                {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ motivo })
                }
            );

            const datos = await respuesta.json().catch(() => ({}));

            if (!respuesta.ok) {
                alert(datos.error || "No se pudo registrar la solicitud.");
                return;
            }

            alert("Solicitud de cancelación registrada correctamente.");

            await mostrarPedidos();
            verDetallesPedido(idPedido);

        } catch (error) {
            console.error("Error al solicitar cancelación:", error);
            alert("No se pudo conectar con el servidor.");
        }
    }


    // ======================================================
    // RESOLVER SOLICITUD DE CANCELACIÓN (MASTER)
    // ======================================================

    async function resolverSolicitudCancelacion(idPedido, decision) {
        if (!esMaster()) {
            alert("Solo el administrador puede resolver solicitudes.");
            return;
        }

        if (!["aprobar", "rechazar"].includes(decision)) {
            alert("La decisión indicada no es válida.");
            return;
        }

        const config = obtenerConfig();
        const token = obtenerToken();

        if (!token || !config.BASE_RENDER_URL) {
            alert("Tu sesión o la configuración de la API no están disponibles.");
            return;
        }

        const campoRespuesta = document.getElementById(
            "respuestaSolicitudCancelacion"
        );

        const respuestaMaster = campoRespuesta
            ? campoRespuesta.value.trim()
            : "";

        const mensaje = decision === "aprobar"
            ? "¿Confirmas la cancelación de este pedido?"
            : "¿Confirmas que deseas rechazar esta solicitud?";

        if (!confirm(mensaje)) {
            return;
        }

        try {
            const respuesta = await fetch(
                `${config.BASE_RENDER_URL}/api/pedidos/${encodeURIComponent(idPedido)}/solicitud-cancelacion`,
                {
                    method: "PATCH",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        decision,
                        respuesta: respuestaMaster
                    })
                }
            );

            const datos = await respuesta.json().catch(() => ({}));

            if (!respuesta.ok) {
                alert(datos.error || "No se pudo resolver la solicitud.");
                return;
            }

            alert(
                datos.message ||
                "Solicitud procesada correctamente."
            );

            await mostrarPedidos();
            verDetallesPedido(idPedido);

        } catch (error) {
            console.error("Error al resolver la solicitud:", error);
            alert("No se pudo conectar con el servidor.");
        }
    }
    window.mostrarPedidos = mostrarPedidos;
    window.filtrarPedidosMaster = filtrarPedidosMaster;
    window.limpiarBusquedaPedidos = limpiarBusquedaPedidos;
    window.verDetallesPedido = verDetallesPedido;
    window.cerrarModalPedido = cerrarModalPedido;
    window.actualizarEstadoPedido = actualizarEstadoPedido;
    window.solicitarCancelacionPedido = solicitarCancelacionPedido;
    window.resolverSolicitudCancelacion = resolverSolicitudCancelacion;

    document.addEventListener("DOMContentLoaded", () => {
        if (document.getElementById("listaPedidos")) {
            mostrarPedidos();
        }
    });

})();