import { supabase } from "./supabase.js?v=20261007-2";

// =====================================
// SNACK OFFICE - JORNADAS, CORTES Y REPORTES
// Fuente principal: Supabase
// =====================================

const KEY_CXC_MOV = "movimientosCxC";

function dinero(valor) {
    return `$${Number(valor || 0).toFixed(2)}`;
}

function fechaBonita(iso) {
    if (!iso) return "—";
    const [y, m, d] = String(iso).slice(0, 10).split("-");
    return y && m && d ? `${d}/${m}/${y}` : "—";
}

function estadoJornadaAbierta(jornada) {
    return String(jornada?.estado || "").toUpperCase() === "ABIERTA";
}

// Compatibilidad temporal: algunas funciones antiguas de ventas todavía
// registran movimientos locales, pero los reportes centrales NO dependen de ellos.
export function registrarMovimientoCxC(movimiento) {
    try {
        const movimientos = JSON.parse(localStorage.getItem(KEY_CXC_MOV) || "[]");
        movimientos.push({
            id: `MCXC-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            fecha: new Date().toISOString(),
            ...movimiento
        });
        localStorage.setItem(KEY_CXC_MOV, JSON.stringify(movimientos));
    } catch (error) {
        console.warn("⚠️ No se pudo guardar el movimiento local de compatibilidad:", error);
    }
}

export async function obtenerJornadaActual() {
    const { data, error } = await supabase.rpc("obtener_jornada_actual");

    if (error || !data?.id) {
        console.error("❌ No se pudo obtener la jornada central:", error);
        return null;
    }

    return data;
}

// Se conserva por compatibilidad con código anterior. El folio real se obtiene
// directamente mediante la RPC central desde registrarVentaEnJornada().
export function obtenerFolioVenta() {
    console.warn("ℹ️ El folio de venta ahora se genera en Supabase.");
    return null;
}

export async function registrarVentaEnJornada(venta) {
    const jornada = await obtenerJornadaActual();

    if (!jornada || !estadoJornadaAbierta(jornada)) {
        alert("❌ No hay una jornada abierta disponible. La venta no se registró.");
        return null;
    }

    const { data: folio, error: folioError } = await supabase.rpc(
        "obtener_siguiente_folio_jornada",
        { p_jornada_id: jornada.id }
    );

    if (folioError || folio === null || folio === undefined) {
        console.error("❌ No se pudo obtener el folio central:", folioError);
        alert("❌ No se pudo obtener un folio para esta jornada. La venta no se registró.");
        return null;
    }

    venta.jornadaId = jornada.id;
    venta.jornadaFecha = jornada.fecha;
    venta.folio = Number(folio);
    venta.hora = new Date().toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit"
    });

    return venta;
}

async function obtenerVentasJornada(jornadaId) {
    const { data, error } = await supabase
        .from("ventas")
        .select("id,folio,fecha,cliente,metodo_pago,desglose_pago,total,total_cobrado,estado_pago,abonado,saldo,saldo_favor,productos,jornada_id")
        .eq("jornada_id", String(jornadaId))
        .order("fecha", { ascending: true });

    if (error) {
        console.error("❌ Error obteniendo ventas de la jornada:", error);
        throw error;
    }

    return data || [];
}

async function obtenerMovimientosJornada(jornada, ventas = null) {
    const inicio = jornada.apertura;
    const fin = jornada.cierre || new Date().toISOString();

    const { data, error } = await supabase
        .from("movimientos_cxc")
        .select("id,venta_id,cliente,tipo,fecha,importe,metodo_pago,saldo_despues,saldo_favor_despues")
        .gte("fecha", inicio)
        .lte("fecha", fin)
        .order("fecha", { ascending: true });

    if (error) {
        console.error("❌ Error obteniendo movimientos CxC de la jornada:", error);
        throw error;
    }

    // Si el backend devuelve movimientos de otras operaciones dentro del rango,
    // conservamos únicamente movimientos ligados a ventas existentes cuando se
    // recibió el listado de ventas. Esto evita mezclar jornadas por accidente.
    if (!ventas) return data || [];

    const idsVentas = new Set(ventas.map(v => Number(v.id)));
    return (data || []).filter(m => idsVentas.has(Number(m.venta_id)));
}

async function obtenerEstadoCxCActual() {
    const { data, error } = await supabase
        .from("ventas")
        .select("id,folio,cliente,total,abonado,saldo,saldo_favor,estado_pago,jornada_id")
        .or("saldo.gt.0,saldo_favor.gt.0,estado_pago.eq.Pendiente")
        .order("fecha", { ascending: true });

    if (error) {
        console.error("❌ Error obteniendo estado CxC:", error);
        throw error;
    }

    return (data || []).map(cuenta => ({
        id: Number(cuenta.id),
        cliente: cuenta.cliente || "Cliente sin nombre",
        ventaId: cuenta.folio || cuenta.id,
        total: Number(cuenta.total || 0),
        abonado: Number(cuenta.abonado || 0),
        saldo: Math.max(0, Number(cuenta.saldo || 0)),
        saldoFavor: Math.max(0, Number(cuenta.saldo_favor || 0)),
        estado: cuenta.saldo_favor > 0 && Number(cuenta.saldo || 0) <= 0
            ? "Saldo a favor"
            : (Number(cuenta.saldo || 0) > 0 ? "Pendiente" : "Pagado")
    }));
}

function calcularResumen(ventas, movimientos, estadoCxC) {
    const resumen = {
        ventas: ventas.length,
        productos: ventas.reduce(
            (total, venta) => total + (Array.isArray(venta.productos)
                ? venta.productos.reduce((sub, producto) => sub + Number(producto.cantidad || 0), 0)
                : 0),
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
        const desglose = Array.isArray(venta.desglose_pago) && venta.desglose_pago.length
            ? venta.desglose_pago
            : [{ metodo: venta.metodo_pago || "Efectivo", importe: Number(venta.total || 0) }];

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
        if (String(movimiento.tipo || "").toUpperCase() !== "ABONO") return;
        const importe = Number(movimiento.importe || 0);
        resumen.abonosCxC += importe;
        if (movimiento.metodo_pago === "Efectivo") resumen.abonosEfectivo += importe;
        if (movimiento.metodo_pago === "Tarjeta") resumen.abonosTarjeta += importe;
        if (movimiento.metodo_pago === "Transferencia") resumen.abonosTransferencia += importe;
    });

    estadoCxC.forEach(cuenta => {
        if (cuenta.saldo > 0) resumen.cuentasActivas++;
        resumen.saldoPendiente += cuenta.saldo;
        resumen.saldoFavor += cuenta.saldoFavor;
    });

    return resumen;
}

export async function obtenerResumenJornadaActual() {
    const jornada = await obtenerJornadaActual();
    if (!jornada) return null;

    const ventas = await obtenerVentasJornada(jornada.id);
    const movimientos = await obtenerMovimientosJornada(jornada, ventas);
    const estadoCxC = await obtenerEstadoCxCActual();
    const resumen = calcularResumen(ventas, movimientos, estadoCxC);

    return { jornada, resumen, ventas, movimientos, estadoCxC };
}

async function obtenerClientesDeVentas(ventas) {
    const clientesMap = new Map();

    ventas.forEach(venta => {
        const nombre = String(venta.cliente || "").trim();
        if (!nombre || nombre.toLowerCase() === "público general") return;

        const clave = nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const actual = clientesMap.get(clave) || {
            clave,
            nombre,
            compras: 0,
            totalCompras: 0,
            ultimaCompra: ""
        };

        actual.nombre = nombre;
        actual.compras += 1;
        actual.totalCompras += Number(venta.total || 0);
        actual.ultimaCompra = venta.fecha || actual.ultimaCompra;
        clientesMap.set(clave, actual);
    });

    return Array.from(clientesMap.values());
}

export async function cerrarJornada() {
    const estado = await obtenerResumenJornadaActual();
    if (!estado) return false;

    const { jornada, resumen, ventas, movimientos, estadoCxC } = estado;

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
        `La información quedará registrada en Supabase.\n` +
        `¿Deseas continuar?`
    );

    if (!confirmar) return false;

    const cierre = new Date().toISOString();
    const clientes = await obtenerClientesDeVentas(ventas);
    const resumenFinal = {
        ...resumen,
        cierre,
        estadoCxC,
        clientes
    };

    const { data: jornadaCerrada, error } = await supabase
        .from("jornadas")
        .update({
            cierre,
            estado: "CERRADA",
            resumen: resumenFinal
        })
        .eq("id", jornada.id)
        .eq("estado", "ABIERTA")
        .select()
        .maybeSingle();

    if (error) {
        console.error("❌ Error cerrando jornada:", error);
        alert(`❌ No se pudo cerrar la jornada.\n\n${error.message}`);
        return false;
    }

    if (!jornadaCerrada) {
        alert("⚠️ Esta jornada ya fue cerrada desde otro dispositivo.\n\nActualizaremos la información.");
        await renderizarCortes();
        return false;
    }

    // La siguiente jornada se crea/recupera de forma centralizada.
    const nuevaJornada = await obtenerJornadaActual();

    alert(
        `✅ Jornada cerrada correctamente.\n\n` +
        `Reporte archivado: ${fechaBonita(jornada.fecha)}\n` +
        `Nueva jornada abierta: ${nuevaJornada ? fechaBonita(nuevaJornada.fecha) : "pendiente"}`
    );

    await renderizarCortes();
    return true;
}

export async function renderizarCortes() {
    const contentArea = document.getElementById("contentArea");
    if (!contentArea) return;

    contentArea.innerHTML = `
        <section class="so-admin-modulo">
            <div class="so-modulo-header">
                <div>
                    <h1>📊 Corte de jornada</h1>
                    <p>Cargando información centralizada...</p>
                </div>
            </div>
        </section>
    `;

    try {
        const estado = await obtenerResumenJornadaActual();
        if (!estado) throw new Error("No fue posible obtener la jornada actual.");

        const { jornada, resumen } = estado;

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
                </div>
            </section>
        `;

        document.getElementById("btnCerrarJornada")?.addEventListener("click", cerrarJornada);
    } catch (error) {
        console.error(error);
        contentArea.innerHTML = `
            <section class="so-admin-modulo">
                <div class="so-modulo-header">
                    <div>
                        <h1>📊 Corte de jornada</h1>
                        <p>Ocurrió un problema al consultar Supabase.</p>
                    </div>
                </div>
                <div class="so-vacio">❌ ${error.message || "No fue posible cargar el corte."}</div>
            </section>
        `;
    }
}

async function cargarJornadasCerradas() {
    const { data, error } = await supabase
        .from("jornadas")
        .select("id,fecha,apertura,cierre,estado,resumen,ultimo_folio")
        .eq("estado", "CERRADA")
        .order("apertura", { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function renderizarReportes() {
    const contentArea = document.getElementById("contentArea");
    if (!contentArea) return;

    contentArea.innerHTML = `
        <section class="so-admin-modulo">
            <div class="so-modulo-header">
                <div><h1>📈 Reportes históricos</h1><p>Consultando jornadas cerradas desde Supabase...</p></div>
            </div>
        </section>
    `;

    try {
        const jornadas = await cargarJornadasCerradas();

        if (!jornadas.length) {
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
                    <div><h1>📈 Reportes históricos</h1><p>Las jornadas cerradas se conservan en Supabase.</p></div>
                </div>
                <div class="so-reportes-lista" id="soReportesLista"></div>
            </section>
        `;

        const lista = document.getElementById("soReportesLista");
        jornadas.forEach(jornada => {
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
    } catch (error) {
        console.error("❌ Error cargando reportes:", error);
        contentArea.innerHTML = `
            <section class="so-admin-modulo">
                <div class="so-vacio">❌ No se pudieron cargar los reportes desde Supabase.<br><small>${error.message || ""}</small></div>
            </section>
        `;
    }
}

async function mostrarDetalleReporte(jornada) {
    const contentArea = document.getElementById("contentArea");
    if (!contentArea) return;

    contentArea.innerHTML = `
        <section class="so-admin-modulo">
            <button id="btnVolverReportes" class="so-btn-secundario">← Volver a reportes</button>
            <div class="so-modulo-header"><div><h1>📄 Reporte ${fechaBonita(jornada.fecha)}</h1><p>Cargando detalle desde Supabase...</p></div></div>
        </section>
    `;

    try {
        const ventas = await obtenerVentasJornada(jornada.id);
        const movimientos = await obtenerMovimientosJornada(jornada, ventas);
        const r = jornada.resumen || {};
        const estadoCxC = Array.isArray(r.estadoCxC) ? r.estadoCxC : [];
        const clientes = Array.isArray(r.clientes) ? r.clientes : [];

        contentArea.innerHTML = `
            <section class="so-admin-modulo">
                <button id="btnVolverReportes" class="so-btn-secundario">← Volver a reportes</button>
                <div class="so-modulo-header">
                    <div><h1>📄 Reporte ${fechaBonita(jornada.fecha)}</h1><p>Detalle de la jornada cerrada.</p></div>
                </div>

                <div class="so-jornada-barra">
                    <strong>Jornada:</strong> ${jornada.id}
                    <span>Cierre: ${jornada.cierre ? new Date(jornada.cierre).toLocaleString("es-MX") : "—"}</span>
                </div>

                <div class="so-metricas">
                    <div><span>🧾</span><small>Ventas</small><strong>${r.ventas || 0}</strong></div>
                    <div><span>💰</span><small>Total vendido</small><strong>${dinero(r.totalVendido)}</strong></div>
                    <div><span>📒</span><small>Ventas a crédito</small><strong>${dinero(r.pendiente)}</strong></div>
                    <div><span>💵</span><small>Abonos CxC</small><strong>${dinero(r.abonosCxC)}</strong></div>
                    <div><span>🔴</span><small>Saldo pendiente al cierre</small><strong>${dinero(r.saldoPendiente)}</strong></div>
                    <div><span>🟢</span><small>Saldo a favor al cierre</small><strong>${dinero(r.saldoFavor)}</strong></div>
                </div>

                <div class="so-grid-2">
                    <div class="so-panel">
                        <h2>💳 Ventas por método de pago</h2>
                        <div class="so-linea"><span>💵 Efectivo</span><strong>${dinero(r.efectivo)}</strong></div>
                        <div class="so-linea"><span>💳 Tarjeta</span><strong>${dinero(r.tarjeta)}</strong></div>
                        <div class="so-linea"><span>🔄 Transferencia</span><strong>${dinero(r.transferencia)}</strong></div>
                        <div class="so-linea destacado"><span>🕐 Crédito generado</span><strong>${dinero(r.pendiente)}</strong></div>
                    </div>
                    <div class="so-panel">
                        <h2>💵 Cobranza CxC</h2>
                        <div class="so-linea"><span>💵 Efectivo</span><strong>${dinero(r.abonosEfectivo)}</strong></div>
                        <div class="so-linea"><span>💳 Tarjeta</span><strong>${dinero(r.abonosTarjeta)}</strong></div>
                        <div class="so-linea"><span>🔄 Transferencia</span><strong>${dinero(r.abonosTransferencia)}</strong></div>
                        <div class="so-linea destacado"><span>Total cobrado</span><strong>${dinero(r.abonosCxC)}</strong></div>
                    </div>
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
                                        <td>${v.fecha ? new Date(v.fecha).toLocaleTimeString("es-MX", {hour: "2-digit", minute: "2-digit"}) : "—"}</td>
                                        <td>${v.cliente || "Público general"}</td>
                                        <td>${v.metodo_pago || "Efectivo"}</td>
                                        <td>${v.estado_pago || "Pagado"}</td>
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
                                        <td>${m.venta_id ? `#${m.venta_id}` : "—"}</td>
                                        <td>${m.metodo_pago || "—"}</td>
                                        <td>${dinero(m.importe)}</td>
                                    </tr>
                                `).join("") : `<tr><td colspan="5">No hubo movimientos CxC.</td></tr>`}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="so-panel">
                    <h2>📒 Estado de CxC al cierre</h2>
                    <p class="so-panel-ayuda">Instantánea guardada al momento de cerrar la jornada.</p>
                    <div class="so-tabla-wrap">
                        <table class="so-tabla">
                            <thead><tr><th>Cliente</th><th>Venta</th><th>Total</th><th>Abonado</th><th>Saldo</th><th>A favor</th><th>Estado</th></tr></thead>
                            <tbody>
                                ${estadoCxC.length ? estadoCxC.map(c => `
                                    <tr>
                                        <td>${c.cliente}</td>
                                        <td>${c.ventaId ? `#${c.ventaId}` : "—"}</td>
                                        <td>${dinero(c.total)}</td>
                                        <td>${dinero(c.abonado)}</td>
                                        <td>${dinero(c.saldo)}</td>
                                        <td>${dinero(c.saldoFavor)}</td>
                                        <td>${c.estado || "Pendiente"}</td>
                                    </tr>
                                `).join("") : `<tr><td colspan="7">No había cuentas CxC al cierre.</td></tr>`}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="so-panel">
                    <h2>👥 Clientes con movimiento</h2>
                    <div class="so-tabla-wrap">
                        <table class="so-tabla">
                            <thead><tr><th>Cliente</th><th>Compras</th><th>Total comprado</th><th>Última compra</th></tr></thead>
                            <tbody>
                                ${clientes.length ? clientes.map(c => `
                                    <tr>
                                        <td>${c.nombre || "—"}</td>
                                        <td>${Number(c.compras || 0)}</td>
                                        <td>${dinero(c.totalCompras)}</td>
                                        <td>${c.ultimaCompra ? new Date(c.ultimaCompra).toLocaleString("es-MX") : "—"}</td>
                                    </tr>
                                `).join("") : `<tr><td colspan="4">No hubo clientes registrados.</td></tr>`}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        `;

        document.getElementById("btnVolverReportes")?.addEventListener("click", renderizarReportes);
    } catch (error) {
        console.error("❌ Error cargando detalle del reporte:", error);
        contentArea.innerHTML = `
            <section class="so-admin-modulo">
                <button id="btnVolverReportes" class="so-btn-secundario">← Volver a reportes</button>
                <div class="so-vacio">❌ No se pudo cargar el detalle.<br><small>${error.message || ""}</small></div>
            </section>
        `;
        document.getElementById("btnVolverReportes")?.addEventListener("click", renderizarReportes);
    }
}

export async function iniciarCortesReportes() {
    const btnCortes = document.getElementById("btnCortes");
    const btnReportes = document.getElementById("btnReportes");

    btnCortes?.addEventListener("click", renderizarCortes);
    btnReportes?.addEventListener("click", renderizarReportes);
}
