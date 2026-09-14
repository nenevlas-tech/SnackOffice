//=====================================
// SNACK OFFICE
// MÓDULO: LOGIN
//=====================================

export function iniciarLogin() {
    // Referencias de las pantallas
    const loginScreen = document.getElementById("loginScreen");
    const adminScreen = document.getElementById("adminScreen");
    const ventasScreen = document.getElementById("ventasScreen");

    // Referencias del formulario
    const usuarioInput = document.getElementById("usuario");
    const passwordInput = document.getElementById("password");
    const btnLogin = document.getElementById("btnLogin");

    // Referencias de cerrar sesión
    const btnCerrarSesionAdmin = document.getElementById("btnCerrarSesionAdmin");
    const btnCerrarSesionVentas = document.getElementById("btnCerrarSesionVentas");

    function iniciarSesion() {
        const usuario = usuarioInput.value.trim();
        const password = passwordInput.value.trim();

        if (usuario === "admin" && password === "1234") {
            loginScreen.style.display = "none";
            ventasScreen.style.display = "none";
            adminScreen.style.display = "block";
            console.log("Sesión iniciada como administrador");
            return;
        }

        if (usuario === "ventas" && password === "1234") {
            loginScreen.style.display = "none";
            adminScreen.style.display = "none";
            ventasScreen.style.display = "block";
            console.log("Sesión iniciada como ventas");
            return;
        }

        alert("❌ Usuario o contraseña incorrectos");
    }

    function cerrarSesion() {
        loginScreen.style.display = "flex";
        adminScreen.style.display = "none";
        ventasScreen.style.display = "none";

        usuarioInput.value = "";
        passwordInput.value = "";
        usuarioInput.focus();

        console.log("Sesión cerrada");
    }

    if (btnLogin) {
        btnLogin.addEventListener("click", iniciarSesion);
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
}
