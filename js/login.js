//=====================================
// SNACK OFFICE
// MÓDULO: LOGIN / AUTENTICACIÓN
//=====================================

import { supabase } from "./supabase.js";

const USUARIOS = {
    master: "master@snackoffice.local",
    admin: "admin@snackoffice.local",
    ventas: "ventas@snackoffice.local"
};

let perfilActual = null;

export function obtenerPerfilActual() {
    return perfilActual;
}

export function esMaster() {
    return perfilActual?.rol === "MASTER";
}

export async function iniciarLogin(opciones = {}) {
    const onAuthenticated = typeof opciones.onAuthenticated === "function"
        ? opciones.onAuthenticated
        : null;
    // Referencias de las pantallas
    const loginScreen = document.getElementById("loginScreen");
    const adminScreen = document.getElementById("adminScreen");
    const ventasScreen = document.getElementById("ventasScreen");

    // Referencias del formulario
    const usuarioInput = document.getElementById("usuario");
    const passwordInput = document.getElementById("password");
    const btnLogin = document.getElementById("btnLogin");
    const btnAyudaAcceso = document.getElementById("btnAyudaAcceso");

    // Referencias de cerrar sesión
    const btnCerrarSesionAdmin = document.getElementById("btnCerrarSesionAdmin");
    const btnCerrarSesionVentas = document.getElementById("btnCerrarSesionVentas");

    // Evita registrar dos veces los eventos si la función se vuelve a llamar.
    if (btnLogin?.dataset.authInitialized === "true") {
        await restaurarSesion();
        return;
    }

    async function iniciarSesion() {
        const usuario = usuarioInput.value.trim().toLowerCase();
        const password = passwordInput.value;

        if (!usuario || !password) {
            alert("❌ Ingresa usuario y contraseña.");
            return;
        }

        const email = USUARIOS[usuario];

        if (!email) {
            alert("❌ Usuario no válido.");
            return;
        }

        if (btnLogin) {
            btnLogin.disabled = true;
            btnLogin.textContent = "⏳ Iniciando sesión...";
        }

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            const perfil = await cargarPerfil(data.user.id);

            if (!perfil) {
                await supabase.auth.signOut();
                throw new Error("No se encontró el perfil de este usuario.");
            }

            if (perfil.activo === false) {
                await supabase.auth.signOut();
                throw new Error("Este usuario está desactivado.");
            }

            perfilActual = perfil;
            mostrarPantallaSegunRol(perfil);

            if (onAuthenticated) {
                await onAuthenticated(perfil);
            }

            passwordInput.value = "";
            console.log("✅ Sesión iniciada:", perfil.rol);
        } catch (error) {
            console.error("❌ Error de inicio de sesión:", error);
            alert(`❌ No se pudo iniciar sesión.\n\n${traducirErrorAuth(error)}`);
        } finally {
            if (btnLogin) {
                btnLogin.disabled = false;
                btnLogin.textContent = "Iniciar sesión";
            }
        }
    }

    async function cargarPerfil(userId) {
        const { data, error } = await supabase
            .from("profiles")
            .select("id,nombre,email,rol,activo")
            .eq("id", userId)
            .single();

        if (error) {
            console.error("❌ Error al consultar perfil:", error);
            return null;
        }

        return data;
    }

    function mostrarPantallaSegunRol(perfil) {
        if (!loginScreen || !adminScreen || !ventasScreen) return;

        loginScreen.style.display = "none";

        if (perfil.rol === "VENTAS") {
            adminScreen.style.display = "none";
            ventasScreen.style.display = "block";
            prepararInterfazCuenta("ventas");
            return;
        }

        // ADMIN y MASTER entran inicialmente a Administración.
        adminScreen.style.display = "block";
        ventasScreen.style.display = "none";

        const titulo = document.querySelector("#adminScreen #contentArea h1");
        if (titulo) {
            titulo.textContent = perfil.rol === "MASTER"
                ? "Bienvenido MASTER 👑"
                : "Bienvenido Administrador 👨‍💼";
        }

        prepararInterfazCuenta("admin");
    }

    function prepararInterfazCuenta(pantalla) {
        const sidebar = document.querySelector(
            pantalla === "admin"
                ? "#adminScreen .sidebar"
                : "#ventasScreen .sidebar"
        );

        if (!sidebar) return;

        // Evita duplicar botones al restaurar una sesión.
        sidebar.querySelector("#btnMiCuenta")?.remove();
        sidebar.querySelector("#btnCambiarPantallaMaster")?.remove();
        sidebar.querySelector("#btnAyudaUsuariosMaster")?.remove();

        const btnCuenta = document.createElement("button");
        btnCuenta.id = "btnMiCuenta";
        btnCuenta.type = "button";
        btnCuenta.textContent = "🔐 Mi cuenta";
        btnCuenta.addEventListener("click", mostrarModalCuenta);

        const btnCerrar = pantalla === "admin"
            ? document.getElementById("btnCerrarSesionAdmin")
            : document.getElementById("btnCerrarSesionVentas");

        if (btnCerrar) {
            sidebar.insertBefore(btnCuenta, btnCerrar);
        } else {
            sidebar.appendChild(btnCuenta);
        }

        if (perfilActual?.rol === "MASTER") {
            const btnCambio = document.createElement("button");
            btnCambio.id = "btnCambiarPantallaMaster";
            btnCambio.type = "button";

            if (pantalla === "admin") {
                btnCambio.textContent = "🛒 Ir a Ventas";
                btnCambio.addEventListener("click", () => mostrarVentasDesdeMaster());
            } else {
                btnCambio.textContent = "🛠️ Administración";
                btnCambio.addEventListener("click", () => mostrarAdminDesdeMaster());
            }

            if (btnCerrar) {
                sidebar.insertBefore(btnCambio, btnCerrar);
            } else {
                sidebar.appendChild(btnCambio);
            }
        }
    }

    function mostrarVentasDesdeMaster() {
        adminScreen.style.display = "none";
        ventasScreen.style.display = "block";
        prepararInterfazCuenta("ventas");

        const titulo = document.querySelector("#ventasScreen #ventasInicio h1");
        if (titulo) titulo.textContent = "Bienvenido MASTER 👑 · Ventas";
    }

    function mostrarAdminDesdeMaster() {
        ventasScreen.style.display = "none";
        adminScreen.style.display = "block";
        prepararInterfazCuenta("admin");

        const titulo = document.querySelector("#adminScreen #contentArea h1");
        if (titulo) titulo.textContent = "Bienvenido MASTER 👑";
    }

    async function mostrarModalCuenta() {
        cerrarModalCuenta();

        const esCuentaConCambio = perfilActual?.rol === "MASTER" || perfilActual?.rol === "ADMIN";
        const mensajeVentas = `
            <div style="margin-top:18px;padding:14px 15px;border-radius:12px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;line-height:1.45;">
                🔑 <strong>¿Olvidaste tu contraseña?</strong><br>
                Solicita al usuario <strong>MASTER</strong> que restablezca tu acceso.
            </div>
        `;

        const modal = document.createElement("div");
        modal.id = "modalCuentaSnackOffice";
        modal.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,.55);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            padding: 20px;
        `;

        modal.innerHTML = `
            <div style="
                width: min(430px, 100%);
                background: #fff;
                border-radius: 18px;
                padding: 26px;
                box-shadow: 0 20px 60px rgba(0,0,0,.25);
                font-family: inherit;
            ">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:15px;">
                    <div>
                        <h2 style="margin:0 0 6px;">🔐 Mi cuenta</h2>
                        <p style="margin:0;color:#666;">
                            ${escapeHtml(perfilActual?.nombre || perfilActual?.rol || "Usuario")}
                        </p>
                    </div>
                    <button id="btnCerrarCuentaModal" type="button"
                        style="border:0;background:transparent;font-size:28px;cursor:pointer;">×</button>
                </div>

                <div style="margin:20px 0 8px;">
                    <strong>Usuario</strong>
                    <div style="margin-top:5px;color:#555;">
                        ${escapeHtml(perfilActual?.nombre || "")}
                    </div>
                </div>

                <div style="margin:0 0 20px;">
                    <strong>Rol</strong>
                    <div style="margin-top:5px;color:#555;">
                        ${escapeHtml(perfilActual?.rol || "")}
                    </div>
                </div>

                ${perfilActual?.rol === "MASTER" ? `
                    <hr style="border:0;border-top:1px solid #eee;margin:18px 0;">

                    <h3 style="margin:0 0 15px;">👑 Administrar accesos</h3>
                    <p style="margin:0 0 14px;color:#666;line-height:1.45;">
                        Desde aquí puedes restablecer la contraseña de ADMIN o VENTAS.
                        La contraseña de MASTER se cambia en esta misma cuenta.
                    </p>
                    <div id="listaUsuariosMaster" style="display:grid;gap:10px;">
                        <div style="padding:12px;border-radius:10px;background:#f8fafc;color:#666;">⏳ Cargando usuarios...</div>
                    </div>
                    <p id="estadoUsuariosMaster" style="margin:14px 0 0;text-align:center;min-height:20px;"></p>

                    <hr style="border:0;border-top:1px solid #eee;margin:22px 0 18px;">

                    <h3 style="margin:0 0 15px;">Cambiar mi contraseña</h3>

                    <label style="display:block;margin-bottom:6px;">Contraseña actual</label>
                    <input id="cuentaPasswordActual" type="password"
                        autocomplete="current-password"
                        style="width:100%;box-sizing:border-box;padding:11px;border:1px solid #ccc;border-radius:9px;margin-bottom:12px;">

                    <label style="display:block;margin-bottom:6px;">Nueva contraseña</label>
                    <input id="cuentaPasswordNueva" type="password"
                        autocomplete="new-password"
                        style="width:100%;box-sizing:border-box;padding:11px;border:1px solid #ccc;border-radius:9px;margin-bottom:12px;">

                    <label style="display:block;margin-bottom:6px;">Confirmar nueva contraseña</label>
                    <input id="cuentaPasswordConfirmar" type="password"
                        autocomplete="new-password"
                        style="width:100%;box-sizing:border-box;padding:11px;border:1px solid #ccc;border-radius:9px;margin-bottom:18px;">

                    <button id="btnGuardarNuevaPassword" type="button"
                        style="width:100%;padding:12px;border:0;border-radius:10px;cursor:pointer;font-weight:700;">
                        🔑 Cambiar contraseña
                    </button>

                    <p id="estadoCambioPassword"
                        style="margin:14px 0 0;text-align:center;min-height:20px;"></p>
                ` : (esCuentaConCambio ? `
                    <hr style="border:0;border-top:1px solid #eee;margin:18px 0;">
                    <h3 style="margin:0 0 15px;">Cambiar contraseña</h3>
                    <label style="display:block;margin-bottom:6px;">Contraseña actual</label>
                    <input id="cuentaPasswordActual" type="password" autocomplete="current-password"
                        style="width:100%;box-sizing:border-box;padding:11px;border:1px solid #ccc;border-radius:9px;margin-bottom:12px;">
                    <label style="display:block;margin-bottom:6px;">Nueva contraseña</label>
                    <input id="cuentaPasswordNueva" type="password" autocomplete="new-password"
                        style="width:100%;box-sizing:border-box;padding:11px;border:1px solid #ccc;border-radius:9px;margin-bottom:12px;">
                    <label style="display:block;margin-bottom:6px;">Confirmar nueva contraseña</label>
                    <input id="cuentaPasswordConfirmar" type="password" autocomplete="new-password"
                        style="width:100%;box-sizing:border-box;padding:11px;border:1px solid #ccc;border-radius:9px;margin-bottom:18px;">
                    <button id="btnGuardarNuevaPassword" type="button"
                        style="width:100%;padding:12px;border:0;border-radius:10px;cursor:pointer;font-weight:700;">
                        🔑 Cambiar contraseña
                    </button>
                    <p id="estadoCambioPassword" style="margin:14px 0 0;text-align:center;min-height:20px;"></p>
                ` : mensajeVentas)}
            </div>
        `;

        document.body.appendChild(modal);

        if (perfilActual?.rol === "MASTER") {
            cargarUsuariosParaMaster();
        }

        document.getElementById("btnCerrarCuentaModal")
            ?.addEventListener("click", cerrarModalCuenta);

        modal.addEventListener("click", evento => {
            if (evento.target === modal) cerrarModalCuenta();
        });

        document.getElementById("btnGuardarNuevaPassword")
            ?.addEventListener("click", cambiarPassword);

        document.getElementById("cuentaPasswordActual")?.focus();
    }

    async function cambiarPassword() {
        if (perfilActual?.rol !== "MASTER" && perfilActual?.rol !== "ADMIN") {
            return;
        }

        const actual = document.getElementById("cuentaPasswordActual")?.value || "";
        const nueva = document.getElementById("cuentaPasswordNueva")?.value || "";
        const confirmar = document.getElementById("cuentaPasswordConfirmar")?.value || "";
        const estado = document.getElementById("estadoCambioPassword");
        const boton = document.getElementById("btnGuardarNuevaPassword");

        if (!actual || !nueva || !confirmar) {
            mostrarEstadoPassword("❌ Completa todos los campos.", true);
            return;
        }

        if (nueva.length < 6) {
            mostrarEstadoPassword("❌ La nueva contraseña debe tener al menos 6 caracteres.", true);
            return;
        }

        if (nueva !== confirmar) {
            mostrarEstadoPassword("❌ Las nuevas contraseñas no coinciden.", true);
            return;
        }

        if (!perfilActual?.email) {
            mostrarEstadoPassword("❌ No se encontró el correo de autenticación.", true);
            return;
        }

        if (boton) {
            boton.disabled = true;
            boton.textContent = "⏳ Cambiando...";
        }

        try {
            // Reautenticamos con la contraseña actual antes de permitir el cambio.
            const { error: loginError } = await supabase.auth.signInWithPassword({
                email: perfilActual.email,
                password: actual
            });

            if (loginError) throw new Error("La contraseña actual es incorrecta.");

            const { error: updateError } = await supabase.auth.updateUser({
                password: nueva
            });

            if (updateError) throw updateError;

            document.getElementById("cuentaPasswordActual").value = "";
            document.getElementById("cuentaPasswordNueva").value = "";
            document.getElementById("cuentaPasswordConfirmar").value = "";

            mostrarEstadoPassword("✅ Contraseña actualizada correctamente.", false);
        } catch (error) {
            console.error("❌ Error al cambiar contraseña:", error);
            mostrarEstadoPassword(`❌ ${traducirErrorAuth(error)}`, true);
        } finally {
            if (boton) {
                boton.disabled = false;
                boton.textContent = "🔑 Cambiar contraseña";
            }
        }
    }

    async function cargarUsuariosParaMaster() {
        const lista = document.getElementById("listaUsuariosMaster");
        const estado = document.getElementById("estadoUsuariosMaster");
        if (!lista) return;

        try {
            const { data, error } = await supabase.functions.invoke("master-reset-password", {
                body: { action: "list" }
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            const perfiles = Array.isArray(data?.usuarios) ? data.usuarios : [];

            if (!perfiles.length) {
                lista.innerHTML = `<div style="padding:12px;border-radius:10px;background:#f8fafc;color:#666;">No hay cuentas ADMIN o VENTAS disponibles.</div>`;
                return;
            }

            lista.innerHTML = perfiles.map(perfil => `
                <div style="padding:14px;border:1px solid #e5e7eb;border-radius:12px;background:#fafafa;">
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
                        <div>
                            <strong>${perfil.rol === "ADMIN" ? "🛠️" : "💰"} ${escapeHtml(perfil.rol)}</strong>
                            <div style="font-size:13px;color:#666;margin-top:4px;">${escapeHtml(perfil.email || "")}</div>
                            <div style="font-size:12px;margin-top:4px;color:${perfil.activo ? "#18794e" : "#b42318"};">
                                ${perfil.activo ? "● Activo" : "● Desactivado"}
                            </div>
                        </div>
                        <button type="button" class="btnRestablecerUsuarioMaster" data-user-id="${escapeHtml(perfil.id)}" data-user-role="${escapeHtml(perfil.rol)}" data-user-email="${escapeHtml(perfil.email || "")}"
                            style="border:0;border-radius:9px;padding:10px 12px;cursor:pointer;font-weight:700;">
                            🔑 Restablecer
                        </button>
                    </div>
                </div>
            `).join("");

            lista.querySelectorAll(".btnRestablecerUsuarioMaster").forEach(boton => {
                boton.addEventListener("click", () => {
                    restablecerAccesoUsuario(
                        boton.dataset.userId,
                        boton.dataset.userRole,
                        boton.dataset.userEmail
                    );
                });
            });
        } catch (error) {
            console.error("❌ No se pudieron cargar los usuarios para MASTER:", error);
            lista.innerHTML = `<div style="padding:12px;border-radius:10px;background:#fff1f2;color:#b42318;">❌ No se pudieron cargar las cuentas.</div>`;
        }
    }

    async function restablecerAccesoUsuario(userId, rol, email) {
        if (perfilActual?.rol !== "MASTER" || !userId) return;

        const nueva = prompt(
            `🔑 Restablecer contraseña de ${rol}\n\nCuenta: ${email || rol}\n\nEscribe la nueva contraseña (mínimo 6 caracteres):`
        );

        if (nueva === null) return;

        const nuevaLimpia = nueva.trim();
        if (nuevaLimpia.length < 6) {
            alert("❌ La contraseña debe tener al menos 6 caracteres.");
            return;
        }

        const confirmar = prompt("🔐 Confirma la nueva contraseña:");
        if (confirmar === null) return;

        if (nuevaLimpia !== confirmar.trim()) {
            alert("❌ Las contraseñas no coinciden.");
            return;
        }

        const estado = document.getElementById("estadoUsuariosMaster");
        if (estado) {
            estado.textContent = `⏳ Restableciendo acceso de ${rol}...`;
            estado.style.color = "#666";
        }

        try {
            const { data, error } = await supabase.functions.invoke("master-reset-password", {
                body: {
                    action: "reset",
                    targetUserId: userId,
                    newPassword: nuevaLimpia
                }
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            if (estado) {
                estado.textContent = `✅ Acceso de ${rol} restablecido correctamente.`;
                estado.style.color = "#18794e";
            }
        } catch (error) {
            console.error("❌ Error al restablecer acceso:", error);
            if (estado) {
                estado.textContent = `❌ ${error?.message || "No se pudo restablecer el acceso."}`;
                estado.style.color = "#b42318";
            }
        }
    }

    function mostrarEstadoPassword(mensaje, error = false) {
        const estado = document.getElementById("estadoCambioPassword");
        if (!estado) return;
        estado.textContent = mensaje;
        estado.style.color = error ? "#b42318" : "#18794e";
    }

    function cerrarModalCuenta() {
        document.getElementById("modalCuentaSnackOffice")?.remove();
    }

    async function cerrarSesion() {
        cerrarModalCuenta();

        const { error } = await supabase.auth.signOut();

        if (error) {
            console.error("❌ Error al cerrar sesión:", error);
        }

        perfilActual = null;

        loginScreen.style.display = "flex";
        adminScreen.style.display = "none";
        ventasScreen.style.display = "none";

        usuarioInput.value = "";
        passwordInput.value = "";
        usuarioInput.focus();

        console.log("🚪 Sesión cerrada");
    }

    async function restaurarSesion() {
        try {
            const { data, error } = await supabase.auth.getSession();

            if (error || !data.session?.user) return;

            const perfil = await cargarPerfil(data.session.user.id);

            if (!perfil || perfil.activo === false) {
                await supabase.auth.signOut();
                return;
            }

            perfilActual = perfil;
            mostrarPantallaSegunRol(perfil);
        } catch (error) {
            console.error("❌ No se pudo restaurar la sesión:", error);
        }
    }

    function traducirErrorAuth(error) {
        const mensaje = String(error?.message || error || "");

        if (/invalid login credentials/i.test(mensaje)) {
            return "Usuario o contraseña incorrectos.";
        }

        if (/email not confirmed/i.test(mensaje)) {
            return "La cuenta todavía no está confirmada en Supabase.";
        }

        if (/password should be at least/i.test(mensaje)) {
            return "La contraseña no cumple la longitud mínima.";
        }

        return mensaje || "Ocurrió un error de autenticación.";
    }

    function escapeHtml(valor) {
        return String(valor ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    if (btnLogin) {
        btnLogin.dataset.authInitialized = "true";
        btnLogin.addEventListener("click", iniciarSesion);
    }

    if (btnAyudaAcceso) {
        btnAyudaAcceso.addEventListener("click", () => {
            alert("🔑 ¿No puedes entrar?\n\nSolicita al usuario MASTER que restablezca tu acceso.\n\nNo compartas tu contraseña con nadie.");
        });
    }

    [usuarioInput, passwordInput].forEach(input => {
        if (!input) return;

        input.addEventListener("keydown", evento => {
            if (evento.key === "Enter") {
                evento.preventDefault();
                iniciarSesion();
            }
        });
    });

    if (btnCerrarSesionAdmin) {
        btnCerrarSesionAdmin.addEventListener("click", cerrarSesion);
    }

    if (btnCerrarSesionVentas) {
        btnCerrarSesionVentas.addEventListener("click", cerrarSesion);
    }

    // SnackOffice requiere iniciar sesión manualmente cada vez que se abre o recarga.
    // Limpiamos cualquier sesión persistida de Supabase para evitar acceso automático.
    try {
        await supabase.auth.signOut();
    } catch (error) {
        console.warn("⚠️ No se pudo limpiar la sesión anterior:", error);
    }

    loginScreen.style.display = "flex";
    adminScreen.style.display = "none";
    ventasScreen.style.display = "none";
}

