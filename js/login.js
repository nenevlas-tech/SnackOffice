//=====================================
// SNACK OFFICE
// MÓDULO: LOGIN
//=====================================


export function iniciarLogin() {

    // Referencias del HTML
    const loginScreen = document.getElementById("loginScreen");
    const adminScreen = document.getElementById("adminScreen");
    const ventasScreen = document.getElementById("ventasScreen");

    const usuarioInput = document.getElementById("usuario");
    const passwordInput = document.getElementById("password");

    const btnLogin = document.getElementById("btnLogin");


    // Evento del botón iniciar sesión
    btnLogin.addEventListener("click", function () {

        const usuario = usuarioInput.value.trim();
        const password = passwordInput.value.trim();


        //==============================
        // ADMINISTRADOR
        //==============================

        if (usuario === "admin" && password === "1234") {

            loginScreen.style.display = "none";
            ventasScreen.style.display = "none";
            adminScreen.style.display = "block";

            console.log("Sesión iniciada como administrador");

            return;
        }


        //==============================
        // USUARIO DE VENTAS
        //==============================

        if (usuario === "ventas" && password === "1234") {

            loginScreen.style.display = "none";
            adminScreen.style.display = "none";
            ventasScreen.style.display = "block";

            console.log("Sesión iniciada como ventas");

            return;
        }


        //==============================
        // DATOS INCORRECTOS
        //==============================

        alert("❌ Usuario o contraseña incorrectos");

    });
}
