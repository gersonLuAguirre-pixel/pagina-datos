
/* =====================================================
   ECOVIDA - MÓDULO DE PRODUCTOS
   Preparación para el catálogo y futuras operaciones CRUD
===================================================== */

(function () {
    "use strict";

    const CLAVE_CATALOGO = "ecovida_catalogo";

    function escaparTexto(texto) {
        return String(texto ?? "").replace(/[&<>"']/g, caracter => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[caracter]);
    }

    function normalizarProducto(producto) {
        if (!producto || typeof producto !== "object") {
            throw new Error("Los datos del producto no son válidos.");
        }

        const nombre = String(producto.nombre || "").trim();
        const precio = Number(producto.precio);

        if (!nombre) {
            throw new Error("El nombre del producto es obligatorio.");
        }

        if (!Number.isFinite(precio) || precio < 0) {
            throw new Error("El precio debe ser un número válido.");
        }

        return {
            id: producto.id || null,
            nombre: nombre,
            precio: precio,
            descripcion: String(producto.descripcion || "").trim(),
            imagen: String(producto.imagen || "").trim(),
            activo: producto.activo !== false
        };
    }

    function obtenerCatalogoLocal() {
        try {
            const datos = JSON.parse(
                localStorage.getItem(CLAVE_CATALOGO) || "[]"
            );

            return Array.isArray(datos) ? datos : [];
        } catch (error) {
            console.error("No se pudo leer el catálogo local:", error);
            return [];
        }
    }

    function guardarCatalogoLocal(productos) {
        if (!Array.isArray(productos)) {
            throw new Error("El catálogo debe ser una lista de productos.");
        }

        localStorage.setItem(
            CLAVE_CATALOGO,
            JSON.stringify(productos.map(normalizarProducto))
        );
    }

    function obtenerUsuarioActual() {
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

    function esMasterProductos() {
        const usuario = obtenerUsuarioActual();

        return String(usuario?.rol || "").toLowerCase() === "master";
    }

    function exigirPermisoMaster() {
        if (!localStorage.getItem("authToken")) {
            throw new Error("Debes iniciar sesión para continuar.");
        }

        if (!esMasterProductos()) {
            throw new Error(
                "No tienes permisos para administrar los productos."
            );
        }

        return true;
    }

    function prepararNuevoProducto(datos) {
        exigirPermisoMaster();

        return normalizarProducto(datos);
    }

    function prepararEdicionProducto(id, datos) {
        exigirPermisoMaster();

        if (id === undefined || id === null || String(id).trim() === "") {
            throw new Error("El identificador del producto es obligatorio.");
        }

        return {
            ...normalizarProducto(datos),
            id: id
        };
    }

    // Se publican funciones sin modificar el HTML actual.
    window.ECOVIDA_PRODUCTOS = Object.freeze({
        escaparTexto: escaparTexto,
        normalizarProducto: normalizarProducto,
        obtenerCatalogoLocal: obtenerCatalogoLocal,
        guardarCatalogoLocal: guardarCatalogoLocal,
        esMaster: esMasterProductos,
        prepararNuevoProducto: prepararNuevoProducto,
        prepararEdicionProducto: prepararEdicionProducto
    });

})();