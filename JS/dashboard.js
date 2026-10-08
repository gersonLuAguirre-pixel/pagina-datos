// ==========================================================
// 🌱 ECOVIDA - DASHBOARD MASTER
// ==========================================================

const BASE_RENDER_URL = "https://ecovida-api-real.onrender.com";


// ==========================================================
// 🔐 VERIFICAR SESIÓN
// ==========================================================

(function verificarAccesoDashboard() {

    const token = localStorage.getItem("authToken");
    const usuario = JSON.parse(
        localStorage.getItem("usuarioLogueado")
    ) || null;
    const rol = String(
        usuario?.rol || usuario?.role || ""
    ).toLowerCase().trim();

    const mensajeAcceso =
        document.getElementById("mensajeAcceso");

    const dashboard =
        document.getElementById("dashboardMaster");


    // ------------------------------------------------------
    // SIN SESIÓN
    // ------------------------------------------------------

    if (!token || !usuario) {

        mensajeAcceso.textContent =
            "No hay una sesión activa.";

        dashboard.style.display = "none";

        return;
    }


    if (rol !== "master") {

        mensajeAcceso.textContent =
            "Acceso restringido. Esta sección es exclusiva para usuarios Master.";

        dashboard.style.display = "none";

        console.warn(
            "[DASHBOARD] Acceso rechazado. Rol:",
            rol
        );

        return;
    }


    // ------------------------------------------------------
    // VERIFICAR ROL
    // ------------------------------------------------------

    if (usuario.rol !== "master") {

        mensajeAcceso.textContent =
            "No tienes permisos para acceder al Dashboard Master.";

        setTimeout(function () {
            window.location.href = "pedidos.html";
        }, 1500);

        return;
    }


    // ------------------------------------------------------
    // ACCESO CORRECTO
    // ------------------------------------------------------

    mensajeAcceso.style.display = "none";
    dashboard.style.display = "block";

    console.log(
        "[DASHBOARD] Acceso master autorizado."
    );

})();


// ==========================================================
// 🔄 BOTÓN ACTUALIZAR
// ==========================================================

const btnActualizar =
    document.getElementById("btnActualizarDashboard");


if (btnActualizar) {

    btnActualizar.addEventListener("click", function () {

        console.log(
            "[DASHBOARD] Actualización solicitada."
        );

        cargarDashboard();

    });

}
// ==========================================================
// 📅 CAMBIO DE FILTRO
// ==========================================================

const btnAplicarFiltro =
    document.getElementById("btnAplicarFiltro");

const btnLimpiarFiltro =
    document.getElementById("btnLimpiarFiltro");


if (btnAplicarFiltro) {

    btnAplicarFiltro.addEventListener(
        "click",
        function () {

            const pedidos =
                window.pedidosDashboard || {};

            const pedidosFiltrados =
                obtenerPedidosFiltrados(
                    pedidos
                );

            calcularResumenDashboard(
                pedidosFiltrados
            );
            actualizarPeriodoSeleccionado();

            generarGraficoVentas(
                pedidosFiltrados
            );

            console.log(
                "[DASHBOARD] Filtro de fechas aplicado."
            );

        }
    );

}


if (btnLimpiarFiltro) {

    btnLimpiarFiltro.addEventListener(
        "click",
        function () {

            const fechaDesde =
                document.getElementById(
                    "fechaDesde"
                );

            const fechaHasta =
                document.getElementById(
                    "fechaHasta"
                );

            if (fechaDesde) {
                fechaDesde.value = "";
            }

            if (fechaHasta) {
                fechaHasta.value = "";
            }

            const pedidos =
                window.pedidosDashboard || {};

            calcularResumenDashboard(
                pedidos
            );
            actualizarPeriodoSeleccionado();

            generarGraficoVentas(
                pedidos
            );

            console.log(
                "[DASHBOARD] Filtro de fechas limpiado."
            );

        }
    );

}


// ==========================================================
// 📊 CARGAR DASHBOARD
// ==========================================================

async function cargarDashboard() {

    const token =
        localStorage.getItem("authToken");

    console.log(
        "[DASHBOARD] Token disponible:",
        !!token
    );

    console.log(
        "[DASHBOARD] Token:",
        token
    );
    if (!token) {
        return;
    }


    try {

        console.log(
            "[DASHBOARD] Consultando pedidos..."
        );


        const respuesta = await fetch(
            `${BASE_RENDER_URL}/api/pedidos`,
            {
                method: "GET",

                headers: {
                    "Authorization":
                        `Bearer ${token}`,

                    "Content-Type":
                        "application/json"
                }
            }
        );


        if (!respuesta.ok) {

            throw new Error(
                `Error HTTP ${respuesta.status}`
            );

        }


        const datos =
            await respuesta.json();


        console.log(
            "[DASHBOARD] Datos recibidos:",
            datos
        );


        const pedidos =
            datos.pedidos || {};


        // Guardamos los pedidos para
        // trabajar con ellos después.

        window.pedidosDashboard =
            pedidos;


        calcularResumenDashboard(pedidos);
        generarGraficoVentas(pedidos);


    } catch (error) {

        console.error(
            "[DASHBOARD] Error:",
            error
        );

        const estado =
            document.getElementById(
                "estadoDashboard"
            );

        if (estado) {

            estado.textContent =
                "Error al cargar los datos.";

        }

    }

}


// ==========================================================
// 📊 RESUMEN
// ==========================================================

function calcularResumenDashboard(
    pedidos
) {

    const ids =
        Object.keys(pedidos);


    let totalPedidos =
        ids.length;


    let ventasTotales =
        0;


    let pendientes =
        0;


    let completados =
        0;


    let cancelados =
        0;


    ids.forEach(function (id) {

        const pedido =
            pedidos[id];


        ventasTotales +=
            Number(pedido.total || 0);



        const estado =
            String(
                pedido.estado || ""
            ).toLowerCase();


        if (estado === "pendiente") {

            pendientes++;

        }


        if (estado === "completado") {

            completados++;

        }


        if (estado === "cancelado") {

            cancelados++;

        }

    });
    const promedioPedido =
        totalPedidos > 0
            ? Number(ventasTotales) / Number(totalPedidos)
            : 0;

    // ------------------------------------------------------
    // ACTUALIZAR TARJETAS
    // ------------------------------------------------------

    document.getElementById(
        "totalPedidos"
    ).textContent =
        totalPedidos;


    document.getElementById(
        "ventasTotales"
    ).textContent =
        `S/ ${ventasTotales.toFixed(2)}`;
    document.getElementById(
        "promedioPedido"
    ).textContent =
        `S/ ${promedioPedido.toFixed(2)}`;

    document.getElementById(
        "pedidosPendientes"
    ).textContent =
        pendientes;


    document.getElementById(
        "pedidosCompletados"
    ).textContent =
        completados;


    document.getElementById(
        "pedidosCancelados"
    ).textContent =
        cancelados;


    // ------------------------------------------------------
    // ESTADO
    // ------------------------------------------------------

    document.getElementById(
        "estadoDashboard"
    ).textContent =
        "Datos actualizados correctamente.";


    document.getElementById(
        "ultimaActualizacion"
    ).textContent =
        "Última actualización: " +
        new Date().toLocaleTimeString(
            "es-PE"
        );


    console.log(
        "[DASHBOARD] Resumen calculado."
    );
    generarProductosMasVendidos(pedidos);
    generarResumenEstados(pedidos);
}

// ==========================================================
// 📈 GRÁFICO DE VENTAS
// ==========================================================

let graficoVentas = null;

function generarGraficoVentas(pedidos) {

    const canvas =
        document.getElementById("graficoVentas");

    const mensaje =
        document.getElementById("mensajeGrafico");

    if (!canvas) {
        console.error("[DASHBOARD] No existe el canvas del gráfico.");
        return;
    }

    const ventasPorFecha = {};

    Object.values(pedidos).forEach(function (pedido) {

        const fechaPedido =
            pedido.fecha || pedido.fechaCreacion || pedido.createdAt;

        if (!fechaPedido) {
            return;
        }

        const fecha =
            new Date(fechaPedido);

        if (isNaN(fecha.getTime())) {
            return;
        }

        const fechaTexto =
            fecha.toLocaleDateString("es-PE", {
                day: "2-digit",
                month: "2-digit"
            });

        const total =
            Number(pedido.total || 0);

        if (!ventasPorFecha[fechaTexto]) {
            ventasPorFecha[fechaTexto] = 0;
        }

        ventasPorFecha[fechaTexto] += total;

    });

    const fechas =
        Object.keys(ventasPorFecha);

    const valores =
        fechas.map(function (fecha) {
            return ventasPorFecha[fecha];
        });


    if (graficoVentas) {
        graficoVentas.destroy();
    }


    if (fechas.length === 0) {

        if (mensaje) {
            mensaje.textContent =
                "No hay datos suficientes para mostrar el gráfico.";
        }

        return;
    }


    if (mensaje) {
        mensaje.style.display = "none";
    }


    graficoVentas =
        new Chart(
            canvas,
            {
                type: "line",

                data: {

                    labels: fechas,

                    datasets: [
                        {
                            label: "Ventas",

                            data: valores,

                            borderWidth: 3,

                            tension: 0.35,

                            fill: true,

                            pointRadius: 4,

                            pointHoverRadius: 6
                        }
                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {
                            display: false
                        },

                        tooltip: {

                            callbacks: {

                                label: function (context) {

                                    return (
                                        " S/ " +
                                        Number(
                                            context.raw
                                        ).toFixed(2)
                                    );

                                }

                            }

                        }

                    },

                    scales: {

                        y: {

                            beginAtZero: true,

                            ticks: {

                                callback: function (value) {

                                    return (
                                        "S/ " +
                                        value
                                    );

                                }

                            }

                        }

                    }

                }

            }
        );

}
// ==========================================================
// 🏆 PRODUCTOS MÁS VENDIDOS
// ==========================================================

function generarProductosMasVendidos(pedidos) {

    const contenedor =
        document.getElementById("productosMasVendidos");

    if (!contenedor) {
        return;
    }

    const productos = {};

    Object.values(pedidos).forEach(function (pedido) {

        if (!Array.isArray(pedido.productos)) {
            return;
        }

        pedido.productos.forEach(function (producto) {

            const nombre =
                String(
                    producto.nombre ||
                    producto.name ||
                    producto.producto ||
                    "Producto sin nombre"
                ).trim();

            const cantidad =
                Number(
                    producto.cantidad ||
                    producto.quantity ||
                    1
                );

            const clave =
                nombre.toLowerCase();

            if (!productos[clave]) {

                productos[clave] = {
                    nombre: nombre,
                    cantidad: 0
                };

            }

            productos[clave].cantidad += cantidad;

        });

    });


    const ranking =
        Object.values(productos)
            .sort(function (a, b) {

                return b.cantidad - a.cantidad;

            })
            .slice(0, 5);


    contenedor.innerHTML = "";


    if (ranking.length === 0) {

        contenedor.innerHTML = `
            <div class="estado-vacio">
                No hay productos registrados.
            </div>
        `;

        return;
    }


    ranking.forEach(function (producto, index) {

        const elemento =
            document.createElement("div");

        elemento.className =
            "producto-ranking";


        elemento.innerHTML = `

            <div class="producto-posicion">
                ${index + 1}
            </div>

            <div class="producto-info">

                <strong>
                    ${producto.nombre}
                </strong>

                <span>
                    ${producto.cantidad}
                    ${producto.cantidad === 1
                ? "unidad vendida"
                : "unidades vendidas"}
                </span>

            </div>

        `;


        contenedor.appendChild(elemento);

    });


    const productoLider =
        ranking[0];


    const elementoLider =
        document.getElementById(
            "productoMasVendido"
        );


    if (elementoLider && productoLider) {

        elementoLider.textContent =
            `${productoLider.nombre} (${productoLider.cantidad})`;

    }


    const totalProductos =
        Object.values(productos)
            .reduce(function (total, producto) {

                return total + producto.cantidad;

            }, 0);


    const elementoTotal =
        document.getElementById(
            "totalProductosVendidos"
        );


    if (elementoTotal) {

        elementoTotal.textContent =
            totalProductos;

    }


    console.log(
        "[DASHBOARD] Productos más vendidos:",
        ranking
    );

}
// ==========================================================
// 📊 ESTADO DE PEDIDOS
// ==========================================================

function generarResumenEstados(pedidos) {
    console.log("[DASHBOARD] Iniciando resumen de estados...");
    console.log(
        "[DASHBOARD] Pedidos recibidos para estados:",
        pedidos
    );

    const contenedor =
        document.getElementById("resumenEstados");

    if (!contenedor) {
        return;
    }

    let pendientes = 0;
    let procesando = 0;
    let completados = 0;
    let cancelados = 0;

    Object.values(pedidos).forEach(function (pedido) {

        const estado =
            String(pedido.estado || "")
                .trim()
                .toLowerCase();

        if (estado === "pendiente") {
            pendientes++;
        }

        else if (estado === "procesando") {
            procesando++;
        }

        else if (estado === "completado") {
            completados++;
        }

        else if (estado === "cancelado") {
            cancelados++;
        }

    });


    const totalEstados =
        pendientes +
        procesando +
        completados +
        cancelados;


    function porcentaje(cantidad) {

        if (totalEstados === 0) {
            return 0;
        }

        return Math.round(
            (cantidad / totalEstados) * 100
        );

    }


    const porcentajePendientes =
        porcentaje(pendientes);

    const porcentajeProcesando =
        porcentaje(procesando);

    const porcentajeCompletados =
        porcentaje(completados);

    const porcentajeCancelados =
        porcentaje(cancelados);


    contenedor.innerHTML = `

        <div class="estado-pedido">

            <div class="estado-cabecera">

                <div class="estado-nombre">
                    <span class="estado-punto pendiente"></span>
                    Pendientes
                </div>

                <strong>
                    ${pendientes}
                </strong>

            </div>

            <div class="estado-barra">

                <div
                    class="estado-progreso pendiente"
                    style="width: ${porcentajePendientes}%">
                </div>

            </div>

            <span class="estado-porcentaje">
                ${porcentajePendientes}%
            </span>

        </div>

        <div class="estado-pedido">

    <div class="estado-cabecera">

        <div class="estado-nombre">
            <span class="estado-punto procesando"></span>
            Procesando
        </div>

        <strong>
            ${procesando}
        </strong>

    </div>

    <div class="estado-barra">

        <div
            class="estado-progreso procesando"
            style="width: ${porcentajeProcesando}%">
        </div>

    </div>

    <span class="estado-porcentaje">
        ${porcentajeProcesando}%
    </span>

</div>
        <div class="estado-pedido">

            <div class="estado-cabecera">

                <div class="estado-nombre">
                    <span class="estado-punto completado"></span>
                    Completados
                </div>

                <strong>
                    ${completados}
                </strong>

            </div>

            <div class="estado-barra">

                <div
                    class="estado-progreso completado"
                    style="width: ${porcentajeCompletados}%">
                </div>

            </div>

            <span class="estado-porcentaje">
                ${porcentajeCompletados}%
            </span>

        </div>


        <div class="estado-pedido">

            <div class="estado-cabecera">

                <div class="estado-nombre">
                    <span class="estado-punto cancelado"></span>
                    Cancelados
                </div>

                <strong>
                    ${cancelados}
                </strong>

            </div>

            <div class="estado-barra">

                <div
                    class="estado-progreso cancelado"
                    style="width: ${porcentajeCancelados}%">
                </div>

            </div>

            <span class="estado-porcentaje">
                ${porcentajeCancelados}%
            </span>

        </div>

    `;


    console.log(
        "[DASHBOARD] Estados:",
        {
            pendientes,
            procesando,
            completados,
            cancelados
        }
    );

}
// ==========================================================
// 📅 FILTRO DE PERÍODO
// ==========================================================

function obtenerPedidosFiltrados(pedidos) {

    const fechaDesdeInput =
        document.getElementById("fechaDesde");

    const fechaHastaInput =
        document.getElementById("fechaHasta");


    const fechaDesde =
        fechaDesdeInput
            ? fechaDesdeInput.value
            : "";

    const fechaHasta =
        fechaHastaInput
            ? fechaHastaInput.value
            : "";


    // Si no hay fechas seleccionadas,
    // mostramos todos los pedidos.

    if (!fechaDesde && !fechaHasta) {

        return pedidos;

    }


    const pedidosFiltrados = {};


    Object.entries(pedidos).forEach(
        function ([id, pedido]) {

            const fechaPedido =
                pedido.fecha ||
                pedido.fechaCreacion ||
                pedido.createdAt;


            if (!fechaPedido) {
                return;
            }


            const fecha =
                new Date(fechaPedido);


            if (
                isNaN(
                    fecha.getTime()
                )
            ) {
                return;
            }


            // Convertimos la fecha del pedido
            // al formato YYYY-MM-DD.

            const fechaPedidoTexto =
                fecha.toISOString()
                    .split("T")[0];


            // Validar fecha desde

            if (
                fechaDesde &&
                fechaPedidoTexto < fechaDesde
            ) {

                return;

            }


            // Validar fecha hasta

            if (
                fechaHasta &&
                fechaPedidoTexto > fechaHasta
            ) {

                return;

            }


            pedidosFiltrados[id] =
                pedido;

        }
    );


    return pedidosFiltrados;

}
/* ==========================================================
   📅 MOSTRAR PERÍODO ACTUAL
========================================================== */

function actualizarPeriodoSeleccionado() {

    const elemento =
        document.getElementById(
            "periodoSeleccionado"
        );

    if (!elemento) {
        return;
    }

    const fechaDesde =
        document.getElementById(
            "fechaDesde"
        )?.value || "";

    const fechaHasta =
        document.getElementById(
            "fechaHasta"
        )?.value || "";


    if (!fechaDesde && !fechaHasta) {

        elemento.textContent =
            "📅 Mostrando todos los pedidos";

        return;
    }


    if (fechaDesde && fechaHasta) {

        elemento.textContent =
            `📅 Mostrando del ${formatearFecha(fechaDesde)} al ${formatearFecha(fechaHasta)}`;

        return;
    }


    if (fechaDesde) {

        elemento.textContent =
            `📅 Mostrando desde ${formatearFecha(fechaDesde)}`;

        return;
    }


    if (fechaHasta) {

        elemento.textContent =
            `📅 Mostrando hasta ${formatearFecha(fechaHasta)}`;

    }

}


/* ==========================================================
   📅 FORMATO DE FECHA
========================================================== */

function formatearFecha(fecha) {

    if (!fecha) {
        return "";
    }

    const partes =
        fecha.split("-");

    if (partes.length !== 3) {
        return fecha;
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

// ==========================================================
// 🚀 INICIAR
// ==========================================================

cargarDashboard();