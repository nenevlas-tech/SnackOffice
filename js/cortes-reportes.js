// =====================================
// SNACK OFFICE - JORNADAS, CORTES Y REPORTES
// =====================================

const KEY_JORNADA = "jornadaActual";
const KEY_JORNADAS = "jornadasArchivadas";
const KEY_VENTAS = "historialVentas";
const KEY_CXC_MOV = "movimientosCxC";
const KEY_CXC = "cuentasPendientes";
const KEY_FOLIO = "siguienteFolioVenta";

function leerJSON(clave, respaldo) {
    try {
        const valor = JSON.parse(localStorage.getItem(clave));
        return valor ?? respaldo;
    } catch {
        return respaldo;
    }
}

function guardarJSON(clave, valor) {
    localStorage.setItem(clave, JSON.stringify(valor));
}

function hoyISO() {
    const ahora = new Date();
    const y = ahora.getFullYear();
    const m = String(ahora.getMonth() + 1).padStart(2, "0");
    const d = String(ahora.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function dinero(valor) {
    return `$${Number(valor || 0).toFixed(2)}`;
}

function fechaBonita(iso) {
    if (!iso) return "—";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
}

function crearJornada() {
    const fecha = hoyISO();
    const jornada = {
        id: `J-${fecha}-${Date.now()}`,
        fecha,
        apertura: new Date().toISOString(),
        estado: "abierta"
    };

    guardarJSON(KEY_JORNADA, jornada);
    return jornada;
}

export function obtenerJornadaActual() {
    const guardada = leerJSON(KEY_JORNADA, null);

    if (!guardada || guardada.estado !== "abierta") {
        return crearJornada();
    }

    return guardada;
}

export function obtenerFolioVenta() {
    const siguiente = Number(localStorage.getItem(KEY_FOLIO) || "1");
    localStorage.setItem(KEY_FOLIO, String(siguiente + 1));
    return siguiente;
}

export function registrarVentaEnJornada(venta) {
    const jornada = obtenerJornadaActual();
    venta.jornadaId = jornada.id;
    venta.jornadaFecha = jornada.fecha;
    venta.folio = obtenerFolioVenta();
    venta.hora = new Date().toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit"
    });
    return venta;
}

export function registrarMovimientoCxC(movimiento) {
    const movimientos = leerJSON(KEY_CXC_MOV, []);
    const jornada = obtenerJornadaActual();

    movimientos.push({
        id: `MCXC-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        jornadaId: jornada.id,
        jornadaFecha: jornada.fecha,
        fecha: new Date().toISOString(),
        ...movimiento
    });

    guardarJSON(KEY_CXC_MOV, movimientos);
}

function obtenerVentasActuales() {
    return leerJSON(KEY_VENTAS, []);
}

function obtenerMovimientosDelDia(jornada) {
    return leerJSON(KEY_CXC_MOV, []).filter(
        movimiento => movimiento.jornadaId === jornada.id
    );
}

function calcularResumen(jornada) {
    const ventas = obtenerVentasActuales();
    const movimientos = obtenerMovimientosDelDia(jornada);

    const resumen = {
        ventas: ventas.length,
        productos: ventas.reduce(
            (suma, venta) => suma + (venta.productos || []).reduce(
                (sub, producto) => sub + Number(producto.cantidad || 0),
                0
            ),
            0
        ),
        totalVendido: ventas.reduce((suma, venta) => suma + Number(venta.total || 0), 0),
        efectivo: 0,
        tarjeta: 0,
        transferencia: 0,
        pendiente: 0,
        abonosCxC: 0,
        abonosEfectivo: 0,
        abonosTarjeta: 0,
        abonosTransferencia: 0,
        cuentasActivas: 0,
        saldoPendiente: 0,
        saldoFavor: 0
    };

    ventas.forEach(venta => {
        const desglose = Array.isArray(venta.desglosePago) && venta.desglosePago.length
            ? venta.desglosePago
            : [{ metodo: venta.metodoPago || "Efectivo", importe: Number(venta.total || 0) }];

        desglose.forEach(pago => {
            const importe = Number(pago.importe || 0);
            const metodo = pago.metodo || "Efectivo";
            if (metodo === "Efectivo") resumen.efectivo += importe;
            if (metodo === "Tarjeta") resumen.tarjeta += importe;
            if (metodo === "Transferencia") resumen.transferencia += importe;
            if (metodo === "Pendiente") resumen.pendiente += importe;
        });
    });

    movimientos.forEach(movimiento => {
        if (movimiento.tipo !== "ABONO") return;
        const importe = Number(movimiento.importe || 0);
        resumen.abonosCxC += importe;

        if (movimiento.metodoPago === "Efectivo") resumen.abonosEfectivo += importe;
        if (movimiento.metodoPago === "Tarjeta") resumen.abonosTarjeta += importe;
        if (movimiento.metodoPago === "Transferencia") resumen.abonosTransferencia += importe;
    });

    const cuentas = leerJSON(KEY_CXC, []);
    cuentas.forEach(cuenta => {
        const saldo = Math.max(0, Number(cuenta.saldo || 0));
        const favor = Math.max(0, Number(cuenta.saldoFavor || 0));
        if (saldo > 0) resumen.cuentasActivas++;
        resumen.saldoPendiente += saldo;
        resumen.saldoFavor += favor;
    });

    return resumen;
}

export function obtenerResumenJornadaActual() {
    const jornada = obtenerJornadaActual();
    return { jornada, resumen: calcularResumen(jornada) };
}

function obtenerEstadoCxCCierre() {
    const cuentas = leerJSON(KEY_CXC, []);
    return cuentas.map(cuenta => ({
        id: cuenta.id,
        cliente: cuenta.cliente || "Cliente sin nombre",
        ventaId: cuenta.ventaId || null,
        total: Number(cuenta.total || 0),
        abonado: Number(cuenta.abonado || 0),
        saldo: Math.max(0, Number(cuenta.saldo || 0)),
        saldoFavor: Math.max(0, Number(cuenta.saldoFavor || 0)),
        estado: cuenta.estado || "Pendiente"
    }));
}

function obtenerClientesCierre() {
    return leerJSON("clientesSnackOffice", []).map(cliente => ({ ...cliente }));
}

export function cerrarJornada() {
    const jornada = obtenerJornadaActual();
    const ventas = obtenerVentasActuales();
    const movimientos = obtenerMovimientosDelDia(jornada);
    const resumen = calcularResumen(jornada);

    if (ventas.length === 0 && movimientos.length === 0) {
        const continuar = confirm(
            "La jornada no tiene ventas ni abonos registrados.\n\n¿Deseas cerrarla de todos modos?"
        );
        if (!continuar) return false;
    }

    const confirmar = confirm(
        `Cerrar jornada ${fechaBonita(jornada.fecha)}\n\n` +
        `Ventas: ${resumen.ventas}\n` +
        `Total vendido: ${dinero(resumen.totalVendido)}\n` +
        `Abonos CxC: ${dinero(resumen.abonosCxC)}\n\n` +
        `La información quedará archivada y la operación del día se limpiará.`
    );

    if (!confirmar) return false;

    const cierre = {
        ...jornada,
        cierre: new Date().toISOString(),
        estado: "cerrada",
        resumen,
        ventas: [...ventas],
        movimientosCxC: [...movimientos],
        estadoCxC: obtenerEstadoCxCCierre(),
        clientes: obtenerClientesCierre()
    };

    const archivadas = leerJSON(KEY_JORNADAS, []);
    archivadas.push(cierre);
    guardarJSON(KEY_JORNADAS, archivadas);

    guardarJSON(KEY_VENTAS, []);

    const nueva = crearJornada();
    alert(
        `✅ Jornada cerrada correctamente.\n\n` +
        `Reporte archivado: ${fechaBonita(cierre.fecha)}\n` +
        `Nueva jornada abierta: ${fechaBonita(nueva.fecha)}`
    );

    renderizarCortes();
    return true;
}

function renderizarCortes() {
    const contentArea = document.getElementById("contentArea");
    if (!contentArea) return;

    const { jornada, resumen } = obtenerResumenJornadaActual();

    contentArea.innerHTML = `
        <section class="so-admin-modulo">
            <div class="so-modulo-header">
                <div>
                    <h1>📊 Corte de jornada</h1>
                    <p>Resumen de la operación actual antes de cerrar el día.</p>
                </div>
                <span class="so-estado-jornada">🟢 Jornada abierta</span>
            </div>

            <div class="so-jornada-barra">
                <strong>Jornada:</strong> ${fechaBonita(jornada.fecha)}
                <span>ID: ${jornada.id}</span>
            </div>

            <div class="so-metricas">
                <div><span>🧾</span><small>Ventas</small><strong>${resumen.ventas}</strong></div>
                <div><span>📦</span><small>Productos vendidos</small><strong>${resumen.productos}</strong></div>
                <div><span>💰</span><small>Total vendido</small><strong>${dinero(resumen.totalVendido)}</strong></div>
                <div><span>📒</span><small>Ventas a crédito</small><strong>${dinero(resumen.pendiente)}</strong></div>
            </div>

            <div class="so-grid-2">
                <div class="so-panel">
                    <h2>💳 Ventas por método de pago</h2>
                    <div class="so-linea"><span>💵 Efectivo</span><strong>${dinero(resumen.efectivo)}</strong></div>
                    <div class="so-linea"><span>💳 Tarjeta</span><strong>${dinero(resumen.tarjeta)}</strong></div>
                    <div class="so-linea"><span>🔄 Transferencia</span><strong>${dinero(resumen.transferencia)}</strong></div>
                    <div class="so-linea destacado"><span>🕐 Crédito generado</span><strong>${dinero(resumen.pendiente)}</strong></div>
                </div>

                <div class="so-panel">
                    <h2>💵 Cobranza CxC del día</h2>
                    <div class="so-linea"><span>💵 Efectivo</span><strong>${dinero(resumen.abonosEfectivo)}</strong></div>
                    <div class="so-linea"><span>💳 Tarjeta</span><strong>${dinero(resumen.abonosTarjeta)}</strong></div>
                    <div class="so-linea"><span>🔄 Transferencia</span><strong>${dinero(resumen.abonosTransferencia)}</strong></div>
                    <div class="so-linea destacado"><span>Total cobrado</span><strong>${dinero(resumen.abonosCxC)}</strong></div>
                </div>
            </div>

            <div class="so-panel so-cxc-resumen">
                <h2>📒 Estado de cuentas por cobrar</h2>
                <div class="so-cxc-cards">
                    <div><small>Cuentas activas</small><strong>${resumen.cuentasActivas}</strong></div>
                    <div><small>Saldo pendiente total</small><strong>${dinero(resumen.saldoPendiente)}</strong></div>
                    <div><small>Saldo a favor</small><strong>${dinero(resumen.saldoFavor)}</strong></div>
                </div>
            </div>

            <div class="so-acciones-corte">
                <button id="btnCerrarJornada" class="so-btn-cerrar">🔒 Cerrar jornada y archivar</button>
                <button id="btnReiniciarPruebas" class="so-btn-reset">🔄 Reiniciar datos de prueba</button>
            </div>
        </section>
    `;

    document.getElementById("btnCerrarJornada")?.addEventListener("click", cerrarJornada);
    document.getElementById("btnReiniciarPruebas")?.addEventListener("click", reiniciarDatosDePrueba);
}

function reiniciarDatosDePrueba() {
    const primera = confirm(
        "⚠️ REINICIO DE PRUEBAS\n\nSe eliminarán las ventas, cuentas CxC, movimientos CxC, clientes y reportes archivados de esta prueba.\n\nEl catálogo/inventario NO se modificará.\n\n¿Deseas continuar?"
    );
    if (!primera) return;

    const segunda = confirm(
        "Última confirmación: esta acción no se puede deshacer.\n\n¿Reiniciar los datos transaccionales de prueba?"
    );
    if (!segunda) return;

    [KEY_VENTAS, KEY_CXC_MOV, KEY_CXC, KEY_JORNADAS, "clientesSnackOffice"].forEach(clave => localStorage.removeItem(clave));
    localStorage.setItem(KEY_FOLIO, "1");
    crearJornada();

    alert("✅ Datos transaccionales de prueba reiniciados. El inventario se conservó.");
    renderizarCortes();
}

function renderizarReportes() {
    const contentArea = document.getElementById("contentArea");
    if (!contentArea) return;

    const jornadas = leerJSON(KEY_JORNADAS, []);

    if (jornadas.length === 0) {
        contentArea.innerHTML = `
            <section class="so-admin-modulo">
                <div class="so-modulo-header">
                    <div><h1>📈 Reportes</h1><p>Consulta las jornadas cerradas y sus resultados.</p></div>
                </div>
                <div class="so-vacio">📭 Todavía no hay jornadas cerradas.</div>
            </section>
        `;
        return;
    }

    contentArea.innerHTML = `
        <section class="so-admin-modulo">
            <div class="so-modulo-header">
                <div><h1>📈 Reportes históricos</h1><p>Las jornadas cerradas se conservan aunque el historial operativo se haya limpiado.</p></div>
            </div>
            <div class="so-reportes-lista" id="soReportesLista"></div>
        </section>
    `;

    const lista = document.getElementById("soReportesLista");

    jornadas.slice().reverse().forEach(jornada => {
        const r = jornada.resumen || {};
        const tarjeta = document.createElement("article");
        tarjeta.className = "so-reporte-card";
        tarjeta.innerHTML = `
            <div>
                <h3>📅 ${fechaBonita(jornada.fecha)}</h3>
                <p>Jornada ${jornada.id}</p>
                <small>Cerrada: ${jornada.cierre ? new Date(jornada.cierre).toLocaleString("es-MX") : "—"}</small>
            </div>
            <div class="so-reporte-datos">
                <span>${r.ventas || 0} ventas</span>
                <strong>${dinero(r.totalVendido)}</strong>
                <button type="button" class="so-btn-ver-reporte">Ver detalle</button>
            </div>
        `;

        tarjeta.querySelector(".so-btn-ver-reporte")?.addEventListener("click", () => mostrarDetalleReporte(jornada));
        lista.appendChild(tarjeta);
    });
}

function mostrarDetalleReporte(jornada) {
    const contentArea = document.getElementById("contentArea");
    if (!contentArea) return;

    const r = jornada.resumen || {};
    const ventas = jornada.ventas || [];
    const movimientos = jornada.movimientosCxC || [];

    contentArea.innerHTML = `
        <section class="so-admin-modulo">
            <button id="btnVolverReportes" class="so-btn-secundario">← Volver a reportes</button>
            <div class="so-modulo-header">
                <div><h1>📄 Reporte ${fechaBonita(jornada.fecha)}</h1><p>Detalle completo de la jornada cerrada.</p></div>
            </div>

            <div class="so-metricas">
                <div><span>🧾</span><small>Ventas</small><strong>${r.ventas || 0}</strong></div>
                <div><span>💰</span><small>Total vendido</small><strong>${dinero(r.totalVendido)}</strong></div>
                <div><span>📒</span><small>Ventas a crédito</small><strong>${dinero(r.pendiente)}</strong></div>
                <div><span>💵</span><small>Abonos CxC</small><strong>${dinero(r.abonosCxC)}</strong></div>
                <div><span>🔴</span><small>Saldo pendiente al cierre</small><strong>${dinero(r.saldoPendiente)}</strong></div>
                <div><span>🟢</span><small>Saldo a favor al cierre</small><strong>${dinero(r.saldoFavor)}</strong></div>
            </div>

            <div class="so-panel">
                <h2>🧾 Ventas de la jornada</h2>
                <div class="so-tabla-wrap">
                    <table class="so-tabla">
                        <thead><tr><th>Folio</th><th>Hora</th><th>Cliente</th><th>Método</th><th>Estado</th><th>Total</th></tr></thead>
                        <tbody>
                            ${ventas.length ? ventas.map(v => `
                                <tr>
                                    <td>#${v.folio || v.id}</td>
                                    <td>${v.hora || "—"}</td>
                                    <td>${v.cliente || "Público general"}</td>
                                    <td>${v.metodoPago || "Efectivo"}</td>
                                    <td>${v.estadoPago || "Pagado"}</td>
                                    <td>${dinero(v.total)}</td>
                                </tr>
                            `).join("") : `<tr><td colspan="6">No hubo ventas.</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="so-panel">
                <h2>💵 Movimientos CxC de la jornada</h2>
                <div class="so-tabla-wrap">
                    <table class="so-tabla">
                        <thead><tr><th>Tipo</th><th>Cliente</th><th>Venta</th><th>Método</th><th>Importe</th></tr></thead>
                        <tbody>
                            ${movimientos.length ? movimientos.map(m => `
                                <tr>
                                    <td>${m.tipo || "—"}</td>
                                    <td>${m.cliente || "—"}</td>
                                    <td>${m.ventaId ? `#${m.ventaId}` : "—"}</td>
                                    <td>${m.metodoPago || "—"}</td>
                                    <td>${dinero(m.importe)}</td>
                                </tr>
                            `).join("") : `<tr><td colspan="5">No hubo movimientos CxC.</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="so-panel">
                <h2>📒 Estado de CxC al cierre</h2>
                <p class="so-panel-ayuda">Este es el saldo real que quedó al finalizar la jornada. No equivale al total de ventas a crédito.</p>
                <div class="so-tabla-wrap">
                    <table class="so-tabla">
                        <thead><tr><th>Cliente</th><th>Venta</th><th>Total</th><th>Abonado</th><th>Saldo</th><th>A favor</th><th>Estado</th></tr></thead>
                        <tbody>
                            ${(jornada.estadoCxC || []).length ? (jornada.estadoCxC || []).map(c => `
                                <tr>
                                    <td>${c.cliente}</td>
                                    <td>${c.ventaId ? `#${c.ventaId}` : "—"}</td>
                                    <td>${dinero(c.total)}</td>
                                    <td>${dinero(c.abonado)}</td>
                                    <td>${dinero(c.saldo)}</td>
                                    <td>${dinero(c.saldoFavor)}</td>
                                    <td>${c.saldo > 0 ? "Pendiente" : (c.saldoFavor > 0 ? "Saldo a favor" : "Liquidada")}</td>
                                </tr>
                            `).join("") : `<tr><td colspan="7">No hubo cuentas CxC al cierre.</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="so-panel">
                <h2>👥 Clientes con movimiento</h2>
                <div class="so-tabla-wrap">
                    <table class="so-tabla">
                        <thead><tr><th>Cliente</th><th>Compras acumuladas</th><th>Total comprado</th><th>Última compra</th></tr></thead>
                        <tbody>
                            ${(jornada.clientes || []).length ? (jornada.clientes || []).map(c => `
                                <tr>
                                    <td>${c.nombre || "—"}</td>
                                    <td>${Number(c.compras || 0)}</td>
                                    <td>${dinero(c.totalCompras)}</td>
                                    <td>${c.ultimaCompra || "—"}</td>
                                </tr>
                            `).join("") : `<tr><td colspan="4">No hubo clientes registrados.</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    `;

    document.getElementById("btnVolverReportes")?.addEventListener("click", renderizarReportes);
}

export function iniciarCortesReportes() {
    obtenerJornadaActual();

    const btnCortes = document.getElementById("btnCortes");
    const btnReportes = document.getElementById("btnReportes");

    btnCortes?.addEventListener("click", renderizarCortes);
    btnReportes?.addEventListener("click", renderizarReportes);
}
