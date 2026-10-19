//=====================================
// SNACK OFFICE
// ARCHIVO PRINCIPAL
//=====================================

import { supabase } from "./supabase.js?v=20261007-1";
import { inicializarCatalogo } from "./catalogo-inicial.js?v=20261007-1";
import { inicializarImagenesCatalogo } from "./imagenes-iniciales.js?v=20261019-imgfix3";
import { iniciarVentas } from "./ventas.js?v=20261017-cxcfix1";
import { iniciarLogin } from "./login.js?v=20261007-5";

import { iniciarInventario } from "./inventario.js?v=20261007-3";
import { iniciarAdministrador } from "./admin.js?v=20261016-integrado3";
import { iniciarPromociones } from "./promociones.js?v=20261019-promos-fix3";
import { iniciarCatalogoClientes } from "./catalogo-clientes.js?v=20261016-integrado3";
import { iniciarCortesReportes } from "./cortes-reportes.js?v=20261019-resetmaster1";

console.log("Snack Office iniciado");

inicializarCatalogo();
inicializarImagenesCatalogo();

let modulosAutenticadosInicializados = false;

async function iniciarModulosAutenticados(perfil) {
    if (modulosAutenticadosInicializados) return;

    modulosAutenticadosInicializados = true;

    console.log(`🔐 Inicializando módulos para ${perfil?.rol || "USUARIO"}...`);

    try {
        iniciarInventario();
        await iniciarVentas();
        iniciarAdministrador();
        iniciarPromociones();
        iniciarCatalogoClientes();
        await iniciarCortesReportes();
        console.log("✅ Módulos autenticados inicializados correctamente.");
    } catch (error) {
        modulosAutenticadosInicializados = false;
        console.error("❌ Error inicializando módulos autenticados:", error);
        alert("❌ No se pudieron inicializar todos los módulos. Revisa la consola.");
    }
}

iniciarLogin({
    onAuthenticated: iniciarModulosAutenticados
});
