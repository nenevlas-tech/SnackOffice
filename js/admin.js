//=====================================
// SNACK OFFICE
// MÓDULO: ADMINISTRADOR / COMISIONES
//=====================================

// Regla fija tomada del catálogo maestro:
// Comisión = 25% de la utilidad unitaria.
const PORCENTAJE_COMISION = 0.25;
const VENDEDOR_PRINCIPAL = "Daniela";

//=====================================
// INICIAR MÓDULO
//=====================================

export function iniciarAdministrador() {

    const btnComisiones =
        document.getElementById("btnComisiones");

    if (btnComisiones) {
        btnComisiones.addEventListener(
            "click",
            mostrarComisiones
        );
    }

}

//=====================================
// DATOS
//=====================================

function obtenerProductos() {

    return JSON.parse(
        localStorage.getItem("productos")
    ) || [];

}

function obtenerVentas() {

    return JSON.parse(
        localStorage.getItem("historialVentas")
    ) || [];

}

function dinero(valor) {

    return `$${Number(valor || 0).toFixed(2)}`;

}

// Busca el producto actual para obtener su costo.

function obtenerProductoInventario(nombre) {

    const productos =
        obtenerProductos();

    return productos.find(
        producto =>
            String(producto.nombre)
                .trim()
                .toLowerCase() ===
            String(nombre)
                .trim()
                .toLowerCase()
    ) || null;

}

//=====================================
// CALCULAR COMISIÓN
//=====================================

function calcularComisionProducto(productoVenta) {

    const productoInventario =
        obtenerProductoInventario(
            productoVenta.nombre
        );

    if (!productoInventario) {
        return 0;
    }

    const precio =
        Number(productoVenta.precio) || 0;

    const costo =
        Number(productoInventario.costo);

    if (!Number.isFinite(costo)) {
        return 0;
    }

    const utilidadUnitaria =
        precio - costo;

    if (utilidadUnitaria <= 0) {
        return 0;
    }

    return utilidadUnitaria *
        PORCENTAJE_COMISION *
        (Number(productoVenta.cantidad) || 0);

}

//=====================================
// MOSTRAR COMISIONES
//=====================================

function mostrarComisiones() {

    const contentArea =
        document.getElementById("contentArea");

    if (!contentArea) {
        return;
    }

    contentArea.innerHTML = `

        <div class="card-inventario">

            <div class="titulo-inventario">
                <span>💰</span>
                <h1>Comisiones</h1>
            </div>

            <p class="subtitulo">
                Consulta las ventas y la comisión generada por el vendedor.
            </p>

            <div class="regla-comision-inventario">

                💼 <strong>Regla de comisión:</strong>
                ${PORCENTAJE_COMISION * 100}% de la utilidad unitaria.

                <br>

                👤 <strong>Vendedor:</strong>
                ${VENDEDOR_PRINCIPAL}

            </div>

            <div class="admin-resumen-comisiones">

                <div class="admin-metrica">
                    <span>🧾</span>
                    <strong id="adminTotalVentas">0</strong>
                    <small>Ventas registradas</small>
                </div>

                <div class="admin-metrica">
                    <span>💵</span>
                    <strong id="adminTotalVendido">$0.00</strong>
                    <small>Total vendido</small>
                </div>

                <div class="admin-metrica">
                    <span>📈</span>
                    <strong id="adminTotalUtilidad">$0.00</strong>
                    <small>Utilidad estimada</small>
                </div>

                <div class="admin-metrica">
                    <span>💰</span>
                    <strong id="adminTotalComision">$0.00</strong>
                    <small>Comisión ${VENDEDOR_PRINCIPAL}</small>
                </div>

            </div>

            <div class="admin-filtros-comisiones">

                <label>
                    📅 Fecha

                    <input
                        type="date"
                        id="filtroFechaComision"
                    >

                </label>

                <button id="btnLimpiarFiltroComision">
                    🔄 Ver todas
                </button>

            </div>

            <div id="tablaComisionesAdmin"></div>

        </div>

    `;

    configurarEventosAdministrador();

    renderizarComisiones();

}

//=====================================
// EVENTOS
//=====================================

function configurarEventosAdministrador() {

    const filtro =
        document.getElementById(
            "filtroFechaComision"
        );

    const btnLimpiar =
        document.getElementById(
            "btnLimpiarFiltroComision"
        );

    if (filtro) {

        filtro.addEventListener(
            "change",
            renderizarComisiones
        );

    }

    if (btnLimpiar) {

        btnLimpiar.addEventListener(
            "click",
            function () {

                if (filtro) {
                    filtro.value = "";
                }

                renderizarComisiones();

            }
        );

    }

}

//=====================================
// FECHA DE UNA VENTA
//=====================================

function obtenerFechaVenta(venta) {

    if (venta.id) {

        const fechaId =
            new Date(
                Number(venta.id)
            );

        if (!Number.isNaN(
            fechaId.getTime()
        )) {

            return fechaId;

        }

    }

    const fecha =
        new Date(venta.fecha);

    return Number.isNaN(
        fecha.getTime()
    )
        ? null
        : fecha;

}

//=====================================
// RENDERIZAR
//=====================================

function renderizarComisiones() {

    const contenedor =
        document.getElementById(
            "tablaComisionesAdmin"
        );

    if (!contenedor) {
        return;
    }

    const filtro =
        document.getElementById(
            "filtroFechaComision"
        );

    const fechaFiltro =
        filtro ? filtro.value : "";

    let ventas =
        obtenerVentas();

    //=====================================
    // FILTRAR POR FECHA
    //=====================================

    if (fechaFiltro) {

        ventas = ventas.filter(
            function (venta) {

                const fecha =
                    obtenerFechaVenta(venta);

                if (!fecha) {
                    return false;
                }

                const anio =
                    fecha.getFullYear();

                const mes =
                    String(
                        fecha.getMonth() + 1
                    ).padStart(2, "0");

                const dia =
                    String(
                        fecha.getDate()
                    ).padStart(2, "0");

                return (
                    `${anio}-${mes}-${dia}` ===
                    fechaFiltro
                );

            }
        );

    }

    //=====================================
    // TOTALES
    //=====================================

    let totalVendido = 0;
    let totalUtilidad = 0;
    let totalComision = 0;

    ventas.forEach(
        function (venta) {

            totalVendido +=
                Number(venta.total) || 0;

            (venta.productos || []).forEach(
                function (productoVenta) {

                    const productoInventario =
                        obtenerProductoInventario(
                            productoVenta.nombre
                        );

                    if (!productoInventario) {
                        return;
                    }

                    const precio =
                        Number(
                            productoVenta.precio
                        ) || 0;

                    const costo =
                        Number(
                            productoInventario.costo
                        );

                    const cantidad =
                        Number(
                            productoVenta.cantidad
                        ) || 0;

                    if (!Number.isFinite(costo)) {
                        return;
                    }

                    const utilidadUnitaria =
                        precio - costo;

                    const utilidad =
                        Math.max(
                            0,
                            utilidadUnitaria
                        ) * cantidad;

                    totalUtilidad +=
                        utilidad;

                    totalComision +=
                        utilidad *
                        PORCENTAJE_COMISION;

                }
            );

        }
    );

    //=====================================
    // ACTUALIZAR RESUMEN
    //=====================================

    document.getElementById(
        "adminTotalVentas"
    ).textContent =
        ventas.length;

    document.getElementById(
        "adminTotalVendido"
    ).textContent =
        dinero(totalVendido);

    document.getElementById(
        "adminTotalUtilidad"
    ).textContent =
        dinero(totalUtilidad);

    document.getElementById(
        "adminTotalComision"
    ).textContent =
        dinero(totalComision);

    //=====================================
    // SIN VENTAS
    //=====================================

    if (ventas.length === 0) {

        contenedor.innerHTML = `

            <div class="admin-vacio">
                📭 No hay ventas para el filtro seleccionado.
            </div>

        `;

        return;

    }

    //=====================================
    // TABLA
    //=====================================

    let html = `

        <div class="tabla-admin-contenedor">

            <table class="tabla-comisiones-admin">

                <thead>

                    <tr>

                        <th>Venta</th>
                        <th>Fecha</th>
                        <th>Cliente</th>
                        <th>Pago</th>
                        <th>Total</th>
                        <th>Utilidad</th>
                        <th>Comisión</th>

                    </tr>

                </thead>

                <tbody>

    `;

    ventas
        .slice()
        .reverse()
        .forEach(
            function (venta, indice) {

                let utilidadVenta = 0;
                let comisionVenta = 0;

                (venta.productos || []).forEach(
                    function (productoVenta) {

                        const productoInventario =
                            obtenerProductoInventario(
                                productoVenta.nombre
                            );

                        if (!productoInventario) {
                            return;
                        }

                        const precio =
                            Number(
                                productoVenta.precio
                            ) || 0;

                        const costo =
                            Number(
                                productoInventario.costo
                            );

                        const cantidad =
                            Number(
                                productoVenta.cantidad
                            ) || 0;

                        if (!Number.isFinite(costo)) {
                            return;
                        }

                        const utilidad =
                            Math.max(
                                0,
                                precio - costo
                            ) * cantidad;

                        utilidadVenta +=
                            utilidad;

                        comisionVenta +=
                            utilidad *
                            PORCENTAJE_COMISION;

                    }
                );

                const numeroVenta =
                    ventas.length - indice;

                html += `

                    <tr>

                        <td>
                            <strong>
                                #${numeroVenta}
                            </strong>
                        </td>

                        <td>
                            ${venta.fecha || "Sin fecha"}
                        </td>

                        <td>
                            ${venta.cliente || "Cliente general"}
                        </td>

                        <td>
                            ${venta.metodoPago || "No registrado"}
                        </td>

                        <td>
                            <strong>
                                ${dinero(venta.total)}
                            </strong>
                        </td>

                        <td>
                            ${dinero(utilidadVenta)}
                        </td>

                        <td class="comision-destacada">
                            ${dinero(comisionVenta)}
                        </td>

                    </tr>

                `;

            }
        );

    html += `

                </tbody>

            </table>

        </div>

        <div class="nota-comisiones-admin">

            ℹ️ La comisión se calcula automáticamente con base en
            el costo unitario y el precio registrado para cada producto.

        </div>

    `;

    contenedor.innerHTML = html;

}
