//=====================================
// SNACK OFFICE
// ARCHIVO PRINCIPAL
//=====================================

import { supabase } from "./supabase.js?v=20261007-1";
import { inicializarCatalogo } from "./catalogo-inicial.js?v=20261007-1";
import { inicializarImagenesCatalogo } from "./imagenes-iniciales.js?v=20261007-1";
import { iniciarVentas } from "./ventas.js?v=20261007-1";
import { iniciarLogin } from "./login.js?v=20261007-1";
import { iniciarInventario } from "./inventario.js?v=20261007-3";
import { iniciarAdministrador } from "./admin.js?v=20261007-1";
import { iniciarCortesReportes } from "./cortes-reportes.js?v=20261007-1";

console.log("Snack Office iniciado");


inicializarCatalogo();
inicializarImagenesCatalogo();

iniciarLogin();
iniciarInventario();
iniciarVentas();
iniciarAdministrador();
iniciarCortesReportes();
