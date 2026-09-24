//=====================================
// SNACK OFFICE
// ARCHIVO PRINCIPAL
//=====================================

import { inicializarCatalogo } from "./catalogo-inicial.js";
import { iniciarVentas } from "./ventas.js";
import { iniciarLogin } from "./login.js";
import { iniciarInventario } from "./inventario.js";
import { iniciarAdministrador } from "./admin.js";

//=====================================
// INICIO DEL SISTEMA
//=====================================

console.log("Snack Office iniciado");

// Cargar catálogo inicial solo cuando el navegador todavía no tiene productos.
inicializarCatalogo();

//=====================================
// INICIALIZAR MÓDULOS
//=====================================

iniciarLogin();
iniciarInventario();
iniciarVentas();
iniciarAdministrador();
