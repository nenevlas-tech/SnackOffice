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
import { iniciarCortesReportes } from "./cortes-reportes.js";

console.log("Snack Office iniciado");

inicializarCatalogo();
inicializarImagenesCatalogo();

iniciarLogin();
iniciarInventario();
iniciarVentas();
iniciarAdministrador();
iniciarCortesReportes();
