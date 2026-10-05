//=====================================
// SNACK OFFICE
// ARCHIVO PRINCIPAL
//=====================================

import { supabase } from "./supabase.js?v=20261005-2";
import { inicializarCatalogo } from "./catalogo-inicial.js?v=20261005-2";
import { inicializarImagenesCatalogo } from "./imagenes-iniciales.js?v=20261005-2";
import { iniciarVentas } from "./ventas.js?v=20261005-2";
import { iniciarLogin } from "./login.js?v=20261005-2";
import { iniciarInventario } from "./inventario.js?v=20261005-2";
import { iniciarAdministrador } from "./admin.js?v=20261005-2";
import { iniciarCortesReportes } from "./cortes-reportes.js?v=20261005-2";

console.log("Snack Office iniciado");


inicializarCatalogo();
inicializarImagenesCatalogo();

iniciarLogin();
iniciarInventario();
iniciarVentas();
iniciarAdministrador();
iniciarCortesReportes();
