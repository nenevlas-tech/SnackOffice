// =====================================
// SNACK OFFICE - MÓDULO DE VENTAS
// =====================================

import { registrarVentaEnJornada, registrarMovimientoCxC } from "./cortes-reportes.js";

// -------------------------------------
// ESTADO DEL MÓDULO
// -------------------------------------
let carrito = [];
let categoriaActual = "";
let metodoPago = "Efectivo";
let clienteVenta = "";
let usarSaldoFavorVenta = false;
let clienteFavorSeleccionado = "";

// -------------------------------------
// INICIALIZACIÓN
// -------------------------------------
export function iniciarVentas() {
    console.log("🛒 Módulo de ventas iniciado");

    migrarCuentasPendientes();
    sincronizarClientes();
    configurarNavegacionVentas();
    configurarNuevaVenta();
    configurarMetodosPago();
    actualizarContadorCarrito();
}

// -------------------------------------
// NAVEGACIÓN
// -------------------------------------
function configurarNavegacionVentas() {
    const btnNuevaVenta = document.getElementById("btnNuevaVenta");
    const btnHistorialVentas = document.getElementById("btnHistorialVentas");
    const btnPendientesVentas = document.getElementById("btnPendientesVentas");
    const btnClientesVentas = document.getElementById("btnClientesVentas");
    const btnCancelarVenta = document.getElementById("btnCancelarVenta");

    if (btnNuevaVenta) {
        btnNuevaVenta.addEventListener("click", iniciarNuevaVenta);
    }

    if (btnHistorialVentas) {
        btnHistorialVentas.addEventListener("click", () => {
            mostrarPantallaVentas("historialVentasScreen");
            cargarHistorialVentas();
        });
    }

    if (btnPendientesVentas) {
        btnPendientesVentas.addEventListener("click", () => {
            mostrarPantallaVentas("pendientesVentasScreen");
            cargarPendientesVentas();
        });
    }

    if (btnClientesVentas) {
        btnClientesVentas.addEventListener("click", () => {
            mostrarPantallaVentas("clientesVentasScreen");
            cargarClientesVentas();
        });
    }

    if (btnCancelarVenta) {
        btnCancelarVenta.addEventListener("click", cancelarVenta);
    }
}

function iniciarNuevaVenta() {
    carrito = [];
    categoriaActual = "";
    clienteVenta = "";
    metodoPago = "Efectivo";
    usarSaldoFavorVenta = false;
    clienteFavorSeleccionado = "";

    const cliente = document.getElementById("clienteVenta");
    if (cliente) {
        cliente.value = "";
    }

    actualizarAvisoCliente();
    actualizarResumenPagoVenta();
    establecerMetodoPagoActivo("Efectivo");
    renderizarCarrito();
    mostrarPantallaVentas("nuevaVentaScreen");
    cargarProductosVenta();
}

function configurarNuevaVenta() {
    const btnRegistrarVenta = document.getElementById("btnRegistrarVenta");
    const buscador = document.getElementById("buscarProductoVenta");
    const categorias = document.querySelectorAll(".categoria-venta");
    const btnVolver = document.getElementById("btnVolverCategorias");

    if (btnRegistrarVenta) {
        btnRegistrarVenta.addEventListener("click", registrarVenta);
    }

    if (buscador) {
        buscador.addEventListener("input", () => {
            cargarProductosVenta(buscador.value);
        });
    }

    const campoCliente = document.getElementById("clienteVenta");

    if (campoCliente) {
        campoCliente.addEventListener("input", actualizarAvisoCliente);
        campoCliente.addEventListener("blur", actualizarAvisoCliente);
    }

    const btnUsarSaldoFavor = document.getElementById("btnUsarSaldoFavorVenta");
    if (btnUsarSaldoFavor) {
        btnUsarSaldoFavor.addEventListener("click", () => {
            const nombre = campoCliente?.value.trim() || "";
            const resumen = obtenerResumenCliente(nombre);
            if (resumen.favor <= 0) {
                usarSaldoFavorVenta = false;
                actualizarAvisoCliente();
                return;
            }
            usarSaldoFavorVenta = !usarSaldoFavorVenta;
            clienteFavorSeleccionado = normalizarTexto(nombre);
            actualizarAvisoCliente();
            actualizarResumenPagoVenta();
        });
    }

    const buscarCliente = document.getElementById("buscarClienteVentas");
    if (buscarCliente) {
        buscarCliente.addEventListener("input", cargarClientesVentas);
    }

    document.getElementById("btnRefrescarClientes")?.addEventListener("click", cargarClientesVentas);

    categorias.forEach(boton => {
        boton.addEventListener("click", () => {
            categoriaActual = boton.dataset.categoria || "";

            if (buscador) {
                buscador.value = "";
            }

            cargarProductosVenta();
        });
    });

    if (btnVolver) {
        btnVolver.addEventListener("click", () => {
            categoriaActual = "";

            if (buscador) {
                buscador.value = "";
            }

            cargarProductosVenta();
        });
    }
}

// -------------------------------------
// FORMAS DE PAGO
// -------------------------------------
function configurarMetodosPago() {
    const botonesPago = document.querySelectorAll(".btn-pago");

    botonesPago.forEach(boton => {
        boton.addEventListener("click", () => {
            establecerMetodoPagoActivo(boton.dataset.pago || "Efectivo");
        });
    });
}

function establecerMetodoPagoActivo(metodo) {
    metodoPago = metodo;

    const botonesPago = document.querySelectorAll(".btn-pago");

    botonesPago.forEach(boton => {
        boton.classList.toggle("activo", boton.dataset.pago === metodo);
    });
}

// -------------------------------------
// PANTALLAS
// -------------------------------------
function mostrarPantallaVentas(pantalla) {
    const pantallas = [
        "ventasInicio",
        "nuevaVentaScreen",
        "historialVentasScreen",
        "pendientesVentasScreen",
        "clientesVentasScreen"
    ];

    pantallas.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.style.display = "none";
        }
    });

    const pantallaActiva = document.getElementById(pantalla);
    if (pantallaActiva) {
        pantallaActiva.style.display = "block";
    }
}

// -------------------------------------
// INVENTARIO Y PRODUCTOS
// -------------------------------------
function obtenerProductos() {
    return JSON.parse(localStorage.getItem("productos")) || [];
}

function cargarProductosVenta(textoBusqueda = "") {
    const contenedor = document.getElementById("listaProductosVenta");

    if (!contenedor) {
        console.warn("⚠️ No se encontró listaProductosVenta.");
        return;
    }

    const productos = obtenerProductos();
    const texto = textoBusqueda.trim().toLowerCase();

    let productosFiltrados = productos.filter(producto => {
        if (!categoriaActual) {
            return false;
        }

        return normalizarTexto(producto.categoria) === normalizarTexto(categoriaActual);
    });

    if (texto !== "") {
        productosFiltrados = productosFiltrados.filter(producto =>
            String(producto.nombre || "").toLowerCase().includes(texto)
        );
    }

    contenedor.innerHTML = "";

    if (!categoriaActual) {
        contenedor.innerHTML = `
            <div class="mensaje-ventas">
                <span>🛍️</span>
                <p>Selecciona una categoría para ver los productos.</p>
            </div>
        `;

        actualizarTituloCategoria();
        return;
    }

    if (productosFiltrados.length === 0) {
        contenedor.innerHTML = `
            <div class="mensaje-ventas">
                <span>🔎</span>
                <p>No se encontraron productos.</p>
            </div>
        `;

        actualizarTituloCategoria();
        return;
    }

    productosFiltrados.forEach(producto => {
        const tarjeta = crearTarjetaProducto(producto);
        contenedor.appendChild(tarjeta);
    });

    actualizarTituloCategoria();
}

function crearTarjetaProducto(producto) {
    const tarjeta = document.createElement("div");
    tarjeta.className = "producto-venta";

    const imagen = producto.imagen
        ? `<img src="${producto.imagen}" alt="${producto.nombre}">`
        : `<span class="producto-icono">🛍️</span>`;

    tarjeta.innerHTML = `
        <div class="producto-info">
            <div class="producto-imagen">
                ${imagen}
            </div>

            <h3>${producto.nombre}</h3>

            <p class="producto-precio">
                $${Number(producto.precio).toFixed(2)}
            </p>

            <p class="producto-stock">
                Stock: ${producto.stock}
            </p>
        </div>

        <button type="button" class="btn-agregar-producto">
            ➕ Agregar
        </button>
    `;

    tarjeta.addEventListener("click", () => {
        agregarAlCarrito(producto);
    });

    return tarjeta;
}

function actualizarTituloCategoria() {
    const titulo = document.getElementById("tituloCategoria");

    if (!titulo) {
        return;
    }

    titulo.textContent = categoriaActual || "Productos disponibles";
}

function normalizarTexto(valor) {
    return String(valor || "").trim().toLowerCase();
}

// -------------------------------------
// CARRITO
// -------------------------------------
function agregarAlCarrito(producto) {
    const productoEnCarrito = carrito.find(
        item => item.nombre === producto.nombre
    );

    if (productoEnCarrito) {
        if (productoEnCarrito.cantidad >= Number(producto.stock)) {
            alert("⚠️ No hay más unidades disponibles de este producto.");
            return;
        }

        productoEnCarrito.cantidad++;
    } else {
        carrito.push({
            nombre: producto.nombre,
            precio: Number(producto.precio),
            stock: Number(producto.stock),
            cantidad: 1
        });
    }

    renderizarCarrito();
}

function actualizarContadorCarrito() {
    const contador = document.getElementById("contadorCarrito");

    if (!contador) {
        return;
    }

    const cantidad = carrito.reduce(
        (total, producto) => total + producto.cantidad,
        0
    );

    contador.textContent = cantidad;
}

function renderizarCarrito() {
    const contenedor = document.getElementById("carritoVenta");

    if (!contenedor) {
        return;
    }

    contenedor.innerHTML = "";

    if (carrito.length === 0) {
        contenedor.innerHTML = `
            <p>No hay productos agregados.</p>
        `;

        actualizarTotal();
        actualizarContadorCarrito();
        return;
    }

    carrito.forEach((producto, indice) => {
        const item = document.createElement("div");
        item.className = "item-carrito";

        const subtotal = producto.precio * producto.cantidad;

        item.innerHTML = `
            <div>
                <strong>${producto.nombre}</strong>

                <p>
                    $${producto.precio.toFixed(2)} × ${producto.cantidad}
                </p>

                <p>
                    Subtotal: $${subtotal.toFixed(2)}
                </p>
            </div>

            <div>
                <button type="button" data-accion="menos">➖</button>
                <button type="button" data-accion="mas">➕</button>
                <button type="button" data-accion="eliminar">🗑️</button>
            </div>
        `;

        item.querySelector('[data-accion="menos"]')
            .addEventListener("click", () => disminuirCantidad(indice));

        item.querySelector('[data-accion="mas"]')
            .addEventListener("click", () => aumentarCantidad(indice));

        item.querySelector('[data-accion="eliminar"]')
            .addEventListener("click", () => eliminarDelCarrito(indice));

        contenedor.appendChild(item);
    });

    actualizarTotal();
    actualizarContadorCarrito();
}

function aumentarCantidad(indice) {
    const producto = carrito[indice];

    if (!producto) {
        return;
    }

    if (producto.cantidad >= producto.stock) {
        alert("⚠️ No hay más stock disponible.");
        return;
    }

    producto.cantidad++;
    renderizarCarrito();
}

function disminuirCantidad(indice) {
    const producto = carrito[indice];

    if (!producto) {
        return;
    }

    if (producto.cantidad > 1) {
        producto.cantidad--;
    } else {
        carrito.splice(indice, 1);
    }

    renderizarCarrito();
}

function eliminarDelCarrito(indice) {
    carrito.splice(indice, 1);
    renderizarCarrito();
}

function cancelarVenta() {
    const confirmar = confirm("¿Deseas cancelar la venta actual?");

    if (!confirmar) {
        return;
    }

    carrito = [];
    clienteVenta = "";
    categoriaActual = "";
    metodoPago = "Efectivo";
    usarSaldoFavorVenta = false;
    clienteFavorSeleccionado = "";

    renderizarCarrito();
    mostrarPantallaVentas("ventasInicio");
}

function obtenerTotalVenta() {
    return carrito.reduce(
        (suma, producto) => suma + Number(producto.precio) * Number(producto.cantidad),
        0
    );
}

function actualizarTotal() {
    const elemento = document.getElementById("totalVenta");
    if (elemento) elemento.textContent = `$${obtenerTotalVenta().toFixed(2)}`;
    actualizarResumenPagoVenta();
}

function actualizarResumenPagoVenta() {
    const caja = document.getElementById("resumenPagoVenta");
    const subtotal = document.getElementById("subtotalVentaResumen");
    const aplicado = document.getElementById("saldoFavorAplicadoVenta");
    const restante = document.getElementById("restanteVentaResumen");
    if (!caja || !subtotal || !aplicado || !restante) return;

    const total = obtenerTotalVenta();
    const nombre = document.getElementById("clienteVenta")?.value.trim() || "";
    const resumen = obtenerResumenCliente(nombre);
    const usar = usarSaldoFavorVenta && clienteFavorSeleccionado === normalizarTexto(nombre);
    const montoAplicado = usar ? Math.min(resumen.favor, total) : 0;
    const montoRestante = Math.max(0, total - montoAplicado);

    if (total <= 0 || (montoAplicado <= 0 && resumen.favor <= 0)) {
        caja.style.display = "none";
        return;
    }

    caja.style.display = "grid";
    subtotal.textContent = `$${total.toFixed(2)}`;
    aplicado.textContent = `$${montoAplicado.toFixed(2)}`;
    restante.textContent = `$${montoRestante.toFixed(2)}`;
}

// -------------------------------------
// REGISTRO DE VENTA
// -------------------------------------
function registrarVenta() {
    if (carrito.length === 0) {
        alert("⚠️ No hay productos en el carrito.");
        return;
    }

    const campoCliente = document.getElementById("clienteVenta");
    const cliente = campoCliente ? campoCliente.value.trim() : "";
    const resumenCliente = obtenerResumenCliente(cliente);
    const saldoAplicable = usarSaldoFavorVenta && cliente ? Math.min(resumenCliente.favor, obtenerTotalVenta()) : 0;
    const restante = Math.max(0, obtenerTotalVenta() - saldoAplicable);

    if (metodoPago === "Pendiente" && cliente === "") {
        alert("⚠️ Para una venta pendiente debes ingresar el nombre del cliente.");
        campoCliente?.focus();
        return;
    }

    if (restante > 0 && metodoPago === "Pendiente" && cliente === "") {
        alert("⚠️ Ingresa el cliente para registrar el saldo pendiente.");
        campoCliente?.focus();
        return;
    }

    const confirmar = confirm(
        `¿Deseas registrar esta venta?\n\nTotal: $${obtenerTotalVenta().toFixed(2)}\nSaldo a favor aplicado: $${saldoAplicable.toFixed(2)}\nRestante: $${restante.toFixed(2)}`
    );

    if (!confirmar) return;

    const productos = obtenerProductos();
    if (!verificarStockVenta(productos)) return;

    descontarStockVenta(productos);
    localStorage.setItem("productos", JSON.stringify(productos));

    if (saldoAplicable > 0) {
        consumirSaldoFavorCliente(cliente, saldoAplicable);
    }

    const ventaRegistrada = guardarVentaHistorial({ saldoFavorAplicado: saldoAplicable, restante });

    if (ventaRegistrada && restante > 0 && metodoPago === "Pendiente") {
        guardarCuentaPendiente(ventaRegistrada);
    }

    registrarCliente(cliente, ventaRegistrada);

    if (document.getElementById("clientesVentasScreen")?.style.display !== "none") {
        cargarClientesVentas();
    }

    carrito = [];
    usarSaldoFavorVenta = false;
    clienteFavorSeleccionado = "";
    renderizarCarrito();
    actualizarAvisoCliente();
    actualizarResumenPagoVenta();
}

function verificarStockVenta(productos) {
    for (const productoCarrito of carrito) {
        const productoInventario = productos.find(
            producto => producto.nombre === productoCarrito.nombre
        );

        if (!productoInventario) {
            alert(
                `⚠️ No se encontró el producto "${productoCarrito.nombre}" en el inventario.`
            );
            return false;
        }

        if (Number(productoInventario.stock) < productoCarrito.cantidad) {
            alert(
                `⚠️ No hay suficiente stock de "${productoCarrito.nombre}".`
            );
            return false;
        }
    }

    return true;
}

function descontarStockVenta(productos) {
    for (const productoCarrito of carrito) {
        const productoInventario = productos.find(
            producto => producto.nombre === productoCarrito.nombre
        );

        productoInventario.stock =
            Number(productoInventario.stock) - productoCarrito.cantidad;
    }
}

// -------------------------------------
// HISTORIAL
// -------------------------------------
function guardarVentaHistorial(opciones = {}) {
    const historial =
        JSON.parse(localStorage.getItem("historialVentas")) || [];

    const campoCliente = document.getElementById("clienteVenta");
    const cliente = campoCliente ? campoCliente.value.trim() : "";

    const botonPagoActivo = document.querySelector(".btn-pago.activo");
    const pagoRegistrado = botonPagoActivo
        ? botonPagoActivo.dataset.pago
        : metodoPago || "Efectivo";

    const total = carrito.reduce(
        (suma, producto) =>
            suma + Number(producto.precio) * Number(producto.cantidad),
        0
    );

    const saldoFavorAplicado = Number(opciones.saldoFavorAplicado || 0);
    const restante = Number.isFinite(Number(opciones.restante)) ? Number(opciones.restante) : total;
    const esPendiente = pagoRegistrado === "Pendiente" && restante > 0;
    const metodoFinal = restante <= 0 && saldoFavorAplicado > 0 ? "Saldo a favor" : pagoRegistrado;
    const desglosePago = [];

    if (saldoFavorAplicado > 0) desglosePago.push({ metodo: "Saldo a favor", importe: saldoFavorAplicado });
    if (restante > 0) desglosePago.push({ metodo: metodoFinal, importe: restante });

    let venta = {
        id: Date.now(),
        fecha: new Date().toLocaleString("es-MX"),
        cliente: cliente || "Público general",
        metodoPago: metodoFinal,
        desglosePago,
        saldoFavorAplicado,
        totalCobrado: restante > 0 && !esPendiente ? restante : 0,
        productos: carrito.map(producto => ({
            nombre: producto.nombre,
            precio: producto.precio,
            cantidad: producto.cantidad,
            subtotal: Number(producto.precio) * Number(producto.cantidad)
        })),
        total,
        estadoPago: esPendiente ? "Pendiente" : "Pagado",
        abonado: esPendiente ? 0 : restante,
        saldo: esPendiente ? restante : 0,
        saldoFavor: 0
    };

    venta = registrarVentaEnJornada(venta);
    historial.push(venta);
    localStorage.setItem("historialVentas", JSON.stringify(historial));

    if (esPendiente) {
        registrarMovimientoCxC({
            tipo: "VENTA",
            cliente: venta.cliente,
            ventaId: venta.folio || venta.id,
            importe: Number(venta.saldo || venta.total),
            metodoPago: "Pendiente",
            saldoDespues: Number(venta.saldo)
        });
    }

    return venta;
}

function cargarHistorialVentas() {
    const contenedor = document.getElementById("listaHistorialVentas");

    if (!contenedor) {
        return;
    }

    const historial =
        JSON.parse(localStorage.getItem("historialVentas")) || [];

    contenedor.innerHTML = "";

    if (historial.length === 0) {
        contenedor.innerHTML = `
            <p>No hay ventas registradas.</p>
        `;
        return;
    }

    historial
        .slice()
        .reverse()
        .forEach((venta, indice) => {
            const tarjeta = crearTarjetaHistorial(venta, historial.length - indice);
            contenedor.appendChild(tarjeta);
        });
}

function crearTarjetaHistorial(venta, numeroVenta) {
    const tarjeta = document.createElement("div");
    tarjeta.className = "historial-venta";

    const productosHTML = (venta.productos || [])
        .map(producto => `
            <p>
                <strong>${producto.nombre}</strong> —
                ${producto.cantidad} ×
                $${Number(producto.precio).toFixed(2)} =
                $${Number(producto.subtotal).toFixed(2)}
            </p>
        `)
        .join("");

    tarjeta.innerHTML = `
        <div>
            <h3>🧾 Venta #${numeroVenta}</h3>

            <p>📅 ${venta.fecha}</p>

            <p>
                👤 <strong>Cliente:</strong>
                ${venta.cliente || "Público general"}
            </p>

            <p>
                💳 <strong>Forma de pago:</strong>
                ${venta.metodoPago || "Efectivo"}
            </p>

            <hr>

            <div>
                ${productosHTML}
            </div>

            <h3>
                Total: $${Number(venta.total).toFixed(2)}
            </h3>
        </div>
    `;

    return tarjeta;
}

// -------------------------------------
// CUENTAS PENDIENTES
// -------------------------------------
function obtenerCuentasPendientes() {
    return JSON.parse(localStorage.getItem("cuentasPendientes")) || [];
}

function migrarCuentasPendientes() {
    const cuentas = obtenerCuentasPendientes();
    let cambio = false;

    cuentas.forEach(cuenta => {
        if (!Array.isArray(cuenta.movimientos)) {
            cuenta.movimientos = [
                {
                    tipo: "VENTA",
                    fecha: new Date().toISOString(),
                    importe: Number(cuenta.total || 0),
                    metodoPago: "Pendiente"
                }
            ];

            const abonado = Number(cuenta.abonado || 0);
            if (abonado > 0) {
                cuenta.movimientos.push({
                    tipo: "ABONO",
                    fecha: new Date().toISOString(),
                    importe: abonado,
                    metodoPago: "No registrado"
                });
            }

            cambio = true;
        }
    });

    if (cambio) {
        localStorage.setItem("cuentasPendientes", JSON.stringify(cuentas));
    }
}

function guardarCuentaPendiente(venta) {
    const cuentas = obtenerCuentasPendientes();

    const saldoInicial = Number(venta.saldo || Math.max(0, Number(venta.total) - Number(venta.saldoFavorAplicado || 0)));

    cuentas.push({
        id: venta.id,
        ventaId: venta.folio || venta.id,
        jornadaId: venta.jornadaId || "",
        cliente: venta.cliente,
        fecha: venta.fecha,
        total: Number(venta.total),
        abonado: 0,
        saldo: saldoInicial,
        saldoFavor: 0,
        estado: "Pendiente",
        productos: venta.productos || [],
        movimientos: [
            ...(Number(venta.saldoFavorAplicado || 0) > 0 ? [{
                tipo: "USO_SALDO_FAVOR",
                fecha: new Date().toISOString(),
                importe: Number(venta.saldoFavorAplicado),
                metodoPago: "Saldo a favor"
            }] : []),
            {
                tipo: "VENTA",
                fecha: new Date().toISOString(),
                importe: saldoInicial,
                metodoPago: "Pendiente"
            }
        ]
    });

    localStorage.setItem("cuentasPendientes", JSON.stringify(cuentas));
}

function consumirSaldoFavorCliente(nombre, monto) {
    let restante = Number(monto || 0);
    if (restante <= 0) return 0;

    const cuentas = obtenerCuentasPendientes();
    const nombreNormalizado = normalizarTexto(nombre);

    for (const cuenta of cuentas) {
        if (restante <= 0) break;
        if (normalizarTexto(cuenta.cliente) !== nombreNormalizado) continue;

        const favor = Number(cuenta.saldoFavor || 0);
        if (favor <= 0) continue;

        const usado = Math.min(favor, restante);
        cuenta.saldoFavor = favor - usado;
        cuenta.estado = Number(cuenta.saldo || 0) > 0 ? "Pendiente" : (cuenta.saldoFavor > 0 ? "Saldo a favor" : "Pagado");
        cuenta.movimientos = Array.isArray(cuenta.movimientos) ? cuenta.movimientos : [];
        cuenta.movimientos.push({
            tipo: "USO_SALDO_FAVOR",
            fecha: new Date().toISOString(),
            importe: usado,
            metodoPago: "Saldo a favor",
            saldoDespues: Number(cuenta.saldo || 0),
            saldoFavorDespues: cuenta.saldoFavor
        });

        registrarMovimientoCxC({
            tipo: "USO_SALDO_FAVOR",
            cliente: cuenta.cliente,
            ventaId: cuenta.ventaId || cuenta.id,
            importe: usado,
            metodoPago: "Saldo a favor",
            saldoDespues: Number(cuenta.saldo || 0),
            saldoFavorDespues: cuenta.saldoFavor
        });

        restante -= usado;
    }

    localStorage.setItem("cuentasPendientes", JSON.stringify(cuentas));
    return Number(monto || 0) - restante;
}

function registrarCliente(nombre, venta) {
    const limpio = String(nombre || "").trim();
    if (!limpio || !venta || limpio.toLowerCase() === "público general") return;

    const clientes = JSON.parse(localStorage.getItem("clientesSnackOffice")) || [];
    const clave = normalizarTexto(limpio);
    let cliente = clientes.find(item => item.clave === clave);

    if (!cliente) {
        cliente = { clave, nombre: limpio, compras: 0, totalCompras: 0, ultimaCompra: "" };
        clientes.push(cliente);
    }

    cliente.nombre = limpio;
    cliente.compras = Number(cliente.compras || 0) + 1;
    cliente.totalCompras = Number(cliente.totalCompras || 0) + Number(venta.total || 0);
    cliente.ultimaCompra = venta.fecha || new Date().toLocaleString("es-MX");
    localStorage.setItem("clientesSnackOffice", JSON.stringify(clientes));
}

function sincronizarClientes() {
    const clientesMap = new Map();
    const agregarVenta = venta => {
        const nombre = String(venta.cliente || "").trim();
        if (!nombre || normalizarTexto(nombre) === "publico general") return;
        const clave = normalizarTexto(nombre);
        const actual = clientesMap.get(clave) || { clave, nombre, compras: 0, totalCompras: 0, ultimaCompra: "" };
        actual.nombre = nombre;
        actual.compras += 1;
        actual.totalCompras += Number(venta.total || 0);
        actual.ultimaCompra = venta.fecha || actual.ultimaCompra;
        clientesMap.set(clave, actual);
    };

    (JSON.parse(localStorage.getItem("historialVentas")) || []).forEach(agregarVenta);
    (JSON.parse(localStorage.getItem("jornadasArchivadas")) || []).forEach(j => (j.ventas || []).forEach(agregarVenta));
    (JSON.parse(localStorage.getItem("cuentasPendientes")) || []).forEach(c => {
        const nombre = String(c.cliente || "").trim();
        if (!nombre) return;
        const clave = normalizarTexto(nombre);
        if (!clientesMap.has(clave)) clientesMap.set(clave, { clave, nombre, compras: 0, totalCompras: 0, ultimaCompra: c.fecha || "" });
    });

    const clientes = Array.from(clientesMap.values());
    localStorage.setItem("clientesSnackOffice", JSON.stringify(clientes));
    return clientes;
}

function cargarClientesVentas() {
    const contenedor = document.getElementById("listaClientesVentas");
    if (!contenedor) return;

    const clientes = sincronizarClientes();
    const filtro = normalizarTexto(document.getElementById("buscarClienteVentas")?.value || "");
    const cuentas = obtenerCuentasPendientes();

    const datos = clientes.map(cliente => {
        const relacionadas = cuentas.filter(c => normalizarTexto(c.cliente) === cliente.clave);
        return {
            ...cliente,
            deuda: relacionadas.reduce((s, c) => s + Math.max(0, Number(c.saldo || 0)), 0),
            favor: relacionadas.reduce((s, c) => s + Math.max(0, Number(c.saldoFavor || 0)), 0)
        };
    }).filter(c => !filtro || normalizarTexto(c.nombre).includes(filtro));

    const total = document.getElementById("totalClientesVentas");
    const compras = document.getElementById("clientesConComprasVentas");
    const deuda = document.getElementById("deudaClientesVentas");
    const favor = document.getElementById("favorClientesVentas");
    if (total) total.textContent = clientes.length;
    if (compras) compras.textContent = clientes.filter(c => c.compras > 0).length;
    if (deuda) deuda.textContent = `$${datos.reduce((s,c)=>s+c.deuda,0).toFixed(2)}`;
    if (favor) favor.textContent = `$${datos.reduce((s,c)=>s+c.favor,0).toFixed(2)}`;

    contenedor.innerHTML = datos.length ? datos.map(c => `
        <article class="cliente-card-ventas">
            <div class="cliente-card-principal">
                <div class="cliente-avatar">👤</div>
                <div><h3>${c.nombre}</h3><p>${c.compras} compra${c.compras === 1 ? "" : "s"} · Última: ${c.ultimaCompra || "—"}</p></div>
            </div>
            <div class="cliente-card-metricas">
                <div><small>Total comprado</small><strong>$${c.totalCompras.toFixed(2)}</strong></div>
                <div><small>Pendiente</small><strong class="cliente-deuda">$${c.deuda.toFixed(2)}</strong></div>
                <div><small>A favor</small><strong class="cliente-favor">$${c.favor.toFixed(2)}</strong></div>
            </div>
        </article>
    `).join("") : `<div class="clientes-vacio">👥<h3>No hay clientes para mostrar</h3><p>Los compradores con nombre aparecerán aquí automáticamente.</p></div>`;
}

function cargarPendientesVentas() {
    const contenedor = document.getElementById("listaPendientesVentas");

    if (!contenedor) return;

    const cuentas = obtenerCuentasPendientes();
    actualizarResumenPendientes(cuentas);
    contenedor.innerHTML = "";

    if (cuentas.length === 0) {
        contenedor.innerHTML = `
            <div class="mensaje-pendientes">
                <span>📒</span>
                <h3>No hay cuentas pendientes</h3>
                <p>Las ventas registradas como pendientes aparecerán aquí.</p>
            </div>
        `;
        return;
    }

    cuentas.slice().reverse().forEach(cuenta => {
        contenedor.appendChild(crearTarjetaPendiente(cuenta));
    });
}

function actualizarResumenPendientes(cuentas) {
    const activas = cuentas.filter(cuenta => Number(cuenta.saldo) > 0);
    const saldoTotal = activas.reduce(
        (suma, cuenta) => suma + Number(cuenta.saldo || 0),
        0
    );
    const abonadoTotal = cuentas.reduce(
        (suma, cuenta) => suma + Number(cuenta.abonado || 0),
        0
    );

    const favorTotal = cuentas.reduce(
        (suma, cuenta) => suma + Number(cuenta.saldoFavor || 0),
        0
    );

    const cantidad = document.getElementById("totalCuentasPendientes");
    const saldo = document.getElementById("saldoPendienteTotal");
    const abonado = document.getElementById("totalAbonadoPendientes");
    const favor = document.getElementById("saldoFavorTotal");

    if (cantidad) cantidad.textContent = activas.length;
    if (saldo) saldo.textContent = `$${saldoTotal.toFixed(2)}`;
    if (abonado) abonado.textContent = `$${abonadoTotal.toFixed(2)}`;
    if (favor) favor.textContent = `$${favorTotal.toFixed(2)}`;
}

function crearTarjetaPendiente(cuenta) {
    const tarjeta = document.createElement("div");
    tarjeta.className = "pendiente-venta";

    const total = Number(cuenta.total || 0);
    const abonado = Number(cuenta.abonado || 0);
    const saldo = Number(cuenta.saldo || 0);
    const saldoFavor = Number(cuenta.saldoFavor || 0);
    const pagada = saldo <= 0 && saldoFavor <= 0;
    const tieneFavor = saldoFavor > 0;

    const movimientos = Array.isArray(cuenta.movimientos) ? cuenta.movimientos : [];
    const movimientosHTML = movimientos.length
        ? movimientos.map(movimiento => `
            <div class="movimiento-cxc">
                <span>${movimiento.tipo === "VENTA" ? "🧾" : "💵"} ${movimiento.tipo || "MOVIMIENTO"}</span>
                <span>${movimiento.metodoPago || "—"}</span>
                <strong>${movimiento.tipo === "VENTA" ? "+" : "-"}$${Number(movimiento.importe || 0).toFixed(2)}</strong>
            </div>
        `).join("")
        : `<p class="movimiento-cxc-vacio">Sin movimientos registrados.</p>`;

    tarjeta.innerHTML = `
        <div class="pendiente-venta-info">
            <div class="pendiente-venta-cabecera">
                <div>
                    <h3>📒 ${cuenta.cliente || "Cliente sin nombre"}</h3>
                    <p>Venta #${obtenerNumeroVentaPendiente(cuenta.id)}</p>
                </div>
                <span class="estado-pendiente ${pagada ? "pagado" : ""} ${tieneFavor ? "favor" : ""}">
                    ${tieneFavor ? "Saldo a favor" : pagada ? "Pagado" : "Pendiente"}
                </span>
            </div>

            <p>📅 ${cuenta.fecha}</p>
            <p>🧾 Total: <strong>$${total.toFixed(2)}</strong></p>
            <p>💵 Abonado: <strong>$${abonado.toFixed(2)}</strong></p>
            ${saldo > 0 ? `<p class="saldo-pendiente">💰 Saldo: <strong>$${saldo.toFixed(2)}</strong></p>` : ""}
            ${tieneFavor ? `<p class="saldo-favor-pendiente">🟢 A favor: <strong>$${saldoFavor.toFixed(2)}</strong></p>` : ""}

            <details class="historial-cxc-detalle">
                <summary>Ver movimientos</summary>
                <div class="movimientos-cxc-lista">${movimientosHTML}</div>
            </details>
        </div>

        <div class="pendiente-venta-acciones">
            ${
                tieneFavor
                    ? `<span class="pendiente-liquidada">✓ Cuenta liquidada · A favor $${saldoFavor.toFixed(2)}</span>`
                    : pagada
                        ? `<span class="pendiente-liquidada">✓ Cuenta liquidada</span>`
                        : `<button type="button" class="btn-abonar-pendiente">💵 Registrar abono</button>`
            }
        </div>
    `;

    const btnAbonar = tarjeta.querySelector(".btn-abonar-pendiente");
    if (btnAbonar) {
        btnAbonar.addEventListener("click", () => registrarAbonoPendiente(cuenta.id));
    }

    return tarjeta;
}

function obtenerNumeroVentaPendiente(idVenta) {
    const historial =
        JSON.parse(localStorage.getItem("historialVentas")) || [];
    const venta = historial.find(item => item.id === idVenta);
    return venta?.folio || idVenta || "—";
}

function registrarAbonoPendiente(idCuenta) {
    const cuentas = obtenerCuentasPendientes();
    const cuenta = cuentas.find(item => item.id === idCuenta);

    if (!cuenta) return;

    const saldoActual = Number(cuenta.saldo || 0);
    const saldoFavorActual = Number(cuenta.saldoFavor || 0);

    if (saldoActual <= 0) {
        alert(
            saldoFavorActual > 0
                ? `Esta cuenta ya está liquidada y tiene $${saldoFavorActual.toFixed(2)} a favor.`
                : "Esta cuenta ya está liquidada."
        );
        return;
    }

    const entrada = prompt(
        `Saldo pendiente: $${saldoActual.toFixed(2)}\n\nIngresa el monto del abono:`
    );

    if (entrada === null) return;

    const monto = Number(entrada);

    if (!Number.isFinite(monto) || monto <= 0) {
        alert("⚠️ Ingresa un monto válido mayor a cero.");
        return;
    }

    const metodoAbono = prompt(
        "Forma de pago del abono:\n\n1 = Efectivo\n2 = Tarjeta\n3 = Transferencia",
        "1"
    );

    if (metodoAbono === null) return;

    const mapaMetodos = {
        "1": "Efectivo",
        "2": "Tarjeta",
        "3": "Transferencia"
    };

    const metodoPagoAbono = mapaMetodos[String(metodoAbono).trim()];

    if (!metodoPagoAbono) {
        alert("⚠️ Selecciona 1, 2 o 3 para indicar el método de pago.");
        return;
    }

    const nuevoSaldo = Math.max(0, saldoActual - monto);
    const excedente = Math.max(0, monto - saldoActual);

    cuenta.abonado = Number(cuenta.abonado || 0) + monto;
    cuenta.saldo = nuevoSaldo;
    cuenta.saldoFavor = saldoFavorActual + excedente;
    cuenta.estado = nuevoSaldo > 0 ? "Pendiente" : "Pagado";

    cuenta.movimientos = Array.isArray(cuenta.movimientos) ? cuenta.movimientos : [];
    cuenta.movimientos.push({
        tipo: "ABONO",
        fecha: new Date().toISOString(),
        importe: monto,
        metodoPago: metodoPagoAbono,
        saldoDespues: nuevoSaldo,
        saldoFavorDespues: cuenta.saldoFavor
    });

    localStorage.setItem("cuentasPendientes", JSON.stringify(cuentas));

    registrarMovimientoCxC({
        tipo: "ABONO",
        cliente: cuenta.cliente,
        ventaId: cuenta.ventaId || cuenta.id,
        importe: monto,
        metodoPago: metodoPagoAbono,
        saldoDespues: nuevoSaldo,
        saldoFavorDespues: cuenta.saldoFavor
    });

    actualizarVentaHistorialConAbono(cuenta);
    cargarPendientesVentas();
    actualizarAvisoCliente();

    if (excedente > 0) {
        alert(
            `✅ Abono registrado. La cuenta quedó liquidada y el cliente tiene $${cuenta.saldoFavor.toFixed(2)} a favor.`
        );
    } else if (cuenta.saldo === 0) {
        alert("✅ Cuenta liquidada correctamente.");
    } else {
        alert(
            `✅ Abono registrado. Saldo restante: $${cuenta.saldo.toFixed(2)}`
        );
    }
}

function actualizarVentaHistorialConAbono(cuenta) {
    const historial =
        JSON.parse(localStorage.getItem("historialVentas")) || [];
    const venta = historial.find(item => item.id === cuenta.id);

    if (!venta) return;

    venta.abonado = Number(cuenta.abonado);
    venta.saldo = Number(cuenta.saldo);
    venta.saldoFavor = Number(cuenta.saldoFavor || 0);
    venta.estadoPago = cuenta.saldoFavor > 0 ? "Saldo a favor" : cuenta.estado;

    localStorage.setItem("historialVentas", JSON.stringify(historial));
}

// -------------------------------------
// ESTADO DEL CLIENTE
// -------------------------------------
function obtenerResumenCliente(nombre) {
    const clienteNormalizado = normalizarTexto(nombre);

    if (!clienteNormalizado) {
        return { deuda: 0, favor: 0 };
    }

    const cuentas = obtenerCuentasPendientes();

    return cuentas
        .filter(cuenta => normalizarTexto(cuenta.cliente) === clienteNormalizado)
        .reduce(
            (resumen, cuenta) => {
                resumen.deuda += Math.max(0, Number(cuenta.saldo || 0));
                resumen.favor += Math.max(0, Number(cuenta.saldoFavor || 0));
                return resumen;
            },
            { deuda: 0, favor: 0 }
        );
}

function actualizarAvisoCliente() {
    const campoCliente = document.getElementById("clienteVenta");
    const aviso = document.getElementById("estadoClienteVenta");
    const cajaFavor = document.getElementById("saldoFavorVentaBox");
    const montoFavor = document.getElementById("saldoFavorDisponibleVenta");
    const botonFavor = document.getElementById("btnUsarSaldoFavorVenta");

    if (!campoCliente || !aviso) return;

    const nombre = campoCliente.value.trim();
    const normalizado = normalizarTexto(nombre);

    if (clienteFavorSeleccionado && clienteFavorSeleccionado !== normalizado) {
        usarSaldoFavorVenta = false;
        clienteFavorSeleccionado = "";
    }

    if (!nombre) {
        aviso.style.display = "none";
        aviso.textContent = "";
        aviso.className = "estado-cliente-venta";
        if (cajaFavor) cajaFavor.style.display = "none";
        actualizarResumenPagoVenta();
        return;
    }

    const resumen = obtenerResumenCliente(nombre);
    const deuda = resumen.deuda;
    const favor = resumen.favor;

    if (deuda > 0 && favor > 0) {
        aviso.style.display = "block";
        aviso.className = "estado-cliente-venta aviso-mixto";
        aviso.textContent = `⚠️ Debe $${deuda.toFixed(2)} · 🟢 Tiene $${favor.toFixed(2)} a favor`;
    } else if (deuda > 0) {
        aviso.style.display = "block";
        aviso.className = "estado-cliente-venta aviso-deuda";
        aviso.textContent = `⚠️ Cliente con saldo pendiente: $${deuda.toFixed(2)}`;
    } else if (favor > 0) {
        aviso.style.display = "block";
        aviso.className = "estado-cliente-venta aviso-favor";
        aviso.textContent = `🟢 Cliente con saldo a favor: $${favor.toFixed(2)}`;
    } else {
        aviso.style.display = "none";
        aviso.textContent = "";
        aviso.className = "estado-cliente-venta";
    }

    if (cajaFavor && montoFavor && botonFavor) {
        if (favor > 0) {
            cajaFavor.style.display = "flex";
            montoFavor.textContent = `$${favor.toFixed(2)}`;
            botonFavor.textContent = usarSaldoFavorVenta ? "No usar saldo a favor" : "Usar saldo a favor";
            botonFavor.classList.toggle("activo", usarSaldoFavorVenta);
        } else {
            cajaFavor.style.display = "none";
        }
    }

    actualizarResumenPagoVenta();
}

