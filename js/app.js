import { iniciarVentas } from "./ventas.js";
//=====================================
// SNACK OFFICE
// ARCHIVO PRINCIPAL
//=====================================

import { iniciarLogin } from "./login.js";
import { iniciarInventario } from "./inventario.js";
import { iniciarAdministrador } from "./admin.js";

//=====================================
// INICIO DEL SISTEMA
//=====================================

console.log("Snack Office iniciado");


//=====================================
// INICIALIZAR MÓDULOS
//=====================================

iniciarLogin();
iniciarInventario();
iniciarVentas();
iniciarAdministrador();
