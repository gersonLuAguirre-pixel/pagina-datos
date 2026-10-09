
/* ============================================
   ECOVIDA — CONTROL VISUAL DE AUTENTICACIÓN
   ============================================ */

// Dirección del backend de EcoVida en Render.
// Se usa como alternativa si BASE_RENDER_URL no está disponible.
const URL_SERVIDOR_REGISTRO =
    (typeof BASE_RENDER_URL !== "undefined" && BASE_RENDER_URL)
        ? BASE_RENDER_URL
        : "https://ecovida-api-real.onrender.com";

document.addEventListener("DOMContentLoaded", function () {
    inicializarParticulas();
    configurarPestanasAutenticacion();
});

/* --------------------------------------------
   CAMBIO ENTRE INGRESO Y REGISTRO
   -------------------------------------------- */

function cambiarPestaña(tipo) {
    const loginForm = document.getElementById("formularioLogin");
    const registroForm = document.getElementById("formularioRegistro");
    const tabLogin = document.getElementById("btnTabLogin");
    const tabRegistro = document.getElementById("btnTabRegistro");
    const titulo = document.getElementById("tituloAutenticacion");
    const subtitulo = document.getElementById("subtituloAutenticacion");

    if (!loginForm || !registroForm || !tabLogin || !tabRegistro) {
        return;
    }

    const mostrarLogin = tipo === "login";

    loginForm.classList.toggle("active", mostrarLogin);
    registroForm.classList.toggle("active", !mostrarLogin);

    tabLogin.classList.toggle("active", mostrarLogin);
    tabRegistro.classList.toggle("active", !mostrarLogin);

    tabLogin.setAttribute("aria-selected", String(mostrarLogin));
    tabRegistro.setAttribute("aria-selected", String(!mostrarLogin));

    if (titulo) {
        titulo.textContent = mostrarLogin
            ? "¡Qué bueno verte!"
            : "Únete a EcoVida";
    }

    if (subtitulo) {
        subtitulo.textContent = mostrarLogin
            ? "Ingresa tus datos para continuar."
            : "Crea tu cuenta y comienza tu experiencia sostenible.";
    }
}

function configurarPestanasAutenticacion() {
    cambiarPestaña("login");
}

/* --------------------------------------------
   REGISTRO DE CUENTA EN EL BACKEND
   -------------------------------------------- */

async function manejarFormularioRegistro(evento) {
    evento.preventDefault();

    const formulario = document.getElementById("formularioRegistro");

    if (!formulario) {
        alert("No se encontró el formulario de registro.");
        return;
    }

    const boton = formulario.querySelector('button[type="submit"]');

    const nombre = document.getElementById("regNombre").value.trim();
    const correo = document.getElementById("regEmail").value.trim();
    const contrasena = document.getElementById("regPassword").value;

    if (!formulario.reportValidity()) {
        return;
    }

    if (contrasena.length < 8) {
        alert("La contraseña debe tener al menos 8 caracteres.");
        return;
    }

    const textoOriginal = boton ? boton.innerHTML : "";

    if (boton) {
        boton.disabled = true;
        boton.innerHTML = "<span>Creando tu cuenta...</span>";
    }

    try {
        const respuesta = await fetch(
            `${URL_SERVIDOR_REGISTRO.replace(/\/+$/, "")}/api/register`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    nombre: nombre,
                    correo: correo,
                    contrasena: contrasena
                })
            }
        );

        let datos = {};

        try {
            datos = await respuesta.json();
        } catch {
            throw new Error(
                "El servidor devolvió una respuesta no válida. Inténtalo nuevamente."
            );
        }

        if (!respuesta.ok) {
            throw new Error(
                datos.error ||
                datos.mensaje ||
                `No se pudo crear la cuenta. Código HTTP: ${respuesta.status}`
            );
        }

        formulario.reset();

        alert("¡Registro exitoso! Ya puedes iniciar sesión.");

        cambiarPestaña("login");

        const campoCorreo = document.getElementById("loginEmail");
        const campoContrasena = document.getElementById("loginPassword");

        if (campoCorreo) {
            campoCorreo.value = correo;
        }

        if (campoContrasena) {
            campoContrasena.focus();
        }

    } catch (error) {
        console.error("Error de registro:", error);

        if (error instanceof TypeError) {
            alert(
                "No se pudo conectar con el servidor de EcoVida. " +
                "Verifica que Render esté disponible y que la API permita " +
                "solicitudes desde esta página."
            );
        } else {
            alert("No se pudo completar el registro: " + error.message);
        }

    } finally {
        if (boton) {
            boton.disabled = false;
            boton.innerHTML = textoOriginal;
        }
    }
}

/* --------------------------------------------
   FONDO ANIMADO DE PARTÍCULAS
   -------------------------------------------- */

function inicializarParticulas() {
    const fondo = document.querySelector(".auth-fondo-decorativo");

    if (!fondo) {
        return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
    }

    const canvas = document.createElement("canvas");
    canvas.className = "auth-particulas-canvas";
    canvas.setAttribute("aria-hidden", "true");

    Object.assign(canvas.style, {
        position: "absolute",
        inset: "0",
        width: "100%",
        height: "100%",
        pointerEvents: "none"
    });

    fondo.appendChild(canvas);

    const contexto = canvas.getContext("2d");

    if (!contexto) {
        canvas.remove();
        return;
    }

    let ancho = 0;
    let alto = 0;
    let particulas = [];
    let animacionId = null;

    const cantidad = window.innerWidth < 600 ? 20 : 38;

    function ajustarLienzo() {
        const escala = Math.min(window.devicePixelRatio || 1, 2);
        const rectangulo = fondo.getBoundingClientRect();

        ancho = rectangulo.width;
        alto = rectangulo.height;

        canvas.width = Math.round(ancho * escala);
        canvas.height = Math.round(alto * escala);

        contexto.setTransform(escala, 0, 0, escala, 0, 0);

        particulas = Array.from({ length: cantidad }, () => ({
            x: Math.random() * ancho,
            y: Math.random() * alto,
            radio: Math.random() * 1.8 + 0.6,
            vx: (Math.random() - 0.5) * 0.25,
            vy: (Math.random() - 0.5) * 0.25,
            opacidad: Math.random() * 0.18 + 0.06
        }));
    }

    function dibujar() {
        contexto.clearRect(0, 0, ancho, alto);

        for (const particula of particulas) {
            particula.x += particula.vx;
            particula.y += particula.vy;

            if (particula.x < 0 || particula.x > ancho) {
                particula.vx *= -1;
            }

            if (particula.y < 0 || particula.y > alto) {
                particula.vy *= -1;
            }

            contexto.beginPath();
            contexto.arc(
                particula.x,
                particula.y,
                particula.radio,
                0,
                Math.PI * 2
            );

            contexto.fillStyle =
                `rgba(163, 230, 53, ${particula.opacidad})`;

            contexto.fill();
        }

        animacionId = requestAnimationFrame(dibujar);
    }

    ajustarLienzo();
    dibujar();

    window.addEventListener("resize", ajustarLienzo);

    document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
            if (animacionId !== null) {
                cancelAnimationFrame(animacionId);
                animacionId = null;
            }
        } else if (animacionId === null) {
            dibujar();
        }
    });
}