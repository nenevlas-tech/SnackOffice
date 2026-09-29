//=====================================
// SNACK OFFICE
// ARCHIVO PRINCIPAL
//=====================================

import { inicializarCatalogo } from "./catalogo-inicial.js";
import { inicializarImagenesCatalogo } from "./imagenes-iniciales.js";
import { iniciarVentas } from "./ventas.js";
import { iniciarLogin } from "./login.js";
import { iniciarInventario } from "./inventario.js";
import { iniciarAdministrador } from "./admin.js";

//=====================================
// INICIO DEL SISTEMA
//=====================================

console.log("Snack Office iniciado");

// Primero aseguramos el catálogo inicial y sus imágenes.
inicializarCatalogo();
inicializarImagenesCatalogo();

// Después iniciamos los módulos.
iniciarLogin();
iniciarInventario();
iniciarVentas();
iniciarAdministrador();
