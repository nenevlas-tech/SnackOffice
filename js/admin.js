//=====================================
// SNACK OFFICE
// MÓDULO: ADMINISTRADOR / COMISIONES
//=====================================

import { supabase } from "./supabase.js";

const PORCENTAJE_COMISION = 0.25;
const VENDEDOR_PRINCIPAL = "Vendedor";

export function iniciarAdministrador() {
    const btnComisiones = document.getElementById("btnComisiones");
    if (btnComisiones) btnComisiones.addEventListener("click", mostrarComisiones);
}

function dinero(valor) {
    return `$${Number(valor || 0).toFixed(2)}`;
}

function normalizarTexto(valor) {
    return String(valor ?? "").trim().toLowerCase();
}

function obtenerFechaVenta(venta) {
    const fecha = new Date(venta?.fecha);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function fechaLocalISO(fecha) {
    if (!fecha) return "";
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}

function productosDeVenta(venta) {
    if (Array.isArray(venta?.productos)) return venta.productos;
    if (typeof venta?.productos === "string") {
        try {
            const parsed = JSON.parse(venta.productos);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
}

async function obtenerProductos() {
    const { data, error } = await supabase
        .from("productos")
        .select("id,nombre,costo,precio");
    if (error) throw error;
    return data || [];
}

async function obtenerVentas() {
    const { data, error } = await supabase
        .from("ventas")
        .select("id,folio,fecha,cliente,metodo_pago,total,estado_pago,productos,jornada_id")
        .order("fecha", { ascending: false });
    if (error) throw error;
    return data || [];
}

function crearMapaProductos(productos) {
    const mapa = new Map();
    productos.forEach(producto => {
        const nombre = normalizarTexto(producto.nombre);
        if (nombre) mapa.set(nombre, producto);
    });
    return mapa;
}

function calcularVenta(venta, mapaProductos) {
    let utilidad = 0;
    let comision = 0;

    productosDeVenta(venta).forEach(productoVenta => {
        const productoInventario = mapaProductos.get(normalizarTexto(productoVenta.nombre));
        if (!productoInventario) return;

        const precio = Number(productoVenta.precio) || 0;
        const costo = Number(productoInventario.costo);
        const cantidad = Number(productoVenta.cantidad) || 0;

        if (!Number.isFinite(costo) || cantidad <= 0) return;

        const utilidadProducto = Math.max(0, precio - costo) * cantidad;
        utilidad += utilidadProducto;
        comision += utilidadProducto * PORCENTAJE_COMISION;
    });

    return { utilidad, comision };
}

async function mostrarComisiones() {
    const contentArea = document.getElementById("contentArea");
    if (!contentArea) return;

    contentArea.innerHTML = `
        <div class="card-inventario">
            <div class="titulo-inventario">
                <span>💰</span>
                <h1>Comisiones</h1>
            </div>
            <p class="subtitulo">Consulta las ventas y la comisión generada.</p>
            <div class="regla-comision-inventario">
                💼 <strong>Regla de comisión:</strong>
                ${PORCENTAJE_COMISION * 100}% de la utilidad unitaria.
                <br>
                👤 <strong>Vendedor:</strong> ${VENDEDOR_PRINCIPAL}
            </div>
            <div class="admin-resumen-comisiones">
                <div class="admin-metrica"><span>🧾</span><strong id="adminTotalVentas">0</strong><small>Ventas registradas</small></div>
                <div class="admin-metrica"><span>💵</span><strong id="adminTotalVendido">$0.00</strong><small>Total vendido</small></div>
                <div class="admin-metrica"><span>📈</span><strong id="adminTotalUtilidad">$0.00</strong><small>Utilidad estimada</small></div>
                <div class="admin-metrica"><span>💰</span><strong id="adminTotalComision">$0.00</strong><small>Comisión ${VENDEDOR_PRINCIPAL}</small></div>
            </div>
            <div class="admin-filtros-comisiones">
                <label>📅 Fecha <input type="date" id="filtroFechaComision"></label>
                <button id="btnLimpiarFiltroComision">🔄 Ver todas</button>
            </div>
            <div id="estadoComisionesAdmin" class="admin-vacio">⏳ Cargando información...</div>
            <div id="tablaComisionesAdmin"></div>
        </div>
    `;

    configurarEventosAdministrador();
    await renderizarComisiones();
}

function configurarEventosAdministrador() {
    const filtro = document.getElementById("filtroFechaComision");
    const btnLimpiar = document.getElementById("btnLimpiarFiltroComision");
    if (filtro) filtro.addEventListener("change", renderizarComisiones);
    if (btnLimpiar) btnLimpiar.addEventListener("click", () => {
        if (filtro) filtro.value = "";
        renderizarComisiones();
    });
}

async function renderizarComisiones() {
    const contenedor = document.getElementById("tablaComisionesAdmin");
    const estado = document.getElementById("estadoComisionesAdmin");
    if (!contenedor) return;

    if (estado) {
        estado.style.display = "block";
        estado.textContent = "⏳ Cargando ventas y productos...";
    }

    try {
        const [productos, ventas] = await Promise.all([obtenerProductos(), obtenerVentas()]);
        const mapaProductos = crearMapaProductos(productos);
        const filtro = document.getElementById("filtroFechaComision");
        const fechaFiltro = filtro ? filtro.value : "";

        const ventasFiltradas = ventas.filter(venta => {
            if (!fechaFiltro) return true;
            const fecha = obtenerFechaVenta(venta);
            return fecha && fechaLocalISO(fecha) === fechaFiltro;
        });

        let totalVendido = 0;
        let totalUtilidad = 0;
        let totalComision = 0;

        const calculos = ventasFiltradas.map(venta => {
            const calculo = calcularVenta(venta, mapaProductos);
            totalVendido += Number(venta.total) || 0;
            totalUtilidad += calculo.utilidad;
            totalComision += calculo.comision;
            return { venta, ...calculo };
        });

        const totalVentas = document.getElementById("adminTotalVentas");
        const totalVendidoElemento = document.getElementById("adminTotalVendido");
        const totalUtilidadElemento = document.getElementById("adminTotalUtilidad");
        const totalComisionElemento = document.getElementById("adminTotalComision");

        if (totalVentas) totalVentas.textContent = ventasFiltradas.length;
        if (totalVendidoElemento) totalVendidoElemento.textContent = dinero(totalVendido);
        if (totalUtilidadElemento) totalUtilidadElemento.textContent = dinero(totalUtilidad);
        if (totalComisionElemento) totalComisionElemento.textContent = dinero(totalComision);
        if (estado) estado.style.display = "none";

        if (ventasFiltradas.length === 0) {
            contenedor.innerHTML = `<div class="admin-vacio">📭 No hay ventas para el filtro seleccionado.</div>`;
            return;
        }

        let html = `
            <div class="tabla-admin-contenedor">
                <table class="tabla-comisiones-admin">
                    <thead><tr>
                        <th>Folio</th><th>Fecha</th><th>Cliente</th><th>Pago</th>
                        <th>Total</th><th>Utilidad</th><th>Comisión</th>
                    </tr></thead><tbody>
        `;

        calculos.forEach(({ venta, utilidad, comision }) => {
            const fecha = obtenerFechaVenta(venta);
            const fechaTexto = fecha ? fecha.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }) : "Sin fecha";
            const folio = venta.folio !== null && venta.folio !== undefined ? venta.folio : venta.id;

            html += `
                <tr>
                    <td><strong>#${folio}</strong></td>
                    <td>${fechaTexto}</td>
                    <td>${venta.cliente || "Cliente general"}</td>
                    <td>${venta.metodo_pago || "No registrado"}</td>
                    <td><strong>${dinero(venta.total)}</strong></td>
                    <td>${dinero(utilidad)}</td>
                    <td class="comision-destacada">${dinero(comision)}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
            <div class="nota-comisiones-admin">
                ℹ️ La comisión se calcula automáticamente con base en el costo unitario y el precio registrado para cada producto.
            </div>
        `;

        contenedor.innerHTML = html;
    } catch (error) {
        console.error("❌ No se pudieron cargar las comisiones:", error);
        if (estado) estado.style.display = "none";
        contenedor.innerHTML = `
            <div class="admin-vacio">
                ❌ No se pudieron cargar las comisiones desde Supabase.<br><br>
                Revisa la consola del navegador para más detalles.
            </div>
        `;
    }
}
